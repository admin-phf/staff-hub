(function(global){
  'use strict';
  const PHF=global.PHFReconcile=global.PHFReconcile||{};

  function clean(v){return v==null?'':String(v);}
  function numeric(v){return typeof v==='number'&&Number.isFinite(v);}
  function sum(rows,key){return Math.round((rows||[]).reduce((a,r)=>a+(numeric(r[key])?r[key]:0),0)*100)/100;}
  function argb(hex){return 'FF'+hex.replace('#','').toUpperCase();}
  function fill(hex){return {type:'pattern',pattern:'solid',fgColor:{argb:argb(hex)}};}
  function font(color,bold=false){const V=PHF.schema.VISUAL;return {name:V.fontName,size:V.fontSize,bold,color:{argb:argb(color)}};}
  function border(){const c={argb:argb(PHF.schema.VISUAL.border)};return {top:{style:'thin',color:c},left:{style:'thin',color:c},bottom:{style:'thin',color:c},right:{style:'thin',color:c}};}
  function setFormula(cell,formula,result){cell.value={formula,result};}
  function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}
  function applyState(cell,state){
    const V=PHF.schema.VISUAL;
    if(state==='good'){cell.fill=fill(V.goodFill);cell.font=font(V.goodText,true);}
    else if(state==='bad'){cell.fill=fill(V.badFill);cell.font=font(V.badText,true);}
    else if(state==='info'){cell.fill=fill(V.infoFill);cell.font=font(V.infoText,true);}
    else if(state==='muted'){cell.font=font(V.mutedText,false);}
  }
  function stateFor(value,kind){
    const s=clean(value).toUpperCase();
    if(!s)return '';
    if(kind==='matchStatus'){
      if(s==='MATCHED')return 'good';if(s.includes('LOW CONFIDENCE'))return 'bad';if(s.includes('SHORT')||s.includes('OVER')||s.includes('UNMATCHED')||s.includes('NOT INVOICED'))return 'bad';return '';
    }
    if(kind==='confidence'){if(s==='HIGH')return 'good';if(s==='MEDIUM')return 'info';if(s==='LOW')return 'bad';}
    if(kind==='check'){if(s==='OK')return 'good';if(s.includes('BETTER DISCOUNT')||s.includes('BETTER PRICE'))return 'info';if(s.includes('DISCOUNT LOW')||s.includes('PRICE HIGH')||s.includes('MISMATCH'))return 'bad';if(s.includes('NO RULE')||s.includes('NO CHECK')||s.includes('MISSING'))return 'muted';}
    return '';
  }

  // Price movement visual contract from the approved workbook:
  //   POS/current price = muted grey reference value.
  //   CH2/new price unchanged within tolerance = muted grey.
  //   CH2/new price increased = pale red / red text.
  //   CH2/new price decreased = pale blue / blue text.
  // This is deliberately presentation-only and does not alter reconciliation values.
  function applyPriceComparison(oldCell,newCell,tolerance){
    const V=PHF.schema.VISUAL,oldValue=oldCell.value,newValue=newCell.value;
    if(numeric(oldValue))oldCell.font=font(V.mutedText,false);
    if(!numeric(newValue))return;
    newCell.font=font(V.mutedText,false);
    if(!numeric(oldValue))return;
    const tol=Number.isFinite(tolerance)?tolerance:(V.priceVisualTolerance||0.03),delta=newValue-oldValue;
    if(delta>tol){
      newCell.fill=fill(V.priceUpFill||V.badFill);
      newCell.font=font(V.priceUpText||V.badText,true);
      newCell.numFmt='"↑ "#,##0.00';
    }else if(delta< -tol){
      newCell.fill=fill(V.priceDownFill||V.infoFill);
      newCell.font=font(V.priceDownText||V.infoText,true);
      newCell.numFmt='"↓ "#,##0.00';
    }else{
      newCell.numFmt='"— "#,##0.00';
    }
  }


  async function enforceExactPackage(buffer){
    if(!global.JSZip||!PHF.schema||!PHF.schema.COLUMNS)return buffer;
    const zip=await global.JSZip.loadAsync(buffer),sheetFile=zip.file('xl/worksheets/sheet1.xml');
    if(!sheetFile)return buffer;
    let xml=await sheetFile.async('string');
    const tags=PHF.schema.COLUMNS.map((c,i)=>`<col min="${i+1}" max="${i+1}" width="${Number(c.width)}" customWidth="1"/>`).join('');
    const colsBlock=`<cols>${tags}</cols>`;
    if(/<cols>[\s\S]*?<\/cols>/.test(xml))xml=xml.replace(/<cols>[\s\S]*?<\/cols>/,colsBlock);
    else if(/<sheetFormatPr[^>]*\/>/.test(xml))xml=xml.replace(/(<sheetFormatPr[^>]*\/>)/,`$1${colsBlock}`);
    else xml=xml.replace(/(<worksheet[^>]*>)/,`$1${colsBlock}`);
    zip.file('xl/worksheets/sheet1.xml',xml);
    return zip.generateAsync({type:'arraybuffer',compression:'DEFLATE'});
  }

  async function buildWorkbook(output){
    if(!global.ExcelJS)throw new Error('Excel export library did not load. Refresh the page and try again.');
    const {COLUMNS,HEADERS,TOTAL_HEADERS,VISUAL}=PHF.schema,rows=output.rows||[],wb=new global.ExcelJS.Workbook();
    wb.creator='Prahran Health Foods Staff Hub';wb.lastModifiedBy='Prahran Health Foods Staff Hub';wb.created=new Date();wb.modified=new Date();
    if(wb.calcProperties){wb.calcProperties.fullCalcOnLoad=true;wb.calcProperties.forceFullCalc=true;wb.calcProperties.calcMode='auto';}
    const ws=wb.addWorksheet('CH2 PDF Extract',{views:[{state:'frozen',ySplit:2,topLeftCell:'A3',showGridLines:false}]});
    COLUMNS.forEach((c,i)=>{ws.getColumn(i+1).width=c.width;});
    const dataStart=3,dataEnd=dataStart+rows.length-1,totalsRow=dataEnd+1;
    ws.addRow(new Array(HEADERS.length).fill(''));ws.addRow(HEADERS);
    rows.forEach(r=>ws.addRow(COLUMNS.map(c=>r[c.key]??'')));
    ws.addRow(new Array(HEADERS.length).fill(''));ws.getCell(totalsRow,1).value='SUM TOTALS';

    const idx=Object.fromEntries(HEADERS.map((h,i)=>[h,i+1])),invoiceCount=new Set(rows.map(r=>clean(r['Invoice Number'])).filter(Boolean)).size,refCount=new Set(rows.map(r=>clean(r['Your Ref'])).filter(Boolean)).size;
    setFormula(ws.getCell(1,1),`\"TOTAL ROWS: \"&TEXT(SUBTOTAL(103,A${dataStart}:A${dataEnd}),\"#,##0\")`,`TOTAL ROWS: ${rows.length}`);
    ws.getCell(1,4).value=`INVOICE NUMBERS: ${invoiceCount}`;ws.getCell(1,5).value=`UNIQUE REFS: ${refCount}`;
    ws.getCell(1,11).value='PRICE MOVE: ↑ HIGHER  ↓ LOWER  — SAME';
    for(const h of TOTAL_HEADERS){
      const c=idx[h],letter=ws.getColumn(c).letter,res=sum(rows,h);setFormula(ws.getCell(1,c),`SUBTOTAL(109,${letter}${dataStart}:${letter}${dataEnd})`,res);setFormula(ws.getCell(totalsRow,c),`SUBTOTAL(109,${letter}${dataStart}:${letter}${dataEnd})`,res);
    }

    ws.getRow(1).height=VISUAL.row1Height;ws.getRow(2).height=VISUAL.row2Height;ws.getRow(totalsRow).height=VISUAL.totalsHeight;
    for(let r=dataStart;r<=dataEnd;r++)ws.getRow(r).height=VISUAL.dataHeight;

    for(let c=1;c<=HEADERS.length;c++){
      const top=ws.getCell(1,c);top.fill=fill(VISUAL.summaryFill);top.font=font(VISUAL.summaryFont,true);top.alignment={horizontal:'center',vertical:'middle',wrapText:true};
      const header=ws.getCell(2,c);header.fill=fill(VISUAL.headerFill);header.font=font(VISUAL.text,true);header.border=border();header.alignment={horizontal:'center',vertical:'middle',wrapText:true};
      const total=ws.getCell(totalsRow,c);total.fill=fill(VISUAL.summaryFill);total.font=font(VISUAL.summaryFont,true);total.alignment={horizontal:'center',vertical:'middle',wrapText:true};
    }

    for(let r=dataStart;r<=dataEnd;r++){
      const base=(r-dataStart)%2===0?VISUAL.oddFill:VISUAL.evenFill;
      for(let c=1;c<=HEADERS.length;c++){const cell=ws.getCell(r,c);cell.fill=fill(base);cell.font=font(VISUAL.text,false);cell.border=border();cell.alignment={vertical:'middle',wrapText:false};}
      applyState(ws.getCell(r,idx['MATCH STATUS']),stateFor(ws.getCell(r,idx['MATCH STATUS']).value,'matchStatus'));
      applyState(ws.getCell(r,idx['MATCH CONFIDENCE']),stateFor(ws.getCell(r,idx['MATCH CONFIDENCE']).value,'confidence'));
      ['CH2 WHOLESALE CHECK','DIS CH2 DISC CHECK','DIS UNIT CHECK'].forEach(h=>applyState(ws.getCell(r,idx[h]),stateFor(ws.getCell(r,idx[h]).value,'check')));

      // Restore the quick visual price movement comparison used in the approved output.
      // Pair 1: POS wholesale -> CH2 normal wholesale.
      // Pair 2: POS last price -> CH2 actual invoice unit price.
      // Pair 3: POS RRP -> CH2 RRP.
      const priceTol=VISUAL.priceVisualTolerance||0.03;
      applyPriceComparison(ws.getCell(r,idx['POS WSP EXCGST']),ws.getCell(r,idx['CH2 NORMAL W/S']),priceTol);
      applyPriceComparison(ws.getCell(r,idx['POS LAST PRICE']),ws.getCell(r,idx['CH2 UNIT PRICE EX GST']),priceTol);
      applyPriceComparison(ws.getCell(r,idx['POS RRP INCGST']),ws.getCell(r,idx['CH2 RRP']),priceTol);

      const missed=ws.getCell(r,idx['DIS MISSED TOTAL']);if(numeric(missed.value)&&missed.value>0.005)applyState(missed,'bad');else if(missed.value===0)applyState(missed,'muted');
      const variance=ws.getCell(r,idx['DIS UNIT VARIANCE']);if(numeric(variance.value)&&variance.value<-0.005)applyState(variance,'info');
    }

    // Exact number-format behaviour of the approved workbook: body values are numbers
    // without a currency symbol; summary/totals monetary columns use $ formatting.
    for(const col of COLUMNS){
      const c=idx[col.header];
      if(col.type==='text')for(let r=dataStart;r<=dataEnd;r++)ws.getCell(r,c).numFmt='@';
      else if(col.type==='money')for(let r=dataStart;r<=dataEnd;r++)ws.getCell(r,c).numFmt='#,##0.00';
      else if(col.type==='pct')for(let r=dataStart;r<=dataEnd;r++)ws.getCell(r,c).numFmt='0.00';
      else if(col.type==='qty')for(let r=dataStart;r<=dataEnd;r++)ws.getCell(r,c).numFmt='0.###';
      else if(col.type==='number1')for(let r=dataStart;r<=dataEnd;r++)ws.getCell(r,c).numFmt='0.0';
      else if(col.type==='index')for(let r=dataStart;r<=dataEnd;r++)if(numeric(ws.getCell(r,c).value))ws.getCell(r,c).numFmt='0';
    }
    for(const h of TOTAL_HEADERS){const c=idx[h],fmt=h==='CH2 QTY SUPPLIED'?'#,##0.###':'$#,##0.00';ws.getCell(1,c).numFmt=fmt;ws.getCell(totalsRow,c).numFmt=fmt;}

    // Reapply the POS-style movement symbols after standard numeric formats are set.
    // The underlying cell values remain numeric; only their display format changes.
    for(let r=dataStart;r<=dataEnd;r++){
      const priceTol=VISUAL.priceVisualTolerance||0.03;
      applyPriceComparison(ws.getCell(r,idx['POS WSP EXCGST']),ws.getCell(r,idx['CH2 NORMAL W/S']),priceTol);
      applyPriceComparison(ws.getCell(r,idx['POS LAST PRICE']),ws.getCell(r,idx['CH2 UNIT PRICE EX GST']),priceTol);
      applyPriceComparison(ws.getCell(r,idx['POS RRP INCGST']),ws.getCell(r,idx['CH2 RRP']),priceTol);
    }

    // Force Excel Middle Align for every populated output cell, while preserving horizontal alignment choices.
    for(let r=1;r<=totalsRow;r++)for(let c=1;c<=HEADERS.length;c++){const cell=ws.getCell(r,c);cell.alignment={...(cell.alignment||{}),vertical:'middle'};}
    if(rows.length)ws.autoFilter={from:{row:2,column:1},to:{row:dataEnd,column:HEADERS.length}};
    ws.views=[{state:'frozen',ySplit:2,topLeftCell:'A3',showGridLines:false}];ws.pageSetup={orientation:'landscape'};
    return wb;
  }

  async function buildValidatedBuffer(output,posOrder){
    const wb=await buildWorkbook(output),rawBuffer=await wb.xlsx.writeBuffer(),buffer=await enforceExactPackage(rawBuffer),validation=await PHF.integrity.validateWorkbookBuffer(buffer,output,posOrder);
    if(!validation.ok)throw new Error(`Excel integrity validation failed: ${validation.errors.join(' | ')}`);return {buffer,validation};
  }

  async function exportReference(invoiceDocs,refs,posOrder,reconciliation){
    const outputs=PHF.linkedPos.buildReferenceOutputs(invoiceDocs,refs,posOrder,reconciliation);if(!outputs.length)throw new Error('No supplier invoice output could be created.');
    if(outputs.length===1){const built=await buildValidatedBuffer(outputs[0],posOrder);downloadBlob(new Blob([built.buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),outputs[0].filename);return outputs;}
    if(!global.JSZip)throw new Error('ZIP export library did not load. Refresh the page and try again.');
    const zip=new global.JSZip();for(const out of outputs){const built=await buildValidatedBuffer(out,posOrder);zip.file(out.filename,built.buffer);}
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'}),stamp=new Date().toLocaleDateString('en-AU').replace(/\//g,'.');downloadBlob(blob,`CH2_CURRENT_RECONCILIATIONS_${stamp}.zip`);return outputs;
  }


  function safePart(v){return clean(v).trim().replace(/[^A-Za-z0-9._-]+/g,'_').replace(/^_+|_+$/g,'')||'CURRENT';}
  function n(v){const x=Number(v);return Number.isFinite(x)?x:null;}
  function sumInvoiceRows(rows,key){return Math.round((rows||[]).reduce((a,r)=>a+(n(r&&r[key])||0),0)*100)/100;}
  function weightedInvoice(rows,key){let total=0,weight=0;for(const r of rows||[]){const value=n(r&&r[key]),w=n(r&&r.qtySupplied);if(value!=null&&w!=null&&w>0){total+=value*w;weight+=w;}}return weight?total/weight:null;}
  async function downloadWorkbook(wb,filename){const buffer=await wb.xlsx.writeBuffer();downloadBlob(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),filename);return filename;}
  function styleSimpleSheet(ws,headers,widths){
    const V=PHF.schema.VISUAL,header=ws.getRow(1);header.height=24;
    headers.forEach((h,i)=>{const cell=ws.getCell(1,i+1);cell.fill=fill(V.headerFill);cell.font=font(V.text,true);cell.border=border();cell.alignment={horizontal:'center',vertical:'middle',wrapText:true};ws.getColumn(i+1).width=widths[i]||14;});
    const last=ws.rowCount;
    for(let r=2;r<=last;r++){ws.getRow(r).height=20;for(let c=1;c<=headers.length;c++){const cell=ws.getCell(r,c);cell.fill=fill((r%2===0)?V.oddFill:V.evenFill);cell.font=font(V.text,false);cell.border=border();cell.alignment={vertical:'middle',wrapText:false};}}
    if(last>=2)ws.autoFilter={from:{row:1,column:1},to:{row:last,column:headers.length}};
    ws.views=[{state:'frozen',ySplit:1,topLeftCell:'A2',showGridLines:false}];ws.pageSetup={orientation:'landscape',fitToWidth:1};
  }
  async function exportExceptions(reconciliation){
    if(!global.ExcelJS)throw new Error('Excel export library did not load. Refresh the page and try again.');
    const wb=new global.ExcelJS.Workbook();wb.creator='Prahran Health Foods Staff Hub';
    const ws=wb.addWorksheet('Exceptions');
    const headers=['STATUS','POS PRODUCT','ORDERED','SUPPLIED','EXPECTED UNIT','INVOICE UNIT','VARIANCE','MISSED $','MATCH'];
    const rows=(reconciliation.detail||[]).filter(x=>x.hasException||x.matchConfidence==='LOW').map(x=>[x.status,x.posDescription,x.orderedQty,x.suppliedQty,x.expectedUnit,x.actualUnit,x.unitVariance,x.missedTotal,x.matchConfidence||'']);
    for(const x of reconciliation.unmatchedInvoice||[])rows.push(['NOT ORDERED / UNMATCHED',x.description,'',x.qtySupplied,'',x.unitPriceExGst,'',0,'']);
    ws.addRow(headers);rows.forEach(r=>ws.addRow(r));styleSimpleSheet(ws,headers,[26,48,12,12,15,15,14,13,12]);
    for(let r=2;r<=ws.rowCount;r++){
      applyState(ws.getCell(r,1),stateFor(ws.getCell(r,1).value,'matchStatus'));
      applyState(ws.getCell(r,9),stateFor(ws.getCell(r,9).value,'confidence'));
      ws.getCell(r,2).alignment={vertical:'middle',horizontal:'left'};
      for(let c=3;c<=8;c++){ws.getCell(r,c).alignment={vertical:'middle',horizontal:'right'};ws.getCell(r,c).numFmt=c<=4?'0.###':'$#,##0.00';}
    }
    const filename=`CH2_PO_${safePart(reconciliation.orderNumber)}_EXCEPTIONS.xlsx`;return downloadWorkbook(wb,filename);
  }
  function detailBySourceRow(reconciliation){const map=new Map();for(const d of reconciliation.detail||[]){const k=String(d&&d.sourceRow!=null?d.sourceRow:'');if(k&&!map.has(k))map.set(k,d);}return map;}
  function sortedPos(posOrder){return ((posOrder&&posOrder.rows)||[]).slice().sort((a,b)=>{const ar=Number(a&&a.sourceRow),br=Number(b&&b.sourceRow);if(Number.isFinite(ar)&&Number.isFinite(br)&&ar!==br)return ar-br;return Number(a&&a.posIndex||0)-Number(b&&b.posIndex||0);});}
  function docDefaults(invoiceDocs){
    const docs=(invoiceDocs||[]).filter(d=>d&&d.type!=='CREDIT_NOTE'),first=docs[0]||{},m=first.meta||{},firstRow=(first.rows||[])[0]||{};
    return {date:clean(firstRow.invoiceDate||m.invoiceDate||firstRow.orderDate||m.orderDate),number:clean(firstRow.invoiceNumber||m.invoiceNumber)};
  }
  async function exportPosLayout(invoiceDocs,posOrder,reconciliation){
    if(!global.ExcelJS)throw new Error('Excel export library did not load. Refresh the page and try again.');
    const wb=new global.ExcelJS.Workbook();wb.creator='Prahran Health Foods Staff Hub';
    const ws=wb.addWorksheet('POS Layout');
    const headers=['Date','Document Number','UPC Code','Item','Description','Quantity','Tax Schedule','GST tax pc','Normal w/s per unit ex gst','RRP','% discount this invoice','Total Amount this invoice ex gst','GST','Gross Amount'];
    const widths=[13,18,18,18,54,11,14,11,24,12,22,28,12,15],details=detailBySourceRow(reconciliation),defaults=docDefaults(invoiceDocs),rows=[];
    const posRows=sortedPos(posOrder);
    posRows.forEach((pos,i)=>{
      const d=details.get(String(pos&&pos.sourceRow!=null?pos.sourceRow:''))||(reconciliation.detail||[])[i]||{},invRows=d.invoiceRows||[],gstPct=weightedInvoice(invRows,'gstPct');
      const invoiceDate=clean((invRows[0]&&invRows[0].invoiceDate)||defaults.date),invoiceNo=clean(d.invoiceNumbers||((invRows[0]&&invRows[0].invoiceNumber)||defaults.number));
      const supplied=n(d.suppliedQty)||0,normalWs=n(d.invoiceNormalWholesale);const rrp=weightedInvoice(invRows,'rrp');
      const posWs=n(pos&&pos.normalWholesale),posRrp=n(pos&&pos.rrp),posGst=n(pos&&pos.raw&&pos.raw.gst_tax_pc);
      const ex=sumInvoiceRows(invRows,'extendedExGst'),gst=sumInvoiceRows(invRows,'gstAmount'),gross=sumInvoiceRows(invRows,'totalIncGst'),disc=n(d.actualDiscountPct);
      const effectiveGst=gstPct!=null?gstPct:(posGst!=null?posGst:0);
      rows.push([invoiceDate,invoiceNo,clean(pos&&pos.barcode),clean(pos&&pos.subId||pos&&pos.plu),clean(pos&&pos.description),supplied,effectiveGst>0?'Taxable':'Non Taxable',effectiveGst/100,normalWs!=null?normalWs:(posWs!=null?posWs:''),rrp!=null?rrp:(posRrp!=null?posRrp:''),disc!=null?disc/100:'',ex,gst,gross]);
    });
    ws.addRow(headers);rows.forEach(r=>ws.addRow(r));styleSimpleSheet(ws,headers,widths);
    for(let r=2;r<=ws.rowCount;r++){
      ws.getCell(r,3).numFmt='@';ws.getCell(r,4).numFmt='@';ws.getCell(r,6).numFmt='0.###';ws.getCell(r,8).numFmt='0.00%';ws.getCell(r,11).numFmt='0.00%';
      [9,10,12,13,14].forEach(c=>ws.getCell(r,c).numFmt='#,##0.00');
      [6,8,9,10,11,12,13,14].forEach(c=>ws.getCell(r,c).alignment={vertical:'middle',horizontal:'right'});
    }
    const filename=`CH2_PO_${safePart(reconciliation.orderNumber)}_POS_LAYOUT.xlsx`;return downloadWorkbook(wb,filename);
  }
  async function exportView(view,invoiceDocs,refs,posOrder,reconciliation){
    if(view==='exceptions')return exportExceptions(reconciliation);
    if(view==='pos')return exportPosLayout(invoiceDocs,posOrder,reconciliation);
    return exportReference(invoiceDocs,refs,posOrder,reconciliation);
  }

  PHF.report={buildWorkbook,buildValidatedBuffer,enforceExactPackage};
  PHF.exportReference=exportReference;
  PHF.exportView=exportView;
})(window);
