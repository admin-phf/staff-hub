(function(global){
  'use strict';
  const PHF = global.PHFReconcile = global.PHFReconcile || {};

  const FOOTER_MARKERS=['NON STOCK LINES','COLD CHAIN LINES','NUTRITIONAL ITEMS','COSMETICS AND GARMENTS','COSTMETICS AND GARMENTS','TERMS AND CONDITIONS'];

  function clean(v){
    return v==null?'':String(v)
      .replace(/[\u2212\u2010\u2011\u2012\u2013\u2014]/g,'-')
      .replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  }
  function num(v){
    let s=clean(v).replace(/[$,%]/g,'').replace(/,/g,'');
    if(!s) return null;
    if(/^\.\d+$/.test(s)) s='0'+s;
    const neg=s.endsWith('-') || (s.startsWith('(')&&s.endsWith(')'));
    s=s.replace(/[()]/g,'').replace(/-$/,'');
    const n=Number(s); return Number.isFinite(n)?(neg?-n:n):null;
  }
  function isQty(v){return /^\d+(?:\.\d+)?$/.test(clean(v));}
  function isDisc(v){return /^\d+(?:\.\d+)?%$/.test(clean(v));}
  function isMoney(v){return /^-?(?:(?:\d{1,3}(?:,\d{3})*|\d+)?\.\d{2,4})-?$/.test(clean(v).replace('$',''));}
  function isCode(v){return /^\d{6,8}$/.test(clean(v));}
  function isLine(v){return /^\d+\.\d{3}$/.test(clean(v));}
  function looksSku(v){
    const s=clean(v).toUpperCase();
    return s.length>=4 && s.length<=60 && !s.includes(' ') && /^[A-Z0-9][A-Z0-9._/+\-]*-[A-Z0-9._/+\-]+$/.test(s);
  }
  function isFooter(v){const s=clean(v).toUpperCase(); return FOOTER_MARKERS.some(x=>s.includes(x));}
  function parseRrpWs(text){
    const s=clean(text); let rrp=null, normalWs=null;
    let m=s.match(/\bRRP\s*:?\s*\$?([\d,.]+)/i); if(m) rrp=num(m[1]);
    m=s.match(/\b(?:NORMAL\s+W\s*\/?\s*S|NORMAL\s+WS|W\s*\/?\s*S)\s*:?\s*\$?([\d,.]+)/i); if(m) normalWs=num(m[1]);
    return {rrp,normalWs};
  }
  function splitParts(items){
    const out=[];
    items.forEach((item,itemIndex)=>{
      const s=clean(item);
      if(!s) return;
      s.split(/\s+/).forEach(part=>out.push({part,itemIndex,raw:s}));
    });
    return out;
  }
  function priceCandidate(parts){
    let best=null;
    for(let qi=0; qi<parts.length; qi++){
      if(!isQty(parts[qi].part)) continue;
      const qty=num(parts[qi].part); let j=qi+1, disc=0;
      if(j<parts.length && isDisc(parts[j].part)){disc=num(parts[j].part)??0;j++;}
      const nums=[];
      while(j<parts.length && nums.length<4 && isMoney(parts[j].part)){nums.push(num(parts[j].part));j++;}
      const possibilities=[];
      if(nums.length>=4) possibilities.push([nums[0],nums[1],nums[2],nums[3]]);
      if(nums.length>=3) possibilities.push([nums[0],nums[1],0,nums[2]]);
      for(const [unit,extended,gst,total] of possibilities){
        if([qty,unit,extended,gst,total].some(x=>x==null)) continue;
        const ed=Math.abs(Math.round(qty*unit*100)/100-Math.round(extended*100)/100);
        const td=Math.abs(Math.round((extended+gst)*100)/100-Math.round(total*100)/100);
        if(ed<=0.18 && td<=0.051){
          const cand={qty,discPercent:disc,unitPriceExGst:unit,extendedExGst:extended,gstAmount:gst,totalIncGst:total,partIndex:qi,itemIndex:parts[qi].itemIndex};
          if(!best || qi>best.partIndex) best=cand;
        }
      }
    }
    return best;
  }
  function identifyStarts(items){
    const starts=[];
    for(let i=0;i<items.length-2;i++){
      const a=clean(items[i]), b=clean(items[i+1]), c=clean(items[i+2]);
      if(isCode(a) && isLine(b) && looksSku(c)){
        starts.push({itemIndex:i,code:a,line:b,sku:c,descIndex:i-1});
        continue;
      }
      if(isLine(a) && isCode(b)){
        // Some PDF generators emit Line before Product. Supplier SKU may follow description.
        let skuIndex=-1;
        for(let k=i+2;k<Math.min(items.length,i+8);k++) if(looksSku(items[k])){skuIndex=k;break;}
        if(skuIndex>=0) starts.push({itemIndex:i,code:b,line:a,sku:clean(items[skuIndex]),descIndex:i+2,skuIndex});
      }
    }
    return starts.filter((x,idx,arr)=>idx===0 || x.itemIndex!==arr[idx-1].itemIndex);
  }
  function parseBlocks(items,pageNo,sourceFile,meta){
    const starts=identifyStarts(items), rows=[], skipped=[];
    for(let si=0;si<starts.length;si++){
      const s=starts[si]; const end=si+1<starts.length?starts[si+1].itemIndex:items.length;
      const block=items.slice(s.itemIndex,end).map(clean).filter(Boolean);
      const joined=block.join(' '); const {rrp,normalWs}=parseRrpWs(joined);
      const useful=[];
      for(const x of block){
        if(isFooter(x)) break;
        if(/RRP/i.test(x) || /NORMAL\s+W/i.test(x) || clean(x)==='.00') continue;
        useful.push(x);
      }
      const parts=splitParts(useful);
      const candidate=priceCandidate(parts);
      if(!candidate){skipped.push({page:pageNo,line:s.line,productCode:s.code,reason:'NO_VALID_PRICE_PATTERN'});continue;}

      let description='';
      if(s.descIndex>=0 && s.descIndex<items.length) description=clean(items[s.descIndex]);
      // Add text before quantity that is not structural information.
      const extras=[];
      for(let bi=0;bi<useful.length;bi++){
        if(bi>=candidate.itemIndex) break;
        const x=clean(useful[bi]);
        if(!x || x===s.code || x===s.line || x===s.sku || looksSku(x)) continue;
        if(/^(EACH|EA|PKT|PK|CTN|BOX)\b/i.test(x)) continue;
        if(isCode(x)||isLine(x)||isQty(x)||isDisc(x)||isMoney(x)) continue;
        if(x!==description) extras.push(x);
      }
      description=clean([description,...extras].filter(Boolean).join(' '));
      rows.push({
        sourceFile, invoiceNumber:meta.invoiceNumber||'', invoiceDate:meta.invoiceDate||'', orderDate:meta.orderDate||meta.invoiceDate||'', customerPo:meta.customerPo||'', supplierOrderNumber:meta.orderNumber||'', page:pageNo,
        invoiceLine:Number(s.line), productCode:s.code, supplierSku:s.sku, description,
        qtySupplied:candidate.qty, discountPct:candidate.discPercent, unitPriceExGst:candidate.unitPriceExGst,
        extendedExGst:candidate.extendedExGst, gstAmount:candidate.gstAmount, totalIncGst:candidate.totalIncGst,
        rrp, normalWholesale:normalWs, parser:'CH2_PDF'
      });
    }
    return {rows,skipped};
  }
  function extractMetadata(text){
    const s=clean(text); const meta={invoiceNumber:'',invoiceDate:'',orderDate:'',customerPo:'',orderNumber:''};
    let m=s.match(/\b(\d{7,9})\s+RI\b/i); if(m) meta.invoiceNumber=m[1];
    m=s.match(/\b(\d{7,9})\s+SO\b/i); if(m) meta.orderNumber=m[1];
    m=s.match(/\b(\d{2}\/\d{2}\/\d{4})\b/); if(m) meta.invoiceDate=m[1];
    m=s.match(/\b(\d{1,2})-([A-Za-z]{3,9})-(\d{4})\b/); if(m){const months={JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12'};const mm=months[m[2].slice(0,3).toUpperCase()];if(mm)meta.orderDate=`${String(m[1]).padStart(2,'0')}/${mm}/${m[3]}`;}
    if(!meta.orderDate) meta.orderDate=meta.invoiceDate;
    // CH2 customer PO pattern, e.g. 02.09.2026-MELB-SID.
    m=s.match(/\b(\d{2}[.\/-]\d{2}[.\/-]\d{4}[-–][A-Z]{2,10}[-–][A-Z0-9]{2,10})\b/i);
    if(m) meta.customerPo=m[1].replace(/[–—]/g,'-');
    return meta;
  }

  async function parsePdf(file){
    if(!global.pdfjsLib) throw new Error('PDF reader did not load. Check your internet connection and refresh the page.');
    global.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const ab=await file.arrayBuffer();
    const pdf=await global.pdfjsLib.getDocument({data:new Uint8Array(ab)}).promise;
    let allRows=[], skipped=[], fullText='';
    for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
      const page=await pdf.getPage(pageNo); const tc=await page.getTextContent();
      const items=tc.items.map(x=>clean(x.str)).filter(Boolean);
      fullText+=' '+items.join(' ');
      const meta=extractMetadata(items.join(' '));
      const parsed=parseBlocks(items,pageNo,file.name,meta);
      allRows.push(...parsed.rows); skipped.push(...parsed.skipped);
    }
    const meta=extractMetadata(fullText);
    allRows=allRows.map(r=>({...r,
      invoiceNumber:r.invoiceNumber||meta.invoiceNumber,
      invoiceDate:r.invoiceDate||meta.invoiceDate,
      orderDate:r.orderDate||meta.orderDate||meta.invoiceDate,
      customerPo:r.customerPo||meta.customerPo,
      supplierOrderNumber:r.supplierOrderNumber||meta.orderNumber
    }));
    const isCredit=/CREDIT NOTE/i.test(fullText) || /\b\d{5,9}\s+CI\b/i.test(fullText);
    if(isCredit) return {type:'CREDIT_NOTE',sourceFile:file.name,rows:[],skipped,meta,warning:'Credit note detected and not included in this order reconciliation.'};
    if(!allRows.length) throw new Error(`${file.name}: no CH2 product lines could be extracted from this PDF.`);
    return {type:'SUPPLIER_INVOICE',format:'PDF',sourceFile:file.name,rows:allRows,skipped,meta,diagnostics:{pages:pdf.numPages,rows:allRows.length,skipped:skipped.length}};
  }

  function normHeader(v){return clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');}
  const SHEET_ALIASES={
    invoiceLine:['line','line_no','line_count','invoice_line'], productCode:['product_code','ch2_product_code','item_code','pgc_item_code'],
    supplierSku:['supplier_sku','sku','supplier_code'], description:['description','descr','product','product_description'], qtySupplied:['qty_supplied','quantity_supplied','qty','quantity'],
    discountPct:['disc','disc_pct','disc_percent','discount','discount_pct','discount_percent'], unitPriceExGst:['unit_price_ex_gst','unit_price','price_ex_gst'],
    extendedExGst:['extended_ex_gst','extended','line_total_ex_gst'], gstAmount:['gst_amount','gst'], totalIncGst:['total_inc_gst','total','line_total'],
    rrp:['rrp'], normalWholesale:['normal_w_s','normal_ws','normal_wholesale','wholesale'], invoiceNumber:['invoice_number','invoice'], invoiceDate:['invoice_date','date']
  };
  function findSheetHeader(matrix){
    let best={row:-1,score:-1,map:null};
    for(let r=0;r<Math.min(matrix.length,50);r++){
      const hs=(matrix[r]||[]).map(normHeader), map={}, scoreKeys=['productCode','description','qtySupplied','unitPriceExGst']; let score=0;
      for(const [key,names] of Object.entries(SHEET_ALIASES)){
        let idx=-1; for(const n of names){idx=hs.indexOf(normHeader(n)); if(idx>=0) break;} map[key]=idx;
      }
      scoreKeys.forEach(k=>{if(map[k]>=0) score+=10;});
      if(map.discountPct>=0) score+=3;
      if(score>best.score) best={row:r,score,map};
    }
    return best.score>=20?best:null;
  }
  async function parseSpreadsheet(file){
    if(!global.XLSX) throw new Error('Spreadsheet reader did not load. Check your internet connection and refresh the page.');
    const wb=global.XLSX.read(await file.arrayBuffer(),{type:'array',raw:true,cellDates:true});
    let chosen=null;
    for(const sheetName of wb.SheetNames){
      const matrix=global.XLSX.utils.sheet_to_json(wb.Sheets[sheetName],{header:1,defval:'',raw:true,blankrows:false});
      const h=findSheetHeader(matrix); if(h && (!chosen||matrix.length>chosen.matrix.length)) chosen={sheetName,matrix,...h};
    }
    if(!chosen) throw new Error(`${file.name}: could not recognise supplier invoice columns.`);
    const rows=[];
    for(let r=chosen.row+1;r<chosen.matrix.length;r++){
      const row=chosen.matrix[r]||[], at=k=>chosen.map[k]>=0?row[chosen.map[k]]:'';
      const code=clean(at('productCode')), desc=clean(at('description'));
      if(!code && !desc) continue;
      rows.push({sourceFile:file.name,invoiceNumber:clean(at('invoiceNumber')),invoiceDate:clean(at('invoiceDate')),orderDate:clean(at('invoiceDate')),customerPo:'',supplierOrderNumber:'',page:'',
        invoiceLine:num(at('invoiceLine'))??(r-chosen.row),productCode:code.replace(/\.0+$/,''),supplierSku:clean(at('supplierSku')),description:desc,
        qtySupplied:num(at('qtySupplied'))??0,discountPct:num(at('discountPct'))??0,unitPriceExGst:num(at('unitPriceExGst')),extendedExGst:num(at('extendedExGst')),
        gstAmount:num(at('gstAmount'))??0,totalIncGst:num(at('totalIncGst')),rrp:num(at('rrp')),normalWholesale:num(at('normalWholesale')),parser:'SUPPLIER_SHEET'});
    }
    if(!rows.length) throw new Error(`${file.name}: no supplier invoice product rows were found.`);
    return {type:'SUPPLIER_INVOICE',format:'SPREADSHEET',sourceFile:file.name,rows,skipped:[],meta:{},diagnostics:{rows:rows.length,sheetName:chosen.sheetName}};
  }

  async function parseSupplierInvoice(file){
    const ext='.'+(file.name.split('.').pop()||'').toLowerCase();
    if(ext==='.pdf') return parsePdf(file);
    if(['.xls','.xlsx','.csv'].includes(ext)) return parseSpreadsheet(file);
    throw new Error(`${file.name}: unsupported supplier invoice format.`);
  }

  PHF.parseSupplierInvoice=parseSupplierInvoice;
  PHF._testParseCh2Blocks=parseBlocks;
})(window);
