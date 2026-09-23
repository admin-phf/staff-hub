(function(global){
  'use strict';
  const PHF=global.PHFReconcile||{};
  const state={pos:null,invoices:[],result:null,previewView:'exceptions',docs:[],refs:null,referenceReady:false,posParsed:null,runIntegrity:null};
  const els={
    referenceReady:document.querySelector('#referenceReady'),referenceDot:document.querySelector('#referenceDot'),buildLabel:document.querySelector('#buildLabel'),
    posDrop:document.querySelector('#posDrop'),posInput:document.querySelector('#posInput'),posFiles:document.querySelector('#posFiles'),invoiceDrop:document.querySelector('#invoiceDrop'),invoiceInput:document.querySelector('#invoiceInput'),invoiceFiles:document.querySelector('#invoiceFiles'),runBtn:document.querySelector('#runBtn'),clearBtn:document.querySelector('#clearBtn'),status:document.querySelector('#status'),progress:document.querySelector('#progress'),progressBar:document.querySelector('#progressBar'),results:document.querySelector('#results'),resultSub:document.querySelector('#resultSub'),kpis:document.querySelector('#kpis'),warningBox:document.querySelector('#warningBox'),tableWrap:document.querySelector('.table-wrap'),table:document.querySelector('#resultTable'),tableHead:document.querySelector('#resultTableHead'),tableBody:document.querySelector('#resultTable tbody'),tableFoot:document.querySelector('#resultTableFoot'),downloadBtn:document.querySelector('#downloadBtn'),viewExceptionsBtn:document.querySelector('#viewExceptionsBtn'),viewAllBtn:document.querySelector('#viewAllBtn'),viewPosBtn:document.querySelector('#viewPosBtn')
  };

  const RECON_HEADERS=['Status','POS product','Ordered','Supplied','Expected unit','Invoice unit','Variance','Missed $','Match'];
  const POS_VIEW_COLUMNS=[
    {key:'main_id',label:'Product #',kind:'text',cls:'pos-code'},
    {key:'sub_id',label:'Sub Id',kind:'text',cls:'pos-code'},
    {key:'descr',label:'Product Description',kind:'text',cls:'pos-desc'},
    {key:'gst_tax_pc',label:'GST %',kind:'number',dp:2},
    {key:'units',label:'Units',kind:'number',dp:2},
    {key:'qty',label:'Qty',kind:'number',dp:2},
    {key:'qty_stk_in',label:'Stk In',kind:'number',dp:3},
    {key:'or_ok',label:'Ok',kind:'bool',flag:'ok-flag'},
    {key:'mupc',label:'MU%',kind:'number',dp:2},
    {key:'gppc',label:'GP%',kind:'number',dp:2},
    {key:'adjrrprce',label:'AdjRRPrc',kind:'number',dp:2},
    {key:'adjwsprce',label:'AdjWSPrc',kind:'number',dp:2},
    {key:'adjcatprce',label:'AdjCatPrc',kind:'number',dp:2},
    {key:'adjdprce',label:'AdjDPrc',kind:'number',dp:2},
    {key:'or_qty',label:'Adj Qty',kind:'number',dp:3},
    {key:'override',label:'Inc',kind:'bool',flag:'inc-flag'}
  ];

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
  function rawValue(pos,key){if(pos&&pos.raw&&Object.prototype.hasOwnProperty.call(pos.raw,key))return pos.raw[key];return '';}
  function boolValue(v){if(v===true||v===1)return true;const s=String(v??'').trim().toLowerCase();return ['true','1','yes','y','checked'].includes(s);}
  function fixed(v,dp){if(v==null||v==='')return '';const n=Number(String(v).replace(/,/g,''));return Number.isFinite(n)?n.toFixed(dp):String(v);}
  function numberValue(v){if(v==null||v==='')return null;const n=Number(String(v).replace(/[$,%]/g,'').replace(/,/g,''));return Number.isFinite(n)?n:null;}
  function posDetailAt(index){return state.result&&state.result.detail?state.result.detail[index]||null:null;}
  function posDetailMap(){
    const map=new Map();
    for(const d of (state.result&&state.result.detail)||[]){
      const key=String(d&&d.sourceRow!=null?d.sourceRow:'');
      if(key&&!map.has(key))map.set(key,d);
    }
    return map;
  }
  function weightedInvoiceValue(detail,key){
    if(!detail||!Array.isArray(detail.invoiceRows)||!detail.invoiceRows.length)return null;let total=0,weight=0;
    for(const row of detail.invoiceRows){const v=numberValue(row&&row[key]),w=numberValue(row&&row.qtySupplied);if(v!=null&&w!=null&&w>0){total+=v*w;weight+=w;}}
    return weight>0?total/weight:null;
  }
  function comparisonTarget(detail,key){
    if(!detail)return null;
    if(key==='adjrrprce')return weightedInvoiceValue(detail,'rrp');
    if(key==='adjwsprce')return numberValue(detail.invoiceNormalWholesale);
    if(key==='adjdprce')return numberValue(detail.actualUnit);
    return null;
  }
  function priceMove(current,target){
    const a=numberValue(current),b=numberValue(target),tol=(PHF.schema&&PHF.schema.VISUAL&&PHF.schema.VISUAL.priceVisualTolerance)||0.03;
    if(a==null||b==null)return null;const diff=b-a;
    if(Math.abs(diff)<=tol)return {kind:'same',symbol:'—',diff,target:b};
    return diff>0?{kind:'up',symbol:'↑',diff,target:b}:{kind:'down',symbol:'↓',diff,target:b};
  }
  function posTotals(rows){
    let current=0,adjusted=0;
    for(const pos of rows||[]){
      const raw=pos.raw||{},qtyNow=numberValue(raw.qty)??numberValue(pos.orderedQty)??0,qtyAdj=numberValue(raw.or_qty)??numberValue(pos.orderedQty)??0;
      const currentPrice=numberValue(raw.last_price)??numberValue(raw.adjdprce)??numberValue(pos.expectedUnit)??0;
      const adjustedPrice=numberValue(raw.adjdprce)??numberValue(pos.expectedUnit)??currentPrice;
      current+=currentPrice*qtyNow;adjusted+=adjustedPrice*qtyAdj;
    }
    return {current,adjusted};
  }

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

  function pill(status){let cls='bad';if(status==='OK')cls='ok';else if(status==='BETTER PRICE')cls='better';else if(/REVIEW|LOW/.test(status))cls='review';return `<span class="status-pill ${cls}">${escapeHtml(status)}</span>`;}
  function kpi(label,value,cls=''){return `<div class="kpi ${cls}"><div class="n">${escapeHtml(value)}</div><div class="l">${escapeHtml(label)}</div></div>`;}
  function setViewButtons(){
    const map={exceptions:els.viewExceptionsBtn,all:els.viewAllBtn,pos:els.viewPosBtn};
    Object.entries(map).forEach(([k,b])=>{if(!b)return;b.classList.toggle('active',state.previewView===k);b.setAttribute('aria-pressed',state.previewView===k?'true':'false');});
  }
  function renderReconTable(r){
    els.tableWrap.classList.remove('preview-pos');els.table.classList.remove('pos-preview-table');if(els.tableFoot)els.tableFoot.innerHTML='';
    els.tableHead.innerHTML=`<tr>${RECON_HEADERS.map(h=>`<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
    const display=state.previewView==='all'?r.detail:r.detail.filter(x=>x.hasException||x.matchConfidence==='LOW');
    const extras=r.unmatchedInvoice.map(x=>({status:'NOT ORDERED / UNMATCHED',posDescription:x.description,orderedQty:null,suppliedQty:x.qtySupplied,expectedUnit:null,actualUnit:x.unitPriceExGst,unitVariance:null,missedTotal:0,matchConfidence:'',hasException:true}));
    const rows=[...display,...extras];
    els.tableBody.innerHTML=rows.length?rows.map(x=>`<tr><td>${pill(x.status)}</td><td>${escapeHtml(x.posDescription)}</td><td class="num">${qty(x.orderedQty)}</td><td class="num">${qty(x.suppliedQty)}</td><td class="num">${money(x.expectedUnit)}</td><td class="num">${money(x.actualUnit,4)}</td><td class="num">${money(x.unitVariance,4)}</td><td class="num">${money(x.missedTotal)}</td><td>${x.matchConfidence?escapeHtml(x.matchConfidence):'<span class="muted">—</span>'}</td></tr>`).join(''):'<tr><td colspan="9">No exceptions found.</td></tr>';
  }
  function renderPosTable(){
    els.tableWrap.classList.add('preview-pos');els.table.classList.add('pos-preview-table');
    els.tableHead.innerHTML=`<tr>${POS_VIEW_COLUMNS.map(c=>`<th>${escapeHtml(c.label)}</th>`).join('')}</tr>`;
    // POS preview is deliberately rebuilt from the uploaded POS source rows, never invoice order.
    // Sorting by sourceRow makes the preview deterministic even if an upstream array is later refactored.
    const rows=((state.posParsed&&state.posParsed.rows)||[]).slice().sort((a,b)=>{
      const ar=Number(a&&a.sourceRow),br=Number(b&&b.sourceRow);
      if(Number.isFinite(ar)&&Number.isFinite(br)&&ar!==br)return ar-br;
      return Number(a&&a.posIndex||0)-Number(b&&b.posIndex||0);
    });
    const detailBySourceRow=posDetailMap();
    els.tableBody.innerHTML=rows.length?rows.map((pos,index)=>{
      const detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||posDetailAt(index),notSupplied=!detail||Number(detail.suppliedQty||0)<=0,rowCls=notSupplied?'pos-not-supplied':'';
      const cells=POS_VIEW_COLUMNS.map(c=>{
        const v=rawValue(pos,c.key);let html='',extraCls='',title='';
        if(c.kind==='bool'){const checked=boolValue(v);html=`<span class="pos-checkbox ${c.flag||''} ${checked?'checked':''}" aria-label="${checked?'Checked':'Not checked'}">${checked?'✓':''}</span>`;}
        else if(c.kind==='number'){
          html=escapeHtml(fixed(v,c.dp??2));
          const target=comparisonTarget(detail,c.key),move=priceMove(v,target);
          if(move&&!notSupplied){extraCls=` price-move-cell price-${move.kind}`;const targetLabel=c.key==='adjrrprce'?'CH2 RRP':c.key==='adjwsprce'?'CH2 Normal W/S':'CH2 Unit Price';title=`${targetLabel}: ${Number(move.target).toFixed(2)} · ${move.symbol} ${Math.abs(move.diff).toFixed(2)}`;html=`<span class="pos-price-value">${html}</span><span class="price-arrow" aria-hidden="true">${move.symbol}</span>`;}
        } else html=escapeHtml(v);
        const cls=[c.cls||'',c.kind==='number'?'num':'',extraCls].filter(Boolean).join(' ');return `<td${cls?` class="${cls}"`:''}${title?` title="${escapeHtml(title)}"`:''}>${html}</td>`;
      }).join('');
      return `<tr${rowCls?` class="${rowCls}"`:''}${notSupplied?' title="Not supplied / not invoiced — retained in the original POS order position"':''}>${cells}</tr>`;
    }).join(''):'<tr><td colspan="16">No POS order rows available.</td></tr>';
    if(els.tableFoot){
      if(rows.length){const totals=posTotals(rows);els.tableFoot.innerHTML=`<tr class="pos-total-row"><td colspan="11" class="pos-total-left"><strong>Current Order</strong><span>${rows.length.toLocaleString()} product line${rows.length===1?'':'s'} · grey rows = not supplied</span></td><td colspan="2" class="pos-total-label">Current / Adjusted Total</td><td class="pos-total-current">${money(totals.current)}</td><td colspan="2" class="pos-total-adjusted">${money(totals.adjusted)}</td></tr>`;}
      else els.tableFoot.innerHTML='';
    }
  }
  function renderPreview(r){if(state.previewView==='pos')renderPosTable();else renderReconTable(r);setViewButtons();}

  function renderResults(){
    const r=state.result;if(!r)return;const t=r.totals,integ=state.runIntegrity||{ok:false,errors:['Integrity not run'],warnings:[]};els.results.classList.remove('hidden');els.resultSub.textContent=`${r.orderNumber?`Order ${r.orderNumber} · `:''}${t.matchedInvoiceLines}/${t.invoiceLines} supplier lines matched to the POS order.`;
    els.kpis.innerHTML=[kpi('POS lines',t.posLines),kpi('Exceptions',t.exceptionLines,t.exceptionLines?'bad':'good'),kpi('Unmatched invoices',t.unmatchedInvoiceLines,t.unmatchedInvoiceLines?'bad':'good'),kpi('Better price',t.betterPriceLines,'good'),kpi('Potential missed $',money(t.missedTotal),t.missedTotal>0?'bad':'good'),kpi('Integrity',integ.ok?'PASS':'BLOCKED',integ.ok?'good':'bad')].join('');
    const notes=[...(r.warnings||[])];
    if(t.lowConfidenceLines){const low=r.detail.filter(x=>x.matchConfidence==='LOW').slice(0,8).map(x=>`${x.posDescription} [${x.matchMethods||'fallback match'}]`);notes.push(`${t.lowConfidenceLines} matched line(s) have LOW confidence and should be reviewed${low.length?`: ${low.join('; ')}`:'.'}`);}
    if(t.auditDataMissing)notes.push(`${t.auditDataMissing} matched POS line(s) cannot receive a complete CH2 discount/wholesale audit because the supplier invoice did not print all required audit fields.`);
    if(integ.ok)notes.unshift('Integrity checks passed: POS source order is locked, every parsed invoice row is accounted for exactly once, and supplier invoice arithmetic is valid.');else notes.unshift(...integ.errors.map(x=>`INTEGRITY BLOCK: ${x}`));notes.push(...(integ.warnings||[]));notes.push('Excel output keeps every POS order line in the exact uploaded sequence. Genuine invoice-only lines are appended only after the complete POS order block.');
    els.warningBox.classList.remove('hidden','ok','bad');els.warningBox.classList.add(integ.ok?'ok':'bad');els.warningBox.innerHTML='<strong>Review notes:</strong><br>'+notes.map(escapeHtml).join('<br>');
    renderPreview(r);els.downloadBtn.disabled=!integ.ok;els.downloadBtn.title=integ.ok?'':'Excel export is blocked until all integrity checks pass.';els.results.scrollIntoView({behavior:'smooth',block:'start'});
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
      state.previewView='exceptions';renderResults();setTimeout(hideProgress,500);
    }catch(err){console.error(err);hideProgress();setStatus(err&&err.message?err.message:String(err),'warn');}
    finally{els.runBtn.disabled=!(state.pos&&state.invoices.length&&state.referenceReady);els.clearBtn.disabled=false;}
  }

  wireDrop(els.posDrop,els.posInput,addPos);wireDrop(els.invoiceDrop,els.invoiceInput,addInvoices);
  els.clearBtn.onclick=()=>{state.pos=null;state.invoices=[];state.result=null;state.docs=[];state.posParsed=null;state.previewView='exceptions';state.runIntegrity=null;els.posInput.value='';els.invoiceInput.value='';hideResults();hideProgress();renderFiles();};
  els.runBtn.onclick=run;
  els.downloadBtn.onclick=async()=>{if(!state.result||!state.docs.length||!state.refs||!state.runIntegrity||!state.runIntegrity.ok)return;const old=els.downloadBtn.textContent;els.downloadBtn.disabled=true;els.downloadBtn.textContent='Building + validating Excel…';try{await PHF.exportReference(state.docs,state.refs,state.posParsed,state.result);setStatus('Excel generated and passed workbook compatibility/integrity validation.','ok');}catch(err){console.error(err);setStatus(err&&err.message?err.message:String(err),'warn');}finally{els.downloadBtn.disabled=!state.runIntegrity.ok;els.downloadBtn.textContent=old;}};
  function setPreviewView(view){
    state.previewView=view;renderPreview(state.result);
    // Always open a view at its first POS row / first column. This avoids a previous
    // horizontal or vertical scroll position making the POS sequence look out of order.
    if(els.tableWrap)requestAnimationFrame(()=>{els.tableWrap.scrollTop=0;els.tableWrap.scrollLeft=0;});
  }
  if(els.viewExceptionsBtn)els.viewExceptionsBtn.onclick=()=>setPreviewView('exceptions');
  if(els.viewAllBtn)els.viewAllBtn.onclick=()=>setPreviewView('all');
  if(els.viewPosBtn)els.viewPosBtn.onclick=()=>setPreviewView('pos');
  if(els.buildLabel&&PHF.schema&&PHF.schema.BUILD)els.buildLabel.textContent=`v${PHF.schema.BUILD.version} · ${PHF.schema.BUILD.name}`;
  refreshReferenceStatus();
})(window);
