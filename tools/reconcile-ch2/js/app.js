// v2.23.0 (23 Oct 2026, Staff Hub v21.41.0): the POSActive balancing check is always open, just above the RUN row and the
// checklist (it was inside Details; Details keeps the review notes, order link, import keys and the how-to). With Google Drive
// signed in, the newest POS master and Ongoing Discounts come in from Drive by themselves (phf-drive.js v1.1.0). Exports unchanged.
// v2.22.1 (23 Oct 2026, Staff Hub v21.40.1): version only — Google Drive is now set up, so From Google Drive and the Saved files
// panel's Google Drive line show. No change to the checklist, matching or exports.
// v2.22.0 (23 Oct 2026, Staff Hub v21.40.0): a line to fix in POSActive stays in its place in the list, tinted orange, with an orange
// warning row straight above it (what is wrong and what to change; the cell to fix stays red) — no copies at the top. Ticking a
// not-invoiced line receives the ordered quantity (Found, a manual line in the TXT and the totals); ALL leaves those lines for a
// deliberate decision, like billed-not-on-order lines. Totals, Found total, progress, row total, Check and the chips update the
// moment you tick, count or change something. Matching and exports unchanged.
// v2.21.0 (22 Oct 2026, Staff Hub v21.39.0): lines to fix in POSActive stay in the main list (Remaining → Completed) for
// balancing; the "Fix in POSActive" flag at the top of the checklist is a copy of each such line in the same columns (red cell to
// fix; click → the line). The sticky footer carries the totals: Current · Adjusted (the TXT, vs the invoice) · Not invoiced ·
// Combined (Adjusted + Not invoiced, vs Current), live. The summary drops the TXT figure and Details drops the money card. An over
// count / higher Adj Qty is a stronger green. Matching and exports unchanged.
// v2.20.0 (22 Oct 2026, Staff Hub v21.38.0): less above the table — the summary card is two lines and Action needed is gone: lines
// to fix in POSActive (Sub ID it can't import / blank / shared, LOW match, GST differs) are a "Fix in POSActive" section at the top
// of the checklist with the cell to fix in red. Changed cells use the table's colours (price lower blue ↓, higher red ↑; Adj Qty vs
// billed: more green, less red) with an orange corner, and a changed row's POS Index is an orange pill ("N rows changed" filters
// them). A count at or above the billed quantity completes the row (over counts no longer wait in Remaining). Check is live:
// SHORT / OVER from the count, PRICE HIGH / BETTER PRICE / OK from a changed Adj CatPrc. Matching and exports unchanged.
// v2.19.0 (22 Oct 2026, Staff Hub v21.37.0): the result reads in a few lines. One summary card (order, lines matched, invoice,
// POS order, POSActive TXT, checks, and the Check counts as chips with the $ over / under), "Action needed" with only what must be
// fixed for POSActive (Sub ID problems, LOW matches, GST differences) and one "Details" fold (money, POSActive balance, review
// notes, order link, import keys). The squares, "Needs a look" price rows and the checks line (unless a check fails) are gone —
// the checklist's Check column and filters show them. Not-invoiced POS lines get their own "Not invoiced" section at the top of
// the checklist, laid out like every other row (CH2 ITEM CODE from the POS master, Disc % = the Ongoing Discounts rule), ticked
// or not; "Remove not supplied" is gone (ALL / a tick accounts for them). Matching and exports unchanged.
// v2.18.0 (22 Oct 2026, Staff Hub v21.36.0): the checklist works like the merge sheets. Every heading (not ALL / Add Qty)
// has the same sort and filter menu (A to Z / Z to A or Highest / Lowest, Sort off, Show values with counts); filters show as
// chips beside the search. Cells select like a sheet and Ctrl + C copies. Adj WSPrc, Adj CatPrc / Adj DPrc and Adj Qty can be
// changed — type, paste a block, Ctrl + D or drag the corner square; changed cells are orange, Delete restores, Ctrl + Z
// undoes — and the changes go into the POSActive TXT (Normal WS, Unit Price ex GST with Disc % following, quantity = Found)
// and the totals / balance. The toolbar and headings stay under the RUN strip when the page scrolls.
// v2.17.1 (21 Oct 2026, Staff Hub v21.35.0): CLEAR FILES also deletes the saved receiving ticks / Found quantities of every
// order in this tab (clearAllStoredReceivingState), not only the current order's. Uses Library v1.2.0 — deleting Ongoing
// Discounts anywhere also deletes the POS DB & Supplier Merge workbook it is made from. No reconciliation or export change.
// v2.17.0 (21 Oct 2026, Staff Hub v21.34.0): the result reads at a glance — every checklist line as a square in order (coloured
// by its Check, with its $ effect), filter chips, one money panel, "Needs a look" (where · what · why · $) and one line of
// checks; the review notes, order link, import keys and checklist how-to keep their full text in a "More detail" fold. New
// Check column in POS layout (engine status for order lines; billed-but-not-ordered INV lines are checked the same way
// against the database: CH2 normal W/S less the Ongoing Discounts rule — the AdjCatPrc / Disc % values the row already shows).
// INV rows show their invoiced qty as Adj Qty. The balance badge reads NOTHING TICKED until a line is in the TXT. The export
// guard message shows in the RUN rows' status line instead of the yellow box; a phf:export-made event marks a file as made.
// Totals row: Current and Adjusted each carry their own label and are never cut off; Adj DPrc keeps room for its ↑ ↓ — mark.
// After a refused POSActive export (nothing ticked), ticking a line replaces the message. Matching, the arithmetic for order
// lines, Tick all and every export are unchanged.
// v2.15.0 (20 Oct 2026, Staff Hub v21.31.0): the POSActive guard message (no eligible supplied rows) shows as an on-page,
// dismissible notice (#exportNotice) instead of window.alert — same rule, same text, still no file; shorter visible download
// labels (the ↓ glyph says download; aria-labels keep "Download …"). No reconciliation or export change.
// v2.13.0 (20 Oct 2026, Staff Hub v21.29.0): the run is surfaced as three clickable steps in the new run strip and the
// "Steps & generated files" panel (js/ui/workspace.js) — 1 Check inputs = the existing reference / order gate, 2 Reconcile =
// run() (now exposed on PHFReconcileApp), 3 Export files = the existing download buttons. The reconciliation maths, parsers,
// outputs and filenames are unchanged; setStatus keeps the strip's status-line class.
// v2.11.3 (14 Oct 2026): a search box over the result table hides the rows that do not match (section and total rows stay;
// counts, ticks and downloads are unchanged — it is only what is shown). Esc clears it. Re-applied after every redraw.
// v2.11.0 (12 Oct 2026): Integrity shows REVIEW (amber) when the invoice footer total or line arithmetic did not check out
// (downloads stay available); the browser asks before leaving the page while receiving counts are entered (every Run still
// starts a fresh receiving session, as since v2.6.9); one product billed on several lines of an invoice is one TXT line.
// v2.10.0 (12 Oct 2026): status messages name the shared Ongoing Discounts row (was Supplier + discount rules).
// v2.9.3 (10 Oct 2026): Not on POS order and GST differences sit side by side when both are shown (.pos-check-pair in assets/css/compact-layout.css).
(function(global){
  'use strict';
  const PHF=global.PHFReconcile||{};
  const state={pos:null,invoices:[],result:null,previewView:'pos',docs:[],refs:null,referenceReady:false,posParsed:null,runIntegrity:null,unpackChecked:new Set(),unpackManualChecked:new Set(),unpackKey:null,unpackCounts:new Map(),unpackCountsKey:null,receivingMigratedFrom266:false,orderOverrides:new Map(),importKeys:new Map(),importKeyReviews:new Map(),posSortKey:'__pos_order_index',posSortDir:'asc',posSortExplicit:false,dockOffset:0,adjEdits:new Map(),adjQtyEdits:new Map(),adjUndo:[],colFilters:new Map(),cellSel:null,posRowLookup:new Map()};
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
    {key:'__pos_order_index',label:'POS Index',kind:'number',dp:0,align:'center',cls:'pos-code pos-order-index pos-narrow',min:40,max:60,grow:.005,stretch:.005,hardMax:72},
    {key:'__invoice_line',label:'CH2 Line',kind:'text',align:'center',cls:'pos-code pos-invoice-line pos-narrow',min:38,max:60,grow:.005,stretch:.005,hardMax:72},
    {key:'__check',label:'Check',kind:'status',cls:'pos-check-col',min:86,max:104,grow:.004,hardMax:112},   // v2.17.0
    {key:'main_id',label:'Product #',kind:'text',cls:'pos-code',min:112,max:185,grow:.10,stretch:.11,hardMax:260},
    {key:'__pos_brand',label:'POS Brand',kind:'text',cls:'pos-brand',min:112,max:200,grow:.16,stretch:.18,hardMax:300},
    {key:'plu',label:'POS PLU',kind:'text',cls:'pos-code',min:58,max:96,grow:.05,stretch:.06,hardMax:140},
    {key:'sub_id',label:'POS Sub ID',kind:'text',cls:'pos-code',min:74,max:155,grow:.06,stretch:.08,hardMax:240},
    {key:'__ch2_item_code',label:'CH2 ITEM CODE',kind:'text',cls:'pos-code pos-ch2-item-code',min:78,max:132,grow:.05,stretch:.06,hardMax:180},
    {key:'descr',label:'Product Description',kind:'text',cls:'pos-desc',min:220,max:520,grow:.30,stretch:.38,hardMax:940},
    {key:'gst_tax_pc',label:'GST %',kind:'number',dp:0,cls:'pos-narrow',min:36,max:54,grow:.005},
    {key:'units',label:'Units',kind:'number',dp:0,cls:'pos-narrow',min:34,max:48,grow:.005},
    {key:'qty',label:'Qty',kind:'number',dp:0,cls:'pos-narrow',min:32,max:48,grow:.005},
    {key:'__unpack_add',label:'Add Qty',kind:'qtyinput',cls:'unpack-qty-entry-cell',min:72,max:92,grow:.01,sortable:false},
    {key:'__unpack_total',label:'Found',kind:'qtytotal',cls:'unpack-qty-total-cell',min:56,max:74,grow:.01},
    {key:'mupc',label:'MU%',kind:'number',dp:2,min:44,max:62,grow:.012},
    {key:'gppc',label:'GP%',kind:'number',dp:2,min:44,max:60,grow:.012},
    {key:'__invoice_discount',label:'Disc %',kind:'number',dp:2,min:52,max:76,grow:.012},
    // A zero-width space lets the long POSActive price headings wrap as Adj / RRPrc when the window is narrow.
    {key:'adjrrprce',label:'Adj\u200bRRPrc',kind:'number',dp:2,min:56,max:88,grow:.035,stretch:.03,hardMax:112},
    {key:'adjwsprce',label:'Adj\u200bWSPrc',kind:'number',dp:2,min:56,max:88,grow:.035,stretch:.03,hardMax:112},
    {key:'adjcatprce',label:'Adj\u200bCatPrc',kind:'number',dp:2,min:56,max:88,grow:.03,stretch:.025,hardMax:108},
    {key:'adjdprce',label:'Adj\u200bDPrc',kind:'number',dp:2,min:66,max:88,grow:.035,stretch:.03,hardMax:112},
    {key:'or_qty',label:'Adj Qty',kind:'number',dp:0,cls:'pos-narrow',min:38,max:60,grow:.008},
    {key:'__row_total_inc_gst',label:'Total inc GST',kind:'number',dp:2,cls:'pos-row-total',min:74,max:110,grow:.025,stretch:.02,hardMax:135}
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
  function signedMoney(v){const x=Number(v)||0;return `${x<0?'−':'+'}${money(Math.abs(x))}`;}
  function money(v,dp=2){return v==null||!Number.isFinite(Number(v))?'—':`$${Number(v).toLocaleString(undefined,{minimumFractionDigits:dp,maximumFractionDigits:dp})}`;}
  function qty(v){return v==null?'—':Number(v).toLocaleString(undefined,{maximumFractionDigits:3});}
  function fileRow(file,onRemove){const div=document.createElement('div');div.className='file-row';const label=document.createElement('span');label.textContent=`✓ ${file.name} · ${prettySize(file.size)}`;const btn=document.createElement('button');btn.type='button';btn.textContent='Remove';btn.onclick=onRemove;div.append(label,btn);return div;}
  function setStatus(text,type='info'){els.status.className=`status ${type}`+(els.status.classList.contains('db-what')||els.status.closest('.db-progrow')?' db-what':'');els.status.textContent=text;}   // v2.13.0: keep the run-strip class
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
    // v2.18.0 — prices changed in the checklist: Adj WSPrc → Normal WS, Adj CatPrc / DPrc → Unit Price ex GST.
    const priceBySourceRow={};for(const [src,e] of state.adjEdits)if(e&&(e.ws!=null||e.unit!=null))priceBySourceRow[src]={ws:e.ws??null,unit:e.unit??null};
    return {importKeysBySourceRow:Object.fromEntries(state.importKeys),orderOverrides:Object.fromEntries(state.orderOverrides),autoLinkPosOrder:true,receivingBySourceRow,selectedBySourceRow,uncheckedMeansNotSupplied:true,priceBySourceRow};
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
  // v2.15.0 — on-page notice for export guards (replaces window.alert). Returns false when the notice element is missing.
  // v2.17.0 — the guard message shows once, in the RUN rows' status line (top strip and the row above the checklist); the yellow
  // #exportNotice box is no longer shown. Same rule, same text, still no file.
  function showExportNotice(message){const box=document.querySelector('#exportNotice');if(box)box.classList.add('hidden');
    const text=String(message||'').split(/\n/).map(l=>l.trim()).filter(Boolean).join(' ');if(text)setStatus(text,'warn');
    state.exportRefusedNoRows=/No supplied POSActive rows/i.test(text);return true;}   // cleared below once lines are ticked
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
    const edit=adjEditFor(pos),unit=edit&&edit.unit!=null?edit.unit:numberValue(discountedPosPrice(pos,detail));   // v2.18.0: a changed Adj CatPrc
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
    state.importKeyReviews=new Map(rows.map(x=>[String(x.pos.sourceRow),x.identity]));state.importKeyReviewCount=rows.filter(x=>x.identity&&x.identity.status==='REVIEW').length;
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
      // v2.9.0 — confirmed on a real import (105-0008845): POSActive's invoice import drops % $ " from the Sub ID it reads,
      // so a Sub ID such as “3 PER SKU 25%” can never match the order. Promotion-like text without those characters is fine.
      if(!special.length)continue;
      const line=invoiceLineDisplay(detail)||'?',ch2=ch2ItemCodeDisplay(detail)||'not resolved',product=cleanText(pos&&pos.description)||cleanText(pos&&pos.barcode)||'product';
      notes.push(`POSACTIVE CANNOT MATCH — CH2 line ${line} · POS row ${i+1} (${product}): POS Sub ID “${sub}” contains ${special.map(x=>`“${x}”`).join(', ')}. POSActive's invoice import drops ${special.length===1?'this character':'these characters'}, reads it as “${sub.replace(/["$%]/g,'').trim()}” and reports “Invoice items do not match suppliers order items”, leaving this line unapplied. Change the Sub ID in POSActive to one without ${special.join(' ')} (e.g. CH2 code ${ch2}), re-export the order and run again — or apply this line by hand.`);
    }
    // v2.9.1 — invoiced rows that share one Sub ID (e.g. "SPECIAL ORDER") or have none: POSActive matches lines by Sub ID only.
    const byKey=new Map(),blank=[];
    for(let i=0;i<rows.length;i++){
      const pos=rows[i],detail=details.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||posDetailAt(i);
      if(!detail||Number(detail.suppliedQty||0)<=0)continue;
      const raw=typeof (pos&&pos.subIdRaw)==='string'?pos.subIdRaw:cleanText(pos&&pos.subId),item=`POS ${i+1} ${cleanText(pos&&pos.description)} (CH2 line ${invoiceLineDisplay(detail)||'?'})`;
      if(!String(raw).trim()){blank.push(item);continue;}
      if(!byKey.has(raw))byKey.set(raw,[]);byKey.get(raw).push(item);
    }
    for(const [key,items] of byKey)if(items.length>1)notes.push(`SHARED SUB ID — “${key}” is the Sub ID of ${items.length} invoiced products: ${items.join('; ')}. POSActive matches invoice lines by Sub ID only, so all of them land on the first of these rows and the others stay unreceived. Give each product its own Sub ID in POSActive (e.g. its CH2 code) and re-export the order, or correct these rows by hand after importing.`);
    if(blank.length)notes.push(`BLANK SUB ID — ${blank.length} invoiced product${blank.length===1?' has':'s have'} no Sub ID on the POS order: ${blank.join('; ')}. POSActive cannot match ${blank.length===1?'it':'them'}, so ${blank.length===1?'it is':'they are'} not applied. Set a Sub ID in POSActive (e.g. the CH2 code) and re-export the order.`);
    return notes;
  }
  const SUB_ID_REVIEW_DISABLED=false;
  // v2.17.0 — one Check per checklist line. POS-order lines use the reconcile engine's own status (r.detail). A billed line that
  // is not on the POS order (INV) is checked the same way against the database: its CH2 unit price vs the CH2 normal W/S less
  // the Ongoing Discounts rule for the order's supplier (discountedPosPrice / expectedDiscountForPos — the AdjCatPrc and Disc %
  // the row already shows), with the engine's tolerance and DISCOUNT LOW rule. Display and summary only — nothing exported.
  const CHECK_TOL=0.03;
  const CHECK_META={short:{label:'SHORT',rank:1},over:{label:'OVER',rank:1},high:{label:'PRICE HIGH',rank:2},disc:{label:'DISCOUNT LOW',rank:3},notinv:{label:'NOT INVOICED',rank:4},ws:{label:'WHOLESALE',rank:5},nocheck:{label:'NO CHECK',rank:6},better:{label:'BETTER PRICE',rank:8},ok:{label:'OK',rank:9}};
  let lineCheckCache={result:null,refs:null,map:new Map()};
  // v2.20.0 — the Check as the run found it (cached) …
  function lineCheckBase(pos,detail){
    if(lineCheckCache.result!==state.result||lineCheckCache.refs!==state.refs)lineCheckCache={result:state.result,refs:state.refs,map:new Map()};
    const key=String(pos&&pos.sourceRow!=null?pos.sourceRow:'');if(key&&lineCheckCache.map.has(key))return lineCheckCache.map.get(key);
    const ck=pos&&pos.invoiceOnly?invoiceOnlyCheck(pos,detail):posLineCheck(pos,detail);
    if(key)lineCheckCache.map.set(key,ck);return ck;
  }
  // … and as it stands now: a count that differs from the billed quantity is SHORT / OVER, and a changed Adj CatPrc / DPrc is
  // checked against the expected price (PRICE HIGH / BETTER PRICE / OK, $ effect on the received or billed quantity).
  // Display only — the exports use lineCheckBase where they use a Check at all.
  function lineCheck(pos,detail){
    const base=lineCheckBase(pos,detail);if(!pos||base.kind==='notinv')return base;
    const key=unpackIdentity(pos),edit=adjEditFor(pos),billed=numberValue(detail&&detail.suppliedQty),got=state.unpackCounts.has(key)?unpackCountFor(pos):null;
    const unit=edit&&edit.unit!=null?Number(edit.unit):null,qtyOff=got!=null&&billed!=null&&Math.abs(got-billed)>.0005;
    if(unit==null&&!qtyOff)return base;
    let kind=base.kind,statuses=base.statuses.slice(),effect=base.effect,actual=base.actual;const notes=[];
    if(unit!=null&&base.expected!=null){
      actual=unit;const diff=Math.round((unit-base.expected)*10000)/10000,q=got!=null?got:(billed||0);
      kind=diff>CHECK_TOL?'high':diff<-CHECK_TOL?'better':'ok';effect=kind==='ok'?0:Math.round(diff*q*100)/100;
      statuses=[kind==='high'?'PRICE HIGH':kind==='better'?'BETTER PRICE':'OK'];
    }else if(qtyOff&&base.qty>0&&effect)effect=Math.round(effect/base.qty*got*100)/100;   // the $ on what was received
    if(qtyOff){kind=got>billed?'over':'short';statuses=[got>billed?'OVER':'SHORT',...statuses.filter(x=>x!=='OK')];notes.push(`received ${displayUnpackCount(got)} of ${displayUnpackCount(billed)} billed`);}
    const r=checkResult(kind,statuses,{qty:got!=null?got:base.qty,ordered:base.ordered,variance:base.variance,effect,expected:base.expected,actual,live:true});
    if(unit!=null)r.title=r.title.replace(' · invoiced $',' · your price $');
    if(notes.length)r.title=`${r.title} · ${notes.join(' · ')}`;return r;
  }
  function checkResult(kind,statuses,o){
    const m=CHECK_META[kind]||CHECK_META.nocheck,parts=[statuses.join(' + ')];
    if(o.expected!=null&&o.actual!=null)parts.push(`expected $${o.expected.toFixed(2)} · invoiced $${o.actual.toFixed(2)} each`);
    if(o.effect)parts.push(`${o.effect>0?'+':'−'}$${Math.abs(o.effect).toFixed(2)} on ${displayUnpackCount(o.qty)} unit${o.qty===1?'':'s'}`);
    return Object.assign({kind,label:m.label,rank:m.rank,statuses,title:parts.join(' · ')},o);
  }
  function posLineCheck(pos,detail){
    if(!detail)return checkResult('nocheck',['NO CHECK'],{qty:0,ordered:0,variance:null,effect:0,expected:null,actual:null});
    const s=String(detail.status||''),has=k=>s.indexOf(k)>=0,qty=numberValue(detail.suppliedQty)||0,v=numberValue(detail.unitVariance);
    const kind=has('NOT INVOICED')?'notinv':has('SHORT SUPPLIED')?'short':has('OVER SUPPLIED')?'over':has('PRICE HIGH')?'high':has('DISCOUNT LOW')?'disc':has('WHOLESALE')?'ws':has('BETTER PRICE')?'better':has('REVIEW')?'nocheck':'ok';
    const effect=has('PRICE HIGH')?(numberValue(detail.missedTotal)||0):kind==='better'&&v!=null?Math.round(v*qty*100)/100:0;
    return checkResult(kind,s?s.split(' + '):['OK'],{qty,ordered:numberValue(detail.orderedQty)||0,variance:v,effect,expected:numberValue(detail.expectedUnit),actual:numberValue(detail.actualUnit)});
  }
  function invoiceOnlyCheck(pos,detail){
    const qty=numberValue(detail&&detail.suppliedQty)||0,exp=numberValue(discountedPosPrice(pos,detail)),act=numberValue(detail&&detail.actualUnit);
    const expDisc=expectedDiscountForPos(pos,detail),actDisc=weightedInvoiceValue(detail,'discountPct');
    if(exp==null||act==null)return checkResult('nocheck',['NO CHECK — no CH2 normal W/S or unit price'],{qty,ordered:0,variance:null,effect:0,expected:exp,actual:act});
    const v=Math.round((act-exp)*10000)/10000,st=[];
    if(v>CHECK_TOL){st.push('PRICE HIGH');if(actDisc!=null&&expDisc!=null&&actDisc+0.05<expDisc)st.push('DISCOUNT LOW');}
    if(!st.length)st.push(v< -CHECK_TOL?'BETTER PRICE':'OK');
    const kind=st[0]==='PRICE HIGH'?'high':st[0]==='BETTER PRICE'?'better':'ok',effect=kind==='high'||kind==='better'?Math.round(v*qty*100)/100:0;
    return checkResult(kind,st,{qty,ordered:0,variance:v,effect,expected:exp,actual:act,expDisc,actDisc});
  }
  function posColumnValue(pos,c,detail=null,orig=false){
    if(!pos||!c)return '';
    if(!orig&&ADJ_EDIT_KEYS.has(c.key)){   // v2.18.0: a value changed in the checklist (orig = the value before the change)
      if(c.key==='or_qty'){if(adjCellEdited(pos,'or_qty'))return unpackCountFor(pos);}
      else{const e=adjEditFor(pos);if(e&&c.key==='adjwsprce'&&e.ws!=null)return e.ws;if(e&&c.key!=='adjwsprce'&&e.unit!=null)return e.unit;}
    }
    if(c.key==='__check')return lineCheck(pos,detail).label;   // v2.17.0
    if(c.key==='or_qty'&&pos.invoiceOnly){const q=numberValue(detail&&detail.suppliedQty);return q!=null?q:rawValue(pos,'or_qty');}   // v2.17.0: invoiced qty
    if(c.key==='__import_sub_id')return importIdentityFor(pos,detail).importSubId;
    if(c.key==='__pos_order_index')return pos.invoiceOnly?'INV':(Number(pos.posIndex||0)||'');
    if(c.key==='__invoice_line')return invoiceLineDisplay(detail)||(isNotInvoiced(pos,detail)?'—':'');
    if(c.key==='__ch2_item_code')return ch2ItemCodeDisplay(detail)||(isNotInvoiced(pos,detail)?masterCh2Code(pos):'');   // v2.19.0: not invoiced → the POS master's CH2 code
    if(c.key==='__row_total_inc_gst')return posRowTotalIncGst(pos,detail);
    if(c.key==='__pos_brand')return String((posReferenceRecord(pos).POS_BRAND)||'');
    if(c.key==='__expected_discount')return expectedDiscountForPos(pos,detail);
    if(c.key==='__invoice_discount'){const v=weightedInvoiceValue(detail,'discountPct');return v==null&&isNotInvoiced(pos,detail)?expectedDiscountForPos(pos,detail):v;}   // v2.19.0: not invoiced → the Ongoing Discounts rule
    if(c.key==='main_id')return pos.barcode??'';
    if(c.key==='plu')return pos.plu??'';
    if(c.key==='sub_id'){
      // v2.6.33 — POS Sub ID shows exactly what the POSActive TXT sends: the order's own Sub ID
      // as stored (blank stays blank). Invoice-only rows show the POS-master key they will use.
      if(pos.invoiceOnly){const id=importIdentityFor(pos,detail);return (id&&id.importSubId)||'';}
      if(typeof pos.subIdRaw==='string')return pos.subIdRaw;
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
  // v2.19.0 — a POS-order line CH2 did not invoice (Check NOT INVOICED). It has its own section at the top of the checklist.
  function isNotInvoiced(pos,detail){return !!pos&&!pos.invoiceOnly&&lineCheckBase(pos,detail).kind==='notinv';}
  function masterCh2Code(pos){
    try{const recs=PHF.posImport&&typeof PHF.posImport.masterRecordsForPos==='function'?PHF.posImport.masterRecordsForPos(pos,state.refs):[];
      const codes=[...new Set(recs.map(r=>String(r&&r.MASTER_CODE!=null?r.MASTER_CODE:'').replace(/\.0+$/,'').replace(/\D+/g,'')).filter(Boolean))];return codes.join(', ');}
    catch(_){return '';}
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
    let adjusted=null,adjustedEx=null,adjustedGst=null,supplierInvoiceTotal=null,records=[],matchCheck=null,posActive=null;
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
          posActive=built.files[0]&&built.files[0].posActive||null;
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
    const priced=records.filter(r=>r&&r.priceEdited),priceEditEffect=Math.round(priced.reduce((a,r)=>a+((numberValue(r.total)||0)-(numberValue(r.atInvoice&&r.atInvoice.total)||0)),0)*100)/100;   // v2.18.0
    return {priceEditCount:priced.length,priceEditEffect,includedRows:records.length,posActive,current,matchedCurrent,adjusted,adjustedEx,adjustedGst,supplierInvoiceTotal,invoiceOnlyCount:invoiceOnlyRows.length,invoiceOnlyTotal,invoiceOnlyReceivedCount:receivedInvoiceOnly.length,invoiceOnlyReceivedTotal,matchCheck,
      invoiceOnlyAll:invoiceOnlyEntries().map(e=>({line:e.inv&&e.inv.invoiceLine,invoiceNumber:e.inv&&e.inv.invoiceNumber,description:cleanText(e.pos&&e.pos.description)||cleanText(e.inv&&e.inv.description),total:numberValue(e.inv&&e.inv.totalIncGst)||0,ticked:receivedInvoiceOnlyKeys.has(String(e.pos&&e.pos.sourceRow)),qty:numberValue(e.inv&&e.inv.qtySupplied),code:cleanText(e.inv&&e.inv.productCode),subId:(()=>{const id=importIdentityFor(e.pos,e.detail);return id?id.importSubId:'';})(),diagnosis:e.pos&&e.pos.orderDiagnosis||null,tickAll:tickAllCovers(e.pos),supplierNote:e.pos&&e.pos.supplierMismatch?`set to ${e.pos.posSupplierLabel} in POSActive; this order is ${e.pos.orderSupplierLabel}`:(e.pos&&!e.pos.inMaster?'not in POS master':'')})),notInvoicedCount,notInvoicedTotal,manualCount:manualRecords.length,manualTotal,recordCount:records.length};
  }

  function updateSummaryTxt(totals){   // v2.19.0
    const v=document.querySelector('#rsGlance [data-sum-txt]'),n=document.querySelector('#rsGlance [data-sum-txt-note]');if(!v||!totals)return;
    v.textContent=money(totals.includedRows?totals.adjusted:0);if(n)n.textContent=totals.includedRows?`${totals.includedRows} line${totals.includedRows===1?'':'s'} in the TXT`:'fills in as you tick';
  }
  // v2.21.0 — the footer's totals (inc GST): Current (the POS order at current prices) · Adjusted (the POSActive TXT, against the
  // supplier invoice) · Not invoiced (ordered, not billed, not counted — at the ordered value) · Combined (Adjusted + Not invoiced,
  // against Current). The footer sticks to the bottom of the window, so these stay in view while the checklist scrolls.
  function posTotalsBlock(T,span){
    const adj=Number(T.adjusted)||0,ni=Number(T.notInvoicedTotal)||0,comb=Math.round((adj+ni)*100)/100,inv=T.supplierInvoiceTotal,cur=Number(T.current)||0;
    const dInv=inv!=null?Math.round((adj-inv)*100)/100:null,dCur=Math.round((comb-cur)*100)/100,n=Number(T.notInvoicedCount)||0;
    const adjNote=!T.includedRows?(inv!=null?`invoice ${money(inv)}`:'nothing ticked'):dInv!=null&&Math.abs(dInv)<0.005?'matches invoice ✓':dInv!=null?`${signedMoney(dInv)} vs invoice`:'';
    const tot=(cls,label,value,note,title)=>`<span class="pos-tot ${cls}" title="${escapeHtml(title)}"><small>${label}</small><b>${escapeHtml(value)}</b><i>${escapeHtml(note)}</i></span>`;
    const combTitle=`Adjusted ${money(adj)} + not invoiced ${money(ni)} = ${money(comb)}; current ${money(cur)}${T.invoiceOnlyReceivedTotal?` · includes ${money(T.invoiceOnlyReceivedTotal)} billed but not on the POS order (ticked)`:''}${T.invoiceOnlyCount?` · ${money(T.invoiceOnlyTotal)} billed but not on the POS order is not ticked, so not included`:''}`;
    return `<td colspan="${span}" class="pos-total-block"><div class="pos-totals"><span class="pos-totals-label">inc GST</span>${tot('cur','Current',money(cur),'POS order','The POS order at current prices — every ordered line, inc GST')}${tot('adj','Adjusted',money(adj),adjNote,`The POSActive TXT as it stands: ${money(T.adjustedEx)} ex GST + ${money(T.adjustedGst)} GST${inv!=null?` · supplier invoice ${money(inv)}`:''}`)}${tot('ni','Not invoiced',money(ni),`${n} line${n===1?'':'s'}`,'Ordered but not billed by CH2 and not counted — at the ordered value')}${tot('comb','Combined',money(comb),`${signedMoney(dCur)} vs current`,combTitle)}</div></td>`;
  }
  function renderPosBalance(totals){
    const box=els.posBalancePanel;if(!box)return;updateSummaryTxt(totals);
    if(!totals){box.classList.add('hidden');box.innerHTML='';return;}
    state.lastTotals=totals;const idle=!totals.includedRows;
    if(state.exportRefusedNoRows&&!idle){state.exportRefusedNoRows=false;setStatus(`${totals.includedRows} line${totals.includedRows===1?'':'s'} in the POSActive import — POSActive Import.txt can now be downloaded.`,'info');}   // v2.17.0: nothing in the TXT yet → NOTHING TICKED, not a green FILE BALANCES
    const exportBalances=totals.adjusted!=null&&totals.adjustedEx!=null&&totals.adjustedGst!=null&&Math.abs((totals.adjustedEx+totals.adjustedGst)-totals.adjusted)<=.02;
    const cautions=[];
    // v2.18.0 — prices changed in the checklist are in the TXT, so its total differs from the invoice by their effect.
    if(totals.priceEditCount)cautions.push(`${totals.priceEditCount} line${totals.priceEditCount===1?' in the TXT carries a price':'s in the TXT carry prices'} changed in the checklist (orange): ${signedMoney(totals.priceEditEffect)} inc GST against the invoice prices for the same quantities. That is part of the difference to the supplier invoice total. Ctrl + Z or Clear changes puts the invoice prices back.`);
    if(totals.invoiceOnlyCount)cautions.push(`${totals.invoiceOnlyCount} billed invoice-only product${totals.invoiceOnlyCount===1?' is':'s are'} not on the POS order and not ticked, so ${totals.invoiceOnlyCount===1?'it is':'they are'} omitted from the POSActive import (${money(totals.invoiceOnlyTotal)} inc GST). Tick the INV rows in POS Layout to include them — this is the difference to the supplier invoice total. See “Not on POS order” above for why each one was not matched.`);
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
    // v2.6.34 — not-on-POS-order check: which billed products are not on the uploaded POS order,
    // why, and what to do. Generic for every product; nothing here is item-specific.
    const pf=state.posParsed||{},pfRows=((pf.rows)||[]).length,pfName=cleanText(pf.sourceFile)||cleanText(state.pos&&state.pos.name)||'uploaded order file';
    const supLabel=(invoiceOnlyEntries().map(e=>e.pos&&e.pos.orderSupplierLabel).find(Boolean))||'';
    const orderFileBlock=io.length?`<div class="pos-orderfile-check"><div class="pos-orderfile-head"><strong>Not on POS order</strong><span>${escapeHtml(pfName)} · ${pfRows} product row${pfRows===1?'':'s'}${pf.orderNumber?` · order ${escapeHtml(pf.orderNumber)}`:''}${supLabel?` · ${escapeHtml(supLabel)}`:''}</span></div><p>${io.length} billed product${io.length===1?' is':'s are'} <b>not on the POS order</b>, so ${io.length===1?'it is':'they are'} held in the <b>Invoiced · not on POS order</b> section at the top of POS Layout (POS Index <b>INV</b>) and excluded from the POSActive TXT unless ticked. For each invoice line the app checks every POS PLU and barcode linked to its CH2 code, and the CH2 code as a Sub ID, against the uploaded order. If a product below should be on this order, add it in POSActive, export the order again and re-run — it will then match normally with its exact order Sub ID.</p><div class="pos-orderfile-list">${io.map(x=>`<div class="pos-orderfile-item"><b>Line ${escapeHtml(x.line)} · ${escapeHtml(x.description)}</b><span class="pos-orderfile-meta">CH2 ${escapeHtml(x.code||'?')} · qty ${escapeHtml(x.qty??'')} · ${money(x.total)} · TXT Sub ID “${escapeHtml(x.subId||'')}” · ${x.ticked?'<b>ticked — included in TXT</b>':x.tickAll?'on the order — Tick all includes it':'excluded from TXT (tick to include)'}</span><span class="pos-orderfile-reason">${escapeHtml(x.diagnosis?x.diagnosis.chip:'NOT ON POS ORDER')}</span><small>${escapeHtml(x.diagnosis?x.diagnosis.detail:'')}</small></div>`).join('')}</div></div>`:'';
    const mc=totals.matchCheck,matchBlock=mc&&mc.total?`<div class="pos-match-check ${mc.mismatches.length?'bad':'good'}"><div class="pos-match-head"><strong>POSActive match check</strong><span>${mc.matched} of ${mc.total} TXT line${mc.total===1?'':'s'} match a Sub ID on POS order ${escapeHtml(mc.orderNumber||'')}${mc.mismatches.length?` · POSActive will report ${mc.mismatches.length} as “Invoice items do not match suppliers order items”`:' · no POSActive matching warning expected'}</span></div>${mc.mismatches.length?`<div class="pos-match-list">${mc.mismatches.map(m=>`<div class="pos-match-item"><b>Line ${escapeHtml(m.line)} · ${escapeHtml(m.posDescription||m.description)}</b><span class="pos-match-key">Sub ID ${escapeHtml(m.subId||'(blank)')}</span><span class="pos-match-reason">${escapeHtml(m.reason)}</span><small>${escapeHtml(m.advice)}</small></div>`).join('')}</div>`:''}</div>`:'';
    // v2.9.0 — GST differences between the CH2 invoice and the product's POSActive GST setting.
    const gr=gstReview().list,grEffect=gr.reduce((a,g)=>a+g.effect,0);
    const gstBlock=gr.length?`<div class="pos-gst-check"><div class="pos-gst-head"><strong>GST differences</strong><span>${gr.length} product${gr.length===1?'':'s'} · CH2 invoice GST ≠ POSActive GST setting · ${signedMoney(grEffect)} in POSActive's total</span></div><p>CH2 charged a different GST rate from the product's GST % in POSActive. The TXT keeps CH2's figures, but POSActive costs and totals each product with its own GST setting, so its adjusted total will not equal the invoice by this amount. These rows show <b>INV</b> and the invoice rate in the GST % column. If CH2 is right, change the product's GST in POSActive; if POSActive is right, ask CH2 for a corrected invoice.</p><div class="pos-gst-list">${gr.map(g=>`<div class="pos-gst-item"><b>${g.posIndex==='INV'?'INV':`POS ${escapeHtml(g.posIndex)}`} · ${escapeHtml(g.description)}</b><span class="pos-gst-meta">CH2 line ${escapeHtml(g.lines)} · ${escapeHtml(g.codes)} · ${money(g.ext)} ex GST</span><span class="pos-gst-rates">Invoice ${escapeHtml(g.invRate)}% (${money(g.gst)}) · POSActive ${escapeHtml(g.posRate)}%</span><small>${signedMoney(g.effect)} in POSActive's total</small></div>`).join('')}</div></div>`:'';
    // v2.9.0 — what POSActive will show in the order's Current / Adjusted Total after the import, and why it differs from
    // the invoice (lines POSActive cannot match, GST settings, cost rounding to cents).
    const pa=totals.posActive,paBlock=pa&&pa.txtTotal?`<div class="pos-posactive-predict"><div class="pos-predict-head"><strong>POSActive after import (predicted)</strong><span>The order's Current / Adjusted Total once this TXT is applied</span></div><div class="pos-predict-grid"><div class="pos-predict-card current"><span>Current Total</span><strong>${money(pa.current)}</strong><small>Old costs × order qty, matched rows</small></div><div class="pos-predict-card adjusted"><span>Adjusted Total</span><strong>${money(pa.adjusted)}</strong><small>New costs × imported qty</small></div><div class="pos-predict-eq"><b>${money(pa.txtTotal)} TXT</b>${pa.unmatchedLines?` − ${money(pa.unmatchedTotal)} not applied (${pa.unmatchedLines} line${pa.unmatchedLines===1?'':'s'} POSActive cannot match — see the match check)`:''}${Math.abs(pa.gstEffect)>0.004?` ${pa.gstEffect>=0?'+':'−'} ${money(Math.abs(pa.gstEffect))} GST settings (see GST differences)`:''}${Math.abs(pa.sharedEffect||0)>0.004?` ${pa.sharedEffect>=0?'+':'−'} ${money(Math.abs(pa.sharedEffect))} shared Sub ID${(pa.sharedKeys||[]).length===1?'':'s'} (${(pa.sharedKeys||[]).map(k=>`“${escapeHtml(k.subId)}” × ${k.lines.length}`).join(', ')})`:''}${Math.abs(pa.rounding)>0.004?` ${pa.rounding>=0?'+':'−'} ${money(Math.abs(pa.rounding))} cost rounding to cents`:''} = <b>${money(pa.adjusted)}</b><small>POSActive applies only Sub IDs it can match, sets each cost to Extended ÷ Qty rounded to the cent and totals with the product's own GST %.</small></div></div>${(pa.sharedKeys||[]).map(k=>`<div class="pos-predict-shared"><b>Shared Sub ID “${escapeHtml(k.subId)}” — ${k.lines.length} invoice lines, one POSActive row</b><span>POSActive matches by Sub ID only, so every line below lands on the first order row with “${escapeHtml(k.subId)}” (POS ${escapeHtml(k.appliedTo.posIndex)} ${escapeHtml(k.appliedTo.description)}). The last one — line ${escapeHtml(k.kept.line)} ${escapeHtml(k.kept.description)}, qty ${escapeHtml(k.kept.qty)} — is what that row keeps; the other rows stay unreceived (${signedMoney(k.effect)}). Give each product its own Sub ID in POSActive (e.g. its CH2 code), re-export the order and run again, or fix these rows by hand after importing.</span><small>${k.lines.map(x=>`line ${escapeHtml(x.line)} · POS ${escapeHtml(x.posIndex)} ${escapeHtml(x.description)} · qty ${escapeHtml(x.qty)} · ${money(x.total)}`).join(' &nbsp;|&nbsp; ')}</small></div>`).join('')}</div>`:'';
    box.innerHTML=`${orderFileBlock&&gstBlock?`<div class="pos-check-pair">${orderFileBlock}${gstBlock}</div>`:orderFileBlock+gstBlock}<div class="pos-balance-heading"><div><strong>POSActive balancing check</strong><span>${idle?'Fills in from the POSActive TXT as you tick lines.':'These figures come from the exact TXT payload currently ready to download.'}</span></div><span class="pos-balance-status ${idle?'idle':exportBalances?'pass':'review'}">${idle?'NOTHING TICKED':exportBalances?'FILE BALANCES':'REVIEW'}</span></div><div class="pos-balance-grid">${[
      card('POSActive import total (TXT)',money(totals.adjusted),'Invoice Total shown on POSActive’s Apply Invoice screen','primary'),
      card('CP Inc GST off',money(totals.adjustedEx),'Expected ex-GST footer'),
      card('GST in import',money(totals.adjustedGst),'Included in expected total'),
      card('Same imported rows—old prices',money(totals.matchedCurrent),'Current POS prices and import quantities'),
      card('Full current POS order',money(totals.current),'Every ordered row, inc GST'),
      card('Supplier invoice total',money(totals.supplierInvoiceTotal),'Before invoice-only omissions or receiving changes')
    ].join('')}</div><div class="pos-balance-equation"><strong>${money(totals.adjustedEx)} ex GST + ${money(totals.adjustedGst)} GST = ${money(totals.adjusted)} in the TXT</strong><span>Compare like-for-like: same order, same included rows and the same CP Inc GST setting.</span></div>${paBlock}${invoiceEquation}${matchBlock}${cautions.length?`<div class="pos-balance-cautions">${cautions.map(x=>`<span>${escapeHtml(x)}</span>`).join('')}</div>`:''}`;
  }

  // v2.9.0 — GST review: products whose CH2 invoice GST differs from the product's GST % in POSActive. POSActive totals
  // with its own setting, so these lines make POSActive's adjusted total differ from the invoice. Cached per result.
  let gstReviewCache={result:null,map:new Map(),list:[]};
  function gstReview(){
    if(gstReviewCache.result===state.result)return gstReviewCache;
    const map=new Map(),list=[],details=posDetailMap();
    const add=(pos,detail)=>{
      const inv=(detail&&detail.invoiceRows)||[];if(!pos||!inv.length||map.has(String(pos.sourceRow)))return;   // v2.19.0: an INV line was listed twice (sortedPosRows already has it)
      const ext=inv.reduce((a,r)=>a+(numberValue(r.extendedExGst)||0),0),gst=inv.reduce((a,r)=>a+(numberValue(r.gstAmount)||0),0);if(!(ext>0))return;
      const posRate=numberValue(rawValue(pos,'gst_tax_pc'))??numberValue(pos.gstPct);if(posRate==null)return;
      const invRate=Math.round(gst/ext*1000)/10;if(Math.abs(invRate-posRate)<0.5)return;
      const item={sourceRow:String(pos.sourceRow),posIndex:pos.invoiceOnly?'INV':pos.posIndex,description:cleanText(pos.description)||cleanText(inv[0]&&inv[0].description),invoiceDescription:cleanText(inv[0]&&inv[0].description),
        lines:inv.map(r=>cleanText(r.invoiceLine)).filter(Boolean).join(', '),codes:[...new Set(inv.map(r=>cleanText(r.productCode)).filter(Boolean))].join(', '),posRate,invRate,ext:Math.round(ext*100)/100,gst:Math.round(gst*100)/100,
        effect:Math.round((ext*posRate/100-gst)*100)/100,invoiceOnly:!!pos.invoiceOnly};
      map.set(item.sourceRow,item);list.push(item);
    };
    for(const pos of sortedPosRows())add(pos,details.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:'')));
    for(const e of invoiceOnlyEntries())add(e.pos,e.detail);
    gstReviewCache={result:state.result,map,list};return gstReviewCache;
  }
  function gstReviewText(g){return `CH2 invoice line ${g.lines} charged ${g.invRate}% GST (${money(g.gst)} on ${money(g.ext)} ex GST) but this product is set to ${g.posRate}% GST in POSActive. POSActive totals with its own setting, so this line counts ${signedMoney(g.effect)} against the invoice. If CH2 is right, change the product's GST in POSActive; if POSActive is right, ask CH2 for a corrected invoice.`;}

  // v2.6.30 — billed invoice lines that are not on the POS order are appended to POS
  // Layout as receivable rows (cached per reconciliation result).
  let invoiceOnlyCache={result:null,entries:[]};
  function invChipText(pos){const c=pos&&pos.orderDiagnosis&&pos.orderDiagnosis.code;return c==='ON_ORDER_ALREADY_MATCHED'?'ROW ALREADY MATCHED':c==='ON_ORDER_NOT_LINKED'?'ON ORDER · NOT LINKED':'NOT ON POS ORDER';}
  // v2.6.35 — Tick all covers the POS-order rows only. Billed products that are not on the POS
  // order (INV rows) stay unticked and excluded from the POSActive TXT until deliberately ticked.
  // The one exception is an INV line for a product whose row IS on the order (already matched to
  // another invoice line) — that product is on the order, so Tick all includes it.
  // v2.22.0: nor a not-invoiced POS line — a tick there means it arrived, so it is a deliberate tick (or Add Qty 0), like INV.
  function tickAllCovers(pos){
    if(pos&&pos.invoiceOnly)return !!(pos.orderDiagnosis&&pos.orderDiagnosis.orderRow);
    const k=posSrcKey(pos),look=state.posRowLookup&&state.posRowLookup.get(k);return !isNotInvoiced(pos,look?look.detail:posDetailMap().get(k));
  }
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
  // v2.17.1 — CLEAR FILES deletes the saved receiving ticks and Found quantities of every order in this tab, not only the
  // current one (they are written per order number and were left behind for earlier orders).
  function clearAllStoredReceivingState(){
    try{const drop=[];for(let i=0;i<sessionStorage.length;i++){const k=sessionStorage.key(i);if(k&&/^phf-ch2-unpack(qty)?(-v\d+)?:/.test(k))drop.push(k);}drop.forEach(k=>sessionStorage.removeItem(k));}catch(err){console.warn('Could not clear the receiving session',err);}
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
    state.adjEdits=new Map();state.adjQtyEdits=new Map();state.adjUndo=[];state.cellSel=null;state.colFilters=new Map();   // v2.18.0
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
    // The physical receiving target is what CH2 says it supplied, while a short supply expects the supplier quantity rather
    // than the original ordered quantity. v2.22.0: a POS-order line CH2 did not invoice expects what was ordered — ticking it
    // means it arrived (it goes into the TXT as a manual line); Add Qty 0 marks it not supplied.
    if(isNotInvoiced(pos,detail)){const o=numberValue(detail&&detail.orderedQty)??numberValue(rawValue(pos,'qty'))??numberValue(pos&&pos.orderedQty);return Math.max(0,o||0);}
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
  // v2.20.0 — exact or over completes a row (it moves down after the usual short pause); only a short count stays in Remaining.
  function receivingCountComplete(found,expected){const f=Number(found),e=Number(expected);return Number.isFinite(f)&&Number.isFinite(e)&&f>=e-.0005;}
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
    const complete=manual||explicitZero||receivingCountComplete(found,expected);
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
    // v2.6.38 — billed products that are not on the POS order (INV rows) are held in their own
    // section above Remaining, ticked or not, so they always stay visibly separate.
    const base=sortedPosRows(),remaining=[],complete=[],notOnOrder=[],notInvoiced=[],fix=[];
    for(let i=0;i<base.length;i++){
      const pos=base[i],detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||posDetailAt(i);
      if(pos&&pos.invoiceOnly){notOnOrder.push(pos);continue;}
      if(isNotInvoiced(pos,detail)){notInvoiced.push(pos);continue;}   // v2.19.0: held in their own section, ticked or not
      (unpackRowComplete(pos,detail)?complete:remaining).push(pos);
    }
    const completeKeys=new Set(complete.map(unpackIdentity));
    for(const key of [...completionStamps.keys()])if(!completeKeys.has(key))completionStamps.delete(key);
    let stamp=0;for(const key of completeKeys)if(!completionStamps.has(key)){if(!stamp)stamp=++completionStamp;completionStamps.set(key,stamp);}
    let completeSorted=sortPosPreviewRows(complete,detailBySourceRow);
    if(!state.posSortExplicit)completeSorted=completeSorted.slice().sort((a,b)=>(completionStamps.get(unpackIdentity(b))||0)-(completionStamps.get(unpackIdentity(a))||0)||((Number(a&&a.posIndex)||0)-(Number(b&&b.posIndex)||0)));
    return {fix:sortPosPreviewRows(fix,detailBySourceRow),notOnOrder:sortPosPreviewRows(notOnOrder,detailBySourceRow),notInvoiced:sortPosPreviewRows(notInvoiced,detailBySourceRow),remaining:sortPosPreviewRows(remaining,detailBySourceRow),complete:completeSorted};
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
        complete=manual||receivingCountComplete(total,expected);
        if(complete)state.unpackChecked.add(key);else state.unpackChecked.delete(key);
        saveUnpackChecklist();
      }
    }
    input.value='';
    const tr=input.closest('tr'),out=tr&&tr.querySelector('.unpack-qty-total');
    if(out&&total!=null)updateUnpackTotalElement(out,key,total,expected);
    updateRowSelectionVisual(tr,complete);if(total!=null)updateManualReceivedVisual(tr,total);
    {const look=tr&&state.posRowLookup.get(tr.dataset.posSrc||'');if(look)refreshCheckCell(tr,look.pos,look.detail);}   // v2.20.0
    refreshLiveTotals();   // v2.22.0
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
    const complete=manual||explicitZero||receivingCountComplete(total,expected);
    if(complete)state.unpackChecked.add(key);else state.unpackChecked.delete(key);
    saveUnpackChecklist();updateUnpackTotalElement(input,key,total,expected);
    updateRowSelectionVisual(input.closest('tr'),complete);updateManualReceivedVisual(input.closest('tr'),total);
    {const tr=input.closest('tr'),look=tr&&state.posRowLookup.get(tr.dataset.posSrc||'');if(look)refreshCheckCell(tr,look.pos,look.detail);}   // v2.20.0
    refreshLiveTotals();   // v2.22.0
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
      if(cellEditor&&!cellEditor.done){scheduleReceivingRender(delay);return;}   // v2.18.0: wait until the cell being typed in is done
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
    if(tr.dataset.ni==='1'){tr.classList.toggle('pos-manual-received',received);if(received)tr.dataset.manualReceived='1';else delete tr.dataset.manualReceived;return;}   // v2.19.0
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
    if(c.kind==='status')return lineCheck(pos,detail).label;
    const v=posColumnValue(pos,c,detail);
    if(c.kind==='bool')return boolValue(v)?'✓':'';
    if(c.kind==='number'){
      let text=fixed(v,posCellDp(pos,c,v));
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
    const narrowFont=`${headStyle.fontWeight} 11px ${headStyle.fontFamily}`,isNarrow=c=>/\bpos-narrow\b/.test(c.cls||'');
    const headNeed=POS_VIEW_COLUMNS.map(c=>{posMeasureCtx.font=isNarrow(c)?narrowFont:headFont;const w=Math.max(0,...String(c.label).split(/[\s\u200b]+/).filter(Boolean).map(x=>posMeasureCtx.measureText(x).width));return Math.ceil(w+(c.sortable===false?0:14)+(isNarrow(c)?6+6:hpad));});
    const widths=POS_VIEW_COLUMNS.map((c,i)=>{
      let maxText=0;
      // v2.6.30 — headings wrap between words, so a column only needs its longest heading
      // word plus the sort arrow (kept together) rather than the whole heading on one line.
      posMeasureCtx.font=headFont;
      maxText=Math.max(maxText,headNeed[i]);
      posMeasureCtx.font=bodyFont;
      for(let r=0;r<rows.length;r++){
        const pos=rows[r],detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||posDetailAt(r),notSupplied=!detail||Number(detail.suppliedQty||0)<=0;
        const text=posSizingText(pos,c,detail,notSupplied);maxText=Math.max(maxText,posMeasureCtx.measureText(text).width+(isNarrow(c)?12:pad));
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
    // v2.9.0 — if a narrow window still needs a horizontal scroll, the row Total column and the Current / Adjusted
    // footer totals stay pinned to the right edge so they are always visible.
    const w=k=>Math.round(widths[POS_VIEW_COLUMNS.findIndex(c=>c.key===k)]||0),rTot=w('__row_total_inc_gst'),rAdj=rTot+w('or_qty'),rCur=rAdj+w('adjdprce')+w('adjcatprce');   // v2.17.0: Current spans Adj CatPrc + Adj DPrc
    els.table.classList.toggle('pos-overflow',total>available+1);
    els.table.style.setProperty('--pos-right-total','0px');els.table.style.setProperty('--pos-right-current',`${rAdj}px`);els.table.style.setProperty('--pos-right-label',`${rCur}px`);
    // v2.22.0 — a warning row's text stays inside the visible table (left of the pinned Total column on a narrow window)
    els.table.style.setProperty('--pos-note-w',`${Math.max(320,Math.round(available-w('__unpack')-w('__pos_order_index')-w('__invoice_line')-(total>available+1?rTot:0)-28))}px`);
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
    if(!state.referenceReady)setStatus('Reference data is not ready on this computer. Drop the POS / master and Ongoing Discounts files on their rows under Reference data, or in Drop All Input Files Here.','warn');
    else if(filesReady)setStatus(`Ready: 1 POS order and ${state.invoices.length} supplier invoice${state.invoices.length===1?'':'s'} selected.`,'ok');
    else setStatus('Add one POS order and at least one supplier invoice to continue.','info');
  }
  function addPos(files){resetReceivingState({clearStorage:true});const f=[...files].find(x=>validExt(x,['.xls','.xlsx','.csv']));if(f)state.pos=f;state.result=null;state.posParsed=null;state.runIntegrity=null;state.orderOverrides=new Map();state.unpackChecked=new Set();state.unpackKey=null;state.unpackCounts=new Map();state.unpackCountsKey=null;hideResults();renderFiles();}
  function addInvoices(files){resetReceivingState({clearStorage:true});for(const f of files){if(validExt(f,['.pdf','.xls','.xlsx','.csv'])&&!state.invoices.some(x=>x.name===f.name&&x.size===f.size))state.invoices.push(f);}state.result=null;state.docs=[];state.runIntegrity=null;state.orderOverrides=new Map();hideResults();renderFiles();}
  function wireDrop(zone,input,handler){zone.onclick=()=>input.click();zone.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click();}};input.onchange=()=>handler(input.files);['dragenter','dragover'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.add('drag');}));['dragleave','drop'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.remove('drag');}));zone.addEventListener('drop',e=>handler(e.dataTransfer.files));}

  function pill(status){let cls='bad';if(status==='OK')cls='ok';else if(status==='BETTER PRICE')cls='better';else if(/REVIEW|LOW/.test(status))cls='review';return `<span class="status-pill ${cls}">${escapeHtml(status)}</span>`;}
  function kpi(label,value,cls=''){return `<div class="kpi ${cls}"><div class="n">${escapeHtml(value)}</div><div class="l">${escapeHtml(label)}</div></div>`;}
  function updateDownloadButton(){
    // v2.8.0 — integrity, price and data checks are review notes; every download is available once a run has finished.
    const ready=!!(state.result&&state.docs&&state.docs.length&&state.refs);
    // v2.6.29 — the green primary button (shown first) is the download for the current view:
    // POS layout → POSActive Import.txt · Exceptions → Exceptions.xlsx · All lines → Full Reconciliation.xlsx.
    const viewPrimary=state.previewView==='all'?els.fullDownloadBtn:els.downloadBtn;
    for(const b of [els.fullDownloadBtn,els.fullCsvDownloadBtn,els.downloadBtn,els.keyReviewBtn]){if(!b)continue;const on=b===viewPrimary;b.classList.toggle('primary',on);b.classList.toggle('view-primary',on);}
    if(els.fullDownloadBtn){
      els.fullDownloadBtn.textContent='Full Reconciliation.xlsx';els.fullDownloadBtn.setAttribute('aria-label','Download Full Reconciliation.xlsx');   // v2.15.0: the ↓ glyph (CSS) says download; the accessible name keeps it
      els.fullDownloadBtn.disabled=!ready;
      els.fullDownloadBtn.title=ready?'Download the original complete 43-column linked-POS reconciliation workbook. Barcodes are stored as exact text.':'Run the reconciliation first.';
    }
    if(els.fullCsvDownloadBtn){
      els.fullCsvDownloadBtn.textContent='Full Reconciliation.csv';els.fullCsvDownloadBtn.setAttribute('aria-label','Download Full Reconciliation.csv');
      els.fullCsvDownloadBtn.disabled=!ready;
      els.fullCsvDownloadBtn.title=ready?'Download the same 43-column reconciliation as an Excel-safe UTF-8 CSV. Barcodes use a text formula so leading zeroes remain visible when opened directly in Excel.':'Run the reconciliation first.';
    }
    if(els.keyReviewBtn)els.keyReviewBtn.disabled=!state.result;
    if(!els.downloadBtn)return;
    const orderMismatches=orderLinkMismatches(),orderLinkReady=true;
    const labels={exceptions:'Exceptions.xlsx',pos:'POSActive Import.txt'};   // v2.15.0: shorter visible labels so the steps and downloads share one row
    if(state.previewView==='all'){
      els.downloadBtn.classList.add('hidden');
      els.downloadBtn.disabled=true;
      return;
    }
    els.downloadBtn.classList.remove('hidden');
    els.downloadBtn.textContent=labels[state.previewView]||'Current View';els.downloadBtn.setAttribute('aria-label','Download '+els.downloadBtn.textContent);
    const posLinkBlocked=false;
    els.downloadBtn.disabled=!ready;
    els.downloadBtn.title=!ready?'Run the reconciliation first.':`Download the ${state.previewView==='pos'?'POSActive 15-column tab-delimited import file; ticked/accounted POS Layout rows are imported with their Found quantities (overs and unders) at the CH2 invoice prices':'exceptions workbook'}.`;
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
    const ioByInv=new Map(invoiceOnlyEntries().map(e=>[e.inv,e]));   // v2.17.0: billed-not-ordered lines carry their database check
    const extras=r.unmatchedInvoice.map(x=>{const e=ioByInv.get(x);if(e){ const ck=lineCheckBase(e.pos,e.detail);return {status:`NOT ON POS ORDER · ${ck.statuses.join(' + ')}`,posDescription:cleanText(e.pos.description)||x.description,orderedQty:null,suppliedQty:x.qtySupplied,expectedUnit:ck.expected,actualUnit:x.unitPriceExGst,unitVariance:ck.variance,missedTotal:ck.effect>0?ck.effect:0,matchConfidence:'',hasException:true};}
      return {status:'NOT ORDERED / UNMATCHED',posDescription:x.description,orderedQty:null,suppliedQty:x.qtySupplied,expectedUnit:null,actualUnit:x.unitPriceExGst,unitVariance:null,missedTotal:0,matchConfidence:'',hasException:true};});
    const rows=[...display,...extras];
    els.tableBody.innerHTML=rows.length?rows.map(x=>`<tr><td>${pill(x.status)}</td><td>${escapeHtml(x.posDescription)}</td><td class="num">${qty(x.orderedQty)}</td><td class="num">${qty(x.suppliedQty)}</td><td class="num">${money(x.expectedUnit)}</td><td class="num">${money(x.actualUnit,4)}</td><td class="num">${money(x.unitVariance,4)}</td><td class="num">${money(x.missedTotal)}</td><td class="center">${x.matchConfidence?escapeHtml(x.matchConfidence):'<span class="muted">—</span>'}</td></tr>`).join(''):'<tr><td colspan="9">No exceptions found.</td></tr>';
    ensureStickyTracking();
  }
  // v2.20.0 — what to fix in POSActive, per row: the cell to fix (gst · sub · ch2) and the note for its hover.
  function computeFixMap(){
    const map=new Map(),rows=sortedPosRows(),details=posDetailMap(),add=(src,cell,chip,note)=>{if(!map.has(src))map.set(src,[]);map.get(src).push({cell,chip,note});};
    const items=rows.map((pos,i)=>({pos,detail:details.get(posSrcKey(pos))||posDetailAt(i),inv:!!(pos&&pos.invoiceOnly)}));
    for(const [src,list] of importIssues(items))for(const i of list)add(src,'sub',i.chip,i.note);
    for(const x of items)if(!x.inv&&String(x.detail&&x.detail.matchConfidence||'')==='LOW')add(posSrcKey(x.pos),'ch2','MATCH LOW',`Matched with LOW confidence${x.detail&&x.detail.matchMethods?` (${x.detail.matchMethods})`:''} — check this is the product CH2 billed before importing.`);
    for(const [src,g] of gstReview().map)add(src,'gst','GST DIFFERS',gstReviewText(g));
    return map;
  }
  function renderPosTable(){
    refreshImportKeyReview();state.fixMap=computeFixMap();
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
    let stateChanged=false;state.posRowLookup=new Map();
    for(let i=0;i<baseRows.length;i++){
      const pos=baseRows[i],detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||posDetailAt(i),key=unpackIdentity(pos),expected=unpackExpectedQty(pos,detail);
      state.posRowLookup.set(posSrcKey(pos),{pos,detail});   // v2.18.0: filters, selection and changes find the row by its source row
      if(state.adjQtyEdits.has(key)&&!state.unpackCounts.has(key))state.adjQtyEdits.delete(key);   // unticked / Clear qty: Adj Qty is the order's again
      if(state.receivingMigratedFrom266&&state.unpackCounts.has(key)){
        const found=unpackCountFor(pos),complete=(Math.abs(found)<=.0005&&expected>.0005)||receivingCountComplete(found,expected);
        if(complete)state.unpackChecked.add(key);else state.unpackChecked.delete(key);stateChanged=true;
      }
      if(state.unpackChecked.has(key)&&!state.unpackCounts.has(key)){state.unpackCounts.set(key,expected);stateChanged=true;}
    }
    if(state.receivingMigratedFrom266){state.receivingMigratedFrom266=false;stateChanged=true;}
    if(stateChanged){saveUnpackCounts();saveUnpackChecklist();}
    const orderBaseRows=baseRows.filter(tickAllCovers),selectedCount=baseRows.reduce((n,pos)=>n+(state.unpackChecked.has(unpackIdentity(pos))?1:0),0),allSelected=orderBaseRows.length>0&&orderBaseRows.every(pos=>state.unpackChecked.has(unpackIdentity(pos))),partSelected=selectedCount>0&&!allSelected;
    if(els.tickAllBtn){els.tickAllBtn.textContent=allSelected?'Untick all':'Tick all';els.tickAllBtn.title=allSelected?'Untick all — clear all Found quantities and return rows to Remaining':'Tick all — untouched rows use expected CH2 supplied qty';}
    // v2.6.30 — one header-cell builder for the main sticky header and the Completed section
    // header row, so both carry the same sortable headings (sorting applies to both sections).
    const headerCell=(c,withControls)=>{
      const cls=[c.kind==='check'?'unpack-head':'',c.kind==='bool'?'pos-bool-head':'',(['number','qtyinput','qtytotal'].includes(c.kind))?'num':'',(c.kind==='bool'||c.kind==='check'||c.align==='center')?'center':'',...String(c.cls||'').split(/\s+/).filter(x=>x==='pos-narrow'||x==='pos-row-total')].filter(Boolean).join(' ');
      if(!withControls&&c.kind==='check')return `<th class="${cls}" scope="col">✓</th>`;
      if(!withControls&&c.kind==='qtyinput')return `<th class="${cls}" scope="col">${escapeHtml(c.label)}</th>`;
      if(c.kind==='check')return `<th class="${cls}" title="Tick all / untick all POS rows for the POSActive download"><div class="pos-header-stack"><button type="button" class="unpack-check unpack-check-all ${allSelected?'checked':''} ${partSelected?'partial':''}" data-toggle-all aria-pressed="${allSelected?'true':'false'}" title="${allSelected?'Untick all — clear all Found quantities and return rows to Remaining':'Tick all — untouched rows use expected CH2 supplied qty'}"><span aria-hidden="true">${allSelected?'✓':partSelected?'−':''}</span></button><span class="pos-header-mini-label">All</span></div></th>`;
      if(c.kind==='qtyinput')return `<th class="${cls}"><div class="pos-header-stack"><span>${escapeHtml(c.label)}</span><button type="button" class="pos-header-action" data-clear-qty title="Clear all Found quantities and receiving selections">Clear qty</button></div></th>`;
      // v2.18.0: the label sorts (click again to reverse) and the ≡ button opens the sort and filter menu, as in the merge sheets.
      const sortable=c.sortable!==false,active=sortable&&state.posSortKey===c.key,arrow=active?(state.posSortDir==='desc'?'▼':'▲'):'',label=escapeHtml(String(c.label).replace(/\u200b/g,'')),filtOn=state.colFilters.has(c.key)||(active&&state.posSortExplicit);
      return `<th${cls?` class="${cls}"`:''}>${sortable?`<div class="pos-th-wrap"><button type="button" class="pos-sort-button ${active?'active':''}" data-sort-key="${escapeHtml(c.key)}" title="Sort by ${label} — click again to reverse">${escapeHtml(c.label)}<span aria-hidden="true">${arrow}</span></button><button type="button" class="pos-filt${filtOn?' is-on':''}" data-filter-key="${escapeHtml(c.key)}" aria-label="Sort and filter ${label}" title="Sort and filter ${label}${state.colFilters.has(c.key)?' (filtered)':''}">${FILTER_SVG}</button></div>`:escapeHtml(c.label)}</th>`;
    };
    els.tableHead.innerHTML=`<tr>${POS_VIEW_COLUMNS.map(c=>headerCell(c,true)).join('')}</tr>`;
    const sections=posPreviewSections(detailBySourceRow);
    const progress=updateChecklistUi(baseRows,detailBySourceRow);
    const renderPosRow=(pos,zebraIndex=0,dockRow=false,completeIndex=null,ref=false)=>{   // v2.21.0: ref = a read-only copy in the Fix in POSActive flag
      const detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||posDetailAt(Math.max(0,(Number(pos&&pos.posIndex)||1)-1)),notSupplied=!detail||Number(detail.suppliedQty||0)<=0;
      const checkKey=unpackIdentity(pos),unpackDone=state.unpackChecked.has(checkKey);
      // v2.6.28 — a not-invoiced row that staff physically received (Found > 0) is exported
      // as a manual POSActive line, so it is shown as live stock rather than struck through.
      const manualReceived=notSupplied&&state.unpackCounts.has(checkKey)&&unpackCountFor(pos)>0,ni=isNotInvoiced(pos,detail);   // v2.19.0: ni = the Not invoiced section (not greyed)
      const rowEdited=['adjwsprce','adjcatprce','or_qty'].some(k=>adjCellEdited(pos,k)),fixCells=new Map(((state.fixMap&&state.fixMap.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:'')))||[]).map(f=>[f.cell,f]));   // v2.20.0
      const rowClasses=[zebraIndex%2?'pos-row-even':'pos-row-odd',notSupplied&&!manualReceived&&!ni?'pos-not-supplied':'',ni?'pos-not-invoiced':'',manualReceived?'pos-manual-received':'',pos&&pos.invoiceOnly?'pos-invoice-only':'',unpackDone?'unpack-checked':'',rowEdited?'pos-row-edited':'',dockRow?'pos-dock-member pos-dock-row':''].filter(Boolean).join(' ');
      const cells=POS_VIEW_COLUMNS.map(c=>{
        const v=posColumnValue(pos,c,detail);let html='',extraCls='',title='';
        if(ref&&(c.kind==='check'||c.kind==='qtyinput'||c.kind==='qtytotal')){   // v2.21.0: the copy shows the tick and Found, without controls
          html=c.kind==='check'?`<span class="pos-ref-tick" aria-hidden="true">${unpackDone?'✓':''}</span>`:c.kind==='qtytotal'?`<span class="pos-ref-found">${escapeHtml(displayUnpackCount(unpackCountFor(pos)))}</span>`:'';extraCls=c.kind==='check'?' unpack-cell':'';
        }else if(c.kind==='check'){
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
          html=`<input class="unpack-qty-input" type="number" step="any" inputmode="decimal" autocomplete="off" data-unpack-qty-key="${escapeHtml(encodeURIComponent(checkKey))}" data-unpack-expected="${escapeHtml(expectedQty)}" aria-label="Add unpacked quantity for ${escapeHtml(item)}" title="Expected in delivery: ${escapeHtml(displayUnpackCount(expectedQty))}. Enter a quantity; Enter, Tab, clicking elsewhere, switching window/tab or leaving the page will save it. Negative values subtract. A short count stays in Remaining; an exact or over count completes automatically. Enter 0 to clear Found, mark this row accounted as not supplied, and exclude its zero quantity from the POSActive import.">`;
        }else if(c.kind==='qtytotal'){
          const found=unpackCountFor(pos),expectedQty=unpackExpectedQty(pos,detail),status=unpackCountStatus(checkKey,found,expectedQty);
          html=`<input class="unpack-qty-total found-${status.kind}" type="number" step="any" min="0" inputmode="decimal" autocomplete="off" data-unpack-total-key="${escapeHtml(encodeURIComponent(checkKey))}" data-unpack-expected="${escapeHtml(expectedQty)}" value="${escapeHtml(displayUnpackCount(found))}" title="${escapeHtml(`Expected: ${displayUnpackCount(expectedQty)} · Found: ${displayUnpackCount(found)} · ${status.label}. Edit this total directly to override the running count.`)}" aria-label="${escapeHtml(`Found ${displayUnpackCount(found)}. ${status.label}. Editable total.`)}">`;
        }else if(c.kind==='status'){const ck=lineCheck(pos,detail);html=`<span class="pos-check-chip ck-${ck.kind}">${escapeHtml(ck.label)}</span>`;title=ck.title;extraCls=' pos-check-cell';   // v2.17.0
          if(ni){const exp=numberValue(discountedPosPrice(pos,detail)),d=expectedDiscountForPos(pos,detail),ws=normalWholesaleForPos(pos,detail),got=state.unpackCounts.has(checkKey)?unpackCountFor(pos):null;title=`Not invoiced — ordered ${displayUnpackCount(numberValue(detail&&detail.orderedQty)??numberValue(rawValue(pos,'qty'))??0)}, CH2 billed none.${exp!=null?` Expected $${exp.toFixed(2)} each${ws!=null?` (CH2 W/S $${Number(ws).toFixed(2)}${d!=null?` less ${d.toFixed(2)}%`:''})`:''}.`:''} ${got!=null&&got>0?`Received ${displayUnpackCount(got)} — in the TXT as a manual line at that price.`:got===0?'Marked not supplied.':'Tick it if it arrived (the ordered quantity goes into the TXT) or count it; enter 0 if it did not.'}`;}   // v2.19.0 / v2.22.0
        }else if(c.kind==='bool'){const checked=boolValue(v);html=`<span class="pos-checkbox ${c.flag||''} ${checked?'checked':''}" aria-label="${checked?'Checked':'Not checked'}">${checked?'✓':''}</span>`;}
        else if(c.kind==='number'){
          html=escapeHtml(fixed(v,posCellDp(pos,c,v)));const target=comparisonTarget(pos,detail,c.key),move=c.key==='__invoice_discount'?discountMove(v,target):priceMove(v,target);
          if(c.key==='gst_tax_pc'){
            const g=gstReview().map.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''));
            if(g){extraCls=' pos-gst-diff';html=`<span class="pos-gst-value">${html}</span><span class="pos-gst-chip">INV ${escapeHtml(g.invRate)}</span>`;title=gstReviewText(g);}
          }else if(c.key==='__row_total_inc_gst'){
            const rowQty=state.unpackCounts.has(checkKey)?unpackCountFor(pos):(numberValue(detail&&detail.suppliedQty)??numberValue(rawValue(pos,'qty'))??numberValue(pos.orderedQty)??0);
            title=`${displayUnpackCount(rowQty)} × AdjCatPrc ${fixed(posColumnValue(pos,{key:'adjcatprce'},detail),2) || '—'} plus GST ${fixed(rawValue(pos,'gst_tax_pc')||pos.gstPct||0,0)}%`;
          }else if(c.key==='__invoice_discount'&&ni){
            if(numberValue(v)!=null)title=`Expected discount ${Number(v).toFixed(2)}% — the Ongoing Discounts rule for this product. Not invoiced, so there is nothing to compare yet.`;   // v2.19.0
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
          if(ADJ_EDIT_KEYS.has(c.key)){const ed=adjCellEdited(pos,c.key);extraCls=ed?editedCellCls(pos,c,detail,v):`${extraCls} pos-edit-cell`;if(ed&&c.key!=='or_qty')html=`<span class="pos-price-value">${escapeHtml(fixed(v,posCellDp(pos,c,v)))}</span><span class="price-arrow" aria-hidden="true">${editMove(pos,c,detail,v).symbol}</span>`;title=adjCellTitle(pos,c,detail,v)+(title&&!ed?` · ${title}`:'');}   // v2.18.0 / v2.20.0
          if(c.key==='__pos_order_index'&&rowEdited)html=`<span class="pos-edited-pill" title="You changed a price or Adj Qty on this line">${html}</span>`;   // v2.20.0
        } else {
          html=escapeHtml(v);if(v)title=String(v);
          if(ni&&c.key==='__ch2_item_code'&&v)title=`CH2 code ${v} — from the POS master (not invoiced)`;   // v2.19.0
          if(c.key==='descr'&&pos&&pos.invoiceOnly){
            // v2.6.38 — INV rows sit in their own "Invoiced · not on POS order" section and are
            // formatted exactly like every other row; the reason stays in the hover text.
            const dg=pos.orderDiagnosis;title=`${v?`${v} — `:''}${invChipText(pos)}${dg?` — ${dg.detail}`:''}`;
          }
          if(c.key==='sub_id'){
            const invoiced=!!(detail&&Array.isArray(detail.invoiceRows)&&detail.invoiceRows.length);
            if(pos.invoiceOnly&&v){const id=importIdentityFor(pos,detail),row=pos.orderDiagnosis&&pos.orderDiagnosis.orderRow;title=row?`Exported exactly as on the order file row POS index ${row.posIndex}: "${v}"`:`Not on the POS order · Sub ID "${v}" exported exactly from ${id&&id.source?id.source:'POS master'} if ticked. If this product should be on the order, add it in POSActive, re-export the order and run again to use its exact order Sub ID.`;}
            else if(typeof pos.subIdRaw==='string'&&!String(v).trim()&&invoiced){extraCls=' pos-subid-blank';html='<span class="pos-subid-blank-mark">(blank)</span>';title='Sub ID is blank on the POS order and is exported blank, exactly as stored in POSActive. Set a Sub ID on the product in POSActive and re-export the order if the import cannot match it.';}
            else if(v&&/["$%]/.test(String(v))&&invoiced){extraCls=' pos-subid-unreadable';title=`POSActive cannot match this Sub ID: its invoice import drops ${[...new Set(String(v).match(/["$%]/g))].join(' ')} and reads "${String(v).replace(/["$%]/g,'').trim()}". Change the Sub ID in POSActive (e.g. to the CH2 code), re-export the order and run again.`;}
            else if(v)title=`Exported exactly as on the POS order: "${v}"`;
          }
        }
        {const fk=c.key==='gst_tax_pc'?'gst':c.key==='sub_id'?'sub':c.key==='__ch2_item_code'?'ch2':'',f=fk&&fixCells.get(fk);if(f){extraCls+=' pos-fix-cell';title=`FIX IN POSACTIVE — ${f.note}`;}}   // v2.20.0
        const cls=[c.cls||'',c.kind==='number'?'num':'',c.kind==='bool'?'pos-bool-cell center':'',c.align==='center'?'center':'',extraCls].filter(Boolean).join(' ');return `<td${cls?` class="${cls}"`:''}${title?` title="${escapeHtml(title)}"`:''}>${html}</td>`;
      }).join('');
      const rowTitle=manualReceived?' title="Manually received — not on the CH2 invoice. Added to the POSActive TXT and totals using POS master CH2_WHOLESALE_EX_GST / POS pricing and the matched discount rule."':pos&&pos.invoiceOnly?` title="${escapeHtml(`Invoice only — billed by CH2 but not on the POS order. ${pos.orderDiagnosis?pos.orderDiagnosis.detail:''} Ticked rows (or Found) are included in the POSActive TXT and totals; POSActive can only apply them if the product is on the open order.`)}"`:'';
      const ckRow=lineCheck(pos,detail),fx=state.fixMap&&state.fixMap.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''));
      if(ref)return `<tr class="${rowClasses} pos-fix-ref" data-ref-src="${escapeHtml(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))}" title="Also in the list below — click to go to that line">${cells}</tr>`;
      // v2.22.0 — the orange warning row straight above a line to fix (not in the Completed dock, which only holds rows)
      const fixNote=fx&&completeIndex==null?`<tr class="pos-fix-note" data-note-for="${escapeHtml(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))}"><td colspan="3" class="pos-fix-note-pad"></td><td colspan="${POS_VIEW_COLUMNS.length-3}" class="pos-fix-note-cell"><div class="pos-fix-note-in">${fx.map(f=>`<span class="pos-fix-tag">${escapeHtml(f.chip)}</span><span class="pos-fix-text">${escapeHtml(f.note)}</span>`).join('')}</div></td></tr>`:'';
      return `${fixNote}<tr${rowClasses?` class="${rowClasses}${fx?' pos-fix-row':''}"`:fx?' class="pos-fix-row"':''} data-check="${ckRow.kind}" data-pos-src="${escapeHtml(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))}"${notSupplied?' data-not-supplied="1"':''}${ni?' data-ni="1"':''}${fx?' data-fix="1"':''}${manualReceived?' data-manual-received="1"':''}${completeIndex!=null?` data-complete-index="${completeIndex}"`:''}${rowTitle}>${cells}</tr>`;
    };
    const sectionHtml=[];let zebraIndex=0;
    // v2.22.0 — no copies at the top: a line to fix carries an orange warning row straight above it (renderPosRow).
    if(sections.notOnOrder&&sections.notOnOrder.length){const n=sections.notOnOrder.length,ticked=sections.notOnOrder.filter(pos=>state.unpackChecked.has(unpackIdentity(pos))).length,orderNo=cleanText(state.posParsed&&state.posParsed.orderNumber);sectionHtml.push(`<tr class="pos-section-row pos-section-notonorder"><td colspan="${POS_VIEW_COLUMNS.length}"><strong>Invoiced · not on POS order</strong><span>${n} item${n===1?'':'s'} · billed by CH2 but not on POS order${orderNo?` ${escapeHtml(orderNo)}`:''} · ${ticked?`${ticked} ticked — included in the POSActive TXT${ticked<n?` · ${n-ticked} excluded unless ticked`:''}`:'excluded from the POSActive TXT unless ticked'} · reason on hover and in Details · Not on POS order</span></td></tr>`);for(const pos of sections.notOnOrder)sectionHtml.push(renderPosRow(pos,zebraIndex++));}
    // v2.19.0 — POS-order lines CH2 did not invoice: their own section, laid out like every other row, ticked or not.
    if(sections.notInvoiced&&sections.notInvoiced.length){const list=sections.notInvoiced,n=list.length,orderNo=cleanText(state.posParsed&&state.posParsed.orderNumber),value=list.reduce((a,pos)=>a+(notInvoicedValue(pos)||0),0),counted=list.filter(pos=>state.unpackCounts.has(unpackIdentity(pos))&&unpackCountFor(pos)>0).length;
      sectionHtml.push(`<tr class="pos-section-row pos-section-notonorder pos-section-notinv"><td colspan="${POS_VIEW_COLUMNS.length}"><strong>Not invoiced · on POS order${orderNo?` ${escapeHtml(orderNo)}`:''}, not billed by CH2</strong><span>${n} item${n===1?'':'s'} · ${escapeHtml(money(value))} at the ordered value · tick it if it arrived (the ordered quantity goes into the TXT) or count it; if not, enter 0 in Add Qty · ALL leaves these for you${counted?` · ${counted} received — in the TXT`:''}</span></td></tr>`);
      for(const pos of list)sectionHtml.push(renderPosRow(pos,zebraIndex++));}
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
      const refRow=e.target.closest('tr[data-ref-src]');if(refRow){e.preventDefault();showChecklistLine(refRow.dataset.refSrc);return;}   // v2.21.0: a Fix copy → its line
      const sectionFilt=e.target.closest('[data-filter-key]');if(sectionFilt){e.preventDefault();e.stopPropagation();openColFilter(String(sectionFilt.dataset.filterKey||''),sectionFilt);return;}   // v2.18.0
      const sectionSort=e.target.closest('[data-sort-key]');if(sectionSort){e.preventDefault();e.stopPropagation();sortPosBy(String(sectionSort.dataset.sortKey||''));return;}
      const jump=e.target.closest('[data-jump-completed]');if(jump){e.preventDefault();jumpCompletedSection();return;}
      const btn=e.target.closest('.unpack-check');if(!btn)return;e.preventDefault();e.stopPropagation();
      const key=decodeUnpackKey(btn.dataset.unpackKey||'');if(!key)return;
      const pos=baseRows.find(r=>unpackIdentity(r)===key);if(!pos)return;
      const detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||null;
      const checked=!state.unpackChecked.has(key),tr=btn.closest('tr');
      setUnpackComplete(pos,detail,checked);updateRowSelectionVisual(tr,checked);
      if(!checked){const found=tr&&tr.querySelector('.unpack-qty-total');if(found)updateUnpackTotalElement(found,key,0,unpackExpectedQty(pos,detail));updateManualReceivedVisual(tr,0);}
      else{const found=tr&&tr.querySelector('.unpack-qty-total');if(found)updateUnpackTotalElement(found,key,unpackCountFor(pos),unpackExpectedQty(pos,detail));updateManualReceivedVisual(tr,unpackCountFor(pos));}   // v2.22.0: Found shows what the tick received
      refreshCheckCell(tr,pos,detail);refreshLiveTotals();   // v2.22.0
      scheduleReceivingRender();
    };
    els.tableHead.onclick=e=>{
      const filt=e.target.closest('[data-filter-key]');if(filt){e.preventDefault();e.stopPropagation();openColFilter(String(filt.dataset.filterKey||''),filt);return;}   // v2.18.0
      const toggle=e.target.closest('[data-toggle-all]'),clear=e.target.closest('[data-clear-qty]'),sort=e.target.closest('[data-sort-key]');
      if(toggle){
        e.preventDefault();e.stopPropagation();
        // v2.6.34 — Tick all covers the POS-order rows and invoice-only rows that resolve to a POS
        // product (see tickAllCovers). Unresolved invoice-only rows are left for a deliberate tick.
        const orderRows=baseRows.filter(tickAllCovers),currentlyAll=orderRows.length>0&&orderRows.every(pos=>state.unpackChecked.has(unpackIdentity(pos))),selectAll=!currentlyAll;
        for(let i=0;i<baseRows.length;i++){
          const pos=baseRows[i],key=unpackIdentity(pos),detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||posDetailAt(i);
          if(selectAll&&!tickAllCovers(pos))continue;
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
        refreshLiveTotals();   // v2.22.0
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
        els.tableFoot.innerHTML=`<tr class="pos-total-row"><td colspan="${leftSpan}" class="pos-total-left" title="Exact counts or manually ticked rows move below Remaining after a short delay · short counts stay in Remaining until resolved or manually ticked; exact or over counts complete · unticking a row clears Found and returns it to Remaining · untouched + unticked rows = not supplied by default · entered Found always controls the download qty · grey rows = not invoiced (Found &gt; 0 adds a manual POSActive line) · Add Qty 0 = accounted / not supplied"><strong>Current order</strong><span>${baseRows.length.toLocaleString()} product line${baseRows.length===1?'':'s'} · <b data-check-progress>accounted ${progress.checked}/${progress.total} · unchecked ${progress.remaining}</b></span></td><td class="pos-found-total-label" title="Total units physically found across all touched POS rows">Found</td><td class="pos-found-total-value num" title="Total units physically found across all touched POS rows">${displayUnpackCount(foundTotal)}</td>${posTotalsBlock(totals,POS_VIEW_COLUMNS.length-(leftSpan+2))}</tr>`;   // v2.17.0: each total names itself · v2.21.0: four totals in one block
      }
      else{els.tableFoot.innerHTML='';renderPosBalance(null);}
    }
    ensurePosResizeObserver();schedulePosColumnSizing();updateStickyOffsets();ensureStickyTracking();applyTableSearch();wireGrid();paintSel();
    if(state.lastSummaryArgs&&state.lastSummaryArgs[0]===state.result)renderSummary(...state.lastSummaryArgs);   // v2.20.0: the chips follow counts and changes
  }
  // v2.18.0 — the checklist works like the sheets in POS New Product Check Clean.
  // 1) Every heading (not ALL / Add Qty) has a sort and filter menu: A to Z / Z to A (Highest / Lowest for numbers), Sort off,
  //    and "Show" — the values in that column with their counts. Filters show as chips beside the search; ✕ removes one.
  // 2) Cells select like a sheet (click, Shift + click, drag, arrows) and Ctrl + C copies them. Adj WSPrc, Adj CatPrc /
  //    Adj DPrc and Adj Qty can be changed: type, Enter / F2 / double-click, Ctrl + V (a block from Excel), Ctrl + D or the
  //    corner square (fill down). A changed cell is orange. Delete restores the value, Ctrl + Z undoes.
  //    What POSActive gets: Adj WSPrc → Normal WS; Adj CatPrc and Adj DPrc are one price → Unit Price ex GST (Disc % follows);
  //    Adj Qty → the imported quantity, the same number as Found. Adj RRPrc is not in the import, so it stays read-only.
  const FILTER_SVG='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M4.5 8h7M7 12h2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  const ADJ_EDIT_KEYS=new Set(['adjwsprce','adjcatprce','adjdprce','or_qty']);
  const SEL_KINDS=new Set(['text','number','status','bool']);
  function posSrcKey(pos){return String(pos&&pos.sourceRow!=null?pos.sourceRow:'');}
  function adjEditFor(pos){return state.adjEdits.get(posSrcKey(pos))||null;}
  function adjCellEdited(pos,key){
    if(!ADJ_EDIT_KEYS.has(key))return false;
    if(key==='or_qty'){const k=unpackIdentity(pos);return state.adjQtyEdits.has(k)&&state.unpackCounts.has(k);}
    const e=adjEditFor(pos);if(!e)return false;
    return key==='adjwsprce'?e.ws!=null:e.unit!=null;
  }
  function editDp(v,min,max=4){const x=Number(v);if(!Number.isFinite(x))return min;for(let d=min;d<max;d++)if(Math.abs(Math.round(x*10**d)/10**d-x)<1e-9)return d;return max;}
  function posCellDp(pos,c,v){const dp=c.dp??2;return adjCellEdited(pos,c.key)?editDp(v,dp,c.key==='or_qty'?3:4):dp;}
  // One text per cell for the filter list, the filter test and Ctrl + C.
  function posFilterText(pos,c,detail){
    if(c.kind==='qtytotal')return displayUnpackCount(unpackCountFor(pos));
    if(c.kind==='status')return lineCheck(pos,detail).label;
    const v=posColumnValue(pos,c,detail);
    if(c.kind==='bool')return boolValue(v)?'✓':'';
    if(c.kind==='number')return fixed(v,posCellDp(pos,c,v));
    return String(v??'').replace(/\s+/g,' ').trim();
  }
  // v2.20.0 — a changed price is compared with the value before your change (lower blue ↓, higher red ↑); a changed Adj Qty with
  // the billed quantity (more green, less red, the same grey — as Found). The orange corner says you changed it.
  function editMove(pos,c,detail,v){
    const was=numberValue(posColumnValue(pos,c,detail,true)),now=numberValue(v);if(was==null||now==null)return {kind:'same',symbol:'—'};
    const d=Math.round((now-was)*10000)/10000;return d>0.004?{kind:'up',symbol:'↑'}:d<-0.004?{kind:'down',symbol:'↓'}:{kind:'same',symbol:'—'};
  }
  function editedCellCls(pos,c,detail,v){
    if(c.key==='or_qty'){const e=unpackExpectedQty(pos,detail),n=numberValue(v)??0;return ` pos-edit-cell is-edited qty-${n>e+.0005?'over':n<e-.0005?'under':'exact'}`;}
    return ` pos-edit-cell is-edited price-move-cell price-${editMove(pos,c,detail,v).kind}`;
  }
  function adjEditHint(key){return key==='adjwsprce'?'Normal WS':key==='or_qty'?'the imported quantity (the same as Found)':'Unit Price ex GST (Adj CatPrc and Adj DPrc change together)';}
  function adjCellTitle(pos,c,detail,v){
    const label=String(c.label).replace(/​/g,''),dp=c.dp??2;
    if(!adjCellEdited(pos,c.key))return `${label}: click and type to change it — POSActive gets it as ${adjEditHint(c.key)}. Ctrl + V pastes, the corner square fills down.`;
    const was=posColumnValue(pos,c,detail,true),wasText=fixed(was,dp)||'blank';
    return `Changed from ${wasText} — the POSActive TXT imports ${fixed(v,posCellDp(pos,c,v))} as ${adjEditHint(c.key)}. Delete puts ${wasText} back.`;
  }

  // ------------------------------------------------------------------ sort and filter menu (same as the merge sheets)
  let colPk=null;
  function closeColPicker(){if(!colPk)return;const p=colPk;colPk=null;p.el.remove();document.removeEventListener('mousedown',p.away,true);}
  function colPicker(o){
    closeColPicker();
    const vals=o.values||[],on=new Map(),el=document.createElement('div');
    vals.forEach(x=>on.set(x.v,!o.selected||o.selected.has(x.v)));
    el.className='rs-pop rs-pick';el.setAttribute('role','dialog');el.setAttribute('aria-label',`Sort and filter ${o.title||''}`);
    const so=o.sort,sLab=so.numeric?['Highest to lowest','Lowest to highest',-1,1]:['A to Z','Z to A',1,-1];
    el.innerHTML=`<div class="rs-ptitle">${escapeHtml(o.title||'')}</div><div class="rs-psort"><button type="button" class="rs-plink${so.dir===sLab[2]?' is-on':''}" data-psort="${sLab[2]}">${sLab[0]}</button><button type="button" class="rs-plink${so.dir===sLab[3]?' is-on':''}" data-psort="${sLab[3]}">${sLab[1]}</button>${so.dir?'<button type="button" class="rs-plink" data-psort="0">Sort off</button>':''}</div>`+
      '<div class="rs-ptitle rs-ptitle2">Show</div><input type="search" class="rs-psearch" placeholder="Search values…" aria-label="Search values" autocomplete="off" spellcheck="false">'+
      '<div class="rs-plinks"><button type="button" class="rs-plink" data-pall>Select all</button><button type="button" class="rs-plink" data-pnone>Clear</button><span class="rs-pcount"></span></div>'+
      '<div class="rs-plist"></div><div class="rs-pfoot"><button type="button" class="rs-pbtn" data-pcancel>Cancel</button><button type="button" class="rs-pbtn primary" data-pok>OK</button></div>';
    const list=el.querySelector('.rs-plist'),ps=el.querySelector('.rs-psearch'),cnt=el.querySelector('.rs-pcount');
    const shown=()=>{const q=String(ps.value||'').toUpperCase();return vals.filter(x=>!q||String(x.v).toUpperCase().indexOf(q)>=0);};
    const draw=()=>{
      const sh=shown();
      list.innerHTML=sh.slice(0,500).map(x=>`<label class="rs-pv${on.get(x.v)?' is-on':''}"><input type="checkbox" data-pi="${vals.indexOf(x)}"${on.get(x.v)?' checked':''}><span>${escapeHtml(x.v||'(Blanks)')}</span><b>${Number(x.n||0).toLocaleString('en-AU')}</b></label>`).join('')||'<div class="rs-pnone">No values match.</div>';
      const n=vals.filter(x=>on.get(x.v)).length;cnt.textContent=`${n} of ${vals.length}`;el.querySelector('[data-pok]').disabled=!n;
    };
    el.addEventListener('change',ev=>{const cb=ev.target.closest('[data-pi]');if(!cb)return;on.set(vals[+cb.dataset.pi].v,cb.checked);draw();});
    el.addEventListener('click',ev=>{
      const s=ev.target.closest('[data-psort]');if(s){closeColPicker();o.onSort(+s.dataset.psort);return;}
      if(ev.target.closest('[data-pall]')){shown().forEach(x=>on.set(x.v,true));draw();return;}
      if(ev.target.closest('[data-pnone]')){shown().forEach(x=>on.set(x.v,false));draw();return;}
      if(ev.target.closest('[data-pcancel]')){closeColPicker();return;}
      if(ev.target.closest('[data-pok]')){const pick=vals.filter(x=>on.get(x.v)).map(x=>x.v);closeColPicker();o.onApply(pick.length===vals.length?null:pick);}
    });
    el.addEventListener('keydown',ev=>{if(ev.key==='Escape'){ev.stopPropagation();closeColPicker();}if(ev.key==='Enter'&&ev.target===ps)ev.preventDefault();ev.stopPropagation();});
    ps.oninput=draw;document.body.appendChild(el);draw();
    const r=o.anchor?o.anchor.getBoundingClientRect():{left:20,bottom:20,right:20},w=el.offsetWidth||300,h=el.offsetHeight||360;
    el.style.left=`${Math.max(6,Math.min(r.right-w,global.innerWidth-w-6))}px`;el.style.top=`${Math.max(6,Math.min(r.bottom+4,global.innerHeight-h-6))}px`;
    const away=ev=>{if(colPk&&!colPk.el.contains(ev.target)&&!(o.anchor&&o.anchor.contains(ev.target)))closeColPicker();};
    colPk={el,away,key:o.key};document.addEventListener('mousedown',away,true);ps.focus();
  }
  function openColFilter(key,btn){
    if(colPk&&colPk.key===key){closeColPicker();return;}
    const c=POS_VIEW_COLUMNS.find(x=>x.key===key);if(!c)return;
    const counts=new Map(),details=posDetailMap(),rows=sortedPosRows();
    rows.forEach((pos,i)=>{const v=posFilterText(pos,c,details.get(posSrcKey(pos))||posDetailAt(i));counts.set(v,(counts.get(v)||0)+1);});
    const values=[...counts.entries()].sort((a,b)=>b[1]-a[1]||posSortCollator.compare(a[0],b[0])).map(([v,n])=>({v,n}));
    const numeric=c.kind==='number'||c.kind==='qtytotal',dir=state.posSortExplicit&&state.posSortKey===key?(state.posSortDir==='desc'?-1:1):0;
    colPicker({key,anchor:btn,title:String(c.label).replace(/​/g,''),values,selected:state.colFilters.get(key)||null,sort:{numeric,dir},
      onSort:d=>{if(!d){state.posSortKey='__pos_order_index';state.posSortDir='asc';state.posSortExplicit=false;}else{state.posSortKey=key;state.posSortDir=d<0?'desc':'asc';state.posSortExplicit=true;}renderPosTable();},
      onApply:vals=>{if(vals)state.colFilters.set(key,new Set(vals));else state.colFilters.delete(key);if(els.tableWrap)els.tableWrap.scrollTop=0;renderPosTable();}});
  }
  function renderColFilterChips(){
    const host=document.querySelector('#posColFilters');if(!host)return;
    const list=state.previewView==='pos'?[...state.colFilters.entries()]:[];host.hidden=!list.length;
    host.innerHTML=list.map(([k,set])=>{const c=POS_VIEW_COLUMNS.find(x=>x.key===k),label=c?String(c.label).replace(/​/g,''):k,v=[...set];
      return `<button type="button" class="rs-fchip" data-fx="${escapeHtml(k)}" title="Remove this filter">${escapeHtml(v.length===1?`${label}: ${v[0]||'(Blanks)'}`:`${label}: ${v.length} values`)} ✕</button>`;}).join('');
  }
  {const host=document.querySelector('#posColFilters');if(host)host.addEventListener('click',e=>{const b=e.target.closest('[data-fx]');if(!b)return;state.colFilters.delete(b.dataset.fx);if(state.previewView==='pos')renderPosTable();else applyTableSearch();});}

  // ------------------------------------------------------------------ cell selection, editing, copy / paste, fill down
  function selColumns(){return POS_VIEW_COLUMNS.map((c,i)=>SEL_KINDS.has(c.kind)?i:-1).filter(i=>i>=0);}
  function gridRows(){return els.tableBody?[...els.tableBody.querySelectorAll('tr[data-pos-src]:not(.search-miss)')]:[];}
  function gridLook(src){return state.posRowLookup.get(String(src))||null;}
  function selRect(rows=gridRows()){
    const s=state.cellSel;if(!s||state.previewView!=='pos')return null;
    const ri=src=>rows.findIndex(tr=>tr.dataset.posSrc===src),a=ri(s.a.src),f=ri(s.f.src);if(a<0||f<0)return null;
    return {rows,r1:Math.min(a,f),r2:Math.max(a,f),c1:Math.min(s.a.col,s.f.col),c2:Math.max(s.a.col,s.f.col)};
  }
  function rectCols(r){return selColumns().filter(i=>i>=r.c1&&i<=r.c2);}
  function editableIndex(i){const c=POS_VIEW_COLUMNS[i];return !!c&&ADJ_EDIT_KEYS.has(c.key);}
  function paintSel(){
    if(!els.tableBody)return;
    els.tableBody.querySelectorAll('td.cs-sel,td.cs-anchor,td.cs-fill').forEach(td=>td.classList.remove('cs-sel','cs-anchor','cs-fill'));
    els.tableBody.querySelectorAll('.rs-fill').forEach(x=>x.remove());
    const r=selRect();if(!r){renderEditTools();return;}
    const cols=rectCols(r);
    for(let i=r.r1;i<=r.r2;i++){const tr=r.rows[i];for(const ci of cols){const td=tr.children[ci];if(td)td.classList.add('cs-sel');}}
    const atr=r.rows.find(tr=>tr.dataset.posSrc===state.cellSel.a.src),atd=atr&&atr.children[state.cellSel.a.col];if(atd)atd.classList.add('cs-anchor');
    const ed=cols.filter(editableIndex);
    if(ed.length){const td=r.rows[r.r2].children[ed[ed.length-1]];if(td){const h=document.createElement('span');h.className='rs-fill';h.title='Drag down to fill (Ctrl + D fills down the selection)';td.appendChild(h);}}
    renderEditTools();
  }
  function setSel(a,f,{scroll=true}={}){
    state.cellSel={a,f:f||a};paintSel();
    if(scroll){const tr=gridRows().find(x=>x.dataset.posSrc===state.cellSel.f.src),td=tr&&tr.children[state.cellSel.f.col];if(td)td.scrollIntoView({block:'nearest',inline:'nearest'});}
  }
  function cellText(src,ci){const look=gridLook(src),c=POS_VIEW_COLUMNS[ci];return look&&c?posFilterText(look.pos,c,look.detail):'';}
  function copySel(){const r=selRect();if(!r)return '';const cols=rectCols(r),out=[];for(let i=r.r1;i<=r.r2;i++)out.push(cols.map(ci=>cellText(r.rows[i].dataset.posSrc,ci)).join('\t'));return out.join('\r\n');}
  function copyText(txt){
    const legacy=()=>{const ta=document.createElement('textarea'),prev=document.activeElement;ta.value=txt;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');}catch(_){}ta.remove();if(prev&&prev.focus)prev.focus({preventScroll:true});};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).catch(legacy);else legacy();
  }
  function parseEditNumber(text){const t=String(text??'').replace(/[$,\s]/g,'');if(!t)return {blank:true};const v=Number(t);return Number.isFinite(v)&&v>=0?{value:v}:{bad:true};}
  // Apply a set of changes as one undo step. Each change: {src, key, value} — value null puts the original back.
  function applyAdjEdits(changes,{say=true}={}){
    const batch=new Map(),qtyRows=new Set();let priceChanged=false,n=0;
    const snap=src=>{
      if(batch.has(src))return;const look=gridLook(src),k=look?unpackIdentity(look.pos):'';
      batch.set(src,{src,price:state.adjEdits.has(src)?{...state.adjEdits.get(src)}:null,k,qty:k?{edit:state.adjQtyEdits.has(k)?state.adjQtyEdits.get(k):undefined,had:state.unpackCounts.has(k),count:state.unpackCounts.get(k),checked:state.unpackChecked.has(k),manual:state.unpackManualChecked.has(k)}:null});
    };
    for(const ch of changes){
      const look=gridLook(ch.src);if(!look||!ADJ_EDIT_KEYS.has(ch.key))continue;snap(ch.src);n++;
      if(ch.key==='or_qty'){
        const k=unpackIdentity(look.pos),expected=unpackExpectedQty(look.pos,look.detail);qtyRows.add(ch.src);
        if(ch.value==null){const prev=state.adjQtyEdits.get(k);if(prev){if(prev.had)state.unpackCounts.set(k,prev.count);else state.unpackCounts.delete(k);if(prev.checked)state.unpackChecked.add(k);else state.unpackChecked.delete(k);if(prev.manual)state.unpackManualChecked.add(k);else state.unpackManualChecked.delete(k);}state.adjQtyEdits.delete(k);continue;}
        if(!state.adjQtyEdits.has(k))state.adjQtyEdits.set(k,{had:state.unpackCounts.has(k),count:state.unpackCounts.get(k),checked:state.unpackChecked.has(k),manual:state.unpackManualChecked.has(k)});
        const total=Math.max(0,Math.round(Number(ch.value)*1000)/1000);state.unpackCounts.set(k,total);   // the same as typing it in Found
        const complete=state.unpackManualChecked.has(k)||(Math.abs(total)<=.0005&&Number(expected)>.0005)||receivingCountComplete(total,expected);
        if(complete)state.unpackChecked.add(k);else state.unpackChecked.delete(k);
        continue;
      }
      priceChanged=true;const e={...(state.adjEdits.get(ch.src)||{})},field=ch.key==='adjwsprce'?'ws':'unit';
      if(ch.value==null)delete e[field];else e[field]=field==='ws'?Math.round(Number(ch.value)*100)/100:Math.round(Number(ch.value)*10000)/10000;
      if(e.ws==null&&e.unit==null)state.adjEdits.delete(ch.src);else state.adjEdits.set(ch.src,e);
    }
    if(!n)return 0;
    state.adjUndo.push([...batch.values()]);if(state.adjUndo.length>100)state.adjUndo.shift();
    if(qtyRows.size){saveUnpackCounts();saveUnpackChecklist();}
    if(say){const restored=changes.every(ch=>ch.value==null);setStatus(restored?`${n} cell${n===1?'':'s'} put back to the original value.`:`${n} cell${n===1?'':'s'} changed — the POSActive TXT and the totals use the new values. Ctrl + Z undoes.`,'info');}
    if(priceChanged)renderPosTable();
    else{for(const src of qtyRows)refreshQtyRow(src);paintSel();refreshLiveTotals();scheduleReceivingRender();}   // Adj Qty = Found: rows move after the usual short delay · v2.22.0 totals at once
    return n;
  }
  function refreshQtyRow(src){
    const tr=els.tableBody&&[...els.tableBody.querySelectorAll('tr[data-pos-src]')].find(x=>x.dataset.posSrc===String(src)),look=gridLook(src);if(!tr||!look)return;
    const ci=POS_VIEW_COLUMNS.findIndex(c=>c.key==='or_qty'),c=POS_VIEW_COLUMNS[ci],td=tr.children[ci],k=unpackIdentity(look.pos),v=posColumnValue(look.pos,c,look.detail);
    if(td){const ed=adjCellEdited(look.pos,'or_qty');td.textContent=fixed(v,posCellDp(look.pos,c,v));td.classList.remove('is-edited','qty-over','qty-under','qty-exact');if(ed)td.className=`${td.className} ${editedCellCls(look.pos,c,look.detail,v).trim()}`.replace(/\s+/g,' ');td.title=adjCellTitle(look.pos,c,look.detail,v);}   // v2.20.0
    refreshCheckCell(tr,look.pos,look.detail);
    {const ed=['adjwsprce','adjcatprce','or_qty'].some(k=>adjCellEdited(look.pos,k)),ci2=POS_VIEW_COLUMNS.findIndex(x=>x.key==='__pos_order_index'),idx=tr.children[ci2];tr.classList.toggle('pos-row-edited',ed);   // v2.20.0: the orange POS Index at once
     if(idx){const pill=idx.querySelector('.pos-edited-pill');if(ed&&!pill)idx.innerHTML=`<span class="pos-edited-pill" title="You changed a price or Adj Qty on this line">${idx.innerHTML}</span>`;else if(!ed&&pill)idx.innerHTML=pill.innerHTML;}}
    const out=tr.querySelector('.unpack-qty-total');if(out)updateUnpackTotalElement(out,k,unpackCountFor(look.pos),unpackExpectedQty(look.pos,look.detail));
    updateRowSelectionVisual(tr,state.unpackChecked.has(k));updateManualReceivedVisual(tr,unpackCountFor(look.pos));
  }
  // v2.20.0 — the Check cell follows a count / change at once (the row's full re-render follows after the short pause)
  function refreshCheckCell(tr,pos,detail){
    if(!tr||!pos)return;const ci=POS_VIEW_COLUMNS.findIndex(c=>c.kind==='status'),td=tr.children[ci];if(!td)return;const ck=lineCheck(pos,detail);
    td.innerHTML=`<span class="pos-check-chip ck-${ck.kind}">${escapeHtml(ck.label)}</span>`;td.title=ck.title;tr.dataset.check=ck.kind;
    const ti=POS_VIEW_COLUMNS.findIndex(c=>c.key==='__row_total_inc_gst'),tt=tr.children[ti];if(tt)tt.textContent=fixed(posRowTotalIncGst(pos,detail),2);   // v2.22.0: the row total too
  }
  // v2.22.0 — the footer totals, Found total, progress, POSActive balance and the summary chips, straight after a tick / count /
  // change (the rows still move after the usual short pause).
  function refreshLiveTotals(){
    if(state.previewView!=='pos'||!els.tableFoot||!state.result)return;
    const rows=sortedPosRows(),d=posDetailMap(),totals=posTotals(rows,d);
    const block=els.tableFoot.querySelector('td.pos-total-block');if(block)block.outerHTML=posTotalsBlock(totals,block.colSpan);
    const fv=els.tableFoot.querySelector('.pos-found-total-value');if(fv)fv.textContent=displayUnpackCount(rows.reduce((a,p)=>a+(state.unpackCounts.has(unpackIdentity(p))?unpackCountFor(p):0),0));
    const prog=updateChecklistUi(rows,d),pe=els.tableFoot.querySelector('[data-check-progress]');if(pe)pe.textContent=`accounted ${prog.checked}/${prog.total} · unchecked ${prog.remaining}`;
    renderPosBalance(totals);
    if(state.lastSummaryArgs&&state.lastSummaryArgs[0]===state.result)renderSummary(...state.lastSummaryArgs);
  }
  function undoAdjEdit(){
    const batch=state.adjUndo.pop();if(!batch){setStatus('Nothing to undo.','info');return;}
    for(const b of batch){
      if(b.price)state.adjEdits.set(b.src,b.price);else state.adjEdits.delete(b.src);
      if(b.qty&&b.k){const q=b.qty;if(q.edit!==undefined)state.adjQtyEdits.set(b.k,q.edit);else state.adjQtyEdits.delete(b.k);
        if(q.had)state.unpackCounts.set(b.k,q.count);else state.unpackCounts.delete(b.k);
        if(q.checked)state.unpackChecked.add(b.k);else state.unpackChecked.delete(b.k);
        if(q.manual)state.unpackManualChecked.add(b.k);else state.unpackManualChecked.delete(b.k);}
    }
    saveUnpackCounts();saveUnpackChecklist();setStatus(`Undone — ${batch.length} row${batch.length===1?'':'s'} back as before.`,'info');renderPosTable();
  }
  function clearAdjEdits(){
    const changes=[];for(const src of state.adjEdits.keys()){changes.push({src,key:'adjwsprce',value:null},{src,key:'adjcatprce',value:null});}
    for(const [src,look] of state.posRowLookup)if(state.adjQtyEdits.has(unpackIdentity(look.pos)))changes.push({src,key:'or_qty',value:null});
    if(changes.length)applyAdjEdits(changes,{say:false});setStatus('Every changed price and Adj Qty is back to its original value (Ctrl + Z undoes).','info');
  }
  function renderEditTools(){
    const box=document.querySelector('#posEditTools');if(!box)return;
    let qty=0;for(const look of state.posRowLookup.values())if(adjCellEdited(look.pos,'or_qty'))qty++;
    const rows=new Set(state.adjEdits.keys());for(const [src,look] of state.posRowLookup)if(adjCellEdited(look.pos,'or_qty'))rows.add(src);
    box.hidden=state.previewView!=='pos'||(!rows.size&&!state.adjUndo.length);
    const count=box.querySelector('[data-adj-count]');if(count){count.textContent=rows.size?`${rows.size} row${rows.size===1?'':'s'} changed`:'No changes';count.classList.toggle('is-on',state.checkFilter==='edited');count.disabled=!rows.size;}   // v2.20.0: click = show only those rows
    const u=box.querySelector('[data-adj-undo]');if(u)u.disabled=!state.adjUndo.length;
    const c=box.querySelector('[data-adj-clear]');if(c)c.disabled=!rows.size;
  }
  {const box=document.querySelector('#posEditTools');if(box)box.addEventListener('click',e=>{if(e.target.closest('[data-adj-undo]'))undoAdjEdit();else if(e.target.closest('[data-adj-clear]'))clearAdjEdits();});}
  function selEditableCells(r=selRect()){if(!r)return [];const out=[];const cols=rectCols(r).filter(editableIndex);for(let i=r.r1;i<=r.r2;i++)for(const ci of cols)out.push({src:r.rows[i].dataset.posSrc,ci,key:POS_VIEW_COLUMNS[ci].key});return out;}
  function cellNumber(src,ci){const look=gridLook(src),c=POS_VIEW_COLUMNS[ci];return look&&c?numberValue(posColumnValue(look.pos,c,look.detail)):null;}
  function fillDown(r,toRow){
    // Copy the selected rows' values (repeating) into the rows below, editable columns only.
    const cols=rectCols(r).filter(editableIndex),h=r.r2-r.r1+1,changes=[];
    const last=toRow!=null?toRow:r.r2,first=toRow!=null?r.r2+1:r.r1+1,srcRows=toRow!=null?h:1;
    for(let i=first;i<=last;i++)for(const ci of cols){const from=r.rows[r.r1+((i-first)%srcRows)].dataset.posSrc,v=cellNumber(from,ci);changes.push({src:r.rows[i].dataset.posSrc,key:POS_VIEW_COLUMNS[ci].key,value:v});}
    if(!changes.length){setStatus('Fill down works on Adj WSPrc, Adj CatPrc, Adj DPrc and Adj Qty.','info');return;}
    applyAdjEdits(changes.filter(ch=>ch.value!=null));
  }
  function pasteText(txt){
    const r=selRect();if(!r)return;
    const lines=String(txt).replace(/\r\n?/g,'\n').replace(/\n$/,'').split('\n').map(l=>l.split('\t'));
    const sel=selColumns(),startCol=Math.max(0,sel.indexOf(r.c1)),changes=[];let bad=0,skipped=0;
    const add=(src,ci,text)=>{if(!editableIndex(ci)){skipped++;return;}const p=parseEditNumber(text);if(p.bad){bad++;return;}changes.push({src,key:POS_VIEW_COLUMNS[ci].key,value:p.blank?null:p.value});};
    if(lines.length===1&&lines[0].length===1){for(const cell of selEditableCells(r))add(cell.src,cell.ci,lines[0][0]);if(!selEditableCells(r).length)skipped++;}
    else for(let i=0;i<lines.length;i++){const tr=r.rows[r.r1+i];if(!tr)break;for(let j=0;j<lines[i].length;j++){const ci=sel[startCol+j];if(ci==null)break;add(tr.dataset.posSrc,ci,lines[i][j]);}}
    const n=changes.length?applyAdjEdits(changes,{say:false}):0;
    setStatus(n?`Pasted into ${n} cell${n===1?'':'s'} — the POSActive TXT and the totals use the new values. Ctrl + Z undoes.${bad?` ${bad} value${bad===1?' was':'s were'} not a number and left out.`:''}${skipped?' Only Adj WSPrc, Adj CatPrc, Adj DPrc and Adj Qty take pasted values.':''}`:`Nothing pasted.${bad?` ${bad} value${bad===1?' was':'s were'} not a number.`:''} Only Adj WSPrc, Adj CatPrc, Adj DPrc and Adj Qty take pasted values.`,n?'info':'warn');
  }
  let cellEditor=null;
  function startCellEdit(initial){
    const r=selRect();if(!r)return;const s=state.cellSel.f;if(!editableIndex(s.col)){setStatus('Only Adj WSPrc, Adj CatPrc, Adj DPrc and Adj Qty can be changed here.','info');return;}
    const tr=r.rows.find(x=>x.dataset.posSrc===s.src),td=tr&&tr.children[s.col],look=gridLook(s.src);if(!td||!look)return;
    const c=POS_VIEW_COLUMNS[s.col],v=posColumnValue(look.pos,c,look.detail),inp=document.createElement('input');
    inp.type='text';inp.className='rs-cell-input';inp.inputMode='decimal';inp.autocomplete='off';inp.spellcheck=false;inp.setAttribute('aria-label',`Change ${String(c.label).replace(/​/g,'')}`);
    inp.value=initial!=null?initial:(numberValue(v)!=null?fixed(v,posCellDp(look.pos,c,v)):'');
    td.classList.add('is-editing');td.appendChild(inp);cellEditor={inp,td,src:s.src,ci:s.col,done:false};
    inp.focus();if(initial==null)inp.select();else inp.setSelectionRange(inp.value.length,inp.value.length);
    const finish=(commit,move)=>{
      if(!cellEditor||cellEditor.inp!==inp||cellEditor.done)return;cellEditor.done=true;
      const ed=cellEditor;cellEditor=null;let target=null;
      if(move){const rows=gridRows(),ri=rows.findIndex(x=>x.dataset.posSrc===ed.src),sel=selColumns(),ci=sel.indexOf(ed.ci);
        if(move==='down'&&rows[ri+1])target={src:rows[ri+1].dataset.posSrc,col:ed.ci};else if(move==='up'&&rows[ri-1])target={src:rows[ri-1].dataset.posSrc,col:ed.ci};
        else if(move==='right'&&sel[ci+1]!=null)target={src:ed.src,col:sel[ci+1]};else if(move==='left'&&sel[ci-1]!=null)target={src:ed.src,col:sel[ci-1]};}
      inp.remove();td.classList.remove('is-editing');
      if(commit){const p=parseEditNumber(inp.value);if(p.bad)setStatus(`"${inp.value}" is not a number of 0 or more — the cell is unchanged.`,'warn');else applyAdjEdits([{src:ed.src,key:POS_VIEW_COLUMNS[ed.ci].key,value:p.blank?null:p.value}]);}
      if(target)setSel(target);else paintSel();
      if(els.tableWrap)els.tableWrap.focus({preventScroll:true});
    };
    inp.addEventListener('keydown',e=>{
      e.stopPropagation();
      if(e.key==='Enter'){e.preventDefault();finish(true,e.shiftKey?'up':'down');}
      else if(e.key==='Tab'){e.preventDefault();finish(true,e.shiftKey?'left':'right');}
      else if(e.key==='Escape'){e.preventDefault();finish(false,null);}
    });
    inp.addEventListener('blur',()=>finish(true,null));
    inp.addEventListener('mousedown',e=>e.stopPropagation());
  }
  let gridWired=false,dragSel=false,filling=null;
  function wireGrid(){
    if(gridWired||!els.tableWrap||!els.tableBody)return;gridWired=true;
    if(!els.tableWrap.hasAttribute('tabindex'))els.tableWrap.setAttribute('tabindex','-1');
    const cellAt=target=>{const td=target&&target.closest&&target.closest('td');const tr=td&&td.parentElement;if(!td||!tr||!tr.dataset||tr.dataset.posSrc==null||state.previewView!=='pos')return null;const ci=td.cellIndex,c=POS_VIEW_COLUMNS[ci];return c&&SEL_KINDS.has(c.kind)?{src:tr.dataset.posSrc,col:ci,td,tr}:null;};
    els.tableBody.addEventListener('mousedown',e=>{
      if(e.button!==0||state.previewView!=='pos')return;
      if(e.target.classList&&e.target.classList.contains('rs-fill')){const r=selRect();if(r){e.preventDefault();e.stopPropagation();filling={r,to:r.r2};}return;}
      if(e.target.closest('input,button,a,select,textarea,label,.pos-sort-button,.pos-filt'))return;
      const cell=cellAt(e.target);if(!cell)return;
      e.preventDefault();if(cellEditor)cellEditor.inp.blur();
      if(e.shiftKey&&state.cellSel)setSel(state.cellSel.a,{src:cell.src,col:cell.col},{scroll:false});else setSel({src:cell.src,col:cell.col},null,{scroll:false});
      dragSel=true;els.tableWrap.focus({preventScroll:true});
    });
    els.tableBody.addEventListener('mouseover',e=>{
      if(filling){const tr=e.target.closest&&e.target.closest('tr[data-pos-src]');if(!tr)return;const i=filling.r.rows.indexOf(tr);if(i<0)return;filling.to=Math.max(filling.r.r2,i);
        els.tableBody.querySelectorAll('td.cs-fill').forEach(td=>td.classList.remove('cs-fill'));const cols=rectCols(filling.r).filter(editableIndex);
        for(let k=filling.r.r2+1;k<=filling.to;k++)for(const ci of cols){const td=filling.r.rows[k].children[ci];if(td)td.classList.add('cs-fill');}return;}
      if(!dragSel||!state.cellSel)return;const cell=cellAt(e.target);if(cell&&(cell.src!==state.cellSel.f.src||cell.col!==state.cellSel.f.col))setSel(state.cellSel.a,{src:cell.src,col:cell.col},{scroll:false});
    });
    document.addEventListener('mouseup',()=>{
      dragSel=false;if(!filling)return;const f=filling;filling=null;els.tableBody.querySelectorAll('td.cs-fill').forEach(td=>td.classList.remove('cs-fill'));
      if(f.to>f.r.r2){fillDown(f.r,f.to);const rows=gridRows(),last=f.r.rows[f.to];if(last&&rows.includes(last))setSel(state.cellSel.a,{src:last.dataset.posSrc,col:state.cellSel.f.col},{scroll:false});}
    });
    els.tableBody.addEventListener('dblclick',e=>{const cell=cellAt(e.target);if(!cell||e.target.closest('input,button'))return;setSel({src:cell.src,col:cell.col},null,{scroll:false});startCellEdit(null);});
    els.tableWrap.addEventListener('keydown',e=>{
      if(e.target!==els.tableWrap||!state.cellSel||state.previewView!=='pos')return;
      const r=selRect();if(!r){state.cellSel=null;return;}
      const mod=e.ctrlKey||e.metaKey,sel=selColumns(),f=state.cellSel.f,ri=r.rows.findIndex(x=>x.dataset.posSrc===f.src),ci=sel.indexOf(f.col);
      const go=(dr,dc,extend=e.shiftKey)=>{const nr=Math.max(0,Math.min(r.rows.length-1,ri+dr)),nc=sel[Math.max(0,Math.min(sel.length-1,ci+dc))],to={src:r.rows[nr].dataset.posSrc,col:nc};if(extend)setSel(state.cellSel.a,to);else setSel(to);};
      if(e.key==='ArrowDown'){e.preventDefault();go(1,0);return;}
      if(e.key==='ArrowUp'){e.preventDefault();go(-1,0);return;}
      if(e.key==='ArrowRight'){e.preventDefault();go(0,1);return;}
      if(e.key==='ArrowLeft'){e.preventDefault();go(0,-1);return;}
      if(e.key==='Tab'){e.preventDefault();go(0,e.shiftKey?-1:1,false);return;}
      if(e.key==='Escape'){state.cellSel=null;paintSel();return;}
      if(mod&&(e.key==='c'||e.key==='C')){e.preventDefault();const t=copySel();copyText(t);const n=(r.r2-r.r1+1)*rectCols(r).length;setStatus(`Copied ${n} cell${n===1?'':'s'}.`,'info');return;}
      if(mod&&(e.key==='z'||e.key==='Z')){e.preventDefault();undoAdjEdit();return;}
      if(mod&&(e.key==='d'||e.key==='D')){e.preventDefault();if(r.r2>r.r1)fillDown(r,null);else setStatus('Select the cell to copy and the cells below it, then Ctrl + D.','info');return;}
      if(mod&&(e.key==='a'||e.key==='A')){e.preventDefault();const s=selColumns();setSel({src:r.rows[0].dataset.posSrc,col:s[0]},{src:r.rows[r.rows.length-1].dataset.posSrc,col:s[s.length-1]},{scroll:false});return;}
      if(e.key==='Enter'||e.key==='F2'){e.preventDefault();if(editableIndex(f.col))startCellEdit(null);else go(e.shiftKey?-1:1,0,false);return;}
      if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();const cells=selEditableCells(r);if(cells.length)applyAdjEdits(cells.map(x=>({src:x.src,key:x.key,value:null})));return;}
      if(!mod&&!e.altKey&&e.key.length===1&&e.key!==' '){
        if(editableIndex(f.col)&&r.r1===r.r2&&rectCols(r).length===1){e.preventDefault();startCellEdit(e.key);}
        else if(!editableIndex(f.col)){const c=POS_VIEW_COLUMNS[f.col];setStatus(c&&c.key==='adjrrprce'?'Adj RRPrc is not in the POSActive import, so it is not changed here. Adj WSPrc, Adj CatPrc, Adj DPrc and Adj Qty can be changed.':'Only Adj WSPrc, Adj CatPrc, Adj DPrc and Adj Qty can be changed in the checklist.','info');}
      }
    });
    els.tableWrap.addEventListener('paste',e=>{
      if(e.target!==els.tableWrap||!state.cellSel||state.previewView!=='pos')return;
      const txt=e.clipboardData&&e.clipboardData.getData('text/plain');if(!txt)return;e.preventDefault();pasteText(txt);
    });
    els.tableWrap.addEventListener('copy',e=>{
      if(e.target!==els.tableWrap||!state.cellSel)return;const t=copySel();if(!t)return;e.clipboardData.setData('text/plain',t);e.preventDefault();
    });
  }
  function renderPreview(r){if(state.previewView==='pos')renderPosTable();else{closeColPicker();renderReconTable(r);}setViewButtons();applyTableSearch();renderEditTools();}
  // v2.11.3 — search over the rows on the page: every word must appear in the row's text (cells, inputs, pills)
  function rowSearchText(tr){const parts=[tr.textContent||''];tr.querySelectorAll('input,textarea,select').forEach(i=>{parts.push(i.value||'');});tr.querySelectorAll('[title]').forEach(e=>{parts.push(e.getAttribute('title')||'');});return parts.join(' ').toLowerCase().replace(/\s+/g,' ');}
  function applyTableSearch(){
    const box=document.querySelector('#tableSearch'),count=document.querySelector('#tableSearchCount');if(!box||!els.tableBody)return;
    const words=String(box.value||'').toLowerCase().split(/\s+/).filter(Boolean),on=words.length>0;
    const fk=state.checkFilter||null;   // v2.17.0: a filter chip shows only the lines with that Check (inv = not on the POS order)
    // v2.18.0: the column filters from the heading menus (POS layout only)
    const cf=state.previewView==='pos'?[...state.colFilters.entries()].map(([k,set])=>({c:POS_VIEW_COLUMNS.find(x=>x.key===k),set})).filter(x=>x.c):[];
    const colHit=tr=>{if(!cf.length)return true;const look=state.posRowLookup.get(tr.dataset.posSrc||'');if(!look)return true;return cf.every(f=>f.set.has(posFilterText(look.pos,f.c,look.detail)));};
    els.table.classList.toggle('is-searching',on||!!fk||cf.length>0);
    let shown=0,total=0;
    for(const tr of els.tableBody.querySelectorAll('tr')){
      if(tr.classList.contains('pos-fix-note'))continue;   // v2.22.0: set after the loop, from its line
      if(tr.classList.contains('pos-fix-ref')||tr.classList.contains('pos-section-fix')){tr.classList.toggle('search-miss',on||!!fk||cf.length>0);continue;}   // v2.21.0: the Fix copies hide while searching / filtering
      const dataRow=!tr.classList.contains('pos-section-row')&&!tr.classList.contains('pos-total-row')&&!tr.querySelector('td[colspan]');
      if(!dataRow){tr.classList.remove('search-miss');continue;}
      total++;
      const hit=(!on||(()=>{const t=rowSearchText(tr);return words.every(w=>t.indexOf(w)>=0);})())&&(!fk||(fk==='inv'?tr.classList.contains('pos-invoice-only'):fk==='fix'?tr.dataset.fix==='1':fk==='edited'?tr.classList.contains('pos-row-edited'):tr.dataset.check===fk))&&colHit(tr);
      tr.classList.toggle('search-miss',!hit);if(hit)shown++;
    }
    if(count)count.textContent=on||fk||cf.length?`${shown} of ${total}`:'';
    for(const n of els.tableBody.querySelectorAll('tr.pos-fix-note')){const row=n.nextElementSibling;n.classList.toggle('search-miss',!!(row&&row.classList.contains('search-miss')));}   // v2.22.0
    renderColFilterChips();if(state.previewView==='pos')paintSel();
  }
  {const box=document.querySelector('#tableSearch');if(box){let t=0;box.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(applyTableSearch,80);});box.addEventListener('keydown',e=>{if(e.key==='Escape'){box.value='';applyTableSearch();}});}}

  // v2.19.0 — the result in a few lines: the summary card (#rsGlance), Action needed (#rsNeeds, hidden when nothing needs a fix),
  // the checks line (#rsChecks, only when a check needs you) and the Details fold (#rsMore: money #rsMoney, the POSActive balance
  // #posBalancePanel, review notes, order link, import keys, how the checklist works). Display only.
  function notInvoicedValue(pos){
    const raw=(pos&&pos.raw)||{},qty=numberValue(raw.qty)??numberValue(pos&&pos.orderedQty)??0,price=numberValue(raw.last_price)??numberValue(pos&&pos.expectedUnit);
    const gst=Math.max(0,numberValue(raw.gst_tax_pc)??numberValue(pos&&pos.gstPct)??0);return price==null?null:Math.round(price*qty*(1+gst/100)*100)/100;
  }
  // The POSActive Sub ID problems of an invoiced order line (the same rules as the review notes: % $ " dropped, blank, shared).
  function importIssues(items){
    const out=new Map(),add=(k,chip,note)=>{if(!out.has(k))out.set(k,[]);out.get(k).push({chip,note});},byKey=new Map();
    for(const x of items){
      if(x.inv||!x.detail||Number(x.detail.suppliedQty||0)<=0)continue;
      const k=String(x.pos.sourceRow),raw=typeof x.pos.subIdRaw==='string'?x.pos.subIdRaw:cleanText(x.pos.subId),sub=cleanText(x.pos.subId),special=[...new Set(String(sub).match(/["$%]/g)||[])];
      if(sub&&special.length)add(k,"POSACTIVE CAN'T IMPORT",`Its POS Sub ID "${sub}" contains ${special.join(' ')}, which POSActive drops on import. Change the Sub ID in POSActive (e.g. to CH2 code ${ch2ItemCodeDisplay(x.detail)||'the CH2 code'}), re-export the order and reconcile again — or apply this line by hand.`);
      if(!String(raw).trim())add(k,'BLANK SUB ID','No Sub ID on the POS order, so POSActive cannot match this line. Set a Sub ID in POSActive (e.g. the CH2 code) and re-export the order.');
      else{if(!byKey.has(raw))byKey.set(raw,[]);byKey.get(raw).push(k);}
    }
    for(const [key,ks] of byKey)if(ks.length>1)ks.forEach(k=>add(k,'SHARED SUB ID',`Sub ID "${key}" is shared by ${ks.length} invoiced products; POSActive puts them all on the first of these rows. Give each its own Sub ID.`));
    return out;
  }
  function renderSummary(r,integ,notes){
    const glance=document.querySelector('#rsGlance'),needs=document.querySelector('#rsNeeds'),checks=document.querySelector('#rsChecks'),more=document.querySelector('#rsMore');
    if(!glance||!needs||!checks||!r)return;
    const rows=sortedPosRows(),map=posDetailMap(),items=rows.map((pos,i)=>{const detail=map.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||posDetailAt(i);return {pos,detail,ck:lineCheck(pos,detail),inv:!!(pos&&pos.invoiceOnly)};});
    const issues=importIssues(items),sgn=v=>`${v>0?'+':v<0?'−':''}$${Math.abs(v).toFixed(2)}`,cnt=v=>displayUnpackCount(v);
    const idx=x=>x.inv?'INV':String(Number(x.pos&&x.pos.posIndex)||'');
    const counts={};items.forEach(x=>{counts[x.ck.kind]=(counts[x.ck.kind]||0)+1;});const invItems=items.filter(x=>x.inv);
    const NAMES={fix:'Fix in POSActive',ok:'OK',better:'Better price',high:'Price high',disc:'Discount low',ws:'Wholesale only',short:'Short',over:'Over',notinv:'Not invoiced',nocheck:'No check',inv:'Not on POS order'};
    // v2.19.0 — one summary card: the chips carry the $ over / under for their lines; a chip filters the checklist.
    const kindSum=k=>items.filter(x=>x.ck.kind===k).reduce((t,x)=>t+(x.ck.effect||0),0);
    const chip=(k,n)=>{const v=k==='high'||k==='better'?kindSum(k):0;return `<button type="button" class="rs-chip ck-${k}${state.checkFilter===k?' is-on':''}" data-check-filter="${k}" aria-pressed="${state.checkFilter===k?'true':'false'}" title="Show only these lines in the checklist">${escapeHtml(NAMES[k])} · ${n}${Math.abs(v)>0.004?` · ${escapeHtml(sgn(v))}`:''}</button>`;};
    const fixN=state.fixMap?state.fixMap.size:0;
    const chips=(fixN?chip('fix',fixN):'')+['ok','better','high','disc','ws','short','over','notinv','nocheck'].filter(k=>counts[k]).map(k=>chip(k,counts[k])).join('')+(invItems.length?chip('inv',invItems.length):'')+(state.checkFilter?'<button type="button" class="rs-chip rs-chip-all" data-check-filter="">Show all</button>':'');
    const T=state.lastTotals||{},up=items.filter(x=>x.ck.effect>0),down=items.filter(x=>x.ck.effect<0),sum=a=>a.reduce((t,x)=>t+x.ck.effect,0),lines=n=>`${n} line${n===1?'':'s'}`;
    const invBilled=x=>numberValue(x.detail&&x.detail.invoiceRows&&x.detail.invoiceRows[0]&&x.detail.invoiceRows[0].totalIncGst)||0,invTotal=invItems.reduce((t,x)=>t+invBilled(x),0);
    const mrow=(label,note,value,cls='')=>`<div class="rs-money-row ${cls}"><span>${escapeHtml(label)}${note?` <small>${escapeHtml(note)}</small>`:''}</span><strong>${escapeHtml(value)}</strong></div>`;
    const moneyHtml=[T.supplierInvoiceTotal!=null?mrow('Supplier invoice','',money(T.supplierInvoiceTotal)):'',T.current!=null?mrow('POS order at current prices','',money(T.current)):'','<div class="rs-money-rule"></div>',
      mrow('Charged above expected',up.length?lines(up.length):'none',sgn(sum(up)),up.length?'is-high':''),down.length?mrow('Better price',lines(down.length),sgn(sum(down)),'is-better'):'',
      T.notInvoicedCount?mrow('Not invoiced',`${lines(T.notInvoicedCount)} · at the ordered value`,money(T.notInvoicedTotal),'is-muted'):'',invItems.length?mrow('Billed, not on the POS order',`${lines(invItems.length)} · tick to import`,money(invTotal),'is-inv'):''].join('');
    const moneyBox=document.querySelector('#rsMoney');if(moneyBox){moneyBox.innerHTML='';moneyBox.hidden=true;}   // v2.21.0: the chips and the footer totals carry these figures
    const orderNo=cleanText(state.posParsed&&state.posParsed.orderNumber)||cleanText(r.orderNumber),mism=orderLinkMismatches(),keyN=Number(state.importKeyReviewCount||0),noteN=(notes||[]).length;   // the order link is automatic: every invoice is reconciled against the one uploaded POS order
    const rt=r.totals||{},checksOk=!!(integ&&integ.ok&&!integ.review)&&!keyN;
    const tick='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
    const checkState=checksOk?`<span class="rs-sum-ok">${tick}Checks passed</span>`:`<button type="button" class="rs-sum-warn" data-open-more>${escapeHtml(!integ||!integ.ok?'Integrity failed — see Details':integ.review?'Integrity review — see Details':`${keyN} import key${keyN===1?'':'s'} to review — see Details`)}</button>`;
    const sep='<span class="rs-sum-sep" aria-hidden="true">·</span>';
    glance.innerHTML=`<div class="rs-sum"><div class="rs-sum-row"><strong class="rs-sum-order" title="${escapeHtml(els.resultSub?els.resultSub.textContent:'')}">${escapeHtml(orderNo?`Order ${orderNo}`:'POS order')}</strong>${sep}<span>${escapeHtml(`${rt.matchedInvoiceLines??'?'} of ${rt.invoiceLines??'?'} invoice lines matched`)}</span>${sep}<span>Invoice <b>${escapeHtml(money(T.supplierInvoiceTotal))}</b></span><span class="rs-sum-right">${checkState}<button type="button" class="rs-sum-more" data-open-more>Details ▸</button></span></div><div class="rs-sum-row rs-chips">${chips}</div></div>`;
    glance.classList.remove('hidden');
    // v2.20.0 — no Action needed card: lines to fix are the "Fix in POSActive" section of the checklist (red cells).
    const tag=(k,t)=>`<span class="rs-tag ck-${k}">${escapeHtml(t)}</span>`;needs.innerHTML='';needs.classList.add('hidden');
    // The checks line shows only when a check needs you; otherwise the summary says "Checks passed".
    const integText=integ&&integ.ok&&!integ.review?`<span class="rs-check ok">${tick}<b>Integrity</b> POS order locked · every invoice row counted once · arithmetic valid</span>`:integ&&integ.ok?'<span class="rs-check warn"><b>Integrity review</b> the invoice total or line arithmetic did not check out — compare the invoice with the TXT</span>':'<span class="rs-check bad"><b>Integrity failed</b> see the review notes in Details</span>';
    const linkText=mism.length?`<span class="rs-check ok">${tick}<b>Order link</b> CH2 Customer PO ${escapeHtml([...new Set(mism.map(m=>m.customerPo))].join(', '))} → POSActive order ${escapeHtml(orderNo)} · linked automatically</span>`:`<span class="rs-check ok">${tick}<b>Order link</b> POSActive order ${escapeHtml(orderNo||'(uploaded)')}</span>`;
    const keyText=`<span class="rs-check ${keyN?'warn':'ok'}">${keyN?'':tick}<b>Import keys</b> ${keyN?`${keyN} to review`:'none to review'}</span>`;
    checks.innerHTML=`${integText}${linkText}${keyText}`;checks.classList.remove('hidden');   // v2.20.0: inside Details
    if(more){if(!integ||!integ.ok)more.open=true;const sm=more.querySelector('summary');if(sm)sm.textContent=`Details — review notes${noteN?` (${noteN})`:''}, order link, import keys, how the checklist works`;}
    wireSummary();
  }
  let summaryWired=false;
  function wireSummary(){
    if(summaryWired||!els.results)return;summaryWired=true;
    els.results.addEventListener('click',e=>{
      const f=e.target.closest('[data-check-filter]');
      if(f){e.preventDefault();const k=f.dataset.checkFilter||'';state.checkFilter=!k||state.checkFilter===k?null:k;if(state.previewView!=='pos')setPreviewView('pos');else applyTableSearch();if(state.lastSummaryArgs)renderSummary(...state.lastSummaryArgs);if(state.checkFilter&&els.tableWrap)els.tableWrap.scrollIntoView({behavior:'smooth',block:'start'});return;}
      const sh=e.target.closest('[data-show-src]');if(sh){e.preventDefault();showChecklistLine(sh.dataset.showSrc);return;}
      const m=e.target.closest('[data-open-more]');if(m){e.preventDefault();const more=document.querySelector('#rsMore');if(more){more.open=true;const strip=document.querySelector('#dbRunStrip');window.scrollTo({top:more.getBoundingClientRect().top+window.scrollY-((strip&&strip.offsetHeight)||0)-12,behavior:'smooth'});}}   // v2.19.0: lands under the RUN strip
    });
  }
  function showChecklistLine(src){
    let changed=false;if(state.checkFilter){state.checkFilter=null;changed=true;}const box=document.querySelector('#tableSearch');if(box&&box.value){box.value='';changed=true;}
    if(state.colFilters.size){state.colFilters=new Map();changed=true;if(state.previewView==='pos'){renderPosTable();changed=false;}}   // v2.18.0
    if(state.previewView!=='pos')setPreviewView('pos');else if(changed)applyTableSearch();
    if(changed&&state.lastSummaryArgs)renderSummary(...state.lastSummaryArgs);
    const tr=els.tableBody&&[...els.tableBody.querySelectorAll('tr[data-pos-src]')].find(t=>t.dataset.posSrc===String(src));if(!tr)return;
    tr.scrollIntoView({behavior:'smooth',block:'center'});tr.classList.add('rs-flash');setTimeout(()=>tr.classList.remove('rs-flash'),1800);
  }

  function renderResults(){
    const r=state.result;if(!r)return;const t=r.totals,integ=state.runIntegrity||{ok:false,errors:['Integrity not run'],warnings:[]};els.results.classList.remove('hidden');const pf=state.posParsed||{},ioN=invoiceOnlyEntries().length;els.resultSub.textContent=`${r.orderNumber?`Order ${r.orderNumber} · `:''}${t.matchedInvoiceLines}/${t.invoiceLines} supplier lines matched to the POS order · order file ${pf.sourceFile||'?'} (${((pf.rows)||[]).length} product rows)${ioN?` · ${ioN} billed product${ioN===1?'':'s'} not on the POS order (INV rows — see Not on POS order)`:''}.`;
    els.kpis.innerHTML=[kpi('POS lines',t.posLines),kpi('Exceptions',t.exceptionLines,t.exceptionLines?'bad':'good'),kpi('Unmatched invoices',t.unmatchedInvoiceLines,t.unmatchedInvoiceLines?'bad':'good'),kpi('Better price',t.betterPriceLines,'good'),kpi('Potential missed $',money(t.missedTotal),t.missedTotal>0?'bad':'good'),kpi('Integrity',integ.ok&&!integ.review?'PASS':'REVIEW',integ.ok?(integ.review?'warn':'good'):'bad')].join('');
    const notes=[...(state.duplicateInvoiceNotes||[]),...(r.warnings||[])];
    const posDiag=state.posParsed&&state.posParsed.diagnostics||{},restored=Number(posDiag.enrichedRows||0),ambiguousRestores=Number(posDiag.ambiguousMasterRows||0);
    if(restored)notes.push(`POS SOURCE RESTORED — ${restored} order row${restored===1?'':'s'} arrived without one or more standard identifier columns. Missing identifiers were restored only where the aligned master had one unambiguous value for the exact POS PLU. Restored Sub IDs are used for matching only — the POSActive TXT always sends each order row's Sub ID exactly as stored in the order file.`);
    if(ambiguousRestores)notes.push(`POS SOURCE REVIEW — ${ambiguousRestores} order row${ambiguousRestores===1?' has':'s have'} conflicting master candidates and were not filled automatically.`);
    if(t.lowConfidenceLines){const low=r.detail.filter(x=>x.matchConfidence==='LOW').slice(0,8).map(x=>`${x.posDescription} [${x.matchMethods||'fallback match'}]`);notes.push(`${t.lowConfidenceLines} matched line(s) have LOW confidence and should be reviewed${low.length?`: ${low.join('; ')}`:'.'}`);}
    if(t.auditDataMissing)notes.push(`${t.auditDataMissing} matched POS line(s) cannot receive a complete CH2 discount/wholesale audit because the supplier invoice did not print all required audit fields.`);
    // v2.11.0 — one POS row billed on several CH2 lines: same terms → one TXT line; different terms → POSActive keeps only the last.
    {const multi=(r.detail||[]).filter(d=>(d.invoiceRows||[]).length>1),same=d=>{const f=d.invoiceRows[0],eq=(a,b,t)=>Math.abs((numberValue(a)||0)-(numberValue(b)||0))<=t;return d.invoiceRows.every(x=>cleanText(x.invoiceNumber)===cleanText(f.invoiceNumber)&&eq(x.unitPriceExGst,f.unitPriceExGst,0.00011)&&eq(x.discountPct,f.discountPct,0.011)&&eq(x.normalWholesale,f.normalWholesale,0.011));},label=d=>`${cleanText(d.posDescription)} (CH2 lines ${d.invoiceRows.map(x=>cleanText(x.invoiceLine)).join(' + ')})`;
     const ok=multi.filter(same),diff=multi.filter(d=>!same(d));
     if(ok.length)notes.push(`MERGED LINES — ${ok.length} product${ok.length===1?' was':'s were'} billed on more than one CH2 line at the same price: ${ok.slice(0,6).map(label).join('; ')}${ok.length>6?'; …':''}. Each is one line in the POSActive TXT with the quantities added, because POSActive keeps only the last line with a Sub ID on an order row.`);
     if(diff.length)notes.push(`SPLIT LINES — ${diff.length} product${diff.length===1?' was':'s were'} billed on more than one CH2 line at different prices or on different invoices: ${diff.slice(0,6).map(label).join('; ')}${diff.length>6?'; …':''}. They stay separate lines in the POSActive TXT, and POSActive keeps only the last of them on that order row — check that row's received quantity and cost in POSActive after importing.`);}
    const posIdentityNotes=posSubIdReviewNotes();notes.push(...posIdentityNotes);
    const gstList=gstReview().list;if(gstList.length){const eff=gstList.reduce((a,g)=>a+g.effect,0);notes.push(`GST REVIEW — ${gstList.length} product${gstList.length===1?' has':'s have'} CH2 invoice GST different from the product's POSActive GST setting: ${gstList.slice(0,8).map(g=>`${g.posIndex==='INV'?'INV':`POS ${g.posIndex}`} ${g.description} (invoice ${g.invRate}% vs POSActive ${g.posRate}%)`).join('; ')}${gstList.length>8?'; …':''}. POSActive totals with its own setting, so its adjusted total will differ from the invoice by ${signedMoney(eff)}. Rows show INV and the invoice rate in the GST % column.`);}
    if(integ.ok&&integ.review)notes.unshift('INTEGRITY REVIEW: the POS source order is locked and every parsed invoice row is accounted for exactly once, but the supplier invoice checks below did not all pass (invoice total or line arithmetic) — a line may have been missed when the invoice was read. Check the invoice against the TXT before importing; downloads remain available.');else if(integ.ok)notes.unshift('Integrity checks passed: POS source order is locked, every parsed invoice row is accounted for exactly once, and supplier invoice arithmetic is valid.');else notes.unshift(...integ.errors.map(x=>`INTEGRITY REVIEW: ${x} — downloads remain available; check these rows before importing.`));notes.push(...(integ.warnings||[]));notes.push('Excel output keeps every POS order line in the exact uploaded sequence. Genuine invoice-only lines are appended only after the complete POS order block.');
    els.warningBox.classList.remove('hidden','ok','bad');if(!integ.ok)els.warningBox.classList.add('bad');else if(!posIdentityNotes.length&&!integ.review)els.warningBox.classList.add('ok');els.warningBox.innerHTML='<strong>Review notes:</strong><br>'+notes.map(escapeHtml).join('<br>');
    state.lastSummaryArgs=[r,integ,notes];renderOrderOverrideUi();renderPreview(r);updateDownloadButton();renderSummary(r,integ,notes);els.results.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function run(){
    if(!state.pos||!state.invoices.length||!state.referenceReady){setStatus('Reference data is not ready on this computer. Drop the POS / master and Ongoing Discounts files on their rows under Reference data, or in Drop All Input Files Here.','warn');return;}
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
      const parsed=[];for(let i=0;i<state.invoices.length;i++){const doc=await PHF.parseSupplierInvoice(state.invoices[i]);parsed.push(doc);setProgress(35+Math.round(((i+1)/state.invoices.length)*38));}
      // v2.8.0 — an identical copy of an invoice (same number, lines, codes, quantities and prices — e.g. a renamed download) is
      // used once so quantities are not doubled. Files with the same number but different lines are all kept. A note, not a block.
      const docs=[],seenInvoices=new Map();state.duplicateInvoiceNotes=[];
      const docSig=doc=>(doc.rows||[]).map(r=>[cleanText(r.invoiceLine),cleanText(r.productCode),cleanText(r.qtySupplied),cleanText(r.unitPriceExGst)].join(':')).sort().join('|');
      for(const doc of parsed){const no=cleanText((doc&&doc.rows&&doc.rows[0]&&doc.rows[0].invoiceNumber)||(doc&&doc.meta&&doc.meta.invoiceNumber)),key=`${doc&&doc.type}|${no}|${docSig(doc)}`;if(no&&seenInvoices.has(key)){state.duplicateInvoiceNotes.push(`DUPLICATE INVOICE — ${doc.sourceFile} is an identical copy of invoice ${no} (already read from ${seenInvoices.get(key)}), so it was left out of this run. Remove it if it was added by mistake.`);continue;}if(no)seenInvoices.set(key,doc.sourceFile);docs.push(doc);}
      state.docs=docs;
      const invoiceCount=docs.reduce((a,d)=>a+(d.rows||[]).length,0);setStatus(`Supplier invoices read: ${invoiceCount} billed product lines. Matching to POS order…`,'info');setProgress(82);
      state.result=PHF.reconcile(pos,docs,state.refs);state.runIntegrity=PHF.integrity.validateRun(pos,docs,state.result);state.result.integrity=state.runIntegrity;setProgress(100);
      const t=state.result.totals,ioRun=invoiceOnlyEntries(),ioNote=ioRun.length?` ${ioRun.length} billed product${ioRun.length===1?' is':'s are'} not on the POS order (${ioRun.slice(0,3).map(e=>cleanText(e.pos&&e.pos.description)).join(', ')}${ioRun.length>3?', …':''}) — excluded from the POSActive TXT unless ticked. See Not on POS order.`:'';if(state.runIntegrity.ok&&state.runIntegrity.review)setStatus(`Complete: ${t.matchedInvoiceLines}/${t.invoiceLines} invoice lines matched. Integrity REVIEW — the invoice total or line arithmetic did not check out (see the notes below). All downloads remain available.${ioNote}`,'warn');else if(state.runIntegrity.ok)setStatus(`Complete: ${t.matchedInvoiceLines}/${t.invoiceLines} invoice lines matched. ${t.exceptionLines} POS line exception${t.exceptionLines===1?'':'s'}${t.unmatchedInvoiceLines?`, ${t.unmatchedInvoiceLines} unmatched invoice line${t.unmatchedInvoiceLines===1?'':'s'}`:''}. Integrity PASS.${ioNote}`,ioRun.length?'warn':'ok');else setStatus(`Reconciliation completed with ${state.runIntegrity.errors.length} integrity check${state.runIntegrity.errors.length===1?'':'s'} to review (see the notes below). All downloads remain available.${ioNote}`,'warn');
      state.previewView='pos';state.checkFilter=null;renderResults();setTimeout(hideProgress,500);
    }catch(err){console.error(err);hideProgress();setStatus(err&&err.message?err.message:String(err),'warn');}
    finally{els.runBtn.disabled=!(state.pos&&state.invoices.length&&state.referenceReady);els.clearBtn.disabled=false;}
  }

  // v2.11.0: receiving counts and ticks live only on this page — the browser asks before a reload or a link leaves it.
  window.addEventListener('beforeunload',e=>{if(state.result&&(state.unpackCounts.size||state.unpackChecked.size||state.adjEdits.size)){e.preventDefault();e.returnValue='';}});
  wireDrop(els.posDrop,els.posInput,addPos);wireDrop(els.invoiceDrop,els.invoiceInput,addInvoices);
  els.clearBtn.onclick=()=>{resetReceivingState({clearStorage:true});clearAllStoredReceivingState();state.pos=null;state.invoices=[];state.result=null;state.docs=[];state.posParsed=null;state.previewView='pos';state.runIntegrity=null;state.unpackChecked=new Set();state.unpackManualChecked=new Set();state.unpackKey=null;state.unpackCounts=new Map();state.unpackCountsKey=null;state.receivingMigratedFrom266=false;state.orderOverrides=new Map();els.posInput.value='';els.invoiceInput.value='';hideResults();hideProgress();renderFiles();};
  els.runBtn.onclick=run;
  if(els.fullDownloadBtn)els.fullDownloadBtn.onclick=async()=>{
    if(!state.result||!state.docs.length||!state.refs)return;
    els.fullDownloadBtn.disabled=true;els.fullDownloadBtn.textContent='Building Full Excel…';
    try{const out=await PHF.exportReference(state.docs,state.refs,state.posParsed,state.result),review=(out&&out.layoutWarnings)||[];if(review.length)setStatus(`Full reconciliation Excel generated · ${review.length} layout check${review.length===1?'':'s'} to review (the file is complete): ${review.slice(0,3).join(' | ')}`,'warn');else setStatus('Full reconciliation Excel generated successfully.','ok');}
    catch(err){console.error(err);setStatus(err&&err.message?err.message:String(err),'warn');}
    finally{updateDownloadButton();}
  };
  if(els.fullCsvDownloadBtn)els.fullCsvDownloadBtn.onclick=async()=>{
    if(!state.result||!state.docs.length||!state.refs)return;
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
    if(!state.result||!state.docs.length||!state.refs||state.previewView==='all')return;
    els.downloadBtn.disabled=true;els.downloadBtn.textContent=state.previewView==='pos'?'Building merged TXT…':'Building Excel…';
    try{
      const exportResult=await PHF.exportView(state.previewView,state.docs,state.refs,state.posParsed,state.result,posExportOptions());
      document.dispatchEvent(new CustomEvent('phf:export-made',{detail:{id:'downloadBtn',view:state.previewView}}));   // v2.17.0: only a file that was actually built
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
        // Only a file that cannot be written correctly reaches here (no supplied rows, unreadable invoice, a
        // 15-column self-check). Show the reason at the point of action — price and data notes never get here.
        // v2.15.0 (Task 12.7): the same guard message, shown on the page under the step row (dismissible) instead of a
        // browser alert; the rule that an import must contain eligible rows is unchanged. console.warn keeps the trace.
        console.warn('POSActive import not created:',message);
        if(!showExportNotice(message)){try{globalThis.alert(message);}catch(_e){}}
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
  // v2.19.0: Remove not supplied is gone — not-invoiced lines sit in their own section; ALL or a tick accounts for them.

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
  // v2.7.0 — lets the input rail (js/ui/workspace.js) re-check reference data after saving it from the rail.
  // v2.13.0: run() exposed for the step pills; Run all = run() then the POSActive import download (workspace.js). The engine is unchanged.
  global.PHFReconcileApp=Object.assign(global.PHFReconcileApp||{},{refreshReferenceStatus,setStatus,run});
  refreshReferenceStatus();
})(window);
