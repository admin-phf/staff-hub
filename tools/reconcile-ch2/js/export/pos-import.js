(function(global){
  'use strict';
  const PHF=global.PHFReconcile=global.PHFReconcile||{};

  // Known-good legacy Oborne/POS invoice-import contract supplied by PHF.
  // This module intentionally keeps the import contract separate from the richer
  // 43-column reconciliation workbook so changes to one cannot silently break the other.
  const CONTRACT=Object.freeze({
    headers:Object.freeze(['Date','Name','Document Number','Item','Description','Quantity','W/S ex GST','Discount','GST','Gross Amt','Barcode','Shipping Address']),
    name:'JPRAHRAN Prahran Health Foods',
    shippingAddress:'Prahran Health Foods \r\nLevel 1, 201 Commercial Rd \r\nPRAHRAN VIC 3181 \r\nAustralia'
  });

  function clean(v){return v==null?'':String(v).replace(/\u00a0/g,' ').trim();}
  function n(v){if(typeof v==='number'&&Number.isFinite(v))return v;let s=clean(v).replace(/[$,%]/g,'').replace(/,/g,'');if(!s)return null;if(/^\.\d+$/.test(s))s='0'+s;const x=Number(s);return Number.isFinite(x)?x:null;}
  function round(v,dp=2){const x=n(v);if(x==null)return 0;const p=10**dp;return Math.round((x+Number.EPSILON)*p)/p;}
  function digits(v){let s=clean(v);if(/^\d+\.0+$/.test(s))s=s.split('.')[0];return s.replace(/\D+/g,'');}
  function code(v){return clean(v).replace(/\.0+$/,'');}
  function normCode(v){return code(v).toUpperCase();}
  function normRef(v){return clean(v).toUpperCase().replace(/[−–—]/g,'-').replace(/\s+/g,'');}
  function sameRef(a,b){return !!normRef(a)&&normRef(a)===normRef(b);}
  function safePart(v){return clean(v).replace(/[^A-Za-z0-9._-]+/g,'_').replace(/^_+|_+$/g,'')||'CURRENT';}
  function formatDate(v){
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return `${String(v.getDate()).padStart(2,'0')}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getFullYear()).slice(-2)}`;
    const s=clean(v);if(!s)return '';
    let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);if(m)return `${String(m[3]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}-${m[1].slice(-2)}`;
    m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);if(m)return `${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}-${String(m[3]).slice(-2)}`;
    return s;
  }
  function formatQty(v){const x=n(v);if(x==null)return '0';if(Math.abs(x-Math.round(x))<1e-9)return String(Math.round(x));return String(round(x,3)).replace(/0+$/,'').replace(/\.$/,'');}
  function grouped2(v){const x=round(v,2);return x.toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:true});}
  function workingMoney(v){return `${grouped2(v)} `;}
  function grossMoney(v){const x=round(v,2);if(Math.abs(x)<0.00001)return '0';return x.toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');}
  function totalGrossMoney(v){return grouped2(v);}
  function pctText(v){const x=n(v);if(x==null)return '';const s=String(round(x,4)).replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1');return `less ${s}%`;}
  function serializeField(v){
    const s=v==null?'':String(v);
    // The known-working export quotes multiline fields and also values containing
    // commas (e.g. 3,547.20), even though the delimiter is a tab.
    if(/[\t\r\n,"]/.test(s))return `"${s.replace(/"/g,'""')}"`;
    return s;
  }
  function makeTsv(rows){return rows.map(row=>row.map(serializeField).join('\t')).join('\r\n')+'\r\n';}
  function parseTsv(text){
    const out=[],row=[];let field='',quoted=false;
    for(let i=0;i<text.length;i++){const ch=text[i];
      if(ch==='\"'){if(quoted&&text[i+1]==='\"'){field+='\"';i++;}else quoted=!quoted;continue;}
      if(ch==='\t'&&!quoted){row.push(field);field='';continue;}
      if(ch==='\r'&&text[i+1]==='\n'&&!quoted){row.push(field);field='';out.push(row.splice(0,row.length));i++;continue;}
      field+=ch;
    }
    if(field||row.length){row.push(field);out.push(row.slice());}
    return out;
  }
  function sum(rows,key){return round((rows||[]).reduce((a,r)=>a+(n(r&&r[key])||0),0),2);}
  function sumQty(rows){return round((rows||[]).reduce((a,r)=>a+(n(r&&r.qtySupplied)||0),0),3);}
  function weighted(rows,key){let num=0,den=0;for(const r of rows||[]){const v=n(r&&r[key]),w=n(r&&r.qtySupplied);if(v!=null&&w!=null&&w>0){num+=v*w;den+=w;}}return den?num/den:null;}
  function uniqueNumeric(rows,key,tol=0.01){const vals=[];for(const r of rows||[]){const v=n(r&&r[key]);if(v==null)continue;if(!vals.some(x=>Math.abs(x-v)<=tol))vals.push(v);}return vals;}
  function detailBySourceRow(reconciliation){const map=new Map();for(const d of (reconciliation&&reconciliation.detail)||[]){const k=String(d&&d.sourceRow!=null?d.sourceRow:'');if(k&&!map.has(k))map.set(k,d);}return map;}
  function sortedPos(posOrder){return ((posOrder&&posOrder.rows)||[]).slice().sort((a,b)=>{const ar=Number(a&&a.sourceRow),br=Number(b&&b.sourceRow);if(Number.isFinite(ar)&&Number.isFinite(br)&&ar!==br)return ar-br;return Number(a&&a.posIndex||0)-Number(b&&b.posIndex||0);});}
  function docMeta(doc){const first=(doc&&doc.rows||[])[0]||{},m=(doc&&doc.meta)||{};return {number:clean(first.invoiceNumber||m.invoiceNumber),date:clean(first.invoiceDate||m.invoiceDate||first.orderDate||m.orderDate),customerPo:clean(first.customerPo||m.customerPo),sourceFile:clean(doc&&doc.sourceFile)};}
  function activeDocs(invoiceDocs){return (invoiceDocs||[]).filter(d=>d&&d.type!=='CREDIT_NOTE');}
  function invoiceNo(row){return clean(row&&row.invoiceNumber);}
  function invoiceRowsFor(detail,group){return ((detail&&detail.invoiceRows)||[]).filter(r=>invoiceNo(r)===group.number||(group.sourceFiles.has(clean(r&&r.sourceFile))&&!invoiceNo(r)));}

  function masterRecordForPos(pos,refs){
    const master=refs&&refs.master;if(!master)return null;
    const b=digits(pos&&pos.barcode);if(b&&master.byBarcode&&master.byBarcode.has(b))return master.byBarcode.get(b);
    const p=digits(pos&&pos.plu);if(p&&master.byPlu&&master.byPlu.has(p))return master.byPlu.get(p);
    return null;
  }
  function canonicalIdentity(pos,refs){
    const rec=masterRecordForPos(pos,refs)||{};
    // IMPORTANT: the uploaded POS order is the authority for the identity the
    // legacy Apply Invoice screen is matching against.  A blank POS Sub Id is
    // valid and must stay blank — never replace it with a CH2 product code or
    // a newer master Sub Id, as that can make the invoice code differ from the
    // original order.  The master remains an independent cross-check/enrichment
    // source and can safely fill barcode/description only when the order lacks them.
    const orderItem=code(pos&&pos.subId),masterItem=code(rec.POS_SUB_ID);
    return {
      item:orderItem,
      orderItem,
      masterItem,
      barcode:digits(pos&&pos.barcode)||digits(rec.POS_MASTER_BARCODE),
      plu:code(pos&&pos.plu)||code(rec.POS_PLU),
      description:clean(pos&&pos.description)||clean(rec.POS_DESCR),
      brand:clean(rec.POS_BRAND),
      record:rec
    };
  }
  function expectedDiscount(pos,refs,normalWholesale){
    if(!PHF.linkedPos||typeof PHF.linkedPos.expectedPriceForPos!=='function')return {discountPct:null,match:null};
    const base=n(normalWholesale)!=null?n(normalWholesale):(n(pos&&pos.normalWholesale)!=null?n(pos.normalWholesale):1);
    const x=PHF.linkedPos.expectedPriceForPos(pos,refs,base);
    return {discountPct:x&&x.discountPct!=null?n(x.discountPct):null,match:x&&x.match||null};
  }
  function masterCandidatesForInvoiceRow(inv,refs){
    const master=refs&&refs.master,pc=digits(inv&&inv.productCode);if(!master||!pc)return [];
    if(master.byCodeAll&&master.byCodeAll.has(pc))return master.byCodeAll.get(pc).slice();
    if(master.byCode&&master.byCode.has(pc))return [master.byCode.get(pc)];
    return [];
  }
  function candidateMatchesIdentity(rec,id){
    if(!rec||!id)return false;
    // Match a CH2/master candidate back to the exact uploaded order row using
    // stable POS anchors. Barcode is strongest, followed by POS PLU, then the
    // order Sub Id when one exists.  Do not require every master field to match:
    // the master may have been updated after the order was created.
    const rb=digits(rec.POS_MASTER_BARCODE),ib=digits(id.barcode);if(rb&&ib&&rb===ib)return true;
    const rp=normCode(rec.POS_PLU),ip=normCode(id.plu);if(rp&&ip&&rp===ip)return true;
    const ri=normCode(rec.POS_SUB_ID),ii=normCode(id.orderItem||id.item);if(ri&&ii&&ri===ii)return true;
    return false;
  }
  function lineLabel(pos,index){return `POS row ${index+1}${clean(pos&&pos.description)?` (${clean(pos.description)})`:''}`;}
  function pushIssue(list,msg,limit=40){if(list.length<limit)list.push(msg);}

  function groupDocuments(invoiceDocs,posOrder){
    const docs=activeDocs(invoiceDocs),groups=[],byNo=new Map(),errors=[];
    for(const doc of docs){
      const m=docMeta(doc);
      if(!m.number){pushIssue(errors,`${m.sourceFile||'Supplier invoice'}: invoice number is missing.`);continue;}
      if(!m.date){pushIssue(errors,`Invoice ${m.number}: invoice date is missing.`);continue;}
      const key=m.number;
      if(!byNo.has(key)){
        const g={number:key,date:m.date,customerPo:m.customerPo,sourceFiles:new Set(),docs:[]};byNo.set(key,g);groups.push(g);
      }
      const g=byNo.get(key);g.docs.push(doc);if(m.sourceFile)g.sourceFiles.add(m.sourceFile);
      if(m.customerPo&&!g.customerPo)g.customerPo=m.customerPo;
    }
    for(const g of groups){
      const files=[...g.sourceFiles];if(g.docs.length>1)pushIssue(errors,`Invoice ${g.number} was uploaded more than once${files.length?` (${files.join(', ')})`:''}. Remove the duplicate copy before creating the POS import file.`);
      if(clean(posOrder&&posOrder.orderNumber)&&g.customerPo&&!sameRef(g.customerPo,posOrder.orderNumber))pushIssue(errors,`Invoice ${g.number}: Customer PO ${g.customerPo} does not match uploaded POS order ${posOrder.orderNumber}.`);
    }
    if(!groups.length&&!errors.length)pushIssue(errors,'No supplier invoice is available for POS import.');
    return {groups,errors};
  }

  function buildInvoicePayload(group,refs,posOrder,reconciliation){
    const errors=[],warnings=[],details=detailBySourceRow(reconciliation),posRows=sortedPos(posOrder),records=[];
    if(((reconciliation&&reconciliation.unmatchedInvoice)||[]).some(r=>invoiceNo(r)===group.number||group.sourceFiles.has(clean(r&&r.sourceFile)))){
      const count=((reconciliation&&reconciliation.unmatchedInvoice)||[]).filter(r=>invoiceNo(r)===group.number||group.sourceFiles.has(clean(r&&r.sourceFile))).length;
      pushIssue(errors,`Invoice ${group.number}: ${count} invoice line${count===1?' is':'s are'} not matched to the POS order. POS import is blocked until every billed line has a confirmed POS row.`);
    }

    posRows.forEach((pos,index)=>{
      const d=details.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||(reconciliation&&reconciliation.detail||[])[index]||{},invRows=invoiceRowsFor(d,group),id=canonicalIdentity(pos,refs),supplied=sumQty(invRows),ex=sum(invRows,'extendedExGst'),gst=sum(invRows,'gstAmount'),gross=sum(invRows,'totalIncGst');
      const expected=expectedDiscount(pos,refs,d.invoiceNormalWholesale),actualDiscount=weighted(invRows,'discountPct'),discount=actualDiscount!=null?actualDiscount:expected.discountPct;
      const discountValues=uniqueNumeric(invRows,'discountPct',0.02);
      if(invRows.length&&actualDiscount==null&&expected.discountPct!=null)warnings.push(`${lineLabel(pos,index)}: invoice discount was not printed/readable; POS import Discount uses the matched supplier rule (${round(expected.discountPct,2)}%).`);

      // A blank Item/Sub Id is legitimate when the original POS order itself has
      // a blank Sub Id.  Preserve that blank exactly and let Barcode identify the
      // row, matching the POS order rather than inventing a supplier/CH2 code.
      if(!id.item&&id.barcode)warnings.push(`${lineLabel(pos,index)}: POS order Sub Id is blank; POS import Item is intentionally blank and Barcode ${id.barcode} is retained for matching.`);
      if(id.orderItem&&id.masterItem&&normCode(id.orderItem)!==normCode(id.masterItem))warnings.push(`${lineLabel(pos,index)}: current master Sub Id ${id.masterItem} differs from the order Sub Id ${id.orderItem}; the uploaded order value is preserved for POS import.`);
      if(!id.item&&!id.barcode&&supplied>0)pushIssue(errors,`${lineLabel(pos,index)}: both Item/Sub Id and Barcode are blank for a supplied line. POS import cannot identify this product safely.`);
      if(!id.barcode&&supplied>0)pushIssue(errors,`${lineLabel(pos,index)}: Barcode is blank for a supplied line. Load/refresh the POS master or correct the product mapping.`);
      if(!id.description)pushIssue(errors,`${lineLabel(pos,index)}: Description is blank.`);
      if(discount==null&&supplied>0)pushIssue(errors,`${lineLabel(pos,index)}: no invoice discount and no supplier discount rule could be resolved.`);
      if(invRows.length&&clean(d.matchConfidence).toUpperCase()==='LOW')pushIssue(errors,`${lineLabel(pos,index)}: invoice match confidence is LOW; review the product match before POS import.`);
      if(discountValues.length>1)pushIssue(errors,`${lineLabel(pos,index)}: invoice ${group.number} contains multiple discount rates for the same POS item (${discountValues.map(x=>`${x}%`).join(', ')}); one legacy import row cannot represent both safely.`);

      // Use the merged POS/master as an independent identity cross-check for each billed CH2 row.
      for(const inv of invRows){
        const pc=digits(inv&&inv.productCode),candidates=masterCandidatesForInvoiceRow(inv,refs);
        if(!pc){pushIssue(errors,`${lineLabel(pos,index)}: a supplied invoice line has no CH2 product code.`);continue;}
        if(!candidates.length){pushIssue(errors,`${lineLabel(pos,index)}: CH2 product ${pc} is not present in the loaded POS/master crosswalk.`);continue;}
        if(!candidates.some(rec=>candidateMatchesIdentity(rec,id))){
          const examples=candidates.slice(0,3).map(rec=>[code(rec.POS_SUB_ID),digits(rec.POS_MASTER_BARCODE),code(rec.POS_PLU)].filter(Boolean).join('/')).filter(Boolean).join(', ');
          pushIssue(errors,`${lineLabel(pos,index)}: CH2 product ${pc} maps to a different POS identity in the master${examples?` (${examples})`:''}.`);
        }
      }

      const arithmeticDiff=round((ex+gst)-gross,2);
      if(Math.abs(arithmeticDiff)>0.05)pushIssue(errors,`${lineLabel(pos,index)}: line totals do not balance for invoice ${group.number} (${ex.toFixed(2)} + GST ${gst.toFixed(2)} ≠ ${gross.toFixed(2)}).`);

      records.push({
        date:formatDate(group.date),name:CONTRACT.name,documentNumber:group.number,item:id.item,description:id.description,
        quantity:supplied,wsExGst:ex,discountPct:discount,gst,gross,barcode:id.barcode,shippingAddress:CONTRACT.shippingAddress,
        pos,index,invRows,identity:id
      });
    });

    const totalQty=round(records.reduce((a,r)=>a+(n(r.quantity)||0),0),3),totalWs=round(records.reduce((a,r)=>a+(n(r.wsExGst)||0),0),2),totalGst=round(records.reduce((a,r)=>a+(n(r.gst)||0),0),2),totalGross=round(records.reduce((a,r)=>a+(n(r.gross)||0),0),2);
    if(Math.abs(round(totalWs+totalGst-totalGross,2))>0.05)pushIssue(errors,`Invoice ${group.number}: POS import totals do not balance (${totalWs.toFixed(2)} + GST ${totalGst.toFixed(2)} ≠ ${totalGross.toFixed(2)}).`);

    const invoiceRows=[];for(const d of group.docs)invoiceRows.push(...(d.rows||[]));
    const invWs=sum(invoiceRows,'extendedExGst'),invGst=sum(invoiceRows,'gstAmount'),invGross=sum(invoiceRows,'totalIncGst'),invQty=sumQty(invoiceRows);
    if(Math.abs(totalWs-invWs)>0.05||Math.abs(totalGst-invGst)>0.05||Math.abs(totalGross-invGross)>0.05||Math.abs(totalQty-invQty)>0.001){
      pushIssue(errors,`Invoice ${group.number}: generated POS import totals (${totalQty} units / ${totalWs.toFixed(2)} / GST ${totalGst.toFixed(2)} / ${totalGross.toFixed(2)}) do not equal the parsed supplier invoice (${invQty} units / ${invWs.toFixed(2)} / GST ${invGst.toFixed(2)} / ${invGross.toFixed(2)}).`);
    }

    const rows=[CONTRACT.headers.slice()];
    for(const r of records){
      rows.push([r.date,r.name,r.documentNumber,r.item,r.description,formatQty(r.quantity),workingMoney(r.wsExGst),pctText(r.discountPct),workingMoney(r.gst),grossMoney(r.gross),r.barcode,r.shippingAddress]);
    }
    rows.push(['Overall Total','','','','',formatQty(totalQty),workingMoney(totalWs),'',workingMoney(totalGst),totalGrossMoney(totalGross),'','']);
    const text=makeTsv(rows);
    return {group,rows,records,text,totals:{quantity:totalQty,wsExGst:totalWs,gst:totalGst,gross:totalGross},errors,warnings};
  }

  function validatePayload(payload){
    const errors=[...(payload&&payload.errors||[])],rows=(payload&&payload.rows)||[];
    if(rows.length<2)pushIssue(errors,'POS import contains no product rows.');
    const h=rows[0]||[];if(h.length!==CONTRACT.headers.length||!CONTRACT.headers.every((x,i)=>h[i]===x))pushIssue(errors,'POS import header does not exactly match the known-working 12-column contract.');
    for(let i=1;i<rows.length;i++)if((rows[i]||[]).length!==12){pushIssue(errors,`Generated POS import logical row ${i+1} has ${(rows[i]||[]).length} columns instead of 12.`);break;}
    const text=payload&&payload.text||'';
    if(/^\uFEFF/.test(text))pushIssue(errors,'POS import unexpectedly contains a UTF-8 BOM.');
    if(/(^|[^\r])\n/.test(text))pushIssue(errors,'POS import contains LF-only line endings; CRLF is required.');
    if(text&&!text.endsWith('\r\n'))pushIssue(errors,'POS import does not end with CRLF.');
    const parsed=parseTsv(text);
    if(parsed.length!==rows.length)pushIssue(errors,`Serialized POS import contains ${parsed.length} logical rows; ${rows.length} were expected.`);
    if(parsed.some(r=>r.length!==12))pushIssue(errors,'Serialized POS import contains a logical row that does not have exactly 12 tab-delimited fields.');
    if(parsed.length&&!CONTRACT.headers.every((x,i)=>parsed[0][i]===x))pushIssue(errors,'Serialized POS import header changed after quoting/line-ending conversion.');
    if(parsed.length>2){for(let i=1;i<parsed.length-1;i++){if(parsed[i][1]!==CONTRACT.name){pushIssue(errors,`Serialized row ${i+1} has an unexpected Name value.`);break;}if(parsed[i][11]!==CONTRACT.shippingAddress){pushIssue(errors,`Serialized row ${i+1} has an unexpected Shipping Address value.`);break;}if(parsed[i][2]!==payload.group.number){pushIssue(errors,`Serialized row ${i+1} has Document Number ${parsed[i][2]||'(blank)'} instead of invoice ${payload.group.number}.`);break;}}}
    const last=rows[rows.length-1]||[];if(last[0]!=='Overall Total')pushIssue(errors,'POS import is missing the Overall Total row.');
    return {ok:errors.length===0,errors,warnings:[...(payload&&payload.warnings||[])]};
  }

  function buildLegacyFiles(invoiceDocs,refs,posOrder,reconciliation){
    const grouped=groupDocuments(invoiceDocs,posOrder);if(grouped.errors.length)return {ok:false,errors:grouped.errors,warnings:[],files:[]};
    const files=[],errors=[],warnings=[];
    for(const group of grouped.groups){
      const payload=buildInvoicePayload(group,refs,posOrder,reconciliation),validation=validatePayload(payload);
      errors.push(...validation.errors);warnings.push(...validation.warnings);
      files.push({filename:`CH2_INVOICE_{${safePart(group.number)}}_(${safePart(posOrder&&posOrder.orderNumber||reconciliation&&reconciliation.orderNumber)}).TXT`,...payload,validation});
    }
    return {ok:errors.length===0,errors,warnings,files};
  }

  function errorMessage(errors){const list=(errors||[]),shown=list.slice(0,12),rest=Math.max(0,list.length-shown.length);return `POS import blocked — ${list.length} validation issue${list.length===1?'':'s'}:\n• ${shown.join('\n• ')}${rest?`\n• …and ${rest} more.`:''}`;}
  function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}

  async function exportLegacyPosImport(invoiceDocs,refs,posOrder,reconciliation){
    const built=buildLegacyFiles(invoiceDocs,refs,posOrder,reconciliation);if(!built.ok)throw new Error(errorMessage(built.errors));
    if(built.files.length===1){const f=built.files[0];downloadBlob(new Blob([f.text],{type:'text/plain;charset=utf-8'}),f.filename);return {filename:f.filename,files:1,rows:f.records.length,columns:12,validation:f.validation,warnings:built.warnings};}
    if(!global.JSZip)throw new Error('ZIP export library did not load. Refresh the page and try again.');
    const zip=new global.JSZip();for(const f of built.files)zip.file(f.filename,f.text);
    const zipName=`CH2_INVOICE_FILES_(${safePart(posOrder&&posOrder.orderNumber||reconciliation&&reconciliation.orderNumber)}).zip`,blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'});downloadBlob(blob,zipName);
    return {filename:zipName,files:built.files.length,rows:built.files.reduce((a,f)=>a+f.records.length,0),columns:12,warnings:built.warnings};
  }

  PHF.posImport={CONTRACT,buildLegacyFiles,validatePayload,exportLegacyPosImport,makeTsv,parseTsv,formatDate};
})(window);
