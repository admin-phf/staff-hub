(function(global){
  'use strict';
  const PHF=global.PHFReconcile=global.PHFReconcile||{};
  const WIDTHS={
    'INDEX':8,'Order Date':13,'Invoice Date':13,'Invoice Number':15,'Your Ref':26,'Line Count':11,'Tax Amount':13,'Invoice Total':14,'POS_SUPPLIER':25,'MATCH_STATUS':20,'MATCH_METHOD':28,'MATCH_CONFIDENCE':18,'FUZZY_SCORE':13,'POS_MASTER_BARCODE':19,'POS_PLU':12,'POS_BRAND':24,'POS_DESCR':45,'CH2_SUPPLIER SKU':25,'CH2_PRODUCT CODE':18,'CH2_QTY SUPPLIED':16,'CH2_DISC %':12,'CH2_GST':11,'POS_GST_TAX_PC':16,'POS_WSP_EXCGST':16,'CH2_NORMAL W/S':16,'POS_LAST_PRICE':15,'CH2_UNIT PRICE EX GST':20,'POS_RRP_INCGST':17,'CH2_RRP':13,'POS_TOTAL':14,'CH2_TOTAL':14,'POS_CH2_WHOLESALE_EX_GST':24,'CH2_WHOLESALE_VARIANCE':22,'CH2_WHOLESALE_CHECK':23,'DIS_EXPECTED %':15,'DIS_MATCH_TYPE':22,'DIS_MATCH_KEY':28,'DIS_MATCH_RULE':35,'DIS_CH2_DISC_CHECK':24,'DIS_EXPECTED_UNIT_EXGST':23,'DIS_UNIT_VARIANCE':18,'DIS_UNIT_CHECK':22,'DIS_MISSED_TOTAL':18
  };
  const MONEY=new Set(['Tax Amount','Invoice Total','POS_WSP_EXCGST','CH2_NORMAL W/S','POS_LAST_PRICE','CH2_UNIT PRICE EX GST','POS_RRP_INCGST','CH2_RRP','POS_TOTAL','CH2_TOTAL','POS_CH2_WHOLESALE_EX_GST','CH2_WHOLESALE_VARIANCE','DIS_EXPECTED_UNIT_EXGST','DIS_UNIT_VARIANCE','DIS_MISSED_TOTAL']);
  const PCT=new Set(['CH2_DISC %','DIS_EXPECTED %','POS_GST_TAX_PC','CH2_GST']);
  function clean(v){return v==null?'':String(v);}
  function upper(v){return typeof v==='string'?v.toUpperCase():(v==null?'':v);}
  function sum(rows,key){return Math.round(rows.reduce((a,r)=>a+(typeof r[key]==='number'&&Number.isFinite(r[key])?r[key]:0),0)*100)/100;}
  function argb(hex){return 'FF'+hex.replace('#','').toUpperCase();}
  function fill(hex){return {type:'pattern',pattern:'solid',fgColor:{argb:argb(hex)}};}
  function font(color,bold=false){return {name:'Arial',size:10,bold,color:{argb:argb(color)}};}
  const BORDER={top:{style:'thin',color:{argb:argb('D9E2F3')}},left:{style:'thin',color:{argb:argb('D9E2F3')}},bottom:{style:'thin',color:{argb:argb('D9E2F3')}},right:{style:'thin',color:{argb:argb('D9E2F3')}}};
  function setFormula(cell,formula,result){cell.value={formula,result};}
  function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}

  async function buildWorkbook(output){
    if(!global.ExcelJS)throw new Error('Excel export library did not load. Refresh the page and try again.');
    const H=PHF.linkedPos.HEADERS,T=PHF.linkedPos.TOTAL_HEADERS,rows=output.rows||[];
    const wb=new global.ExcelJS.Workbook();wb.creator='Prahran Health Foods Staff Hub';wb.created=new Date();
    if(wb.calcProperties){wb.calcProperties.fullCalcOnLoad=true;wb.calcProperties.forceFullCalc=true;wb.calcProperties.calcMode='auto';}
    const ws=wb.addWorksheet('CH2 PDF Extract',{views:[{state:'frozen',ySplit:2,topLeftCell:'A3',showGridLines:false}]});
    H.forEach((h,i)=>{ws.getColumn(i+1).width=WIDTHS[h]||14;});
    const summaryRow=1,headerRow=2,dataStart=3,dataEnd=dataStart+rows.length-1,totalsRow=dataEnd+1;
    ws.addRow(new Array(H.length).fill(''));
    ws.addRow(H);
    rows.forEach(r=>ws.addRow(H.map(h=>upper(r[h]))));
    ws.addRow(new Array(H.length).fill('')); ws.getCell(totalsRow,1).value='SUM TOTALS';

    const idx=Object.fromEntries(H.map((h,i)=>[h,i+1]));
    const visibleCount=rows.length, invoiceCount=new Set(rows.map(r=>clean(r['Invoice Number'])).filter(Boolean)).size, refCount=new Set(rows.map(r=>clean(r['Your Ref'])).filter(Boolean)).size;
    setFormula(ws.getCell(1,1),`\"TOTAL ROWS: \"&TEXT(SUBTOTAL(103,B${dataStart}:B${dataEnd}),\"#,##0\")`,`TOTAL ROWS: ${visibleCount}`);
    setFormula(ws.getCell(1,4),`\"INVOICE NUMBERS: \"&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(D${dataStart}:D${dataEnd},D${dataStart}:D${dataEnd}<>\"\"))),0),\"#,##0\")`,`INVOICE NUMBERS: ${invoiceCount}`);
    setFormula(ws.getCell(1,5),`\"UNIQUE REFS: \"&TEXT(IFERROR(COUNTA(UNIQUE(FILTER(E${dataStart}:E${dataEnd},E${dataStart}:E${dataEnd}<>\"\"))),0),\"#,##0\")`,`UNIQUE REFS: ${refCount}`);
    for(const h of T){const c=idx[h],letter=ws.getColumn(c).letter,res=sum(rows,h);setFormula(ws.getCell(1,c),`SUBTOTAL(109,${letter}${dataStart}:${letter}${dataEnd})`,res);setFormula(ws.getCell(totalsRow,c),`SUBTOTAL(109,${letter}${dataStart}:${letter}${dataEnd})`,res);}

    // Exact styling from the established CH2 linked-POS workbook.
    ws.getRow(1).height=24;ws.getRow(2).height=38;
    for(let c=1;c<=H.length;c++){
      const a=ws.getCell(1,c);a.fill=fill('1E3A5F');a.font=font('FFD966',true);a.alignment={vertical:'middle',wrapText:true};
      const h=ws.getCell(2,c);h.fill=fill('DDE6ED');h.font=font('1F2937',true);h.border=BORDER;h.alignment={horizontal:'center',vertical:'middle',wrapText:true};
      const t=ws.getCell(totalsRow,c);t.fill=fill('D9EAF7');t.font=font('1F2937',true);t.border=BORDER;
    }
    for(let r=dataStart;r<=dataEnd;r++){
      const base=(r%2===0)?'F3F6F9':'FFFFFF';
      for(let c=1;c<=H.length;c++){const cell=ws.getCell(r,c);cell.fill=fill(base);cell.font=font('1F2937',false);cell.border=BORDER;cell.alignment={vertical:'top',wrapText:true};}
      const m=ws.getCell(r,idx['MATCH_STATUS']),mv=clean(m.value).toUpperCase();
      if(mv.includes('UNMATCHED')){m.fill=fill('FCE8E6');m.font=font('D93025',true);}else if(mv.includes('MATCHED')){m.fill=fill('E6F4EA');m.font=font('0F9D58',true);}
      const missed=ws.getCell(r,idx['DIS_MISSED_TOTAL']);if(typeof missed.value==='number'&&missed.value>0.03){missed.fill=fill('FCE8E6');missed.font=font('D93025',true);}
      ['CH2_WHOLESALE_CHECK','DIS_CH2_DISC_CHECK','DIS_UNIT_CHECK'].forEach(k=>{const cell=ws.getCell(r,idx[k]);if(clean(cell.value).toUpperCase().includes('MISMATCH'))cell.fill=fill('FFF4CE');});
    }
    for(const h of MONEY){const c=idx[h];for(let r=1;r<=totalsRow;r++)ws.getCell(r,c).numFmt='$#,##0.00';}
    for(const h of PCT){const c=idx[h];for(let r=dataStart;r<=dataEnd;r++)ws.getCell(r,c).numFmt='0.00';}
    for(let r=dataStart;r<=dataEnd;r++)ws.getCell(r,idx['CH2_QTY SUPPLIED']).numFmt='0.###';
    if(rows.length)ws.autoFilter={from:{row:2,column:1},to:{row:dataEnd,column:H.length}};
    ws.views=[{state:'frozen',ySplit:2,topLeftCell:'A3',showGridLines:false}];
    return wb;
  }

  async function exportReference(invoiceDocs,refs,posOrder,reconciliation){
    const outputs=PHF.linkedPos.buildReferenceOutputs(invoiceDocs,refs,posOrder,reconciliation);if(!outputs.length)throw new Error('No supplier invoice output could be created.');
    if(outputs.length===1){const wb=await buildWorkbook(outputs[0]);const buf=await wb.xlsx.writeBuffer();downloadBlob(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),outputs[0].filename);return outputs;}
    if(!global.JSZip)throw new Error('ZIP export library did not load. Refresh the page and try again.');
    const zip=new global.JSZip();for(const out of outputs){const wb=await buildWorkbook(out);zip.file(out.filename,await wb.xlsx.writeBuffer());}
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'});const stamp=new Date().toLocaleDateString('en-AU').replace(/\//g,'.');downloadBlob(blob,`CH2_CURRENT_RECONCILIATIONS_${stamp}.zip`);return outputs;
  }

  PHF.exportReference=exportReference;
})(window);
