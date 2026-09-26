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
    columns:15
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
  function invoiceRowsFor(detail,group){return ((detail&&detail.invoiceRows)||[]).filter(r=>invoiceNo(r)===group.number||(group.sourceFiles.has(clean(r&&r.sourceFile))&&!invoiceNo(r)));}
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
      orderSubId:code(pos&&pos.subId),masterSubId:code(rec.POS_SUB_ID),barcode:digits(pos&&pos.barcode)||digits(rec.POS_MASTER_BARCODE),
      plu:code(pos&&pos.plu)||code(rec.POS_PLU),description:clean(pos&&pos.description)||clean(rec.POS_DESCR),record:rec
    };
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
  function lineLabel(pos,index){return `POS row ${index+1}${clean(pos&&pos.description)?` (${clean(pos.description)})`:''}`;}

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

  function validateSourceInvoiceRow(inv,errors,warnings){
    const ln=lineText(inv&&inv.invoiceLine)||'?';const q=n(inv&&inv.qtySupplied),unit=n(inv&&inv.unitPriceExGst),ext=n(inv&&inv.extendedExGst),gst=n(inv&&inv.gstAmount)||0,total=n(inv&&inv.totalIncGst),ws=n(inv&&inv.normalWholesale),disc=n(inv&&inv.discountPct);
    if(q==null||q<0){pushIssue(errors,`Invoice line ${ln}: Quantity Supplied is missing/invalid.`);return;}
    if(unit==null){pushIssue(errors,`Invoice line ${ln}: Unit Price ex GST is missing.`);return;}
    if(q>0&&unit>0&&ext!=null&&Math.abs(round(unit*q,2)-round(ext,2))>0.02)pushIssue(errors,`Invoice line ${ln}: Unit Price × Qty does not equal Extended ex GST.`);
    if(q>0&&unit>0&&ws!=null&&disc!=null&&Math.abs(ws*(1-disc/100)-unit)>0.011)pushIssue(errors,`Invoice line ${ln}: Normal W/S less discount does not equal Unit Price.`);
    if(ext!=null&&gst>0&&Math.abs(round(ext*0.10,2)-round(gst,2))>0.011)pushIssue(errors,`Invoice line ${ln}: GST is not 10% of Extended ex GST.`);
    if(ext!=null&&total!=null&&Math.abs(round(ext+gst,2)-round(total,2))>0.011)pushIssue(errors,`Invoice line ${ln}: Extended ex GST + GST does not equal Total.`);
    if(q===0)warnings.push(`Invoice line ${ln}: excluded because supplied quantity is zero.`);
    if(unit===0)warnings.push(`Invoice line ${ln}: excluded because it is a free/bonus line (unit price 0.0000). Key it manually if required.`);
  }

  function sameCommercialTerms(rows){
    if((rows||[]).length<=1)return true;const first=rows[0],eq=(a,b,t)=>{const x=n(a),y=n(b);return x!=null&&y!=null&&Math.abs(x-y)<=t;};
    return rows.every(r=>eq(r.unitPriceExGst,first.unitPriceExGst,0.00011)&&eq(r.discountPct,first.discountPct,0.011)&&eq(r.normalWholesale,first.normalWholesale,0.011)&&eq(r.gstPct,first.gstPct,0.05));
  }
  function allocateReceiving(rows,target,errors,label){
    const src=(rows||[]).slice().sort((a,b)=>(n(a&&a.invoiceLine)||0)-(n(b&&b.invoiceLine)||0)),original=round(src.reduce((a,r)=>a+(n(r&&r.qtySupplied)||0),0),3),t=round(Math.max(0,n(target)||0),3);
    if(Math.abs(t-original)<=0.0005)return new Map(src.map(r=>[invoiceKey(r),n(r.qtySupplied)||0]));
    if(src.length>1&&!sameCommercialTerms(src)){pushIssue(errors,`${label}: receiving quantity was changed from ${qtyText(original)} to ${qtyText(t)}, but this POS item spans multiple invoice lines with different price/discount terms. Adjust it manually rather than guessing how to allocate the quantity.`);return null;}
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
    if(competing.length){const c=competing[0];pushIssue(errors,`${lineLabel(pos,index)}: MASTER IDENTITY CONFLICT — CH2 product ${pc} maps to another row in this POS order, POS row ${c.index+1}${clean(c.pos&&c.pos.description)?` (${clean(c.pos.description)})`:''}${examples?` [master ${examples}]`:''}.`);return;}
    const evidence=strongIndependentEvidence(inv,pos,anchored);
    if(evidence.ok)warnings.push(`${lineLabel(pos,index)}: MASTER IDENTITY DIFFERENCE — CH2 product ${pc} has different/newer master identifiers${examples?` (${examples})`:''}, but no competing order row owns them and invoice/order evidence is strong.`);
    else pushIssue(errors,`${lineLabel(pos,index)}: MASTER IDENTITY CONFLICT — CH2 product ${pc} does not match this order row's current identifiers and independent evidence is not strong enough.`);
  }

  function buildInvoicePayload(group,refs,posOrder,reconciliation,options={}){
    const errors=[],warnings=[],posRows=sortedPos(posOrder),details=detailBySourceRow(reconciliation),contexts=[],invoiceToContext=new Map(),allocation=new Map(),receivingChanges=[],omittedNotSupplied=[];
    const unmatched=((reconciliation&&reconciliation.unmatchedInvoice)||[]).filter(r=>invoiceNo(r)===group.number||group.sourceFiles.has(clean(r&&r.sourceFile)));
    if(unmatched.length)pushIssue(errors,`Invoice ${group.number}: ${unmatched.length} invoice line${unmatched.length===1?' is':'s are'} not matched to the POS order.`);

    for(let index=0;index<posRows.length;index++){
      const pos=posRows[index],detail=details.get(sourceRowKey(pos))||(reconciliation&&reconciliation.detail||[])[index]||{},identity=canonicalIdentity(pos,refs),invRows=invoiceRowsFor(detail,group).slice().sort((a,b)=>(n(a&&a.invoiceLine)||0)-(n(b&&b.invoiceLine)||0));
      const ctx={pos,index,detail,identity,invRows};contexts.push(ctx);for(const inv of invRows)invoiceToContext.set(invoiceKey(inv),ctx);
      if(invRows.length&&clean(detail.matchConfidence).toUpperCase()==='LOW')pushIssue(errors,`${lineLabel(pos,index)}: invoice match confidence is LOW; review before POS import.`);
      for(const inv of invRows){validateSourceInvoiceRow(inv,errors,warnings);validateMasterForContext(ctx,inv,refs,posRows,errors,warnings);}

      const recv=receivingOverride(options,pos),invoiceQty=round(invRows.reduce((a,r)=>a+(n(r&&r.qtySupplied)||0),0),3);
      if(recv.touched){
        const found=Math.max(0,round(recv.value||0,3));
        if(!invRows.length&&found>0){pushIssue(errors,`${lineLabel(pos,index)}: Found is ${qtyText(found)}, but CH2 did not invoice this product. There is no invoice price/discount line to build safely; receive this row manually in POSActive.`);continue;}
        if(invRows.length){const map=allocateReceiving(invRows,found,errors,lineLabel(pos,index));if(map){for(const [k,v] of map)allocation.set(k,v);if(Math.abs(found-invoiceQty)>0.0005)receivingChanges.push({pos,index,invoiceQty,found});}}
      }
    }

    const invoiceRows=[];for(const doc of group.docs)for(const row of (doc.rows||[]))invoiceRows.push(row);
    invoiceRows.sort((a,b)=>(n(a&&a.invoiceLine)||0)-(n(b&&b.invoiceLine)||0));
    const sourceTotals={qty:sumQty(invoiceRows),ext:sum(invoiceRows,'extendedExGst'),gst:sum(invoiceRows,'gstAmount'),total:sum(invoiceRows,'totalIncGst')};
    const records=[];

    for(const inv of invoiceRows){
      const key=invoiceKey(inv),ctx=invoiceToContext.get(key);if(!ctx){pushIssue(errors,`Invoice line ${lineText(inv&&inv.invoiceLine)||'?'} (${digits(inv&&inv.productCode)||'no CH2 code'}) is not linked to a POS row.`);continue;}
      const originalQty=Math.max(0,n(inv&&inv.qtySupplied)||0),unit=n(inv&&inv.unitPriceExGst),disc=n(inv&&inv.discountPct),normalWs=n(inv&&inv.normalWholesale);
      if(originalQty<=0||unit==null||unit===0)continue;
      if(disc==null){pushIssue(errors,`Invoice line ${lineText(inv.invoiceLine)}: Disc % is missing; POSActive cannot derive WS Price safely.`);continue;}
      if(normalWs==null){pushIssue(errors,`Invoice line ${lineText(inv.invoiceLine)}: Normal W/S is missing; POSActive import validation cannot confirm WS Price.`);continue;}
      const outQty=allocation.has(key)?allocation.get(key):originalQty;
      if(outQty<=0){omittedNotSupplied.push({inv,ctx,selected:selectedOverride(options,ctx.pos)});continue;}
      const adjusted=Math.abs(outQty-originalQty)>0.0005,ext=adjusted?round(unit*outQty,2):round(inv.extendedExGst,2),gstRate=n(inv.gstPct)!=null?n(inv.gstPct):((n(inv.gstAmount)||0)>0?10:0),gst=adjusted?round(ext*gstRate/100,2):round(inv.gstAmount,2),total=adjusted?round(ext+gst,2):round(inv.totalIncGst,2);
      const ch2Code=digits(inv.productCode),subId=code(ctx.identity.orderSubId)||ch2Code,supplierCode=sanitizeText(inv.supplierSku),description=sanitizeText(inv.description);
      if(!subId)pushIssue(errors,`Invoice line ${lineText(inv.invoiceLine)}: Sub ID cannot be resolved from the POS order or CH2 product code.`);
      if(ctx.identity.orderSubId&&normCode(ctx.identity.orderSubId)!==normCode(ch2Code))warnings.push(`SUB ID OVERRIDE — CH2 ${ch2Code} uses POS order Sub ID ${ctx.identity.orderSubId} for ${description}.`);
      const predWs=round(round(ext/outQty,2)/(1-disc/100),2),wsRounded=round(normalWs,2),wsDiff=round(predWs-wsRounded,2);
      if(Math.abs(wsDiff)>0.011)pushIssue(errors,`Invoice line ${lineText(inv.invoiceLine)}: predicted POSActive WS ${predWs.toFixed(2)} differs from Normal W/S ${wsRounded.toFixed(2)} by more than 1c.`);
      else if(Math.abs(wsDiff)>0.0001)warnings.push(`Invoice line ${lineText(inv.invoiceLine)}: POSActive WS is expected to round to ${predWs.toFixed(2)} vs invoice Normal W/S ${wsRounded.toFixed(2)} (1c rounding).`);
      records.push({
        invoiceNo:group.number,line:lineText(inv.invoiceLine),ch2Code,supplierCode,subId,description,
        qty:outQty,qtySupplied:outQty,normalWs:wsRounded,unitPrice:unit,rebate:0,extended:ext,gst,total,disc,
        sourceQty:originalQty,receivingAdjusted:adjusted,pos:ctx.pos
      });
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
      if(Math.abs(totals.qty-sourceTotals.qty)>0.001||Math.abs(totals.ext-sourceTotals.ext)>0.02||Math.abs(totals.gst-sourceTotals.gst)>0.02||Math.abs(totals.total-sourceTotals.total)>0.02)pushIssue(errors,`Invoice ${group.number}: generated file totals do not equal the parsed invoice totals.`);
    }else{
      warnings.push(`POS LAYOUT RECEIVING APPLIED — ${receivingChanges.length} product${receivingChanges.length===1?'':'s'} use Found quantities instead of CH2 supplied quantities. POSActive import total becomes ${totals.total.toFixed(2)} vs supplier invoice ${sourceTotals.total.toFixed(2)}; the full reconciliation workbook remains unchanged and preserves the original invoice.`);
      for(const x of receivingChanges.slice(0,12))warnings.push(`${lineLabel(x.pos,x.index)}: CH2 supplied ${qtyText(x.invoiceQty)} → POS Layout Found ${qtyText(x.found)}.`);
    }

    const rows=[CONTRACT.headers.slice(),...records.map(r=>[
      r.invoiceNo,r.line,r.ch2Code,r.supplierCode,r.subId,r.description,qtyText(r.qty),qtyText(r.qtySupplied),fixed(r.normalWs,2),fixed(r.unitPrice,4),fixed(r.rebate,2),fixed(r.extended,2),fixed(r.gst,2),fixed(r.total,2),fixed(r.disc,2)
    ])];
    const text=makeTsv(rows);
    return {group,rows,records,text,totals,sourceTotals,receivingChanges,errors,warnings};
  }

  function makeTsv(rows){
    return (rows||[]).map((row,rowIndex)=>{
      if(!Array.isArray(row)||row.length!==CONTRACT.columns)throw new Error(`POSActive logical row ${rowIndex+1} does not have exactly ${CONTRACT.columns} fields.`);
      return row.map(v=>sanitizeText(v)).join('\t');
    }).join('\r\n')+'\r\n';
  }
  function parseTsv(text){return String(text||'').split('\r\n').filter((x,i,a)=>x!==''||i<a.length-1).map(line=>line.split('\t'));}

  function validatePayload(payload){
    const errors=[...(payload&&payload.errors||[])],rows=(payload&&payload.rows)||[],text=payload&&payload.text||'';
    if(rows.length<2)pushIssue(errors,'POSActive import contains no product rows.');
    const h=rows[0]||[];if(h.length!==CONTRACT.columns||!CONTRACT.headers.every((x,i)=>h[i]===x))pushIssue(errors,'POSActive header does not exactly match the proven 15-column contract.');
    for(let i=1;i<rows.length;i++)if((rows[i]||[]).length!==CONTRACT.columns){pushIssue(errors,`Generated POSActive row ${i+1} has ${(rows[i]||[]).length} fields instead of ${CONTRACT.columns}.`);break;}
    if(/^\uFEFF/.test(text))pushIssue(errors,'POSActive file unexpectedly contains a UTF-8 BOM.');
    if(/(^|[^\r])\n/.test(text))pushIssue(errors,'POSActive file contains LF-only line endings; CRLF is required.');
    if(text&&!text.endsWith('\r\n'))pushIssue(errors,'POSActive file does not end with CRLF.');
    const dataText=text.split('\r\n').slice(1).join('\r\n');
    if(/["$%]/.test(dataText))pushIssue(errors,'POSActive data rows contain a quote mark, dollar sign or percent sign; the 15-column contract requires plain field values.');
    const parsed=parseTsv(text);if(parsed.length!==rows.length)pushIssue(errors,`Serialized POSActive file contains ${parsed.length} rows; ${rows.length} were expected.`);
    if(parsed.some(r=>r.length!==CONTRACT.columns))pushIssue(errors,'Serialized POSActive file contains a row that does not have exactly 15 tab-delimited fields.');
    if(parsed.length&&!CONTRACT.headers.every((x,i)=>parsed[0][i]===x))pushIssue(errors,'Serialized POSActive header changed after conversion.');
    return {ok:errors.length===0,errors,warnings:[...(payload&&payload.warnings||[])]};
  }

  function buildLegacyFiles(invoiceDocs,refs,posOrder,reconciliation,options={}){
    const grouped=groupDocuments(invoiceDocs,posOrder,options);if(grouped.errors.length)return {ok:false,errors:grouped.errors,warnings:grouped.warnings||[],files:[]};
    const files=[],errors=[],warnings=[...(grouped.warnings||[])],orderNo=clean(posOrder&&posOrder.orderNumber||reconciliation&&reconciliation.orderNumber);
    for(const group of grouped.groups){
      const payload=buildInvoicePayload(group,refs,posOrder,reconciliation,options),validation=validatePayload(payload);errors.push(...validation.errors);warnings.push(...validation.warnings);
      files.push({filename:`oborne_invoice_{${safePart(group.number)}}_(${safePart(orderNo)}).txt`,...payload,validation});
    }
    return {ok:errors.length===0,errors,warnings,files};
  }

  function errorMessage(errors){const list=(errors||[]),shown=list.slice(0,12),rest=Math.max(0,list.length-shown.length);return `POS import blocked — ${list.length} validation issue${list.length===1?'':'s'}:\n• ${shown.join('\n• ')}${rest?`\n• …and ${rest} more.`:''}`;}
  function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}

  async function exportLegacyPosImport(invoiceDocs,refs,posOrder,reconciliation,options={}){
    const built=buildLegacyFiles(invoiceDocs,refs,posOrder,reconciliation,options);if(!built.ok)throw new Error(errorMessage(built.errors));
    if(built.files.length===1){const f=built.files[0];downloadBlob(new Blob([f.text],{type:'text/plain;charset=utf-8'}),f.filename);return {filename:f.filename,files:1,rows:f.records.length,columns:15,validation:f.validation,warnings:built.warnings,receivingAdjustments:f.receivingChanges.length,totals:f.totals,sourceTotals:f.sourceTotals};}
    if(!global.JSZip)throw new Error('ZIP export library did not load. Refresh the page and try again.');
    const zip=new global.JSZip();for(const f of built.files)zip.file(f.filename,f.text);
    const zipName=`POSACTIVE_IMPORT_FILES_(${safePart(posOrder&&posOrder.orderNumber||reconciliation&&reconciliation.orderNumber)}).zip`,blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'});downloadBlob(blob,zipName);
    return {filename:zipName,files:built.files.length,rows:built.files.reduce((a,f)=>a+f.records.length,0),columns:15,warnings:built.warnings,receivingAdjustments:built.files.reduce((a,f)=>a+f.receivingChanges.length,0)};
  }

  PHF.posImport={CONTRACT,groupDocuments,buildLegacyFiles,validatePayload,exportLegacyPosImport,makeTsv,parseTsv};
})(window);
