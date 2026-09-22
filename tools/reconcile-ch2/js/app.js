(function(global){
  'use strict';
  const PHF=global.PHFReconcile||{};
  const state={pos:null,invoices:[],result:null,showAll:false,docs:[],refs:null,referenceReady:false,posParsed:null,runIntegrity:null};
  const els={
    referenceReady:document.querySelector('#referenceReady'),referenceDot:document.querySelector('#referenceDot'),buildLabel:document.querySelector('#buildLabel'),
    posDrop:document.querySelector('#posDrop'),posInput:document.querySelector('#posInput'),posFiles:document.querySelector('#posFiles'),invoiceDrop:document.querySelector('#invoiceDrop'),invoiceInput:document.querySelector('#invoiceInput'),invoiceFiles:document.querySelector('#invoiceFiles'),runBtn:document.querySelector('#runBtn'),clearBtn:document.querySelector('#clearBtn'),status:document.querySelector('#status'),progress:document.querySelector('#progress'),progressBar:document.querySelector('#progressBar'),results:document.querySelector('#results'),resultSub:document.querySelector('#resultSub'),kpis:document.querySelector('#kpis'),warningBox:document.querySelector('#warningBox'),tableBody:document.querySelector('#resultTable tbody'),downloadBtn:document.querySelector('#downloadBtn'),toggleAllBtn:document.querySelector('#toggleAllBtn')
  };

  function validExt(file,allowed){const ext='.'+(file.name.split('.').pop()||'').toLowerCase();return allowed.includes(ext);}
  function prettySize(bytes){if(bytes<1024)return `${bytes} B`;if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} KB`;return `${(bytes/1024/1024).toFixed(1)} MB`;}
  function money(v,dp=2){return v==null||!Number.isFinite(Number(v))?'—':`$${Number(v).toLocaleString(undefined,{minimumFractionDigits:dp,maximumFractionDigits:dp})}`;}
  function qty(v){return v==null?'—':Number(v).toLocaleString(undefined,{maximumFractionDigits:3});}
  function fileRow(file,onRemove){const div=document.createElement('div');div.className='file-row';const label=document.createElement('span');label.textContent=`✓ ${file.name} · ${prettySize(file.size)}`;const btn=document.createElement('button');btn.type='button';btn.textContent='Remove';btn.onclick=onRemove;div.append(label,btn);return div;}
  function setStatus(text,type='info'){els.status.className=`status ${type}`;els.status.textContent=text;}
  function setProgress(pct){els.progress.classList.remove('hidden');els.progressBar.style.width=`${Math.max(0,Math.min(100,pct))}%`;}
  function hideProgress(){els.progress.classList.add('hidden');els.progressBar.style.width='0%';}
  function hideResults(){els.results.classList.add('hidden');}
  function escapeHtml(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

  async function refreshReferenceStatus(){
    try{const s=await PHF.referenceStore.status();state.referenceReady=!!(s.master&&s.supplier);if(state.referenceReady){const name=(s.master&&s.master.name)||'POS master';els.referenceReady.textContent=`Ready · ${name}`;els.referenceDot.className='reference-dot ok';}else{els.referenceReady.textContent='Admin setup required';els.referenceDot.className='reference-dot warn';}renderFiles();}
    catch(err){console.error(err);state.referenceReady=false;els.referenceReady.textContent='Unavailable';els.referenceDot.className='reference-dot warn';renderFiles();}
  }
  function renderFiles(){
    els.posFiles.replaceChildren();if(state.pos)els.posFiles.append(fileRow(state.pos,()=>{state.pos=null;state.result=null;state.posParsed=null;state.runIntegrity=null;renderFiles();hideResults();}));
    els.invoiceFiles.replaceChildren();state.invoices.forEach((f,i)=>els.invoiceFiles.append(fileRow(f,()=>{state.invoices.splice(i,1);state.result=null;state.docs=[];state.runIntegrity=null;renderFiles();hideResults();})));
    const filesReady=!!state.pos&&state.invoices.length>0,ready=filesReady&&state.referenceReady;els.runBtn.disabled=!ready;
    if(!state.referenceReady)setStatus('Reference data is not ready on this computer. Open Admin to load the POS master and supplier/discount reference data.','warn');
    else if(filesReady)setStatus(`Ready: 1 POS order and ${state.invoices.length} supplier invoice${state.invoices.length===1?'':'s'} selected.`,'ok');
    else setStatus('Add one POS order and at least one supplier invoice to continue.','info');
  }
  function addPos(files){const f=[...files].find(x=>validExt(x,['.xls','.xlsx','.csv']));if(f)state.pos=f;state.result=null;state.posParsed=null;state.runIntegrity=null;hideResults();renderFiles();}
  function addInvoices(files){for(const f of files){if(validExt(f,['.pdf','.xls','.xlsx','.csv'])&&!state.invoices.some(x=>x.name===f.name&&x.size===f.size))state.invoices.push(f);}state.result=null;state.docs=[];state.runIntegrity=null;hideResults();renderFiles();}
  function wireDrop(zone,input,handler){zone.onclick=()=>input.click();zone.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click();}};input.onchange=()=>handler(input.files);['dragenter','dragover'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.add('drag');}));['dragleave','drop'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.remove('drag');}));zone.addEventListener('drop',e=>handler(e.dataTransfer.files));}

  function pill(status){let cls='bad';if(status==='OK')cls='ok';else if(status==='BETTER PRICE')cls='better';else if(/LOW/.test(status))cls='review';return `<span class="status-pill ${cls}">${escapeHtml(status)}</span>`;}
  function kpi(label,value,cls=''){return `<div class="kpi ${cls}"><div class="n">${escapeHtml(value)}</div><div class="l">${escapeHtml(label)}</div></div>`;}
  function renderResults(){
    const r=state.result;if(!r)return;const t=r.totals,integ=state.runIntegrity||{ok:false,errors:['Integrity not run'],warnings:[]};els.results.classList.remove('hidden');els.resultSub.textContent=`${r.orderNumber?`Order ${r.orderNumber} · `:''}${t.matchedInvoiceLines}/${t.invoiceLines} supplier lines matched to the POS order.`;
    els.kpis.innerHTML=[kpi('POS lines',t.posLines),kpi('Exceptions',t.exceptionLines,t.exceptionLines?'bad':'good'),kpi('Unmatched invoices',t.unmatchedInvoiceLines,t.unmatchedInvoiceLines?'bad':'good'),kpi('Better price',t.betterPriceLines,'good'),kpi('Potential missed $',money(t.missedTotal),t.missedTotal>0?'bad':'good'),kpi('Integrity',integ.ok?'PASS':'BLOCKED',integ.ok?'good':'bad')].join('');
    const notes=[...(r.warnings||[])];if(t.lowConfidenceLines)notes.push(`${t.lowConfidenceLines} matched line(s) have LOW confidence and should be reviewed.`);if(integ.ok)notes.unshift('Integrity checks passed: POS source order is locked, every parsed invoice row is accounted for exactly once, and supplier invoice arithmetic is valid.');else notes.unshift(...integ.errors.map(x=>`INTEGRITY BLOCK: ${x}`));notes.push(...(integ.warnings||[]));notes.push('Excel output keeps every POS order line in the exact uploaded sequence. Genuine invoice-only lines are appended only after the complete POS order block.');
    els.warningBox.classList.remove('hidden','ok','bad');els.warningBox.classList.add(integ.ok?'ok':'bad');els.warningBox.innerHTML='<strong>Review notes:</strong><br>'+notes.map(escapeHtml).join('<br>');
    const display=state.showAll?r.detail:r.detail.filter(x=>x.hasException||x.matchConfidence==='LOW'),extras=r.unmatchedInvoice.map(x=>({status:'NOT ORDERED / UNMATCHED',posDescription:x.description,orderedQty:null,suppliedQty:x.qtySupplied,expectedUnit:null,actualUnit:x.unitPriceExGst,unitVariance:null,missedTotal:0,matchConfidence:'',hasException:true})),rows=[...display,...extras];
    els.tableBody.innerHTML=rows.length?rows.map(x=>`<tr><td>${pill(x.status)}</td><td>${escapeHtml(x.posDescription)}</td><td class="num">${qty(x.orderedQty)}</td><td class="num">${qty(x.suppliedQty)}</td><td class="num">${money(x.expectedUnit)}</td><td class="num">${money(x.actualUnit,4)}</td><td class="num">${money(x.unitVariance,4)}</td><td class="num">${money(x.missedTotal)}</td><td>${x.matchConfidence?escapeHtml(x.matchConfidence):'<span class="muted">—</span>'}</td></tr>`).join(''):'<tr><td colspan="9">No exceptions found.</td></tr>';
    els.toggleAllBtn.textContent=state.showAll?'Show exceptions only':'Show all lines';els.downloadBtn.disabled=!integ.ok;els.downloadBtn.title=integ.ok?'':'Excel export is blocked until all integrity checks pass.';els.results.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function run(){
    if(!state.pos||!state.invoices.length||!state.referenceReady){setStatus('Reference data is not ready on this computer. Open Admin to update it.','warn');return;}
    els.runBtn.disabled=true;els.clearBtn.disabled=true;hideResults();setProgress(4);setStatus('Loading POS/master and discount reference data…','info');
    try{
      state.refs=await PHF.referenceStore.parseStored();setProgress(18);setStatus(`Reference data ready: ${state.refs.master.info.records.toLocaleString()} CH2 codes and ${state.refs.supplier.info.discountRules.toLocaleString()} discount rules. Reading POS order…`,'info');
      const pos=await PHF.parsePosOrder(state.pos);state.posParsed=pos;setProgress(35);setStatus(`POS order read: ${pos.rows.length} ordered product lines. Reading supplier invoice(s)…`,'info');
      const docs=[];for(let i=0;i<state.invoices.length;i++){const doc=await PHF.parseSupplierInvoice(state.invoices[i]);docs.push(doc);setProgress(35+Math.round(((i+1)/state.invoices.length)*38));}state.docs=docs;
      const invoiceCount=docs.reduce((a,d)=>a+(d.rows||[]).length,0);setStatus(`Supplier invoices read: ${invoiceCount} billed product lines. Matching to POS order…`,'info');setProgress(82);
      state.result=PHF.reconcile(pos,docs,state.refs);state.runIntegrity=PHF.integrity.validateRun(pos,docs,state.result);state.result.integrity=state.runIntegrity;setProgress(100);
      const t=state.result.totals;if(state.runIntegrity.ok)setStatus(`Complete: ${t.matchedInvoiceLines}/${t.invoiceLines} invoice lines matched. ${t.exceptionLines} POS line exception${t.exceptionLines===1?'':'s'}${t.unmatchedInvoiceLines?`, ${t.unmatchedInvoiceLines} unmatched invoice line${t.unmatchedInvoiceLines===1?'':'s'}`:''}. Integrity PASS.`,'ok');else setStatus(`Reconciliation completed, but Excel export is blocked by ${state.runIntegrity.errors.length} integrity check${state.runIntegrity.errors.length===1?'':'s'}. Review the notes below.`,'warn');
      renderResults();setTimeout(hideProgress,500);
    }catch(err){console.error(err);hideProgress();setStatus(err&&err.message?err.message:String(err),'warn');}
    finally{els.runBtn.disabled=!(state.pos&&state.invoices.length&&state.referenceReady);els.clearBtn.disabled=false;}
  }

  wireDrop(els.posDrop,els.posInput,addPos);wireDrop(els.invoiceDrop,els.invoiceInput,addInvoices);
  els.clearBtn.onclick=()=>{state.pos=null;state.invoices=[];state.result=null;state.docs=[];state.posParsed=null;state.showAll=false;state.runIntegrity=null;els.posInput.value='';els.invoiceInput.value='';hideResults();hideProgress();renderFiles();};
  els.runBtn.onclick=run;
  els.downloadBtn.onclick=async()=>{if(!state.result||!state.docs.length||!state.refs||!state.runIntegrity||!state.runIntegrity.ok)return;const old=els.downloadBtn.textContent;els.downloadBtn.disabled=true;els.downloadBtn.textContent='Building + validating Excel…';try{await PHF.exportReference(state.docs,state.refs,state.posParsed,state.result);setStatus('Excel generated and passed workbook compatibility/integrity validation.','ok');}catch(err){console.error(err);setStatus(err&&err.message?err.message:String(err),'warn');}finally{els.downloadBtn.disabled=!state.runIntegrity.ok;els.downloadBtn.textContent=old;}};
  els.toggleAllBtn.onclick=()=>{state.showAll=!state.showAll;renderResults();};
  if(els.buildLabel&&PHF.schema&&PHF.schema.BUILD)els.buildLabel.textContent=`v${PHF.schema.BUILD.version} · ${PHF.schema.BUILD.name}`;
  refreshReferenceStatus();
})(window);
