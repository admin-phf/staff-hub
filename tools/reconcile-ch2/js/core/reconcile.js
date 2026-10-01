(function(global){
  'use strict';
  const PHF=global.PHFReconcile=global.PHFReconcile||{};
  const PRICE_TOL=0.03,WHOLESALE_TOL=0.03;

  function clean(v){return v==null?'':String(v).trim();}
  function normText(v){return clean(v).toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
  function digits(v){return clean(v).replace(/\.0+$/,'').replace(/\D+/g,'');}
  function numericCodeOnly(v){
    let s=clean(v);if(/^\d+\.0+$/.test(s))s=s.split('.')[0];
    return /^\d+$/.test(s)?s:'';
  }
  function round(v,n=2){if(v==null||!Number.isFinite(Number(v)))return null;const p=10**n;return Math.round((Number(v)+Number.EPSILON)*p)/p;}
  function tokenDice(a,b){const A=[...new Set(normText(a).split(' ').filter(Boolean))],B=[...new Set(normText(b).split(' ').filter(Boolean))];if(!A.length||!B.length)return 0;const setB=new Set(B);let common=0;A.forEach(x=>{if(setB.has(x))common++;});return 2*common/(A.length+B.length)*100;}
  function levenshteinRatio(a,b){a=normText(a);b=normText(b);if(a===b)return a?100:0;if(!a||!b)return 0;if(a.length>b.length){const t=a;a=b;b=t;}let prev=Array.from({length:a.length+1},(_,i)=>i),cur=new Array(a.length+1);for(let j=1;j<=b.length;j++){cur[0]=j;for(let i=1;i<=a.length;i++)cur[i]=Math.min(cur[i-1]+1,prev[i]+1,prev[i-1]+(a[i-1]===b[j-1]?0:1));const t=prev;prev=cur;cur=t;}const d=prev[a.length],mx=Math.max(a.length,b.length);return mx?((mx-d)/mx)*100:100;}
  function descriptionScore(a,b){return Math.max(tokenDice(a,b),levenshteinRatio(a,b));}
  function priceCloseness(a,b){if(a==null||b==null)return 0;const d=Math.abs(Number(a)-Number(b));if(d<=0.011)return 300;if(d<=0.05)return 240;if(d<=0.25)return 120;if(d<=1)return 40;if(d<=3)return 10;return 0;}
  function toNum(v){if(typeof v==='number')return Number.isFinite(v)?v:null;let s=clean(v).replace(/[$,%]/g,'').replace(/,/g,'');if(!s)return null;if(/^\.\d+$/.test(s))s='0'+s;const n=Number(s);return Number.isFinite(n)?n:null;}
  function compact(v){return normText(v).replace(/\s+/g,'');}

  // v2.6.28 — Normal W/S backfill.
  // Some CH2 invoice lines are billed without printing NORMAL W/S. Without it the line
  // loses its strongest matching signal and cannot be priced for POSActive. The missing
  // value is taken from the POS master reference column CH2_WHOLESALE_EX_GST for the
  // invoice CH2 product code. If the reference has no numeric wholesale for that code,
  // the value printed on the invoice itself is used: Unit Price ex GST ÷ (1 − Disc %).
  // Printed values are never overwritten, and every filled row records its source.
  const WS_SOURCE_INVOICE='INVOICE',WS_SOURCE_REFERENCE='REFERENCE CH2_WHOLESALE_EX_GST',WS_SOURCE_DERIVED='DERIVED UNIT ÷ (1 − DISC %)',WS_SOURCE_MISSING='MISSING';
  function referenceWholesaleForCode(code,refs){
    const master=refs&&refs.master;if(!master||!code)return null;
    const primary=master.byCode&&typeof master.byCode.get==='function'?master.byCode.get(code):null,pv=toNum(primary&&primary.POS_CH2_WHOLESALE_EX_GST);
    if(pv!=null&&pv>0)return pv;
    const all=(master.byCodeAll&&typeof master.byCodeAll.get==='function'&&master.byCodeAll.get(code))||[];
    const values=[...new Set(all.map(r=>toNum(r&&r.POS_CH2_WHOLESALE_EX_GST)).filter(v=>v!=null&&v>0).map(v=>round(v,4)))];
    return values.length?values[0]:null;
  }
  function backfillInvoiceWholesale(invoiceDocuments,refs){
    const filled=[],missing=[];
    for(const doc of invoiceDocuments||[]){
      if(!doc||doc.type==='CREDIT_NOTE')continue;
      for(const row of doc.rows||[]){
        if(!row)continue;
        if(row.normalWholesaleSource){if(row.normalWholesaleSource===WS_SOURCE_MISSING)missing.push(row);else if(row.normalWholesaleSource!==WS_SOURCE_INVOICE)filled.push(row);continue;}
        if(toNum(row.normalWholesale)!=null){row.normalWholesaleSource=WS_SOURCE_INVOICE;continue;}
        let ws=referenceWholesaleForCode(digits(row.productCode),refs),source=ws!=null?WS_SOURCE_REFERENCE:'';
        if(ws==null){
          const unit=toNum(row.unitPriceExGst),disc=toNum(row.discountPct);
          if(unit!=null&&unit>0&&disc!=null&&disc>=0&&disc<100){ws=unit/(1-disc/100);source=WS_SOURCE_DERIVED;}
        }
        if(ws==null){row.normalWholesaleSource=WS_SOURCE_MISSING;missing.push(row);continue;}
        row.invoicePrintedNormalWholesale=null;
        row.normalWholesale=round(ws,source===WS_SOURCE_DERIVED?2:4);
        row.normalWholesaleSource=source;filled.push(row);
      }
    }
    return {filled,missing};
  }

  // POS product brand (compact, e.g. JACK N JILL → JACKNJILL) from every aligned-master
  // record for the exact POS PLU/barcode, including records without a CH2 code.
  function posMasterRecords(pos,refs){
    const master=refs&&refs.master;if(!master||!pos)return [];
    const plu=digits(pos.plu),bc=digits(pos.barcode),recs=[];
    const push=r=>{if(r&&!recs.includes(r))recs.push(r);};
    if(plu){for(const r of (master.byPluAll&&typeof master.byPluAll.get==='function'&&master.byPluAll.get(plu))||[])push(r);if(master.byPlu&&typeof master.byPlu.get==='function')push(master.byPlu.get(plu));}
    if(bc){for(const r of (master.byBarcodeAll&&typeof master.byBarcodeAll.get==='function'&&master.byBarcodeAll.get(bc))||[])push(r);if(master.byBarcode&&typeof master.byBarcode.get==='function')push(master.byBarcode.get(bc));}
    // A shared barcode never borrows data from a record for a different PLU.
    return recs.filter(r=>{const rp=digits(r.POS_PLU),rb=digits(r.POS_MASTER_BARCODE);if(plu&&rp)return plu===rp&&(!bc||!rb||bc===rb);return !!(bc&&rb===bc);});
  }
  // v2.6.37 — supplier code → POS Sub ID. CH2 prints the vendor's own code as "<VENDOR>-<code>"
  // (e.g. HOMWEL-TTSO1253, ORGTRA-2201131) and POSActive Sub IDs are very often that vendor code.
  // When a CH2 code has no POS link in the aligned master, the invoice line is resolved to the one
  // POS product whose Sub ID equals the whole supplier code or the part after the first "-".
  // The index covers every POS product in the master and is built lazily, so cached references work.
  const subIdIndexCache=new WeakMap();
  function posSubIdIndex(master){
    if(!master)return new Map();let idx=subIdIndexCache.get(master);if(idx)return idx;idx=new Map();
    const seen=new Set(),add=r=>{if(!r||seen.has(r))return;seen.add(r);const sid=clean(r.POS_SUB_ID).toUpperCase();if(!sid||!(digits(r.POS_PLU)||digits(r.POS_MASTER_BARCODE)))return;if(!idx.has(sid))idx.set(sid,[]);idx.get(sid).push(r);};
    for(const m of [master.byPluAll,master.byBarcodeAll])if(m&&typeof m.values==='function')for(const list of m.values())for(const r of list||[])add(r);
    subIdIndexCache.set(master,idx);return idx;
  }
  function supplierCodeKeys(v){
    const s=clean(v).toUpperCase();if(!s)return [];const keys=[s],i=s.indexOf('-');if(i>0&&i<s.length-1)keys.push(s.slice(i+1));
    return [...new Set(keys)].filter(k=>k.replace(/[^A-Z0-9]/g,'').length>=4);
  }
  function posRecordsBySupplierCode(inv,refs){
    const idx=posSubIdIndex(refs&&refs.master);
    for(const key of supplierCodeKeys(inv&&inv.supplierSku)){
      const recs=idx.get(key)||[],products=new Set(recs.map(r=>digits(r.POS_PLU)||('BC'+digits(r.POS_MASTER_BARCODE))));
      if(recs.length&&products.size===1)return {recs,key,via:`SUPPLIER CODE ${clean(inv.supplierSku)} → POS SUB ID ${key}`};
    }
    return null;
  }
  // One POS product for an invoice line: a CH2-code record with a POS link first, otherwise the
  // supplier-code → POS Sub ID product, otherwise the bare CH2 record (no POS link).
  function posRecordForInvoiceLine(inv,refs){
    const master=refs&&refs.master,code=digits(inv&&inv.productCode),all=(code&&master&&master.byCodeAll&&typeof master.byCodeAll.get==='function'&&master.byCodeAll.get(code))||[];
    const linked=all.find(r=>digits(r&&r.POS_MASTER_BARCODE)||clean(r&&r.POS_PLU));
    if(linked)return {rec:linked,via:'CH2 CODE',codeRecords:all};
    const bySup=posRecordsBySupplierCode(inv,refs);
    if(bySup){const rec=bySup.recs.slice().sort((a,b)=>['POS_DESCR','POS_BRAND','POS_WSP_EXCGST','POS_LAST_PRICE','POS_RRP_INCGST'].reduce((n,k)=>n+(clean(b[k])?1:0)-(clean(a[k])?1:0),0))[0];return {rec,via:bySup.via,codeRecords:all,supplierKey:bySup.key};}
    return {rec:all[0]||(code&&master&&master.byCode&&typeof master.byCode.get==='function'&&master.byCode.get(code))||null,via:'',codeRecords:all};
  }
  function posBrandCompact(pos,refs){
    for(const r of posMasterRecords(pos,refs)){const b=compact(r.POS_BRAND||r.POS_MASTER_BRAND);if(b.length>=3)return b;}
    return '';
  }

  // v2.6.29 — second W/S pass once the invoice line is linked to its POS row.
  // 1) POS master CH2_WHOLESALE_EX_GST for that POS product (barcode/PLU), for CH2 codes
  //    that are new or absent from the master; 2) when CH2 printed neither Normal W/S nor a
  //    Disc %, the line was billed at wholesale, so Normal W/S = Unit Price ex GST.
  const WS_SOURCE_POS_REFERENCE='REFERENCE CH2_WHOLESALE_EX_GST (POS PRODUCT)',WS_SOURCE_UNIT='UNIT PRICE (NO DISC % PRINTED)';
  function backfillMatchedWholesale(groups,assignments,posRows,refs){
    const filled=[];
    for(const [gi,match] of assignments){
      const pos=posRows[match.pi],g=groups[gi];if(!pos||!g)continue;let recs=null;
      for(const inv of g.rows||[]){
        if(toNum(inv.normalWholesale)!=null)continue;
        if(!recs)recs=posMasterRecords(pos,refs);
        let ws=null,source='';
        for(const r of recs){const v=toNum(r&&r.POS_CH2_WHOLESALE_EX_GST);if(v!=null&&v>0){ws=v;source=WS_SOURCE_POS_REFERENCE;break;}}
        const unit=toNum(inv.unitPriceExGst);
        if(ws==null&&toNum(inv.discountPct)==null&&unit!=null&&unit>0){ws=unit;source=WS_SOURCE_UNIT;}
        if(ws==null)continue;
        inv.invoicePrintedNormalWholesale=null;inv.normalWholesale=round(ws,source===WS_SOURCE_UNIT?2:4);inv.normalWholesaleSource=source;filled.push(inv);
      }
    }
    return filled;
  }
  function wholesaleClose(a,b){const x=toNum(a),y=toNum(b);if(x==null||y==null||y<=0)return false;const d=Math.abs(x-y);return d<=0.05||d/y<=0.03;}

  // v2.6.28 — conservative invoice-sequence gap fallback for leftovers only.
  // CH2 picks and invoices the POS order in sequence. When one invoice line is left
  // unmatched between two confidently matched neighbours (e.g. lines 82 and 84), and the
  // POS rows between those neighbours' POS rows contain the unmatched ordered product
  // (e.g. POS row 78), they are paired only with corroborating quantity / W/S / brand /
  // description evidence. This never replaces an existing match and is labelled LOW
  // confidence so it remains visible for review.
  function sequenceGapFallback(groups,posRows,refs,usedG,usedP,assigned){
    const lineOf=g=>{const lines=(g.rows||[]).map(r=>toNum(r&&r.invoiceLine)).filter(v=>v!=null);return lines.length?Math.min(...lines):null;};
    const invOf=g=>clean(g.representative&&g.representative.invoiceNumber)||clean(g.representative&&g.representative.sourceFile);
    const anchors=[];
    for(const [gi,p] of assigned){if(p.confidence==='LOW')continue;const line=lineOf(groups[gi]);if(line==null)continue;anchors.push({gi,pi:p.pi,line,inv:invOf(groups[gi])});}
    const proposals=[];
    groups.forEach((g,gi)=>{
      if(usedG.has(gi))return;const line=lineOf(g);if(line==null)return;const inv=invOf(g);
      let prev=null,next=null;
      for(const a of anchors){if(a.inv!==inv)continue;if(a.line<line&&(!prev||a.line>prev.line))prev=a;if(a.line>line&&(!next||a.line<next.line))next=a;}
      if(!prev||!next||next.pi<=prev.pi)return;
      const gapPos=[];for(let pi=prev.pi+1;pi<next.pi;pi++)if(!usedP.has(pi))gapPos.push(pi);
      if(!gapPos.length)return;
      const gapGroups=groups.map((x,xi)=>({x,xi})).filter(({x,xi})=>!usedG.has(xi)&&invOf(x)===inv&&(()=>{const l=lineOf(x);return l!=null&&l>prev.line&&l<next.line;})());
      const invRep=g.representative,scored=gapPos.map(pi=>{
        const pos=posRows[pi],qtySame=Math.abs(Number(invRep.qtySupplied||0)-Number(pos.orderedQty||0))<0.0001,ws=wholesaleClose(invRep.normalWholesale,pos.normalWholesale);
        const brand=posBrandCompact(pos,refs),brandOk=!!brand&&compact(invRep.description).startsWith(brand),desc=descriptionScore(invRep.description,pos.description);
        const signals=[qtySame,ws,brandOk,desc>=20].filter(Boolean).length;
        const oneToOne=gapGroups.length===1&&gapPos.length===1;
        const ok=oneToOne?signals>=2:(signals>=3||(ws&&(brandOk||desc>=35)));
        return {pi,ok,signals,desc,qtySame,ws,brandOk,oneToOne};
      }).filter(x=>x.ok).sort((a,b)=>b.signals-a.signals||b.desc-a.desc);
      if(!scored.length)return;
      if(scored.length>1&&scored[0].signals===scored[1].signals&&Math.abs(scored[0].desc-scored[1].desc)<5)return;
      const best=scored[0],why=[best.qtySame?'QTY':'',best.ws?'W/S':'',best.brandOk?'BRAND':'',best.desc>=20?'DESCRIPTION':''].filter(Boolean).join(' + ');
      // A single line in a single-row gap with three or more corroborating signals is
      // strong evidence (MEDIUM); anything weaker stays LOW for explicit review.
      const confidence=best.oneToOne&&best.signals>=3?'MEDIUM':'LOW';
      proposals.push({gi,pi:best.pi,score:best.signals*100+best.desc,desc:best.desc,accepted:true,confidence,method:`INVOICE SEQUENCE GAP (LINES ${prev.line}–${next.line}) + ${why}`});
    });
    proposals.sort((a,b)=>b.score-a.score);
    for(const p of proposals){if(usedG.has(p.gi)||usedP.has(p.pi))continue;usedG.add(p.gi);usedP.add(p.pi);assigned.set(p.gi,p);}
  }

  function bridgeForInvoice(inv,refs){
    const code=digits(inv.productCode),master=refs&&refs.master,supplier=refs&&refs.supplier;
    const sup=(supplier&&supplier.ch2SupplierLookup&&supplier.ch2SupplierLookup.get(code))||{};
    let rec=master&&master.byCode?master.byCode.get(code):null,via='';
    if(rec)via='CH2_CODE→MERGED_ALIGNED';
    if(!rec&&sup.SUP_BARCODE&&master&&master.byBarcode){rec=master.byBarcode.get(digits(sup.SUP_BARCODE));if(rec)via='CH2_CODE→SUPPLIER_UPDATE→BARCODE→MERGED_ALIGNED';}
    return {code,rec:rec||{},supplier:sup,via};
  }

  // v2.6.34 — every POS master record linked to the CH2 code is an exact identity for the
  // invoice line, not only the preferred one. A CH2 code can sit on more than one POS product
  // (duplicate/re-created PLUs, old and new barcodes); the order may carry any of them.
  // Barcodes are compared without leading zeros (CH2 prints 0-padded EAN/UPC codes).
  function barcodeKey(v){return digits(v).replace(/^0+/,'');}
  function bridgeIdentities(inv,refs,bridge){
    const master=refs&&refs.master,code=digits(inv&&inv.productCode),barcodes=new Set(),plus=new Set(),add=r=>{if(!r)return;const b=barcodeKey(r.POS_MASTER_BARCODE),p=digits(r.POS_PLU);if(b)barcodes.add(b);if(p)plus.add(p);};
    add(bridge&&bridge.rec);
    for(const r of (code&&master&&master.byCodeAll&&typeof master.byCodeAll.get==='function'&&master.byCodeAll.get(code))||[])add(r);
    // v2.6.37 — no POS link for the CH2 code: use the supplier-code → POS Sub ID product instead.
    if(!barcodes.size&&!plus.size){const s=posRecordsBySupplierCode(inv,refs);if(s)s.recs.forEach(add);}
    return {barcodes,plus,supKeys:supplierCodeKeys(inv&&inv.supplierSku)};
  }
  const bridgeIdentityCache=new WeakMap();
  function cachedBridge(inv,refs){
    let c=bridgeIdentityCache.get(inv);
    if(!c||c.refs!==refs){const bridge=bridgeForInvoice(inv,refs);c={refs,bridge,ids:bridgeIdentities(inv,refs,bridge)};bridgeIdentityCache.set(inv,c);}
    return c;
  }
  function candidate(inv,pos,refs){
    const cached=cachedBridge(inv,refs),bridge=cached.bridge,ids=cached.ids,rec=bridge.rec||{},sup=bridge.supplier||{};
    const posBarcode=barcodeKey(pos.barcode),posPlu=digits(pos.plu),posSub=numericCodeOnly(pos.subId),invCode=digits(inv.productCode),supBarcode=barcodeKey(sup.SUP_BARCODE);
    let score=0,method='',confidence='LOW',exact=false;
    if(posBarcode&&ids.barcodes.has(posBarcode)){score+=7000;method=`${bridge.via||'CH2_CODE'}→BARCODE→POS_ORDER`;confidence='HIGH';exact=true;}
    else if(posPlu&&ids.plus.has(posPlu)){score+=6500;method=`${bridge.via||'CH2_CODE'}→PLU→POS_ORDER`;confidence='HIGH';exact=true;}
    else if(invCode&&posSub&&invCode===posSub){score+=6000;method='CH2 PRODUCT CODE→POS SUB ID';confidence='HIGH';exact=true;}
    else if(supBarcode&&posBarcode&&supBarcode===posBarcode){score+=5800;method='CH2 CODE→SUPPLIER UPDATE→BARCODE→POS ORDER';confidence='HIGH';exact=true;}
    else if(ids.supKeys.length&&clean(pos.subId)&&ids.supKeys.includes(clean(pos.subId).toUpperCase())){score+=5700;method='CH2 SUPPLIER CODE→POS SUB ID';confidence='HIGH';exact=true;}

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
    sequenceGapFallback(groups,posRows,refs,usedG,usedP,assigned);
    return assigned;
  }
  function weightedAverage(rows,key,weightKey='qtySupplied'){let n=0,d=0;for(const r of rows||[]){const v=r[key],w=Number(r[weightKey]??0);if(v!=null&&Number.isFinite(Number(v))&&Number.isFinite(w)&&w!==0){n+=Number(v)*w;d+=w;}}return d?n/d:null;}

  function reconcile(posOrder,invoiceDocuments,refs){
    const posRows=posOrder.rows||[],invoiceRows=[],warnings=[...((posOrder&&posOrder.warnings)||[])];
    backfillInvoiceWholesale(invoiceDocuments,refs);
    invoiceDocuments.forEach(doc=>{if(doc.warning)warnings.push(`${doc.sourceFile}: ${doc.warning}`);const docRows=(doc.rows||[]);docRows.forEach(r=>invoiceRows.push(r));if(doc.cancelled&&doc.cancelled.length)warnings.push(`${doc.sourceFile}: ${doc.cancelled.length} supplier line(s) were marked C (cancelled/backordered) and correctly excluded from billed totals.`);if(doc.skipped&&doc.skipped.length)warnings.push(`${doc.sourceFile}: ${doc.skipped.length} candidate line(s) could not be confidently classified as billed or cancelled and should be reviewed.`);if(doc.integrity&&doc.integrity.footerFound===false)warnings.push(`${doc.sourceFile}: footer totals were not machine-readable; line arithmetic was still checked.`);});

    const matchedByPos=new Map(),unmatchedInvoice=[],groups=groupInvoiceRows(invoiceRows),assignments=assignGroups(groups,posRows,refs);
    backfillMatchedWholesale(groups,assignments,posRows,refs);
    {
      const labels={[WS_SOURCE_REFERENCE]:'POS master CH2_WHOLESALE_EX_GST (CH2 code)',[WS_SOURCE_POS_REFERENCE]:'POS master CH2_WHOLESALE_EX_GST (matched POS product)',[WS_SOURCE_DERIVED]:'Unit Price ÷ (1 − printed Disc %)',[WS_SOURCE_UNIT]:'Unit Price (no Disc % printed)'};
      const filled=invoiceRows.filter(r=>r&&r.normalWholesaleSource&&labels[r.normalWholesaleSource]);
      if(filled.length){
        const counts=Object.entries(labels).map(([k,l])=>{const c=filled.filter(r=>r.normalWholesaleSource===k).length;return c?`${c} from ${l}`:'';}).filter(Boolean).join('; ');
        const sample=filled.slice(0,8).map(r=>`line ${Number.isFinite(Number(r.invoiceLine))?Number(r.invoiceLine):'?'} ${clean(r.description)||digits(r.productCode)} = ${Number(r.normalWholesale).toFixed(2)}`);
        warnings.push(`CH2 W/S FILLED — ${filled.length} billed invoice line${filled.length===1?'':'s'} did not print Normal W/S: ${counts}. Used for pricing checks and the POSActive Normal WS field: ${sample.join('; ')}${filled.length>sample.length?'; …':''}.`);
      }
      // v2.6.31 — Disc % not printed: the effective CH2 discount is 1 − Unit Price ÷ Normal W/S
      // (0.00% when CH2 billed at wholesale), so every matched line carries a discount figure
      // for POS Layout, the discount audit and the POSActive TXT.
      const derivedDisc=[];
      for(const r of invoiceRows){
        if(!r||toNum(r.discountPct)!=null)continue;
        const u=toNum(r.unitPriceExGst),w=toNum(r.normalWholesale);if(u==null||u<=0||w==null||w<=0)continue;
        const d=round((1-u/w)*100,2);if(d==null||d<-0.005||d>=100)continue;
        r.discountPct=Math.max(0,d);r.discountSource='DERIVED UNIT ÷ NORMAL W/S';derivedDisc.push(r);
      }
      if(derivedDisc.length)warnings.push(`CH2 DISC % DERIVED — ${derivedDisc.length} billed invoice line${derivedDisc.length===1?'':'s'} did not print a Disc %; the effective discount (1 − Unit Price ÷ Normal W/S) is used: ${derivedDisc.slice(0,8).map(r=>`line ${Number.isFinite(Number(r.invoiceLine))?Number(r.invoiceLine):'?'} ${clean(r.description)||digits(r.productCode)} = ${Number(r.discountPct).toFixed(2)}%`).join('; ')}${derivedDisc.length>8?'; …':''}.`);
      invoiceDocuments.forEach(doc=>{
        const rows=(doc&&doc.rows)||[],missingWs=rows.filter(r=>r.normalWholesale==null).length,missingDisc=rows.filter(r=>r.discountPct==null).length;
        if(missingDisc)warnings.push(`${doc.sourceFile}: ${missingDisc} billed line(s) did not print a CH2 discount % and it could not be derived (no Normal W/S). These remain blank and are marked NO CHECK, not 0%.`);
        if(missingWs)warnings.push(`${doc.sourceFile}: ${missingWs} billed line(s) did not print Normal W/S and no POS master CH2_WHOLESALE_EX_GST, printed discount or unit price was available to fill it. Wholesale/discount price checks requiring Normal W/S are marked NO CHECK.`);
      });
    }
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
  PHF.backfillInvoiceWholesale=backfillInvoiceWholesale;
  PHF.WHOLESALE_SOURCES=Object.freeze({INVOICE:WS_SOURCE_INVOICE,REFERENCE:WS_SOURCE_REFERENCE,POS_REFERENCE:WS_SOURCE_POS_REFERENCE,DERIVED:WS_SOURCE_DERIVED,UNIT:WS_SOURCE_UNIT,MISSING:WS_SOURCE_MISSING});
  PHF._posMasterRecords=posMasterRecords;
  PHF._posRecordForInvoiceLine=posRecordForInvoiceLine;
  PHF._descriptionScore=descriptionScore;
})(window);
