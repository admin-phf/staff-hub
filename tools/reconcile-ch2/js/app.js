(function(global){
  'use strict';
  const PHF=global.PHFReconcile||{};
  const state={pos:null,invoices:[],result:null,showAll:false,docs:[],posParsed:null,refs:null,referenceReady:false};
  const els={
    referencePanel:document.querySelector('#referencePanel'),masterRefStatus:document.querySelector('#masterRefStatus'),supplierRefStatus:document.querySelector('#supplierRefStatus'),referenceReady:document.querySelector('#referenceReady'),masterRefBtn:document.querySelector('#masterRefBtn'),supplierRefBtn:document.querySelector('#supplierRefBtn'),masterRefInput:document.querySelector('#masterRefInput'),supplierRefInput:document.querySelector('#supplierRefInput'),clearReferenceBtn:document.querySelector('#clearReferenceBtn'),
    posDrop:document.querySelector('#posDrop'),posInput:document.querySelector('#posInput'),posFiles:document.querySelector('#posFiles'),invoiceDrop:document.querySelector('#invoiceDrop'),invoiceInput:document.querySelector('#invoiceInput'),invoiceFiles:document.querySelector('#invoiceFiles'),
    runBtn:document.querySelector('#runBtn'),clearBtn:document.querySelector('#clearBtn'),status:document.querySelector('#status'),progress:document.querySelector('#progress'),progressBar:document.querySelector('#progressBar'),results:document.querySelector('#results'),resultSub:document.querySelector('#resultSub'),kpis:document.querySelector('#kpis'),warningBox:document.querySelector('#warningBox'),tableBody:document.querySelector('#resultTable tbody'),downloadBtn:document.querySelector('#downloadBtn'),toggleAllBtn:document.querySelector('#toggleAllBtn')
  };

  function validExt(file,allowed){const ext='.'+(file.name.split('.').pop()||'').toLowerCase();return allowed.includes(ext);}
  function prettySize(bytes){if(bytes<1024)return `${bytes} B`;if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} KB`;return `${(bytes/1024/1024).toFixed(1)} MB`;}
  function money(v,dp=2){return v==null||!Number.isFinite(Number(v))?'—':`$${Number(v).toLocaleString(undefined,{minimumFractionDigits:dp,maximumFractionDigits:dp})}`;}
  function qty(v){return v==null?'—':Number(v).toLocaleString(undefined,{maximumFractionDigits:3});}
  function row(file,onRemove){const div=document.createElement('div');div.className='file-row';const label=document.createElement('span');label.textContent=`✓ ${file.name} · ${prettySize(file.size)}`;const btn=document.createElement('button');btn.type='button';btn.textContent='Remove';btn.onclick=onRemove;div.append(label,btn);return div;}
  function setStatus(text,type='info'){els.status.className=`status ${type}`;els.status.textContent=text;}
  function setProgress(pct){els.progress.classList.remove('hidden');els.progressBar.style.width=`${Math.max(0,Math.min(100,pct))}%`;}
  function hideProgress(){els.progress.classList.add('hidden');els.progressBar.style.width='0%';}
  function hideResults(){els.results.classList.add('hidden');}

  function refLabel(rec){if(!rec)return 'Not loaded';const when=rec.savedAt?new Date(rec.savedAt).toLocaleString():'saved';return `${rec.name} · ${prettySize(rec.size||0)} · ${when}`;}
  async function refreshReferenceStatus(){
    try{
      const s=await PHF.referenceStore.status();state.referenceReady=!!(s.master&&s.supplier);els.masterRefStatus.textContent=refLabel(s.master);els.supplierRefStatus.textContent=refLabel(s.supplier);
      els.referenceReady.textContent=state.referenceReady?'Reference data ready':'Reference data required';els.referenceReady.className=`ref-ready ${state.referenceReady?'ok':'warn'}`;if(!state.referenceReady)els.referencePanel.open=true;renderFiles();
    }catch(err){console.error(err);state.referenceReady=false;els.referenceReady.textContent='Reference data unavailable';els.referenceReady.className='ref-ready warn';els.referencePanel.open=true;renderFiles();}
  }
  async function saveReference(kind,file,button,statusEl){
    if(!file)return;button.disabled=true;const old=button.textContent;button.textContent='Checking…';statusEl.textContent=`Checking ${file.name}…`;
    try{
      if(kind==='posMaster'){const parsed=await PHF.referenceStore.parsePosMaster(file);if(!parsed.info.records)throw new Error('No usable CH2-linked POS records were found.');statusEl.textContent=`${file.name} · ${parsed.info.records.toLocaleString()} CH2 codes`;}
      else {const parsed=await PHF.referenceStore.parseSupplierMerge(file);if(!parsed.info.discountRules)throw new Error('SRC_POS_ONGOING_DISCOUNTS could not be found or contains no usable rules.');statusEl.textContent=`${file.name} · ${parsed.info.discountRules.toLocaleString()} discount rules`;}
      await PHF.referenceStore.save(kind,file);state.refs=null;await refreshReferenceStatus();
    }catch(err){console.error(err);statusEl.textContent=`Not saved — ${err.message||err}`;els.referencePanel.open=true;}
    finally{button.disabled=false;button.textContent=old;}
  }

  function renderFiles(){
    els.posFiles.replaceChildren();if(state.pos)els.posFiles.append(row(state.pos,()=>{state.pos=null;state.result=null;state.posParsed=null;renderFiles();hideResults();}));
    els.invoiceFiles.replaceChildren();state.invoices.forEach((f,i)=>els.invoiceFiles.append(row(f,()=>{state.invoices.splice(i,1);state.result=null;state.docs=[];renderFiles();hideResults();})));
    const filesReady=!!state.pos&&state.invoices.length>0, ready=filesReady&&state.referenceReady;els.runBtn.disabled=!ready;
    if(!state.referenceReady)setStatus('Reference data needs to be loaded once on this computer before the full reconciliation can run.','warn');
    else if(filesReady)setStatus(`Ready: 1 POS order and ${state.invoices.length} supplier invoice${state.invoices.length===1?'':'s'} selected.`,'ok');
    else setStatus('Add one POS order and at least one supplier invoice to continue.','info');
  }
  function addPos(files){const f=[...files].find(x=>validExt(x,['.xls','.xlsx','.csv']));if(f)state.pos=f;state.result=null;state.posParsed=null;hideResults();renderFiles();}
  function addInvoices(files){for(const f of files){if(validExt(f,['.pdf','.xls','.xlsx','.csv'])&&!state.invoices.some(x=>x.name===f.name&&x.size===f.size))state.invoices.push(f);}state.result=null;state.docs=[];hideResults();renderFiles();}
  function wireDrop(zone,input,handler){zone.onclick=()=>input.click();zone.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click();}};input.onchange=()=>handler(input.files);['dragenter','dragover'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.add('drag');}));['dragleave','drop'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.remove('drag');}));zone.addEventListener('drop',e=>handler(e.dataTransfer.files));}

  function pill(status){let cls='bad';if(status==='OK')cls='ok';else if(status==='BETTER PRICE')cls='better';else if(/LOW/.test(status))cls='review';return `<span class="status-pill ${cls}">${escapeHtml(status)}</span>`;}
  function escapeHtml(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function kpi(label,value,cls=''){return `<div class="kpi ${cls}"><div class="n">${escapeHtml(value)}</div><div class="l">${escapeHtml(label)}</div></div>`;}
  function renderResults(){
    const r=state.result;if(!r)return;const t=r.totals;els.results.classList.remove('hidden');els.resultSub.textContent=`${r.orderNumber?`Order ${r.orderNumber} · `:''}${t.matchedInvoiceLines}/${t.invoiceLines} supplier lines matched to the POS order.`;
    els.kpis.innerHTML=[kpi('POS lines',t.posLines),kpi('Exceptions',t.exceptionLines,t.exceptionLines?'bad':'good'),kpi('Unmatched invoices',t.unmatchedInvoiceLines,t.unmatchedInvoiceLines?'bad':'good'),kpi('Better price',t.betterPriceLines,'good'),kpi('Potential missed $',money(t.missedTotal),t.missedTotal>0?'bad':'good')].join('');
    const warns=[...(r.warnings||[])];if(t.lowConfidenceLines)warns.push(`${t.lowConfidenceLines} matched line(s) have LOW confidence and should be reviewed.`);warns.push('The Excel download is built in the established 43-column CH2 PDF Extract format using the locally stored POS/master and supplier/discount references.');
    els.warningBox.classList.remove('hidden');els.warningBox.innerHTML='<strong>Review notes:</strong><br>'+warns.map(escapeHtml).join('<br>');
    const display=state.showAll?r.detail:r.detail.filter(x=>x.hasException||x.matchConfidence==='LOW');const extras=r.unmatchedInvoice.map(x=>({status:'NOT ORDERED / UNMATCHED',posDescription:x.description,orderedQty:null,suppliedQty:x.qtySupplied,expectedUnit:null,actualUnit:x.unitPriceExGst,unitVariance:null,missedTotal:0,matchConfidence:'',hasException:true}));const rows=[...display,...extras];
    els.tableBody.innerHTML=rows.length?rows.map(x=>`<tr><td>${pill(x.status)}</td><td>${escapeHtml(x.posDescription)}</td><td class="num">${qty(x.orderedQty)}</td><td class="num">${qty(x.suppliedQty)}</td><td class="num">${money(x.expectedUnit)}</td><td class="num">${money(x.actualUnit,4)}</td><td class="num">${money(x.unitVariance,4)}</td><td class="num">${money(x.missedTotal)}</td><td>${x.matchConfidence?escapeHtml(x.matchConfidence):'<span class="muted">—</span>'}</td></tr>`).join(''):'<tr><td colspan="9">No exceptions found.</td></tr>';
    els.toggleAllBtn.textContent=state.showAll?'Show exceptions only':'Show all lines';els.results.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function run(){
    if(!state.pos||!state.invoices.length||!state.referenceReady){els.referencePanel.open=true;return;}
    els.runBtn.disabled=true;els.clearBtn.disabled=true;hideResults();setProgress(4);setStatus('Loading linked POS/master reference data…','info');
    try{
      state.refs=state.refs||await PHF.referenceStore.parseStored();setProgress(18);setStatus(`Reference data ready: ${state.refs.master.info.records.toLocaleString()} CH2 codes and ${state.refs.supplier.info.discountRules.toLocaleString()} discount rules. Reading POS order…`,'info');
      const pos=await PHF.parsePosOrder(state.pos);state.posParsed=pos;setProgress(35);setStatus(`POS order read: ${pos.rows.length} ordered product lines. Reading supplier invoice(s)…`,'info');
      const docs=[];for(let i=0;i<state.invoices.length;i++){const doc=await PHF.parseSupplierInvoice(state.invoices[i]);docs.push(doc);setProgress(35+Math.round(((i+1)/state.invoices.length)*38));}state.docs=docs;
      const invoiceCount=docs.reduce((a,d)=>a+(d.rows||[]).length,0);setStatus(`Supplier invoices read: ${invoiceCount} product lines. Matching to POS order…`,'info');setProgress(82);state.result=PHF.reconcile(pos,docs);setProgress(100);
      const t=state.result.totals;setStatus(`Complete: ${t.matchedInvoiceLines}/${t.invoiceLines} invoice lines matched. ${t.exceptionLines} POS line exception${t.exceptionLines===1?'':'s'}${t.unmatchedInvoiceLines?`, ${t.unmatchedInvoiceLines} unmatched invoice line${t.unmatchedInvoiceLines===1?'':'s'}`:''}.`,'ok');renderResults();setTimeout(hideProgress,500);
    }catch(err){console.error(err);hideProgress();setStatus(err&&err.message?err.message:String(err),'warn');if(/reference/i.test(err&&err.message||''))els.referencePanel.open=true;}
    finally{els.runBtn.disabled=!(state.pos&&state.invoices.length&&state.referenceReady);els.clearBtn.disabled=false;}
  }

  wireDrop(els.posDrop,els.posInput,addPos);wireDrop(els.invoiceDrop,els.invoiceInput,addInvoices);
  els.masterRefBtn.onclick=()=>els.masterRefInput.click();els.supplierRefBtn.onclick=()=>els.supplierRefInput.click();
  els.masterRefInput.onchange=()=>saveReference('posMaster',els.masterRefInput.files[0],els.masterRefBtn,els.masterRefStatus);
  els.supplierRefInput.onchange=()=>saveReference('supplierMerge',els.supplierRefInput.files[0],els.supplierRefBtn,els.supplierRefStatus);
  els.clearReferenceBtn.onclick=async()=>{if(!confirm('Clear the POS/master and supplier/discount reference data stored in this browser?'))return;await PHF.referenceStore.clear();state.refs=null;await refreshReferenceStatus();};
  els.clearBtn.onclick=()=>{state.pos=null;state.invoices=[];state.result=null;state.docs=[];state.posParsed=null;state.showAll=false;els.posInput.value='';els.invoiceInput.value='';hideResults();hideProgress();renderFiles();};
  els.runBtn.onclick=run;
  els.downloadBtn.onclick=async()=>{if(!state.result||!state.docs.length||!state.refs)return;const old=els.downloadBtn.textContent;els.downloadBtn.disabled=true;els.downloadBtn.textContent='Building Excel…';try{await PHF.exportReference(state.docs,state.refs);}catch(err){console.error(err);setStatus(err&&err.message?err.message:String(err),'warn');}finally{els.downloadBtn.disabled=false;els.downloadBtn.textContent=old;}};
  els.toggleAllBtn.onclick=()=>{state.showAll=!state.showAll;renderResults();};
  refreshReferenceStatus();
})(window);
