(function(global){
  'use strict';
  const PHF=global.PHFReconcile=global.PHFReconcile||{};
  const PRICE_TOL=0.03,WHOLESALE_TOL=0.03;

  function clean(v){return v==null?'':String(v).trim();}
  function normText(v){return clean(v).toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
  function digits(v){return clean(v).replace(/\.0+$/,'').replace(/\D+/g,'');}
  function round(v,n=2){if(v==null||!Number.isFinite(Number(v)))return null;const p=10**n;return Math.round((Number(v)+Number.EPSILON)*p)/p;}
  function tokenDice(a,b){const A=[...new Set(normText(a).split(' ').filter(Boolean))],B=[...new Set(normText(b).split(' ').filter(Boolean))];if(!A.length||!B.length)return 0;const setB=new Set(B);let common=0;A.forEach(x=>{if(setB.has(x))common++;});return 2*common/(A.length+B.length)*100;}
  function levenshteinRatio(a,b){a=normText(a);b=normText(b);if(a===b)return a?100:0;if(!a||!b)return 0;if(a.length>b.length){const t=a;a=b;b=t;}let prev=Array.from({length:a.length+1},(_,i)=>i),cur=new Array(a.length+1);for(let j=1;j<=b.length;j++){cur[0]=j;for(let i=1;i<=a.length;i++)cur[i]=Math.min(cur[i-1]+1,prev[i]+1,prev[i-1]+(a[i-1]===b[j-1]?0:1));const t=prev;prev=cur;cur=t;}const d=prev[a.length],mx=Math.max(a.length,b.length);return mx?((mx-d)/mx)*100:100;}
  function descriptionScore(a,b){return Math.max(tokenDice(a,b),levenshteinRatio(a,b));}
  function priceCloseness(a,b){if(a==null||b==null)return 0;const d=Math.abs(Number(a)-Number(b));if(d<=0.011)return 300;if(d<=0.05)return 240;if(d<=0.25)return 120;if(d<=1)return 40;if(d<=3)return 10;return 0;}

  function bridgeForInvoice(inv,refs){
    const code=digits(inv.productCode),master=refs&&refs.master,supplier=refs&&refs.supplier;
    const sup=(supplier&&supplier.ch2SupplierLookup&&supplier.ch2SupplierLookup.get(code))||{};
    let rec=master&&master.byCode?master.byCode.get(code):null,via='';
    if(rec)via='CH2_CODE→MERGED_ALIGNED';
    if(!rec&&sup.SUP_BARCODE&&master&&master.byBarcode){rec=master.byBarcode.get(digits(sup.SUP_BARCODE));if(rec)via='CH2_CODE→SUPPLIER_UPDATE→BARCODE→MERGED_ALIGNED';}
    return {code,rec:rec||{},supplier:sup,via};
  }

  function candidate(inv,pos,refs){
    const bridge=bridgeForInvoice(inv,refs),rec=bridge.rec||{},sup=bridge.supplier||{};
    const posBarcode=digits(pos.barcode),posPlu=digits(pos.plu),posSub=digits(pos.subId),invCode=digits(inv.productCode),bridgeBarcode=digits(rec.POS_MASTER_BARCODE),bridgePlu=digits(rec.POS_PLU),supBarcode=digits(sup.SUP_BARCODE);
    let score=0,method='',confidence='LOW',exact=false;
    if(bridgeBarcode&&posBarcode&&bridgeBarcode===posBarcode){score+=7000;method=`${bridge.via||'CH2_CODE'}→BARCODE→POS_ORDER`;confidence='HIGH';exact=true;}
    else if(bridgePlu&&posPlu&&bridgePlu===posPlu){score+=6500;method=`${bridge.via||'CH2_CODE'}→PLU→POS_ORDER`;confidence='HIGH';exact=true;}
    else if(invCode&&posSub&&invCode===posSub){score+=6000;method='CH2 PRODUCT CODE→POS SUB ID';confidence='HIGH';exact=true;}
    else if(supBarcode&&posBarcode&&supBarcode===posBarcode){score+=5800;method='CH2 CODE→SUPPLIER UPDATE→BARCODE→POS ORDER';confidence='HIGH';exact=true;}

    const descInvoice=descriptionScore(inv.description,pos.description),descMaster=clean(rec.POS_DESCR)?descriptionScore(rec.POS_DESCR,pos.description):0,desc=Math.max(descInvoice,descMaster);
    score+=desc*2+priceCloseness(inv.normalWholesale,pos.normalWholesale);
    if(inv.rrp!=null&&pos.rrp!=null){const d=Math.abs(Number(inv.rrp)-Number(pos.rrp));if(d<=0.05)score+=60;else if(d<=0.5)score+=20;}
    if(Number(inv.qtySupplied)===Number(pos.orderedQty))score+=20;
    const normalClose=inv.normalWholesale!=null&&pos.normalWholesale!=null&&Math.abs(Number(inv.normalWholesale)-Number(pos.normalWholesale))<=0.05;
    const accepted=exact||(normalClose&&desc>=30)||desc>=58||score>=280;
    if(!exact){
      if(normalClose&&desc>=68){confidence='HIGH';method='NORMAL W/S + DESCRIPTION';}
      else if((normalClose&&desc>=30)||desc>=75){confidence='MEDIUM';method='DESCRIPTION / PRICE';}
      else {confidence='LOW';method='DESCRIPTION FALLBACK';}
    }
    return {score,desc,accepted,confidence,method,exact,normalClose,bridge};
  }

  function groupInvoiceRows(invoiceRows){
    const map=new Map();
    for(const row of invoiceRows){const code=digits(row.productCode),key=code?`CODE:${code}`:`DESC:${normText(row.description)}|WS:${row.normalWholesale??''}`;if(!map.has(key))map.set(key,[]);map.get(key).push(row);}
    return [...map.entries()].map(([key,rows])=>({key,rows,representative:{...rows[0],qtySupplied:rows.reduce((a,r)=>a+Number(r.qtySupplied||0),0)}}));
  }
  function assignGroups(groups,posRows,refs){
    const pairs=[];
    groups.forEach((g,gi)=>posRows.forEach((pos,pi)=>{const c=candidate(g.representative,pos,refs);if(c.accepted)pairs.push({...c,gi,pi});}));
    pairs.sort((a,b)=>b.score-a.score);
    const usedG=new Set(),usedP=new Set(),assigned=new Map();
    for(const p of pairs){if(usedG.has(p.gi)||usedP.has(p.pi))continue;usedG.add(p.gi);usedP.add(p.pi);assigned.set(p.gi,p);}
    // Conservative final fallback for renamed legacy descriptions. It never overrides an existing exact/strong match.
    const relaxed=[];
    groups.forEach((g,gi)=>{
      if(usedG.has(gi))return;const inv=g.representative,invBrand=normText(inv.description).split(' ')[0]||'';
      posRows.forEach((pos,pi)=>{
        if(usedP.has(pi))return;const posBrand=normText(pos.description).split(' ')[0]||'',desc=descriptionScore(inv.description,pos.description),qtySame=Math.abs(Number(inv.qtySupplied||0)-Number(pos.orderedQty||0))<0.0001;
        if(invBrand&&invBrand===posBrand&&qtySame&&desc>=22)relaxed.push({gi,pi,score:desc*2+50,desc,accepted:true,confidence:'LOW',method:'BRAND + QTY + DESCRIPTION FALLBACK'});
      });
    });
    relaxed.sort((a,b)=>b.score-a.score);
    for(const p of relaxed){if(usedG.has(p.gi)||usedP.has(p.pi))continue;usedG.add(p.gi);usedP.add(p.pi);assigned.set(p.gi,p);}
    return assigned;
  }
  function weightedAverage(rows,key,weightKey='qtySupplied'){let n=0,d=0;for(const r of rows||[]){const v=r[key],w=Number(r[weightKey]??0);if(v!=null&&Number.isFinite(Number(v))&&Number.isFinite(w)&&w!==0){n+=Number(v)*w;d+=w;}}return d?n/d:null;}

  function reconcile(posOrder,invoiceDocuments,refs){
    const posRows=posOrder.rows||[],invoiceRows=[],warnings=[];
    invoiceDocuments.forEach(doc=>{if(doc.warning)warnings.push(`${doc.sourceFile}: ${doc.warning}`);const docRows=(doc.rows||[]);docRows.forEach(r=>invoiceRows.push(r));if(doc.cancelled&&doc.cancelled.length)warnings.push(`${doc.sourceFile}: ${doc.cancelled.length} supplier line(s) were marked C (cancelled/backordered) and correctly excluded from billed totals.`);if(doc.skipped&&doc.skipped.length)warnings.push(`${doc.sourceFile}: ${doc.skipped.length} candidate line(s) could not be confidently classified as billed or cancelled and should be reviewed.`);if(doc.integrity&&doc.integrity.footerFound===false)warnings.push(`${doc.sourceFile}: footer totals were not machine-readable; line arithmetic was still checked.`);const missingDisc=docRows.filter(r=>r.discountPct==null).length,missingWs=docRows.filter(r=>r.normalWholesale==null).length;if(missingDisc)warnings.push(`${doc.sourceFile}: ${missingDisc} billed line(s) did not print a CH2 discount %. These remain blank and are marked NO CHECK, not 0%.`);if(missingWs)warnings.push(`${doc.sourceFile}: ${missingWs} billed line(s) did not print Normal W/S. Wholesale/discount price checks requiring Normal W/S are marked NO CHECK.`);});

    const matchedByPos=new Map(),unmatchedInvoice=[],groups=groupInvoiceRows(invoiceRows),assignments=assignGroups(groups,posRows,refs);
    groups.forEach((g,gi)=>{
      const match=assignments.get(gi);
      if(!match){g.rows.forEach(inv=>unmatchedInvoice.push({...inv,matchStatus:'NOT ORDERED / UNMATCHED'}));return;}
      for(const inv of g.rows){
        const row={...inv,matchScore:round(match.score,1),descriptionScore:round(match.desc,1),matchConfidence:match.confidence,matchMethod:match.method};
        if(!matchedByPos.has(match.pi))matchedByPos.set(match.pi,[]);matchedByPos.get(match.pi).push(row);
      }
    });

    const detail=[];
    posRows.forEach((pos,index)=>{
      const invs=matchedByPos.get(index)||[],suppliedQty=round(invs.reduce((a,r)=>a+Number(r.qtySupplied||0),0),3)??0,qtyVariance=round(suppliedQty-Number(pos.orderedQty||0),3)??0;
      const actualUnit=weightedAverage(invs,'unitPriceExGst'),actualDisc=weightedAverage(invs,'discountPct'),invoiceWs=weightedAverage(invs,'normalWholesale');
      const unitVariance=(actualUnit!=null&&pos.expectedUnit!=null)?round(actualUnit-pos.expectedUnit,4):null,wholesaleVariance=(invoiceWs!=null&&pos.normalWholesale!=null)?round(invoiceWs-pos.normalWholesale,4):null,missedTotal=(unitVariance!=null&&unitVariance>PRICE_TOL)?round(unitVariance*suppliedQty,2):0;
      const statuses=[],auditDataMissing=!!invs.length&&(actualDisc==null||invoiceWs==null);
      if(!invs.length)statuses.push('NOT INVOICED');
      else {if(qtyVariance<0)statuses.push('SHORT SUPPLIED');if(qtyVariance>0)statuses.push('OVER SUPPLIED');if(wholesaleVariance!=null&&Math.abs(wholesaleVariance)>WHOLESALE_TOL)statuses.push('WHOLESALE MISMATCH');if(unitVariance!=null&&unitVariance>PRICE_TOL)statuses.push('PRICE HIGH');if(unitVariance!=null&&unitVariance>PRICE_TOL&&actualDisc!=null&&pos.expectedDiscountPct!=null&&actualDisc+0.05<pos.expectedDiscountPct)statuses.push('DISCOUNT LOW');if(auditDataMissing)statuses.push('REVIEW - AUDIT DATA MISSING');}
      if(!statuses.length)statuses.push(unitVariance!=null&&unitVariance<-PRICE_TOL?'BETTER PRICE':'OK');
      const rank={LOW:0,MEDIUM:1,HIGH:2};
      detail.push({
        posIndex:pos.posIndex,sourceRow:pos.sourceRow,identity:pos.identity,orderNumber:pos.orderNumber,plu:pos.plu,barcode:pos.barcode,subId:pos.subId,posDescription:pos.description,
        orderedQty:pos.orderedQty,suppliedQty,qtyVariance,posNormalWholesale:pos.normalWholesale,invoiceNormalWholesale:round(invoiceWs,2),wholesaleVariance,
        expectedDiscountPct:round(pos.expectedDiscountPct,2),actualDiscountPct:round(actualDisc,2),expectedUnit:round(pos.expectedUnit,2),actualUnit:round(actualUnit,4),unitVariance,missedTotal,rrp:pos.rrp,
        status:statuses.join(' + '),hasException:statuses.some(s=>!['OK','BETTER PRICE'].includes(s)),auditDataMissing,invoiceNumbers:[...new Set(invs.map(x=>x.invoiceNumber).filter(Boolean))].join(', '),sourceFiles:[...new Set(invs.map(x=>x.sourceFile))].join(', '),
        matchConfidence:invs.length?invs.map(x=>x.matchConfidence).sort((a,b)=>(rank[a]??9)-(rank[b]??9))[0]:'',matchMethods:[...new Set(invs.map(x=>x.matchMethod))].join(', '),invoiceRows:invs
      });
    });

    const exceptions=detail.filter(x=>x.hasException),betterPrice=detail.filter(x=>x.status==='BETTER PRICE'),lowConfidence=detail.filter(x=>x.matchConfidence==='LOW');
    const totals={posLines:posRows.length,invoiceLines:invoiceRows.length,matchedInvoiceLines:invoiceRows.length-unmatchedInvoice.length,unmatchedInvoiceLines:unmatchedInvoice.length,correctLines:detail.filter(x=>x.status==='OK').length,betterPriceLines:betterPrice.length,exceptionLines:exceptions.length,lowConfidenceLines:lowConfidence.length,auditDataMissing:detail.filter(x=>x.auditDataMissing).length,notInvoiced:detail.filter(x=>x.status.includes('NOT INVOICED')).length,shortSupplied:detail.filter(x=>x.status.includes('SHORT SUPPLIED')).length,overSupplied:detail.filter(x=>x.status.includes('OVER SUPPLIED')).length,priceHigh:detail.filter(x=>x.status.includes('PRICE HIGH')).length,missedTotal:round(detail.reduce((a,x)=>a+Number(x.missedTotal||0),0),2)||0};
    return {orderNumber:posOrder.orderNumber||'',sourcePosFile:posOrder.sourceFile,detail,exceptions,unmatchedInvoice,invoiceRows,totals,warnings,createdAt:new Date().toISOString()};
  }

  PHF.reconcile=reconcile;
  PHF._descriptionScore=descriptionScore;
})(window);
