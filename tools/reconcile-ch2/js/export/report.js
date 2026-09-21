(function(global){
  'use strict';
  const PHF = global.PHFReconcile = global.PHFReconcile || {};
  function money(v){return v==null?'':Number(v);}
  function safeName(v){return String(v||'UNKNOWN').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'');}
  function setWidths(ws,widths){ws['!cols']=widths.map(w=>({wch:w}));}
  function addAutofilter(ws,range){ws['!autofilter']={ref:range};}

  function exportReport(result){
    if(!global.XLSX) throw new Error('Spreadsheet export library is not available.');
    const wb=global.XLSX.utils.book_new();
    const t=result.totals;

    const summary=[
      ['PRAHRAN HEALTH FOODS — CH2 ORDER RECONCILIATION'],
      [],
      ['POS order file',result.sourcePosFile||''],
      ['Order number',result.orderNumber||''],
      ['Generated',new Date(result.createdAt).toLocaleString()],
      [],
      ['Metric','Value'],
      ['POS order lines',t.posLines],
      ['Supplier invoice lines',t.invoiceLines],
      ['Matched invoice lines',t.matchedInvoiceLines],
      ['Unmatched invoice lines',t.unmatchedInvoiceLines],
      ['Correct lines',t.correctLines],
      ['Better-price lines',t.betterPriceLines],
      ['Exception lines',t.exceptionLines],
      ['Low-confidence matches',t.lowConfidenceLines],
      ['Not invoiced',t.notInvoiced],
      ['Short supplied',t.shortSupplied],
      ['Over supplied',t.overSupplied],
      ['Price high',t.priceHigh],
      ['Potential missed discount / pricing',t.missedTotal],
      [],
      ['Warnings'],
      ...((result.warnings||[]).length?result.warnings.map(x=>[x]):[['None']])
    ];
    const wsSummary=global.XLSX.utils.aoa_to_sheet(summary);
    setWidths(wsSummary,[38,24]);
    if(wsSummary['B20']) wsSummary['B20'].z='$#,##0.00';
    global.XLSX.utils.book_append_sheet(wb,wsSummary,'SUMMARY');

    const detailHeaders=['STATUS','POS INDEX','ORDER NUMBER','POS PLU','BARCODE','POS SUB ID','POS DESCRIPTION','ORDERED QTY','SUPPLIED QTY','QTY VARIANCE','POS NORMAL W/S','INVOICE NORMAL W/S','W/S VARIANCE','EXPECTED DISC %','ACTUAL DISC %','EXPECTED UNIT EX GST','INVOICE UNIT EX GST','UNIT VARIANCE','MISSED TOTAL','RRP','MATCH CONFIDENCE','MATCH METHOD','INVOICE NUMBER','SOURCE FILE'];
    const detailRows=result.detail.map(x=>[
      x.status,x.posIndex,x.orderNumber,x.plu,x.barcode,x.subId,x.posDescription,x.orderedQty,x.suppliedQty,x.qtyVariance,
      money(x.posNormalWholesale),money(x.invoiceNormalWholesale),money(x.wholesaleVariance),x.expectedDiscountPct,x.actualDiscountPct,money(x.expectedUnit),money(x.actualUnit),money(x.unitVariance),money(x.missedTotal),money(x.rrp),x.matchConfidence,x.matchMethods,x.invoiceNumbers,x.sourceFiles
    ]);
    const wsDetail=global.XLSX.utils.aoa_to_sheet([detailHeaders,...detailRows]);
    setWidths(wsDetail,[24,10,16,12,16,14,42,12,12,12,15,17,14,15,15,18,18,14,14,12,18,28,18,34]);
    if(detailRows.length) addAutofilter(wsDetail,`A1:X${detailRows.length+1}`);
    wsDetail['!freeze']={xSplit:0,ySplit:1};
    global.XLSX.utils.book_append_sheet(wb,wsDetail,'RECONCILIATION');

    const exHeaders=detailHeaders;
    const exRows=result.exceptions.map(x=>[
      x.status,x.posIndex,x.orderNumber,x.plu,x.barcode,x.subId,x.posDescription,x.orderedQty,x.suppliedQty,x.qtyVariance,
      money(x.posNormalWholesale),money(x.invoiceNormalWholesale),money(x.wholesaleVariance),x.expectedDiscountPct,x.actualDiscountPct,money(x.expectedUnit),money(x.actualUnit),money(x.unitVariance),money(x.missedTotal),money(x.rrp),x.matchConfidence,x.matchMethods,x.invoiceNumbers,x.sourceFiles
    ]);
    const wsEx=global.XLSX.utils.aoa_to_sheet([exHeaders,...exRows]);
    setWidths(wsEx,[24,10,16,12,16,14,42,12,12,12,15,17,14,15,15,18,18,14,14,12,18,28,18,34]);
    if(exRows.length) addAutofilter(wsEx,`A1:X${exRows.length+1}`);
    global.XLSX.utils.book_append_sheet(wb,wsEx,'EXCEPTIONS');

    const unmatchedHeaders=['STATUS','SOURCE FILE','INVOICE NUMBER','LINE','PRODUCT CODE','SUPPLIER SKU','DESCRIPTION','QTY','DISC %','UNIT EX GST','NORMAL W/S','RRP'];
    const unmatchedRows=result.unmatchedInvoice.map(x=>[x.matchStatus,x.sourceFile,x.invoiceNumber,x.invoiceLine,x.productCode,x.supplierSku,x.description,x.qtySupplied,x.discountPct,x.unitPriceExGst,x.normalWholesale,x.rrp]);
    const wsUn=global.XLSX.utils.aoa_to_sheet([unmatchedHeaders,...unmatchedRows]);
    setWidths(wsUn,[24,34,18,10,16,22,45,10,10,15,14,12]);
    if(unmatchedRows.length) addAutofilter(wsUn,`A1:L${unmatchedRows.length+1}`);
    global.XLSX.utils.book_append_sheet(wb,wsUn,'UNMATCHED INVOICES');

    const filename=`CH2_ORDER_RECONCILIATION_${safeName(result.orderNumber||'ORDER')}.xlsx`;
    global.XLSX.writeFile(wb,filename,{compression:true});
  }
  PHF.exportReport=exportReport;
})(window);
