(function(global){
  'use strict';
  const PHF=global.PHFReconcile=global.PHFReconcile||{};
  const PRICE_TOL=0.03;

  function clean(v){return v==null?'':String(v).trim();}
  function digits(v){return clean(v).replace(/\.0+$/,'').replace(/\D+/g,'');}
  function bc(v){return digits(v);}
  function num(v){if(typeof v==='number'&&Number.isFinite(v))return v;let s=clean(v).replace(/[$,%]/g,'').replace(/,/g,'');if(!s)return null;if(/^\.\d+$/.test(s))s='0'+s;const n=Number(s);return Number.isFinite(n)?n:null;}
  function round(v,n=2){const x=num(v);if(x==null)return '';const p=10**n;return Math.round((x+Number.EPSILON)*p)/p;}
  function roundHalfUp(v,n=2){const x=num(v);if(x==null)return '';const p=10**n,sign=x<0?-1:1;return sign*(Math.floor(Math.abs(x)*p+0.5+1e-9)/p);}
  function normText(v){return clean(v).toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
  function dateForFilename(v){const s=clean(v);let m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(m)return `${m[1]}.${m[2]}.${m[3].slice(-2)}`;m=s.match(/^(\d{2})[.-](\d{2})[.-](\d{4})$/);if(m)return `${m[1]}.${m[2]}.${m[3].slice(-2)}`;return new Date().toLocaleDateString('en-AU').split('/').map((x,i)=>i===2?x.slice(-2):x.padStart(2,'0')).join('.');}
  function safe(v,fallback='UNKNOWN'){let s=clean(v)||fallback;s=s.replace(/[^A-Za-z0-9._-]+/g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,'');return s||fallback;}
  function uniq(values){return [...new Set((values||[]).map(clean).filter(Boolean))];}
  function sumRows(rows,key){return (rows||[]).reduce((a,r)=>a+(num(r[key])||0),0);}
  function weightedAverage(rows,key,weightKey='qtySupplied'){let n=0,d=0;for(const r of rows||[]){const v=num(r[key]),w=num(r[weightKey]);if(v!=null&&w!=null&&w!==0){n+=v*w;d+=w;}}return d?round(n/d,4):'';}
  function lowestConfidence(rows){const rank={LOW:0,MEDIUM:1,HIGH:2},vals=uniq((rows||[]).map(r=>r.matchConfidence));vals.sort((a,b)=>(rank[a]??9)-(rank[b]??9));return vals[0]||'';}

  function supplierFromPos(pos,refs,rec){
    const name=clean(pos&&pos.company)||clean(rec&&rec.POS_SUPPLIER_NAME)||'',no=digits(pos&&pos.supplier)||digits(rec&&rec.POS_SUPPLIER_NUMBER)||digits(rec&&rec.POS_SUPPLIER_RAW);
    if(name&&no)return `${name} (${no})`;if(name)return name;
    if(no){const mapped=refs&&refs.supplier&&refs.supplier.supplierMap?refs.supplier.supplierMap.get(no):'';return mapped?`${mapped} (${no})`:`(${no})`;}
    return '';
  }
  function supplierNo(v){const s=clean(v),m=s.match(/\((\d+)\)\s*$/);return m?m[1]:digits(s);}
  function brandMatches(posBrand,posDescr,ruleBrand,rulePrefix){const pb=normText(posBrand),pd=normText(posDescr),rb=normText(ruleBrand),rp=normText(rulePrefix);if(rb&&pb&&(pb===rb||pb.startsWith(rb)||rb.startsWith(pb)||pb.includes(rb)||rb.includes(pb)))return true;if(rp){if(pb&&pb.startsWith(rp))return true;if(pd&&(pd===rp||pd.startsWith(rp+' ')))return true;}return false;}
  function descrMatches(posDescr,ruleDescr){const p=normText(posDescr),r=normText(ruleDescr);if(!p||!r)return false;if(p===r)return true;if(r.length>=8&&p.includes(r))return true;if(p.length>=8&&r.includes(p))return true;return false;}
  function ruleLabel(rule){const p=[];if(clean(rule.POS_MASTER_BRAND))p.push(clean(rule.POS_MASTER_BRAND));if(clean(rule.POS_BRAND_PREFIX))p.push('PREFIX '+clean(rule.POS_BRAND_PREFIX));if(clean(rule.POS_SUPPLIER_NUMBER))p.push('SUP '+clean(rule.POS_SUPPLIER_NUMBER));if(clean(rule.POS_PLU))p.push('PLU '+clean(rule.POS_PLU));if(clean(rule.POS_MASTER_BARCODE))p.push('BC '+clean(rule.POS_MASTER_BARCODE));if(clean(rule.POS_DESCR))p.push(clean(rule.POS_DESCR));if(rule.POS_DISCOUNT!=null)p.push(`${Number(rule.POS_DISCOUNT).toFixed(2)}%`);if(clean(rule.POS_MEMBER))p.push('MEMBER '+clean(rule.POS_MEMBER));return p.join(' / ');}
  function matchRule(rule,row){
    const rs=supplierNo(row['POS SUPPLIER']),rb=bc(row['POS MASTER BARCODE']),rp=digits(row['POS PLU']),rBrand=clean(row['POS BRAND']),rd=clean(row['POS DESCR']);
    const sup=digits(rule.POS_SUPPLIER_NUMBER),b=bc(rule.POS_MASTER_BARCODE),plu=digits(rule.POS_PLU),brand=clean(rule.POS_MASTER_BRAND),prefix=clean(rule.POS_BRAND_PREFIX),descr=clean(rule.POS_DESCR);
    if(rule.POS_DISCOUNT==null)return null;if(plu)return rp&&rp===plu?{specificity:100,type:'POS_PLU',key:`POS_PLU=${rp}`} : null;if(b)return rb&&rb===b?{specificity:90,type:'POS_MASTER_BARCODE',key:`POS_MASTER_BARCODE=${rb}`} : null;if(descr)return descrMatches(rd,descr)?{specificity:80,type:'POS_DESCR',key:`POS_DESCR=${descr}`} : null;
    const brandOk=(brand||prefix)?brandMatches(rBrand,rd,brand,prefix):false,supOk=!!(sup&&rs&&sup===rs);if((brand||prefix)&&sup)return brandOk&&supOk?{specificity:70,type:'POS_BRAND+POS_SUPPLIER',key:`POS_BRAND=${clean(brand||prefix)}; POS_SUPPLIER=${sup}`} : null;if(brand||prefix)return brandOk?{specificity:60,type:'POS_BRAND',key:`POS_BRAND=${clean(brand||prefix)}`} : null;if(sup)return supOk?{specificity:50,type:'POS_SUPPLIER',key:`POS_SUPPLIER=${sup}`} : null;return null;
  }
  function findDiscountRule(row,rules){const c=[];for(const rule of rules||[]){const m=matchRule(rule,row);if(m)c.push({...m,rule});}c.sort((a,b)=>(Number(b.rule.POS_DISCOUNT||0)-Number(a.rule.POS_DISCOUNT||0))||(b.specificity-a.specificity));return c[0]||null;}
  function discountAudit(row,rules,isInvoiced,raw={}){
    if(!['POS SUPPLIER','POS MASTER BARCODE','POS PLU','POS BRAND','POS DESCR'].some(k=>clean(row[k])))return {'DIS EXPECTED %':'','DIS MATCH TYPE':'NO POS DATA','DIS MATCH KEY':'','DIS MATCH RULE':'','DIS CH2 DISC CHECK':'NO CHECK - NO POS DATA','DIS EXPECTED UNIT EXGST':'','DIS UNIT VARIANCE':'','DIS UNIT CHECK':'NO CHECK - NO POS DATA','DIS MISSED TOTAL':''};
    const best=findDiscountRule(row,rules);
    if(!best)return {'DIS EXPECTED %':'','DIS MATCH TYPE':'NO RULE','DIS MATCH KEY':'','DIS MATCH RULE':'','DIS CH2 DISC CHECK':'NO RULE','DIS EXPECTED UNIT EXGST':'','DIS UNIT VARIANCE':'','DIS UNIT CHECK':'NO RULE','DIS MISSED TOTAL':''};
    const expected=Number(best.rule.POS_DISCOUNT||0),base={'DIS EXPECTED %':round(expected,2),'DIS MATCH TYPE':best.type,'DIS MATCH KEY':best.key,'DIS MATCH RULE':ruleLabel(best.rule)};
    if(!isInvoiced)return {...base,'DIS CH2 DISC CHECK':'NO CHECK - NOT INVOICED','DIS EXPECTED UNIT EXGST':'','DIS UNIT VARIANCE':'','DIS UNIT CHECK':'NO CHECK - NOT INVOICED','DIS MISSED TOTAL':''};

    // Preserve source truth: a discount that is not printed on the invoice is unknown, not 0%.
    const actual=raw.disc!==undefined?num(raw.disc):num(row['CH2 DISC %']);
    let discCheck='NO CHECK - DISC % NOT PROVIDED';
    if(actual!=null){
      const diff=actual-expected;
      if(Math.abs(diff)<=PRICE_TOL)discCheck='OK';
      else if(diff>PRICE_TOL)discCheck=`BETTER DISCOUNT CH2=${actual.toFixed(2)}`;
      else discCheck=`DISCOUNT LOW CH2=${actual.toFixed(2)}`;
    }

    // Audit with raw invoice precision. Display values stay rounded to the approved workbook format.
    const nws=raw.normalWs!==undefined?num(raw.normalWs):num(row['CH2 NORMAL W/S']);
    const unit=raw.unit!==undefined?num(raw.unit):num(row['CH2 UNIT PRICE EX GST']);
    const qty=raw.qty!==undefined?num(raw.qty):num(row['CH2 QTY SUPPLIED']);
    let expectedUnit='',variance='',unitCheck='',missed='';
    if(nws==null){
      unitCheck='NO CHECK - MISSING CH2 NORMAL W/S';
    }else{
      const preciseExpected=nws*(1-expected/100);
      expectedUnit=roundHalfUp(preciseExpected,2);
      if(unit==null){
        unitCheck='NO CHECK - MISSING CH2 UNIT PRICE EX GST';
      }else{
        const preciseVariance=unit-preciseExpected;
        variance=roundHalfUp(preciseVariance,2);
        if(Math.abs(preciseVariance)<=PRICE_TOL)unitCheck='OK';
        else if(preciseVariance< -PRICE_TOL)unitCheck='BETTER PRICE';
        else unitCheck='PRICE HIGH';
        if(qty!=null)missed=roundHalfUp((preciseVariance>PRICE_TOL?preciseVariance:0)*qty,2);
      }
    }
    return {...base,'DIS CH2 DISC CHECK':discCheck,'DIS EXPECTED UNIT EXGST':expectedUnit,'DIS UNIT VARIANCE':variance,'DIS UNIT CHECK':unitCheck,'DIS MISSED TOTAL':missed};
  }

  function lineCount(v){const n=num(v);if(n==null)return clean(v);return Number.isInteger(n)?String(n):String(n).replace(/0+$/,'').replace(/\.$/,'');}
  function posReference(pos,refs){const b=bc(pos&&pos.barcode);if(b&&refs.master.byBarcode.has(b))return refs.master.byBarcode.get(b);const s=digits(pos&&pos.subId);if(s&&refs.master.byCode.has(s))return refs.master.byCode.get(s);const p=digits(pos&&pos.plu);if(p&&refs.master.byPlu&&refs.master.byPlu.has(p))return refs.master.byPlu.get(p);return {};}
  function statusFor(pos,invs){const ordered=num(pos&&pos.orderedQty)||0,supplied=round(sumRows(invs,'qtySupplied'),3)||0;if(!invs.length)return `NOT INVOICED / SHORT SHIPPED — ORDERED ${ordered} / SUPPLIED 0`;const conf=lowestConfidence(invs),auditMissing=invs.some(r=>r.discountPct==null||r.normalWholesale==null);if(supplied<ordered-0.0001)return `MATCHED / SHORT SUPPLIED — ORDERED ${ordered} / SUPPLIED ${supplied}`;if(supplied>ordered+0.0001)return `MATCHED / OVER SUPPLIED — ORDERED ${ordered} / SUPPLIED ${supplied}`;if(conf==='LOW')return 'MATCHED - REVIEW (LOW CONFIDENCE)';if(auditMissing)return 'MATCHED - REVIEW (CH2 AUDIT DATA MISSING)';return 'MATCHED';}
  function docInvoiceRowsForDetail(detail,doc){return (detail&&detail.invoiceRows||[]).filter(r=>clean(r.sourceFile)===clean(doc.sourceFile));}
  function docMeta(doc,posOrder){const first=(doc.rows||[])[0]||{},m=doc.meta||{};return {orderDate:clean(first.orderDate||m.orderDate||first.invoiceDate||m.invoiceDate),invoiceDate:clean(first.invoiceDate||m.invoiceDate),invoiceNumber:clean(first.invoiceNumber||m.invoiceNumber),customerPo:clean(first.customerPo||m.customerPo||(posOrder&&posOrder.orderNumber))};}
  function invoiceAggregates(invs){
    const q=round(sumRows(invs,'qtySupplied'),3),gstAmount=round(sumRows(invs,'gstAmount'),2),totalInc=round(sumRows(invs,'totalIncGst'),2),lines=uniq(invs.map(r=>lineCount(r.invoiceLine))).sort((a,b)=>(num(a)||0)-(num(b)||0)).join(', '),methods=uniq(invs.map(r=>r.matchMethod)).join(', '),scores=invs.map(r=>num(r.descriptionScore)).filter(v=>v!=null);
    return {qty:q,gstAmount,totalInc,lines,methods,confidence:lowestConfidence(invs),fuzzy:scores.length?round(Math.min(...scores),1):'',sku:uniq(invs.map(r=>r.supplierSku)).join(', '),code:uniq(invs.map(r=>r.productCode)).join(', '),disc:weightedAverage(invs,'discountPct'),normalWs:weightedAverage(invs,'normalWholesale'),unit:weightedAverage(invs,'unitPriceExGst'),rrp:weightedAverage(invs,'rrp'),gstPct:weightedAverage(invs,'gstPct')};
  }

  function buildRowsForDocument(doc,refs,posOrder,reconciliation){
    if(!posOrder||!Array.isArray(posOrder.rows)||!posOrder.rows.length)throw new Error('POS order data is required for the linked-POS export.');
    if(!reconciliation||!Array.isArray(reconciliation.detail)||reconciliation.detail.length!==posOrder.rows.length)throw new Error('Reconciliation detail does not align to the POS order. Run reconciliation again before downloading.');
    const sourceInvoiceRows=(doc.rows||[]).slice().sort((a,b)=>(num(a.invoiceLine)||0)-(num(b.invoiceLine)||0)),lineTax=round(sourceInvoiceRows.reduce((a,r)=>a+(num(r.gstAmount)||0),0),2),lineTotal=round(sourceInvoiceRows.reduce((a,r)=>a+(num(r.totalIncGst)||0),0),2),footer=doc.integrity&&doc.integrity.footerOk?doc.integrity.footer:null,tax=footer?footer.gst:lineTax,total=footer?footer.total:lineTotal,meta=docMeta(doc,posOrder),out=[];

    posOrder.rows.forEach((pos,i)=>{
      const detail=reconciliation.detail[i];
      if(Number(detail&&detail.sourceRow)!==Number(pos.sourceRow)||clean(detail&&detail.plu)!==clean(pos.plu)||bc(detail&&detail.barcode)!==bc(pos.barcode)||clean(detail&&detail.posDescription)!==clean(pos.description))throw new Error(`Integrity check failed: reconciliation row ${i+1} no longer matches POS order row ${i+1}.`);
      const invs=docInvoiceRowsForDetail(detail,doc),agg=invoiceAggregates(invs),rec=posReference(pos,refs)||{},supplied=num(agg.qty),posGst=num(pos.gstPct)||0,posTotal=(supplied!=null&&supplied>0&&num(pos.lastPrice)!=null)?round(Number(pos.lastPrice)*supplied*(1+posGst/100),2):'',ch2Ws=round(agg.normalWs,2),rawWs=round(rec.POS_CH2_WHOLESALE_EX_GST,2);let wVar='',wCheck='NO CHECK - MISSING DATA';
      if(ch2Ws!==''&&rawWs!==''){wVar=round(Number(ch2Ws)-Number(rawWs),2);wCheck=Math.abs(Number(wVar))<=PRICE_TOL?'OK':'MISMATCH';}
      const row={
        'INDEX':i+1,'Order Date':meta.orderDate,'Invoice Date':meta.invoiceDate,'Invoice Number':meta.invoiceNumber,'Your Ref':meta.customerPo,'Line Count':agg.lines,'Tax Amount':i===0?tax:'','Invoice Total':i===0?total:'',
        'POS SUPPLIER':supplierFromPos(pos,refs,rec),'MATCH STATUS':statusFor(pos,invs),'MATCH METHOD':invs.length?agg.methods:'NOT INVOICED','MATCH CONFIDENCE':agg.confidence,'FUZZY SCORE':agg.fuzzy,
        'POS MASTER BARCODE':clean(pos.barcode),'POS PLU':clean(pos.plu),'POS BRAND':clean(rec.POS_BRAND),'POS DESCR':clean(pos.description),
        'CH2 SUPPLIER SKU':agg.sku,'CH2 PRODUCT CODE':agg.code,'CH2 QTY SUPPLIED':invs.length?agg.qty:'','CH2 DISC %':invs.length?round(agg.disc,2):'','CH2 GST':invs.length?round(agg.gstPct,2):'',
        'POS GST TAX PC':round(pos.gstPct,2),'POS WSP EXCGST':round(pos.normalWholesale,2),'CH2 NORMAL W/S':invs.length?ch2Ws:'','POS LAST PRICE':round(pos.lastPrice,2),'CH2 UNIT PRICE EX GST':invs.length?round(agg.unit,2):'',
        'POS RRP INCGST':round(pos.rrp,2),'CH2 RRP':invs.length?round(agg.rrp,2):'','POS TOTAL':posTotal,'CH2 TOTAL':invs.length?round(agg.totalInc,2):'','POS CH2 WHOLESALE EX GST':rawWs,
        'CH2 WHOLESALE VARIANCE':invs.length?wVar:'','CH2 WHOLESALE CHECK':invs.length?wCheck:'NO CHECK - NOT INVOICED'
      };
      Object.assign(row,discountAudit(row,refs.supplier.discountRules,invs.length>0,{disc:agg.disc,normalWs:agg.normalWs,unit:agg.unit,qty:agg.qty}));out.push(row);
    });

    const extras=(reconciliation.unmatchedInvoice||[]).filter(r=>clean(r.sourceFile)===clean(doc.sourceFile));
    extras.forEach((inv,ei)=>{const agg=invoiceAggregates([inv]);out.push({'INDEX':`EXTRA-${ei+1}`,'Order Date':clean(inv.orderDate||meta.orderDate),'Invoice Date':clean(inv.invoiceDate||meta.invoiceDate),'Invoice Number':clean(inv.invoiceNumber||meta.invoiceNumber),'Your Ref':clean(inv.customerPo||meta.customerPo),'Line Count':lineCount(inv.invoiceLine),'Tax Amount':'','Invoice Total':'','POS SUPPLIER':'','MATCH STATUS':'NOT ORDERED / UNMATCHED','MATCH METHOD':'NO POS ORDER MATCH','MATCH CONFIDENCE':'','FUZZY SCORE':'','POS MASTER BARCODE':'','POS PLU':'','POS BRAND':'','POS DESCR':'','CH2 SUPPLIER SKU':clean(inv.supplierSku),'CH2 PRODUCT CODE':clean(inv.productCode),'CH2 QTY SUPPLIED':round(inv.qtySupplied,3),'CH2 DISC %':round(inv.discountPct,2),'CH2 GST':round(inv.gstPct,2),'POS GST TAX PC':'','POS WSP EXCGST':'','CH2 NORMAL W/S':round(inv.normalWholesale,2),'POS LAST PRICE':'','CH2 UNIT PRICE EX GST':round(inv.unitPriceExGst,2),'POS RRP INCGST':'','CH2 RRP':round(inv.rrp,2),'POS TOTAL':'','CH2 TOTAL':round(inv.totalIncGst,2),'POS CH2 WHOLESALE EX GST':'','CH2 WHOLESALE VARIANCE':'','CH2 WHOLESALE CHECK':'NO CHECK - NOT ORDERED','DIS EXPECTED %':'','DIS MATCH TYPE':'NO POS ORDER MATCH','DIS MATCH KEY':'','DIS MATCH RULE':'','DIS CH2 DISC CHECK':'NO CHECK - NOT ORDERED','DIS EXPECTED UNIT EXGST':'','DIS UNIT VARIANCE':'','DIS UNIT CHECK':'NO CHECK - NOT ORDERED','DIS MISSED TOTAL':''});});

    const filename=`CH2_PO_${safe(meta.customerPo||posOrder.orderNumber||meta.invoiceNumber,'NO_PO')}_INV_${safe(meta.invoiceNumber||doc.sourceFile,'NO_INV')}_${dateForFilename(meta.invoiceDate)}_PRODUCT_EXTRACT_LINKED_POS.xlsx`;
    const output={rows:out,filename,invoiceNumber:meta.invoiceNumber,customerPo:meta.customerPo,tax,total,sourceFile:doc.sourceFile,posOrderRows:posOrder.rows.length,extraRows:extras.length,doc};
    const integrity=PHF.integrity.validateOutput(output,posOrder);if(!integrity.ok)throw new Error(`Export blocked: ${integrity.errors.join(' | ')}`);output.integrity=integrity;return output;
  }
  function buildReferenceOutputs(invoiceDocs,refs,posOrder,reconciliation){return (invoiceDocs||[]).filter(d=>d.type!=='CREDIT_NOTE'&&(d.rows||[]).length).map(d=>buildRowsForDocument(d,refs,posOrder,reconciliation));}

  PHF.linkedPos={HEADERS:PHF.schema.HEADERS,TOTAL_HEADERS:PHF.schema.TOTAL_HEADERS,buildReferenceOutputs,buildRowsForDocument};
})(window);
