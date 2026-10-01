(function(global){
  'use strict';
  const PHF=global.PHFReconcile=global.PHFReconcile||{};

  // POSActive "Apply Oborne Health Services Invoice" positional import contract.
  // IMPORTANT: POSActive reads these fields by POSITION, not by header name.
  // Never reorder, add or remove fields without intentionally changing this contract.
  const CONTRACT=Object.freeze({
    headers:Object.freeze([
      'Invoice No','Line','CH2 Code','Supplier Code','Sub ID','Description',
      'Qty','Qty Supplied','Normal WS','Unit Price ex GST','Rebate',
      'Extended ex GST','GST','Total inc GST','Disc %'
    ]),
    columns:15,
    // POSActive applies Normal WS to AdjWSPrc and Unit Price/Disc % to the
    // discounted cost fields (AdjCatPrc/AdjDPrc). There is intentionally no
    // RRP field in this import, so AdjRRPrc remains unchanged.
    priceUpdate:Object.freeze({adjWsp:'Normal WS',adjCat:'Unit Price ex GST',adjD:'Unit Price ex GST',adjRrp:null})
  });

  function clean(v){return v==null?'':String(v).replace(/\u00a0/g,' ').trim();}
  function n(v){if(typeof v==='number'&&Number.isFinite(v))return v;let s=clean(v).replace(/[$,%]/g,'').replace(/,/g,'');if(!s)return null;if(/^\.\d+$/.test(s))s='0'+s;const x=Number(s);return Number.isFinite(x)?x:null;}
  function round(v,dp=2){const x=n(v);if(x==null)return 0;const p=10**dp;return Math.round((x+Number.EPSILON)*p)/p;}
  function digits(v){let s=clean(v);if(/^\d+\.0+$/.test(s))s=s.split('.')[0];return s.replace(/\D+/g,'');}
  function code(v){return clean(v).replace(/\.0+$/,'').replace(/[−–—]/g,'-');}
  function normCode(v){return code(v).toUpperCase();}
  function normRef(v){return clean(v).toUpperCase().replace(/[−–—]/g,'-').replace(/\s+/g,'');}
  function sameRef(a,b){return !!normRef(a)&&normRef(a)===normRef(b);}
  function safePart(v){return clean(v).replace(/[^A-Za-z0-9._-]+/g,'_').replace(/^_+|_+$/g,'')||'CURRENT';}
  function sanitizeText(v){return clean(v).replace(/[−–—]/g,'-').replace(/[\t\r\n"]/g,' ').replace(/\s+/g,' ').trim();}
  function sanitizeDataText(v){return sanitizeText(v).replace(/[$%]/g,'').replace(/\s+/g,' ').trim();}
  function fixed(v,dp){const x=n(v);return (x==null?0:x).toFixed(dp);}
  function qtyText(v){const x=n(v);if(x==null)return '0';if(Math.abs(x-Math.round(x))<1e-9)return String(Math.round(x));return String(round(x,3)).replace(/0+$/,'').replace(/\.$/,'');}
  function lineText(v){const x=n(v);if(x==null)return '';return Math.abs(x-Math.round(x))<1e-9?String(Math.round(x)):String(x);}
  function invoiceNo(row){return clean(row&&row.invoiceNumber);}
  function invoiceKey(row){return [clean(row&&row.sourceFile),invoiceNo(row),clean(row&&row.invoiceLine),digits(row&&row.productCode),clean(row&&row.supplierSku)].join('|');}
  function sourceRowKey(pos){return String(pos&&pos.sourceRow!=null?pos.sourceRow:'');}
  function activeDocs(invoiceDocs){return (invoiceDocs||[]).filter(d=>d&&d.type!=='CREDIT_NOTE');}
  function docMeta(doc){const first=(doc&&doc.rows||[])[0]||{},m=(doc&&doc.meta)||{};return {number:clean(first.invoiceNumber||m.invoiceNumber),customerPo:clean(first.customerPo||m.customerPo),sourceFile:clean(doc&&doc.sourceFile)};}
  function sortedPos(posOrder){return ((posOrder&&posOrder.rows)||[]).slice().sort((a,b)=>{const ar=Number(a&&a.sourceRow),br=Number(b&&b.sourceRow);if(Number.isFinite(ar)&&Number.isFinite(br)&&ar!==br)return ar-br;return Number(a&&a.posIndex||0)-Number(b&&b.posIndex||0);});}
  function detailBySourceRow(reconciliation){const map=new Map();for(const d of (reconciliation&&reconciliation.detail)||[]){const k=String(d&&d.sourceRow!=null?d.sourceRow:'');if(k&&!map.has(k))map.set(k,d);}return map;}
  function invoiceRowsFor(detail,group){const nums=group&&group.numbers instanceof Set?group.numbers:new Set([clean(group&&group.number)].filter(Boolean));return ((detail&&detail.invoiceRows)||[]).filter(r=>nums.has(invoiceNo(r))||(group.sourceFiles.has(clean(r&&r.sourceFile))&&!invoiceNo(r)));}
  function pushIssue(list,msg,limit=60){if(list.length<limit)list.push(msg);}
  function sum(rows,key){return round((rows||[]).reduce((a,r)=>a+(n(r&&r[key])||0),0),2);}
  function sumQty(rows){return round((rows||[]).reduce((a,r)=>a+(n(r&&r.qtySupplied)||0),0),3);}

  function masterRecordForPos(pos,refs){
    const master=refs&&refs.master;if(!master)return null;
    const b=digits(pos&&pos.barcode);if(b&&master.byBarcode&&master.byBarcode.has(b))return master.byBarcode.get(b);
    const p=digits(pos&&pos.plu);if(p&&master.byPlu&&master.byPlu.has(p))return master.byPlu.get(p);
    return null;
  }
  function canonicalIdentity(pos,refs){
    const rec=masterRecordForPos(pos,refs)||{};
    return {
      orderSubId:clean(pos&&pos.subId),masterSubId:clean(rec.POS_SUB_ID),barcode:digits(pos&&pos.barcode)||digits(rec.POS_MASTER_BARCODE),
      plu:code(pos&&pos.plu)||code(rec.POS_PLU),description:clean(pos&&pos.description)||clean(rec.POS_DESCR),record:rec
    };
  }

  // The uploaded order owns the POSActive key. A master barcode match identifies
  // the product, but does not prove that a different Sub ID exists on that order.
  function resolveImportIdentity(pos,refs,invoiceRows=[],options={}){
    const master=refs&&refs.master||{},barcode=digits(pos&&pos.barcode),plu=digits(pos&&pos.plu);
    const codes=[...new Set(invoiceRows.map(r=>digits(r.productCode)).filter(Boolean))];
    const supplierCodes=[...new Set(invoiceRows.map(r=>code(r.supplierSku)).filter(Boolean))];
    const pool=new Set();
    for(const pc of codes)for(const r of (master.byCodeAll&&master.byCodeAll.get(pc))||[])pool.add(r);
    for(const [all,single,key] of [[master.byPluAll,master.byPlu,plu],[master.byBarcodeAll,master.byBarcode,barcode]]){
      if(!key)continue;for(const r of (all&&all.get(key))||[])pool.add(r);if(single&&single.has(key))pool.add(single.get(key));
    }
    const candidates=[...pool].filter(r=>{
      const rp=digits(r.POS_PLU),rb=digits(r.POS_MASTER_BARCODE);
      // A shared barcode must never borrow a supplier key from another PLU.
      if(plu&&rp)return plu===rp&&(!barcode||!rb||barcode===rb);
      return !!(barcode&&rb===barcode);
    });
    const masterSubIds=[...new Set(candidates.map(r=>clean(r.POS_SUB_ID)).filter(Boolean))];
    // v2.6.33 — rows on the uploaded POS order always export their Sub ID exactly as stored in
    // the order file (blank stays blank). Fallback keys apply only when the order file has no
    // Sub ID column, or for invoice-only lines that are not on the order.
    const exactOrder=!!pos&&typeof pos.subIdRaw==='string'&&!pos.invoiceOnly;
    const orderSubId=exactOrder?pos.subIdRaw:clean(pos&&pos.subId),overrides=options.importKeysBySourceRow||{},key=sourceRowKey(pos);
    const manual=clean(overrides instanceof Map?overrides.get(key):overrides[key]);
    const exactMasterSubId=masterSubIds.length===1?masterSubIds[0]:'';
    const invoiceSupplierCode=supplierCodes.length===1?supplierCodes[0]:'';
    // POSActive matches its supplier-order rows on Sub ID. When an older order
    // export omits Sub ID, the supplier's own code from the matched invoice is
    // the closest equivalent key. A CH2 catalogue number is only the final
    // fallback because it is a different identifier and may be rejected.
    const importSubId=manual||(exactOrder?orderSubId:(orderSubId||exactMasterSubId||invoiceSupplierCode||(codes.length===1?codes[0]:''))),source=manual?'USER':exactOrder?(orderSubId.trim()?'POS ORDER (EXACT)':'POS ORDER (BLANK)'):orderSubId?'POS ORDER':exactMasterSubId?(pos&&pos.invoiceOnly?'POS MASTER (NOT IN ORDER FILE)':'ALIGNED MASTER'):invoiceSupplierCode?'INVOICE SUPPLIER CODE':importSubId?'CH2 FALLBACK':'MISSING';
    const issues=[];
    if(exactOrder&&!manual){
      if(!orderSubId.trim())issues.push(`Sub ID is blank on the POS order and is exported blank, exactly as stored in POSActive.${masterSubIds.length===1?` The aligned master has "${masterSubIds[0]}".`:''} If POSActive cannot match it, set the Sub ID on the product in POSActive, re-export the order and run again.`);
    }
    else if(!orderSubId&&source==='INVOICE SUPPLIER CODE')issues.push('Order Sub ID is blank. The matched invoice supplier code is used instead; review remains recommended, but download is allowed.');
    else if(!orderSubId&&source==='ALIGNED MASTER')issues.push('Order Sub ID is blank. The single exact aligned-master Sub ID is used instead; review remains recommended, but download is allowed.');
    else if(!orderSubId)issues.push('Order Sub ID is blank. The exported fallback key is not verified against POSActive. Update the supplier key in POSActive or confirm a working key here.');
    if(manual&&manual!==orderSubId)issues.push('User-selected key differs from the uploaded order. Confirm this key exists in POSActive; editing this field only changes the TXT.');
    if(!exactOrder&&masterSubIds.length>1)issues.push('Aligned master has multiple Sub IDs for this product; no alternative was selected automatically.');
    else if(masterSubIds.length===1&&orderSubId&&orderSubId.trim()&&masterSubIds[0]!==clean(orderSubId))issues.push('Aligned master Sub ID differs from the order. The order key is retained unless you enter an override.');
    // v2.6.31 — Sub IDs are existing POSActive data. Spaces, %, $, " and other characters are
    // exported exactly as stored (e.g. `3 PER SKU 25%`) and are not a review condition.
    if(!importSubId)issues.push('No single import key could be resolved.');
    return {barcode,plu,orderSubId,masterSubIds,masterCandidates:candidates,invoiceCodes:codes,invoiceSupplierCodes:supplierCodes,importSubId,source,issues,status:issues.length?'REVIEW':'ORDER KEY',masterLinked:candidates.length>0};
  }

  function reviewImportKeys(refs,posOrder,reconciliation,options={}){
    const details=detailBySourceRow(reconciliation);
    const review=sortedPos(posOrder).flatMap((pos,index)=>{
      const detail=details.get(sourceRowKey(pos))||(reconciliation&&reconciliation.detail||[])[index];
      if(!detail||!detail.invoiceRows||!detail.invoiceRows.length)return [];
      const identity=resolveImportIdentity(pos,refs,detail.invoiceRows,options);
      return [{pos,detail,identity}];
    });
    const counts=new Map();for(const {identity} of review)if(identity.importSubId)counts.set(identity.importSubId,(counts.get(identity.importSubId)||0)+1);
    for(const {identity} of review)if((counts.get(identity.importSubId)||0)>1){identity.issues.push('This import Sub ID is shared by multiple invoiced order rows. Check which product POSActive selects.');identity.status='REVIEW';}
    return review;
  }

  function exportKeyReview(refs,posOrder,reconciliation,options={}){
    const review=reviewImportKeys(refs,posOrder,reconciliation,options);
    const headers=['POS ORDER','POS INDEX','BARCODE','POS PLU','DESCRIPTION','INVOICE NO','CH2 ITEM CODE','INVOICE SUPPLIER CODE','ORDER SUB ID','MASTER SUB IDS','IMPORT SUB ID','KEY SOURCE','PRODUCT MATCH','KEY STATUS','REVIEW NOTE'];
    const rows=[headers,...review.map(({pos,detail,identity:id})=>[posOrder.orderNumber,pos.posIndex,id.barcode,id.plu,pos.description,detail.invoiceNumbers,id.invoiceCodes.join(' | '),id.invoiceSupplierCodes.join(' | '),id.orderSubId,id.masterSubIds.join(' | '),id.importSubId,id.source,detail.matchConfidence,id.status,id.issues.join(' ')])];
    const text='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n')+'\r\n';
    const filename=`POS_Key_Review_(${safePart(posOrder.orderNumber)}).csv`;
    downloadBlob(new Blob([text],{type:'text/csv;charset=utf-8'}),filename);
    return {filename,rows:review.length,review:review.filter(x=>x.identity.status==='REVIEW').length};
  }
  function masterCandidatesForInvoiceRow(inv,refs){
    const master=refs&&refs.master,pc=digits(inv&&inv.productCode);if(!master||!pc)return [];
    if(master.byCodeAll&&master.byCodeAll.has(pc))return master.byCodeAll.get(pc).slice();
    if(master.byCode&&master.byCode.has(pc))return [master.byCode.get(pc)];
    return [];
  }
  function candidateMatchesIdentity(rec,id){
    if(!rec||!id)return false;
    const rb=digits(rec.POS_MASTER_BARCODE),ib=digits(id.barcode);if(rb&&ib&&rb===ib)return true;
    const rp=normCode(rec.POS_PLU),ip=normCode(id.plu);if(rp&&ip&&rp===ip)return true;
    const ri=normCode(rec.POS_SUB_ID),ii=normCode(id.orderSubId);if(ri&&ii&&ri===ii)return true;
    return false;
  }
  function candidateHasPosIdentity(rec){return !!(digits(rec&&rec.POS_MASTER_BARCODE)||normCode(rec&&rec.POS_PLU)||normCode(rec&&rec.POS_SUB_ID));}
  function candidateSummary(rec){return [code(rec&&rec.POS_SUB_ID),digits(rec&&rec.POS_MASTER_BARCODE),code(rec&&rec.POS_PLU)].filter(Boolean).join('/');}
  function rawOrderIdentity(pos){return {orderSubId:code(pos&&pos.subId),barcode:digits(pos&&pos.barcode),plu:code(pos&&pos.plu),description:clean(pos&&pos.description)};}
  function descriptionEvidence(inv,pos,candidates){
    let score=Number(inv&&inv.descriptionScore)||0;
    if(PHF._descriptionScore&&typeof PHF._descriptionScore==='function'){
      score=Math.max(score,Number(PHF._descriptionScore(inv&&inv.description,pos&&pos.description))||0);
      for(const rec of candidates||[])score=Math.max(score,Number(PHF._descriptionScore(rec&&rec.POS_DESCR,pos&&pos.description))||0);
    }
    return score;
  }
  function closeEnough(a,b,tol){const x=n(a),y=n(b);return x!=null&&y!=null&&Math.abs(x-y)<=tol;}
  function strongIndependentEvidence(inv,pos,candidates){
    const desc=descriptionEvidence(inv,pos,candidates),ws=closeEnough(inv&&inv.normalWholesale,pos&&pos.normalWholesale,0.05),rrp=closeEnough(inv&&inv.rrp,pos&&pos.rrp,0.50);
    const confidence=clean(inv&&inv.matchConfidence).toUpperCase(),method=clean(inv&&inv.matchMethod).toUpperCase();
    const direct=confidence==='HIGH'&&(/CH2 PRODUCT CODE.*POS SUB ID|SUPPLIER UPDATE.*BARCODE.*POS ORDER/.test(method));
    const semantic=(confidence==='HIGH'||confidence==='MEDIUM')&&desc>=70&&ws&&(rrp||desc>=82);
    return {ok:direct||semantic,direct,semantic,desc,ws,rrp,confidence,method};
  }
  function lineLabel(pos,index){if(pos&&pos.invoiceOnly)return `Invoice-only line${clean(pos.description)?` (${clean(pos.description)})`:''}`;return `POS row ${index+1}${clean(pos&&pos.description)?` (${clean(pos.description)})`:''}`;}

  // v2.6.30 — invoice-only lines: billed by CH2 but not present on the uploaded POS order.
  // They are offered in POS Layout as receivable rows (unticked = not supplied, like every
  // other row). The pseudo POS row is built from the aligned master for the CH2 code so the
  // POSActive key, brand and current POS prices are available.
  function invoiceOnlyKey(inv){return `INV:${invoiceKey(inv)}`;}
  // The supplier the uploaded POS order was raised against (e.g. 134 = CH2 / Oborne).
  function orderSupplierOf(posOrder){
    const counts=new Map();for(const p of (posOrder&&posOrder.rows)||[]){const s=digits(p&&p.supplier);if(s)counts.set(s,(counts.get(s)||0)+1);}
    let best='',n=0;for(const [k,v] of counts)if(v>n){best=k;n=v;}return best;
  }
  function supplierLabel(refs,no){const name=no&&refs&&refs.supplier&&refs.supplier.supplierMap&&typeof refs.supplier.supplierMap.get==='function'?refs.supplier.supplierMap.get(no):'';return no?(name?`${name} (${no})`:`supplier ${no}`):'';}
  function invoiceOnlyPos(inv,refs,posIndex,orderSupplier=''){
    const recs=masterCandidatesForInvoiceRow(inv,refs),rec=recs.find(r=>digits(r&&r.POS_MASTER_BARCODE)||clean(r&&r.POS_PLU))||recs[0]||{};
    const key=invoiceOnlyKey(inv),gst=n(inv&&inv.gstPct)??n(rec.POS_GST_TAX_PC)??0,ws=n(rec.POS_WSP_EXCGST),last=n(rec.POS_LAST_PRICE),rrp=n(rec.POS_RRP_INCGST);
    const raw={qty:0,or_qty:0,units:1,gst_tax_pc:gst,adjwsprce:ws??'',adjrrprce:rrp??'',adjcatprce:last??'',adjdprce:last??'',last_price:last??'',mupc:'',gppc:''};
    return {invoiceOnly:true,posIndex,sourceRow:key,identity:key,orderNumber:'',plu:code(rec.POS_PLU),barcode:digits(rec.POS_MASTER_BARCODE),subId:'',masterSubId:clean(rec.POS_SUB_ID),
      description:clean(rec.POS_DESCR)||clean(inv&&inv.description),gstPct:gst,orderedQty:0,normalWholesale:ws,expectedUnit:last,expectedDiscountPct:(ws&&last!=null)?(1-last/ws)*100:null,lastPrice:last,rrp,
      // The line was invoiced by the order's supplier (CH2), so its expected discount comes from
      // that supplier's rules; the POSActive supplier is kept separately for the explanation.
      supplier:orderSupplier||digits(rec.POS_SUPPLIER_NUMBER)||digits(rec.POS_SUPPLIER_RAW),company:orderSupplier?'':clean(rec.POS_SUPPLIER_NAME),raw,
      // v2.6.32 — why an invoiced product is absent from the order: POSActive assigns it to a
      // different supplier (e.g. ORA MAG3 → 602, PUKKA → 140) than the order (CH2 → 134).
      orderSupplier,posSupplier:digits(rec.POS_SUPPLIER_NUMBER)||digits(rec.POS_SUPPLIER_RAW),inMaster:!!(rec.POS_MASTER_BARCODE||rec.POS_PLU||rec.POS_DESCR),
      supplierMismatch:!!(orderSupplier&&(digits(rec.POS_SUPPLIER_NUMBER)||digits(rec.POS_SUPPLIER_RAW))&&orderSupplier!==(digits(rec.POS_SUPPLIER_NUMBER)||digits(rec.POS_SUPPLIER_RAW))),
      posSupplierLabel:supplierLabel(refs,digits(rec.POS_SUPPLIER_NUMBER)||digits(rec.POS_SUPPLIER_RAW)),orderSupplierLabel:supplierLabel(refs,orderSupplier),ch2Code:digits(inv&&inv.productCode)};
  }
  function invoiceOnlyEntries(reconciliation,refs,posOrder){
    const base=((posOrder&&posOrder.rows)||[]).length,orderSupplier=orderSupplierOf(posOrder);
    return ((reconciliation&&reconciliation.unmatchedInvoice)||[]).filter(inv=>inv&&(n(inv.qtySupplied)||0)>0&&(n(inv.unitPriceExGst)||0)!==0).map((inv,i)=>{
      const pos=invoiceOnlyPos(inv,refs,base+i+1,orderSupplier),row={...inv,matchConfidence:'',matchMethod:'INVOICE ONLY — NOT ON POS ORDER'},q=n(inv.qtySupplied)||0,ws=n(inv.normalWholesale);
      const detail={invoiceOnly:true,posIndex:pos.posIndex,sourceRow:pos.sourceRow,identity:pos.identity,plu:pos.plu,barcode:pos.barcode,subId:'',posDescription:pos.description,orderedQty:0,suppliedQty:q,qtyVariance:q,
        invoiceNormalWholesale:ws!=null?round(ws,2):null,actualDiscountPct:n(inv.discountPct),actualUnit:n(inv.unitPriceExGst),status:'INVOICE ONLY / NOT ON POS ORDER',hasException:true,
        invoiceNumbers:invoiceNo(inv),sourceFiles:clean(inv.sourceFile),matchConfidence:'',matchMethods:row.matchMethod,invoiceRows:[row]};
      return {pos,detail,inv};
    });
  }

  function overrideTarget(options,invoiceNumber){
    const o=options&&options.orderOverrides;if(!o)return '';
    if(o instanceof Map)return clean(o.get(invoiceNumber));
    return clean(o[invoiceNumber]);
  }
  function receivingOverride(options,pos){
    const map=options&&options.receivingBySourceRow,key=sourceRowKey(pos);if(!map||!key)return {touched:false,value:null};
    if(map instanceof Map){if(!map.has(key))return {touched:false,value:null};return {touched:true,value:n(map.get(key))};}
    if(!Object.prototype.hasOwnProperty.call(map,key))return {touched:false,value:null};
    return {touched:true,value:n(map[key])};
  }

  function selectedOverride(options,pos){
    const map=options&&options.selectedBySourceRow,key=sourceRowKey(pos);if(!map||!key)return null;
    if(map instanceof Map)return map.has(key)?!!map.get(key):null;
    return Object.prototype.hasOwnProperty.call(map,key)?!!map[key]:null;
  }

  function groupDocuments(invoiceDocs,posOrder,options={}){
    const docs=activeDocs(invoiceDocs),groups=[],byNo=new Map(),errors=[],warnings=[],posNo=clean(posOrder&&posOrder.orderNumber);
    for(const doc of docs){
      const m=docMeta(doc);if(!m.number){pushIssue(errors,`${m.sourceFile||'Supplier invoice'}: invoice number is missing.`);continue;}
      if(!byNo.has(m.number)){const g={number:m.number,customerPo:m.customerPo,sourceFiles:new Set(),docs:[],orderLink:null};byNo.set(m.number,g);groups.push(g);}
      const g=byNo.get(m.number);g.docs.push(doc);if(m.sourceFile)g.sourceFiles.add(m.sourceFile);if(m.customerPo&&!g.customerPo)g.customerPo=m.customerPo;
    }
    for(const g of groups){
      const files=[...g.sourceFiles];if(g.docs.length>1)pushIssue(errors,`Invoice ${g.number} was uploaded more than once${files.length?` (${files.join(', ')})`:''}. Remove the duplicate copy before creating the POS import file.`);
      if(!posNo){pushIssue(errors,`Invoice ${g.number}: uploaded POS order number is missing.`);continue;}
      if(g.customerPo&&!sameRef(g.customerPo,posNo)){
        const explicit=overrideTarget(options,g.number);
        if(explicit&&!sameRef(explicit,posNo)){pushIssue(errors,`Invoice ${g.number}: saved order override points to ${explicit}, but the uploaded POS order is ${posNo}.`);continue;}
        const mode=explicit?'MANUAL':'AUTO';g.orderLink={mode,invoiceNumber:g.number,originalCustomerPo:g.customerPo,posOrder:posNo};
        warnings.push(`${mode} POS ORDER LINK — Invoice ${g.number}: CH2 Customer PO ${g.customerPo} differs from uploaded POS order ${posNo}. The uploaded POS order is used only for POSActive routing/filename; the original CH2 Customer PO remains unchanged in the reconciliation audit.`);
      }else g.orderLink={mode:'DIRECT',invoiceNumber:g.number,originalCustomerPo:g.customerPo,posOrder:posNo};
    }
    if(!groups.length&&!errors.length)pushIssue(errors,'No supplier invoice is available for POS import.');
    return {groups,errors,warnings,posOrder:posNo};
  }

  // v2.6.28 — a Normal W/S that CH2 did not print (filled from the POS master
  // CH2_WHOLESALE_EX_GST reference or derived from Unit Price ÷ Disc %) is supporting
  // data, not invoice arithmetic, so a small reference/invoice difference is a review
  // note and never blocks the download.
  function wsBackfilled(inv){const s=clean(inv&&inv.normalWholesaleSource);return !!s&&s!=='INVOICE';}
  function validateSourceInvoiceRow(inv,errors,warnings){
    const ln=lineText(inv&&inv.invoiceLine)||'?';const q=n(inv&&inv.qtySupplied),unit=n(inv&&inv.unitPriceExGst),ext=n(inv&&inv.extendedExGst),gst=n(inv&&inv.gstAmount)||0,total=n(inv&&inv.totalIncGst),ws=n(inv&&inv.normalWholesale),disc=n(inv&&inv.discountPct);
    if(q==null||q<0){pushIssue(errors,`Invoice line ${ln}: Quantity Supplied is missing/invalid.`);return;}
    if(unit==null){pushIssue(errors,`Invoice line ${ln}: Unit Price ex GST is missing.`);return;}
    if(q>0&&unit>0&&ext!=null&&Math.abs(round(unit*q,2)-round(ext,2))>0.02)pushIssue(errors,`Invoice line ${ln}: Unit Price × Qty does not equal Extended ex GST.`);
    if(q>0&&unit>0&&ws!=null&&disc!=null&&Math.abs(ws*(1-disc/100)-unit)>0.011){
      if(wsBackfilled(inv))pushIssue(warnings,`Invoice line ${ln}: Normal W/S was not printed by CH2; the filled value ${fixed(ws,2)} (${clean(inv.normalWholesaleSource)}) less ${fixed(disc,2)}% differs from Unit Price ${fixed(unit,4)}. Review only; download remains available.`);
      else pushIssue(errors,`Invoice line ${ln}: Normal W/S less discount does not equal Unit Price.`);
    }
    if(ext!=null&&gst>0&&Math.abs(round(ext*0.10,2)-round(gst,2))>0.011)pushIssue(errors,`Invoice line ${ln}: GST is not 10% of Extended ex GST.`);
    if(ext!=null&&total!=null&&Math.abs(round(ext+gst,2)-round(total,2))>0.011)pushIssue(errors,`Invoice line ${ln}: Extended ex GST + GST does not equal Total.`);
    if(q===0)warnings.push(`Invoice line ${ln}: excluded because supplied quantity is zero.`);
    if(unit===0)warnings.push(`Invoice line ${ln}: excluded because it is a free/bonus line (unit price 0.0000). Key it manually if required.`);
  }

  function sameCommercialTerms(rows){
    if((rows||[]).length<=1)return true;const first=rows[0],eq=(a,b,t)=>{const x=n(a),y=n(b);return x!=null&&y!=null&&Math.abs(x-y)<=t;};
    return rows.every(r=>eq(r.unitPriceExGst,first.unitPriceExGst,0.00011)&&eq(r.discountPct,first.discountPct,0.011)&&eq(r.normalWholesale,first.normalWholesale,0.011)&&eq(r.gstPct,first.gstPct,0.05));
  }
  function allocateReceiving(rows,target,errors,label,warnings){
    const src=(rows||[]).slice().sort((a,b)=>(n(a&&a.invoiceLine)||0)-(n(b&&b.invoiceLine)||0)),original=round(src.reduce((a,r)=>a+(n(r&&r.qtySupplied)||0),0),3),t=round(Math.max(0,n(target)||0),3);
    if(Math.abs(t-original)<=0.0005)return new Map(src.map(r=>[invoiceKey(r),n(r.qtySupplied)||0]));
    // v2.6.28 — the user's Found quantity is authoritative. When one POS item spans invoice
    // lines with different terms, allocate in invoice-line order and flag it for review
    // instead of blocking the download.
    if(src.length>1&&!sameCommercialTerms(src))pushIssue(warnings||errors,`${label}: receiving quantity was changed from ${qtyText(original)} to ${qtyText(t)} across invoice lines with different price/discount terms. Found was allocated in invoice-line order (earlier lines filled first, the last line takes any excess); review the per-line quantities in POSActive.`);
    const out=new Map();let remaining=t;
    for(let i=0;i<src.length;i++){
      const r=src[i],orig=Math.max(0,n(r.qtySupplied)||0),q=i===src.length-1?remaining:Math.min(orig,remaining);out.set(invoiceKey(r),round(Math.max(0,q),3));remaining=round(Math.max(0,remaining-q),3);
    }
    return out;
  }

  function validateMasterForContext(ctx,inv,refs,posRows,errors,warnings){
    const pos=ctx.pos,index=ctx.index,id=ctx.identity,pc=digits(inv&&inv.productCode),candidates=masterCandidatesForInvoiceRow(inv,refs);
    if(!pc){pushIssue(errors,`${lineLabel(pos,index)}: a supplied invoice line has no CH2 product code.`);return;}
    if(!candidates.length){warnings.push(`${lineLabel(pos,index)}: MASTER CODE NOT FOUND — CH2 product ${pc} is absent from the current POS/master crosswalk. The POS order match is preserved and POSActive will perform its own final Sub ID validation.`);return;}
    if(candidates.some(rec=>candidateMatchesIdentity(rec,id)))return;
    const anchored=candidates.filter(candidateHasPosIdentity);
    if(!anchored.length){warnings.push(`${lineLabel(pos,index)}: MASTER LINK MISSING — CH2 product ${pc} exists without a POS barcode/PLU/Sub ID link. This is not treated as a contradiction.`);return;}
    const competing=[];
    for(let oi=0;oi<posRows.length;oi++){if(oi===index)continue;const otherId=rawOrderIdentity(posRows[oi]);if(anchored.some(rec=>candidateMatchesIdentity(rec,otherId)))competing.push({index:oi,pos:posRows[oi]});}
    const examples=anchored.slice(0,3).map(candidateSummary).filter(Boolean).join(', ');
    if(competing.length){const c=competing[0];pushIssue(warnings,`${lineLabel(pos,index)}: MASTER IDENTITY REVIEW — CH2 product ${pc} also maps to POS row ${c.index+1}${clean(c.pos&&c.pos.description)?` (${clean(c.pos.description)})`:''}${examples?` [master ${examples}]`:''}. The current reconciliation match is retained and export remains available.`);return;}
    const evidence=strongIndependentEvidence(inv,pos,anchored);
    if(evidence.ok)warnings.push(`${lineLabel(pos,index)}: MASTER IDENTITY DIFFERENCE — CH2 product ${pc} has different/newer master identifiers${examples?` (${examples})`:''}, but no competing order row owns them and invoice/order evidence is strong.`);
    else pushIssue(warnings,`${lineLabel(pos,index)}: MASTER IDENTITY REVIEW — CH2 product ${pc} differs from this order row's current master identifiers and independent evidence is limited. Review this row; export remains available.`);
  }

  // v2.6.28 — every aligned-master record for the exact POS PLU/barcode, including
  // records that have no CH2 code (those are absent from byBarcode/byPlu). A shared
  // barcode never borrows pricing or keys from a different PLU.
  function masterRecordsForPos(pos,refs){
    const master=refs&&refs.master;if(!master||!pos)return [];
    const b=digits(pos&&pos.barcode),p=digits(pos&&pos.plu),out=[],seen=new Set();
    const add=r=>{if(!r)return;const k=`${r.SOURCE_SHEET||''}|${r.SOURCE_ROW||''}|${r.MASTER_CODE||''}|${r.POS_PLU||''}|${r.POS_MASTER_BARCODE||''}`;if(seen.has(k))return;seen.add(k);out.push(r);};
    const get=(map,key)=>map&&key&&typeof map.get==='function'?map.get(key):null;
    add(get(master.byBarcode,b));add(get(master.byPlu,p));
    for(const r of get(master.byPluAll,p)||[])add(r);
    for(const r of get(master.byBarcodeAll,b)||[])add(r);
    return out.filter(r=>{const rp=digits(r.POS_PLU),rb=digits(r.POS_MASTER_BARCODE);if(p&&rp)return p===rp&&(!b||!rb||b===rb);return !!(b&&rb===b);});
  }
  // Normal W/S for a POS row without a usable invoice W/S: POS master
  // CH2_WHOLESALE_EX_GST first (as instructed), then the POS order AdjWSPrc, then the
  // master POS_WSP_EXCGST.
  function posWholesaleFallback(pos,refs,records=null){
    const recs=records||masterRecordsForPos(pos,refs);
    for(const r of recs){const v=n(r&&r.POS_CH2_WHOLESALE_EX_GST);if(v!=null&&v>0)return {value:round(v,4),source:'POS MASTER CH2_WHOLESALE_EX_GST'};}
    const own=n(pos&&pos.normalWholesale);if(own!=null&&own>0)return {value:round(own,4),source:'POS ORDER AdjWSPrc'};
    for(const r of recs){const v=n(r&&r.POS_WSP_EXCGST);if(v!=null&&v>0)return {value:round(v,4),source:'POS MASTER POS_WSP_EXCGST'};}
    return {value:null,source:''};
  }
  // User-is-king fallback: a POS Layout row that CH2 did not invoice, but which staff
  // ticked and physically counted (Found > 0), is exported as a manual receiving line
  // priced from the POS master / POS order with the matched discount rule.
  function manualReceivingRecord(ctx,refs,options,invoiceNoValue,lineNo,warnings,errors){
    const pos=ctx.pos,found=ctx.found,label=lineLabel(pos,ctx.index),recs=masterRecordsForPos(pos,refs),wsInfo=posWholesaleFallback(pos,refs,recs);
    let normalWs=wsInfo.value,wsSource=wsInfo.source,disc=null,discSource='';
    if(normalWs!=null&&PHF.linkedPos&&typeof PHF.linkedPos.expectedPriceForPos==='function'){
      try{const calc=PHF.linkedPos.expectedPriceForPos(pos,refs,normalWs);if(calc&&calc.match&&calc.discountPct!=null&&Number.isFinite(Number(calc.discountPct))){disc=Number(calc.discountPct);discSource='matched discount rule';}}
      catch(err){console.warn('Manual receiving discount lookup failed',err);}
    }
    if(disc==null){const d=n(pos&&pos.expectedDiscountPct);if(d!=null&&d>=0&&d<100){disc=round(d,2);discSource='POS order AdjDPrc vs AdjWSPrc';}}
    if(disc==null){disc=0;discSource='no discount rule found';}
    if(normalWs==null){
      const cost=n(pos&&pos.expectedUnit)??n(pos&&pos.lastPrice);
      if(cost!=null&&cost>0){normalWs=round(cost/(1-disc/100),2);wsSource='POS order cost ÷ (1 − Disc %)';}
      else{normalWs=0;wsSource='NOT AVAILABLE';pushIssue(warnings,`${label}: MANUAL RECEIVING — no Normal W/S or cost is available from the POS master or POS order, so this line is exported at 0.00. Key the cost in POSActive.`);}
    }
    // Same 2dp cost the POS Layout shows as AdjCatPrc, so the row total and the TXT agree.
    const unit=round(normalWs*(1-disc/100),2),ext=round(unit*found,2);
    let gstRate=n(pos&&pos.gstPct);if(gstRate==null)for(const r of recs){const g=n(r&&r.POS_GST_TAX_PC);if(g!=null){gstRate=g;break;}}
    if(gstRate==null){gstRate=0;pushIssue(warnings,`${label}: MANUAL RECEIVING — GST % is not available on the POS order or master; exported with 0% GST.`);}
    const gst=round(ext*gstRate/100,2),total=round(ext+gst,2);
    const id=resolveImportIdentity(pos,refs,[],options),masterCodes=[...new Set(recs.map(r=>digits(r&&r.MASTER_CODE)).filter(Boolean))],masterCode=masterCodes.length===1?masterCodes[0]:'';
    let subId=id.importSubId,keySource=id.source;
    if(!subId&&typeof (pos&&pos.subIdRaw)!=='string'){
      if(masterCode){subId=masterCode;keySource='MASTER CH2 CODE';}
      else if(code(pos&&pos.plu)){subId=code(pos.plu);keySource='POS PLU FALLBACK';}
      else if(digits(pos&&pos.barcode)){subId=digits(pos.barcode);keySource='POS BARCODE FALLBACK';}
    }
    if(/[\t\r\n]/.test(subId))pushIssue(errors,`${label}: Sub ID contains a TAB or line break, which would corrupt the 15-column POSActive file. Correct the POS Sub ID before export.`);
    const description=sanitizeDataText(clean(pos&&pos.description)||clean(recs[0]&&recs[0].POS_DESCR))||'MANUAL RECEIVING';
    warnings.push(`MANUAL RECEIVING LINE — ${label}: Found ${qtyText(found)}, not invoiced by CH2. Added as invoice ${invoiceNoValue} line ${lineNo} · Normal WS ${fixed(normalWs,2)} (${wsSource}) less ${fixed(disc,2)}% (${discSource}) = ${fixed(unit,4)} ex GST · GST ${fixed(gstRate,0)}% · total ${fixed(total,2)} inc GST. POSActive matches on Sub ID "${subId||'(blank)'}" (${keySource}); confirm it exists on the open POSActive order.`);
    if(!subId)pushIssue(warnings,`${label}: MANUAL RECEIVING — no Sub ID, PLU or barcode could be resolved; POSActive may not be able to match this line.`);
    return {
      invoiceNo:invoiceNoValue,line:String(lineNo),ch2Code:masterCode||subId,supplierCode:sanitizeDataText(subId),subId,description,
      qty:found,qtySupplied:found,normalWs:round(normalWs,2),unitPrice:unit,rebate:0,extended:ext,gst,total,disc,
      sourceQty:0,receivingAdjusted:true,manualReceiving:true,pos,importIdentity:{...id,importSubId:subId,source:keySource}
    };
  }

  function buildInvoicePayload(group,refs,posOrder,reconciliation,options={}){
    const errors=[],warnings=[],posRows=sortedPos(posOrder),details=detailBySourceRow(reconciliation),contexts=[],invoiceToContext=new Map(),allocation=new Map(),receivingChanges=[],omittedNotSupplied=[],manualContexts=[];
    const groupNums=group&&group.numbers instanceof Set?group.numbers:new Set([clean(group&&group.number)].filter(Boolean)),unmatched=((reconciliation&&reconciliation.unmatchedInvoice)||[]).filter(r=>groupNums.has(invoiceNo(r))||group.sourceFiles.has(clean(r&&r.sourceFile)));
    // v2.6.30 — invoice-only lines ticked / counted in POS Layout are received like any
    // other line; unreceived ones are omitted (as before) and listed.
    const invoiceOnlyOmitted=[],invoiceOnlyReceived=[];
    if(unmatched.length){
      const entries=new Map(invoiceOnlyEntries(reconciliation,refs,posOrder).map(e=>[invoiceKey(e.inv),e]));
      for(const inv of unmatched){
        const e=entries.get(invoiceKey(inv)),recv=e?receivingOverride(options,e.pos):{touched:false,value:null},found=recv.touched?Math.max(0,round(recv.value||0,3)):0;
        if(!e||found<=0){invoiceOnlyOmitted.push(inv);continue;}
        const ctx={pos:e.pos,index:-1,detail:e.detail,identity:canonicalIdentity(e.pos,refs),invRows:[inv],invoiceOnly:true};
        contexts.push(ctx);invoiceToContext.set(invoiceKey(inv),ctx);validateSourceInvoiceRow(inv,errors,warnings);
        const map=allocateReceiving([inv],found,errors,lineLabel(e.pos,-1),warnings);if(map)for(const [k,v] of map)allocation.set(k,v);
        const q=n(inv.qtySupplied)||0;if(Math.abs(found-q)>0.0005)receivingChanges.push({pos:e.pos,index:-1,invoiceQty:q,found});
        invoiceOnlyReceived.push({inv,found,pos:e.pos});
      }
      if(invoiceOnlyReceived.length){
        warnings.push(`INVOICE-ONLY RECEIVED — ${invoiceOnlyReceived.length} billed line${invoiceOnlyReceived.length===1?' is':'s are'} not on POS order ${clean(posOrder&&posOrder.orderNumber)||''} but ${invoiceOnlyReceived.length===1?'was':'were'} ticked/counted in POS Layout and ${invoiceOnlyReceived.length===1?'is':'are'} included in the POSActive TXT. POSActive can only apply a line whose Sub ID exists on the open order; add the product to the order first if the import rejects it.`);
        for(const x of invoiceOnlyReceived.slice(0,12))warnings.push(`Included invoice-only ${invoiceNo(x.inv)||group.number} line ${lineText(x.inv&&x.inv.invoiceLine)||'?'} · CH2 ${digits(x.inv&&x.inv.productCode)||'no code'} · ${sanitizeText(x.inv&&x.inv.description)||'no description'} · Found ${qtyText(x.found)}.`);
      }
      if(invoiceOnlyOmitted.length){
        pushIssue(warnings,`INVOICE-ONLY REVIEW — Invoice ${group.number}: ${invoiceOnlyOmitted.length} billed line${invoiceOnlyOmitted.length===1?' is':'s are'} not present in the uploaded POS order and ${invoiceOnlyOmitted.length===1?'was':'were'} not ticked/counted in POS Layout, so ${invoiceOnlyOmitted.length===1?'it is':'they are'} omitted from the POSActive TXT. Tick them in POS Layout to include them.`);
        for(const inv of invoiceOnlyOmitted.slice(0,12))pushIssue(warnings,`Omitted invoice ${invoiceNo(inv)||group.number} line ${lineText(inv&&inv.invoiceLine)||'?'} · CH2 ${digits(inv&&inv.productCode)||'no code'} · ${sanitizeText(inv&&inv.description)||'no description'}.`);
      }
    }

    for(let index=0;index<posRows.length;index++){
      const pos=posRows[index],detail=details.get(sourceRowKey(pos))||(reconciliation&&reconciliation.detail||[])[index]||{},identity=canonicalIdentity(pos,refs),invRows=invoiceRowsFor(detail,group).slice().sort((a,b)=>(n(a&&a.invoiceLine)||0)-(n(b&&b.invoiceLine)||0));
      const ctx={pos,index,detail,identity,invRows};contexts.push(ctx);for(const inv of invRows)invoiceToContext.set(invoiceKey(inv),ctx);
      if(invRows.length&&clean(detail.matchConfidence).toUpperCase()==='LOW')pushIssue(warnings,`${lineLabel(pos,index)}: invoice match confidence is LOW; review the aligned product before POS import. Export remains available.`);
      for(const inv of invRows){validateSourceInvoiceRow(inv,errors,warnings);validateMasterForContext(ctx,inv,refs,posRows,errors,warnings);}

      const recv=receivingOverride(options,pos),invoiceQty=round(invRows.reduce((a,r)=>a+(n(r&&r.qtySupplied)||0),0),3);
      if(recv.touched){
        const found=Math.max(0,round(recv.value||0,3));
        // v2.6.28 — user is king: a not-invoiced row with a positive Found quantity is
        // no longer a blocking error. It becomes a manual receiving line (built below).
        if(!invRows.length&&found>0){manualContexts.push({pos,index,detail,identity,found});continue;}
        if(invRows.length){const map=allocateReceiving(invRows,found,errors,lineLabel(pos,index),warnings);if(map){for(const [k,v] of map)allocation.set(k,v);if(Math.abs(found-invoiceQty)>0.0005)receivingChanges.push({pos,index,invoiceQty,found});}}
      }
    }

    const invoiceRows=[];for(const doc of group.docs)for(const row of (doc.rows||[]))invoiceRows.push(row);
    const invoiceRank=new Map([...groupNums].map((x,i)=>[x,i]));invoiceRows.sort((a,b)=>{const ar=invoiceRank.has(invoiceNo(a))?invoiceRank.get(invoiceNo(a)):9999,br=invoiceRank.has(invoiceNo(b))?invoiceRank.get(invoiceNo(b)):9999;if(ar!==br)return ar-br;return (n(a&&a.invoiceLine)||0)-(n(b&&b.invoiceLine)||0);});
    const sourceTotals={qty:sumQty(invoiceRows),ext:sum(invoiceRows,'extendedExGst'),gst:sum(invoiceRows,'gstAmount'),total:sum(invoiceRows,'totalIncGst')};
    const records=[];

    for(const inv of invoiceRows){
      const key=invoiceKey(inv),ctx=invoiceToContext.get(key);if(!ctx)continue;
      const originalQty=Math.max(0,n(inv&&inv.qtySupplied)||0),unit=n(inv&&inv.unitPriceExGst);let disc=n(inv&&inv.discountPct),normalWs=n(inv&&inv.normalWholesale),wsSource=wsBackfilled(inv)?clean(inv.normalWholesaleSource):'';
      if(originalQty<=0||unit==null||unit===0)continue;
      // v2.6.28 — CH2 did not print Normal W/S and the reconciliation could not fill it
      // from CH2_WHOLESALE_EX_GST: derive it from the printed discount, otherwise use the
      // matched POS row's master/order wholesale. Missing data is a review note, not a block.
      const lnText=lineText(inv.invoiceLine);
      if(normalWs==null&&disc!=null&&disc>=0&&disc<100){normalWs=round(unit/(1-disc/100),2);wsSource='DERIVED UNIT ÷ (1 − DISC %)';warnings.push(`Invoice line ${lnText}: Normal W/S not printed; ${fixed(normalWs,2)} derived from Unit Price ÷ (1 − ${fixed(disc,2)}%).`);}
      // v2.6.29 — CH2 printed neither Normal W/S nor Disc %: the line was billed at wholesale.
      if(normalWs==null&&disc==null){normalWs=round(unit,2);disc=0;wsSource='UNIT PRICE (NO DISC % PRINTED)';warnings.push(`Invoice line ${lnText}: CH2 printed no Normal W/S or Disc %; exported with Normal WS = Unit Price ${fixed(normalWs,2)} and 0.00% discount.`);}
      if(normalWs==null){const fb=posWholesaleFallback(ctx.pos,refs);if(fb.value!=null){normalWs=round(fb.value,2);wsSource=fb.source;warnings.push(`Invoice line ${lnText} · ${lineLabel(ctx.pos,ctx.index)}: Normal W/S not printed; ${fixed(normalWs,2)} used from ${fb.source}.`);}}
      if(disc==null&&normalWs!=null&&normalWs>0){const d=round((1-unit/normalWs)*100,2);if(d>=0&&d<100){disc=d;warnings.push(`Invoice line ${lnText}: Disc % not printed; ${fixed(disc,2)}% derived from Unit Price ÷ Normal W/S for POSActive.`);}}
      if(disc==null||normalWs==null||normalWs<=0){normalWs=round(unit,2);disc=0;wsSource=wsSource||'UNIT PRICE (NO W/S OR DISC %)';pushIssue(warnings,`Invoice line ${lnText}: Normal W/S and Disc % could not be confirmed; exported with Normal WS = Unit Price ${fixed(unit,2)} and 0% discount. Review AdjWSPrc in POSActive.`);}
      const outQty=allocation.has(key)?allocation.get(key):originalQty;
      if(outQty<=0){omittedNotSupplied.push({inv,ctx,selected:selectedOverride(options,ctx.pos)});continue;}
      const adjusted=Math.abs(outQty-originalQty)>0.0005,ext=adjusted?round(unit*outQty,2):round(inv.extendedExGst,2),gstRate=n(inv.gstPct)!=null?n(inv.gstPct):((n(inv.gstAmount)||0)>0?10:0),gst=adjusted?round(ext*gstRate/100,2):round(inv.gstAmount,2),total=adjusted?round(ext+gst,2):round(inv.totalIncGst,2);
      const importIdentity=resolveImportIdentity(ctx.pos,refs,ctx.invRows,options);
      const ch2Code=digits(inv.productCode),subId=importIdentity.importSubId,rawSupplierCode=clean(inv.supplierSku),rawDescription=clean(inv.description),supplierCode=sanitizeDataText(rawSupplierCode),description=sanitizeDataText(rawDescription);
      for(const issue of importIdentity.issues)pushIssue(warnings,`Invoice line ${lineText(inv.invoiceLine)} · ${lineLabel(ctx.pos,ctx.index)} · Import Sub ID "${subId}" (${importIdentity.source}): ${issue}`);
      if(/["$%]/.test(rawSupplierCode))warnings.push(`Invoice line ${lineText(inv.invoiceLine)}: POSActive-forbidden quote / dollar / percent character removed from Supplier Code for import only; reconciliation data is unchanged.`);
      if(/["$%]/.test(rawDescription))warnings.push(`Invoice line ${lineText(inv.invoiceLine)}: POSActive-forbidden quote / dollar / percent character removed from Description for import only; reconciliation data is unchanged.`);
      if(/[\t\r\n]/.test(subId))pushIssue(errors,`Invoice line ${lineText(inv.invoiceLine)} · ${lineLabel(ctx.pos,ctx.index)}: Sub ID contains a TAB or line break, which would corrupt the 15-column POSActive file. Correct the POS Sub ID before export.`);
      // v2.6.31 — the Sub ID (column 5) is written exactly as stored in POSActive, including
      // spaces and % $ " characters (e.g. `3 PER SKU 25%`). Only TAB/CR/LF are refused above
      // because they would split the tab-delimited record.
      if(!subId)pushIssue(warnings,`Invoice line ${lineText(inv.invoiceLine)} · ${lineLabel(ctx.pos,ctx.index)}: Sub ID is blank${importIdentity.source==='POS ORDER (BLANK)'?' on the POS order and is exported blank, exactly as stored':' and no key could be resolved'}.`);
      if(subId&&subId!==ch2Code)warnings.push(`IMPORT SUB ID — CH2 ${ch2Code} uses ${importIdentity.source} key ${subId} for ${description}.`);
      const predWs=round(round(ext/outQty,2)/(1-disc/100),2),wsRounded=round(normalWs,2),wsDiff=round(predWs-wsRounded,2);
      if(Math.abs(wsDiff)>0.011){
        if(wsSource)pushIssue(warnings,`Invoice line ${lineText(inv.invoiceLine)}: predicted POSActive WS ${predWs.toFixed(2)} differs from the filled Normal W/S ${wsRounded.toFixed(2)} (${wsSource}). Review only; download remains available.`);
        else pushIssue(errors,`Invoice line ${lineText(inv.invoiceLine)}: predicted POSActive WS ${predWs.toFixed(2)} differs from Normal W/S ${wsRounded.toFixed(2)} by more than 1c.`);
      }
      else if(Math.abs(wsDiff)>0.0001)warnings.push(`Invoice line ${lineText(inv.invoiceLine)}: POSActive WS is expected to round to ${predWs.toFixed(2)} vs invoice Normal W/S ${wsRounded.toFixed(2)} (1c rounding).`);
      records.push({
        invoiceNo:invoiceNo(inv)||group.number,line:lineText(inv.invoiceLine),ch2Code,supplierCode,subId,description,
        qty:outQty,qtySupplied:outQty,normalWs:wsRounded,unitPrice:unit,rebate:0,extended:ext,gst,total,disc,
        sourceQty:originalQty,receivingAdjusted:adjusted,pos:ctx.pos,importIdentity,invoiceOnly:!!ctx.invoiceOnly
      });
    }

    if(manualContexts.length){
      // Manual lines use the primary invoice number and line numbers after the highest
      // billed line, so they never collide with a real CH2 invoice line in this file.
      const primaryNo=clean(group&&group.number)||invoiceNo(invoiceRows[0])||'MANUAL';
      const primaryLines=invoiceRows.filter(r=>invoiceNo(r)===primaryNo).map(r=>Math.floor(n(r&&r.invoiceLine)||0));
      let nextLine=Math.max(0,...(primaryLines.length?primaryLines:invoiceRows.map(r=>Math.floor(n(r&&r.invoiceLine)||0))))+1;
      for(const mctx of manualContexts){
        const rec=manualReceivingRecord(mctx,refs,options,primaryNo,nextLine++,warnings,errors);
        records.push(rec);receivingChanges.push({pos:mctx.pos,index:mctx.index,invoiceQty:0,found:mctx.found,manual:true});
      }
    }

    if(omittedNotSupplied.length){
      const unticked=omittedNotSupplied.filter(x=>x.selected===false).length,explicitZero=omittedNotSupplied.length-unticked;
      const parts=[];if(unticked)parts.push(`${unticked} unticked`);if(explicitZero)parts.push(`${explicitZero} Found=0`);
      warnings.push(`POS LAYOUT NOT SUPPLIED — ${omittedNotSupplied.length} invoice line${omittedNotSupplied.length===1?' is':'s are'} omitted from the POSActive TXT (${parts.join(', ')}). POSActive cannot import zero-quantity lines.`);
      for(const x of omittedNotSupplied.slice(0,8))warnings.push(`Omitted line ${lineText(x.inv&&x.inv.invoiceLine)} ${sanitizeText(x.inv&&x.inv.description)} — ${x.selected===false?'unticked in POS Layout':'Found = 0'}.`);
    }
    if(!records.length&&invoiceRows.some(r=>(n(r&&r.qtySupplied)||0)>0&&(n(r&&r.unitPriceExGst)||0)!==0))pushIssue(errors,'No supplied POSActive rows remain. Tick at least one POS Layout item (or use Tick All) before downloading the import file.');

    const totals={qty:round(records.reduce((a,r)=>a+r.qtySupplied,0),3),ext:round(records.reduce((a,r)=>a+r.extended,0),2),gst:round(records.reduce((a,r)=>a+r.gst,0),2),total:round(records.reduce((a,r)=>a+r.total,0),2)};
    if(Math.abs(round(totals.ext+totals.gst-totals.total,2))>0.02)pushIssue(errors,`Invoice ${group.number}: POSActive import totals do not balance (${totals.ext.toFixed(2)} + GST ${totals.gst.toFixed(2)} ≠ ${totals.total.toFixed(2)}).`);
    if(!receivingChanges.length){
      if(Math.abs(totals.qty-sourceTotals.qty)>0.001||Math.abs(totals.ext-sourceTotals.ext)>0.02||Math.abs(totals.gst-sourceTotals.gst)>0.02||Math.abs(totals.total-sourceTotals.total)>0.02){
        const msg=`Invoice ${group.number}: generated file totals do not equal the parsed invoice totals.`;
        if(invoiceOnlyOmitted.length)pushIssue(warnings,`${msg} This is expected because ${invoiceOnlyOmitted.length} invoice-only line${invoiceOnlyOmitted.length===1?' was':'s were'} omitted.`);else pushIssue(errors,msg);
      }
    }else{
      warnings.push(`POS LAYOUT RECEIVING APPLIED — ${receivingChanges.length} product${receivingChanges.length===1?'':'s'} use Found quantities instead of CH2 supplied quantities. POSActive import total becomes ${totals.total.toFixed(2)} vs supplier invoice ${sourceTotals.total.toFixed(2)}; the full reconciliation workbook remains unchanged and preserves the original invoice.`);
      for(const x of receivingChanges.slice(0,12))warnings.push(`${lineLabel(x.pos,x.index)}: CH2 supplied ${qtyText(x.invoiceQty)} → POS Layout Found ${qtyText(x.found)}${x.manual?' (manual receiving line — not on the CH2 invoice)':''}.`);
    }

    const rows=[CONTRACT.headers.slice(),...records.map(r=>[
      r.invoiceNo,r.line,r.ch2Code,r.supplierCode,r.subId,r.description,qtyText(r.qty),qtyText(r.qtySupplied),fixed(r.normalWs,2),fixed(r.unitPrice,4),fixed(r.rebate,2),fixed(r.extended,2),fixed(r.gst,2),fixed(r.total,2),fixed(r.disc,2)
    ])];
    const text=makeTsv(rows);
    // v2.6.31 — predict POSActive's "Invoice items do not match suppliers order items" check.
    const matchCheck=posActiveMatchCheck(records,posOrder);
    if(matchCheck.mismatches.length){
      warnings.unshift(`POSACTIVE MATCH CHECK — ${matchCheck.mismatches.length} of ${matchCheck.total} TXT line${matchCheck.total===1?'':'s'} ${matchCheck.mismatches.length===1?'has a Sub ID':'have Sub IDs'} that ${matchCheck.mismatches.length===1?'is':'are'} not on POS order ${matchCheck.orderNumber}. POSActive will report ${matchCheck.mismatches.length===1?'it':'them'} as not matching the supplier order: ${matchCheck.mismatches.map(m=>`line ${m.line} ${m.description} [${m.subId||'blank'}] — ${m.reason}`).join('; ')}.`);
    }
    return {group,rows,records,text,totals,sourceTotals,receivingChanges,errors,warnings,matchCheck};
  }

  // Every TXT line is matched by POSActive against the Sub IDs on the open supplier order.
  // A line whose Sub ID is not on the uploaded POS order will be reported by POSActive's
  // Matching Status check, so it is identified here with the reason and the fix.
  function posActiveMatchCheck(records,posOrder){
    const exactKey=p=>typeof (p&&p.subIdRaw)==='string'?p.subIdRaw:clean(p&&p.subId);
    const orderNo=clean(posOrder&&posOrder.orderNumber),orderKeys=new Set(((posOrder&&posOrder.rows)||[]).map(exactKey).filter(k=>String(k).trim())),mismatches=[];
    for(const r of records||[]){
      const key=r&&r.subId!=null?String(r.subId):'',pos=(r&&r.pos)||{},name=clean(pos.description)||clean(r&&r.description);
      if(key.trim()&&orderKeys.has(key))continue;
      let reason,advice;
      if(pos.invoiceOnly&&pos.supplierMismatch){reason=`NOT ON POS ORDER — POSACTIVE SUPPLIER ${pos.posSupplier}`;advice=`CH2 invoiced ${name}, but POSActive assigns it to ${pos.posSupplierLabel}, not ${pos.orderSupplierLabel||'this order’s supplier'}, so it never appears on CH2 orders. To receive it through this import: change its POSActive supplier to ${pos.orderSupplier} with Sub ID ${pos.ch2Code||key} (or add it to order ${orderNo} with Sub ID ${key||'blank'}), re-export the order and run again. Otherwise untick it and receive it against ${pos.posSupplierLabel}.`;}
      else if(pos.invoiceOnly&&!pos.inMaster){reason='NOT ON POS ORDER — NOT IN POS MASTER';advice=`CH2 code ${pos.ch2Code||'?'} is not in the aligned POS master, so the product may not exist in POSActive. Create it (or link the CH2 code) in POSActive, add it to order ${orderNo}, re-export and run again — or untick it and receive it manually.`;}
      else if(pos.invoiceOnly){reason='NOT ON POS ORDER';advice=`Add ${name} to POSActive order ${orderNo} (Sub ID ${key||'blank'}), re-export the order and run again — or untick it here and receive it separately.`;}
      else if(!key.trim()){reason='POS ORDER ROW HAS NO SUB ID';advice=`The Sub ID is blank on the POS order, so it is exported blank exactly as stored. Set a Sub ID for ${name} (PLU ${clean(pos.plu)||'?'}) in POSActive — e.g. CH2 code ${clean(r&&r.ch2Code)||'?'} — then re-export the order and run again.`;}
      else{reason='SUB ID DIFFERS FROM ORDER';advice=`The order row has Sub ID "${exactKey(pos)}" but the TXT sends "${key}". Use the order's Sub ID or update POSActive.`;}
      // Invoice-only Sub IDs come from the POS master because the product is not in the uploaded
      // order file; if it is on the live POSActive order, re-exporting the order makes it exact.
      if(pos.invoiceOnly)advice+=` The Sub ID shown comes from the POS master, not the order file. If ${name} is already on your live POSActive order, re-export the order (BROWSEORDERFILES) and run again so its exact order Sub ID is used.`;
      mismatches.push({invoiceNo:r.invoiceNo,line:r.line,subId:key,description:clean(r.description),posDescription:name,reason,advice,total:n(r.total)||0,invoiceOnly:!!pos.invoiceOnly,manual:!!r.manualReceiving,sourceRow:pos.sourceRow});
    }
    return {total:(records||[]).length,matched:(records||[]).length-mismatches.length,mismatches,orderNumber:orderNo};
  }

  function makeTsv(rows){
    return (rows||[]).map((row,rowIndex)=>{
      if(!Array.isArray(row)||row.length!==CONTRACT.columns)throw new Error(`POSActive logical row ${rowIndex+1} does not have exactly ${CONTRACT.columns} fields.`);
      // Header text is part of the proven contract and must remain exact (including
      // "Disc %"). Most display-only text is normalized for the legacy import.
      // Column 5 (Sub ID, zero-based index 4) is POSActive's literal match key.
      // It is never silently sanitized. TAB/CR/LF are structurally forbidden because
      // they would break the tab-delimited row. Quote / dollar / percent characters are
      // valid literal Sub ID data and are preserved; they are review warnings only.
      return row.map((v,colIndex)=>{
        if(rowIndex===0)return clean(v);
        if(colIndex===4){const x=v==null?'':String(v);if(/[\t\r\n]/.test(x))throw new Error(`POSActive Sub ID in logical row ${rowIndex+1} contains a TAB or line break.`);return x;}
        return sanitizeDataText(v);
      }).join('\t');
    }).join('\r\n')+'\r\n';
  }
  function parseTsv(text){return String(text||'').split('\r\n').filter((x,i,a)=>x!==''||i<a.length-1).map(line=>line.split('\t'));}

  function validatePayload(payload){
    const errors=[...(payload&&payload.errors||[])],warnings=[...(payload&&payload.warnings||[])],rows=(payload&&payload.rows)||[],text=payload&&payload.text||'';
    if(rows.length<2)pushIssue(errors,'POSActive import contains no product rows.');
    const h=rows[0]||[];if(h.length!==CONTRACT.columns||!CONTRACT.headers.every((x,i)=>h[i]===x))pushIssue(errors,'POSActive header does not exactly match the proven 15-column contract.');
    for(let i=1;i<rows.length;i++)if((rows[i]||[]).length!==CONTRACT.columns){pushIssue(errors,`Generated POSActive row ${i+1} has ${(rows[i]||[]).length} fields instead of ${CONTRACT.columns}.`);break;}
    if(/^\uFEFF/.test(text))pushIssue(errors,'POSActive file unexpectedly contains a UTF-8 BOM.');
    if(/(^|[^\r])\n/.test(text))pushIssue(errors,'POSActive file contains LF-only line endings; CRLF is required.');
    if(text&&!text.endsWith('\r\n'))pushIssue(errors,'POSActive file does not end with CRLF.');
    const parsed=parseTsv(text);if(parsed.length!==rows.length)pushIssue(errors,`Serialized POSActive file contains ${parsed.length} rows; ${rows.length} were expected.`);
    if(parsed.some(r=>r.length!==CONTRACT.columns))pushIssue(errors,'Serialized POSActive file contains a row that does not have exactly 15 tab-delimited fields.');
    if(parsed.length&&!CONTRACT.headers.every((x,i)=>parsed[0][i]===x))pushIssue(errors,'Serialized POSActive header changed after conversion.');
    // Non-key display fields remain sanitized by makeTsv. Column 5 Sub ID is the literal
    // POSActive supplier-order key: quote / dollar / percent are permitted and preserved.
    // Only TAB/CR/LF remain structural blockers because they would split the TSV record.
    for(let i=1;i<parsed.length;i++){
      const row=parsed[i]||[];
      for(let c=0;c<row.length;c++){
        if(c===4)continue;
        if(/["$%]/.test(String(row[c]||''))){pushIssue(errors,`Serialized POSActive row ${i+1}, column ${c+1} contains a quote mark, dollar sign or percent sign outside Sub ID.`);break;}
      }
      const subId=String(row[4]||'');
      if(/[\t\r\n]/.test(subId))pushIssue(errors,`Serialized POSActive row ${i+1} Sub ID contains a TAB or line break.`);
    }
    return {ok:errors.length===0,errors,warnings};
  }

  // Single source for the auto-named merged POSActive TXT, shared with the on-screen
  // "Combined import" label so the preview and the downloaded file always agree.
  function importFilename(invoiceNumbers,orderNo){
    const numbers=[...new Set((invoiceNumbers||[]).map(clean).filter(Boolean))],primary=numbers[0]||'CURRENT';
    const invoicePart=numbers.length>1?numbers.map(safePart).join('+'):safePart(primary);
    return `oborne_invoice${numbers.length>1?'s':''}_{${invoicePart}}_(${safePart(orderNo)}).txt`;
  }

  function buildLegacyFiles(invoiceDocs,refs,posOrder,reconciliation,options={}){
    const grouped=groupDocuments(invoiceDocs,posOrder,options);if(grouped.errors.length)return {ok:false,errors:grouped.errors,warnings:grouped.warnings||[],files:[]};
    const errors=[],warnings=[...(grouped.warnings||[])],orderNo=clean(posOrder&&posOrder.orderNumber||reconciliation&&reconciliation.orderNumber),groups=grouped.groups||[];
    const numbers=[...new Set(groups.map(g=>clean(g&&g.number)).filter(Boolean))],primary=numbers[0]||'CURRENT',sourceFiles=new Set(),docs=[];
    for(const g of groups){for(const f of g.sourceFiles||[])sourceFiles.add(f);for(const d of g.docs||[])docs.push(d);}
    const mergedGroup={number:primary,numbers:new Set(numbers),sourceFiles,docs,orderLinks:groups.map(g=>g.orderLink).filter(Boolean)};
    const payload=buildInvoicePayload(mergedGroup,refs,posOrder,reconciliation,options),validation=validatePayload(payload);errors.push(...validation.errors);warnings.push(...validation.warnings);
    const keyRows=new Map();for(const r of payload.records){if(!keyRows.has(r.subId))keyRows.set(r.subId,new Set());keyRows.get(r.subId).add(sourceRowKey(r.pos));}
    for(const [key,rows] of keyRows)if(rows.size>1)warnings.push(`DUPLICATE IMPORT KEY "${key}" is used by ${rows.size} different POS order rows. Review the selected keys; export remains available.`);
    if(numbers.length>1)warnings.unshift(`MERGED POSACTIVE IMPORT — ${numbers.length} supplier invoices (${numbers.join(', ')}) are combined into one 15-column TXT for POS order ${orderNo}. Each product row retains its original supplier Invoice No.`);
    const file={filename:importFilename(numbers,orderNo),...payload,validation,invoiceNumbers:numbers};
    return {ok:errors.length===0,errors,warnings,files:[file],invoiceNumbers:numbers};
  }

  function errorMessage(errors){const list=(errors||[]),shown=list.slice(0,12),rest=Math.max(0,list.length-shown.length);return `POS import blocked — ${list.length} validation issue${list.length===1?'':'s'}:\n• ${shown.join('\n• ')}${rest?`\n• …and ${rest} more.`:''}`;}
  function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}

  async function exportLegacyPosImport(invoiceDocs,refs,posOrder,reconciliation,options={}){
    const built=buildLegacyFiles(invoiceDocs,refs,posOrder,reconciliation,options);if(!built.ok)throw new Error(errorMessage(built.errors));
    if(built.files.length!==1)throw new Error('POSActive export expected exactly one merged TXT file. Refresh and run the reconciliation again.');
    const f=built.files[0];downloadBlob(new Blob([f.text],{type:'text/plain;charset=utf-8'}),f.filename);return {filename:f.filename,files:1,rows:f.records.length,columns:15,validation:f.validation,warnings:built.warnings,receivingAdjustments:f.receivingChanges.length,totals:f.totals,sourceTotals:f.sourceTotals,invoiceNumbers:f.invoiceNumbers||[],matchCheck:f.matchCheck||null};
  }

  PHF.posImport={CONTRACT,groupDocuments,buildLegacyFiles,validatePayload,exportLegacyPosImport,makeTsv,parseTsv,resolveImportIdentity,reviewImportKeys,exportKeyReview,importFilename,masterRecordsForPos,posWholesaleFallback,invoiceOnlyKey,invoiceOnlyEntries,posActiveMatchCheck,orderSupplierOf};
})(window);
