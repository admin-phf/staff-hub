/* Reconcile CH2 v2.8.0 — input rail + workspace, laid out like Build Master Databases, with Drop All Input Files Here.
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

  /* ---------- Drop All Input Files Here (v2.8.0) ----------
     Every dropped file is identified from its headings (file name only as a fallback): PDFs and readable invoice
     spreadsheets → Supplier invoices, merged_alligned master → POS / master, discount rules → Supplier + discount rules,
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
    if(def.kind==='ref'){await saveReference(def,r.file);const ok=!!ref[def.id]&&!ref.invalid[def.id]&&ref[def.id].name===r.file.name;r.msg=ok?`Saved as ${def.title} — ${ref.message[def.id]||'validated'}.`:`Not saved as ${def.title} — ${ref.message[def.id]||'structure not recognised'}`;return ok;}
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
    for(const id of ['master','supplier','pos']){for(const r of found.filter(x=>x.status==='match'&&x.id===id)){r.status=await assign(r,id)?'assigned':'invalid';renderBulk();}}
    const inv=found.filter(x=>x.status==='match'&&x.id==='invoices');if(inv.length){acceptFiles('invoices',inv.map(r=>r.file));for(const r of inv){r.status='assigned';r.msg=r.msg.replace(/\.$/,'')+' — added to Supplier invoices.';}}
    renderBulk();schedule();
    const review=found.filter(r=>r.status!=='assigned').length,app=global.PHFReconcileApp,text=`${found.length-review} of ${found.length} dropped file${found.length===1?'':'s'} assigned automatically${review?` · ${review} need${review===1?'s':''} review in Drop All Input Files`:''}. Nothing has been run — press Run reconciliation when ready.`;
    if(app&&app.setStatus)app.setStatus(text,review?'warn':'info');else{const st=$('#status');if(st){st.className='status '+(review?'warn':'info');st.textContent=text;}}
  }
  async function bulkAssignRow(i){
    const r=bulk[i],sel=document.querySelector(`[data-bulk-select="${i}"]`),id=sel?sel.value:'';if(!r)return;
    if(!id){r.msg='Choose the input this file belongs to first.';renderBulk();return;}
    r.status='reading';r.msg=`Adding to ${TITLES[id]}…`;renderBulk();
    const ok=await assign(r,id);r.id=id;r.status=ok?'assigned':'invalid';
    if(ok)for(const o of bulk)if(o!==r&&o.status==='duplicate'&&o.choice===id){o.status='review';o.msg=`Not used — ${r.file.name} was assigned to ${TITLES[id]}.`;}
    renderBulk();schedule();
  }
  function renderBulk(){
    const host=$('#bulkResults'),badge=$('#bulkCount');if(!host)return;
    const done=bulk.filter(r=>r.status==='assigned').length,review=bulk.filter(r=>!['assigned','reading'].includes(r.status)).length;
    if(badge){badge.textContent=bulk.length?`${done} ASSIGNED${review?` · ${review} TO REVIEW`:''}`:'0 FILES';badge.className='result-badge'+(bulk.length?(review?' warn':' ok'):'');}
    if(!bulk.length){host.innerHTML='';return;}
    host.innerHTML=bulk.map((r,i)=>{
      const ok=r.status==='assigned',cls=ok?'ok':r.status==='reading'?'reading':(r.status==='unrecognised'||r.status==='unreadable')?'bad':'review';
      const chip=ok?'ASSIGNED':r.status==='reading'?'CHECKING':(r.status==='unrecognised'||r.status==='unreadable')?'NOT RECOGNISED':'REVIEW';
      const pick=r.choice||r.id||(r.choices&&r.choices[0])||'';
      const opts='<option value="">Choose input…</option>'+INPUTS.map(d=>`<option value="${d.id}"${pick===d.id?' selected':''}>${esc(d.title)}${r.choices&&r.choices.includes(d.id)&&!ok?' (suggested)':''}</option>`).join('');
      return `<div class="bulk-row ${cls}"><div class="bulk-file"><strong>${esc(r.file.name)}</strong><span>${prettySize(r.file.size)} · ${esc(r.msg)}</span></div><span class="bulk-state">${chip}</span><div class="bulk-assign">${r.status==='reading'?'':`<select data-bulk-select="${i}" aria-label="Input for ${esc(r.file.name)}">${opts}</select><button type="button" class="btn small" data-bulk-assign="${i}"${ok?' disabled':''}>${ok?'Assigned':'Assign'}</button>`}</div></div>`;
    }).join('');
    host.querySelectorAll('[data-bulk-select]').forEach(s=>s.onchange=()=>{const i=+s.dataset.bulkSelect,r=bulk[i],b=host.querySelector(`[data-bulk-assign="${i}"]`);r.choice=s.value;if(b){const same=r.status==='assigned'&&s.value===r.id;b.disabled=same;b.textContent=same?'Assigned':'Assign';}});
    host.querySelectorAll('[data-bulk-assign]').forEach(b=>b.onclick=()=>bulkAssignRow(+b.dataset.bulkAssign));
  }
  function wireBulkDrop(){
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
    ['#runBtn','#progress','#results','#referenceDot',...OUTPUTS].forEach(s=>{const e=$(s);if(e)mo.observe(e,{attributes:true,attributeFilter:['class','disabled','title']});});
    OUTPUTS.forEach(s=>{const e=$(s);if(e)mo.observe(e,{childList:true,characterData:true,subtree:true});});
  }

  /* ---------- clear input files from the rail (v2.9.0) ---------- */
  function wireRailClear(){
    const order=$('#railClearOrder'),all=$('#railClearAll'),clear=$('#clearBtn');
    if(order)order.onclick=()=>{if(clear)clear.click();bulk.length=0;renderBulk();schedule();};
    if(all)all.onclick=async()=>{
      if(!global.confirm('Clear all input files?\n\nThis removes the POS order and supplier invoices from this session AND the saved POS / master and Supplier + discount rules from this browser. You will need to drop the reference files again before the next run.'))return;
      if(clear)clear.click();bulk.length=0;renderBulk();
      try{if(PHF.referenceStore)await PHF.referenceStore.clear();}catch(err){console.error(err);}
      ref.message.master=ref.message.supplier='';ref.invalid.master=ref.invalid.supplier=false;
      await loadReferenceStatus();const app=global.PHFReconcileApp;if(app&&app.refreshReferenceStatus)await app.refreshReferenceStatus();render();
    };
  }
  wireReferenceDrops();wireBulkDrop();wireRailClear();observe();render();renderBulk();loadReferenceStatus();
  global.PHFReconcileWorkspace={select,render,bulkAccept};
})(window);
