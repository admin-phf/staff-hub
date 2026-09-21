(function(global){
  'use strict';
  const PHF = global.PHFReconcile = global.PHFReconcile || {};

  const REQUIRED_HINTS = ['descr','or_qty','adjwsprce','adjdprce'];
  const ALIASES = {
    orderNumber:['orderno','order_no','order number'],
    plu:['plu','pos_plu'],
    barcode:['main_id','main id','barcode','master_barcode','pos_master_barcode'],
    subId:['sub_id','sub id','supplier code','supplier_code','product code','product_code'],
    description:['descr','description','pos_descr','product description'],
    gstPct:['gst_tax_pc','gst tax pc','gst','gst %'],
    qty:['qty'],
    qtyStockIn:['qty_stk_in','qty stk in'],
    orderedQty:['or_qty','or qty','order qty','order_qty','qty ordered'],
    normalWholesale:['adjwsprce','adj wsp rce','wholesale','normal w/s','normal ws'],
    expectedUnit:['adjdprce','adj dprce','discounted price','expected unit'],
    lastPrice:['last_price','last price'],
    rrp:['adjrrprce','rrp_ref','rrp'],
    supplier:['supplier','supplier number','supplier_number'],
    itemSize:['itemsize','item size'],
    stockOnHand:['soh','stock on hand']
  };

  function clean(v){ return v == null ? '' : String(v).trim(); }
  function normHeader(v){ return clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,''); }
  function toNumber(v){
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    let s=clean(v).replace(/[$,%]/g,'').replace(/,/g,'');
    if (!s) return null;
    if (/^\.\d+$/.test(s)) s='0'+s;
    const n=Number(s); return Number.isFinite(n)?n:null;
  }
  function textCode(v){
    if (v == null) return '';
    if (typeof v === 'number' && Number.isFinite(v)) return Number.isInteger(v)?String(v):String(v);
    return clean(v).replace(/\.0+$/,'');
  }
  function findHeaderRow(matrix){
    let best={row:-1,score:-1};
    for(let r=0;r<Math.min(matrix.length,40);r++){
      const hs=(matrix[r]||[]).map(normHeader);
      let score=0;
      for(const hint of REQUIRED_HINTS) if(hs.includes(normHeader(hint))) score+=10;
      if(hs.includes('main_id')) score+=4;
      if(hs.includes('sub_id')) score+=4;
      if(hs.includes('supplier')) score+=2;
      if(score>best.score) best={row:r,score};
    }
    return best.score>=20?best.row:-1;
  }
  function makeHeaderMap(headers){
    const norm=headers.map(normHeader), map={};
    for(const [key,names] of Object.entries(ALIASES)){
      let idx=-1;
      for(const name of names){ idx=norm.indexOf(normHeader(name)); if(idx>=0) break; }
      map[key]=idx;
    }
    return map;
  }
  function valueAt(row, idx){ return idx>=0 && idx<row.length ? row[idx] : ''; }

  async function parsePosOrder(file){
    if(!global.XLSX) throw new Error('Spreadsheet reader did not load. Check your internet connection and refresh the page.');
    const ab=await file.arrayBuffer();
    const wb=global.XLSX.read(ab,{type:'array',cellDates:true,raw:true});
    if(!wb.SheetNames.length) throw new Error('The POS order workbook contains no sheets.');

    let chosen=null;
    for(const sheetName of wb.SheetNames){
      const ws=wb.Sheets[sheetName];
      const matrix=global.XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true,blankrows:false});
      const headerRow=findHeaderRow(matrix);
      if(headerRow>=0){
        const score=matrix.length-headerRow;
        if(!chosen || score>chosen.score) chosen={sheetName,matrix,headerRow,score};
      }
    }
    if(!chosen) throw new Error('Could not recognise the POS back-end order columns. Expected fields such as descr, or_qty, adjwsprce and adjdprce.');

    const headers=chosen.matrix[chosen.headerRow].map(clean);
    const hm=makeHeaderMap(headers);
    const rows=[];
    for(let r=chosen.headerRow+1;r<chosen.matrix.length;r++){
      const raw=chosen.matrix[r]||[];
      const description=clean(valueAt(raw,hm.description));
      const barcode=textCode(valueAt(raw,hm.barcode));
      const subId=textCode(valueAt(raw,hm.subId));
      const orderedQty=toNumber(valueAt(raw,hm.orderedQty)) ?? toNumber(valueAt(raw,hm.qty));
      if(!description && !barcode && !subId) continue;
      if(orderedQty == null || Math.abs(orderedQty) < 0.0000001) continue;
      const normalWholesale=toNumber(valueAt(raw,hm.normalWholesale));
      let expectedUnit=toNumber(valueAt(raw,hm.expectedUnit));
      const lastPrice=toNumber(valueAt(raw,hm.lastPrice));
      if(expectedUnit==null) expectedUnit=lastPrice;
      let expectedDiscountPct=null;
      if(normalWholesale!=null && normalWholesale!==0 && expectedUnit!=null){
        expectedDiscountPct=(1-(expectedUnit/normalWholesale))*100;
      }
      rows.push({
        posIndex:r-chosen.headerRow,
        sourceRow:r+1,
        orderNumber:clean(valueAt(raw,hm.orderNumber)),
        plu:textCode(valueAt(raw,hm.plu)),
        barcode,
        subId,
        description,
        gstPct:toNumber(valueAt(raw,hm.gstPct)),
        orderedQty,
        qtyStockIn:toNumber(valueAt(raw,hm.qtyStockIn)),
        normalWholesale,
        expectedUnit,
        expectedDiscountPct,
        lastPrice,
        rrp:toNumber(valueAt(raw,hm.rrp)),
        supplier:textCode(valueAt(raw,hm.supplier)),
        itemSize:clean(valueAt(raw,hm.itemSize)),
        stockOnHand:toNumber(valueAt(raw,hm.stockOnHand)),
        raw:Object.fromEntries(headers.map((h,c)=>[h||`COL_${c+1}`,raw[c]??'']))
      });
    }
    if(!rows.length) throw new Error('The POS order was recognised, but no ordered product lines were found.');
    const orderNumbers=[...new Set(rows.map(x=>x.orderNumber).filter(Boolean))];
    return {
      type:'POS_ORDER',
      sourceFile:file.name,
      sheetName:chosen.sheetName,
      headerRow:chosen.headerRow+1,
      orderNumber:orderNumbers.length===1?orderNumbers[0]:orderNumbers.join(', '),
      rows,
      diagnostics:{rows:rows.length,headers}
    };
  }

  PHF.parsePosOrder=parsePosOrder;
})(window);
