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
    if(kind==='check'){if(s==='OK')return 'good';if(s.includes('MISMATCH'))return 'bad';if(s.includes('NO RULE')||s.includes('NO CHECK')||s.includes('MISSING'))return 'muted';}
    return '';
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

    // Force Excel Middle Align for every populated output cell, while preserving horizontal alignment choices.
    for(let r=1;r<=totalsRow;r++)for(let c=1;c<=HEADERS.length;c++){const cell=ws.getCell(r,c);cell.alignment={...(cell.alignment||{}),vertical:'middle'};}
    if(rows.length)ws.autoFilter={from:{row:2,column:1},to:{row:dataEnd,column:HEADERS.length}};
    ws.views=[{state:'frozen',ySplit:2,topLeftCell:'A3',showGridLines:false}];ws.pageSetup={orientation:'landscape'};
    return wb;
  }

  async function buildValidatedBuffer(output,posOrder){
    const wb=await buildWorkbook(output),buffer=await wb.xlsx.writeBuffer(),validation=await PHF.integrity.validateWorkbookBuffer(buffer,output,posOrder);
    if(!validation.ok)throw new Error(`Excel integrity validation failed: ${validation.errors.join(' | ')}`);return {buffer,validation};
  }

  async function exportReference(invoiceDocs,refs,posOrder,reconciliation){
    const outputs=PHF.linkedPos.buildReferenceOutputs(invoiceDocs,refs,posOrder,reconciliation);if(!outputs.length)throw new Error('No supplier invoice output could be created.');
    if(outputs.length===1){const built=await buildValidatedBuffer(outputs[0],posOrder);downloadBlob(new Blob([built.buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),outputs[0].filename);return outputs;}
    if(!global.JSZip)throw new Error('ZIP export library did not load. Refresh the page and try again.');
    const zip=new global.JSZip();for(const out of outputs){const built=await buildValidatedBuffer(out,posOrder);zip.file(out.filename,built.buffer);}
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'}),stamp=new Date().toLocaleDateString('en-AU').replace(/\//g,'.');downloadBlob(blob,`CH2_CURRENT_RECONCILIATIONS_${stamp}.zip`);return outputs;
  }

  PHF.report={buildWorkbook,buildValidatedBuffer};
  PHF.exportReference=exportReference;
})(window);
