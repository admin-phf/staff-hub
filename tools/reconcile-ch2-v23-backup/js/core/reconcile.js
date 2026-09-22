(function(global){
  'use strict';
  const PHF = global.PHFReconcile = global.PHFReconcile || {};

  const PRICE_TOL=0.03;
  const WHOLESALE_TOL=0.03;

  function clean(v){return v==null?'':String(v).trim();}
  function normText(v){return clean(v).toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
  function digits(v){return clean(v).replace(/\.0+$/,'').replace(/\D+/g,'');}
  function tokenDice(a,b){
    const A=[...new Set(normText(a).split(' ').filter(Boolean))], B=[...new Set(normText(b).split(' ').filter(Boolean))];
    if(!A.length||!B.length) return 0;
    const setB=new Set(B); let common=0; A.forEach(x=>{if(setB.has(x)) common++;});
    return (2*common/(A.length+B.length))*100;
  }
  function levenshteinRatio(a,b){
    a=normText(a); b=normText(b); if(a===b) return a?100:0; if(!a||!b) return 0;
    if(a.length>b.length){const t=a;a=b;b=t;}
    let prev=Array.from({length:a.length+1},(_,i)=>i), cur=new Array(a.length+1);
    for(let j=1;j<=b.length;j++){
      cur[0]=j;
      for(let i=1;i<=a.length;i++) cur[i]=Math.min(cur[i-1]+1,prev[i]+1,prev[i-1]+(a[i-1]===b[j-1]?0:1));
      const t=prev; prev=cur; cur=t;
    }
    const d=prev[a.length], max=Math.max(a.length,b.length); return max?((max-d)/max)*100:100;
  }
  function descriptionScore(a,b){return Math.max(tokenDice(a,b),levenshteinRatio(a,b));}
  function priceCloseness(a,b){
    if(a==null||b==null) return 0; const d=Math.abs(Number(a)-Number(b));
    if(d<=0.011) return 300; if(d<=0.05) return 240; if(d<=0.25) return 120; if(d<=1) return 40; if(d<=3) return 10; return 0;
  }
  function candidate(inv,pos){
    const exactCode=digits(pos.subId) && digits(pos.subId)===digits(inv.productCode);
    const desc=descriptionScore(inv.description,pos.description);
    let score=(exactCode?1000:0)+(desc*2)+priceCloseness(inv.normalWholesale,pos.normalWholesale);
    if(inv.rrp!=null&&pos.rrp!=null){const d=Math.abs(inv.rrp-pos.rrp); if(d<=0.05)score+=40;else if(d<=0.5)score+=15;}
    if(inv.qtySupplied===pos.orderedQty) score+=15;
    const normalClose=inv.normalWholesale!=null&&pos.normalWholesale!=null&&Math.abs(inv.normalWholesale-pos.normalWholesale)<=0.05;
    const accepted=exactCode || (normalClose&&desc>=30) || desc>=55 || score>=220;
    let confidence='LOW';
    if(exactCode || (normalClose&&desc>=65)) confidence='HIGH';
    else if((normalClose&&desc>=30)||desc>=72) confidence='MEDIUM';
    return {score,desc,exactCode,normalClose,accepted,confidence};
  }
  function groupInvoiceRows(invoiceRows){
    const map=new Map();
    for(const row of invoiceRows){
      const code=digits(row.productCode);
      const key=code?`CODE:${code}`:`DESC:${normText(row.description)}|WS:${row.normalWholesale??''}`;
      if(!map.has(key)) map.set(key,[]);
      map.get(key).push(row);
    }
    return [...map.entries()].map(([key,rows])=>({key,rows,representative:{...rows[0],qtySupplied:rows.reduce((a,r)=>a+Number(r.qtySupplied||0),0)}}));
  }
  function assignGroups(groups,posRows){
    const pairs=[];
    groups.forEach((g,gi)=>posRows.forEach((pos,pi)=>{const c=candidate(g.representative,pos);if(c.accepted)pairs.push({...c,gi,pi});}));
    pairs.sort((a,b)=>b.score-a.score);
    const usedG=new Set(),usedP=new Set(),assigned=new Map();
    for(const p of pairs){
      if(usedG.has(p.gi)||usedP.has(p.pi)) continue;
      usedG.add(p.gi);usedP.add(p.pi);assigned.set(p.gi,p);
    }
    // Final conservative fallback: if an invoice group and an unused POS line share
    // the same leading brand token and quantity, pair the strongest remainder match
    // as LOW confidence. This catches legacy POS descriptions that have been renamed.
    const relaxed=[];
    groups.forEach((g,gi)=>{
      if(usedG.has(gi)) return;
      const inv=g.representative, invBrand=normText(inv.description).split(' ')[0]||'';
      posRows.forEach((pos,pi)=>{
        if(usedP.has(pi)) return;
        const posBrand=normText(pos.description).split(' ')[0]||'';
        const desc=descriptionScore(inv.description,pos.description);
        const qtySame=Math.abs(Number(inv.qtySupplied||0)-Number(pos.orderedQty||0))<0.0001;
        if(invBrand && invBrand===posBrand && qtySame && desc>=20) relaxed.push({gi,pi,score:desc*2+50,desc,exactCode:false,normalClose:false,accepted:true,confidence:'LOW'});
      });
    });
    relaxed.sort((a,b)=>b.score-a.score);
    for(const p of relaxed){
      if(usedG.has(p.gi)||usedP.has(p.pi)) continue;
      usedG.add(p.gi);usedP.add(p.pi);assigned.set(p.gi,p);
    }
    return assigned;
  }
  function round(v,n=2){if(v==null||!Number.isFinite(Number(v)))return null;const p=10**n;return Math.round((Number(v)+Number.EPSILON)*p)/p;}
  function weightedAverage(rows,key,weightKey){
    let num=0,den=0; rows.forEach(r=>{const v=r[key],w=Number(r[weightKey]??0); if(v!=null&&Number.isFinite(Number(v))&&Number.isFinite(w)){num+=Number(v)*w;den+=w;}}); return den?num/den:null;
  }

  function reconcile(posOrder,invoiceDocuments){
    const posRows=posOrder.rows||[];
    const invoiceRows=[]; const warnings=[];
    invoiceDocuments.forEach(doc=>{
      if(doc.warning) warnings.push(`${doc.sourceFile}: ${doc.warning}`);
      (doc.rows||[]).forEach(r=>invoiceRows.push(r));
      if(doc.skipped&&doc.skipped.length) warnings.push(`${doc.sourceFile}: ${doc.skipped.length} invoice line candidate(s) could not be parsed.`);
    });

    const matchedByPos=new Map(); const unmatchedInvoice=[];
    const groups=groupInvoiceRows(invoiceRows);
    const assignments=assignGroups(groups,posRows);
    groups.forEach((g,gi)=>{
      const match=assignments.get(gi);
      if(!match){g.rows.forEach(inv=>unmatchedInvoice.push({...inv,matchStatus:'NOT ORDERED / UNMATCHED'}));return;}
      for(const inv of g.rows){
        const row={...inv,matchScore:round(match.score,1),descriptionScore:round(match.desc,1),matchConfidence:match.confidence,matchMethod:match.exactCode?'CH2 PRODUCT CODE':(match.normalClose?'NORMAL W/S + DESCRIPTION':'DESCRIPTION')};
        if(!matchedByPos.has(match.pi)) matchedByPos.set(match.pi,[]);
        matchedByPos.get(match.pi).push(row);
      }
    });

    const detail=[];
    posRows.forEach((pos,index)=>{
      const invs=matchedByPos.get(index)||[];
      const suppliedQty=round(invs.reduce((a,r)=>a+Number(r.qtySupplied||0),0),3)??0;
      const qtyVariance=round(suppliedQty-Number(pos.orderedQty||0),3)??0;
      const actualUnit=weightedAverage(invs,'unitPriceExGst','qtySupplied');
      const actualDisc=weightedAverage(invs,'discountPct','qtySupplied');
      const invoiceWs=weightedAverage(invs,'normalWholesale','qtySupplied');
      const unitVariance=(actualUnit!=null&&pos.expectedUnit!=null)?round(actualUnit-pos.expectedUnit,4):null;
      const wholesaleVariance=(invoiceWs!=null&&pos.normalWholesale!=null)?round(invoiceWs-pos.normalWholesale,4):null;
      const missedTotal=(unitVariance!=null&&unitVariance>PRICE_TOL)?round(unitVariance*suppliedQty,2):0;
      const statuses=[];
      if(!invs.length) statuses.push('NOT INVOICED');
      else {
        if(qtyVariance<0) statuses.push('SHORT SUPPLIED');
        if(qtyVariance>0) statuses.push('OVER SUPPLIED');
        if(wholesaleVariance!=null&&Math.abs(wholesaleVariance)>WHOLESALE_TOL) statuses.push('WHOLESALE MISMATCH');
        if(unitVariance!=null&&unitVariance>PRICE_TOL) statuses.push('PRICE HIGH');
        if(unitVariance!=null&&unitVariance>PRICE_TOL&&actualDisc!=null&&pos.expectedDiscountPct!=null&&actualDisc+0.05<pos.expectedDiscountPct) statuses.push('DISCOUNT LOW');
      }
      if(!statuses.length) statuses.push(unitVariance!=null&&unitVariance<-PRICE_TOL?'BETTER PRICE':'OK');
      detail.push({
        posIndex:pos.posIndex,orderNumber:pos.orderNumber,plu:pos.plu,barcode:pos.barcode,subId:pos.subId,posDescription:pos.description,
        orderedQty:pos.orderedQty,suppliedQty,qtyVariance,posNormalWholesale:pos.normalWholesale,invoiceNormalWholesale:round(invoiceWs,2),wholesaleVariance,
        expectedDiscountPct:round(pos.expectedDiscountPct,2),actualDiscountPct:round(actualDisc,2),expectedUnit:round(pos.expectedUnit,2),actualUnit:round(actualUnit,4),unitVariance,
        missedTotal,rrp:pos.rrp,status:statuses.join(' + '),hasException:statuses.some(s=>!['OK','BETTER PRICE'].includes(s)),
        invoiceNumbers:[...new Set(invs.map(x=>x.invoiceNumber).filter(Boolean))].join(', '),sourceFiles:[...new Set(invs.map(x=>x.sourceFile))].join(', '),
        matchConfidence:invs.length?invs.map(x=>x.matchConfidence).sort((a,b)=>({LOW:0,MEDIUM:1,HIGH:2}[a]-{LOW:0,MEDIUM:1,HIGH:2}[b]))[0]:'',
        matchMethods:[...new Set(invs.map(x=>x.matchMethod))].join(', '),invoiceRows:invs
      });
    });

    const exceptions=detail.filter(x=>x.hasException);
    const betterPrice=detail.filter(x=>x.status==='BETTER PRICE');
    const lowConfidence=detail.filter(x=>x.matchConfidence==='LOW');
    const totals={
      posLines:posRows.length,invoiceLines:invoiceRows.length,matchedInvoiceLines:invoiceRows.length-unmatchedInvoice.length,unmatchedInvoiceLines:unmatchedInvoice.length,
      correctLines:detail.filter(x=>x.status==='OK').length,betterPriceLines:betterPrice.length,exceptionLines:exceptions.length,lowConfidenceLines:lowConfidence.length,
      notInvoiced:detail.filter(x=>x.status.includes('NOT INVOICED')).length,shortSupplied:detail.filter(x=>x.status.includes('SHORT SUPPLIED')).length,
      overSupplied:detail.filter(x=>x.status.includes('OVER SUPPLIED')).length,priceHigh:detail.filter(x=>x.status.includes('PRICE HIGH')).length,
      missedTotal:round(detail.reduce((a,x)=>a+Number(x.missedTotal||0),0),2)||0
    };
    return {orderNumber:posOrder.orderNumber||'',sourcePosFile:posOrder.sourceFile,detail,exceptions,unmatchedInvoice,invoiceRows,totals,warnings,createdAt:new Date().toISOString()};
  }

  PHF.reconcile=reconcile;
  PHF._descriptionScore=descriptionScore;
})(window);
