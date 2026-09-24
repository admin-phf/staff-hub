(function(global){
  'use strict';
  const PHF=global.PHFReconcile||{},CFG=global.PHFReferenceConfig||{},$=s=>document.querySelector(s);
  const els={masterRefStatus:$('#masterRefStatus'),supplierRefStatus:$('#supplierRefStatus'),referenceReady:$('#referenceReady'),masterRefBtn:$('#masterRefBtn'),supplierRefBtn:$('#supplierRefBtn'),masterRefInput:$('#masterRefInput'),supplierRefInput:$('#supplierRefInput'),clearReferenceBtn:$('#clearReferenceBtn'),sourceFolder:$('#sourceFolder'),sourcePrefix:$('#sourcePrefix'),sourceSupplier:$('#sourceSupplier'),masterCard:$('#masterCard'),supplierCard:$('#supplierCard')};
  function prettySize(bytes){if(bytes<1024)return `${bytes} B`;if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} KB`;return `${(bytes/1024/1024).toFixed(1)} MB`;}
  function refLabel(rec){if(!rec)return 'Not loaded';const when=rec.savedAt?new Date(rec.savedAt).toLocaleString():'saved';return `${rec.name} · ${prettySize(rec.size||0)} · ${when}`;}
  async function refresh(){const s=await PHF.referenceStore.status();const masterLabel=refLabel(s.master),supplierLabel=refLabel(s.supplier);els.masterRefStatus.textContent=masterLabel;els.masterRefStatus.title=masterLabel;els.supplierRefStatus.textContent=supplierLabel;els.supplierRefStatus.title=supplierLabel;const ready=!!(s.master&&s.supplier);els.referenceReady.textContent=ready?'Reference data ready':'Reference data incomplete';els.referenceReady.className=`ref-ready ${ready?'ok':'warn'}`;}
  async function saveReference(kind,file,button,statusEl,card){if(!file)return;button.disabled=true;card.classList.add('loading');const old=button.textContent;button.textContent='Checking…';statusEl.textContent=`Checking ${file.name}…`;try{if(kind==='posMaster'){const parsed=await PHF.referenceStore.parsePosMaster(file);if(!parsed.info.records)throw new Error('No usable CH2-linked POS records were found.');statusEl.textContent=`Validated ${parsed.info.records.toLocaleString()} CH2-linked POS records…`;}else{const parsed=await PHF.referenceStore.parseSupplierMerge(file);if(!parsed.info.discountRules)throw new Error('No usable discount rules were found. Load POS DB & SUPPLIER MERGE or a SRC_POS_ONGOING_DISCOUNTS CSV.');statusEl.textContent=`Validated ${parsed.info.discountRules.toLocaleString()} discount rules…`;}await PHF.referenceStore.save(kind,file);await refresh();}catch(err){console.error(err);statusEl.textContent=`Not saved — ${err.message||err}`;}finally{button.disabled=false;button.textContent=old;card.classList.remove('loading');}}

  function validReferenceFile(file){return !!file&&/\.(xlsx|xlsm|csv)$/i.test(file.name||'');}
  function wireReferenceDrop(card,input,kind,button,statusEl){
    if(!card)return ()=>{};
    const save=file=>{if(!file)return;if(!validReferenceFile(file)){statusEl.textContent='Not saved — choose an .xlsx, .xlsm or .csv file.';return;}saveReference(kind,file,button,statusEl,card);};
    ['dragenter','dragover'].forEach(evt=>card.addEventListener(evt,e=>{e.preventDefault();e.stopPropagation();card.classList.add('drag');if(e.dataTransfer)e.dataTransfer.dropEffect='copy';}));
    ['dragleave','dragend','drop'].forEach(evt=>card.addEventListener(evt,e=>{e.preventDefault();e.stopPropagation();card.classList.remove('drag');}));
    card.addEventListener('drop',e=>{const file=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];save(file);});
    card.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target===card){e.preventDefault();input.click();}});
    return save;
  }

  els.sourceFolder.textContent=CFG.POS_MASTER_FOLDER_ID||'Not configured';els.sourcePrefix.textContent=CFG.POS_MASTER_PREFIX||'';els.sourceSupplier.textContent=CFG.SUPPLIER_SPREADSHEET_ID||'Not configured';
  const saveMasterDrop=wireReferenceDrop(els.masterCard,els.masterRefInput,'posMaster',els.masterRefBtn,els.masterRefStatus);
  const saveSupplierDrop=wireReferenceDrop(els.supplierCard,els.supplierRefInput,'supplierMerge',els.supplierRefBtn,els.supplierRefStatus);
  els.masterRefBtn.onclick=()=>els.masterRefInput.click();els.supplierRefBtn.onclick=()=>els.supplierRefInput.click();
  els.masterRefInput.onchange=()=>{const f=els.masterRefInput.files[0];if(f)saveMasterDrop(f);els.masterRefInput.value='';};
  els.supplierRefInput.onchange=()=>{const f=els.supplierRefInput.files[0];if(f)saveSupplierDrop(f);els.supplierRefInput.value='';};
  els.clearReferenceBtn.onclick=async()=>{if(!confirm('Clear the POS/master and supplier/discount reference data stored in this browser?'))return;await PHF.referenceStore.clear();await refresh();};
  refresh().catch(err=>{console.error(err);els.referenceReady.textContent='Reference data unavailable';els.referenceReady.className='ref-ready warn';});
})(window);
