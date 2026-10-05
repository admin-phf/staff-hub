(function(global){
  'use strict';

  const POS_DB_OUTPUT_COLUMNS=[
    'INDEX','POS_MASTER_BRAND','POS_MASTER_BARCODE','POS_PLU','POS_SUB_ID',
    'POS_BRAND','POS_DESCR','POS_POS_DESC','POS_DISSNO','POS_PROD_GRP',
    'POS_SUPPLIER','POS_LOYALTY_SCHEME','POS_UNITS','POS_MIN_ORDER_QTY',
    'POS_WSP_EXCGST','POS_LAST_PRICE','POS_GST_TAX_PC','POS_RRP_INCGST',
    'POS_PR_1_PC','POS_PR_2_PC','POS_PR_3_PC','POS_PR_4_PC','POS_PR_5_PC',
    'POS_PR_6_PC','POS_PR_7_PC','POS_PR_8_PC','POS_PR_9_PC','POS_RET_PRICE',
    'POS_PHARM_PROD','POS_SCALES','POS_ITEMSIZE','POS_PACKAGING','POS_SOH','STATUS'
  ];

  const STANDARD_MERGED_OUTPUT_COLUMNS=[
    'POS_INDEX','POS_MASTER_BRAND','POS_MASTER_BARCODE','POS_MAIN_ID','POS_PLU','POS_SUB_ID',
    'POS_BRAND','POS_DESCR','POS_POS_DESC','POS_DISSNO','POS_PROD_GRP','POS_SUPPLIER',
    'POS_LOYALTY_SCHEME','POS_UNITS','POS_MIN_ORDER_QTY','POS_WSP_EXCGST','POS_LAST_PRICE',
    'POS_GST_TAX_PC','POS_RRP_INCGST','POS_PR_1_PC','POS_PR_2_PC','POS_PR_3_PC','POS_PR_4_PC',
    'POS_PR_5_PC','POS_PR_6_PC','POS_PR_7_PC','POS_PR_8_PC','POS_PR_9_PC','POS_RET_PRICE',
    'POS_PHARM_PROD','POS_SCALES','POS_ITEMSIZE','POS_PACKAGING','POS_SOH'
  ];

  const BASE_COLUMNS=[
    'MAIN_ID','PLU','SUB_ID','BRAND','DESCR','POS_DESC','DISSNO','PROD_GRP','SUPPLIER',
    'LOYALTY_SCHEME','UNITS','MIN_ORDER_QTY','WSP_EXCGST','LAST_PRICE','GST_TAX_PC','RRP_INCGST',
    'PR_1_PC','PR_2_PC','PR_3_PC','PR_4_PC','PR_5_PC','PR_6_PC','PR_7_PC','PR_8_PC','PR_9_PC',
    'RET_PRICE','PHARM_PROD','SCALES','ITEMSIZE','PACKAGING','SOH'
  ];

  const TEXT_INPUT_COLUMNS=new Set(['MAIN_ID','SUB_ID','BRAND','DESCR','POS_DESC','PACKAGING']);
  const FLOAT_INPUT_COLUMNS=new Set(['WSP_EXCGST','LAST_PRICE','RRP_INCGST','LAST_DPRICE']);
  const STANDARD_TEXT_COLUMNS=new Set(['POS_MASTER_BARCODE','POS_MAIN_ID','POS_PLU','POS_SUB_ID','POS_BRAND','POS_DESCR','POS_POS_DESC','POS_PACKAGING']);
  const DB_TEXT_COLUMNS=new Set(['POS_MASTER_BARCODE','POS_PLU','POS_SUB_ID','POS_BRAND','POS_DESCR','POS_POS_DESC','POS_PACKAGING','STATUS']);
  const ALLOWED_EXT=['xls','xlsx','xlsm','csv'];

  const state={stock:null,template:null,brand:null,standardBlob:null,dbBlob:null,standardName:'',dbName:'',rows:0,brandSubstitutions:0,integrity:null};
  const $=s=>document.querySelector(s);
  const els={
    stockInput:$('#stockInput'),templateInput:$('#templateInput'),brandInput:$('#brandInput'),
    stockDrop:$('#stockDrop'),templateDrop:$('#templateDrop'),brandDrop:$('#brandDrop'),
    stockFiles:$('#stockFiles'),templateFiles:$('#templateFiles'),brandFiles:$('#brandFiles'),
    runBtn:$('#runBtn'),clearBtn:$('#clearBtn'),status:$('#status'),progress:$('#progress'),progressBar:$('#progressBar'),
    results:$('#results'),resultSub:$('#resultSub'),kpis:$('#kpis'),outputList:$('#outputList'),
    downloadStandardBtn:$('#downloadStandardBtn'),downloadDbBtn:$('#downloadDbBtn'),downloadBothBtn:$('#downloadBothBtn')
  };

  function prettySize(bytes){if(bytes<1024)return `${bytes} B`;if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} KB`;return `${(bytes/1024/1024).toFixed(1)} MB`;}
  function setStatus(text,type='info'){els.status.className=`status ${type}`;els.status.textContent=text;}
  function setProgress(v){els.progress.classList.remove('hidden');els.progressBar.style.width=`${Math.max(0,Math.min(100,v))}%`;}
  function hideProgress(){els.progress.classList.add('hidden');els.progressBar.style.width='0%';}
  function validFile(file){return file&&ALLOWED_EXT.includes((file.name.split('.').pop()||'').toLowerCase());}
  function updateRunState(){els.runBtn.disabled=!(state.stock&&state.template);if(!state.stock||!state.template)setStatus('Add BrowseStockItems1 and Product Insert Template to continue.','info');else setStatus('Required files ready. Brand Abbreviation is optional.','info');}
  function fileRow(file,onRemove){const div=document.createElement('div');div.className='file-row';const s=document.createElement('span');s.textContent=`✓ ${file.name} · ${prettySize(file.size)}`;const b=document.createElement('button');b.type='button';b.textContent='Remove';b.onclick=onRemove;div.append(s,b);return div;}
  function renderFiles(){
    els.stockFiles.innerHTML='';els.templateFiles.innerHTML='';els.brandFiles.innerHTML='';
    if(state.stock)els.stockFiles.append(fileRow(state.stock,()=>{state.stock=null;renderFiles();updateRunState();}));
    if(state.template)els.templateFiles.append(fileRow(state.template,()=>{state.template=null;renderFiles();updateRunState();}));
    if(state.brand)els.brandFiles.append(fileRow(state.brand,()=>{state.brand=null;renderFiles();updateRunState();}));
  }
  function assignFile(key,file){if(!validFile(file)){setStatus(`Unsupported file type: ${file?file.name:'unknown file'}`,'error');return;}state[key]=file;state.standardBlob=null;state.dbBlob=null;els.results.classList.add('hidden');renderFiles();updateRunState();}
  function wirePicker(key,input,drop){
    drop.addEventListener('click',()=>input.click());drop.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click();}});
    input.addEventListener('change',()=>{if(input.files&&input.files[0])assignFile(key,input.files[0]);input.value='';});
    ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('drag');}));
    ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('drag');}));
    drop.addEventListener('drop',e=>{const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f)assignFile(key,f);});
  }

  async function readWorkbookRows(file){
    const data=await file.arrayBuffer();
    const wb=XLSX.read(data,{type:'array',cellDates:false,raw:true});
    const ws=wb.Sheets[wb.SheetNames[0]];
    if(!ws)return {headers:[],rows:[]};
    const matrix=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true,blankrows:true});
    if(!matrix.length)return {headers:[],rows:[]};
    const first=matrix[0]||[];
    // Match the Python script: only non-empty first-row cells become headers.
    const headers=first.filter(v=>v!==null&&String(v).trim()!=='').map(v=>String(v).trim().toUpperCase());
    const rows=[];
    for(let r=1;r<matrix.length;r++){
      const source=matrix[r]||[],obj={};
      headers.forEach((header,i)=>{obj[header]=formatValue(source[i],header);});
      rows.push(obj);
    }
    return {headers,rows};
  }

  function cleanExcelText(value){
    // Excel XLSX cells are stored in XML. XML 1.0 does not permit control
    // characters U+0000-U+0008, U+000B, U+000C, or U+000E-U+001F.
    // Remove only those invisible/illegal bytes so source values such as
    // "AESSGLL\u0002" become the valid visible value "AESSGLL".
    return String(value).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'');
  }

  function formatValue(value,columnName){
    if(value===null||value===undefined)return '';
    if(TEXT_INPUT_COLUMNS.has(columnName))return cleanExcelText(value).trim().toUpperCase().replace(/'/g,'');
    if(FLOAT_INPUT_COLUMNS.has(columnName)){
      if(value==='')return 0;
      const n=Number(String(value));return Number.isFinite(n)?n:0;
    }
    const s=cleanExcelText(value).trim();
    if(s==='')return 0;
    const n=Number(s);
    if(Number.isFinite(n))return Math.trunc(n);
    return s.toUpperCase();
  }

  async function loadBrandMapping(file){
    if(!file)return new Map();
    const data=await file.arrayBuffer();
    const wb=XLSX.read(data,{type:'array',cellDates:false,raw:true});
    const ws=wb.Sheets[wb.SheetNames[0]];if(!ws)return new Map();
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true,blankrows:true});
    const dataRows=rows.length?rows.slice(1):rows,m=new Map();
    for(const row of dataRows){
      if(row.length>=2&&row[0]!=null&&row[1]!=null){const original=cleanExcelText(row[0]).trim().toUpperCase(),substitute=cleanExcelText(row[1]).trim();if(original&&substitute)m.set(original,substitute);}
    }
    return m;
  }

  function normalizeBarcode(value){if(value==null)return '';const digits=String(value).replace(/\D/g,'');return digits?digits.padStart(13,'0'):'';}
  function mergeData(stockData,templateData,brandMapping){
    const lookup=new Map();
    for(const r of templateData){lookup.set(`${String(r.MAIN_ID??'').trim()}\u0000${String(r.SUB_ID??'').trim()}`,r);}
    let substitutions=0;const merged=[];
    stockData.forEach((stockRow,i)=>{
      const key=`${String(stockRow.MAIN_ID??'').trim()}\u0000${String(stockRow.SUB_ID??'').trim()}`;
      const templateRow=lookup.get(key)||{},row={POS_INDEX:i+1};
      for(const col of BASE_COLUMNS){const sv=stockRow[col]??'',tv=templateRow[col]??'';row[`POS_${col}`]=(sv!==''&&sv!==null)?sv:tv;}
      const original=String(row.POS_BRAND??''),master=original&&brandMapping.has(original.trim().toUpperCase())?brandMapping.get(original.trim().toUpperCase()):original;
      if(master!==original&&original)substitutions++;
      row.POS_MASTER_BRAND=master;row.POS_MASTER_BARCODE=normalizeBarcode(row.POS_MAIN_ID);merged.push(row);
    });
    return {merged,substitutions};
  }

  function standardColumns(data){
    if(!data.length)return STANDARD_MERGED_OUTPUT_COLUMNS.slice();
    const keys=new Set();data.forEach(r=>Object.keys(r).forEach(k=>keys.add(k)));
    const cols=STANDARD_MERGED_OUTPUT_COLUMNS.filter(c=>keys.has(c));
    const extras=[...keys].filter(c=>!cols.includes(c)).sort();return cols.concat(extras);
  }
  function compareText(a,b){const x=String(a??'').trim().toUpperCase(),y=String(b??'').trim().toUpperCase();return x<y?-1:x>y?1:0;}
  function dbSortedRows(data){
    return data.slice().sort((a,b)=>compareText(a.POS_MASTER_BRAND,b.POS_MASTER_BRAND)||compareText(a.POS_BRAND,b.POS_BRAND)||compareText(a.POS_DESCR,b.POS_DESCR)||compareText(a.POS_MASTER_BARCODE,b.POS_MASTER_BARCODE));
  }

  function addRowsToWorksheet(ws,columns,rows,textColumns){
    ws.addRow(columns);
    ws.getRow(1).font={bold:true};
    rows.forEach(row=>ws.addRow(columns.map(c=>row[c]??'')));
    ws.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,ws.rowCount),column:columns.length}};
    ws.views=[{state:'frozen',ySplit:1}];
    // Match the Python workbook's simple no-wrap/top-aligned presentation.
    ws.eachRow({includeEmpty:true},row=>row.eachCell({includeEmpty:true},cell=>{
      cell.alignment={wrapText:false,shrinkToFit:false,vertical:'top'};
    }));
    columns.forEach((name,index)=>{
      if(!textColumns.has(name))return;
      const col=ws.getColumn(index+1);col.numFmt='@';
      col.eachCell({includeEmpty:true},cell=>{cell.numFmt='@';});
    });
  }

  async function buildWorkbook(sheetName,columns,rows,textColumns){
    const wb=new ExcelJS.Workbook();const ws=wb.addWorksheet(sheetName);addRowsToWorksheet(ws,columns,rows,textColumns);const buf=await wb.xlsx.writeBuffer();return new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }

  function comparableValue(v){
    if(v===null||v===undefined)return '';
    if(typeof v==='number')return Number.isFinite(v)?v:String(v);
    return cleanExcelText(v);
  }
  function valuesEqual(actual,expected){
    const a=comparableValue(actual),e=comparableValue(expected);
    if(typeof a==='number'&&typeof e==='number')return Object.is(a,e)||Math.abs(a-e)<1e-12;
    return a===e;
  }
  async function verifyWorkbookBlob(blob,sheetName,columns,rows,textColumns){
    if(!global.XLSX)throw new Error('Spreadsheet validation library did not load.');
    const buffer=await blob.arrayBuffer();
    const wb=XLSX.read(buffer,{type:'array',raw:true,cellFormula:true,cellNF:true});
    if(wb.SheetNames.length!==1||wb.SheetNames[0]!==sheetName){
      throw new Error(`${sheetName}: unexpected worksheet name or worksheet count.`);
    }
    const ws=wb.Sheets[sheetName];
    const matrix=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true,blankrows:true});
    if(matrix.length!==rows.length+1){
      throw new Error(`${sheetName}: expected ${rows.length} data rows but workbook contains ${Math.max(0,matrix.length-1)}.`);
    }
    const actualHeaders=matrix[0]||[];
    if(actualHeaders.length!==columns.length||columns.some((c,i)=>String(actualHeaders[i]??'')!==c)){
      throw new Error(`${sheetName}: exported columns do not exactly match the required layout.`);
    }
    for(let r=0;r<rows.length;r++){
      const actualRow=matrix[r+1]||[],expectedRow=rows[r];
      for(let c=0;c<columns.length;c++){
        const name=columns[c],actual=actualRow[c]??'',expected=expectedRow[name]??'';
        if(!valuesEqual(actual,expected)){
          throw new Error(`${sheetName}: integrity mismatch at row ${r+2}, column ${name}. Expected “${expected}”, got “${actual}”.`);
        }
        // Match Python force_text_columns(): Excel's number format must be Text (@).
        // The Python writer does not coerce an already-numeric PLU/SUB ID into a string;
        // it applies number_format='@'. Therefore validating cell.t === 's' would be
        // stricter than the supplied Python and can falsely reject a correct workbook.
        if(textColumns.has(name)){
          const addr=XLSX.utils.encode_cell({r:r+1,c});
          const cell=ws[addr];
          if(cell&&cell.z!=='@')throw new Error(`${sheetName}: ${name} at row ${r+2} is missing the required Excel Text (@) format.`);
        }
      }
    }
    return {sheetName,rows:rows.length,columns:columns.length,verified:true};
  }
  function verifyMergedModel(merged,dbRows){
    for(let i=0;i<merged.length;i++){
      if(merged[i].POS_INDEX!==i+1)throw new Error(`Merged model: POS_INDEX is not sequential at source row ${i+2}.`);
      const expectedBarcode=normalizeBarcode(merged[i].POS_MAIN_ID);
      if(merged[i].POS_MASTER_BARCODE!==expectedBarcode)throw new Error(`Merged model: barcode normalisation mismatch at source row ${i+2}.`);
    }
    for(let i=0;i<dbRows.length;i++){
      if(dbRows[i].INDEX!==i+1)throw new Error(`POS DB model: INDEX is not sequential at output row ${i+2}.`);
      if(dbRows[i].STATUS!=='')throw new Error(`POS DB model: STATUS is not blank at output row ${i+2}.`);
      if(i>0&&(
        compareText(dbRows[i-1].POS_MASTER_BRAND,dbRows[i].POS_MASTER_BRAND)>0||
        (compareText(dbRows[i-1].POS_MASTER_BRAND,dbRows[i].POS_MASTER_BRAND)===0&&compareText(dbRows[i-1].POS_BRAND,dbRows[i].POS_BRAND)>0)||
        (compareText(dbRows[i-1].POS_MASTER_BRAND,dbRows[i].POS_MASTER_BRAND)===0&&compareText(dbRows[i-1].POS_BRAND,dbRows[i].POS_BRAND)===0&&compareText(dbRows[i-1].POS_DESCR,dbRows[i].POS_DESCR)>0)||
        (compareText(dbRows[i-1].POS_MASTER_BRAND,dbRows[i].POS_MASTER_BRAND)===0&&compareText(dbRows[i-1].POS_BRAND,dbRows[i].POS_BRAND)===0&&compareText(dbRows[i-1].POS_DESCR,dbRows[i].POS_DESCR)===0&&compareText(dbRows[i-1].POS_MASTER_BARCODE,dbRows[i].POS_MASTER_BARCODE)>0)
      ))throw new Error(`POS DB model: sort order mismatch at output row ${i+2}.`);
    }
  }
  function melbourneDate(){
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Australia/Melbourne',day:'2-digit',month:'2-digit',year:'2-digit'}).formatToParts(new Date());
    const get=t=>parts.find(p=>p.type===t)?.value||'';return `${get('day')}.${get('month')}.${get('year')}`;
  }
  function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}

  async function run(){
    if(!state.stock||!state.template)return;
    els.runBtn.disabled=true;els.results.classList.add('hidden');setStatus('Reading POS source files…','info');setProgress(8);
    try{
      const stock=await readWorkbookRows(state.stock);setProgress(25);
      const template=await readWorkbookRows(state.template);setProgress(42);
      const brandMap=await loadBrandMapping(state.brand);setProgress(52);
      if(!stock.rows.length)throw new Error('BrowseStockItems1 could not be read or contains no data rows.');
      if(!template.rows.length)throw new Error('Product Insert Template could not be read or contains no data rows.');
      setStatus('Merging POS records…','info');
      const {merged,substitutions}=mergeData(stock.rows,template.rows,brandMap);setProgress(67);
      const stdCols=standardColumns(merged);
      const dbRows=dbSortedRows(merged).map((r,i)=>({...r,INDEX:i+1,STATUS:''}));
      setStatus('Building Excel workbooks…','info');
      verifyMergedModel(merged,dbRows);
      const standardBlob=await buildWorkbook('Clean_Merged_POS_Data',stdCols,merged,STANDARD_TEXT_COLUMNS);setProgress(80);
      const dbBlob=await buildWorkbook('POS_DB_Data',POS_DB_OUTPUT_COLUMNS,dbRows,DB_TEXT_COLUMNS);setProgress(90);
      setStatus('Verifying both generated workbooks cell-by-cell…','info');
      const standardCheck=await verifyWorkbookBlob(standardBlob,'Clean_Merged_POS_Data',stdCols,merged,STANDARD_TEXT_COLUMNS);setProgress(95);
      const dbCheck=await verifyWorkbookBlob(dbBlob,'POS_DB_Data',POS_DB_OUTPUT_COLUMNS,dbRows,DB_TEXT_COLUMNS);setProgress(99);
      state.integrity={standard:standardCheck,db:dbCheck};
      const date=melbourneDate();
      state.standardName=`clean_merged_pos_data_${date}.xlsx`;state.dbName=`clean_merged_pos_data_pos_db_${date}.xlsx`;
      state.standardBlob=standardBlob;state.dbBlob=dbBlob;state.rows=merged.length;state.brandSubstitutions=substitutions;
      renderResults(brandMap.size);setProgress(100);setTimeout(hideProgress,250);setStatus(`Verified complete — ${merged.length.toLocaleString()} POS rows merged and both output workbooks passed cell-by-cell integrity checks.`, 'success');
    }catch(err){console.error(err);hideProgress();setStatus(`Error: ${err&&err.message?err.message:String(err)}`,'error');}
    finally{els.runBtn.disabled=!(state.stock&&state.template);}
  }

  function renderResults(mappingCount){
    els.resultSub.textContent=`${state.rows.toLocaleString()} records written using the same merge priority and output structures as the supplied Python POS merger.`;
    els.kpis.innerHTML=`<div class="kpi"><strong>${state.rows.toLocaleString()}</strong><span>ROWS MERGED</span></div><div class="kpi"><strong>${state.brandSubstitutions.toLocaleString()}</strong><span>BRAND SUBSTITUTIONS</span></div><div class="kpi"><strong>${mappingCount.toLocaleString()}</strong><span>BRAND MAPPINGS LOADED</span></div><div class="kpi"><strong>${state.integrity?'2 / 2':'—'}</strong><span>OUTPUTS VERIFIED</span></div>`;
    els.outputList.innerHTML=`<div class="output-row"><code>${state.standardName}</code><span>Standard merged output · original merge order</span></div><div class="output-row"><code>${state.dbName}</code><span>POS DB output · sorted by master brand · INDEX first · STATUS last</span></div>`;
    els.results.classList.remove('hidden');els.results.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function clearAll(){state.stock=null;state.template=null;state.brand=null;state.standardBlob=null;state.dbBlob=null;state.integrity=null;renderFiles();els.results.classList.add('hidden');hideProgress();updateRunState();}

  wirePicker('stock',els.stockInput,els.stockDrop);wirePicker('template',els.templateInput,els.templateDrop);wirePicker('brand',els.brandInput,els.brandDrop);
  els.runBtn.addEventListener('click',run);els.clearBtn.addEventListener('click',clearAll);
  els.downloadStandardBtn.addEventListener('click',()=>{if(state.standardBlob)downloadBlob(state.standardBlob,state.standardName);});
  els.downloadDbBtn.addEventListener('click',()=>{if(state.dbBlob)downloadBlob(state.dbBlob,state.dbName);});
  els.downloadBothBtn.addEventListener('click',()=>{if(state.standardBlob)downloadBlob(state.standardBlob,state.standardName);if(state.dbBlob)setTimeout(()=>downloadBlob(state.dbBlob,state.dbName),250);});
  updateRunState();
})(window);
