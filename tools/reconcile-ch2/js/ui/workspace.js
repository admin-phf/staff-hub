/* Reconcile CH2 v2.14.0 (20 Oct 2026) — step 3 lists the four exports as Saved-Files-style rows (each Download runs the same
   code as its toolbar button; madeAt records when a file was built); the result toolbar uses the strip's buttons (gold
   downloads, outlined secondaries, CLEAR QTY) with the three step pills in a row above it (setRunPill updates every
   [data-run-step]); the whole rail accepts drops (wireRailDrop); CLEAR pills side by side; apple home link without the disc.
   v2.13.0 (20 Oct 2026) — the Build POS Master layout: a full-width sticky run strip (home link, three step
   pills, Run all, POSActive download, CLEAR FILES, progress + status), Drop All at the top of the rail, and ONE "Steps &
   generated files" panel — a group per step with its own Run pill in the header; step 3 lists the three downloads.
   The three steps sit over the UNCHANGED engine in app.js: step 1 (Check inputs) = app.js's own readiness gate
   (refreshReferenceStatus → #runBtn enabled); step 2 (Reconcile) = app.js run() (the receiving checklist); step 3 (Export files)
   = the existing download buttons (#downloadBtn, #fullDownloadBtn, #fullCsvDownloadBtn, #keyReviewBtn), which build each file on
   demand as before. Run all = step 2 (step 1 is implied by its gate), then the POSActive import download. No reconciliation
   maths, parsing or export code changed. Rail rows carry their state: LOADED green · UPDATED blue · INCOMPATIBLE yellow ·
   REQUIRED red (v21.29.0 shared phf-ui.css).
   v2.11.2 (13 Oct 2026) — ✕ on each loaded rail row removes it straight away.
   v2.10.0 (12 Oct 2026) — the discount rules row is the Staff Hub's shared Ongoing Discounts file (Library
   kind lib:ref-discounts): loaded from the Library on open, and a file dropped here is saved there for Build POS Master
   Databases and POS New Product Check Clean too. The POS DB & SUPPLIER MERGE workbook is still accepted.
   v2.8.0 — input rail + workspace, laid out like Build Master Databases, with Drop All Input Files Here.
   The reconciliation engine (app.js) is unchanged: this script reads the page state app.js
   already maintains (file lists, run button, status, results, download buttons) and forwards
   files dropped on the rail to app.js's own file inputs. Reference files dropped on the rail
   are validated and saved with the same PHFReconcile.referenceStore calls as reference-admin. */
(function(global){
  'use strict';
  const $=s=>document.querySelector(s);
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const PHF=global.PHFReconcile||{};

  const INPUTS=[
    {id:'master',group:'Reference data',title:'POS / master',kind:'ref',refKind:'posMaster',req:true},
    {id:'supplier',group:'Reference data',title:'Ongoing Discounts',kind:'ref',refKind:'lib:ref-discounts',req:true},
    {id:'pos',group:'Order files',title:'POS back-end order',kind:'order',input:'#posInput',list:'#posFiles',req:true},
    {id:'invoices',group:'Order files',title:'Supplier invoices',kind:'order',input:'#invoiceInput',list:'#invoiceFiles',req:true,multiple:true}
  ];
  const GROUPS=[
    {title:'Reference data',ids:['master','supplier'],verb:'saved'},
    {title:'POS order',ids:['pos'],verb:'loaded'},
    {title:'Supplier invoices',ids:['invoices'],verb:'loaded'}
  ];
  const OUTPUTS=['#downloadBtn','#fullDownloadBtn','#fullCsvDownloadBtn','#keyReviewBtn'];   // POSActive import first (it is also the strip's download button)
  const ref={master:null,supplier:null,busy:{},invalid:{},message:{}};
  // v2.13.0: updated[id] = a valid file replaced an earlier valid one (blue row); reject[id] = {name,msg} of a file that failed
  // for that input (yellow row; an earlier valid file stays loaded). Order-file rejections come from app.js's status text.
  const flags={updated:{},reject:{}};
  let selected=null,queued=false;

  function prettySize(b){b=Number(b)||0;if(b<1024)return `${b} B`;if(b<1048576)return `${(b/1024).toFixed(1)} KB`;return `${(b/1048576).toFixed(1)} MB`;}
  function refLabel(rec,long){if(!rec)return '';const d=rec.savedAt?new Date(rec.savedAt):null;const when=d?(long?d.toLocaleString('en-AU'):d.toLocaleDateString('en-AU')):'saved';return long?`${rec.name} · ${prettySize(rec.size)} · ${when}`:`${rec.name} · saved ${when}`;}
  function fileNames(sel){return [...document.querySelectorAll(`${sel} .file-row`)].map(r=>{const s=r.querySelector('span');return (s?s.textContent:r.textContent).replace(/^✓\s*/,'').trim();});}

  function info(def){
    if(def.kind==='ref'){
      const rec=ref[def.id],busy=!!ref.busy[def.id],bad=!!ref.invalid[def.id];
      return {loaded:!!rec&&!busy,busy,invalid:bad,
        sub:busy?ref.message[def.id]:(bad?ref.message[def.id]:(rec?refLabel(rec,false):'Required · drop file here')),
        status:busy?ref.message[def.id]:[rec?refLabel(rec,true):'Not loaded',ref.message[def.id]].filter(Boolean).join(' · ')};
    }
    const names=fileNames(def.list),n=names.length;
    return {loaded:n>0,count:n,
      sub:n?(n===1?names[0]:`${n} files · ${names[0]}…`):'Required · drop file here',
      status:n?names.join(', '):'Not loaded'};
  }

  /* ---------- left rail ---------- */
  function renderNav(){
    const host=$('#inputNav');if(!host)return;
    let html='',last='';
    for(const d of INPUTS){
      if(d.group!==last){if(last)html+='</div>';html+=`<div class="input-group"><div class="input-group-title">${esc(d.group)}</div>`;last=d.group;}
      const s=info(d);
      const rj=flags.reject[d.id]||(s.invalid&&!s.busy?{name:'',msg:ref.message[d.id]||'not accepted'}:null),up=s.loaded&&!s.busy&&flags.updated[d.id];
      const cls=['input-nav-item',s.loaded?'loaded':'missing',d.req?'required':'',selected===d.id?'active':'',rj?'incompatible':up?'updated':''].filter(Boolean).join(' ');
      const state=s.busy?'CHECKING':rj?'INCOMPATIBLE':up?'UPDATED':s.loaded?(d.kind==='ref'?'SAVED':'LOADED'):d.req?'REQUIRED':'OPTIONAL';
      const note=rj?`<small class="input-nav-note" title="${esc((rj.name?rj.name+' — ':'')+rj.msg)}">${esc((rj.name?rj.name+' — ':'')+rj.msg)}</small>`:'';
      html+=`<div class="input-nav-wrap${s.loaded||rj?' has-del':''}"><button type="button" class="${cls}" data-input="${d.id}" title="Click to open, or drop the ${esc(d.title)} file${d.multiple?'s':''} directly here"><span class="input-dot">${rj?'!':s.loaded?'✓':d.req?'!':'○'}</span><span><strong>${esc(d.title)}</strong><small>${esc(s.sub)}</small>${note}</span><span class="input-state">${state}</span></button>${s.loaded||rj?`<button type="button" class="input-nav-del" data-del="${d.id}" title="Remove ${esc(d.title)}${d.kind==='ref'?(d.id==='supplier'?' from this browser (shared — Build POS Master Databases and POS New Product Check Clean lose it too)':' from this browser'):''}" aria-label="Remove ${esc(d.title)}">✕</button>`:''}</div>`;
    }
    if(last)html+='</div>';
    host.innerHTML=html;
    host.querySelectorAll('[data-del]').forEach(b=>{b.onclick=e=>{e.preventDefault();e.stopPropagation();removeInput(b.dataset.del);};});
    host.querySelectorAll('[data-input]').forEach(b=>{
      const id=b.dataset.input;
      b.onclick=()=>select(id);
      b.ondragenter=b.ondragover=e=>{e.preventDefault();e.stopPropagation();b.classList.add('drag-target');if(e.dataTransfer)e.dataTransfer.dropEffect='copy';};
      b.ondragleave=e=>{e.preventDefault();e.stopPropagation();b.classList.remove('drag-target');};
      b.ondrop=e=>{e.preventDefault();e.stopPropagation();b.classList.remove('drag-target');const files=e.dataTransfer&&e.dataTransfer.files;if(files&&files.length)acceptFiles(id,files);};
    });
  }

  // v2.11.2 — the ✕ on a loaded rail row removes that input straight away (as in POS New Product Check Clean): an order file
  // through app.js's own Remove buttons, a reference file from this browser (Ongoing Discounts is the shared Library copy).
  async function removeInput(id){
    const def=INPUTS.find(x=>x.id===id);if(!def)return;
    delete flags.updated[id];delete flags.reject[id];ref.invalid[id]=false;if(!flags.reject[id]&&!info(def).loaded){ref.message[id]='';render();return;}
    if(def.kind==='order'){
      for(let i=0;i<200;i++){const b=document.querySelector(`${def.list} .file-row button`);if(!b)break;b.click();}
      schedule();return;
    }
    try{if(PHF.referenceStore)await PHF.referenceStore.clear(def.refKind);}catch(err){console.error(err);}
    ref.message[id]='';ref.invalid[id]=false;
    await loadReferenceStatus();const app=global.PHFReconcileApp;if(app&&app.refreshReferenceStatus)await app.refreshReferenceStatus();render();
  }
  /* ---------- selected input (right) ---------- */
  function select(id){
    selected=id;
    document.querySelectorAll('[data-input-card]').forEach(c=>{c.hidden=c.dataset.inputCard!==id;});
    const panel=$('#inputDetailPanel');if(panel)panel.classList.toggle('is-open',!!id);
    render();
  }
  function renderCards(){
    for(const d of INPUTS){
      const card=document.querySelector(`[data-input-card="${d.id}"]`);if(!card)continue;
      const s=info(d);
      card.classList.toggle('is-loaded',s.loaded);
      card.classList.toggle('is-required',!s.loaded&&d.req);
      card.classList.toggle('is-optional',!s.loaded&&!d.req);
      const badge=card.querySelector('[data-badge]');
      if(badge){badge.className='small-badge '+(s.busy?'running':s.loaded?'done':d.req?'required':'wait');badge.textContent=s.busy?'CHECKING':s.loaded?'LOADED':d.req?'REQUIRED':'OPTIONAL';}
      const st=card.querySelector(d.kind==='ref'?`[data-ref-status="${d.id}"]`:`[data-order-status="${d.id}"]`);if(st)st.textContent=s.status;
      const title=card.querySelector('[data-drop-title]');if(title)title.textContent=s.busy?'Checking…':s.loaded?'Replace saved file':'Drop file here';
    }
  }

  /* ---------- input readiness ---------- */
  function renderSummary(){
    const host=$('#inputSummary'),badge=$('#readyCount');let ready=0;
    if(host)host.innerHTML=GROUPS.map(g=>{
      const defs=g.ids.map(id=>INPUTS.find(d=>d.id===id)),states=defs.map(info);
      const loaded=states.filter(s=>s.loaded).length,miss=defs.filter((d,i)=>d.req&&!states[i].loaded).length;
      if(!miss)ready++;
      const files=g.ids[0]==='invoices'?`${states[0].count||0} ${g.verb}`:`${loaded}/${defs.length} ${g.verb}`;
      return `<div class="summary-chip ${miss?'miss':'ok'}"><strong>${esc(g.title)}</strong><span>${files} · ${miss?`${miss} required missing`:'ready'}</span></div>`;
    }).join('');
    if(badge){badge.textContent=`${ready} / ${GROUPS.length} READY`;badge.className='result-badge'+(ready===GROUPS.length?' ok':ready?' ready':'');}
  }

  /* ---------- the three steps (v2.13.0) over the unchanged app.js engine ----------
     step state is READ from the page app.js maintains: #runBtn enabled = inputs + reference ready (step 1 READY → DONE
     once a run has started), #progress visible = running, #results visible = the checklist is rendered (step 2 DONE,
     step 3 READY), the download buttons enabled = files can be built (step 3 DONE once one has been downloaded). */
  const STEPS=[
    {id:'check',n:1,title:'Check inputs',desc:'The POS back-end order, the supplier invoices and the saved reference data (POS / master, Ongoing Discounts) are all present and readable.',nofile:'This step confirms the inputs — it produces no download file.'},
    {id:'reconcile',n:2,title:'Reconcile',desc:'Matches the supplier invoice lines to the POS order and builds the receiving checklist shown under this panel (Found quantities, CH2 invoice prices, exceptions).',nofile:'The receiving checklist is shown on this page — the files come from step 3.'},
    {id:'export',n:3,title:'Export files',desc:'The POSActive import (Found quantities at CH2 invoice prices), the full reconciliation workbook / CSV and the POS key review.'}
  ];
  const OUT_META={downloadBtn:{name:'POSActive import',ext:'.txt',meta:'15-column tab-delimited import · ticked / accounted rows with their Found quantities at the CH2 invoice prices'},fullDownloadBtn:{name:'Full reconciliation',ext:'.xlsx',meta:'43-column linked-POS reconciliation workbook'},fullCsvDownloadBtn:{name:'Full reconciliation',ext:'.csv',meta:'the same 43 columns as an Excel-safe CSV'},keyReviewBtn:{name:'POS key review',ext:'.csv',meta:'import-key review for rows that need a look'}};
  const stepDone={check:false,export:false};
  function stepState(){
    const run=$('#runBtn'),progress=$('#progress'),results=$('#results');
    const running=progress&&!progress.classList.contains('hidden'),done=results&&!results.classList.contains('hidden'),ready=run&&!run.disabled;
    const bad=Object.keys(flags.reject).length>0;
    return {
      check:running||done?'done':ready?(stepDone.check?'done':'ready'):bad?'err':'wait',
      reconcile:running?'run':done?'done':ready?'ready':'wait',
      export:done?(stepDone.export?'done':'ready'):'wait'
    };
  }
  const WORD={wait:'WAITING',ready:'READY',run:'RUNNING',done:'DONE',err:'ERROR'};
  function setRunPill(id,st){
    const pills=[...document.querySelectorAll(`[data-run-step="${id}"]`)];if(!pills.length)return;   // v2.14.0: the strip AND the checklist row
    const running=st==='run'||document.querySelector('#progress:not(.hidden)'),disabled=!!running||st==='wait'||st==='err';
    for(const pill of pills){pill.classList.toggle('running',st==='run');const sp=pill.querySelector('.st');if(sp){sp.className='st '+st;sp.textContent=WORD[st];}pill.disabled=disabled;pill.setAttribute('aria-disabled',disabled?'true':'false');}
    const hp=document.querySelector(`#stepgroup-${id} .db-build`);if(hp){hp.disabled=disabled;const hs=hp.querySelector('.st');if(hs){hs.className='st '+st;hs.textContent=WORD[st];}}
    const mini=document.querySelector(`#stepgroup-${id} .db-mini`);if(mini){mini.className='db-mini '+st;mini.textContent=WORD[st];}
  }
  async function runStep(id){
    const app=global.PHFReconcileApp||{},st=stepState();
    if(id==='check'){if(app.refreshReferenceStatus)await app.refreshReferenceStatus();stepDone.check=!$('#runBtn').disabled;const s=$('#status');if(stepDone.check&&app.setStatus)app.setStatus('Step 1 — inputs checked: POS order, supplier invoices and reference data are ready. Run step 2 to reconcile.','ok');render();return;}
    if(id==='reconcile'){if(st.reconcile==='run')return;if(app.run)await app.run();else $('#runBtn').click();render();return;}
    if(id==='export'){if(st.export==='wait'){await runStep('reconcile');}const b=$('#downloadBtn');if(b&&!b.disabled){b.click();stepDone.export=true;}render();}
  }
  function renderStage(){
    const st=stepState();for(const k of Object.keys(st))setRunPill(k,st[k]);
    const run=$('#runBtn');if(run){run.textContent=st.reconcile==='run'?'Running…':'Run all';}
    const note=$('#dbDoneNote');if(note)note.textContent=st.reconcile==='run'?'reconciling…':st.export==='done'?'3 of 3 run':st.reconcile==='done'?'2 of 3 run':st.check==='done'?'1 of 3 run':'';
    const results=$('#results'),on=results&&!results.classList.contains('hidden'),dl=$('#dlPosImport'),src=$('#downloadBtn');
    if(dl){const show=on&&src&&!src.disabled&&!src.classList.contains('hidden');dl.hidden=!show;const nt=$('#dlPosImportNote');if(nt)nt.textContent=show?'.txt':'';}
    for(const p of document.querySelectorAll('.builder-workspace .panel,.dbgroup'))p.style.scrollMarginTop=($('#dbRunStrip')?.offsetHeight||56)+8+'px';
  }
  function renderStepGroups(){
    const host=$('#stepGroups');if(!host)return;
    if(!host.children.length){
      host.innerHTML=STEPS.map(s=>`<div class="dbgroup" id="stepgroup-${s.id}" data-acc data-acc-id="reconcile-step-${s.id}"><div class="dbhdr acc-custom-head"><span class="num">${s.n}</span><div class="dbhdr-copy"><h3>${esc(s.title)}</h3><span class="dbhdr-meta" data-step-meta></span></div><span class="db-mini wait">WAITING</span><span class="db-act"><button type="button" class="phf-step db-build" data-step-run="${s.id}" disabled title="Run step ${s.n} — ${esc(s.title)}"><span class="num">${s.n}</span> Run step ${s.n} <span class="st wait">WAITING</span></button></span></div><div class="dbgroup-body"><p class="db-group-desc">${esc(s.desc)}</p><div class="db-group-status" data-step-status hidden></div>${s.nofile?`<div class="db-group-nofile">${esc(s.nofile)}</div>`:'<div class="db-group-files" data-step-files><div class="empty-output">Run the reconciliation to create its download files.</div></div>'}</div></div>`).join('');
      host.querySelectorAll('[data-step-run]').forEach(b=>{b.onclick=e=>{e.preventDefault();e.stopPropagation();if(b.disabled)return;runStep(b.dataset.stepRun);};b.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')e.stopPropagation();};});
      if(global.PHFAccordion)global.PHFAccordion.refresh(host);
    }
  }
  /* ---------- generated output files → step 3 rows (mirrors the result download buttons) ---------- */
  // v2.14.0: remember when each export was built (the builders download straight away, so this is the "made at" for the row)
  const madeAt={};
  function noteMade(id){const t=Date.now();madeAt[id]={t,when:new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Melbourne',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(t)),size:'',ago(){const m=Math.max(0,Math.round((Date.now()-t)/60000));return m<1?'just now':m<60?m+' min ago':Math.round(m/60)+' h ago';}};}
  function renderOutputs(){
    renderStepGroups();
    const host=document.querySelector('[data-step-files]'),count=$('#outputCount');if(!host)return;
    const results=$('#results'),on=results&&!results.classList.contains('hidden');
    const btns=on?OUTPUTS.map(s=>$(s)).filter(b=>b&&!b.classList.contains('hidden')):[];
    const ready=btns.filter(b=>!b.disabled).length;
    // v2.14.0: the Saved Files (Library) row markup. The export builders write each file on demand (they download as they
    // build), so a row's Download runs the same code as its toolbar button; the size is shown once the file has been built.
    host.innerHTML=btns.length?btns.map(b=>{const m=OUT_META[b.id]||{name:b.textContent.replace(/^Download\s+/i,''),ext:'',meta:b.title||''};const made=madeAt[b.id];return `<div class="phf-lib-row"><span class="phf-lib-dot" aria-hidden="true">✓</span><div class="phf-lib-what"><strong>${esc(m.name)}</strong><span>${esc(b.textContent.replace(/^Download\s+/i,''))}</span></div><div class="phf-lib-when">${made?`<strong>${esc(made.when)}</strong><span>${esc(made.ago())}</span>`:'<span>not downloaded yet</span>'}</div><div class="phf-lib-size">${made&&made.size?esc(made.size):esc(m.ext)}</div><div class="phf-lib-flow"><strong>Used by</strong><span>${esc(m.meta)}</span></div><div class="phf-lib-btns"><button type="button" class="phf-lib-btn download" data-src="#${b.id}"${b.disabled?' disabled':''}>Download</button></div></div>`;}).join(''):'<div class="empty-output">Run the reconciliation to create its download files.</div>';
    host.classList.toggle('phf-lib-list',btns.length>0);
    host.querySelectorAll('[data-src]').forEach(x=>{x.onclick=()=>{const src=$(x.dataset.src);if(src&&!src.disabled){src.click();noteMade(src.id);if(x.dataset.src==='#downloadBtn')stepDone.export=true;render();}};});
    const meta=document.querySelector('#stepgroup-export [data-step-meta]');if(meta)meta.textContent=btns.length?`· ${btns.length} file${btns.length===1?'':'s'}`:'';
    const m1=document.querySelector('#stepgroup-check [data-step-meta]');if(m1){const n=INPUTS.map(info).filter(s=>s.loaded).length;m1.textContent=`· ${n} / ${INPUTS.length} inputs ready`;}
    const m2=document.querySelector('#stepgroup-reconcile [data-step-meta]'),sub=$('#resultSub');if(m2)m2.textContent=on&&sub?`· ${sub.textContent.slice(0,90)}`:'';
    if(count){count.textContent=`${ready} FILE${ready===1?'':'S'}`;count.className='result-badge'+(ready&&ready===btns.length?' ok':'');}
  }

  function render(){renderNav();renderCards();renderSummary();renderStage();renderOutputs();}
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render();});}

  /* ---------- files dropped on the rail ---------- */
  function acceptFiles(id,files){
    const def=INPUTS.find(d=>d.id===id);if(!def)return;
    if(def.kind==='ref'){saveReference(def,files[0]);return;}
    const input=$(def.input);if(!input)return;
    const list=def.multiple?[...files]:[files[0]];
    if(!def.multiple&&info(def).loaded)flags.updated[id]=true;else if(!def.multiple)delete flags.updated[id];delete flags.reject[id];
    try{const dt=new DataTransfer();list.forEach(f=>dt.items.add(f));input.files=dt.files;}catch(e){input.files=files;}
    input.dispatchEvent(new Event('change',{bubbles:true}));
    select(id);
  }

  /* ---------- reference data saved from the rail (same checks as reference-admin) ---------- */
  async function loadReferenceStatus(){
    try{const s=PHF.referenceStore?await PHF.referenceStore.status():{};ref.master=s.master||null;ref.supplier=s.supplier||null;ref.full=s.full||null;}
    catch(err){console.error(err);ref.message.master=ref.message.supplier='Reference data unavailable';}
    schedule();
  }
  // Resolves true when the file was validated and saved.
  async function saveReference(def,file){
    if(!file)return false;let ok=false;
    select(def.id);
    const hadValid=!!ref[def.id];
    if(!/\.(xlsx|xlsm|csv)$/i.test(file.name||'')){ref.invalid[def.id]=true;ref.message[def.id]='Not saved — choose an .xlsx, .xlsm or .csv file.';flags.reject[def.id]={name:file.name,msg:'not an .xlsx, .xlsm or .csv file'};render();return false;}
    const store=PHF.referenceStore;if(!store){ref.invalid[def.id]=true;ref.message[def.id]='Not saved — reference store unavailable.';render();return false;}
    ref.busy[def.id]=true;ref.invalid[def.id]=false;ref.message[def.id]=`Checking ${file.name}…`;render();
    try{
      if(def.refKind==='posMaster'){const p=await store.parsePosMaster(file);if(!p.info.records)throw new Error('No usable CH2-linked POS records were found.');ref.message[def.id]=`Validated ${p.info.records.toLocaleString()} CH2-linked POS records`;await store.save(def.refKind,file);}
      else{const p=await store.parseSupplierMerge(file);if(!p.info.discountRules)throw new Error('No usable discount rules were found. Load the Ongoing Discounts file (SRC_POS_ONGOING_DISCOUNTS) or the POS DB & SUPPLIER MERGE workbook.');
        const r=await store.saveDiscounts(file);
        ref.message[def.id]=`Validated ${p.info.discountRules.toLocaleString()} discount rules · saved as the shared Ongoing Discounts${r.full?' (its SRC_POS_ONGOING_DISCOUNTS sheet; the workbook is kept for its supplier names)':''}`;}
      ok=true;delete flags.reject[def.id];if(hadValid)flags.updated[def.id]=true;else delete flags.updated[def.id];
      await loadReferenceStatus();
      const app=global.PHFReconcileApp;if(app&&app.refreshReferenceStatus)await app.refreshReferenceStatus();
    }catch(err){console.error(err);ref.invalid[def.id]=true;ref.message[def.id]=`Not saved — ${err&&err.message?err.message:err}`;flags.reject[def.id]={name:file.name,msg:err&&err.message?err.message:String(err)};}
    finally{ref.busy[def.id]=false;render();}
    return ok;
  }
  function wireReferenceDrops(){
    document.querySelectorAll('[data-ref-drop]').forEach(zone=>{
      const id=zone.dataset.refDrop,def=INPUTS.find(d=>d.id===id),input=document.querySelector(`[data-ref-input="${id}"]`);if(!def||!input)return;
      zone.onclick=()=>input.click();
      zone.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click();}};
      input.onchange=()=>{const f=input.files&&input.files[0];input.value='';if(f)saveReference(def,f);};
      ['dragenter','dragover'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.add('drag');}));
      ['dragleave','drop'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.remove('drag');}));
      zone.addEventListener('drop',e=>{const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f)saveReference(def,f);});
    });
  }

  /* ---------- Drop All Input Files Here (v2.8.0) ----------
     Every dropped file is identified from its headings (file name only as a fallback): PDFs and readable invoice
     spreadsheets → Supplier invoices, merged_alligned master → POS / master, discount rules → Ongoing Discounts,
     BROWSEORDERFILES-style exports → POS back-end order. Each is handed to the same handler as its own control; anything
     ambiguous, duplicated or unrecognised stays listed with a picker. Nothing runs until Run reconciliation is pressed. */
  const bulk=[];
  const TITLES=Object.fromEntries(INPUTS.map(d=>[d.id,d.title]));
  const norm=v=>String(v==null?'':v).trim().toUpperCase().replace(/[^A-Z0-9%]+/g,' ').trim();
  async function sniff(file){
    const X=global.XLSX;if(!X)throw new Error('Spreadsheet library did not load.');
    const ext=(String(file.name||'').split('.').pop()||'').toLowerCase();
    const wb=(ext==='csv'||ext==='txt')?X.read(await file.text(),{type:'string',sheetRows:20}):X.read(await file.arrayBuffer(),{type:'array',sheetRows:20});
    const heads=[];for(const n of wb.SheetNames.slice(0,6)){const rows=X.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:null,raw:true,blankrows:false});for(const r of rows.slice(0,15))for(const v of r||[])if(v!=null&&String(v).trim())heads.push(norm(v));}
    return {sheets:wb.SheetNames.map(norm),heads};
  }
  async function identify(file){
    const name=String(file.name||''),low=name.toLowerCase();
    if(/\.pdf$/i.test(name))return {file,id:'invoices',status:'match',msg:'PDF — recognised as a supplier invoice.'};
    if(!/\.(xlsx|xlsm|xls|csv|txt)$/i.test(name))return {file,id:'',status:'unrecognised',msg:'Not a PDF or spreadsheet — choose the input it belongs to, or leave it unassigned.'};
    let s;try{s=await sniff(file);}catch(err){return {file,id:'',status:'unreadable',msg:`Could not read this file (${err&&err.message?err.message:err}).`};}
    const has=t=>s.heads.some(h=>h===t||h.includes(t)),ids=[];
    // The merged master has MATCH_STATUS (and, from v21.5.0, OD_* discount audit columns); the rules files have POS DISCOUNT% or a
    // SUPPLIER MERGE sheet. When a file shows both, the file name decides, otherwise it is left for review.
    const nameMaster=/merged_al+igned/.test(low),nameRules=/ongoing.?discount|supplier.?merge|pos.?db/.test(low);
    const isMaster=nameMaster||(has('POS MASTER BARCODE')&&has('MATCH STATUS'));
    const isRules=nameRules||has('POS DISCOUNT')||s.sheets.some(n=>n.includes('SUPPLIER MERGE'))||(!has('MATCH STATUS')&&has('OD DISCOUNT'));
    if(isMaster&&!isRules)ids.push('master');
    else if(isRules&&!isMaster)ids.push('supplier');
    else if(isMaster&&isRules){if(nameMaster&&!nameRules)ids.push('master');else if(nameRules&&!nameMaster)ids.push('supplier');else ids.push('master','supplier');}
    if(has('OR QTY')&&(has('ADJWSPRCE')||has('ADJDPRCE'))){if(/\.(xls|xlsx|csv)$/i.test(name))ids.push('pos');else return {file,id:'',choices:['pos'],status:'invalid',msg:'Looks like a POS order, but the POS order must be an .xls, .xlsx or .csv file — save it in one of those formats and drop it again.'};}
    if(ids.length===1)return {file,id:ids[0],status:'match',msg:`Recognised as ${TITLES[ids[0]]} from its headings.`};
    if(ids.length>1)return {file,id:'',choices:ids,status:'ambiguous',msg:`Could be ${ids.map(i=>TITLES[i]).join(' or ')} — choose the input it belongs to.`};
    if(PHF.parseSupplierInvoice){try{const doc=await PHF.parseSupplierInvoice(file);if(doc&&(doc.rows||[]).length)return {file,id:'invoices',status:'match',msg:`Recognised as a supplier invoice (${doc.rows.length} billed line${doc.rows.length===1?'':'s'}).`};}catch(err){}}
    return {file,id:'',status:'unrecognised',msg:'Not recognised from its headings — choose the input it belongs to, or leave it unassigned.'};
  }
  async function assign(r,id){
    const def=INPUTS.find(d=>d.id===id);if(!def)return false;
    if(def.kind==='ref'){const ok=await saveReference(def,r.file);r.msg=ok?`Saved as ${def.title} — ${ref.message[def.id]||'validated'}.`:`Not saved as ${def.title} — ${ref.message[def.id]||'structure not recognised'}`;return ok;}
    const okExt=def.id==='pos'?/\.(xls|xlsx|csv)$/i:/\.(pdf|xls|xlsx|csv)$/i;
    if(!okExt.test(String(r.file.name||''))){r.msg=`Not added — ${def.title} accepts ${def.id==='pos'?'.xls, .xlsx or .csv':'PDF, .xls, .xlsx or .csv'} files.`;return false;}
    acceptFiles(id,[r.file]);r.msg=`Added to ${def.title}.`;return true;
  }
  async function bulkAccept(list){
    const files=[...(list||[])];if(!files.length)return;
    const start=bulk.length;files.forEach(f=>bulk.push({file:f,id:'',status:'reading',msg:'Reading and identifying…'}));renderBulk();
    const found=[];for(let i=0;i<files.length;i++){const r=await identify(files[i]);bulk[start+i]=r;found.push(r);renderBulk();}
    for(const single of ['master','supplier','pos']){const rs=found.filter(r=>r.status==='match'&&r.id===single);if(rs.length>1)for(const r of rs){r.status='duplicate';r.choice=single;r.msg=`${rs.length} dropped files look like ${TITLES[single]} — assign the one to use.`;}}
    // Reference data first (saved and validated), then the order, then all invoices together.
    for(const id of ['master','supplier','pos']){for(const r of found.filter(x=>x.status==='match'&&x.id===id)){r.status=await assign(r,id)?'assigned':'invalid';if(r.status==='invalid'&&!flags.reject[id])flags.reject[id]={name:r.file.name,msg:r.msg.replace(/^Not (saved|added) as [^—]*— /,'')};renderBulk();}}
    const inv=found.filter(x=>x.status==='match'&&x.id==='invoices');if(inv.length){acceptFiles('invoices',inv.map(r=>r.file));for(const r of inv){r.status='assigned';r.msg=r.msg.replace(/\.$/,'')+' — added to Supplier invoices.';}}
    // v2.13.0 — assigned files and files rejected for a known input show on that input's rail row; only files that need a choice stay here
    for(let i=bulk.length-1;i>=0;i--)if(bulk[i].status==='assigned'||(bulk[i].status==='invalid'&&bulk[i].id))bulk.splice(i,1);
    renderBulk();schedule();
    const review=found.filter(r=>r.status!=='assigned'&&!(r.status==='invalid'&&r.id)).length,app=global.PHFReconcileApp,text=`${found.length-review} of ${found.length} dropped file${found.length===1?'':'s'} assigned automatically${review?` · ${review} need${review===1?'s':''} review in Drop All Input Files`:''}. Nothing has been run — press Run reconciliation when ready.`;
    if(app&&app.setStatus)app.setStatus(text,review?'warn':'info');else{const st=$('#status');if(st){st.className='status '+(review?'warn':'info');st.textContent=text;}}
  }
  async function bulkAssignRow(i){
    const r=bulk[i],sel=document.querySelector(`[data-bulk-select="${i}"]`),id=sel?sel.value:'';if(!r)return;
    if(!id){r.msg='Choose the input this file belongs to first.';renderBulk();return;}
    r.status='reading';r.msg=`Adding to ${TITLES[id]}…`;renderBulk();
    const ok=await assign(r,id);r.id=id;r.status=ok?'assigned':'invalid';
    if(ok)for(const o of bulk)if(o!==r&&o.status==='duplicate'&&o.choice===id){o.status='review';o.msg=`Not used — ${r.file.name} was assigned to ${TITLES[id]}.`;}
    if(!ok&&!flags.reject[id])flags.reject[id]={name:r.file.name,msg:r.msg.replace(/^Not (saved|added) as [^—]*— /,'')};
    for(let i=bulk.length-1;i>=0;i--)if(bulk[i].status==='assigned'||(bulk[i].status==='invalid'&&bulk[i].id))bulk.splice(i,1);
    renderBulk();schedule();
  }
  function renderBulk(){
    const host=$('#bulkResults'),badge=$('#bulkCount');if(!host)return;
    const review=bulk.filter(r=>!['assigned','reading'].includes(r.status)).length;
    if(badge){badge.textContent=review?`${review} TO REVIEW`:'0 FILES';badge.className='result-badge'+(review?' warn':'');}
    if(!bulk.length){host.innerHTML='';return;}
    host.innerHTML=bulk.map((r,i)=>{
      const ok=r.status==='assigned',cls=ok?'ok':r.status==='reading'?'reading':(r.status==='unrecognised'||r.status==='unreadable')?'bad':'review';
      const chip=ok?'READY':r.status==='reading'?'CHECKING':'REVIEW';   // v2.13.0: what stays in this list needs a choice
      const pick=r.choice||r.id||(r.choices&&r.choices[0])||'';
      const opts='<option value="">Choose input…</option>'+INPUTS.map(d=>`<option value="${d.id}"${pick===d.id?' selected':''}>${esc(d.title)}${r.choices&&r.choices.includes(d.id)&&!ok?' (suggested)':''}</option>`).join('');
      return `<div class="bulk-row ${cls}"><span class="bulk-state">${chip}</span><div class="bulk-file"><strong title="${esc(r.file.name)}">${esc(r.file.name)}</strong><span>${prettySize(r.file.size)} · ${esc(r.msg)}</span></div><div class="bulk-assign">${r.status==='reading'?'':`<select data-bulk-select="${i}" aria-label="Input for ${esc(r.file.name)}">${opts}</select><button type="button" class="btn small" data-bulk-assign="${i}"${ok?' disabled':''}>${ok?'Assigned':'Assign'}</button>`}</div></div>`;
    }).join('');
    host.querySelectorAll('[data-bulk-select]').forEach(s=>s.onchange=()=>{const i=+s.dataset.bulkSelect,r=bulk[i],b=host.querySelector(`[data-bulk-assign="${i}"]`);r.choice=s.value;if(b){const same=r.status==='assigned'&&s.value===r.id;b.disabled=same;b.textContent=same?'Assigned':'Assign';}});
    host.querySelectorAll('[data-bulk-assign]').forEach(b=>b.onclick=()=>bulkAssignRow(+b.dataset.bulkAssign));
  }
  // v2.14.0 — the whole INPUT FILES rail accepts dropped files (same path as Drop All); a drop on an input row still goes to that row.
  function wireRailDrop(){
    const sb=document.querySelector('.builder-sidebar');if(!sb)return;let depth=0;const hasFiles=e=>e.dataTransfer&&[...(e.dataTransfer.types||[])].includes('Files');
    sb.addEventListener('dragenter',e=>{if(!hasFiles(e))return;e.preventDefault();depth++;sb.classList.add('rail-drag');});
    sb.addEventListener('dragover',e=>{if(!hasFiles(e))return;e.preventDefault();e.dataTransfer.dropEffect='copy';});
    sb.addEventListener('dragleave',()=>{depth=Math.max(0,depth-1);if(!depth)sb.classList.remove('rail-drag');});
    sb.addEventListener('drop',e=>{depth=0;sb.classList.remove('rail-drag');if(e.defaultPrevented)return;e.preventDefault();const f=e.dataTransfer&&e.dataTransfer.files;if(f&&f.length)bulkAccept(f);});
  }
  function wireBulkDrop(){
    wireRailDrop();
    const zone=$('#bulkDrop'),input=$('#bulkInput');if(!zone||!input)return;
    zone.onclick=()=>input.click();
    zone.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click();}};
    input.onchange=()=>{const f=[...(input.files||[])];input.value='';bulkAccept(f);};
    ['dragenter','dragover'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.add('drag');}));
    ['dragleave','drop'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.remove('drag');}));
    zone.addEventListener('drop',e=>{const f=e.dataTransfer&&e.dataTransfer.files;if(f&&f.length)bulkAccept(f);});
  }

  /* ---------- watch the state app.js maintains ---------- */
  function observe(){
    const mo=new MutationObserver(schedule);
    ['#posFiles','#invoiceFiles'].forEach(s=>{const e=$(s);if(e)mo.observe(e,{childList:true,subtree:true,characterData:true});});
    ['#runBtn','#progress','#results','#referenceDot','#status',...OUTPUTS].forEach(s=>{const e=$(s);if(e)mo.observe(e,{attributes:true,attributeFilter:['class','disabled','title']});});
    const rs=$('#resultSub');if(rs)mo.observe(rs,{childList:true,characterData:true,subtree:true});
    OUTPUTS.forEach(s=>{const e=$(s);if(e)mo.observe(e,{childList:true,characterData:true,subtree:true});});
  }

  /* ---------- clear input files from the rail (v2.9.0) ---------- */
  function wireRailClear(){
    const order=$('#railClearOrder'),all=$('#railClearAll'),clear=$('#clearBtn');
    if(order)order.onclick=()=>{if(clear)clear.click();bulk.length=0;flags.updated={};flags.reject={};stepDone.check=stepDone.export=false;renderBulk();schedule();};
    if(clear)clear.addEventListener('click',()=>{flags.updated.pos=flags.updated.invoices=false;delete flags.reject.pos;delete flags.reject.invoices;stepDone.check=stepDone.export=false;schedule();});
    OUTPUTS.forEach(sel=>{const b=$(sel);if(b)b.addEventListener('click',()=>{if(!b.disabled){noteMade(b.id);schedule();}});});
    document.querySelectorAll('[data-run-step]').forEach(b=>{b.onclick=()=>{if(b.disabled)return;runStep(b.dataset.runStep);};});
    // Run all: the existing run() (step 2; step 1 is its own gate) then the POSActive import download (step 3)
    const runAll=$('#runBtn');if(runAll){runAll.onclick=async()=>{if(runAll.disabled)return;const app=global.PHFReconcileApp||{};if(app.run)await app.run();else return;const results=$('#results');if(results&&!results.classList.contains('hidden'))await runStep('export');};}
    const dl=$('#dlPosImport');if(dl)dl.onclick=e=>{e.preventDefault();const src=$('#downloadBtn');if(src&&!src.disabled){src.click();stepDone.export=true;schedule();}};
    if(all)all.onclick=async()=>{
      if(!global.confirm('Clear all input files?\n\nThis removes the POS order and supplier invoices from this session AND the saved POS / master and Ongoing Discounts from this browser (Ongoing Discounts is shared, so Build POS Master Databases and POS New Product Check Clean lose it too). You will need to drop the reference files again before the next run.'))return;
      if(clear)clear.click();bulk.length=0;flags.updated={};flags.reject={};stepDone.check=stepDone.export=false;renderBulk();
      try{if(PHF.referenceStore)await PHF.referenceStore.clear();}catch(err){console.error(err);}
      ref.message.master=ref.message.supplier='';ref.invalid.master=ref.invalid.supplier=false;
      await loadReferenceStatus();const app=global.PHFReconcileApp;if(app&&app.refreshReferenceStatus)await app.refreshReferenceStatus();render();
    };
  }
  // A reference file saved or deleted by another tool or tab (shared Library) shows here straight away.
  const REF_KINDS={posMaster:1,'lib:ref-discounts':1,supplierMerge:1};
  if(global.PHFLibrary)global.PHFLibrary.onChange(m=>{if(!m||!(m.action==='clear'||REF_KINDS[m.kind]))return;loadReferenceStatus();const app=global.PHFReconcileApp;if(app&&app.refreshReferenceStatus)app.refreshReferenceStatus();});
  wireReferenceDrops();wireBulkDrop();wireRailClear();observe();render();renderBulk();
  (PHF.referenceStore&&PHF.referenceStore.shareLegacy?PHF.referenceStore.shareLegacy():Promise.resolve(false)).then(shared=>{loadReferenceStatus();if(shared){const app=global.PHFReconcileApp;if(app&&app.refreshReferenceStatus)app.refreshReferenceStatus();}});
  global.PHFReconcileWorkspace={select,render,bulkAccept,runStep};
})(window);
