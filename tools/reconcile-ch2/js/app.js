(function(global){
  'use strict';
  const PHF=global.PHFReconcile||{};
  const state={pos:null,invoices:[],result:null,previewView:'exceptions',docs:[],refs:null,referenceReady:false,posParsed:null,runIntegrity:null,unpackChecked:new Set(),unpackKey:null,unpackCounts:new Map(),unpackCountsKey:null};
  const els={
    referenceReady:document.querySelector('#referenceReady'),referenceDot:document.querySelector('#referenceDot'),buildLabel:document.querySelector('#buildLabel'),
    posDrop:document.querySelector('#posDrop'),posInput:document.querySelector('#posInput'),posFiles:document.querySelector('#posFiles'),invoiceDrop:document.querySelector('#invoiceDrop'),invoiceInput:document.querySelector('#invoiceInput'),invoiceFiles:document.querySelector('#invoiceFiles'),runBtn:document.querySelector('#runBtn'),clearBtn:document.querySelector('#clearBtn'),status:document.querySelector('#status'),progress:document.querySelector('#progress'),progressBar:document.querySelector('#progressBar'),results:document.querySelector('#results'),resultSub:document.querySelector('#resultSub'),kpis:document.querySelector('#kpis'),warningBox:document.querySelector('#warningBox'),tableWrap:document.querySelector('.table-wrap'),table:document.querySelector('#resultTable'),tableHead:document.querySelector('#resultTableHead'),tableBody:document.querySelector('#resultTable tbody'),tableFoot:document.querySelector('#resultTableFoot'),fullDownloadBtn:document.querySelector('#fullDownloadBtn'),downloadBtn:document.querySelector('#downloadBtn'),viewExceptionsBtn:document.querySelector('#viewExceptionsBtn'),viewAllBtn:document.querySelector('#viewAllBtn'),viewPosBtn:document.querySelector('#viewPosBtn'),posTools:document.querySelector('#posTools'),posCheckProgress:document.querySelector('#posCheckProgress'),clearChecksBtn:document.querySelector('#clearChecksBtn'),clearCountsBtn:document.querySelector('#clearCountsBtn'),removeNotSuppliedBtn:document.querySelector('#removeNotSuppliedBtn')
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
    {key:'__unpack',label:'✓',kind:'check',cls:'unpack-cell',min:32,max:38},
    {key:'main_id',label:'Product #',kind:'text',cls:'pos-code',min:112,max:185,grow:.10,stretch:.11,hardMax:260},
    {key:'__pos_brand',label:'POS Brand',kind:'text',cls:'pos-brand',min:78,max:170,grow:.12,stretch:.15,hardMax:280},
    {key:'plu',label:'POS PLU',kind:'text',cls:'pos-code',min:58,max:96,grow:.05,stretch:.06,hardMax:140},
    {key:'sub_id',label:'Sub Id',kind:'text',cls:'pos-code',min:64,max:145,grow:.06,stretch:.08,hardMax:220},
    {key:'descr',label:'Product Description',kind:'text',cls:'pos-desc',min:220,max:520,grow:.30,stretch:.38,hardMax:940},
    {key:'gst_tax_pc',label:'GST %',kind:'number',dp:2,min:44,max:60,grow:.01},
    {key:'units',label:'Units',kind:'number',dp:2,min:40,max:54,grow:.01},
    {key:'qty',label:'Qty',kind:'number',dp:2,min:40,max:54,grow:.01},
    {key:'__unpack_add',label:'Add Qty',kind:'qtyinput',cls:'unpack-qty-entry-cell',min:58,max:76,grow:.01},
    {key:'__unpack_total',label:'Found',kind:'qtytotal',cls:'unpack-qty-total-cell',min:56,max:74,grow:.01},
    {key:'qty_stk_in',label:'Stk In',kind:'number',dp:3,min:46,max:62,grow:.01},
    {key:'or_ok',label:'Ok',kind:'bool',flag:'ok-flag',cls:'pos-bool-cell',min:38,max:46},
    {key:'mupc',label:'MU%',kind:'number',dp:2,min:46,max:64,grow:.015},
    {key:'gppc',label:'GP%',kind:'number',dp:2,min:46,max:62,grow:.015},
    {key:'adjrrprce',label:'AdjRRPrc',kind:'number',dp:2,min:62,max:92,grow:.04,stretch:.035,hardMax:118},
    {key:'adjwsprce',label:'AdjWSPrc',kind:'number',dp:2,min:62,max:92,grow:.04,stretch:.035,hardMax:118},
    {key:'adjcatprce',label:'AdjCatPrc',kind:'number',dp:2,min:62,max:92,grow:.035,stretch:.025,hardMax:112},
    {key:'adjdprce',label:'AdjDPrc',kind:'number',dp:2,min:62,max:92,grow:.04,stretch:.035,hardMax:118},
    {key:'or_qty',label:'Adj Qty',kind:'number',dp:3,min:50,max:70,grow:.01},
    {key:'override',label:'Inc',kind:'bool',flag:'inc-flag',cls:'pos-bool-cell',min:38,max:46}
  ];

  const posMeasureCanvas=document.createElement('canvas');
  const posMeasureCtx=posMeasureCanvas.getContext('2d');
  let posResizeObserver=null,posResizeTimer=0;

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
  function refDigits(v){return String(v??'').replace(/\.0+$/,'').replace(/\D+/g,'');}
  function posReferenceRecord(pos){
    const master=state.refs&&state.refs.master;if(!master||!pos)return {};
    const bc=refDigits(pos.barcode);if(bc&&master.byBarcode&&master.byBarcode.has(bc))return master.byBarcode.get(bc)||{};
    const sub=refDigits(pos.subId);if(sub&&master.byCode&&master.byCode.has(sub))return master.byCode.get(sub)||{};
    const plu=refDigits(pos.plu);if(plu&&master.byPlu&&master.byPlu.has(plu))return master.byPlu.get(plu)||{};
    return {};
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
  function posColumnValue(pos,c,detail=null){
    if(!pos||!c)return '';
    if(c.key==='__pos_brand')return String((posReferenceRecord(pos).POS_BRAND)||'');
    if(c.key==='main_id')return pos.barcode??'';
    if(c.key==='plu')return pos.plu??'';
    if(c.key==='sub_id')return pos.subId??'';
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
    if(key==='adjcatprce'||key==='adjdprce')return numberValue(detail.actualUnit);
    return null;
  }
  function priceMove(current,target){
    const a=numberValue(current),b=numberValue(target),tol=(PHF.schema&&PHF.schema.VISUAL&&PHF.schema.VISUAL.priceVisualTolerance)||0.03;
    if(a==null||b==null)return null;const diff=b-a;
    if(Math.abs(diff)<=tol)return {kind:'same',symbol:'—',diff,target:b};
    return diff>0?{kind:'up',symbol:'↑',diff,target:b}:{kind:'down',symbol:'↓',diff,target:b};
  }
  function posTotals(rows,detailBySourceRow=posDetailMap()){
    let current=0,adjusted=0;
    for(const pos of rows||[]){
      const raw=pos.raw||{},qtyNow=numberValue(raw.qty)??numberValue(pos.orderedQty)??0,qtyAdj=numberValue(raw.or_qty)??numberValue(pos.orderedQty)??0;
      const currentPrice=numberValue(raw.last_price)??numberValue(pos.expectedUnit)??0;
      const detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||null;
      const adjustedPrice=numberValue(discountedPosPrice(pos,detail))??currentPrice;
      current+=currentPrice*qtyNow;adjusted+=adjustedPrice*qtyAdj;
    }
    return {current,adjusted};
  }

  function sortedPosRows(){
    return ((state.posParsed&&state.posParsed.rows)||[]).slice().sort((a,b)=>{
      const ar=Number(a&&a.sourceRow),br=Number(b&&b.sourceRow);
      if(Number.isFinite(ar)&&Number.isFinite(br)&&ar!==br)return ar-br;
      return Number(a&&a.posIndex||0)-Number(b&&b.posIndex||0);
    });
  }
  function unpackIdentity(pos){
    return String((pos&&pos.identity)||[pos&&pos.sourceRow,pos&&pos.plu,pos&&pos.barcode,pos&&pos.description].map(v=>String(v??'').trim()).join('|'));
  }
  function unpackStorageKey(){
    const id=(state.posParsed&&state.posParsed.orderNumber)||(state.pos&&state.pos.name)||'current-order';
    return `phf-ch2-unpack:${String(id).replace(/[^a-z0-9._-]+/gi,'_')}`;
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
    return `phf-ch2-unpackqty:${String(id).replace(/[^a-z0-9._-]+/gi,'_')}`;
  }
  function loadUnpackCounts(){
    const key=unpackCountsStorageKey();state.unpackCountsKey=key;state.unpackCounts=new Map();
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
    if(Math.abs(diff)<=tol)return {kind:'exact',label:`Correct · expected ${displayUnpackCount(e)}`};
    if(diff<0)return {kind:'under',label:`Under by ${displayUnpackCount(Math.abs(diff))} · expected ${displayUnpackCount(e)}`};
    return {kind:'over',label:`Over by ${displayUnpackCount(diff)} · expected ${displayUnpackCount(e)}`};
  }
  function unpackRowComplete(pos,detail){
    const key=unpackIdentity(pos),expected=unpackExpectedQty(pos,detail),found=unpackCountFor(pos);
    if(state.unpackChecked.has(key))return true;
    if(!state.unpackCounts.has(key))return false;
    return Number(found)+.0005>=Number(expected);
  }
  function syncUnpackCompletion(pos,detail){
    const key=unpackIdentity(pos),expected=unpackExpectedQty(pos,detail),found=unpackCountFor(pos);
    const complete=state.unpackCounts.has(key)&&Number(found)+.0005>=Number(expected);
    if(complete)state.unpackChecked.add(key);else state.unpackChecked.delete(key);
    return complete;
  }
  function setUnpackComplete(pos,detail,complete){
    const key=unpackIdentity(pos),expected=unpackExpectedQty(pos,detail);
    if(complete){
      state.unpackCounts.set(key,Math.max(0,Math.round(Number(expected||0)*1000)/1000));
      state.unpackChecked.add(key);
    }else{
      state.unpackCounts.delete(key);
      state.unpackChecked.delete(key);
    }
    saveUnpackCounts();saveUnpackChecklist();
  }
  function posPreviewRows(detailBySourceRow){
    const base=sortedPosRows(),remaining=[],complete=[];
    for(let i=0;i<base.length;i++){
      const pos=base[i],detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||posDetailAt(i);
      (unpackRowComplete(pos,detail)?complete:remaining).push(pos);
    }
    return [...remaining,...complete];
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
    const expected=numberValue(input.dataset.unpackExpected)??0,total=applyUnpackDelta(key,delta);input.value='';
    if(total!=null){
      if(Number(total)+.0005>=Number(expected))state.unpackChecked.add(key);else state.unpackChecked.delete(key);
      saveUnpackChecklist();
    }
    const tr=input.closest('tr'),out=tr&&tr.querySelector('.unpack-qty-total');
    if(out&&total!=null)updateUnpackTotalElement(out,key,total,expected);
    if(state.previewView==='pos'&&state.result){setTimeout(()=>renderPosTable(),0);}else schedulePosColumnSizing();
    return true;
  }
  function commitFoundInput(input){
    if(!input||!input.classList||!input.classList.contains('unpack-qty-total'))return false;
    const key=decodeUnpackKey(input.dataset.unpackTotalKey||'');if(!key)return false;
    const expected=numberValue(input.dataset.unpackExpected)??0,raw=String(input.value||'').trim();
    if(!raw){input.value=displayUnpackCount(Number(state.unpackCounts.get(key)||0));return false;}
    const absolute=Number(raw);if(!Number.isFinite(absolute)){input.value=displayUnpackCount(Number(state.unpackCounts.get(key)||0));return false;}
    const total=setUnpackTotal(key,absolute);if(total==null)return false;
    if(Number(total)+.0005>=Number(expected))state.unpackChecked.add(key);else state.unpackChecked.delete(key);
    saveUnpackChecklist();updateUnpackTotalElement(input,key,total,expected);
    if(state.previewView==='pos'&&state.result){setTimeout(()=>renderPosTable(),0);}else schedulePosColumnSizing();
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
    if(els.posCheckProgress)els.posCheckProgress.textContent=`Complete ${checked.toLocaleString()} / ${total.toLocaleString()} · Remaining ${remaining.toLocaleString()}`;
    return {checked,total,remaining};
  }


  function posSizingText(pos,c,detail,notSupplied){
    if(c.kind==='check')return '✓';
    if(c.kind==='qtyinput')return '-999.999';
    if(c.kind==='qtytotal')return displayUnpackCount(unpackCountFor(pos));
    const v=posColumnValue(pos,c,detail);
    if(c.kind==='bool')return boolValue(v)?'✓':'';
    if(c.kind==='number'){
      let text=fixed(v,c.dp??2);
      const target=comparisonTarget(detail,c.key),move=priceMove(v,target);
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
    const widths=POS_VIEW_COLUMNS.map((c,i)=>{
      let maxText=0;
      posMeasureCtx.font=headFont;maxText=Math.max(maxText,posMeasureCtx.measureText(c.label).width+hpad);
      posMeasureCtx.font=bodyFont;
      for(let r=0;r<rows.length;r++){
        const pos=rows[r],detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||posDetailAt(r),notSupplied=!detail||Number(detail.suppliedQty||0)<=0;
        const text=posSizingText(pos,c,detail,notSupplied);maxText=Math.max(maxText,posMeasureCtx.measureText(text).width+pad);
      }
      if(c.kind==='bool'||c.kind==='check')maxText=Math.max(maxText,30);
      return clampWidth(Math.ceil(maxText),c.min,c.max);
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
      const shrinkOrder=['descr','__pos_brand','main_id','sub_id','plu','adjrrprce','adjwsprce','adjcatprce','adjdprce','mupc','gppc','gst_tax_pc','qty_stk_in','or_qty','units','qty'];
      for(const key of shrinkOrder){
        if(excess<=.5)break;const i=POS_VIEW_COLUMNS.findIndex(c=>c.key===key);if(i<0)continue;
        const c=POS_VIEW_COLUMNS[i],room=Math.max(0,widths[i]-c.min),take=Math.min(room,excess);widths[i]-=take;excess-=take;
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
        const finalKeys=[['descr',.52],['__pos_brand',.16],['main_id',.10],['sub_id',.08],['plu',.05],['adjrrprce',.025],['adjwsprce',.025],['adjcatprce',.02],['adjdprce',.025]];
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
    els.posFiles.replaceChildren();if(state.pos)els.posFiles.append(fileRow(state.pos,()=>{state.pos=null;state.result=null;state.posParsed=null;state.runIntegrity=null;renderFiles();hideResults();}));
    els.invoiceFiles.replaceChildren();state.invoices.forEach((f,i)=>els.invoiceFiles.append(fileRow(f,()=>{state.invoices.splice(i,1);state.result=null;state.docs=[];state.runIntegrity=null;renderFiles();hideResults();})));
    const filesReady=!!state.pos&&state.invoices.length>0,ready=filesReady&&state.referenceReady;els.runBtn.disabled=!ready;
    if(!state.referenceReady)setStatus('Reference data is not ready on this computer. Open Admin to load the POS master and supplier/discount reference data.','warn');
    else if(filesReady)setStatus(`Ready: 1 POS order and ${state.invoices.length} supplier invoice${state.invoices.length===1?'':'s'} selected.`,'ok');
    else setStatus('Add one POS order and at least one supplier invoice to continue.','info');
  }
  function addPos(files){const f=[...files].find(x=>validExt(x,['.xls','.xlsx','.csv']));if(f)state.pos=f;state.result=null;state.posParsed=null;state.runIntegrity=null;state.unpackChecked=new Set();state.unpackKey=null;state.unpackCounts=new Map();state.unpackCountsKey=null;hideResults();renderFiles();}
  function addInvoices(files){for(const f of files){if(validExt(f,['.pdf','.xls','.xlsx','.csv'])&&!state.invoices.some(x=>x.name===f.name&&x.size===f.size))state.invoices.push(f);}state.result=null;state.docs=[];state.runIntegrity=null;hideResults();renderFiles();}
  function wireDrop(zone,input,handler){zone.onclick=()=>input.click();zone.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click();}};input.onchange=()=>handler(input.files);['dragenter','dragover'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.add('drag');}));['dragleave','drop'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.remove('drag');}));zone.addEventListener('drop',e=>handler(e.dataTransfer.files));}

  function pill(status){let cls='bad';if(status==='OK')cls='ok';else if(status==='BETTER PRICE')cls='better';else if(/REVIEW|LOW/.test(status))cls='review';return `<span class="status-pill ${cls}">${escapeHtml(status)}</span>`;}
  function kpi(label,value,cls=''){return `<div class="kpi ${cls}"><div class="n">${escapeHtml(value)}</div><div class="l">${escapeHtml(label)}</div></div>`;}
  function updateDownloadButton(){
    const ready=!!(state.runIntegrity&&state.runIntegrity.ok);
    if(els.fullDownloadBtn){
      els.fullDownloadBtn.textContent='Download Full Reconciliation.xlsx';
      els.fullDownloadBtn.disabled=!ready;
      els.fullDownloadBtn.title=ready?'Download the original complete 43-column linked-POS reconciliation workbook.':'Excel export is blocked until all integrity checks pass.';
    }
    if(!els.downloadBtn)return;
    const activeInvoiceDocs=(state.docs||[]).filter(d=>d&&d.type!=='CREDIT_NOTE').length;
    const labels={exceptions:'Download Exceptions.xlsx',pos:activeInvoiceDocs>1?'Download POS Import Files.zip':'Download POS Layout.txt'};
    if(state.previewView==='all'){
      els.downloadBtn.classList.add('hidden');
      els.downloadBtn.disabled=true;
      return;
    }
    els.downloadBtn.classList.remove('hidden');
    els.downloadBtn.textContent=labels[state.previewView]||'Download Current View';
    els.downloadBtn.disabled=!ready;
    els.downloadBtn.title=ready?`Download the ${state.previewView==='pos'?'POS-layout tab-delimited text file':'exceptions workbook'}.`:'Export is blocked until all integrity checks pass.';
  }
  function setViewButtons(){
    const map={exceptions:els.viewExceptionsBtn,all:els.viewAllBtn,pos:els.viewPosBtn};
    Object.entries(map).forEach(([k,b])=>{if(!b)return;b.classList.toggle('active',state.previewView===k);b.setAttribute('aria-pressed',state.previewView===k?'true':'false');});
    updateDownloadButton();
  }
  function renderReconTable(r){
    if(els.posTools)els.posTools.classList.add('hidden');els.tableWrap.classList.remove('preview-pos');els.table.classList.remove('pos-preview-table');clearPosColumnSizing();if(els.tableFoot)els.tableFoot.innerHTML='';
    els.tableHead.innerHTML=`<tr>${RECON_COLUMNS.map(c=>`<th${c.kind==='number'?' class="num"':c.kind==='center'?' class="center"':''}>${escapeHtml(c.label)}</th>`).join('')}</tr>`;
    const display=state.previewView==='all'?r.detail:r.detail.filter(x=>x.hasException||x.matchConfidence==='LOW');
    const extras=r.unmatchedInvoice.map(x=>({status:'NOT ORDERED / UNMATCHED',posDescription:x.description,orderedQty:null,suppliedQty:x.qtySupplied,expectedUnit:null,actualUnit:x.unitPriceExGst,unitVariance:null,missedTotal:0,matchConfidence:'',hasException:true}));
    const rows=[...display,...extras];
    els.tableBody.innerHTML=rows.length?rows.map(x=>`<tr><td>${pill(x.status)}</td><td>${escapeHtml(x.posDescription)}</td><td class="num">${qty(x.orderedQty)}</td><td class="num">${qty(x.suppliedQty)}</td><td class="num">${money(x.expectedUnit)}</td><td class="num">${money(x.actualUnit,4)}</td><td class="num">${money(x.unitVariance,4)}</td><td class="num">${money(x.missedTotal)}</td><td class="center">${x.matchConfidence?escapeHtml(x.matchConfidence):'<span class="muted">—</span>'}</td></tr>`).join(''):'<tr><td colspan="9">No exceptions found.</td></tr>';
  }
  function renderPosTable(){
    if(els.posTools)els.posTools.classList.remove('hidden');
    els.tableWrap.classList.add('preview-pos');els.table.classList.add('pos-preview-table');
    els.tableHead.innerHTML=`<tr>${POS_VIEW_COLUMNS.map(c=>{const cls=[c.kind==='check'?'unpack-head':'',c.kind==='bool'?'pos-bool-head':'',(['number','qtyinput','qtytotal'].includes(c.kind))?'num':'',(c.kind==='bool'||c.kind==='check')?'center':''].filter(Boolean).join(' ');return `<th${cls?` class="${cls}"`:''}${c.kind==='check'?' title="Unpacking check / mark complete"':''}>${escapeHtml(c.label)}</th>`;}).join('')}</tr>`;
    const baseRows=sortedPosRows();const detailBySourceRow=posDetailMap();
    // Migrate/normalise legacy session state: a checked row now means its expected
    // receiving quantity is accounted for; a completed manual count also checks it.
    let stateChanged=false;
    for(let i=0;i<baseRows.length;i++){
      const pos=baseRows[i],detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||posDetailAt(i),key=unpackIdentity(pos),expected=unpackExpectedQty(pos,detail);
      if(state.unpackChecked.has(key)&&!state.unpackCounts.has(key)){state.unpackCounts.set(key,expected);stateChanged=true;}
      if(state.unpackCounts.has(key)){const should=unpackCountFor(pos)+.0005>=expected;if(should&&!state.unpackChecked.has(key)){state.unpackChecked.add(key);stateChanged=true;}if(!should&&state.unpackChecked.has(key)){state.unpackChecked.delete(key);stateChanged=true;}}
    }
    if(stateChanged){saveUnpackCounts();saveUnpackChecklist();}
    const rows=posPreviewRows(detailBySourceRow);
    const progress=updateChecklistUi(baseRows,detailBySourceRow),remainingCount=progress.remaining;
    els.tableBody.innerHTML=rows.length?rows.map((pos,index)=>{
      const detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||posDetailAt(index),notSupplied=!detail||Number(detail.suppliedQty||0)<=0;
      const checkKey=unpackIdentity(pos),unpackDone=state.unpackChecked.has(checkKey),rowClasses=[notSupplied?'pos-not-supplied':'',unpackDone?'unpack-checked':'',(unpackDone&&index===remainingCount)?'unpack-complete-start':''].filter(Boolean).join(' ');
      const cells=POS_VIEW_COLUMNS.map(c=>{
        const v=posColumnValue(pos,c,detail);let html='',extraCls='',title='';
        if(c.kind==='check'){
          html=`<button type="button" class="unpack-check ${unpackDone?'checked':''}" data-unpack-key="${escapeHtml(encodeURIComponent(checkKey))}" aria-pressed="${unpackDone?'true':'false'}" title="${unpackDone?'Mark as not checked':'Mark as unpacked / checked'}"><span aria-hidden="true">${unpackDone?'✓':''}</span></button>`;
          extraCls=' unpack-cell';
        }else if(c.kind==='qtyinput'){
          const item=String(pos.description||pos.barcode||'this product'),expectedQty=unpackExpectedQty(pos,detail);
          html=`<input class="unpack-qty-input" type="number" step="any" inputmode="decimal" autocomplete="off" data-unpack-qty-key="${escapeHtml(encodeURIComponent(checkKey))}" data-unpack-expected="${escapeHtml(expectedQty)}" aria-label="Add unpacked quantity for ${escapeHtml(item)}" title="Expected in delivery: ${escapeHtml(displayUnpackCount(expectedQty))}. Enter a quantity; Enter, Tab, clicking elsewhere, switching window/tab or leaving the page will save it. Negative values subtract.">`;
        }else if(c.kind==='qtytotal'){
          const found=unpackCountFor(pos),expectedQty=unpackExpectedQty(pos,detail),status=unpackCountStatus(checkKey,found,expectedQty);
          html=`<input class="unpack-qty-total found-${status.kind}" type="number" step="any" min="0" inputmode="decimal" autocomplete="off" data-unpack-total-key="${escapeHtml(encodeURIComponent(checkKey))}" data-unpack-expected="${escapeHtml(expectedQty)}" value="${escapeHtml(displayUnpackCount(found))}" title="${escapeHtml(`Expected: ${displayUnpackCount(expectedQty)} · Found: ${displayUnpackCount(found)} · ${status.label}. Edit this total directly to override the running count.`)}" aria-label="${escapeHtml(`Found ${displayUnpackCount(found)}. ${status.label}. Editable total.`)}">`;
        }else if(c.kind==='bool'){const checked=boolValue(v);html=`<span class="pos-checkbox ${c.flag||''} ${checked?'checked':''}" aria-label="${checked?'Checked':'Not checked'}">${checked?'✓':''}</span>`;}
        else if(c.kind==='number'){
          html=escapeHtml(fixed(v,c.dp??2));const target=comparisonTarget(detail,c.key),move=priceMove(v,target);
          if(move&&!notSupplied){extraCls=` price-move-cell price-${move.kind}`;const targetLabel=c.key==='adjrrprce'?'CH2 RRP':c.key==='adjwsprce'?'CH2 Normal W/S':'CH2 Unit Price';title=`${targetLabel}: ${Number(move.target).toFixed(2)} · ${move.symbol} ${Math.abs(move.diff).toFixed(2)}`;html=`<span class="pos-price-value">${html}</span><span class="price-arrow" aria-hidden="true">${move.symbol}</span>`;}
        } else {html=escapeHtml(v);if(v)title=String(v);}
        const cls=[c.cls||'',c.kind==='number'?'num':'',c.kind==='bool'?'pos-bool-cell center':'',extraCls].filter(Boolean).join(' ');return `<td${cls?` class="${cls}"`:''}${title?` title="${escapeHtml(title)}"`:''}>${html}</td>`;
      }).join('');
      return `<tr${rowClasses?` class="${rowClasses}"`:''}${notSupplied?' data-not-supplied="1"':''}>${cells}</tr>`;
    }).join(''):`<tr><td colspan="${POS_VIEW_COLUMNS.length}">No POS order rows available.</td></tr>`;

    els.tableBody.onclick=e=>{
      const btn=e.target.closest('.unpack-check');if(!btn)return;e.preventDefault();e.stopPropagation();
      const key=decodeUnpackKey(btn.dataset.unpackKey||'');if(!key)return;
      const pos=baseRows.find(r=>unpackIdentity(r)===key);if(!pos)return;
      const detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||null;
      const checked=!unpackRowComplete(pos,detail);
      setUnpackComplete(pos,detail,checked);
      // Re-render so completed rows immediately move below the remaining items while
      // preserving original POS order inside both groups. Unchecking returns the row.
      renderPosTable();
    };
    els.tableBody.onkeydown=e=>{
      const add=e.target.closest('.unpack-qty-input'),found=e.target.closest('.unpack-qty-total');
      if(e.key==='Enter'&&(add||found)){e.preventDefault();if(add)commitQtyInput(add);else commitFoundInput(found);}
    };
    els.tableBody.onfocusout=e=>{const add=e.target.closest('.unpack-qty-input'),found=e.target.closest('.unpack-qty-total');if(add)commitQtyInput(add);else if(found)commitFoundInput(found);};
    els.tableBody.onchange=e=>{const add=e.target.closest('.unpack-qty-input'),found=e.target.closest('.unpack-qty-total');if(add)commitQtyInput(add);else if(found)commitFoundInput(found);};

    if(els.tableFoot){
      if(baseRows.length){const totals=posTotals(baseRows,detailBySourceRow),leftSpan=Math.max(1,POS_VIEW_COLUMNS.length-5);els.tableFoot.innerHTML=`<tr class="pos-total-row"><td colspan="${leftSpan}" class="pos-total-left"><strong>Current Order</strong><span>${baseRows.length.toLocaleString()} product line${baseRows.length===1?'':'s'} · <b data-check-progress>complete ${progress.checked}/${progress.total} · remaining ${progress.remaining}</b> · completed rows move below remaining items · grey rows = not supplied</span></td><td colspan="2" class="pos-total-label">Current / Adjusted Total</td><td class="pos-total-current">${money(totals.current)}</td><td colspan="2" class="pos-total-adjusted">${money(totals.adjusted)}</td></tr>`;}
      else els.tableFoot.innerHTML='';
    }
    ensurePosResizeObserver();schedulePosColumnSizing();
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
    renderPreview(r);updateDownloadButton();els.results.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function run(){
    if(!state.pos||!state.invoices.length||!state.referenceReady){setStatus('Reference data is not ready on this computer. Open Admin to update it.','warn');return;}
    els.runBtn.disabled=true;els.clearBtn.disabled=true;hideResults();setProgress(4);setStatus('Loading POS/master and discount reference data…','info');
    try{
      state.refs=await PHF.referenceStore.parseStored();setProgress(18);setStatus(`Reference data ready: ${state.refs.master.info.records.toLocaleString()} CH2 codes and ${state.refs.supplier.info.discountRules.toLocaleString()} discount rules. Reading POS order…`,'info');
      const pos=await PHF.parsePosOrder(state.pos);state.posParsed=pos;loadUnpackChecklist();loadUnpackCounts();setProgress(35);setStatus(`POS order read: ${pos.rows.length} ordered product lines. Reading supplier invoice(s)…`,'info');
      const docs=[];for(let i=0;i<state.invoices.length;i++){const doc=await PHF.parseSupplierInvoice(state.invoices[i]);docs.push(doc);setProgress(35+Math.round(((i+1)/state.invoices.length)*38));}state.docs=docs;
      const invoiceCount=docs.reduce((a,d)=>a+(d.rows||[]).length,0);setStatus(`Supplier invoices read: ${invoiceCount} billed product lines. Matching to POS order…`,'info');setProgress(82);
      state.result=PHF.reconcile(pos,docs,state.refs);state.runIntegrity=PHF.integrity.validateRun(pos,docs,state.result);state.result.integrity=state.runIntegrity;setProgress(100);
      const t=state.result.totals;if(state.runIntegrity.ok)setStatus(`Complete: ${t.matchedInvoiceLines}/${t.invoiceLines} invoice lines matched. ${t.exceptionLines} POS line exception${t.exceptionLines===1?'':'s'}${t.unmatchedInvoiceLines?`, ${t.unmatchedInvoiceLines} unmatched invoice line${t.unmatchedInvoiceLines===1?'':'s'}`:''}. Integrity PASS.`,'ok');else setStatus(`Reconciliation completed, but Excel export is blocked by ${state.runIntegrity.errors.length} integrity check${state.runIntegrity.errors.length===1?'':'s'}. Review the notes below.`,'warn');
      state.previewView='exceptions';renderResults();setTimeout(hideProgress,500);
    }catch(err){console.error(err);hideProgress();setStatus(err&&err.message?err.message:String(err),'warn');}
    finally{els.runBtn.disabled=!(state.pos&&state.invoices.length&&state.referenceReady);els.clearBtn.disabled=false;}
  }

  wireDrop(els.posDrop,els.posInput,addPos);wireDrop(els.invoiceDrop,els.invoiceInput,addInvoices);
  els.clearBtn.onclick=()=>{state.pos=null;state.invoices=[];state.result=null;state.docs=[];state.posParsed=null;state.previewView='exceptions';state.runIntegrity=null;state.unpackChecked=new Set();state.unpackKey=null;state.unpackCounts=new Map();state.unpackCountsKey=null;els.posInput.value='';els.invoiceInput.value='';hideResults();hideProgress();renderFiles();};
  els.runBtn.onclick=run;
  if(els.fullDownloadBtn)els.fullDownloadBtn.onclick=async()=>{
    if(!state.result||!state.docs.length||!state.refs||!state.runIntegrity||!state.runIntegrity.ok)return;
    els.fullDownloadBtn.disabled=true;els.fullDownloadBtn.textContent='Building Full Excel…';
    try{await PHF.exportReference(state.docs,state.refs,state.posParsed,state.result);setStatus('Full reconciliation Excel generated successfully.','ok');}
    catch(err){console.error(err);setStatus(err&&err.message?err.message:String(err),'warn');}
    finally{updateDownloadButton();}
  };
  els.downloadBtn.onclick=async()=>{
    if(!state.result||!state.docs.length||!state.refs||!state.runIntegrity||!state.runIntegrity.ok||state.previewView==='all')return;
    els.downloadBtn.disabled=true;els.downloadBtn.textContent=state.previewView==='pos'?(((state.docs||[]).filter(d=>d&&d.type!=='CREDIT_NOTE').length>1)?'Building POS ZIP…':'Building TXT…'):'Building Excel…';
    try{
      await PHF.exportView(state.previewView,state.docs,state.refs,state.posParsed,state.result);
      const label=state.previewView==='pos'?(((state.docs||[]).filter(d=>d&&d.type!=='CREDIT_NOTE').length>1)?'POS import files':'POS layout text file'):'exceptions Excel';
      setStatus(`${label} generated successfully.`,'ok');
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
  function setPreviewView(view){
    commitActiveReceivingInput();
    state.previewView=view;renderPreview(state.result);
    // Always open a view at its first POS row / first column. This avoids a previous
    // horizontal or vertical scroll position making the POS sequence look out of order.
    if(els.tableWrap)requestAnimationFrame(()=>{els.tableWrap.scrollTop=0;els.tableWrap.scrollLeft=0;});
  }
  if(els.viewExceptionsBtn)els.viewExceptionsBtn.onclick=()=>setPreviewView('exceptions');
  if(els.viewAllBtn)els.viewAllBtn.onclick=()=>setPreviewView('all');
  if(els.viewPosBtn)els.viewPosBtn.onclick=()=>setPreviewView('pos');
  if(els.clearChecksBtn)els.clearChecksBtn.onclick=()=>{commitActiveReceivingInput();for(const key of state.unpackChecked)state.unpackCounts.delete(key);state.unpackChecked.clear();saveUnpackCounts();saveUnpackChecklist();if(state.previewView==='pos'&&state.result)renderPosTable();};
  if(els.clearCountsBtn)els.clearCountsBtn.onclick=()=>{commitActiveReceivingInput();state.unpackCounts.clear();state.unpackChecked.clear();saveUnpackCounts();saveUnpackChecklist();if(state.previewView==='pos'&&state.result)renderPosTable();};
  if(els.removeNotSuppliedBtn)els.removeNotSuppliedBtn.onclick=()=>{
    commitActiveReceivingInput();
    const detailBySourceRow=posDetailMap(),rows=sortedPosRows();let moved=0;
    for(let i=0;i<rows.length;i++){
      const pos=rows[i],detail=detailBySourceRow.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||posDetailAt(i);
      if(detail&&Number(detail.suppliedQty||0)>0)continue;
      const key=unpackIdentity(pos);state.unpackCounts.set(key,0);state.unpackChecked.add(key);moved++;
    }
    saveUnpackCounts();saveUnpackChecklist();
    if(state.previewView==='pos'&&state.result)renderPosTable();
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
  refreshReferenceStatus();
})(window);
