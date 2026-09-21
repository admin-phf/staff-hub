(function(global){
  'use strict';
  const PHF=global.PHFReconcile=global.PHFReconcile||{};
  const PRICE_TOL=0.03;

  const HEADERS=[
    'INDEX','Order Date','Invoice Date','Invoice Number','Your Ref','Line Count','Tax Amount','Invoice Total','POS_SUPPLIER','MATCH_STATUS','MATCH_METHOD','MATCH_CONFIDENCE','FUZZY_SCORE','POS_MASTER_BARCODE','POS_PLU','POS_BRAND','POS_DESCR','CH2_SUPPLIER SKU','CH2_PRODUCT CODE','CH2_QTY SUPPLIED','CH2_DISC %','CH2_GST','POS_GST_TAX_PC','POS_WSP_EXCGST','CH2_NORMAL W/S','POS_LAST_PRICE','CH2_UNIT PRICE EX GST','POS_RRP_INCGST','CH2_RRP','POS_TOTAL','CH2_TOTAL','POS_CH2_WHOLESALE_EX_GST','CH2_WHOLESALE_VARIANCE','CH2_WHOLESALE_CHECK','DIS_EXPECTED %','DIS_MATCH_TYPE','DIS_MATCH_KEY','DIS_MATCH_RULE','DIS_CH2_DISC_CHECK','DIS_EXPECTED_UNIT_EXGST','DIS_UNIT_VARIANCE','DIS_UNIT_CHECK','DIS_MISSED_TOTAL'
  ];
  const TOTAL_HEADERS=new Set(['Tax Amount','Invoice Total','CH2_QTY SUPPLIED','POS_WSP_EXCGST','CH2_NORMAL W/S','POS_LAST_PRICE','CH2_UNIT PRICE EX GST','POS_RRP_INCGST','CH2_RRP','POS_TOTAL','CH2_TOTAL','POS_CH2_WHOLESALE_EX_GST','CH2_WHOLESALE_VARIANCE','DIS_EXPECTED_UNIT_EXGST','DIS_UNIT_VARIANCE','DIS_MISSED_TOTAL']);

  function clean(v){return v==null?'':String(v).trim();}
  function digits(v){return clean(v).replace(/\.0+$/,'').replace(/\D+/g,'');}
  function bc(v){return clean(v).replace(/\.0+$/,'').replace(/\D+/g,'');}
  function num(v){if(typeof v==='number'&&Number.isFinite(v))return v;let s=clean(v).replace(/[$,%]/g,'').replace(/,/g,'');if(!s)return null;if(/^\.\d+$/.test(s))s='0'+s;const n=Number(s);return Number.isFinite(n)?n:null;}
  function round(v,n=2){const x=num(v);if(x==null)return '';const p=10**n;return Math.round((x+Number.EPSILON)*p)/p;}
  function normText(v){return clean(v).toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
  function dateForFilename(v){const s=clean(v);let m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(m)return `${m[1]}.${m[2]}.${m[3].slice(-2)}`;m=s.match(/^(\d{2})[.-](\d{2})[.-](\d{4})$/);if(m)return `${m[1]}.${m[2]}.${m[3].slice(-2)}`;return new Date().toLocaleDateString('en-AU').split('/').map((x,i)=>i===2?x.slice(-2):x.padStart(2,'0')).join('.');}
  function safe(v,fallback='UNKNOWN'){let s=clean(v)||fallback;s=s.replace(/[^A-Za-z0-9._-]+/g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,'');return s||fallback;}
  function tokenDice(a,b){const A=[...new Set(normText(a).split(' ').filter(Boolean))],B=[...new Set(normText(b).split(' ').filter(Boolean))];if(!A.length||!B.length)return 0;const bs=new Set(B);let c=0;A.forEach(x=>{if(bs.has(x))c++;});return 2*c/(A.length+B.length)*100;}
  function levenshteinRatio(a,b){a=normText(a);b=normText(b);if(a===b)return a?100:0;if(!a||!b)return 0;if(a.length>b.length){const t=a;a=b;b=t;}let prev=Array.from({length:a.length+1},(_,i)=>i),cur=new Array(a.length+1);for(let j=1;j<=b.length;j++){cur[0]=j;for(let i=1;i<=a.length;i++)cur[i]=Math.min(cur[i-1]+1,prev[i]+1,prev[i-1]+(a[i-1]===b[j-1]?0:1));const t=prev;prev=cur;cur=t;}const d=prev[a.length],mx=Math.max(a.length,b.length);return mx?((mx-d)/mx)*100:100;}
  function descScore(a,b){return Math.max(tokenDice(a,b),levenshteinRatio(a,b));}
  function overlap(a,b){const A=new Set(normText(a).split(' ').filter(Boolean)),B=new Set(normText(b).split(' ').filter(Boolean));if(!A.size||!B.size)return 0;let c=0;A.forEach(x=>{if(B.has(x))c++;});return c/Math.max(1,Math.min(A.size,B.size));}

  function hasCore(rec){return rec&&['POS_MASTER_BARCODE','POS_PLU','POS_BRAND','POS_DESCR','POS_WSP_EXCGST','POS_LAST_PRICE','POS_RRP_INCGST'].some(k=>clean(rec[k]));}
  function matchMaster(inv,refs){
    const code=digits(inv.productCode), master=refs.master, sup=refs.supplier.ch2SupplierLookup.get(code)||{};
    let rec=master.byCode.get(code);
    if(rec&&hasCore(rec)) return {record:rec,status:'MATCHED',method:'CH2_CODE→MERGED_ALIGNED',confidence:'HIGH',fuzzy:''};
    const supBc=bc(sup.SUP_BARCODE); if(supBc){rec=master.byBarcode.get(supBc);if(rec&&hasCore(rec))return {record:rec,status:'MATCHED',method:'CH2_CODE→SUPPLIER_UPDATE→BARCODE→POS_DB',confidence:'HIGH',fuzzy:''};}
    const query=inv.description; if(query){let best=null;for(const cand of master.fuzzy){const ov=overlap(query,cand.POS_DESCR);if(ov<0.35)continue;const sc=descScore(query,cand.POS_DESCR);if(!best||sc>best.score)best={score:sc,record:cand};}if(best&&best.score>=88)return {record:best.record,status:'MATCHED',method:'FUZZY_DESCRIPTION→MERGED_ALIGNED',confidence:'MEDIUM',fuzzy:round(best.score,1)};if(best&&best.score>=72)return {record:best.record,status:'MATCHED - LOW CONFIDENCE',method:'FUZZY_DESCRIPTION→MERGED_ALIGNED',confidence:'LOW',fuzzy:round(best.score,1)};}
    return {record:{},status:'UNMATCHED',method:'NO MATCH',confidence:'',fuzzy:''};
  }

  function formatSupplier(raw,supplierMap,fallback){
    raw=clean(raw); fallback=fallback||{};
    if(/\(\d+\)\s*$/.test(raw))return raw;
    const n=digits(raw);if(n){const name=supplierMap.get(n)||'';return name?`${name} (${n})`:`(${n})`;}
    const fn=digits(fallback.POS_SUPPLIER_NUMBER), name=clean(fallback.POS_SUPPLIER_NAME)||(fn?supplierMap.get(fn)||'':'');
    if(name&&fn)return `${name} (${fn})`;if(name)return name;if(fn)return `(${fn})`;return raw;
  }
  function supplierNo(v){const s=clean(v);const m=s.match(/\((\d+)\)\s*$/);return m?m[1]:digits(s);}
  function brandMatches(posBrand,posDescr,ruleBrand,rulePrefix){const pb=normText(posBrand),pd=normText(posDescr),rb=normText(ruleBrand),rp=normText(rulePrefix);if(rb&&pb&&(pb===rb||pb.startsWith(rb)||rb.startsWith(pb)||pb.includes(rb)||rb.includes(pb)))return true;if(rp){if(pb&&pb.startsWith(rp))return true;if(pd&&(pd===rp||pd.startsWith(rp+' ')))return true;}return false;}
  function descrMatches(posDescr,ruleDescr){const p=normText(posDescr),r=normText(ruleDescr);if(!p||!r)return false;if(p===r)return true;if(r.length>=8&&p.includes(r))return true;if(p.length>=8&&r.includes(p))return true;return false;}
  function ruleLabel(rule){const p=[];if(clean(rule.POS_MASTER_BRAND))p.push(clean(rule.POS_MASTER_BRAND));if(clean(rule.POS_BRAND_PREFIX))p.push('PREFIX '+clean(rule.POS_BRAND_PREFIX));if(clean(rule.POS_SUPPLIER_NUMBER))p.push('SUP '+clean(rule.POS_SUPPLIER_NUMBER));if(clean(rule.POS_PLU))p.push('PLU '+clean(rule.POS_PLU));if(clean(rule.POS_MASTER_BARCODE))p.push('BC '+clean(rule.POS_MASTER_BARCODE));if(clean(rule.POS_DESCR))p.push(clean(rule.POS_DESCR));if(rule.POS_DISCOUNT!=null)p.push(`${Number(rule.POS_DISCOUNT).toFixed(2)}%`);if(clean(rule.POS_MEMBER))p.push('MEMBER '+clean(rule.POS_MEMBER));return p.join(' / ');}
  function matchRule(rule,row){
    const rs=supplierNo(row.POS_SUPPLIER), rb=bc(row.POS_MASTER_BARCODE), rp=digits(row.POS_PLU), rBrand=clean(row.POS_BRAND), rd=clean(row.POS_DESCR);
    const sup=digits(rule.POS_SUPPLIER_NUMBER), b=bc(rule.POS_MASTER_BARCODE), plu=digits(rule.POS_PLU), brand=clean(rule.POS_MASTER_BRAND), prefix=clean(rule.POS_BRAND_PREFIX), descr=clean(rule.POS_DESCR);
    if(rule.POS_DISCOUNT==null)return null;
    if(plu)return rp&&rp===plu?{specificity:100,type:'POS_PLU',key:`POS_PLU=${rp}`} : null;
    if(b)return rb&&rb===b?{specificity:90,type:'POS_MASTER_BARCODE',key:`POS_MASTER_BARCODE=${rb}`} : null;
    if(descr)return descrMatches(rd,descr)?{specificity:80,type:'POS_DESCR',key:`POS_DESCR=${descr}`} : null;
    const brandOk=(brand||prefix)?brandMatches(rBrand,rd,brand,prefix):false, supOk=!!(sup&&rs&&sup===rs);
    if((brand||prefix)&&sup)return brandOk&&supOk?{specificity:70,type:'POS_BRAND+POS_SUPPLIER',key:`POS_BRAND=${clean(brand||prefix)}; POS_SUPPLIER=${sup}`} : null;
    if(brand||prefix)return brandOk?{specificity:60,type:'POS_BRAND',key:`POS_BRAND=${clean(brand||prefix)}`} : null;
    if(sup)return supOk?{specificity:50,type:'POS_SUPPLIER',key:`POS_SUPPLIER=${sup}`} : null;
    return null;
  }
  function discountAudit(row,rules){
    if(!['POS_SUPPLIER','POS_MASTER_BARCODE','POS_PLU','POS_BRAND','POS_DESCR'].some(k=>clean(row[k])))return {'DIS_EXPECTED %':'','DIS_MATCH_TYPE':'NO POS DATA','DIS_MATCH_KEY':'','DIS_MATCH_RULE':'','DIS_CH2_DISC_CHECK':'NO CHECK - NO POS DATA','DIS_EXPECTED_UNIT_EXGST':'','DIS_UNIT_VARIANCE':'','DIS_UNIT_CHECK':'NO CHECK - NO POS DATA','DIS_MISSED_TOTAL':''};
    const c=[];for(const rule of rules||[]){const m=matchRule(rule,row);if(m)c.push({...m,rule});}c.sort((a,b)=>(Number(b.rule.POS_DISCOUNT||0)-Number(a.rule.POS_DISCOUNT||0))||(b.specificity-a.specificity));const best=c[0];
    if(!best)return {'DIS_EXPECTED %':'','DIS_MATCH_TYPE':'NO RULE','DIS_MATCH_KEY':'','DIS_MATCH_RULE':'','DIS_CH2_DISC_CHECK':'NO RULE','DIS_EXPECTED_UNIT_EXGST':'','DIS_UNIT_VARIANCE':'','DIS_UNIT_CHECK':'NO RULE','DIS_MISSED_TOTAL':''};
    const expected=Number(best.rule.POS_DISCOUNT||0), actual=num(row['CH2_DISC %']);let discCheck=actual==null?'MISSING IN CH2_DISC %':(Math.abs(actual-expected)<=PRICE_TOL?'OK':`MISMATCH CH2=${actual.toFixed(2)}`);
    const nws=num(row['CH2_NORMAL W/S']), unit=num(row['CH2_UNIT PRICE EX GST']), qty=num(row['CH2_QTY SUPPLIED']);let expectedUnit='',variance='',unitCheck='',missed='';
    if(nws==null)unitCheck='NO CHECK - MISSING CH2_NORMAL W/S';else if(unit==null){expectedUnit=round(nws*(1-expected/100),2);unitCheck='NO CHECK - MISSING CH2_UNIT PRICE EX GST';}else{const precise=nws*(1-expected/100);expectedUnit=round(precise,2);variance=round(unit-precise,2);unitCheck=Math.abs(Number(variance))<=PRICE_TOL?'OK':'MISMATCH';if(qty!=null)missed=round((Number(variance)>PRICE_TOL?Number(variance):0)*qty,2);}
    return {'DIS_EXPECTED %':round(expected,2),'DIS_MATCH_TYPE':best.type,'DIS_MATCH_KEY':best.key,'DIS_MATCH_RULE':ruleLabel(best.rule),'DIS_CH2_DISC_CHECK':discCheck,'DIS_EXPECTED_UNIT_EXGST':expectedUnit,'DIS_UNIT_VARIANCE':variance,'DIS_UNIT_CHECK':unitCheck,'DIS_MISSED_TOTAL':missed};
  }

  function orderDate(inv){return clean(inv.orderDate||inv.invoiceDate||'');}
  function lineCount(v){const n=num(v);if(n==null)return clean(v);return Number.isInteger(n)?String(n):String(n).replace(/0+$/,'').replace(/\.$/,'');}
  function buildRowsForDocument(doc,refs){
    const invoiceRows=(doc.rows||[]).slice().sort((a,b)=>(num(a.invoiceLine)||0)-(num(b.invoiceLine)||0));
    const tax=round(invoiceRows.reduce((a,r)=>a+(num(r.gstAmount)||0),0),2), total=round(invoiceRows.reduce((a,r)=>a+(num(r.totalIncGst)||0),0),2);
    const out=[];
    invoiceRows.forEach((inv,i)=>{
      const code=digits(inv.productCode), fallback=refs.supplier.ch2SupplierLookup.get(code)||{}, match=matchMaster(inv,refs), rec=match.record||{};
      const posSupplier=formatSupplier(rec.POS_SUPPLIER_RAW,refs.supplier.supplierMap,fallback);
      const q=num(inv.qtySupplied), gstPct=(num(inv.gstAmount)||0)>0?10:0;
      const posTotal=(num(rec.POS_LAST_PRICE)!=null&&q!=null)?round(Number(rec.POS_LAST_PRICE)*q*(1+(Number(rec.POS_GST_TAX_PC||0)/100)),2):'';
      const ch2Ws=round(inv.normalWholesale,2), rawWs=round(rec.POS_CH2_WHOLESALE_EX_GST,2);let wVar='',wCheck='NO CHECK - MISSING DATA';
      if(ch2Ws!==''&&rawWs!==''){wVar=round(Number(ch2Ws)-Number(rawWs),2);wCheck=Math.abs(Number(wVar))<=PRICE_TOL?'OK':'MISMATCH';}
      const row={
        'INDEX':i+1,'Order Date':orderDate(inv),'Invoice Date':clean(inv.invoiceDate),'Invoice Number':clean(inv.invoiceNumber),'Your Ref':clean(inv.customerPo),'Line Count':lineCount(inv.invoiceLine),'Tax Amount':i===0?tax:'','Invoice Total':i===0?total:'',
        'POS_SUPPLIER':posSupplier,'MATCH_STATUS':match.status,'MATCH_METHOD':match.method,'MATCH_CONFIDENCE':match.confidence,'FUZZY_SCORE':match.fuzzy,'POS_MASTER_BARCODE':clean(rec.POS_MASTER_BARCODE),'POS_PLU':clean(rec.POS_PLU),'POS_BRAND':clean(rec.POS_BRAND),'POS_DESCR':clean(rec.POS_DESCR),
        'CH2_SUPPLIER SKU':clean(inv.supplierSku),'CH2_PRODUCT CODE':clean(inv.productCode),'CH2_QTY SUPPLIED':round(inv.qtySupplied,3),'CH2_DISC %':round(inv.discountPct,2),'CH2_GST':gstPct,'POS_GST_TAX_PC':round(rec.POS_GST_TAX_PC,2),'POS_WSP_EXCGST':round(rec.POS_WSP_EXCGST,2),'CH2_NORMAL W/S':ch2Ws,'POS_LAST_PRICE':round(rec.POS_LAST_PRICE,2),'CH2_UNIT PRICE EX GST':round(inv.unitPriceExGst,2),'POS_RRP_INCGST':round(rec.POS_RRP_INCGST,2),'CH2_RRP':round(inv.rrp,2),'POS_TOTAL':posTotal,'CH2_TOTAL':round(inv.totalIncGst,2),'POS_CH2_WHOLESALE_EX_GST':rawWs,'CH2_WHOLESALE_VARIANCE':wVar,'CH2_WHOLESALE_CHECK':wCheck
      };
      Object.assign(row,discountAudit(row,refs.supplier.discountRules));out.push(row);
    });
    const first=out[0]||{};const filename=`CH2_PO_${safe(first['Your Ref']||first['Invoice Number'],'NO_PO')}_INV_${safe(first['Invoice Number']||doc.sourceFile,'NO_INV')}_${dateForFilename(first['Invoice Date'])}_PRODUCT_EXTRACT_LINKED_POS.xlsx`;
    return {rows:out,filename,invoiceNumber:first['Invoice Number']||'',customerPo:first['Your Ref']||'',tax,total,sourceFile:doc.sourceFile};
  }
  function buildReferenceOutputs(invoiceDocs,refs){return (invoiceDocs||[]).filter(d=>d.type!=='CREDIT_NOTE'&&(d.rows||[]).length).map(d=>buildRowsForDocument(d,refs));}

  PHF.linkedPos={HEADERS,TOTAL_HEADERS,buildReferenceOutputs,buildRowsForDocument};
})(window);
