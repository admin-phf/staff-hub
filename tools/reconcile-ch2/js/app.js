(function(global){
  'use strict';
  const PHF=global.PHFReconcile||{};
  const state={pos:null,invoices:[],result:null,previewView:'pos',docs:[],refs:null,referenceReady:false,posParsed:null,runIntegrity:null,unpackChecked:new Set(),unpackManualChecked:new Set(),unpackKey:null,unpackCounts:new Map(),unpackCountsKey:null,receivingMigratedFrom266:false,orderOverrides:new Map(),importKeys:new Map(),importKeyReviews:new Map(),posSortKey:'__pos_order_index',posSortDir:'asc',posSortExplicit:false,dockOffset:0};
  const els={
    referenceReady:document.querySelector('#referenceReady'),referenceDot:document.querySelector('#referenceDot'),buildLabel:document.querySelector('#buildLabel'),
    posDrop:document.querySelector('#posDrop'),posInput:document.querySelector('#posInput'),posFiles:document.querySelector('#posFiles'),invoiceDrop:document.querySelector('#invoiceDrop'),invoiceInput:document.querySelector('#invoiceInput'),invoiceFiles:document.querySelector('#invoiceFiles'),runBtn:document.querySelector('#runBtn'),clearBtn:document.querySelector('#clearBtn'),status:document.querySelector('#status'),progress:document.querySelector('#progress'),progressBar:document.querySelector('#progressBar'),results:document.querySelector('#results'),resultSub:document.querySelector('#resultSub'),kpis:document.querySelector('#kpis'),warningBox:document.querySelector('#warningBox'),orderOverrideBox:document.querySelector('#orderOverrideBox'),tableWrap:document.querySelector('.table-wrap'),table:document.querySelector('#resultTable'),tableHead:document.querySelector('#resultTableHead'),tableBody:document.querySelector('#resultTable tbody'),tableFoot:document.querySelector('#resultTableFoot'),fullDownloadBtn:document.querySelector('#fullDownloadBtn'),fullCsvDownloadBtn:document.querySelector('#fullCsvDownloadBtn'),downloadBtn:document.querySelector('#downloadBtn'),viewExceptionsBtn:document.querySelector('#viewExceptionsBtn'),viewAllBtn:document.querySelector('#viewAllBtn'),viewPosBtn:document.querySelector('#viewPosBtn'),posTools:document.querySelector('#posTools'),posBalancePanel:document.querySelector('#posBalancePanel'),keyReviewBtn:document.querySelector('#keyReviewBtn'),importKeySummary:document.querySelector('#importKeySummary'),posCheckProgress:document.querySelector('#posCheckProgress'),clearChecksBtn:document.querySelector('#clearChecksBtn'),clearCountsBtn:document.querySelector('#clearCountsBtn'),removeNotSuppliedBtn:document.querySelector('#removeNotSuppliedBtn'),resultControls:document.querySelector('.result-controls-sticky'),receivingActions:document.querySelector('#receivingActions'),tickAllBtn:document.querySelector('#tickAllBtn'),clearQtyBtn:document.querySelector('#clearQtyBtn')
  };

  const RECON_COLUMNS=[
    {label:'Status',kind:'text'},
    {label:'POS product',kind:'text'},
    {label:'Ordered',kind:'number'},
    {label:'Supplied',kind:'number'},
    {label:'Expected unit',kind:'number'},
    {label:'Invoice unit',kind:'number'},
    {label:'Variance',kind:'number'},
    {label:'Missed $',kind:'number'},
    {label:'Match',kind:'center'}
  ];
  // POS preview sizing metadata is intentionally kept next to the column contract.
  // min/max are safe visual bounds in CSS pixels. `flex` marks columns that are
  // allowed to absorb spare viewport width or give it back first on a smaller window.
  const POS_VIEW_COLUMNS=[
    {key:'__unpack',label:'✓',kind:'check',cls:'unpack-cell',min:48,max:58,sortable:false},
    {key:'__pos_order_index',label:'POS Index',kind:'number',dp:0,align:'center',cls:'pos-code pos-order-index',min:58,max:76,grow:.01,stretch:.01,hardMax:96},
    {key:'__invoice_line',label:'CH2 Line',kind:'text',align:'center',cls:'pos-code pos-invoice-line',min:50,max:78,grow:.01,stretch:.01,hardMax:100},
    {key:'main_id',label:'Product #',kind:'text',cls:'pos-code',min:112,max:185,grow:.10,stretch:.11,hardMax:260},
    {key:'__pos_brand',label:'POS Brand',kind:'text',cls:'pos-brand',min:78,max:170,grow:.12,stretch:.15,hardMax:280},
    {key:'plu',label:'POS PLU',kind:'text',cls:'pos-code',min:58,max:96,grow:.05,stretch:.06,hardMax:140},
    {key:'sub_id',label:'POS Sub ID',kind:'text',cls:'pos-code',min:74,max:155,grow:.06,stretch:.08,hardMax:240},
    {key:'__ch2_item_code',label:'CH2 ITEM CODE',kind:'text',cls:'pos-code pos-ch2-item-code',min:78,max:132,grow:.05,stretch:.06,hardMax:180},
    {key:'descr',label:'Product Description',kind:'text',cls:'pos-desc',min:220,max:520,grow:.30,stretch:.38,hardMax:940},
    {key:'gst_tax_pc',label:'GST %',kind:'number',dp:0,min:44,max:60,grow:.01},
    {key:'units',label:'Units',kind:'number',dp:0,min:40,max:54,grow:.01},
    {key:'qty',label:'Qty',kind:'number',dp:0,min:40,max:54,grow:.01},
    {key:'__unpack_add',label:'Add Qty',kind:'qtyinput',cls:'unpack-qty-entry-cell',min:72,max:92,grow:.01,sortable:false},
    {key:'__unpack_total',label:'Found',kind:'qtytotal',cls:'unpack-qty-total-cell',min:56,max:74,grow:.01},
    {key:'mupc',label:'MU%',kind:'number',dp:2,min:46,max:64,grow:.015},
    {key:'gppc',label:'GP%',kind:'number',dp:2,min:46,max:62,grow:.015},
    {key:'__invoice_discount',label:'Discount %',kind:'number',dp:2,min:64,max:82,grow:.015},
    {key:'adjrrprce',label:'AdjRRPrc',kind:'number',dp:2,min:62,max:92,grow:.04,stretch:.035,hardMax:118},
    {key:'adjwsprce',label:'AdjWSPrc',kind:'number',dp:2,min:62,max:92,grow:.04,stretch:.035,hardMax:118},
    {key:'adjcatprce',label:'AdjCatPrc',kind:'number',dp:2,min:62,max:92,grow:.035,stretch:.025,hardMax:112},
    {key:'adjdprce',label:'AdjDPrc',kind:'number',dp:2,min:62,max:92,grow:.04,stretch:.035,hardMax:118},
    {key:'or_qty',label:'Adj Qty',kind:'number',dp:0,min:50,max:70,grow:.01},
    {key:'__row_total_inc_gst',label:'Total inc GST',kind:'number',dp:2,min:78,max:110,grow:.025,stretch:.02,hardMax:135}
  ];

  const posMeasureCanvas=document.createElement('canvas');
  const posMeasureCtx=posMeasureCanvas.getContext('2d');
  let posResizeObserver=null,posResizeTimer=0,posReceivingRenderTimer=0;
  let stickyFrame=0,stickyObserver=null,stickyListening=false;

  // v2.6.28 — non-overlapping sticky layers.
  // The download/view bar is sticky to the page, while the result table header/footer are
  // sticky inside their own scroll box. Without coordination the page-level bar slides over
  // the table header. These CSS variables move the table header to sit directly under the
  // bar (and lift the footer/Completed dock to the visible viewport bottom) for any page
  // scroll position, so both the bar and the column headings remain visible together.
  const STICKY_VARS=['--result-sticky-top','--result-sticky-bottom','--result-head-h','--result-foot-h','--result-dock-h','--result-dockbar-h'];
  // v2.6.31 — the docked Completed panel shows the bar, its headings and at least this many
  // completed products above the footer while staff work through Remaining.
  const DOCK_COMPLETED_ROWS=4;
  function updateStickyOffsets(){
    stickyFrame=0;
    const wrap=els.tableWrap;if(!wrap)return;
    if(!state.result||!els.results||els.results.classList.contains('hidden')){for(const v of STICKY_VARS)wrap.style.removeProperty(v);return;}
    const rect=wrap.getBoundingClientRect(),portTop=rect.top+(wrap.clientTop||0),portBottom=portTop+wrap.clientHeight;
    const viewH=global.innerHeight||document.documentElement.clientHeight||0;
    const controls=els.resultControls,cr=controls&&controls.getClientRects().length?controls.getBoundingClientRect():null;
    const headH=els.tableHead?Math.ceil(els.tableHead.getBoundingClientRect().height):0;
    const footH=els.tableFoot?Math.ceil(els.tableFoot.getBoundingClientRect().height):0;
    const dock=els.tableBody?els.tableBody.querySelector('tr.pos-section-complete'):null,dockBarH=dock?Math.ceil(dock.getBoundingClientRect().height):0;
    const room=Math.max(0,wrap.clientHeight-headH-footH);
    let top=cr&&cr.height?Math.max(0,Math.ceil(cr.bottom-portTop)):0;top=Math.min(top,room);
    let bottom=Math.max(0,Math.ceil(portBottom-viewH));bottom=Math.min(bottom,Math.max(0,room-top));
    // Stack the docked Completed panel from the footer upwards: each member's bottom offset is
    // the height of the members below it. It never takes more than ~55% of the table area that
    // is actually visible (it shrinks while the page is scrolled so the table is partly off-screen).
    if((state.dockOffset||0)>0&&!completedPanelDocked()){state.dockOffset=0;applyDockWindow();}
    const members=els.tableBody?[...els.tableBody.querySelectorAll('tr.pos-dock-member')]:[],heights=members.map(tr=>Math.ceil(tr.getBoundingClientRect().height));
    const visibleRoom=Math.max(0,room-top-bottom),maxDock=Math.max(dockBarH,visibleRoom*.55);let used=0,keep=0;
    for(let i=0;i<members.length;i++){if(i===0||used+heights[i]<=maxDock){used+=heights[i];keep=i+1;}else break;}
    // The Completed headings are only docked together with at least one completed product.
    if(keep===2&&members[1]&&members[1].classList.contains('pos-section-head'))keep=1;
    let below=0;
    for(let i=members.length-1;i>=0;i--){
      const tr=members[i];
      if(i>=keep){if(!tr.hasAttribute('data-dock-off'))tr.setAttribute('data-dock-off','1');continue;}
      if(tr.hasAttribute('data-dock-off'))tr.removeAttribute('data-dock-off');
      const v=`${below}px`;if(tr.style.getPropertyValue('--dock-bottom')!==v)tr.style.setProperty('--dock-bottom',v);
      below+=heights[i];
    }
    const dockH=below;updateDockWindowLabel();
    const set=(k,v)=>{const val=`${Math.max(0,Math.round(v))}px`;if(wrap.style.getPropertyValue(k)!==val)wrap.style.setProperty(k,val);};
    set('--result-sticky-top',top);set('--result-sticky-bottom',bottom);set('--result-head-h',headH);set('--result-foot-h',footH);set('--result-dock-h',dockH);set('--result-dockbar-h',dockBarH);
  }
  function scheduleStickyOffsets(){if(stickyFrame)return;stickyFrame=requestAnimationFrame(updateStickyOffsets);}
  function ensureStickyTracking(){
    if(els.tableBody&&!els.tableBody.dataset.dockWheel){els.tableBody.dataset.dockWheel='1';els.tableBody.addEventListener('wheel',onDockWheel,{passive:false});}
    if(!stickyListening){
      stickyListening=true;
      global.addEventListener('scroll',scheduleStickyOffsets,{passive:true,capture:true});
      global.addEventListener('resize',scheduleStickyOffsets,{passive:true});
    }
    if(!stickyObserver&&'ResizeObserver' in global){
      stickyObserver=new ResizeObserver(scheduleStickyOffsets);
      for(const el of [els.resultControls,els.tableWrap,els.tableHead,els.tableFoot,els.results,els.table,els.tableBody])if(el)stickyObserver.observe(el);
    }
    scheduleStickyOffsets();
  }
  // v2.6.32 — the docked Completed panel is a small window onto the completed list. While it is
  // docked above the footer, the mouse wheel over it moves that window, so staff can browse all
  // completed items without scrolling to the bottom of the data.
  function completedRows(){return els.tableBody?[...els.tableBody.querySelectorAll('tr[data-complete-index]')]:[];}
  function completedPanelDocked(){
    const bar=els.tableBody&&els.tableBody.querySelector('tr.pos-section-complete'),cell=bar&&bar.firstElementChild;if(!cell)return false;
    return cell.getBoundingClientRect().top<bar.getBoundingClientRect().top-.5;
  }
  function applyDockWindow(){
    const rows=completedRows(),off=state.dockOffset||0;
    for(const tr of rows){
      const i=Number(tr.dataset.completeIndex),on=i>=off&&i<off+DOCK_COMPLETED_ROWS;
      tr.classList.toggle('pos-dock-member',on);tr.classList.toggle('pos-dock-row',on);
      if(!on){tr.removeAttribute('data-dock-off');tr.style.removeProperty('--dock-bottom');}
    }
  }
  function updateDockWindowLabel(){
    const label=els.tableBody&&els.tableBody.querySelector('tr.pos-section-complete .dock-window');if(!label)return;
    const rows=completedRows(),shown=rows.filter(tr=>tr.classList.contains('pos-dock-row')&&!tr.hasAttribute('data-dock-off')).length;
    const text=rows.length>shown&&shown?`showing ${(state.dockOffset||0)+1}–${(state.dockOffset||0)+shown} of ${rows.length} · scroll here`:'';
    if(label.textContent!==text)label.textContent=text;
  }
  let dockWheelAccum=0;
  function onDockWheel(e){
    const tr=e.target&&e.target.closest?e.target.closest('tr.pos-dock-member'):null;if(!tr||tr.hasAttribute('data-dock-off')||!completedPanelDocked())return;
    const rows=completedRows(),shown=Math.max(1,rows.filter(r=>r.classList.contains('pos-dock-row')&&!r.hasAttribute('data-dock-off')).length),max=Math.max(0,rows.length-shown);
    const dir=Math.sign(e.deltaY||0),off=state.dockOffset||0;
    if(!max||!dir||(dir<0&&off<=0)||(dir>0&&off>=max))return; // let the table scroll normally at either end
    e.preventDefault();
    dockWheelAccum+=e.deltaMode===1?e.deltaY*16:e.deltaY;
    const steps=Math.trunc(dockWheelAccum/40);if(!steps)return;dockWheelAccum-=steps*40;
    state.dockOffset=Math.max(0,Math.min(max,off+steps));applyDockWindow();updateStickyOffsets();
  }
  function completedSectionOffset(){
    const wrap=els.tableWrap,row=els.tableBody&&els.tableBody.querySelector('tr.pos-section-complete');if(!wrap||!row)return null;
    const cs=getComputedStyle(wrap),top=parseFloat(cs.getPropertyValue('--result-sticky-top'))||0,head=parseFloat(cs.getPropertyValue('--result-head-h'))||0;
    return Math.max(0,row.offsetTop-top-head);
  }
  function jumpCompletedSection(){
    // Jump straight to the Completed / accounted rows, or back to the top of Remaining when
    // the Completed section is already in view, so staff never need to scroll to the end.
    const wrap=els.tableWrap,offset=completedSectionOffset();if(!wrap||offset==null)return;
    const target=Math.min(offset,Math.max(0,wrap.scrollHeight-wrap.clientHeight)),inCompleted=target>0&&wrap.scrollTop>=target-2;
    wrap.scrollTo({top:inCompleted?0:target,behavior:'smooth'});
  }

  function validExt(file,allowed){const ext='.'+(file.name.split('.').pop()||'').toLowerCase();return allowed.includes(ext);}
  function prettySize(bytes){if(bytes<1024)return `${bytes} B`;if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} KB`;return `${(bytes/1024/1024).toFixed(1)} MB`;}
  function money(v,dp=2){return v==null||!Number.isFinite(Number(v))?'—':`$${Number(v).toLocaleString(undefined,{minimumFractionDigits:dp,maximumFractionDigits:dp})}`;}
  function qty(v){return v==null?'—':Number(v).toLocaleString(undefined,{maximumFractionDigits:3});}
  function fileRow(file,onRemove){const div=document.createElement('div');div.className='file-row';const label=document.createElement('span');label.textContent=`✓ ${file.name} · ${prettySize(file.size)}`;const btn=document.createElement('button');btn.type='button';btn.textContent='Remove';btn.onclick=onRemove;div.append(label,btn);return div;}
  function setStatus(text,type='info'){els.status.className=`status ${type}`;els.status.textContent=text;}
  function cleanText(v){return v==null?'':String(v).replace(/\u00a0/g,' ').trim();}
  function normOrderRef(v){return cleanText(v).toUpperCase().replace(/[−–—]/g,'-').replace(/\s+/g,'');}
  function sameOrderRef(a,b){return !!normOrderRef(a)&&normOrderRef(a)===normOrderRef(b);}
  function invoiceDocMeta(doc){const first=(doc&&doc.rows||[])[0]||{},m=(doc&&doc.meta)||{};return {number:cleanText(first.invoiceNumber||m.invoiceNumber),customerPo:cleanText(first.customerPo||m.customerPo),sourceFile:cleanText(doc&&doc.sourceFile)};}
  function orderLinkMismatches(){
    const order=cleanText(state.posParsed&&state.posParsed.orderNumber);if(!order)return [];
    const byNo=new Map();
    for(const doc of state.docs||[]){if(!doc||doc.type==='CREDIT_NOTE')continue;const m=invoiceDocMeta(doc);if(!m.number||!m.customerPo||sameOrderRef(m.customerPo,order))continue;if(!byNo.has(m.number))byNo.set(m.number,{invoiceNumber:m.number,customerPo:m.customerPo,sourceFiles:[]});const rec=byNo.get(m.number);if(m.sourceFile&&!rec.sourceFiles.includes(m.sourceFile))rec.sourceFiles.push(m.sourceFile);}
    return [...byNo.values()].map(x=>({...x,posOrder:order,overrideActive:sameOrderRef(state.orderOverrides.get(x.invoiceNumber),order)}));
  }
  function posExportOptions(){
    const receivingBySourceRow={},selectedBySourceRow={},detailBySourceRow=posDetailMap();
    const rows=sortedPosRows();
    for(let i=0;i<rows.length;i++){
      const pos=rows[i],key=unpackIdentity(pos),sourceKey=String(pos&&pos.sourceRow!=null?pos.sourceRow:'');
      if(!sourceKey)continue;
      const selected=state.unpackChecked.has(key);selectedBySourceRow[sourceKey]=selected;
      const detail=detailBySourceRow.get(sourceKey)||posDetailAt(i),expected=unpackExpectedQty(pos,detail);

      // POS Layout is the receiving authority, but completion and export quantity are
      // deliberately separate concepts. A positive partial/over count must stay in
      // Remaining while still being honoured in the downloaded POSActive file.
      // Untouched + unticked means not supplied by default. A manual tick with no
      // entered Found quantity means all expected CH2 units are accounted for.
      if(state.unpackCounts.has(key))receivingBySourceRow[sourceKey]=unpackCountFor(pos);
      else if(selected)receivingBySourceRow[sourceKey]=expected;
      else receivingBySourceRow[sourceKey]=0;
    }
    return {importKeysBySourceRow:Object.fromEntries(state.importKeys),orderOverrides:Object.fromEntries(state.orderOverrides),autoLinkPosOrder:true,receivingBySourceRow,selectedBySourceRow,uncheckedMeansNotSupplied:true};
  }
  function renderOrderOverrideUi(){
    const box=els.orderOverrideBox;if(!box)return;const mismatches=orderLinkMismatches();
    if(!mismatches.length){box.classList.add('hidden');box.innerHTML='';return;}
    box.classList.remove('hidden');
    const invoiceNos=[...new Set((state.docs||[]).filter(d=>d&&d.type!=='CREDIT_NOTE').map(d=>invoiceDocMeta(d).number).filter(Boolean))],primary=invoiceNos[0]||'CURRENT',order=cleanText(state.posParsed&&state.posParsed.orderNumber)||'CURRENT';
    // v2.6.28 — show exactly the auto-generated download name (plural + every invoice number when merged).
    const mergedName=PHF.posImport&&typeof PHF.posImport.importFilename==='function'?PHF.posImport.importFilename(invoiceNos,order):`oborne_invoice_{${primary}}_(${order}).txt`;
    box.innerHTML=`<div class="order-override-title"><strong>Invoice → POS order link</strong><span>${mismatches.length}/${mismatches.length} auto-linked</span></div><p class="order-override-help">CH2 used a Customer PO that differs from the uploaded POS order. All uploaded supplier invoices are reconciled against this one POS order and exported as one combined POSActive TXT. The original CH2 invoice numbers and Customer POs remain unchanged in the audit and in each import row. Combined import: <span class="override-ref">${escapeHtml(mergedName)}</span>.</p><div class="order-override-list">${mismatches.map(x=>`<div class="order-override-row"><div class="order-override-meta"><b>Invoice ${escapeHtml(x.invoiceNumber)}</b><br>CH2 Customer PO: <span class="override-ref">${escapeHtml(x.customerPo)}</span><br>POSActive order: <span class="override-ref">${escapeHtml(x.posOrder)}</span></div><div class="order-override-actions"><span class="order-override-badge">AUTO POS ORDER LINK ACTIVE</span></div></div>`).join('')}</div>`;
  }
  function setProgress(pct){els.progress.classList.remove('hidden');els.progressBar.style.width=`${Math.max(0,Math.min(100,pct))}%`;}
  function hideProgress(){els.progress.classList.add('hidden');els.progressBar.style.width='0%';}
  function hideResults(){els.results.classList.add('hidden');}
  function escapeHtml(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function rawValue(pos,key){if(pos&&pos.raw&&Object.prototype.hasOwnProperty.call(pos.raw,key))return pos.raw[key];return '';}
  function refDigits(v){return String(v??'').replace(/\.0+$/,'').replace(/\D+/g,'');}
  function refNumericCode(v){let s=cleanText(v);if(/^\d+\.0+$/.test(s))s=s.split('.')[0];return /^\d+$/.test(s)?s:'';}
  function posReferenceRecord(pos){
    const master=state.refs&&state.refs.master;if(!master||!pos)return {};
    const bc=refDigits(pos.barcode);if(bc&&master.byBarcode&&master.byBarcode.has(bc))return master.byBarcode.get(bc)||{};
    const sub=refNumericCode(pos.subId);if(sub&&master.byCode&&master.byCode.has(sub))return master.byCode.get(sub)||{};
    const plu=refDigits(pos.plu);if(plu&&master.byPlu&&master.byPlu.has(plu))return master.byPlu.get(plu)||{};
    // v2.6.29 — exact barcode/PLU records without a CH2 code (e.g. UHP-matched products).
    const all=typeof PHF._posMasterRecords==='function'?PHF._posMasterRecords(pos,state.refs):[];
    return all.find(r=>cleanText(r&&r.POS_BRAND))||all[0]||{};
  }
  function normalWholesaleForPos(pos,detail){
    const invoiceWs=numberValue(detail&&detail.invoiceNormalWholesale);if(invoiceWs!=null)return invoiceWs;
    const rec=posReferenceRecord(pos),masterWs=numberValue(rec&&rec.POS_CH2_WHOLESALE_EX_GST);if(masterWs!=null)return masterWs;
    const posWs=numberValue(pos&&pos.normalWholesale);if(posWs!=null)return posWs;
    return numberValue(rawValue(pos,'adjwsprce'));
  }
  function discountedPosPrice(pos,detail){
    const nws=normalWholesaleForPos(pos,detail);if(nws==null)return '';
    if(PHF.linkedPos&&typeof PHF.linkedPos.expectedPriceForPos==='function'){
      const calc=PHF.linkedPos.expectedPriceForPos(pos,state.refs,nws);if(calc&&calc.price!=null)return calc.price;
    }
    return nws;
  }
  function expectedDiscountForPos(pos,detail){
    const nws=normalWholesaleForPos(pos,detail);if(nws==null||!PHF.linkedPos||typeof PHF.linkedPos.expectedPriceForPos!=='function')return null;
    const calc=PHF.linkedPos.expectedPriceForPos(pos,state.refs,nws);
    // No matched discount rule is unknown, not an assumed zero-percent agreement.
    return calc&&calc.match&&calc.discountPct!=null?Number(calc.discountPct):null;
  }
  function posRowTotalIncGst(pos,detail=null){
    if(!pos)return '';
    const key=unpackIdentity(pos),touched=state.unpackCounts.has(key);
    // Before staff count a row, show the reconciled CH2 supplied quantity. Once Found
    // has been entered, the row total follows that physical receiving quantity live.
    const rowQty=touched?unpackCountFor(pos):(numberValue(detail&&detail.suppliedQty)??numberValue(rawValue(pos,'qty'))??numberValue(pos.orderedQty)??0);
    const unit=numberValue(discountedPosPrice(pos,detail));
    const gstPct=Math.max(0,numberValue(rawValue(pos,'gst_tax_pc'))??numberValue(pos.gstPct)??0);
    if(unit==null||rowQty==null)return '';
    return Math.round((unit*Number(rowQty)*(1+gstPct/100)+Number.EPSILON)*100)/100;
  }
  function invoiceLineDisplay(detail){
    const rows=detail&&Array.isArray(detail.invoiceRows)?detail.invoiceRows:[];
    const seen=new Set(),lines=[];
    for(const row of rows){
      const raw=numberValue(row&&row.invoiceLine);
      if(raw==null)continue;
      const line=Math.abs(raw-Math.round(raw))<1e-9?String(Math.round(raw)):String(raw);
      if(!seen.has(line)){seen.add(line);lines.push(line);}
    }
    return lines.join(', ');
  }
  function ch2ItemCodeDisplay(detail){
    const rows=detail&&Array.isArray(detail.invoiceRows)?detail.invoiceRows:[];
    const seen=new Set(),codes=[];
    for(const row of rows){
      let value=cleanText(row&&row.productCode).replace(/\.0+$/,'');
      if(!value)continue;
      if(!seen.has(value)){seen.add(value);codes.push(value);}
    }
    return codes.join(', ');
  }
  function importIdentityFor(pos,detail){
    return state.importKeyReviews.get(String(pos.sourceRow))||PHF.posImport.resolveImportIdentity(pos,state.refs,detail&&detail.invoiceRows||[],{importKeysBySourceRow:state.importKeys});
  }
  function refreshImportKeyReview(){
    const rows=state.result&&state.posParsed?PHF.posImport.reviewImportKeys(state.refs,state.posParsed,state.result,{importKeysBySourceRow:state.importKeys}):[];
    state.importKeyReviews=new Map(rows.map(x=>[String(x.pos.sourceRow),x.identity]));
    if(!els.importKeySummary)return;
    els.importKeySummary.classList.toggle('hidden',!rows.length);
    const blank=rows.filter(x=>!x.identity.orderSubId),review=rows.filter(x=>x.identity.status==='REVIEW');
    els.importKeySummary.innerHTML=`<strong>POSActive import keys: ${review.length} to review</strong><br>${blank.length?`${blank.length} invoiced products have a blank Sub ID in the uploaded POS order. `:''}Product matches and POSActive keys are checked separately. Download the POS key review CSV for the exact export key, source and aligned-master candidates. Review warnings do not block download.`;
    if(els.keyReviewBtn)els.keyReviewBtn.disabled=!rows.length;
  }
  function commitImportKey(input){
    if(!input)return;
    const key=input.dataset.importKeyRow,value=String(input.value||'').trim(),old=state.importKeys.get(key)||'';
    if(value===input.dataset.currentKey)return;
    if(value)state.importKeys.set(key,value);else state.importKeys.delete(key);
    if((state.importKeys.get(key)||'')===old){input.value=input.dataset.currentKey||'';return;}
    refreshImportKeyReview();renderPosTable();
    setStatus('Import key updated for this run. Confirm the same supplier key exists in POSActive. Download remains available.','warn');
  }
  function posSubIdReviewNotes(){
    // v2.6.31 — Sub IDs are existing POSActive data and are exported exactly as stored,
    // including spaces and % $ " (e.g. `3 PER SKU 25%`). They are no longer a review note;
    // POSActive order matching is checked by the POSActive match check instead.
    if(SUB_ID_REVIEW_DISABLED)return [];
    if(!state.result||!state.posParsed)return [];
    const notes=[],rows=sortedPosRows(),details=posDetailMap();
    for(let i=0;i<rows.length;i++){
      const pos=rows[i],detail=details.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||posDetailAt(i);
      if(!detail||Number(detail.suppliedQty||0)<=0)continue;
      const sub=cleanText(pos&&pos.subId);if(!sub)continue;
      const special=[...new Set((sub.match(/["$%]/g)||[]))];
      const promoLike=/[A-Za-z]/.test(sub)&&/\s/.test(sub)&&/\b(?:ORDER|PER|SKU|PROMO|SPECIAL|FREE|OFF|DEAL|BUY|SAVE)\b/i.test(sub);
      if(!special.length&&!promoLike)continue;
      const line=invoiceLineDisplay(detail)||'?',ch2=ch2ItemCodeDisplay(detail)||'not resolved',product=cleanText(pos&&pos.description)||cleanText(pos&&pos.barcode)||'product';
      const why=special.length?`contains special character${special.length===1?'':'s'} ${special.map(x=>`“${x}”`).join(', ')}`:'resembles ordering/promotion text';
      notes.push(`POS SUB ID REVIEW — CH2 line ${line} · POS row ${i+1} (${product}): POS Sub ID “${sub}” ${why}. POSActive permits these characters and export remains enabled. CH2 ITEM CODE: ${ch2}. If POSActive reports a supplier-order mismatch, confirm that this POS Sub ID is the intended supplier key.`);
    }
    return notes;
  }
  const SUB_ID_REVIEW_DISABLED=true;
  function posColumnValue(pos,c,detail=null){
    if(!pos||!c)return '';
    if(c.key==='__import_sub_id')return importIdentityFor(pos,detail).importSubId;
    if(c.key==='__pos_order_index')return pos.invoiceOnly?'INV':(Number(pos.posIndex||0)||'');
    if(c.key==='__invoice_line')return invoiceLineDisplay(detail);
    if(c.key==='__ch2_item_code')return ch2ItemCodeDisplay(detail);
    if(c.key==='__row_total_inc_gst')return posRowTotalIncGst(pos,detail);
    if(c.key==='__pos_brand')return String((posReferenceRecord(pos).POS_BRAND)||'');
    if(c.key==='__expected_discount')return expectedDiscountForPos(pos,detail);
    if(c.key==='__invoice_discount')return weightedInvoiceValue(detail,'discountPct');
    if(c.key==='main_id')return pos.barcode??'';
    if(c.key==='plu')return pos.plu??'';
    if(c.key==='sub_id'){
      // v2.6.29 — when the POS order carries no Sub ID, show the key the POSActive TXT will
      // use for this invoiced row (aligned-master Sub ID or CH2 supplier code) instead of blank.
      const own=cleanText(pos.subId);if(own)return pos.subId;
      if(detail&&Array.isArray(detail.invoiceRows)&&detail.invoiceRows.length){const id=importIdentityFor(pos,detail);return (id&&id.importSubId)||'';}
      return '';
    }
    if(c.key==='descr')return pos.description??'';
    // POS receiving view rule: AdjCatPrc and AdjDPrc are the same expected cost,
    // calculated as Normal W/S per unit ex GST less the matched supplier discount rule.
    if(c.key==='adjcatprce'||c.key==='adjdprce')return discountedPosPrice(pos,detail);
    return rawValue(pos,c.key);
  }
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
    for(const e of invoiceOnlyEntries())if(!map.has(e.detail.sourceRow))map.set(e.detail.sourceRow,e.detail);
    return map;
  }
  function weightedInvoiceValue(detail,key){
    if(!detail||!Array.isArray(detail.invoiceRows)||!detail.invoiceRows.length)return null;let total=0,weight=0;
    for(const row of detail.invoiceRows){const v=numberValue(row&&row[key]),w=numberValue(row&&row.qtySupplied);if(v!=null&&w!=null&&w>0){total+=v*w;weight+=w;}}
    return weight>0?total/weight:null;
  }
  function comparisonTarget(pos,detail,key){
    if(!detail)return null;
    if(key==='__invoice_discount')return expectedDiscountForPos(pos,detail);
    if(key==='adjrrprce')return weightedInvoiceValue(detail,'rrp');
    if(key==='adjwsprce')return numberValue(detail.invoiceNormalWholesale);
    if(key==='adjcatprce'||key==='adjdprce')return numberValue(detail.actualUnit);
    return null;
  }
  function priceMove(current,target){
    const a=numberValue(current),b=numberValue(target),tol=(PHF.schema&&PHF.schema.VISUAL&&PHF.schema.VISUAL.priceVisualTolerance)||0.03;
    if(a==null||b==null)return null;const diff=b-a;
    if(Math.abs(diff)<=tol)return {kind:'same',symbol:'—',diff,target:b};
    return diff>0?{kind:'up',symbol:'↑',diff,target:b}:{kind:'down',symbol:'↓',diff,target:b};
  }
  function discountMove(actual,expected){
    const a=numberValue(actual),b=numberValue(expected),tol=(PHF.schema&&PHF.schema.VISUAL&&PHF.schema.VISUAL.priceVisualTolerance)||0.03;
    if(a==null||b==null)return null;const diff=a-b;
    if(Math.abs(diff)<=tol)return {kind:'same',symbol:'—',diff,target:b};
    // Higher discount is better (blue); lower discount is worse (red).
    return diff>0?{kind:'down',symbol:'↑',diff,target:b}:{kind:'up',symbol:'↓',diff,target:b};
  }
  function posTotals(rows,detailBySourceRow=posDetailMap()){
    // Current = the POS order's existing unit cost × ordered quantity, including the
    // GST rate already stored on each POS row.  This mirrors the POSActive Current
    // Order total instead of displaying an ex-GST subtotal.
    let current=0;
    for(const pos of rows||[]){
      const raw=pos.raw||{},qtyNow=numberValue(raw.qty)??numberValue(pos.orderedQty)??0;
      const currentPrice=numberValue(raw.last_price)??numberValue(pos.expectedUnit)??0;
      const gstPct=Math.max(0,numberValue(raw.gst_tax_pc)??numberValue(pos.gstPct)??0);
      current+=currentPrice*qtyNow*(1+gstPct/100);
    }

    // Adjusted = the total that the POSActive TXT would carry right now.  Re-use the
    // proven 15-column exporter so short/over/zero Found quantities are reflected in
    // the footer exactly the same way they will be in the downloaded file.  Column 14
    // is Total inc GST, so this value is explicitly GST-inclusive.
    let adjusted=null,adjustedEx=null,adjustedGst=null,supplierInvoiceTotal=null,records=[],matchCheck=null;
    try{
      if(PHF.posImport&&typeof PHF.posImport.buildLegacyFiles==='function'&&state.docs&&state.docs.length&&state.posParsed&&state.result){
        const built=PHF.posImport.buildLegacyFiles(state.docs,state.refs,state.posParsed,state.result,posExportOptions());
        if(built&&Array.isArray(built.files)&&built.files.length){
          adjusted=built.files.reduce((sum,file)=>sum+(numberValue(file&&file.totals&&file.totals.total)||0),0);
          adjustedEx=built.files.reduce((sum,file)=>sum+(numberValue(file&&file.totals&&file.totals.ext)||0),0);
          adjustedGst=built.files.reduce((sum,file)=>sum+(numberValue(file&&file.totals&&file.totals.gst)||0),0);
          supplierInvoiceTotal=built.files.reduce((sum,file)=>sum+(numberValue(file&&file.sourceTotals&&file.sourceTotals.total)||0),0);
          records=built.files.flatMap(file=>Array.isArray(file&&file.records)?file.records:[]);
          matchCheck=built.files[0]&&built.files[0].matchCheck||null;
        }
      }
    }catch(err){console.warn('Could not calculate live POSActive import total',err);}

    // Fallback for the brief interval before an export payload can be constructed.
    // Untouched matched rows use their original CH2 gross line totals; a touched Found
    // quantity uses the matched invoice unit price and GST rate.
    if(adjusted==null){
      adjusted=0;
      for(const pos of rows||[]){
        const detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||null;
        if(!detail||!Array.isArray(detail.invoiceRows)||!detail.invoiceRows.length)continue;
        const key=unpackIdentity(pos),touched=state.unpackCounts.has(key),found=touched?unpackCountFor(pos):null;
        if(!touched){
          adjusted+=detail.invoiceRows.reduce((sum,row)=>sum+(numberValue(row&&row.totalIncGst)||0),0);
          continue;
        }
        if(found<=0)continue;
        const sourceQty=detail.invoiceRows.reduce((sum,row)=>sum+(numberValue(row&&row.qtySupplied)||0),0);
        if(sourceQty<=0)continue;
        const grossPerUnit=detail.invoiceRows.reduce((sum,row)=>sum+(numberValue(row&&row.totalIncGst)||0),0)/sourceQty;
        adjusted+=grossPerUnit*found;
      }
    }
    const matchedCurrent=records.reduce((sum,record)=>{
      const pos=record&&record.pos||{},raw=pos.raw||{},qtySupplied=numberValue(record&&record.qtySupplied)??0;
      const currentPrice=numberValue(raw.last_price)??numberValue(pos.expectedUnit)??0;
      const gstPct=Math.max(0,numberValue(raw.gst_tax_pc)??numberValue(pos.gstPct)??0);
      return sum+currentPrice*qtySupplied*(1+gstPct/100);
    },0);
    // Invoice-only lines are omitted only while they are not ticked/counted in POS Layout.
    const receivedInvoiceOnly=records.filter(record=>record&&record.invoiceOnly),receivedInvoiceOnlyKeys=new Set(receivedInvoiceOnly.map(record=>String(record.pos&&record.pos.sourceRow)));
    const invoiceOnlyRows=invoiceOnlyEntries().filter(e=>!receivedInvoiceOnlyKeys.has(String(e.pos.sourceRow))).map(e=>e.inv);
    const invoiceOnlyTotal=invoiceOnlyRows.reduce((sum,row)=>sum+(numberValue(row&&row.totalIncGst)||0),0);
    const invoiceOnlyReceivedTotal=receivedInvoiceOnly.reduce((sum,record)=>sum+(numberValue(record.total)||0),0);
    // v2.6.28 — not-invoiced rows that staff received (Found > 0) are exported as manual
    // receiving lines, so they are reported separately from genuinely not-supplied rows.
    const manualRecords=records.filter(record=>record&&record.manualReceiving),manualRows=new Set(manualRecords.map(record=>String(record.pos&&record.pos.sourceRow!=null?record.pos.sourceRow:'')));
    const manualTotal=manualRecords.reduce((sum,record)=>sum+(numberValue(record.total)||0),0);
    let notInvoicedTotal=0,notInvoicedCount=0;
    for(const pos of rows||[]){
      const detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''));
      if(detail&&Array.isArray(detail.invoiceRows)&&detail.invoiceRows.length)continue;
      if(manualRows.has(String(pos&&pos.sourceRow!=null?pos.sourceRow:'')))continue;
      notInvoicedCount++;
      const raw=pos.raw||{},qtyNow=numberValue(raw.qty)??numberValue(pos.orderedQty)??0;
      const currentPrice=numberValue(raw.last_price)??numberValue(pos.expectedUnit)??0;
      const gstPct=Math.max(0,numberValue(raw.gst_tax_pc)??numberValue(pos.gstPct)??0);
      notInvoicedTotal+=currentPrice*qtyNow*(1+gstPct/100);
    }
    return {current,matchedCurrent,adjusted,adjustedEx,adjustedGst,supplierInvoiceTotal,invoiceOnlyCount:invoiceOnlyRows.length,invoiceOnlyTotal,invoiceOnlyReceivedCount:receivedInvoiceOnly.length,invoiceOnlyReceivedTotal,matchCheck,
      invoiceOnlyAll:invoiceOnlyEntries().map(e=>({line:e.inv&&e.inv.invoiceLine,invoiceNumber:e.inv&&e.inv.invoiceNumber,description:cleanText(e.pos&&e.pos.description)||cleanText(e.inv&&e.inv.description),total:numberValue(e.inv&&e.inv.totalIncGst)||0,ticked:receivedInvoiceOnlyKeys.has(String(e.pos&&e.pos.sourceRow)),supplierNote:e.pos&&e.pos.supplierMismatch?`set to ${e.pos.posSupplierLabel} in POSActive; this order is ${e.pos.orderSupplierLabel}`:(e.pos&&!e.pos.inMaster?'not in POS master':'')})),notInvoicedCount,notInvoicedTotal,manualCount:manualRecords.length,manualTotal,recordCount:records.length};
  }

  function renderPosBalance(totals){
    const box=els.posBalancePanel;if(!box)return;
    if(!totals){box.classList.add('hidden');box.innerHTML='';return;}
    const exportBalances=totals.adjusted!=null&&totals.adjustedEx!=null&&totals.adjustedGst!=null&&Math.abs((totals.adjustedEx+totals.adjustedGst)-totals.adjusted)<=.02;
    const cautions=[];
    if(totals.invoiceOnlyCount)cautions.push(`${totals.invoiceOnlyCount} billed invoice-only product${totals.invoiceOnlyCount===1?' is':'s are'} not on the POS order and not ticked, so ${totals.invoiceOnlyCount===1?'it is':'they are'} omitted from the POSActive import (${money(totals.invoiceOnlyTotal)} inc GST). Tick the INV rows in POS Layout to include them — this is the difference to the supplier invoice total.`);
    if(totals.invoiceOnlyReceivedCount)cautions.push(`${totals.invoiceOnlyReceivedCount} invoice-only product${totals.invoiceOnlyReceivedCount===1?' is':'s are'} included (${money(totals.invoiceOnlyReceivedTotal)} inc GST) although not on the POS order. POSActive can only apply ${totals.invoiceOnlyReceivedCount===1?'it':'them'} if the product is on the open order; add ${totals.invoiceOnlyReceivedCount===1?'it':'them'} to the order first if the import rejects ${totals.invoiceOnlyReceivedCount===1?'it':'them'}.`);
    if(totals.manualCount)cautions.push(`${totals.manualCount} not-invoiced POS-order product${totals.manualCount===1?' was':'s were'} manually received with a Found quantity and ${totals.manualCount===1?'is':'are'} included in the TXT and totals (${money(totals.manualTotal)} inc GST) using POS master CH2_WHOLESALE_EX_GST / POS pricing. Confirm with the supplier that ${totals.manualCount===1?'it was':'they were'} delivered.`);
    if(totals.notInvoicedCount)cautions.push(`${totals.notInvoicedCount} POS-order product${totals.notInvoicedCount===1?' was':'s were'} not invoiced (${money(totals.notInvoicedTotal)} at current ordered value). The TXT cannot clear absent/zero-quantity rows, so confirm they are zero or unticked in POSActive.`);
    if(orderLinkMismatches().length)cautions.push('The invoice Customer PO differs from the uploaded POS order. Confirm the open POSActive order number before comparing totals.');
    const card=(label,value,note,cls='')=>`<div class="pos-balance-card ${cls}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></div>`;
    box.classList.remove('hidden');
    // v2.6.31 — reconcile the supplier invoice total to the lines that are on the POS order and
    // the invoice-only lines, and predict POSActive's supplier-order Sub ID match.
    const io=totals.invoiceOnlyAll||[],ioTotal=io.reduce((a,x)=>a+x.total,0),orderLinesTotal=totals.supplierInvoiceTotal!=null?totals.supplierInvoiceTotal-ioTotal:null;
    const invoiceEquation=io.length&&totals.supplierInvoiceTotal!=null?`<div class="pos-balance-reconcile"><strong>Supplier invoice ${money(totals.supplierInvoiceTotal)} = lines on POS order ${money(orderLinesTotal)} + not on POS order ${money(ioTotal)}</strong><span>${io.map(x=>`${escapeHtml(x.description)} · line ${escapeHtml(x.line)} · ${money(x.total)}${x.supplierNote?` · <b>${escapeHtml(x.supplierNote)}</b>`:''} · ${x.ticked?'included':'not ticked (excluded)'}`).join(' &nbsp;|&nbsp; ')}</span></div>`:'';
    const mc=totals.matchCheck,matchBlock=mc&&mc.total?`<div class="pos-match-check ${mc.mismatches.length?'bad':'good'}"><div class="pos-match-head"><strong>POSActive match check</strong><span>${mc.matched} of ${mc.total} TXT line${mc.total===1?'':'s'} match a Sub ID on POS order ${escapeHtml(mc.orderNumber||'')}${mc.mismatches.length?` · POSActive will report ${mc.mismatches.length} as “Invoice items do not match suppliers order items”`:' · no POSActive matching warning expected'}</span></div>${mc.mismatches.length?`<div class="pos-match-list">${mc.mismatches.map(m=>`<div class="pos-match-item"><b>Line ${escapeHtml(m.line)} · ${escapeHtml(m.posDescription||m.description)}</b><span class="pos-match-key">Sub ID ${escapeHtml(m.subId||'(blank)')}</span><span class="pos-match-reason">${escapeHtml(m.reason)}</span><small>${escapeHtml(m.advice)}</small></div>`).join('')}</div>`:''}</div>`:'';
    box.innerHTML=`<div class="pos-balance-heading"><div><strong>POSActive balancing check</strong><span>These figures come from the exact TXT payload currently ready to download.</span></div><span class="pos-balance-status ${exportBalances?'pass':'review'}">${exportBalances?'FILE BALANCES':'REVIEW'}</span></div><div class="pos-balance-grid">${[
      card('Expected POSActive total',money(totals.adjusted),'Use when CP Inc GST is ON','primary'),
      card('CP Inc GST off',money(totals.adjustedEx),'Expected ex-GST footer'),
      card('GST in import',money(totals.adjustedGst),'Included in expected total'),
      card('Same imported rows—old prices',money(totals.matchedCurrent),'Current POS prices and import quantities'),
      card('Full current POS order',money(totals.current),'Every ordered row, inc GST'),
      card('Supplier invoice total',money(totals.supplierInvoiceTotal),'Before invoice-only omissions or receiving changes')
    ].join('')}</div><div class="pos-balance-equation"><strong>${money(totals.adjustedEx)} ex GST + ${money(totals.adjustedGst)} GST = ${money(totals.adjusted)} expected in POSActive</strong><span>Compare like-for-like: same order, same included rows and the same CP Inc GST setting.</span></div>${invoiceEquation}${matchBlock}${cautions.length?`<div class="pos-balance-cautions">${cautions.map(x=>`<span>${escapeHtml(x)}</span>`).join('')}</div>`:''}`;
  }

  // v2.6.30 — billed invoice lines that are not on the POS order are appended to POS
  // Layout as receivable rows (cached per reconciliation result).
  let invoiceOnlyCache={result:null,entries:[]};
  function invoiceOnlyEntries(){
    if(!state.result||!state.posParsed||!PHF.posImport||typeof PHF.posImport.invoiceOnlyEntries!=='function')return [];
    if(invoiceOnlyCache.result!==state.result)invoiceOnlyCache={result:state.result,entries:PHF.posImport.invoiceOnlyEntries(state.result,state.refs,state.posParsed)};
    return invoiceOnlyCache.entries;
  }
  function sortedPosRows(){
    const order=((state.posParsed&&state.posParsed.rows)||[]).slice().sort((a,b)=>{
      const ar=Number(a&&a.sourceRow),br=Number(b&&b.sourceRow);
      if(Number.isFinite(ar)&&Number.isFinite(br)&&ar!==br)return ar-br;
      return Number(a&&a.posIndex||0)-Number(b&&b.posIndex||0);
    });
    return order.concat(invoiceOnlyEntries().map(e=>e.pos));
  }
  function unpackIdentity(pos){
    return String((pos&&pos.identity)||[pos&&pos.sourceRow,pos&&pos.plu,pos&&pos.barcode,pos&&pos.description].map(v=>String(v??'').trim()).join('|'));
  }
  function unpackStorageKey(){
    const id=(state.posParsed&&state.posParsed.orderNumber)||(state.pos&&state.pos.name)||'current-order';
    return `phf-ch2-unpack-v2610:${String(id).replace(/[^a-z0-9._-]+/gi,'_')}`;
  }
  function receivingStorageSuffix(orderId){
    const id=orderId||(state.posParsed&&state.posParsed.orderNumber)||(state.pos&&state.pos.name)||'current-order';
    return String(id).replace(/[^a-z0-9._-]+/gi,'_');
  }
  function clearStoredReceivingState(orderId){
    const suffix=receivingStorageSuffix(orderId);
    const keys=[
      `phf-ch2-unpack-v2610:${suffix}`,`phf-ch2-unpackqty-v2610:${suffix}`,
      `phf-ch2-unpack-v269:${suffix}`,`phf-ch2-unpackqty-v269:${suffix}`,
      `phf-ch2-unpack-v267:${suffix}`,`phf-ch2-unpackqty-v267:${suffix}`,
      `phf-ch2-unpack-v266:${suffix}`,`phf-ch2-unpackqty-v266:${suffix}`,
      `phf-ch2-unpack:${suffix}`,`phf-ch2-unpackqty:${suffix}`
    ];
    try{for(const key of keys)sessionStorage.removeItem(key);}catch(err){console.warn('Could not clear previous receiving session',err);}
  }
  function resetReceivingState({clearStorage=true,orderId=''}={}){
    clearTimeout(posReceivingRenderTimer);posReceivingRenderTimer=0;
    if(clearStorage)clearStoredReceivingState(orderId);
    state.importKeys=new Map();state.importKeyReviews=new Map();
    state.unpackChecked=new Set();
    state.unpackManualChecked=new Set();
    state.unpackCounts=new Map();
    state.receivingMigratedFrom266=false;
    state.posSortKey='__pos_order_index';state.posSortDir='asc';state.posSortExplicit=false;state.dockOffset=0;
    completionStamps.clear();
    state.unpackKey=unpackStorageKey();
    state.unpackCountsKey=unpackCountsStorageKey();
  }
  function loadUnpackChecklist(){
    const key=unpackStorageKey();state.unpackKey=key;state.unpackChecked=new Set();
    try{const raw=sessionStorage.getItem(key);if(raw){const arr=JSON.parse(raw);if(Array.isArray(arr))state.unpackChecked=new Set(arr.map(String));}}catch(err){console.warn('Could not restore unpacking checklist',err);}
  }
  function saveUnpackChecklist(){
    if(!state.unpackKey)return;
    try{sessionStorage.setItem(state.unpackKey,JSON.stringify([...state.unpackChecked]));}catch(err){console.warn('Could not save unpacking checklist',err);}
  }
  function unpackCountsStorageKey(){
    const id=(state.posParsed&&state.posParsed.orderNumber)||(state.pos&&state.pos.name)||'current-order';
    return `phf-ch2-unpackqty-v2610:${String(id).replace(/[^a-z0-9._-]+/gi,'_')}`;
  }
  function loadUnpackCounts(){
    const key=unpackCountsStorageKey();state.unpackCountsKey=key;state.unpackCounts=new Map();state.receivingMigratedFrom266=false;
    try{const raw=sessionStorage.getItem(key);if(raw){const obj=JSON.parse(raw);if(obj&&typeof obj==='object'&&!Array.isArray(obj)){for(const [k,v] of Object.entries(obj)){const n=Number(v);if(Number.isFinite(n))state.unpackCounts.set(String(k),n);}}}}catch(err){console.warn('Could not restore unpacked quantity totals',err);}
  }
  function saveUnpackCounts(){
    if(!state.unpackCountsKey)return;
    try{sessionStorage.setItem(state.unpackCountsKey,JSON.stringify(Object.fromEntries(state.unpackCounts)));}catch(err){console.warn('Could not save unpacked quantity totals',err);}
  }
  function unpackCountFor(pos){
    const key=unpackIdentity(pos),v=Number(state.unpackCounts.get(key)||0);return Number.isFinite(v)?v:0;
  }
  function displayUnpackCount(v){
    const n=Number(v);if(!Number.isFinite(n))return '0';return n.toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:3});
  }
  function applyUnpackDelta(posKey,delta){
    const d=Number(delta);if(!posKey||!Number.isFinite(d)||d===0)return null;
    const current=Number(state.unpackCounts.get(posKey)||0),next=Math.max(0,Math.round((current+d)*1000)/1000);
    // Keep an explicit zero after a row has been touched. That lets the UI distinguish
    // "not counted yet" from "counted and corrected back to zero".
    state.unpackCounts.set(posKey,next);
    saveUnpackCounts();return next;
  }
  function setUnpackTotal(posKey,total){
    const n=Number(total);if(!posKey||!Number.isFinite(n))return null;
    const next=Math.max(0,Math.round(n*1000)/1000);
    state.unpackCounts.set(posKey,next);
    saveUnpackCounts();return next;
  }
  function unpackExpectedQty(pos,detail){
    // The physical receiving target is what CH2 says it supplied. A cancelled/not-
    // invoiced POS line therefore expects zero, while a short supply expects the
    // supplier quantity rather than the original ordered quantity.
    const supplied=detail?numberValue(detail.suppliedQty):null;
    if(supplied!=null)return Math.max(0,supplied);
    return 0;
  }
  function unpackCountStatus(posKey,found,expected){
    const touched=!!(posKey&&state.unpackCounts.has(posKey));
    const f=Number(found),e=Number(expected);
    if(!touched||!Number.isFinite(f)||!Number.isFinite(e))return {kind:'untouched',label:'Not counted yet'};
    const tol=.0005,diff=f-e;
    if(Math.abs(f)<=tol&&e>tol)return {kind:'under',label:`Not supplied · expected ${displayUnpackCount(e)}`};
    if(Math.abs(diff)<=tol)return {kind:'exact',label:`Correct · expected ${displayUnpackCount(e)}`};
    if(diff<0)return {kind:'under',label:`Under by ${displayUnpackCount(Math.abs(diff))} · expected ${displayUnpackCount(e)}`};
    return {kind:'over',label:`Over by ${displayUnpackCount(diff)} · expected ${displayUnpackCount(e)}`};
  }
  function receivingCountMatches(found,expected){
    const f=Number(found),e=Number(expected);return Number.isFinite(f)&&Number.isFinite(e)&&Math.abs(f-e)<=.0005;
  }
  function unpackRowComplete(pos,detail){
    return state.unpackChecked.has(unpackIdentity(pos));
  }
  function syncUnpackCompletion(pos,detail,{explicitZero=false}={}){
    const key=unpackIdentity(pos),expected=unpackExpectedQty(pos,detail),found=unpackCountFor(pos);
    // Automatic completion is strict. Partial/over counts stay in Remaining until the
    // expected CH2 quantity is reached. The only persistent override is an explicit
    // click on the left checkbox; Add Qty/Found edits must never create that override.
    const manual=state.unpackManualChecked.has(key);
    const complete=manual||explicitZero||receivingCountMatches(found,expected);
    if(complete)state.unpackChecked.add(key);else state.unpackChecked.delete(key);
    saveUnpackChecklist();return complete;
  }
  function setUnpackComplete(pos,detail,complete){
    const key=unpackIdentity(pos),expected=unpackExpectedQty(pos,detail);
    if(complete){
      // The left checkbox is the deliberate manual acceptance control. Preserve a
      // short/over/zero Found count; only seed expected CH2 qty when not yet counted.
      if(!state.unpackCounts.has(key))state.unpackCounts.set(key,Math.max(0,Math.round(Number(expected||0)*1000)/1000));
      state.unpackManualChecked.add(key);
      state.unpackChecked.add(key);
    }else{
      // Unticking is an explicit undo: clear the manual acceptance and the Found total
      // so a miscount can be restarted cleanly from zero.
      state.unpackManualChecked.delete(key);
      state.unpackChecked.delete(key);
      state.unpackCounts.delete(key);
    }
    saveUnpackCounts();saveUnpackChecklist();
  }
  const posSortCollator=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});
  function posSortValue(pos,c,detail){
    if(!c)return '';
    if(c.kind==='qtytotal')return unpackCountFor(pos);
    if(c.kind==='check')return state.unpackChecked.has(unpackIdentity(pos))?1:0;
    if(c.key==='__pos_order_index')return Number(pos&&pos.posIndex)||0;
    const v=posColumnValue(pos,c,detail);
    if(c.kind==='number')return numberValue(v)??Number.NEGATIVE_INFINITY;
    return cleanText(v);
  }
  function sortPosPreviewRows(rows,detailBySourceRow){
    const key=state.posSortKey||'__pos_order_index',c=POS_VIEW_COLUMNS.find(x=>x.key===key)||POS_VIEW_COLUMNS.find(x=>x.key==='__pos_order_index'),dir=state.posSortDir==='desc'?-1:1;
    return (rows||[]).slice().sort((a,b)=>{
      const ad=detailBySourceRow.get(String(a&&a.sourceRow!=null?a.sourceRow:''))||null,bd=detailBySourceRow.get(String(b&&b.sourceRow!=null?b.sourceRow:''))||null;
      const av=posSortValue(a,c,ad),bv=posSortValue(b,c,bd);
      let cmp=0;
      if(typeof av==='number'&&typeof bv==='number')cmp=av-bv;
      else cmp=posSortCollator.compare(String(av??''),String(bv??''));
      if(!cmp)cmp=(Number(a&&a.posIndex)||0)-(Number(b&&b.posIndex)||0);
      return cmp*dir;
    });
  }
  // v2.6.31 — Completed rows are listed most recently completed first (so the docked
  // Completed panel shows what was just checked) until staff click a column heading.
  const completionStamps=new Map();let completionStamp=0;
  function posPreviewSections(detailBySourceRow){
    const base=sortedPosRows(),remaining=[],complete=[];
    for(let i=0;i<base.length;i++){
      const pos=base[i],detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||posDetailAt(i);
      (unpackRowComplete(pos,detail)?complete:remaining).push(pos);
    }
    const completeKeys=new Set(complete.map(unpackIdentity));
    for(const key of [...completionStamps.keys()])if(!completeKeys.has(key))completionStamps.delete(key);
    let stamp=0;for(const key of completeKeys)if(!completionStamps.has(key)){if(!stamp)stamp=++completionStamp;completionStamps.set(key,stamp);}
    let completeSorted=sortPosPreviewRows(complete,detailBySourceRow);
    if(!state.posSortExplicit)completeSorted=completeSorted.slice().sort((a,b)=>(completionStamps.get(unpackIdentity(b))||0)-(completionStamps.get(unpackIdentity(a))||0)||((Number(a&&a.posIndex)||0)-(Number(b&&b.posIndex)||0)));
    return {remaining:sortPosPreviewRows(remaining,detailBySourceRow),complete:completeSorted};
  }
  function completionCount(rows,detailBySourceRow){
    let done=0;for(let i=0;i<(rows||[]).length;i++){const pos=rows[i],detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||posDetailAt(i);if(unpackRowComplete(pos,detail))done++;}return done;
  }
  function updateUnpackTotalElement(out,posKey,total,expected){
    if(!out)return;const found=Number(total)||0,status=unpackCountStatus(posKey,found,expected);
    out.value=displayUnpackCount(found);
    out.classList.remove('found-untouched','found-under','found-exact','found-over');
    out.classList.add(`found-${status.kind}`);
    out.title=`Expected: ${displayUnpackCount(expected)} · Found: ${displayUnpackCount(found)} · ${status.label}`;
    out.setAttribute('aria-label',`Found ${displayUnpackCount(found)}. ${status.label}`);
  }
  function decodeUnpackKey(v){try{return decodeURIComponent(v||'');}catch(_){return v||'';}}
  function commitQtyInput(input){
    if(!input||!input.classList||!input.classList.contains('unpack-qty-input'))return false;
    const raw=String(input.value||'').trim();if(!raw)return false;
    const delta=Number(raw);if(!Number.isFinite(delta)){input.value='';return false;}
    const key=decodeUnpackKey(input.dataset.unpackQtyKey||'');if(!key){input.value='';return false;}
    const expected=numberValue(input.dataset.unpackExpected)??0;

    // Add Qty = 0 is a deliberate receiving instruction, not a no-op.  It clears any
    // existing Found quantity, records an explicit zero, and marks the row accounted
    // for so it moves to Completed.  The POSActive exporter then omits that zero-qty
    // invoice line (as required by the importer contract) and reports it as not supplied.
    const manual=state.unpackManualChecked.has(key);
    let total,complete=false;
    if(Math.abs(delta)<.0000001){
      total=setUnpackTotal(key,0);
      // Zero is an explicit "not supplied" result and is accounted immediately, but
      // it is not a permanent manual checkbox override. A later positive partial count
      // must return the row to Remaining unless the user actually ticks the checkbox.
      complete=true;
      state.unpackChecked.add(key);saveUnpackChecklist();
    }else{
      total=applyUnpackDelta(key,delta);
      if(total!=null){
        complete=manual||receivingCountMatches(total,expected);
        if(complete)state.unpackChecked.add(key);else state.unpackChecked.delete(key);
        saveUnpackChecklist();
      }
    }
    input.value='';
    const tr=input.closest('tr'),out=tr&&tr.querySelector('.unpack-qty-total');
    if(out&&total!=null)updateUnpackTotalElement(out,key,total,expected);
    updateRowSelectionVisual(tr,complete);if(total!=null)updateManualReceivedVisual(tr,total);
    // Under/over counts remain in Remaining. Exact counts (or explicit zero) move only
    // after the short delay, giving staff time to correct a mistaken entry first.
    scheduleReceivingRender();
    return true;
  }
  function commitFoundInput(input){
    if(!input||!input.classList||!input.classList.contains('unpack-qty-total'))return false;
    const key=decodeUnpackKey(input.dataset.unpackTotalKey||'');if(!key)return false;
    const expected=numberValue(input.dataset.unpackExpected)??0,raw=String(input.value||'').trim();
    if(!raw){input.value=displayUnpackCount(Number(state.unpackCounts.get(key)||0));return false;}
    const absolute=Number(raw);if(!Number.isFinite(absolute)){input.value=displayUnpackCount(Number(state.unpackCounts.get(key)||0));return false;}
    const manual=state.unpackManualChecked.has(key);
    const total=setUnpackTotal(key,absolute);if(total==null)return false;
    const explicitZero=Math.abs(total)<=.0005&&Number(expected)>.0005;
    const complete=manual||explicitZero||receivingCountMatches(total,expected);
    if(complete)state.unpackChecked.add(key);else state.unpackChecked.delete(key);
    saveUnpackChecklist();updateUnpackTotalElement(input,key,total,expected);
    updateRowSelectionVisual(input.closest('tr'),complete);updateManualReceivedVisual(input.closest('tr'),total);
    scheduleReceivingRender();
    return true;
  }
  function commitActiveReceivingInput(){
    const active=document.activeElement;
    if(!active||!active.classList)return false;
    if(active.classList.contains('unpack-qty-input'))return commitQtyInput(active);
    if(active.classList.contains('unpack-qty-total'))return commitFoundInput(active);
    return false;
  }
  function updateChecklistUi(rows,detailBySourceRow=posDetailMap()){
    const total=(rows||[]).length,checked=completionCount(rows,detailBySourceRow),remaining=Math.max(0,total-checked);
    if(els.posCheckProgress)els.posCheckProgress.textContent=`Accounted ${checked.toLocaleString()} / ${total.toLocaleString()} · Unchecked ${remaining.toLocaleString()}`;
    return {checked,total,remaining};
  }

  function scheduleReceivingRender(delay=1500){
    clearTimeout(posReceivingRenderTimer);
    posReceivingRenderTimer=setTimeout(()=>{
      posReceivingRenderTimer=0;
      let focus=null;const active=document.activeElement;
      if(active&&active.classList){
        if(active.classList.contains('unpack-qty-input'))focus={kind:'add',key:active.dataset.unpackQtyKey||''};
        else if(active.classList.contains('unpack-qty-total'))focus={kind:'found',key:active.dataset.unpackTotalKey||''};
      }
      if(state.previewView==='pos'&&state.result){
        renderPosTable();
        // Re-rendering moves completed rows after the delay. Restore the user's current
        // receiving field so a row move never steals the cursor while they are working.
        if(focus&&focus.key)requestAnimationFrame(()=>{
          const attr=focus.kind==='add'?'data-unpack-qty-key':'data-unpack-total-key';
          const selector=focus.kind==='add'?'.unpack-qty-input':'.unpack-qty-total';
          const target=[...els.tableBody.querySelectorAll(selector)].find(el=>String(el.getAttribute(attr)||'')===String(focus.key));
          if(target){target.focus();if(typeof target.select==='function')target.select();}
        });
      }else schedulePosColumnSizing();
    },delay);
  }
  // A not-invoiced (struck-through) row becomes a normal, counted row as soon as staff enter
  // a positive Found quantity — immediately, without waiting for the delayed re-render.
  function updateManualReceivedVisual(tr,total){
    if(!tr||tr.dataset.notSupplied!=='1')return;
    const received=Number(total)>0;
    tr.classList.toggle('pos-not-supplied',!received);tr.classList.toggle('pos-manual-received',received);
    if(received)tr.dataset.manualReceived='1';else delete tr.dataset.manualReceived;
  }
  function updateRowSelectionVisual(tr,selected){
    if(!tr)return;
    tr.classList.toggle('unpack-checked',!!selected);
    const btn=tr.querySelector('.unpack-check');if(!btn)return;
    btn.classList.toggle('checked',!!selected);btn.setAttribute('aria-pressed',selected?'true':'false');
    const mark=btn.querySelector('span');if(mark)mark.textContent=selected?'✓':'';
  }


  function posSizingText(pos,c,detail,notSupplied){
    if(c.kind==='check')return '✓';
    if(c.kind==='qtyinput')return '-999.999';
    if(c.kind==='qtytotal')return displayUnpackCount(unpackCountFor(pos));
    const v=posColumnValue(pos,c,detail);
    if(c.kind==='bool')return boolValue(v)?'✓':'';
    if(c.kind==='number'){
      let text=fixed(v,c.dp??2);
      const target=comparisonTarget(pos,detail,c.key),move=c.key==='__invoice_discount'?discountMove(v,target):priceMove(v,target);
      if(move&&!notSupplied)text+=` ${move.symbol}`;
      return text;
    }
    return String(v??'');
  }
  function clampWidth(v,min,max){return Math.max(min,Number.isFinite(max)?Math.min(max,v):v);}
  function ensurePosColgroup(){
    let group=els.table.querySelector('colgroup.pos-colgroup');
    if(!group||group.children.length!==POS_VIEW_COLUMNS.length){if(group)group.remove();group=document.createElement('colgroup');group.className='pos-colgroup';for(let i=0;i<POS_VIEW_COLUMNS.length;i++)group.append(document.createElement('col'));els.table.insertBefore(group,els.table.firstChild);}
    return group;
  }
  function clearPosColumnSizing(){
    const group=els.table.querySelector('colgroup.pos-colgroup');if(group)group.remove();
    els.table.style.width='';els.table.style.minWidth='';
  }
  function measurePosColumns(){
    if(state.previewView!=='pos'||!els.tableWrap||!els.table.classList.contains('pos-preview-table'))return;
    const rows=sortedPosRows();if(!rows.length)return;
    const detailBySourceRow=posDetailMap();
    const bodyCell=els.tableBody.querySelector('td'),headCell=els.tableHead.querySelector('th');
    const bodyStyle=getComputedStyle(bodyCell||els.table),headStyle=getComputedStyle(headCell||els.table);
    const bodyFont=`${bodyStyle.fontWeight} ${bodyStyle.fontSize} ${bodyStyle.fontFamily}`;
    const headFont=`${headStyle.fontWeight} ${headStyle.fontSize} ${headStyle.fontFamily}`;
    const pad=(parseFloat(bodyStyle.paddingLeft)||0)+(parseFloat(bodyStyle.paddingRight)||0)+6;
    const hpad=(parseFloat(headStyle.paddingLeft)||0)+(parseFloat(headStyle.paddingRight)||0)+6;
    // v2.6.32 — each heading needs its longest word plus the 11px arrow gutter on both sides.
    // This is also the floor when columns are narrowed to fit the window, so headings stay centred.
    const headNeed=POS_VIEW_COLUMNS.map(c=>{posMeasureCtx.font=headFont;const w=Math.max(0,...String(c.label).split(/\s+/).filter(Boolean).map(x=>posMeasureCtx.measureText(x).width));return Math.ceil(w+(c.sortable===false?0:22)+hpad);});
    const widths=POS_VIEW_COLUMNS.map((c,i)=>{
      let maxText=0;
      // v2.6.30 — headings wrap between words, so a column only needs its longest heading
      // word plus the sort arrow (kept together) rather than the whole heading on one line.
      posMeasureCtx.font=headFont;
      maxText=Math.max(maxText,headNeed[i]);
      posMeasureCtx.font=bodyFont;
      for(let r=0;r<rows.length;r++){
        const pos=rows[r],detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||posDetailAt(r),notSupplied=!detail||Number(detail.suppliedQty||0)<=0;
        const text=posSizingText(pos,c,detail,notSupplied);maxText=Math.max(maxText,posMeasureCtx.measureText(text).width+pad);
      }
      if(c.kind==='bool'||c.kind==='check')maxText=Math.max(maxText,30);
      return clampWidth(Math.ceil(maxText),Math.max(c.min,headNeed[i]),Math.max(c.max,headNeed[i]));
    });

    // Start from the measured content width, then make the plan workspace-aware.
    // On a narrow window we preserve the compact POS numeric columns and shrink text
    // columns first. On a wide window we deliberately use the available workspace,
    // spreading spare pixels across Brand / Description / IDs and the price block
    // instead of leaving a large blank area on the right.
    const available=Math.max(320,els.tableWrap.clientWidth-2);
    let total=widths.reduce((a,b)=>a+b,0);

    if(total>available){
      let excess=total-available;
      const shrinkOrder=['descr','__pos_brand','main_id','sub_id','__ch2_item_code','plu','adjrrprce','adjwsprce','adjcatprce','adjdprce','__invoice_discount','__row_total_inc_gst','mupc','gppc','gst_tax_pc','qty_stk_in','or_qty','units','qty'];
      for(const key of shrinkOrder){
        if(excess<=.5)break;const i=POS_VIEW_COLUMNS.findIndex(c=>c.key===key);if(i<0)continue;
        const c=POS_VIEW_COLUMNS[i],room=Math.max(0,widths[i]-Math.max(c.min,headNeed[i])),take=Math.min(room,excess);widths[i]-=take;excess-=take;
      }
    }else if(total<available){
      let spare=available-total;
      const distribute=(weightKey,limitKey)=>{
        for(let pass=0;pass<8&&spare>.5;pass++){
          const active=POS_VIEW_COLUMNS.map((c,i)=>({c,i})).filter(x=>Number(x.c[weightKey]||0)>0&&widths[x.i]<(Number(x.c[limitKey])||Infinity)-.5);
          if(!active.length)break;
          const weight=active.reduce((a,x)=>a+Number(x.c[weightKey]||0),0)||1;let used=0;
          for(const {c,i} of active){const share=spare*(Number(c[weightKey]||0)/weight),room=(Number(c[limitKey])||Infinity)-widths[i],add=Math.max(0,Math.min(share,room));widths[i]+=add;used+=add;}
          if(used<.5)break;spare-=used;
        }
      };
      // First add normal breathing room up to the preferred maxima measured for each column.
      distribute('grow','max');
      // Then use the remainder of a genuinely wide workspace across the columns that
      // benefit from it. Product Description remains the main elastic field, while
      // Brand, IDs and prices receive enough room to feel balanced and POS-like.
      distribute('stretch','hardMax');
      // If an unusually wide monitor still has spare room, do not leave a dead white
      // strip. Spread it across the human-readable identity block in controlled ratios.
      if(spare>.5){
        const finalKeys=[['descr',.49],['__pos_brand',.15],['main_id',.09],['sub_id',.075],['__ch2_item_code',.065],['plu',.045],['adjrrprce',.025],['adjwsprce',.025],['adjcatprce',.02],['adjdprce',.025],['__row_total_inc_gst',.03]];
        const w=finalKeys.reduce((a,x)=>a+x[1],0);let used=0;
        for(const [key,weight] of finalKeys){const i=POS_VIEW_COLUMNS.findIndex(c=>c.key===key);if(i<0)continue;const add=spare*(weight/w);widths[i]+=add;used+=add;}
        spare=Math.max(0,spare-used);
      }
    }

    total=Math.ceil(widths.reduce((a,b)=>a+b,0));
    const group=ensurePosColgroup(),cols=[...group.children];cols.forEach((col,i)=>{col.style.width=`${Math.round(widths[i])}px`;});
    els.table.style.width=`${total}px`;els.table.style.minWidth=`${total}px`;
  }
  function schedulePosColumnSizing(){
    clearTimeout(posResizeTimer);posResizeTimer=setTimeout(()=>requestAnimationFrame(measurePosColumns),35);
  }
  function ensurePosResizeObserver(){
    if(posResizeObserver||!els.tableWrap)return;
    if('ResizeObserver' in global){posResizeObserver=new ResizeObserver(()=>{if(state.previewView==='pos')schedulePosColumnSizing();});posResizeObserver.observe(els.tableWrap);}
    global.addEventListener('resize',()=>{if(state.previewView==='pos')schedulePosColumnSizing();},{passive:true});
  }

  async function refreshReferenceStatus(){
    try{const s=await PHF.referenceStore.status();state.referenceReady=!!(s.master&&s.supplier);if(state.referenceReady){const name=(s.master&&s.master.name)||'POS master';els.referenceReady.textContent=`Ready · ${name}`;els.referenceDot.className='reference-dot ok';}else{els.referenceReady.textContent='Admin setup required';els.referenceDot.className='reference-dot warn';}renderFiles();}
    catch(err){console.error(err);state.referenceReady=false;els.referenceReady.textContent='Unavailable';els.referenceDot.className='reference-dot warn';renderFiles();}
  }
  function renderFiles(){
    els.posFiles.replaceChildren();if(state.pos)els.posFiles.append(fileRow(state.pos,()=>{resetReceivingState({clearStorage:true});state.pos=null;state.result=null;state.posParsed=null;state.runIntegrity=null;state.orderOverrides=new Map();renderFiles();hideResults();}));
    els.invoiceFiles.replaceChildren();state.invoices.forEach((f,i)=>els.invoiceFiles.append(fileRow(f,()=>{resetReceivingState({clearStorage:true});state.invoices.splice(i,1);state.result=null;state.docs=[];state.runIntegrity=null;state.orderOverrides=new Map();renderFiles();hideResults();})));
    const filesReady=!!state.pos&&state.invoices.length>0,ready=filesReady&&state.referenceReady;els.runBtn.disabled=!ready;
    if(!state.referenceReady)setStatus('Reference data is not ready on this computer. Open Admin to load the POS master and supplier/discount reference data.','warn');
    else if(filesReady)setStatus(`Ready: 1 POS order and ${state.invoices.length} supplier invoice${state.invoices.length===1?'':'s'} selected.`,'ok');
    else setStatus('Add one POS order and at least one supplier invoice to continue.','info');
  }
  function addPos(files){resetReceivingState({clearStorage:true});const f=[...files].find(x=>validExt(x,['.xls','.xlsx','.csv']));if(f)state.pos=f;state.result=null;state.posParsed=null;state.runIntegrity=null;state.orderOverrides=new Map();state.unpackChecked=new Set();state.unpackKey=null;state.unpackCounts=new Map();state.unpackCountsKey=null;hideResults();renderFiles();}
  function addInvoices(files){resetReceivingState({clearStorage:true});for(const f of files){if(validExt(f,['.pdf','.xls','.xlsx','.csv'])&&!state.invoices.some(x=>x.name===f.name&&x.size===f.size))state.invoices.push(f);}state.result=null;state.docs=[];state.runIntegrity=null;state.orderOverrides=new Map();hideResults();renderFiles();}
  function wireDrop(zone,input,handler){zone.onclick=()=>input.click();zone.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click();}};input.onchange=()=>handler(input.files);['dragenter','dragover'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.add('drag');}));['dragleave','drop'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.remove('drag');}));zone.addEventListener('drop',e=>handler(e.dataTransfer.files));}

  function pill(status){let cls='bad';if(status==='OK')cls='ok';else if(status==='BETTER PRICE')cls='better';else if(/REVIEW|LOW/.test(status))cls='review';return `<span class="status-pill ${cls}">${escapeHtml(status)}</span>`;}
  function kpi(label,value,cls=''){return `<div class="kpi ${cls}"><div class="n">${escapeHtml(value)}</div><div class="l">${escapeHtml(label)}</div></div>`;}
  function updateDownloadButton(){
    const ready=!!(state.runIntegrity&&state.runIntegrity.ok);
    // v2.6.29 — the green primary button (shown first) is the download for the current view:
    // POS layout → POSActive Import.txt · Exceptions → Exceptions.xlsx · All lines → Full Reconciliation.xlsx.
    const viewPrimary=state.previewView==='all'?els.fullDownloadBtn:els.downloadBtn;
    for(const b of [els.fullDownloadBtn,els.fullCsvDownloadBtn,els.downloadBtn,els.keyReviewBtn]){if(!b)continue;const on=b===viewPrimary;b.classList.toggle('primary',on);b.classList.toggle('view-primary',on);}
    if(els.fullDownloadBtn){
      els.fullDownloadBtn.textContent='Download Full Reconciliation.xlsx';
      els.fullDownloadBtn.disabled=!ready;
      els.fullDownloadBtn.title=ready?'Download the original complete 43-column linked-POS reconciliation workbook. Barcodes are stored as exact text.':'Excel export is blocked until all integrity checks pass.';
    }
    if(els.fullCsvDownloadBtn){
      els.fullCsvDownloadBtn.textContent='Download Full Reconciliation.csv';
      els.fullCsvDownloadBtn.disabled=!ready;
      els.fullCsvDownloadBtn.title=ready?'Download the same 43-column reconciliation as an Excel-safe UTF-8 CSV. Barcodes use a text formula so leading zeroes remain visible when opened directly in Excel.':'CSV export is blocked until all integrity checks pass.';
    }
    if(els.keyReviewBtn)els.keyReviewBtn.disabled=!state.result;
    if(!els.downloadBtn)return;
    const orderMismatches=orderLinkMismatches(),orderLinkReady=true;
    const labels={exceptions:'Download Exceptions.xlsx',pos:'Download POSActive Import.txt'};
    if(state.previewView==='all'){
      els.downloadBtn.classList.add('hidden');
      els.downloadBtn.disabled=true;
      return;
    }
    els.downloadBtn.classList.remove('hidden');
    els.downloadBtn.textContent=labels[state.previewView]||'Download Current View';
    const posLinkBlocked=false;
    els.downloadBtn.disabled=!ready;
    els.downloadBtn.title=!ready?'Export is blocked until all integrity checks pass.':`Download the ${state.previewView==='pos'?'POSActive 15-column tab-delimited import file; only ticked/accounted POS Layout rows are supplied, with Found quantities applied':'exceptions workbook'}.`;
  }
  function setViewButtons(){
    const map={exceptions:els.viewExceptionsBtn,all:els.viewAllBtn,pos:els.viewPosBtn};
    Object.entries(map).forEach(([k,b])=>{if(!b)return;b.classList.toggle('active',state.previewView===k);b.setAttribute('aria-pressed',state.previewView===k?'true':'false');});
    updateDownloadButton();
  }
  function renderReconTable(r){
    if(els.posTools)els.posTools.classList.add('hidden');if(els.receivingActions)els.receivingActions.classList.add('hidden');renderPosBalance(null);els.tableWrap.classList.remove('preview-pos');els.table.classList.remove('pos-preview-table');clearPosColumnSizing();if(els.tableFoot)els.tableFoot.innerHTML='';
    els.tableHead.innerHTML=`<tr>${RECON_COLUMNS.map(c=>`<th${c.kind==='number'?' class="num"':c.kind==='center'?' class="center"':''}>${escapeHtml(c.label)}</th>`).join('')}</tr>`;
    const display=state.previewView==='all'?r.detail:r.detail.filter(x=>x.hasException||x.matchConfidence==='LOW');
    const extras=r.unmatchedInvoice.map(x=>({status:'NOT ORDERED / UNMATCHED',posDescription:x.description,orderedQty:null,suppliedQty:x.qtySupplied,expectedUnit:null,actualUnit:x.unitPriceExGst,unitVariance:null,missedTotal:0,matchConfidence:'',hasException:true}));
    const rows=[...display,...extras];
    els.tableBody.innerHTML=rows.length?rows.map(x=>`<tr><td>${pill(x.status)}</td><td>${escapeHtml(x.posDescription)}</td><td class="num">${qty(x.orderedQty)}</td><td class="num">${qty(x.suppliedQty)}</td><td class="num">${money(x.expectedUnit)}</td><td class="num">${money(x.actualUnit,4)}</td><td class="num">${money(x.unitVariance,4)}</td><td class="num">${money(x.missedTotal)}</td><td class="center">${x.matchConfidence?escapeHtml(x.matchConfidence):'<span class="muted">—</span>'}</td></tr>`).join(''):'<tr><td colspan="9">No exceptions found.</td></tr>';
    ensureStickyTracking();
  }
  function renderPosTable(){
    refreshImportKeyReview();
    if(els.posTools)els.posTools.classList.remove('hidden');
    if(els.receivingActions)els.receivingActions.classList.remove('hidden');
    els.tableWrap.classList.add('preview-pos');els.table.classList.add('pos-preview-table');
    const baseRows=sortedPosRows();const detailBySourceRow=posDetailMap();
    // A tick means this row is accounted for/completed. Export quantity is independent:
    // an entered Found value (including a positive partial/over count) is always honoured
    // in the POSActive file; only untouched + unticked rows default to not supplied. A
    // checked row with no explicit Found value uses the expected CH2 supplied quantity.
    // If Found totals were migrated from the v2.6.6 regression, deliberately rebuild the
    // completion state once: exact counts and explicit zero are complete; partial/over
    // counts remain in Remaining so staff can continue counting or manually tick them.
    let stateChanged=false;
    for(let i=0;i<baseRows.length;i++){
      const pos=baseRows[i],detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||posDetailAt(i),key=unpackIdentity(pos),expected=unpackExpectedQty(pos,detail);
      if(state.receivingMigratedFrom266&&state.unpackCounts.has(key)){
        const found=unpackCountFor(pos),complete=(Math.abs(found)<=.0005&&expected>.0005)||receivingCountMatches(found,expected);
        if(complete)state.unpackChecked.add(key);else state.unpackChecked.delete(key);stateChanged=true;
      }
      if(state.unpackChecked.has(key)&&!state.unpackCounts.has(key)){state.unpackCounts.set(key,expected);stateChanged=true;}
    }
    if(state.receivingMigratedFrom266){state.receivingMigratedFrom266=false;stateChanged=true;}
    if(stateChanged){saveUnpackCounts();saveUnpackChecklist();}
    const orderBaseRows=baseRows.filter(pos=>!(pos&&pos.invoiceOnly)),selectedCount=baseRows.reduce((n,pos)=>n+(state.unpackChecked.has(unpackIdentity(pos))?1:0),0),allSelected=orderBaseRows.length>0&&orderBaseRows.every(pos=>state.unpackChecked.has(unpackIdentity(pos))),partSelected=selectedCount>0&&!allSelected;
    if(els.tickAllBtn){els.tickAllBtn.textContent=allSelected?'Untick all':'Tick all';els.tickAllBtn.title=allSelected?'Untick all — clear all Found quantities and return rows to Remaining':'Tick all — untouched rows use expected CH2 supplied qty';}
    // v2.6.30 — one header-cell builder for the main sticky header and the Completed section
    // header row, so both carry the same sortable headings (sorting applies to both sections).
    const headerCell=(c,withControls)=>{
      const cls=[c.kind==='check'?'unpack-head':'',c.kind==='bool'?'pos-bool-head':'',(['number','qtyinput','qtytotal'].includes(c.kind))?'num':'',(c.kind==='bool'||c.kind==='check'||c.align==='center')?'center':''].filter(Boolean).join(' ');
      if(!withControls&&c.kind==='check')return `<th class="${cls}" scope="col">✓</th>`;
      if(!withControls&&c.kind==='qtyinput')return `<th class="${cls}" scope="col">${escapeHtml(c.label)}</th>`;
      if(c.kind==='check')return `<th class="${cls}" title="Tick all / untick all POS rows for the POSActive download"><div class="pos-header-stack"><button type="button" class="unpack-check unpack-check-all ${allSelected?'checked':''} ${partSelected?'partial':''}" data-toggle-all aria-pressed="${allSelected?'true':'false'}" title="${allSelected?'Untick all — clear all Found quantities and return rows to Remaining':'Tick all — untouched rows use expected CH2 supplied qty'}"><span aria-hidden="true">${allSelected?'✓':partSelected?'−':''}</span></button><span class="pos-header-mini-label">All</span></div></th>`;
      if(c.kind==='qtyinput')return `<th class="${cls}"><div class="pos-header-stack"><span>${escapeHtml(c.label)}</span><button type="button" class="pos-header-action" data-clear-qty title="Clear all Found quantities and receiving selections">Clear qty</button></div></th>`;
      const sortable=c.sortable!==false,active=sortable&&state.posSortKey===c.key,arrow=active?(state.posSortDir==='desc'?'▼':'▲'):'↕';
      return `<th${cls?` class="${cls}"`:''}>${sortable?`<button type="button" class="pos-sort-button ${active?'active':''}" data-sort-key="${escapeHtml(c.key)}" title="Sort by ${escapeHtml(c.label)}">${escapeHtml(c.label)}<span aria-hidden="true">${arrow}</span></button>`:escapeHtml(c.label)}</th>`;
    };
    els.tableHead.innerHTML=`<tr>${POS_VIEW_COLUMNS.map(c=>headerCell(c,true)).join('')}</tr>`;
    const sections=posPreviewSections(detailBySourceRow);
    const progress=updateChecklistUi(baseRows,detailBySourceRow);
    const renderPosRow=(pos,zebraIndex=0,dockRow=false,completeIndex=null)=>{
      const detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||posDetailAt(Math.max(0,(Number(pos&&pos.posIndex)||1)-1)),notSupplied=!detail||Number(detail.suppliedQty||0)<=0;
      const checkKey=unpackIdentity(pos),unpackDone=state.unpackChecked.has(checkKey);
      // v2.6.28 — a not-invoiced row that staff physically received (Found > 0) is exported
      // as a manual POSActive line, so it is shown as live stock rather than struck through.
      const manualReceived=notSupplied&&state.unpackCounts.has(checkKey)&&unpackCountFor(pos)>0;
      const rowClasses=[zebraIndex%2?'pos-row-even':'pos-row-odd',notSupplied&&!manualReceived?'pos-not-supplied':'',manualReceived?'pos-manual-received':'',pos&&pos.invoiceOnly?'pos-invoice-only':'',unpackDone?'unpack-checked':'',dockRow?'pos-dock-member pos-dock-row':''].filter(Boolean).join(' ');
      const cells=POS_VIEW_COLUMNS.map(c=>{
        const v=posColumnValue(pos,c,detail);let html='',extraCls='',title='';
        if(c.kind==='check'){
          html=`<button type="button" class="unpack-check ${unpackDone?'checked':''}" data-unpack-key="${escapeHtml(encodeURIComponent(checkKey))}" aria-pressed="${unpackDone?'true':'false'}" title="${unpackDone?'Untick — clear Found and return this row to Remaining':'Tick — manually accept/account for this row'}"><span aria-hidden="true">${unpackDone?'✓':''}</span></button>`;
          extraCls=' unpack-cell';
        }else if(c.kind==='importkey'){
          if(!detail||!detail.invoiceRows||!detail.invoiceRows.length)html='';
          else{
            const id=importIdentityFor(pos,detail),listId=`import-key-options-${pos.sourceRow}`,opts=[...new Set([id.orderSubId,...id.masterSubIds,...id.invoiceCodes].filter(Boolean))];
            title=`Order Sub ID: ${id.orderSubId||'(blank)'} | Master Sub IDs for this product: ${id.masterSubIds.join(', ')||'(blank / no exact reference)'} | Source: ${id.source}. ${id.issues.join(' ')}`;
            html=`<input type="text" class="import-key-input" data-import-key-row="${escapeHtml(pos.sourceRow)}" data-current-key="${escapeHtml(id.importSubId)}" value="${escapeHtml(id.importSubId)}" list="${escapeHtml(listId)}" aria-label="Import Sub ID for ${escapeHtml(pos.description)}" autocomplete="off"><datalist id="${escapeHtml(listId)}">${opts.map(v=>`<option value="${escapeHtml(v)}"></option>`).join('')}</datalist><span class="import-key-source ${id.status==='REVIEW'?'review':''}">${escapeHtml(id.source)}${id.status==='REVIEW'?' · REVIEW':''}</span>`;
          }
        }else if(c.kind==='qtyinput'){
          const item=String(pos.description||pos.barcode||'this product'),expectedQty=unpackExpectedQty(pos,detail);
          html=`<input class="unpack-qty-input" type="number" step="any" inputmode="decimal" autocomplete="off" data-unpack-qty-key="${escapeHtml(encodeURIComponent(checkKey))}" data-unpack-expected="${escapeHtml(expectedQty)}" aria-label="Add unpacked quantity for ${escapeHtml(item)}" title="Expected in delivery: ${escapeHtml(displayUnpackCount(expectedQty))}. Enter a quantity; Enter, Tab, clicking elsewhere, switching window/tab or leaving the page will save it. Negative values subtract. Partial and over counts stay in Remaining. An exact count completes automatically. Enter 0 to clear Found, mark this row accounted as not supplied, and exclude its zero quantity from the POSActive import.">`;
        }else if(c.kind==='qtytotal'){
          const found=unpackCountFor(pos),expectedQty=unpackExpectedQty(pos,detail),status=unpackCountStatus(checkKey,found,expectedQty);
          html=`<input class="unpack-qty-total found-${status.kind}" type="number" step="any" min="0" inputmode="decimal" autocomplete="off" data-unpack-total-key="${escapeHtml(encodeURIComponent(checkKey))}" data-unpack-expected="${escapeHtml(expectedQty)}" value="${escapeHtml(displayUnpackCount(found))}" title="${escapeHtml(`Expected: ${displayUnpackCount(expectedQty)} · Found: ${displayUnpackCount(found)} · ${status.label}. Edit this total directly to override the running count.`)}" aria-label="${escapeHtml(`Found ${displayUnpackCount(found)}. ${status.label}. Editable total.`)}">`;
        }else if(c.kind==='bool'){const checked=boolValue(v);html=`<span class="pos-checkbox ${c.flag||''} ${checked?'checked':''}" aria-label="${checked?'Checked':'Not checked'}">${checked?'✓':''}</span>`;}
        else if(c.kind==='number'){
          html=escapeHtml(fixed(v,c.dp??2));const target=comparisonTarget(pos,detail,c.key),move=c.key==='__invoice_discount'?discountMove(v,target):priceMove(v,target);
          if(c.key==='__row_total_inc_gst'){
            const rowQty=state.unpackCounts.has(checkKey)?unpackCountFor(pos):(numberValue(detail&&detail.suppliedQty)??numberValue(rawValue(pos,'qty'))??numberValue(pos.orderedQty)??0);
            title=`${displayUnpackCount(rowQty)} × AdjCatPrc ${fixed(discountedPosPrice(pos,detail),2) || '—'} plus GST ${fixed(rawValue(pos,'gst_tax_pc')||pos.gstPct||0,0)}%`;
          }else if(c.key==='__invoice_discount'&&!notSupplied){
            const actual=numberValue(v),expected=numberValue(target);
            if(move){
              extraCls=` price-move-cell price-${move.kind}`;
              html=`<span class="pos-price-value">${html}</span><span class="price-arrow" aria-hidden="true">${move.symbol}</span>`;
              const result=move.kind==='same'?'Correct':actual>expected?`Better by ${Math.abs(move.diff).toFixed(2)}%`:`Below by ${Math.abs(move.diff).toFixed(2)}%`;
              title=`Expected discount: ${expected.toFixed(2)}% · CH2 discount: ${actual.toFixed(2)}% · ${result}`;
            }else if(actual!=null)title=`Expected discount: no matching rule · CH2 discount: ${actual.toFixed(2)}%`;
          }else if(move&&!notSupplied){
            extraCls=` price-move-cell price-${move.kind}`;
            const targetLabel=c.key==='adjrrprce'?'CH2 RRP':c.key==='adjwsprce'?'CH2 Normal W/S':'CH2 Unit Price';
            title=`${targetLabel}: ${Number(move.target).toFixed(2)} · ${move.symbol} ${Math.abs(move.diff).toFixed(2)}`;
            html=`<span class="pos-price-value">${html}</span><span class="price-arrow" aria-hidden="true">${move.symbol}</span>`;
          }
        } else {
          html=escapeHtml(v);if(v)title=String(v);
          if(c.key==='sub_id'&&v&&!cleanText(pos.subId)){const id=importIdentityFor(pos,detail);extraCls=' pos-subid-derived';title=`POS order Sub ID is blank · POSActive import key ${v} from ${id&&id.source?id.source:'invoice'}. Add this Sub ID to the product in POSActive if the import does not match it.`;}
        }
        const cls=[c.cls||'',c.kind==='number'?'num':'',c.kind==='bool'?'pos-bool-cell center':'',c.align==='center'?'center':'',extraCls].filter(Boolean).join(' ');return `<td${cls?` class="${cls}"`:''}${title?` title="${escapeHtml(title)}"`:''}>${html}</td>`;
      }).join('');
      const rowTitle=manualReceived?' title="Manually received — not on the CH2 invoice. Added to the POSActive TXT and totals using POS master CH2_WHOLESALE_EX_GST / POS pricing and the matched discount rule."':pos&&pos.invoiceOnly?` title="${escapeHtml(`Invoice only — billed by CH2 but not on the uploaded POS order${pos.supplierMismatch?`: POSActive assigns this product to ${pos.posSupplierLabel}, not ${pos.orderSupplierLabel}, so it never appears on this supplier's orders`:''}. Tick it (or enter Found) to include it in the POSActive TXT and totals; POSActive can only apply it if the product is on the open order.`)}"`:'';
      return `<tr${rowClasses?` class="${rowClasses}"`:''}${notSupplied?' data-not-supplied="1"':''}${manualReceived?' data-manual-received="1"':''}${completeIndex!=null?` data-complete-index="${completeIndex}"`:''}${rowTitle}>${cells}</tr>`;
    };
    const sectionHtml=[];let zebraIndex=0;
    if(sections.remaining.length){sectionHtml.push(`<tr class="pos-section-row pos-section-remaining"><td colspan="${POS_VIEW_COLUMNS.length}"><strong>Remaining / to check</strong><span>${sections.remaining.length} item${sections.remaining.length===1?'':'s'}</span></td></tr>`);for(const pos of sections.remaining)sectionHtml.push(renderPosRow(pos,zebraIndex++));}
    if(sections.complete.length){sectionHtml.push(`<tr class="pos-section-row pos-section-complete pos-dock-member" data-jump-completed="1" title="Click to jump between Completed / accounted rows and the top of Remaining"><td colspan="${POS_VIEW_COLUMNS.length}"><strong>Completed / accounted</strong><span>${sections.complete.length} item${sections.complete.length===1?'':'s'}${state.posSortExplicit?'':' · most recently checked first'} · scroll over the docked rows to browse · click this bar to jump ↕<em class="dock-window"></em></span></td></tr>`);sectionHtml.push(`<tr class="pos-section-head pos-dock-member" aria-label="Completed section column headings">${POS_VIEW_COLUMNS.map(c=>headerCell(c,false)).join('')}</tr>`);
      state.dockOffset=Math.max(0,Math.min(state.dockOffset||0,sections.complete.length-DOCK_COMPLETED_ROWS));
      sections.complete.forEach((pos,i)=>sectionHtml.push(renderPosRow(pos,zebraIndex++,i>=state.dockOffset&&i<state.dockOffset+DOCK_COMPLETED_ROWS,i)));}
    els.tableBody.innerHTML=sectionHtml.length?sectionHtml.join(''):`<tr><td colspan="${POS_VIEW_COLUMNS.length}">No POS order rows available.</td></tr>`;

    const sortPosBy=key=>{
      if(!key)return;state.posSortExplicit=true;
      if(state.posSortKey===key)state.posSortDir=state.posSortDir==='asc'?'desc':'asc';else{state.posSortKey=key;state.posSortDir='asc';}
      renderPosTable();
    };
    els.tableBody.onclick=e=>{
      const sectionSort=e.target.closest('[data-sort-key]');if(sectionSort){e.preventDefault();e.stopPropagation();sortPosBy(String(sectionSort.dataset.sortKey||''));return;}
      const jump=e.target.closest('[data-jump-completed]');if(jump){e.preventDefault();jumpCompletedSection();return;}
      const btn=e.target.closest('.unpack-check');if(!btn)return;e.preventDefault();e.stopPropagation();
      const key=decodeUnpackKey(btn.dataset.unpackKey||'');if(!key)return;
      const pos=baseRows.find(r=>unpackIdentity(r)===key);if(!pos)return;
      const detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||null;
      const checked=!state.unpackChecked.has(key),tr=btn.closest('tr');
      setUnpackComplete(pos,detail,checked);updateRowSelectionVisual(tr,checked);
      if(!checked){const found=tr&&tr.querySelector('.unpack-qty-total');if(found)updateUnpackTotalElement(found,key,0,unpackExpectedQty(pos,detail));updateManualReceivedVisual(tr,0);}
      scheduleReceivingRender();
    };
    els.tableHead.onclick=e=>{
      const toggle=e.target.closest('[data-toggle-all]'),clear=e.target.closest('[data-clear-qty]'),sort=e.target.closest('[data-sort-key]');
      if(toggle){
        e.preventDefault();e.stopPropagation();
        // v2.6.31 — Tick all covers the POS-order rows. Invoice-only (INV, not on the order)
        // rows are left for a deliberate tick because POSActive cannot match them to the order.
        const orderRows=baseRows.filter(pos=>!(pos&&pos.invoiceOnly)),currentlyAll=orderRows.length>0&&orderRows.every(pos=>state.unpackChecked.has(unpackIdentity(pos))),selectAll=!currentlyAll;
        for(let i=0;i<baseRows.length;i++){
          const pos=baseRows[i],key=unpackIdentity(pos),detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||posDetailAt(i);
          if(selectAll&&pos&&pos.invoiceOnly)continue;
          if(selectAll){
            if(!state.unpackCounts.has(key))state.unpackCounts.set(key,unpackExpectedQty(pos,detail));
            state.unpackManualChecked.add(key);state.unpackChecked.add(key);
          }else{
            state.unpackManualChecked.delete(key);state.unpackChecked.delete(key);state.unpackCounts.delete(key);
          }
        }
        saveUnpackCounts();saveUnpackChecklist();
        for(const tr of els.tableBody.querySelectorAll('tr')){const b=tr.querySelector('.unpack-check[data-unpack-key]');if(!b)continue;const k=decodeUnpackKey(b.dataset.unpackKey||'');updateRowSelectionVisual(tr,state.unpackChecked.has(k));}
        if(els.tickAllBtn)els.tickAllBtn.textContent=selectAll?'Untick all':'Tick all';
        toggle.classList.toggle('checked',selectAll);toggle.classList.remove('partial');toggle.setAttribute('aria-pressed',selectAll?'true':'false');const mark=toggle.querySelector('span');if(mark)mark.textContent=selectAll?'✓':'';
        scheduleReceivingRender();
        return;
      }
      if(clear){
        e.preventDefault();e.stopPropagation();
        state.unpackCounts.clear();state.unpackChecked.clear();state.unpackManualChecked.clear();saveUnpackCounts();saveUnpackChecklist();scheduleReceivingRender();
        return;
      }
      if(sort){
        e.preventDefault();e.stopPropagation();sortPosBy(String(sort.dataset.sortKey||''));
      }
    };
    els.tableBody.onkeydown=e=>{
      const importKey=e.target.closest('.import-key-input');if(importKey&&e.key==='Enter'){e.preventDefault();commitImportKey(importKey);return;}
      const add=e.target.closest('.unpack-qty-input'),found=e.target.closest('.unpack-qty-total');
      if(e.key==='Enter'&&(add||found)){
        e.preventDefault();
        if(add){
          const inputs=[...els.tableBody.querySelectorAll('.unpack-qty-input')],idx=inputs.indexOf(add),next=idx>=0?inputs[idx+1]:null;
          commitQtyInput(add);
          if(next)requestAnimationFrame(()=>{next.focus();if(typeof next.select==='function')next.select();});
        }else commitFoundInput(found);
      }
    };
    els.tableBody.onfocusout=e=>{const add=e.target.closest('.unpack-qty-input'),found=e.target.closest('.unpack-qty-total');if(add)commitQtyInput(add);else if(found)commitFoundInput(found);};
    els.tableBody.onchange=e=>{const importKey=e.target.closest('.import-key-input');if(importKey){commitImportKey(importKey);return;}const add=e.target.closest('.unpack-qty-input'),found=e.target.closest('.unpack-qty-total');if(add)commitQtyInput(add);else if(found)commitFoundInput(found);};

    if(els.tableFoot){
      if(baseRows.length){
        const totals=posTotals(baseRows,detailBySourceRow),foundTotal=baseRows.reduce((sum,pos)=>sum+(state.unpackCounts.has(unpackIdentity(pos))?unpackCountFor(pos):0),0),foundIndex=POS_VIEW_COLUMNS.findIndex(c=>c.key==='__unpack_total'),lastBlock=5,leftSpan=Math.max(1,foundIndex-1),middleSpan=Math.max(0,POS_VIEW_COLUMNS.length-lastBlock-(leftSpan+2));
        renderPosBalance(totals);
        els.tableFoot.innerHTML=`<tr class="pos-total-row"><td colspan="${leftSpan}" class="pos-total-left"><strong>Current Order</strong><span>${baseRows.length.toLocaleString()} product line${baseRows.length===1?'':'s'} · <b data-check-progress>accounted ${progress.checked}/${progress.total} · unchecked ${progress.remaining}</b> · exact counts or manually ticked rows move below Remaining after a short delay · under/over counts stay in Remaining until resolved or manually ticked · unticking a row clears Found and returns it to Remaining · untouched + unticked rows = not supplied by default · entered Found always controls the download qty · grey rows = not invoiced (Found &gt; 0 adds a manual POSActive line) · Add Qty 0 = accounted / not supplied</span></td><td class="pos-found-total-label" title="Total units physically found across all touched POS rows">Found total</td><td class="pos-found-total-value num" title="Total units physically found across all touched POS rows">${displayUnpackCount(foundTotal)}</td>${middleSpan?`<td colspan="${middleSpan}" class="pos-total-spacer"></td>`:''}<td colspan="2" class="pos-total-label" title="Both totals include GST. Adjusted Total mirrors the POSActive import total and applies any Found receiving quantities.">Current / Adjusted Total inc GST</td><td class="pos-total-current" title="Current POS order total including GST">${money(totals.current)}</td><td colspan="2" class="pos-total-adjusted" title="Live POSActive import total including GST; Found quantities applied">${money(totals.adjusted)}</td></tr>`;
      }
      else{els.tableFoot.innerHTML='';renderPosBalance(null);}
    }
    ensurePosResizeObserver();schedulePosColumnSizing();updateStickyOffsets();ensureStickyTracking();
  }
  function renderPreview(r){if(state.previewView==='pos')renderPosTable();else renderReconTable(r);setViewButtons();}

  function renderResults(){
    const r=state.result;if(!r)return;const t=r.totals,integ=state.runIntegrity||{ok:false,errors:['Integrity not run'],warnings:[]};els.results.classList.remove('hidden');els.resultSub.textContent=`${r.orderNumber?`Order ${r.orderNumber} · `:''}${t.matchedInvoiceLines}/${t.invoiceLines} supplier lines matched to the POS order.`;
    els.kpis.innerHTML=[kpi('POS lines',t.posLines),kpi('Exceptions',t.exceptionLines,t.exceptionLines?'bad':'good'),kpi('Unmatched invoices',t.unmatchedInvoiceLines,t.unmatchedInvoiceLines?'bad':'good'),kpi('Better price',t.betterPriceLines,'good'),kpi('Potential missed $',money(t.missedTotal),t.missedTotal>0?'bad':'good'),kpi('Integrity',integ.ok?'PASS':'BLOCKED',integ.ok?'good':'bad')].join('');
    const notes=[...(r.warnings||[])];
    const posDiag=state.posParsed&&state.posParsed.diagnostics||{},restored=Number(posDiag.enrichedRows||0),ambiguousRestores=Number(posDiag.ambiguousMasterRows||0);
    if(restored)notes.push(`POS SOURCE RESTORED — ${restored} order row${restored===1?'':'s'} arrived without one or more standard identifier columns. Missing identifiers were restored only where the aligned master had one unambiguous value for the exact POS PLU.`);
    if(ambiguousRestores)notes.push(`POS SOURCE REVIEW — ${ambiguousRestores} order row${ambiguousRestores===1?' has':'s have'} conflicting master candidates and were not filled automatically.`);
    if(t.lowConfidenceLines){const low=r.detail.filter(x=>x.matchConfidence==='LOW').slice(0,8).map(x=>`${x.posDescription} [${x.matchMethods||'fallback match'}]`);notes.push(`${t.lowConfidenceLines} matched line(s) have LOW confidence and should be reviewed${low.length?`: ${low.join('; ')}`:'.'}`);}
    if(t.auditDataMissing)notes.push(`${t.auditDataMissing} matched POS line(s) cannot receive a complete CH2 discount/wholesale audit because the supplier invoice did not print all required audit fields.`);
    const posIdentityNotes=posSubIdReviewNotes();notes.push(...posIdentityNotes);
    if(integ.ok)notes.unshift('Integrity checks passed: POS source order is locked, every parsed invoice row is accounted for exactly once, and supplier invoice arithmetic is valid.');else notes.unshift(...integ.errors.map(x=>`INTEGRITY BLOCK: ${x}`));notes.push(...(integ.warnings||[]));notes.push('Excel output keeps every POS order line in the exact uploaded sequence. Genuine invoice-only lines are appended only after the complete POS order block.');
    els.warningBox.classList.remove('hidden','ok','bad');if(!integ.ok)els.warningBox.classList.add('bad');else if(!posIdentityNotes.length)els.warningBox.classList.add('ok');els.warningBox.innerHTML='<strong>Review notes:</strong><br>'+notes.map(escapeHtml).join('<br>');
    renderOrderOverrideUi();renderPreview(r);updateDownloadButton();els.results.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function run(){
    if(!state.pos||!state.invoices.length||!state.referenceReady){setStatus('Reference data is not ready on this computer. Open Admin to update it.','warn');return;}
    els.runBtn.disabled=true;els.clearBtn.disabled=true;hideResults();setProgress(4);setStatus('Loading POS/master and discount reference data…','info');
    try{
      state.refs=await PHF.referenceStore.parseStored();setProgress(18);setStatus(`Reference data ready: ${state.refs.master.info.records.toLocaleString()} CH2 codes and ${state.refs.supplier.info.discountRules.toLocaleString()} discount rules. Reading POS order…`,'info');
      const pos=await PHF.parsePosOrder(state.pos,state.refs);state.posParsed=pos;
      // Every Run starts as a genuinely new receiving session. Previous ticks, Found
      // totals, explicit zeros and Remove-not-supplied actions are deliberately cleared,
      // even when the same POS order/invoice files are run again.
      resetReceivingState({clearStorage:true,orderId:pos.orderNumber});
      state.orderOverrides=new Map();
      const restored=Number(pos.diagnostics&&pos.diagnostics.enrichedRows||0);
      setProgress(35);setStatus(`POS order read: ${pos.rows.length} ordered product lines${restored?` · ${restored} row${restored===1?'':'s'} restored from the exact POS PLU in the aligned master`:''}. Receiving checklist reset for a new run. Reading supplier invoice(s)…`,'info');
      const docs=[];for(let i=0;i<state.invoices.length;i++){const doc=await PHF.parseSupplierInvoice(state.invoices[i]);docs.push(doc);setProgress(35+Math.round(((i+1)/state.invoices.length)*38));}state.docs=docs;
      const invoiceCount=docs.reduce((a,d)=>a+(d.rows||[]).length,0);setStatus(`Supplier invoices read: ${invoiceCount} billed product lines. Matching to POS order…`,'info');setProgress(82);
      state.result=PHF.reconcile(pos,docs,state.refs);state.runIntegrity=PHF.integrity.validateRun(pos,docs,state.result);state.result.integrity=state.runIntegrity;setProgress(100);
      const t=state.result.totals;if(state.runIntegrity.ok)setStatus(`Complete: ${t.matchedInvoiceLines}/${t.invoiceLines} invoice lines matched. ${t.exceptionLines} POS line exception${t.exceptionLines===1?'':'s'}${t.unmatchedInvoiceLines?`, ${t.unmatchedInvoiceLines} unmatched invoice line${t.unmatchedInvoiceLines===1?'':'s'}`:''}. Integrity PASS.`,'ok');else setStatus(`Reconciliation completed, but Excel export is blocked by ${state.runIntegrity.errors.length} integrity check${state.runIntegrity.errors.length===1?'':'s'}. Review the notes below.`,'warn');
      state.previewView='pos';renderResults();setTimeout(hideProgress,500);
    }catch(err){console.error(err);hideProgress();setStatus(err&&err.message?err.message:String(err),'warn');}
    finally{els.runBtn.disabled=!(state.pos&&state.invoices.length&&state.referenceReady);els.clearBtn.disabled=false;}
  }

  wireDrop(els.posDrop,els.posInput,addPos);wireDrop(els.invoiceDrop,els.invoiceInput,addInvoices);
  els.clearBtn.onclick=()=>{resetReceivingState({clearStorage:true});state.pos=null;state.invoices=[];state.result=null;state.docs=[];state.posParsed=null;state.previewView='pos';state.runIntegrity=null;state.unpackChecked=new Set();state.unpackManualChecked=new Set();state.unpackKey=null;state.unpackCounts=new Map();state.unpackCountsKey=null;state.receivingMigratedFrom266=false;state.orderOverrides=new Map();els.posInput.value='';els.invoiceInput.value='';hideResults();hideProgress();renderFiles();};
  els.runBtn.onclick=run;
  if(els.fullDownloadBtn)els.fullDownloadBtn.onclick=async()=>{
    if(!state.result||!state.docs.length||!state.refs||!state.runIntegrity||!state.runIntegrity.ok)return;
    els.fullDownloadBtn.disabled=true;els.fullDownloadBtn.textContent='Building Full Excel…';
    try{await PHF.exportReference(state.docs,state.refs,state.posParsed,state.result);setStatus('Full reconciliation Excel generated successfully.','ok');}
    catch(err){console.error(err);setStatus(err&&err.message?err.message:String(err),'warn');}
    finally{updateDownloadButton();}
  };
  if(els.fullCsvDownloadBtn)els.fullCsvDownloadBtn.onclick=async()=>{
    if(!state.result||!state.docs.length||!state.refs||!state.runIntegrity||!state.runIntegrity.ok)return;
    els.fullCsvDownloadBtn.disabled=true;els.fullCsvDownloadBtn.textContent='Building CSV…';
    try{await PHF.exportReferenceCsv(state.docs,state.refs,state.posParsed,state.result);setStatus('Full reconciliation CSV generated successfully. Barcodes are Excel-safe text.','ok');}
    catch(err){console.error(err);setStatus(err&&err.message?err.message:String(err),'warn');}
    finally{updateDownloadButton();}
  };
  if(els.keyReviewBtn)els.keyReviewBtn.onclick=()=>{
    if(!state.result||!state.posParsed)return;
    const out=PHF.posImport.exportKeyReview(state.refs,state.posParsed,state.result,{importKeysBySourceRow:state.importKeys});
    setStatus(`POS key review downloaded: ${out.rows} invoiced products, ${out.review} to review. Import barcode columns as Text when opening this CSV in Excel.`,'info');
  };
  els.downloadBtn.onclick=async()=>{
    const activeKey=document.activeElement;if(activeKey&&activeKey.matches('.import-key-input'))commitImportKey(activeKey);
    commitActiveReceivingInput();
    if(!state.result||!state.docs.length||!state.refs||!state.runIntegrity||!state.runIntegrity.ok||state.previewView==='all')return;
    els.downloadBtn.disabled=true;els.downloadBtn.textContent=state.previewView==='pos'?'Building merged TXT…':'Building Excel…';
    try{
      const exportResult=await PHF.exportView(state.previewView,state.docs,state.refs,state.posParsed,state.result,posExportOptions());
      const label=state.previewView==='pos'?'POSActive merged import file':'exceptions Excel';
      const warningCount=state.previewView==='pos'&&exportResult&&Array.isArray(exportResult.warnings)?exportResult.warnings.length:0;
      const mc=state.previewView==='pos'&&exportResult&&exportResult.matchCheck;
      if(mc&&mc.mismatches&&mc.mismatches.length){
        setStatus(`${label} generated · ${mc.matched}/${mc.total} lines match Sub IDs on POS order ${mc.orderNumber}. POSActive will flag ${mc.mismatches.length}: ${mc.mismatches.map(m=>`line ${m.line} ${m.posDescription||m.description} (${m.reason.toLowerCase()})`).join('; ')}. See the POSActive match check above the table for the fix.`,'warn');
        return;
      }
      const receivingAdjustments=state.previewView==='pos'&&exportResult?Number(exportResult.receivingAdjustments||0):0;
      if(warningCount||receivingAdjustments){
        const parts=[];if(receivingAdjustments)parts.push(`${receivingAdjustments} POS Layout receiving adjustment${receivingAdjustments===1?'':'s'} applied`);if(warningCount)parts.push(`${warningCount} validation note${warningCount===1?'':'s'}`);
        setStatus(`${label} generated successfully · ${parts.join(' · ')}. POSActive will perform its own final Sub ID/order validation on import.`,'warn');
      }else setStatus(`${label} generated successfully.`,'ok');
    }catch(err){
      console.error(err);
      const message=err&&err.message?err.message:String(err);
      setStatus(message,'warn');
      if(state.previewView==='pos'){
        // POS import validation can intentionally block an unsafe file.  Make that
        // reason visible at the point of action instead of only in the Step 3 status
        // area above the results, which may be off-screen on long POS previews.
        try{globalThis.alert(message);}catch(_e){}
      }
    }
    finally{updateDownloadButton();}
  };
  if(els.orderOverrideBox)els.orderOverrideBox.onclick=e=>{
    const use=e.target.closest('[data-order-override-use]'),remove=e.target.closest('[data-order-override-remove]');
    if(use){
      const invoice=use.getAttribute('data-order-override-use'),mismatch=orderLinkMismatches().find(x=>x.invoiceNumber===invoice);if(!mismatch)return;
      const ok=global.confirm(`Manually link invoice ${mismatch.invoiceNumber} to uploaded POS order ${mismatch.posOrder}?\n\nCH2 Customer PO: ${mismatch.customerPo}\nPOS order: ${mismatch.posOrder}\n\nThis ONLY overrides the Customer PO equality check. All product, quantity, price, master-identity and total validation remains active.`);
      if(!ok)return;state.orderOverrides.set(mismatch.invoiceNumber,mismatch.posOrder);renderOrderOverrideUi();updateDownloadButton();setStatus(`Manual order-link override active: invoice ${mismatch.invoiceNumber} → POS order ${mismatch.posOrder}. Original CH2 Customer PO ${mismatch.customerPo} is preserved for audit.`, 'warn');
    }else if(remove){
      const invoice=remove.getAttribute('data-order-override-remove');state.orderOverrides.delete(invoice);renderOrderOverrideUi();updateDownloadButton();setStatus(`Manual order-link override removed for invoice ${invoice}.`, 'info');
    }
  };
  function setPreviewView(view){
    commitActiveReceivingInput();
    state.previewView=view;renderPreview(state.result);
    // Always open a view at its first POS row / first column. This avoids a previous
    // horizontal or vertical scroll position making the POS sequence look out of order.
    if(els.tableWrap)requestAnimationFrame(()=>{els.tableWrap.scrollTop=0;els.tableWrap.scrollLeft=0;scheduleStickyOffsets();});
  }
  if(els.viewExceptionsBtn)els.viewExceptionsBtn.onclick=()=>setPreviewView('exceptions');
  if(els.viewAllBtn)els.viewAllBtn.onclick=()=>setPreviewView('all');
  if(els.viewPosBtn)els.viewPosBtn.onclick=()=>setPreviewView('pos');
  // Sticky-bar receiving shortcuts reuse the exact header actions (same state handling).
  if(els.tickAllBtn)els.tickAllBtn.onclick=()=>{commitActiveReceivingInput();const t=els.tableHead&&els.tableHead.querySelector('[data-toggle-all]');if(t)t.click();};
  if(els.clearQtyBtn)els.clearQtyBtn.onclick=()=>{commitActiveReceivingInput();const t=els.tableHead&&els.tableHead.querySelector('[data-clear-qty]');if(t)t.click();};
  if(els.removeNotSuppliedBtn)els.removeNotSuppliedBtn.onclick=()=>{
    commitActiveReceivingInput();
    const detailBySourceRow=posDetailMap(),rows=sortedPosRows();let moved=0;
    for(let i=0;i<rows.length;i++){
      const pos=rows[i],detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||posDetailAt(i);
      if(detail&&Number(detail.suppliedQty||0)>0)continue;
      const key=unpackIdentity(pos);
      // A not-invoiced row that staff already counted (Found > 0) is a manual receipt;
      // the bulk action must not silently reset the user's physical count to zero.
      if(state.unpackCounts.has(key)&&unpackCountFor(pos)>0)continue;
      state.unpackCounts.set(key,0);state.unpackChecked.add(key);moved++;
    }
    saveUnpackCounts();saveUnpackChecklist();
    scheduleReceivingRender();
    if(moved)setStatus(`${moved} not-supplied POS line${moved===1?'':'s'} moved to the processed section. Reconciliation data was not changed.`,'ok');
  };

  // Save any active receiving edit whenever the user moves away — including clicking
  // another control, switching browser window/tab, or navigating away. Add Qty commits
  // a delta and clears; Found commits an absolute override and remains visible.
  document.addEventListener('pointerdown',e=>{
    const active=document.activeElement;if(active&&active.classList&&active!==e.target&&(active.classList.contains('unpack-qty-input')||active.classList.contains('unpack-qty-total')))commitActiveReceivingInput();
  },true);
  global.addEventListener('blur',commitActiveReceivingInput,true);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')commitActiveReceivingInput();});
  global.addEventListener('pagehide',commitActiveReceivingInput);
  if(els.buildLabel&&PHF.schema&&PHF.schema.BUILD)els.buildLabel.textContent=`v${PHF.schema.BUILD.version} · ${PHF.schema.BUILD.name}`;
  // v2.6.30 — a partially deployed build (new scripts, old index.html) silently loses the
  // sticky receiving actions. Say so plainly at the top of the page.
  if(!els.receivingActions){
    console.warn('Reconcile CH2: index.html is older than the loaded scripts; redeploy index.html.');
    if(els.buildLabel){els.buildLabel.textContent+=' · index.html out of date';els.buildLabel.classList.add('build-stale');}
    const strip=document.querySelector('#referenceStrip');
    if(strip){const warn=document.createElement('div');warn.className='notice bad stale-build-notice';warn.textContent=`index.html is older than the loaded scripts (v${PHF.schema&&PHF.schema.BUILD?PHF.schema.BUILD.version:'?'}). Re-upload index.html from the same release so every control and fix loads.`;strip.parentNode.insertBefore(warn,strip);}
  }
  refreshReferenceStatus();
})(window);
