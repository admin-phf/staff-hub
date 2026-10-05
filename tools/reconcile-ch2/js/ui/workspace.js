/* Reconcile CH2 v2.7.0 — input rail + workspace, laid out like Build Master Databases.
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
    {id:'supplier',group:'Reference data',title:'Supplier + discount rules',kind:'ref',refKind:'supplierMerge',req:true},
    {id:'pos',group:'Order files',title:'POS back-end order',kind:'order',input:'#posInput',list:'#posFiles',req:true},
    {id:'invoices',group:'Order files',title:'Supplier invoices',kind:'order',input:'#invoiceInput',list:'#invoiceFiles',req:true,multiple:true}
  ];
  const GROUPS=[
    {title:'Reference data',ids:['master','supplier'],verb:'saved'},
    {title:'POS order',ids:['pos'],verb:'loaded'},
    {title:'Supplier invoices',ids:['invoices'],verb:'loaded'}
  ];
  const OUTPUTS=['#downloadBtn','#fullDownloadBtn','#fullCsvDownloadBtn','#keyReviewBtn'];
  const ref={master:null,supplier:null,busy:{},invalid:{},message:{}};
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
      const cls=['input-nav-item',s.loaded?'loaded':'missing',d.req?'required':'',selected===d.id?'active':'',s.invalid?'invalid':''].filter(Boolean).join(' ');
      const state=s.busy?'CHECKING':s.loaded?'LOADED':d.req?'REQUIRED':'OPTIONAL';
      html+=`<button type="button" class="${cls}" data-input="${d.id}" title="Click to open, or drop the ${esc(d.title)} file${d.multiple?'s':''} directly here"><span class="input-dot">${s.loaded?'✓':d.req?'!':'○'}</span><span><strong>${esc(d.title)}</strong><small>${esc(s.sub)}</small></span><span class="input-state">${state}</span></button>`;
    }
    if(last)html+='</div>';
    host.innerHTML=html;
    host.querySelectorAll('[data-input]').forEach(b=>{
      const id=b.dataset.input;
      b.onclick=()=>select(id);
      b.ondragenter=b.ondragover=e=>{e.preventDefault();e.stopPropagation();b.classList.add('drag-target');if(e.dataTransfer)e.dataTransfer.dropEffect='copy';};
      b.ondragleave=e=>{e.preventDefault();e.stopPropagation();b.classList.remove('drag-target');};
      b.ondrop=e=>{e.preventDefault();e.stopPropagation();b.classList.remove('drag-target');const files=e.dataTransfer&&e.dataTransfer.files;if(files&&files.length)acceptFiles(id,files);};
    });
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

  /* ---------- run stage ---------- */
  function renderStage(){
    const run=$('#runBtn'),progress=$('#progress'),results=$('#results'),badge=$('#stageBadge'),host=$('#stage-reconcile');if(!run||!badge)return;
    const running=progress&&!progress.classList.contains('hidden'),done=results&&!results.classList.contains('hidden');
    const st=running?'running':done?'done':!run.disabled?'ready':'wait';
    badge.className='small-badge '+st;badge.textContent={running:'RUNNING',done:'DONE',ready:'READY',wait:'WAITING'}[st];
    if(host){host.classList.remove('ready','running','done','error');if(st!=='wait')host.classList.add(st);}
  }

  /* ---------- generated output files (mirrors the result download buttons) ---------- */
  function renderOutputs(){
    const host=$('#allOutputs'),count=$('#outputCount');if(!host)return;
    const results=$('#results'),on=results&&!results.classList.contains('hidden');
    const btns=on?OUTPUTS.map(s=>$(s)).filter(b=>b&&!b.classList.contains('hidden')):[];
    const ready=btns.filter(b=>!b.disabled).length;
    host.innerHTML=btns.length?btns.map(b=>`<div class="output-row"><div><code>${esc(b.textContent.replace(/^Download\s+/i,''))}</code><span>${esc(b.title||'')}</span></div><div class="output-actions"><button type="button" class="download-link" data-src="#${b.id}"${b.disabled?' disabled':''}>Download</button></div></div>`).join(''):'<div class="empty-output">Run the reconciliation to create its download files.</div>';
    host.querySelectorAll('[data-src]').forEach(x=>{x.onclick=()=>{const src=$(x.dataset.src);if(src&&!src.disabled)src.click();};});
    if(count){count.textContent=`${ready} OUTPUT${ready===1?'':'S'}`;count.className='result-badge'+(ready?' ok':'');}
  }

  function render(){renderNav();renderCards();renderSummary();renderStage();renderOutputs();}
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render();});}

  /* ---------- files dropped on the rail ---------- */
  function acceptFiles(id,files){
    const def=INPUTS.find(d=>d.id===id);if(!def)return;
    if(def.kind==='ref'){saveReference(def,files[0]);return;}
    const input=$(def.input);if(!input)return;
    const list=def.multiple?[...files]:[files[0]];
    try{const dt=new DataTransfer();list.forEach(f=>dt.items.add(f));input.files=dt.files;}catch(e){input.files=files;}
    input.dispatchEvent(new Event('change',{bubbles:true}));
    select(id);
  }

  /* ---------- reference data saved from the rail (same checks as reference-admin) ---------- */
  async function loadReferenceStatus(){
    try{const s=PHF.referenceStore?await PHF.referenceStore.status():{};ref.master=s.master||null;ref.supplier=s.supplier||null;}
    catch(err){console.error(err);ref.message.master=ref.message.supplier='Reference data unavailable';}
    schedule();
  }
  async function saveReference(def,file){
    if(!file)return;
    select(def.id);
    if(!/\.(xlsx|xlsm|csv)$/i.test(file.name||'')){ref.invalid[def.id]=true;ref.message[def.id]='Not saved — choose an .xlsx, .xlsm or .csv file.';render();return;}
    const store=PHF.referenceStore;if(!store){ref.invalid[def.id]=true;ref.message[def.id]='Not saved — reference store unavailable.';render();return;}
    ref.busy[def.id]=true;ref.invalid[def.id]=false;ref.message[def.id]=`Checking ${file.name}…`;render();
    try{
      if(def.refKind==='posMaster'){const p=await store.parsePosMaster(file);if(!p.info.records)throw new Error('No usable CH2-linked POS records were found.');ref.message[def.id]=`Validated ${p.info.records.toLocaleString()} CH2-linked POS records`;}
      else{const p=await store.parseSupplierMerge(file);if(!p.info.discountRules)throw new Error('No usable discount rules were found. Load POS DB & SUPPLIER MERGE or a SRC_POS_ONGOING_DISCOUNTS CSV.');ref.message[def.id]=`Validated ${p.info.discountRules.toLocaleString()} discount rules`;}
      await store.save(def.refKind,file);
      await loadReferenceStatus();
      const app=global.PHFReconcileApp;if(app&&app.refreshReferenceStatus)await app.refreshReferenceStatus();
    }catch(err){console.error(err);ref.invalid[def.id]=true;ref.message[def.id]=`Not saved — ${err&&err.message?err.message:err}`;}
    finally{ref.busy[def.id]=false;render();}
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

  /* ---------- watch the state app.js maintains ---------- */
  function observe(){
    const mo=new MutationObserver(schedule);
    ['#posFiles','#invoiceFiles'].forEach(s=>{const e=$(s);if(e)mo.observe(e,{childList:true,subtree:true,characterData:true});});
    ['#runBtn','#progress','#results','#referenceDot',...OUTPUTS].forEach(s=>{const e=$(s);if(e)mo.observe(e,{attributes:true,attributeFilter:['class','disabled','title']});});
    OUTPUTS.forEach(s=>{const e=$(s);if(e)mo.observe(e,{childList:true,characterData:true,subtree:true});});
  }

  wireReferenceDrops();observe();render();loadReferenceStatus();
  global.PHFReconcileWorkspace={select,render};
})(window);
