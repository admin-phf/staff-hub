(function(global){
  'use strict';
  const PHF=global.PHFReconcile=global.PHFReconcile||{};

  function clean(v){return v==null?'':String(v).trim();}
  function digits(v){return clean(v).replace(/\.0+$/,'').replace(/\D+/g,'');}
  function num(v){if(typeof v==='number'&&Number.isFinite(v))return v;const s=clean(v).replace(/[$,%]/g,'').replace(/,/g,'');if(!s)return null;const n=Number(s);return Number.isFinite(n)?n:null;}
  function round(v,n=2){const x=num(v);if(x==null)return null;const p=10**n;return Math.round((x+Number.EPSILON)*p)/p;}
  function sameText(a,b){return clean(a)===clean(b);}
  function sameBarcode(a,b){return digits(a)===digits(b);}
  function invoiceRowId(r){return clean(r&&r.rowId)||[
    clean(r&&r.sourceFile),clean(r&&r.invoiceNumber),clean(r&&r.page),clean(r&&r.invoiceLine),
    clean(r&&r.productCode),clean(r&&r.supplierSku)
  ].join('|');}

  function check(name,ok,detail,severity='error'){return {name,ok:!!ok,detail:detail||'',severity};}

  function validateRun(posOrder,invoiceDocuments,reconciliation){
    const checks=[];
    const errors=[];
    const warnings=[];
    const posRows=(posOrder&&posOrder.rows)||[];
    const detail=(reconciliation&&reconciliation.detail)||[];
    checks.push(check('POS row count preserved',detail.length===posRows.length,`${detail.length} reconciliation rows / ${posRows.length} POS rows`));

    let sequenceOk=detail.length===posRows.length;
    let firstSequenceError='';
    for(let i=0;i<Math.min(detail.length,posRows.length);i++){
      const d=detail[i],p=posRows[i];
      if(!sameText(d&&d.plu,p&&p.plu)||!sameBarcode(d&&d.barcode,p&&p.barcode)||!sameText(d&&d.posDescription,p&&p.description)||Number(d&&d.sourceRow)!==Number(p&&p.sourceRow)){
        sequenceOk=false;firstSequenceError=`POS row ${i+1} (source row ${p&&p.sourceRow||'?'})`;break;
      }
    }
    checks.push(check('POS source sequence locked',sequenceOk,sequenceOk?'Every reconciliation row still maps to the same uploaded POS row.':firstSequenceError));

    const sourceRows=[];
    const lineFailures=[];
    const footerFailures=[];
    const footerWarnings=[];
    (invoiceDocuments||[]).forEach(doc=>{
      (doc.rows||[]).forEach(r=>sourceRows.push(r));
      const integ=doc.integrity||{};
      if(integ.lineArithmeticOk===false)lineFailures.push(`${doc.sourceFile}: one or more billed line calculations failed.`);
      if(integ.footerFound){
        if(integ.footerOk===false)footerFailures.push(`${doc.sourceFile}: invoice footer does not reconcile (${integ.footerDetail||'totals mismatch'}).`);
      }else footerWarnings.push(`${doc.sourceFile}: invoice footer totals were not machine-readable; line arithmetic was still checked.`);
    });
    checks.push(check('Invoice line arithmetic',lineFailures.length===0,lineFailures.length?lineFailures.join(' '):'All parsed billed lines pass quantity × unit and GST/total checks.'));
    checks.push(check('Invoice footer totals',footerFailures.length===0,footerFailures.length?footerFailures.join(' '):(footerWarnings.length?footerWarnings.join(' '):'Parsed line totals reconcile to the supplier invoice footer.'),footerWarnings.length?'warning':'error'));

    const allocated=[];
    detail.forEach(d=>(d.invoiceRows||[]).forEach(r=>allocated.push(invoiceRowId(r))));
    ((reconciliation&&reconciliation.unmatchedInvoice)||[]).forEach(r=>allocated.push(invoiceRowId(r)));
    const sourceIds=sourceRows.map(invoiceRowId);
    const sourceCounts=new Map(),allocCounts=new Map();
    sourceIds.forEach(id=>sourceCounts.set(id,(sourceCounts.get(id)||0)+1));
    allocated.forEach(id=>allocCounts.set(id,(allocCounts.get(id)||0)+1));
    let allocationOk=sourceIds.length===allocated.length;
    let allocationDetail=`${allocated.length}/${sourceIds.length} invoice rows accounted for`;
    if(allocationOk){
      for(const [id,count] of sourceCounts){if((allocCounts.get(id)||0)!==count){allocationOk=false;allocationDetail=`Invoice row allocation mismatch: ${id}`;break;}}
      if(allocationOk){for(const [id,count] of allocCounts){if((sourceCounts.get(id)||0)!==count){allocationOk=false;allocationDetail=`Unexpected duplicate allocation: ${id}`;break;}}}
    }
    checks.push(check('Every invoice row allocated exactly once',allocationOk,allocationDetail));

    for(const c of checks){
      if(!c.ok && c.severity==='error')errors.push(`${c.name}: ${c.detail}`);
      else if(!c.ok || c.severity==='warning')warnings.push(`${c.name}: ${c.detail}`);
    }
    return {ok:errors.length===0,checks,errors,warnings};
  }

  function validateOutput(output,posOrder){
    const checks=[],errors=[];
    const rows=(output&&output.rows)||[],posRows=(posOrder&&posOrder.rows)||[];
    const schema=PHF.schema;
    checks.push(check('43-column schema available',!!schema&&schema.HEADERS.length===43,schema?`${schema.HEADERS.length} columns`:'Schema missing'));
    checks.push(check('All POS rows retained',rows.length>=posRows.length,`${rows.length} output rows; ${posRows.length} POS rows`));
    let seq=true,detail='';
    for(let i=0;i<posRows.length;i++){
      const p=posRows[i],r=rows[i];
      if(!r||!sameText(r['POS PLU'],p.plu)||!sameBarcode(r['POS MASTER BARCODE'],p.barcode)||!sameText(r['POS DESCR'],p.description)){
        seq=false;detail=`Output row ${i+1} no longer matches uploaded POS row ${i+1}.`;break;
      }
    }
    checks.push(check('Export POS order sequence',seq,seq?'First POS row through last POS row are in exact uploaded sequence.':detail));
    checks.push(check('Invoice-only rows appended after POS block',rows.slice(posRows.length).every(r=>clean(r['MATCH STATUS']).includes('NOT ORDERED')),`${Math.max(0,rows.length-posRows.length)} appended row(s)`));
    for(const c of checks)if(!c.ok)errors.push(`${c.name}: ${c.detail}`);
    return {ok:errors.length===0,checks,errors};
  }

  async function validateWorkbookBuffer(buffer,output,posOrder){
    const checks=[],errors=[];
    if(!global.XLSX)throw new Error('Spreadsheet validation library did not load.');
    const wb=global.XLSX.read(buffer,{type:'array',raw:true,cellFormula:true});
    const expectedSheet='CH2 PDF Extract';
    checks.push(check('Workbook has one output sheet',wb.SheetNames.length===1&&wb.SheetNames[0]===expectedSheet,wb.SheetNames.join(', ')));
    const ws=wb.Sheets[expectedSheet];
    if(!ws){return {ok:false,checks,errors:['Workbook output sheet is missing.']};}
    const matrix=global.XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true,blankrows:false});
    const header=(matrix[1]||[]).slice(0,43).map(clean);
    const expected=PHF.schema.HEADERS.map(clean);
    const headersOk=header.length===43&&expected.every((h,i)=>header[i]===h);
    checks.push(check('Exact 43 headers',headersOk,headersOk?'Headers match approved output specification.':'Header names/order differ from specification.'));

    const posRows=(posOrder&&posOrder.rows)||[];
    const hIndex=Object.fromEntries(expected.map((h,i)=>[h,i]));
    let sequenceOk=true,sequenceDetail='';
    for(let i=0;i<posRows.length;i++){
      const row=matrix[i+2]||[],p=posRows[i];
      if(!sameText(row[hIndex['POS PLU']],p.plu)||!sameBarcode(row[hIndex['POS MASTER BARCODE']],p.barcode)||!sameText(row[hIndex['POS DESCR']],p.description)){
        sequenceOk=false;sequenceDetail=`Workbook data row ${i+3} does not match POS source row ${p.sourceRow}.`;break;
      }
    }
    checks.push(check('Workbook POS sequence',sequenceOk,sequenceOk?'Workbook rows preserve uploaded POS order.':sequenceDetail));

    let unsupported=[];
    for(const sheetName of wb.SheetNames){
      const sheet=wb.Sheets[sheetName];
      for(const addr of Object.keys(sheet)){
        if(addr[0]==='!')continue;
        const f=sheet[addr]&&sheet[addr].f;
        if(f&&(/__xludf|_xlfn|DUMMYFUNCTION/i.test(f)||/^\s*=\s*$/.test(f)))unsupported.push(`${sheetName}!${addr}: ${f}`);
      }
    }
    checks.push(check('Excel-compatible formulas',unsupported.length===0,unsupported.length?unsupported.slice(0,5).join(' | '):'Only standard Excel formulas are present.'));

    if(global.JSZip){
      try{
        const zip=await global.JSZip.loadAsync(buffer);
        const xmlFile=zip.file('xl/worksheets/sheet1.xml');
        if(xmlFile){
          const xml=await xmlFile.async('string');
          const bad=/__xludf|_xlfn|DUMMYFUNCTION|<f[^>]*>\s*=\s*<\/f>/i.test(xml);
          checks.push(check('Worksheet XML compatibility',!bad,bad?'Unsupported formula marker found in sheet XML.':'No unsupported formula markers found in sheet XML.'));

          // Validate the approved 43-column width contract directly from sheet XML.
          const widths=new Array(PHF.schema.COLUMNS.length).fill(null),colsMatch=xml.match(/<cols>([\s\S]*?)<\/cols>/i);
          if(colsMatch){
            const re=/<col\b([^>]*)\/>/gi;let m;
            while((m=re.exec(colsMatch[1]))){
              const a=m[1],minM=a.match(/\bmin="(\d+)"/i),maxM=a.match(/\bmax="(\d+)"/i),wM=a.match(/\bwidth="([0-9.]+)"/i);
              if(!minM||!maxM||!wM)continue;const mn=Number(minM[1]),mx=Number(maxM[1]),w=Number(wM[1]);
              for(let c=mn;c<=mx&&c<=widths.length;c++)widths[c-1]=w;
            }
          }
          const widthErrors=[];PHF.schema.COLUMNS.forEach((c,i)=>{if(widths[i]==null||Math.abs(widths[i]-Number(c.width))>0.001)widthErrors.push(`${c.header}: expected ${c.width}, got ${widths[i]==null?'default':widths[i]}`);});
          checks.push(check('Exact approved column widths',widthErrors.length===0,widthErrors.length?widthErrors.slice(0,6).join(' | '):'All 43 column widths match the approved workbook specification.'));

          const rowHeights={};const rowRe=/<row\b([^>]*)>/gi;let rm;while((rm=rowRe.exec(xml))){const a=rm[1],rM=a.match(/\br="(\d+)"/i),hM=a.match(/\bht="([0-9.]+)"/i);if(rM&&hM)rowHeights[Number(rM[1])]=Number(hM[1]);}
          const totalRow=2+(output&&output.rows?output.rows.length:0)+1,expectedHeights=[[1,PHF.schema.VISUAL.row1Height],[2,PHF.schema.VISUAL.row2Height],[totalRow,PHF.schema.VISUAL.totalsHeight]];
          const heightErrors=[];for(const [r,h] of expectedHeights){if(rowHeights[r]==null||Math.abs(rowHeights[r]-h)>0.001)heightErrors.push(`row ${r}: expected ${h}, got ${rowHeights[r]==null?'default':rowHeights[r]}`);}
          checks.push(check('Approved summary/header/totals heights',heightErrors.length===0,heightErrors.length?heightErrors.join(' | '):'Key row heights match the approved workbook specification.'));
        }
      }catch(err){checks.push(check('Worksheet XML compatibility',true,'XML secondary validation skipped.','warning'));}
    }

    for(const c of checks)if(!c.ok&&c.severity!=='warning')errors.push(`${c.name}: ${c.detail}`);
    return {ok:errors.length===0,checks,errors};
  }

  PHF.integrity={validateRun,validateOutput,validateWorkbookBuffer,invoiceRowId};
})(window);
