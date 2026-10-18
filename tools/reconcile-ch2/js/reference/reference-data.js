// v2.10.0 (12 Oct 2026): the discount rules are the Staff Hub's shared Ongoing Discounts file (Library kind
// "lib:ref-discounts", also used by Build POS Master Databases and POS New Product Check Clean), so a file dropped in any of
// the three fills the others. A POS DB & SUPPLIER MERGE workbook dropped here still works: its SRC_POS_ONGOING_DISCOUNTS sheet
// is saved as the shared Ongoing Discounts file and the whole workbook is kept as "supplierMerge" for its supplier names,
// CH2 supplier links and brand changes. Saved before v2.10.0 as "supplierMerge" only? It is still read, and its discounts sheet
// is copied to the shared file the first time Reconcile opens.
// v2.9.2 (10 Oct 2026): this store is also the Staff Hub Library (assets/js/phf-library.js). Build Master Databases saves
// the full merged master here as "posMaster", so it is ready without dropping it. Clear removes only Reconcile's own files.
(function(global){
  'use strict';
  const PHF=global.PHFReconcile=global.PHFReconcile||{};
  const CFG=global.PHFReferenceConfig||{};
  let parsedCache=null;
  const DB_NAME='PHFStaffHub',DB_VERSION=1,STORE='referenceFiles';

  function clean(v){return v==null?'':String(v).replace(/\u00a0/g,' ').trim();}
  function normHeader(v){return clean(v).toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,'');}
  function digits(v){let s=clean(v).replace(/,/g,'');if(/^\d+\.0+$/.test(s))s=s.split('.')[0];return s.replace(/\D+/g,'');}
  function barcode(v){let s=clean(v);if(/^\d+\.0+$/.test(s))s=s.split('.')[0];return s.replace(/\D+/g,'');}
  function num(v){if(typeof v==='number'&&Number.isFinite(v))return v;let s=clean(v).replace(/[$,%]/g,'').replace(/,/g,'');if(!s)return null;if(/^\.\d+$/.test(s))s='0'+s;const n=Number(s);return Number.isFinite(n)?n:null;}
  function percent(v){let n=num(v);if(n==null)return null;if(n>0&&n<=1)n*=100;return n;}
  function valueAt(row,idx){return idx!=null&&idx>=0&&idx<row.length?row[idx]:'';}
  function headerMap(row){const m={};(row||[]).forEach((v,i)=>{const n=normHeader(v);if(n&&!(n in m))m[n]=i;});return m;}
  function aliasCol(map,names){for(const name of names){const k=normHeader(name);if(k in map)return map[k];}return -1;}
  function findHeader(matrix,requirements,maxRows=100){let best=null;for(let r=0;r<Math.min(matrix.length,maxRows);r++){const map=headerMap(matrix[r]);let score=0,ok=true;for(const req of requirements){const found=aliasCol(map,req)>=0;if(found)score+=10;else ok=false;}if(ok&&(!best||score>best.score))best={row:r,map,score};}return best;}
  async function readWorkbook(blob){if(!global.XLSX)throw new Error('Spreadsheet reader did not load. Refresh the page and try again.');const name=clean(blob&&blob.name).toLowerCase();if(name.endsWith('.csv'))return global.XLSX.read(await blob.text(),{type:'string',raw:true});return global.XLSX.read(await blob.arrayBuffer(),{type:'array',raw:true,cellDates:true});}
  function matrixFor(wb,sheetName){return global.XLSX.utils.sheet_to_json(wb.Sheets[sheetName],{header:1,defval:'',raw:true,blankrows:false});}
  function displayMatrixFor(wb,sheetName){return global.XLSX.utils.sheet_to_json(wb.Sheets[sheetName],{header:1,defval:'',raw:false,blankrows:false});}
  function displayedIdentifier(rawValue,formattedValue){const f=clean(formattedValue);if(f&&!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)[Ee][+-]?\d+$/.test(f))return f;return clean(rawValue);}

  const MASTER_ALIASES={
    code:['CH2_CH2_ITEM_CODE','CH2 CH2 ITEM CODE','CH2_ITEM_CODE','CH2 ITEM CODE','CH2_PGC_ITEM_CODE','CH2 PGC ITEM CODE','PGC_ITEM_CODE','PGC ITEM CODE','CH2_PRODUCT_CODE','CH2 PRODUCT CODE','SUP_SUB_ID','SUP SUB ID','CH2_SUB_ID','CH2 SUB ID','PRODUCT_CODE','PRODUCT CODE'],
    supplier:['POS_SUPPLIER','POS SUPPLIER','SUPPLIER'],supplierName:['POS_SUPPLIER_NAME','POS SUPPLIER NAME','SUPPLIER_NAME','SUPPLIER NAME'],supplierNumber:['POS_SUPPLIER_NUMBER','POS SUPPLIER NUMBER','SUPPLIER_NUMBER','SUPPLIER NUMBER'],
    barcode:['POS_MASTER_BARCODE','POS MASTER BARCODE','MASTER_BARCODE','MASTER BARCODE','POS_MAIN_ID','POS MAIN ID','BARCODE'],plu:['POS_PLU','POS PLU','PLU'],posSubId:['POS_SUB_ID','POS SUB ID','POS_SUPPLIER_CODE','POS SUPPLIER CODE','SUB_ID','SUB ID'],
    brand:['POS_MASTER_BRAND','POS MASTER BRAND','POS_BRAND','POS BRAND','MASTER_BRAND','MASTER BRAND','BRAND'],descr:['POS_DESCR','POS DESCR','POS_DESCRIPTION','POS DESCRIPTION','DESCRIPTION','DESCR'],
    wsp:['POS_WSP_EXCGST','POS WSP EXCGST','WSP_EXCGST','WSP EXCGST','WHOLESALE EX GST'],ch2Wholesale:['CH2_WHOLESALE_EX_GST','CH2 WHOLESALE EX GST','CH2_WHOLESALE','CH2 WHOLESALE','PGC_WHOLESALE_EX_GST','PGC WHOLESALE EX GST','RAW WHOLESALE','CH2 RAW WHOLESALE'],
    last:['POS_LAST_PRICE','POS LAST PRICE','LAST_PRICE','LAST PRICE'],gst:['POS_GST_TAX_PC','POS GST TAX PC','GST_TAX_PC','GST TAX PC','GST_PC','GST PC','GST %'],rrp:['POS_RRP_INCGST','POS RRP INCGST','POS_RRP','POS RRP','RRP_INCGST','RRP INCGST','CURRENT RRP','RRP']
  };
  function recordQuality(r){return ['POS_MASTER_BARCODE','POS_PLU','POS_SUB_ID','POS_BRAND','POS_DESCR','POS_WSP_EXCGST','POS_LAST_PRICE','POS_RRP_INCGST','POS_CH2_WHOLESALE_EX_GST'].reduce((a,k)=>a+(clean(r[k])?1:0),0);}

  async function parsePosMaster(blob){
    const wb=await readWorkbook(blob);let chosen=null;
    for(const name of wb.SheetNames){const matrix=matrixFor(wb,name),displayMatrix=displayMatrixFor(wb,name),h=findHeader(matrix,[MASTER_ALIASES.code],100);if(!h)continue;const core=['barcode','plu','brand','descr','last','rrp'].reduce((n,k)=>n+(aliasCol(h.map,MASTER_ALIASES[k])>=0?1:0),0),score=100+core*10;if(!chosen||score>chosen.score)chosen={name,matrix,displayMatrix,h,score};}
    if(!chosen)throw new Error('Could not find a CH2 product-code column in the merged POS/master workbook.');
    const cols={};for(const [k,names] of Object.entries(MASTER_ALIASES))cols[k]=aliasCol(chosen.h.map,names);
    const byCode=new Map(),byCodeAll=new Map(),byBarcode=new Map(),byPlu=new Map(),byBarcodeAll=new Map(),byPluAll=new Map(),byPosSubId=new Map();let duplicates=0;
    for(let r=chosen.h.row+1;r<chosen.matrix.length;r++){
      const row=chosen.matrix[r]||[],display=(chosen.displayMatrix&&chosen.displayMatrix[r])||[],code=digits(valueAt(row,cols.code));
      const record={SOURCE_SHEET:chosen.name,SOURCE_ROW:r+1,MASTER_CODE:code,POS_SUPPLIER_RAW:clean(valueAt(row,cols.supplier)),POS_SUPPLIER_NAME:clean(valueAt(row,cols.supplierName)),POS_SUPPLIER_NUMBER:digits(valueAt(row,cols.supplierNumber)),POS_MASTER_BARCODE:barcode(displayedIdentifier(valueAt(row,cols.barcode),valueAt(display,cols.barcode))),POS_PLU:clean(displayedIdentifier(valueAt(row,cols.plu),valueAt(display,cols.plu))).replace(/\.0+$/,''),POS_SUB_ID:clean(displayedIdentifier(valueAt(row,cols.posSubId),valueAt(display,cols.posSubId))),POS_BRAND:clean(valueAt(row,cols.brand)),POS_DESCR:clean(valueAt(row,cols.descr)),POS_WSP_EXCGST:num(valueAt(row,cols.wsp)),POS_CH2_WHOLESALE_EX_GST:num(valueAt(row,cols.ch2Wholesale)),POS_LAST_PRICE:num(valueAt(row,cols.last)),POS_GST_TAX_PC:num(valueAt(row,cols.gst)),POS_RRP_INCGST:num(valueAt(row,cols.rrp))};
      if(code){if(!byCodeAll.has(code))byCodeAll.set(code,[]);byCodeAll.get(code).push(record);
      if(byCode.has(code)){duplicates++;if(recordQuality(record)>recordQuality(byCode.get(code)))byCode.set(code,record);}else byCode.set(code,record);}
      const bc=record.POS_MASTER_BARCODE;if(bc){if(!byBarcodeAll.has(bc))byBarcodeAll.set(bc,[]);byBarcodeAll.get(bc).push(record);}if(bc&&code&&!byBarcode.has(bc))byBarcode.set(bc,record);const plu=digits(record.POS_PLU);if(plu){if(!byPluAll.has(plu))byPluAll.set(plu,[]);byPluAll.get(plu).push(record);}if(plu&&code&&!byPlu.has(plu))byPlu.set(plu,record);const sid=clean(record.POS_SUB_ID).toUpperCase();if(sid&&code){if(!byPosSubId.has(sid))byPosSubId.set(sid,[]);byPosSubId.get(sid).push(record);}
    }
    const fuzzy=[];for(const rec of byCode.values())if(clean(rec.POS_DESCR))fuzzy.push(rec);
    return {byCode,byCodeAll,byBarcode,byPlu,byBarcodeAll,byPluAll,byPosSubId,fuzzy,info:{sheet:chosen.name,headerRow:chosen.h.row+1,records:byCode.size,duplicates}};
  }

  function locateSheet(wb,requirements,preferredNames=[]){const ordered=[...preferredNames.filter(n=>wb.SheetNames.includes(n)),...wb.SheetNames.filter(n=>!preferredNames.includes(n))];for(const name of ordered){const matrix=matrixFor(wb,name),h=findHeader(matrix,requirements,40);if(h)return {name,matrix,displayMatrix:displayMatrixFor(wb,name),h};}return null;}
  function parseDiscountRulesFromLocated(s){
    const discountRules=[];
    if(!s)return discountRules;
    const C={brand:aliasCol(s.h.map,['POS MASTER BRAND','POS_MASTER_BRAND','POS BRAND','BRAND']),prefix:aliasCol(s.h.map,['POS BRAND PREFIX','POS_BRAND_PREFIX','BRAND PREFIX']),supplier:aliasCol(s.h.map,['POS SUPPLIER NUMBER','POS_SUPPLIER_NUMBER','POS SUPPLIER','SUPPLIER']),plu:aliasCol(s.h.map,['POS PLU','POS_PLU','PLU']),barcode:aliasCol(s.h.map,['POS MASTER BARCODE','POS_MASTER_BARCODE','MASTER BARCODE','BARCODE']),descr:aliasCol(s.h.map,['POS DESCR','POS_DESCR','POS DESCRIPTION','DESCRIPTION']),discount:aliasCol(s.h.map,['POS DISCOUNT%','POS_DISCOUNT','POS DISCOUNT %','DISCOUNT']),markup:aliasCol(s.h.map,['POS MARKUP%','POS_MARKUP','POS MARKUP %','MARKUP']),member:aliasCol(s.h.map,['POS MEMBER','POS_MEMBER','MEMBER']),match:aliasCol(s.h.map,['POS MATCH','POS_MATCH','MATCH'])};
    for(let r=s.h.row+1;r<s.matrix.length;r++){
      const row=s.matrix[r]||[],display=(s.displayMatrix&&s.displayMatrix[r])||[],d=percent(valueAt(row,C.discount));if(d==null)continue;
      const rule={POS_MASTER_BRAND:clean(valueAt(row,C.brand)),POS_BRAND_PREFIX:clean(valueAt(row,C.prefix)),POS_SUPPLIER_NUMBER:digits(valueAt(row,C.supplier)),POS_PLU:clean(valueAt(row,C.plu)).replace(/\.0+$/,''),POS_MASTER_BARCODE:barcode(displayedIdentifier(valueAt(row,C.barcode),valueAt(display,C.barcode))),POS_DESCR:clean(valueAt(row,C.descr)),POS_DISCOUNT:d,POS_MARKUP:percent(valueAt(row,C.markup)),POS_MEMBER:clean(valueAt(row,C.member)),POS_MATCH:clean(valueAt(row,C.match))};
      if([rule.POS_MASTER_BRAND,rule.POS_BRAND_PREFIX,rule.POS_SUPPLIER_NUMBER,rule.POS_PLU,rule.POS_MASTER_BARCODE,rule.POS_DESCR].some(Boolean))discountRules.push(rule);
    }
    return discountRules;
  }
  async function parseSupplierMerge(blob){
    const wb=await readWorkbook(blob),supplierMap=new Map(),ch2SupplierLookup=new Map(),brandMap=new Map();
    let s=locateSheet(wb,[['POS ACCNO','POS_ACCNO','ACCNO'],['POS ACNAME','POS_ACNAME','ACNAME']],['SRC_POS_SUPPLIERS']);
    if(s){const cAcc=aliasCol(s.h.map,['POS ACCNO','POS_ACCNO','ACCNO']),cName=aliasCol(s.h.map,['POS ACNAME','POS_ACNAME','ACNAME']);for(let r=s.h.row+1;r<s.matrix.length;r++){const row=s.matrix[r]||[],acc=digits(valueAt(row,cAcc)),name=clean(valueAt(row,cName));if(acc&&name&&!supplierMap.has(acc))supplierMap.set(acc,name);}}
    // Built-in CH2 supplier fallback keeps a discount-only CSV usable.
    for(const [k,v] of Object.entries(CFG.SUPPLIER_NAME_FALLBACKS||{}))if(!supplierMap.has(String(k)))supplierMap.set(String(k),String(v));

    s=locateSheet(wb,[['SUP SUB ID','SUP_SUB_ID'],['POS SUPPLIER NUMBER','POS_SUPPLIER_NUMBER','POS SUPPLIER']],['IN_SUPPLIER__PRODUCT_UPDATES','IN_SUPPLIER_/_PRODUCT_UPDATES','IN_SUPPLIER_PRODUCT_UPDATES']);
    if(s){const cSub=aliasCol(s.h.map,['SUP SUB ID','SUP_SUB_ID']),cNo=aliasCol(s.h.map,['POS SUPPLIER NUMBER','POS_SUPPLIER_NUMBER','POS SUPPLIER']),cName=aliasCol(s.h.map,['POS SUPPLIER NAME','POS_SUPPLIER_NAME']),cBrand=aliasCol(s.h.map,['SUP BRAND','SUP_BRAND']),cProduct=aliasCol(s.h.map,['SUP PRODUCT','SUP_PRODUCT']),cBc=aliasCol(s.h.map,['SUP BARCODE','SUP_BARCODE','BARCODE']);for(let r=s.h.row+1;r<s.matrix.length;r++){const row=s.matrix[r]||[],display=(s.displayMatrix&&s.displayMatrix[r])||[],code=digits(valueAt(row,cSub));if(!code||ch2SupplierLookup.has(code))continue;ch2SupplierLookup.set(code,{POS_SUPPLIER_NUMBER:digits(valueAt(row,cNo)),POS_SUPPLIER_NAME:clean(valueAt(row,cName)),SUP_BRAND:clean(valueAt(row,cBrand)),SUP_PRODUCT:clean(valueAt(row,cProduct)),SUP_BARCODE:barcode(displayedIdentifier(valueAt(row,cBc),valueAt(display,cBc)))});}}

    s=locateSheet(wb,[['POS DISCOUNT%','POS_DISCOUNT','POS DISCOUNT %','DISCOUNT']],['SRC_POS_ONGOING_DISCOUNTS']);
    const discountRules=parseDiscountRulesFromLocated(s);
    s=locateSheet(wb,[['SUP BRAND','SUP_BRAND'],['POS BRAND','POS_BRAND']],['SRC_POS_BRAND_NAME_CHANGES']);
    if(s){const cSup=aliasCol(s.h.map,['SUP BRAND','SUP_BRAND']),cPos=aliasCol(s.h.map,['POS BRAND','POS_BRAND']);for(let r=s.h.row+1;r<s.matrix.length;r++){const row=s.matrix[r]||[],sup=normHeader(valueAt(row,cSup)),pos=normHeader(valueAt(row,cPos));if(sup&&pos&&!brandMap.has(sup))brandMap.set(sup,pos);}}
    return {supplierMap,ch2SupplierLookup,discountRules,brandMap,info:{supplierRows:supplierMap.size,ch2Rows:ch2SupplierLookup.size,discountRules:discountRules.length,brandChanges:brandMap.size}};
  }

  const DISC_KIND='lib:ref-discounts',FULL_KIND='supplierMerge',SOURCE='Reconcile CH2 Order';
  const DISC_REQ=[['POS DISCOUNT%','POS_DISCOUNT','POS DISCOUNT %','DISCOUNT']];
  // A workbook with more than the discount sheet (POS DB & SUPPLIER MERGE) → its SRC_POS_ONGOING_DISCOUNTS sheet on its own.
  async function discountsOnly(file){
    const name=clean(file&&file.name).toLowerCase();if(name.endsWith('.csv'))return null;
    const wb=await readWorkbook(file);if(wb.SheetNames.length<2)return null;
    const s=locateSheet(wb,DISC_REQ,['SRC_POS_ONGOING_DISCOUNTS']);if(!s)return null;
    const ws=Object.assign({},wb.Sheets[s.name]);
    for(const k of Object.keys(ws))if(k[0]!=='!'&&ws[k]&&typeof ws[k]==='object'){const c=Object.assign({},ws[k]);delete c.f;delete c.F;ws[k]=c;}
    const out=global.XLSX.utils.book_new();global.XLSX.utils.book_append_sheet(out,ws,'SRC_POS_ONGOING_DISCOUNTS');
    const buf=global.XLSX.write(out,{bookType:'xlsx',type:'array'});
    const base=clean(file.name).replace(/\.(xlsx|xlsm|xls)$/i,'');
    return new File([buf],`SRC_POS_ONGOING_DISCOUNTS (from ${base}).xlsx`,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',lastModified:file.lastModified||Date.now()});
  }
  // Save a dropped discount file: always as the shared Ongoing Discounts; a full workbook is also kept for its extra sheets.
  async function saveDiscounts(file){
    const disc=await discountsOnly(file);
    if(disc){await save(FULL_KIND,file);await save(DISC_KIND,disc,{name:disc.name,meta:`From ${file.name}`});return {full:true,name:disc.name};}
    await save(DISC_KIND,file);
    return {full:false,name:file.name};
  }
  // Saved before v2.10.0 as supplierMerge only: copy its discounts sheet to the shared Ongoing Discounts file once.
  async function shareLegacy(){
    try{const [disc,full]=await Promise.all([load(DISC_KIND),load(FULL_KIND)]);if(disc||!full||!full.blob)return false;
      const f=full.blob instanceof File?full.blob:new File([full.blob],full.name||'POS DB & SUPPLIER MERGE.xlsx',{type:full.blob.type||''});
      const d=await discountsOnly(f);if(!d)return false;await save(DISC_KIND,d,{name:d.name,meta:`From ${full.name}`});return true;}
    catch(err){console.warn('Could not share the saved discount rules as Ongoing Discounts',err);return false;}
  }

  function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'kind'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  async function save(kind,file,info={}){parsedCache=null;
    if(global.PHFLibrary)return global.PHFLibrary.put(kind,file,{name:info.name||file.name,source:SOURCE,meta:info.meta||''}).then(()=>{});
    const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);store.delete('parsedReferenceCache');store.put({kind,name:info.name||file.name,size:file.size,lastModified:file.lastModified||0,savedAt:new Date().toISOString(),blob:file,source:SOURCE,meta:info.meta||''});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
  async function load(kind){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(kind);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});}
  // clear(DISC_KIND) removes the Ongoing Discounts and the workbook it came from; clear() removes all Reconcile's reference files.
  async function clear(kind){parsedCache=null;const kinds=kind?(kind===DISC_KIND||kind===FULL_KIND?[DISC_KIND,FULL_KIND]:[kind]):['posMaster',DISC_KIND,FULL_KIND];
    const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);kinds.concat('parsedReferenceCache').forEach(k=>store.delete(k));tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
    try{if(global.BroadcastChannel){const ch=new BroadcastChannel('phf-library');kinds.forEach(k=>ch.postMessage({action:'remove',kind:k}));ch.close();}}catch(e){}}
  async function saveParsedCache(cacheKey,master,supplier){
    try{const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put({kind:'parsedReferenceCache',cacheKey,master,supplier,savedAt:new Date().toISOString()});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});return true;}
    catch(err){console.warn('Parsed reference cache could not be saved; current run remains valid.',err);return false;}
  }
  // supplier = the discount rules in use: the shared Ongoing Discounts file, or (saved before v2.10.0) the supplierMerge workbook.
  // The POS reference must be the merged master (posMaster) — it has the CH2 product-code / link columns the reconciliation
  // needs. It is auto-loaded from the browser Library when a Combined Master build has saved one; the plain POS Database
  // full set is NOT used here (it has no CH2 columns). v2.12.1: reverted the lib:pos-db fallback from v2.12.0.
  async function status(){let [master,discounts,full]=await Promise.all([load('posMaster'),load(DISC_KIND),load(FULL_KIND)]);return {master:master||null,supplier:discounts||full||null,discounts,full};}
  // Discount rules from the shared Ongoing Discounts file; supplier names / CH2 links / brand changes from the full workbook
  // when one was dropped (otherwise from the Ongoing Discounts file itself and the built-in supplier names).
  async function parseSupplierRefs(st){
    if(!st.discounts)return parseSupplierMerge(st.full.blob);
    const disc=await parseSupplierMerge(st.discounts.blob);
    if(!st.full||!st.full.blob)return disc;
    let full;try{full=await parseSupplierMerge(st.full.blob);}catch(err){console.warn('POS DB & SUPPLIER MERGE workbook could not be read; using Ongoing Discounts only.',err);return disc;}
    for(const [k,v] of disc.supplierMap)if(!full.supplierMap.has(k))full.supplierMap.set(k,v);
    return {supplierMap:full.supplierMap,ch2SupplierLookup:full.ch2SupplierLookup.size?full.ch2SupplierLookup:disc.ch2SupplierLookup,discountRules:disc.discountRules,brandMap:full.brandMap.size?full.brandMap:disc.brandMap,
      info:{supplierRows:full.supplierMap.size,ch2Rows:(full.ch2SupplierLookup.size?full.ch2SupplierLookup:disc.ch2SupplierLookup).size,discountRules:disc.discountRules.length,brandChanges:(full.brandMap.size?full.brandMap:disc.brandMap).size}};
  }
  async function parseStored(){
    const st=await status();if(!st.master)throw new Error('POS/master reference data is not loaded on this computer. Open Admin and load the latest merged_alligned_pos_supplier_uhp_full workbook.');if(!st.supplier)throw new Error('Ongoing Discounts is not loaded on this computer. Drop the Ongoing Discounts file (SRC_POS_ONGOING_DISCOUNTS) or the POS DB & SUPPLIER MERGE workbook on its row.');
    const sig=r=>r?[r.name,r.size,r.savedAt]:null;
    const cacheKey=JSON.stringify([sig(st.master),sig(st.discounts),sig(st.full)]);
    if(parsedCache&&parsedCache.key===cacheKey)return parsedCache.value;
    const stored=await load('parsedReferenceCache');
    if(stored&&stored.cacheKey===cacheKey&&stored.master&&stored.supplier){const value={master:stored.master,supplier:stored.supplier,meta:st};parsedCache={key:cacheKey,value};return value;}
    const [master,supplier]=await Promise.all([parsePosMaster(st.master.blob),parseSupplierRefs(st)]);const value={master,supplier,meta:st};parsedCache={key:cacheKey,value};await saveParsedCache(cacheKey,master,supplier);return value;
  }
  PHF.referenceStore={save,saveDiscounts,shareLegacy,load,clear,status,parseStored,parsePosMaster,parseSupplierMerge,DISC_KIND};
})(window);
