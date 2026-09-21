const state={pos:null,invoices:[]};

const els={
  posDrop:document.querySelector('#posDrop'),
  posInput:document.querySelector('#posInput'),
  posFiles:document.querySelector('#posFiles'),
  invoiceDrop:document.querySelector('#invoiceDrop'),
  invoiceInput:document.querySelector('#invoiceInput'),
  invoiceFiles:document.querySelector('#invoiceFiles'),
  runBtn:document.querySelector('#runBtn'),
  clearBtn:document.querySelector('#clearBtn'),
  status:document.querySelector('#status')
};

function validExt(file,allowed){
  const ext='.'+(file.name.split('.').pop()||'').toLowerCase();
  return allowed.includes(ext);
}
function prettySize(bytes){
  if(bytes<1024)return `${bytes} B`;
  if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1024/1024).toFixed(1)} MB`;
}
function row(file,onRemove){
  const div=document.createElement('div'); div.className='file-row';
  const label=document.createElement('span'); label.textContent=`✓ ${file.name} · ${prettySize(file.size)}`;
  const btn=document.createElement('button'); btn.type='button'; btn.textContent='Remove'; btn.onclick=onRemove;
  div.append(label,btn); return div;
}
function render(){
  els.posFiles.replaceChildren();
  if(state.pos) els.posFiles.append(row(state.pos,()=>{state.pos=null;render();}));
  els.invoiceFiles.replaceChildren();
  state.invoices.forEach((f,i)=>els.invoiceFiles.append(row(f,()=>{state.invoices.splice(i,1);render();})));
  const ready=!!state.pos&&state.invoices.length>0;
  els.runBtn.disabled=!ready;
  els.status.className='status '+(ready?'ok':'info');
  els.status.textContent=ready
    ? `Ready: 1 POS order and ${state.invoices.length} supplier invoice${state.invoices.length===1?'':'s'} selected.`
    : 'Add one POS order and at least one supplier invoice to continue.';
}
function addPos(files){
  const file=[...files].find(f=>validExt(f,['.xls','.xlsx','.csv']));
  if(file) state.pos=file;
  render();
}
function addInvoices(files){
  for(const file of files){
    if(validExt(file,['.pdf','.xls','.xlsx','.csv'])&&!state.invoices.some(x=>x.name===file.name&&x.size===file.size)) state.invoices.push(file);
  }
  render();
}
function wireDrop(zone,input,handler){
  zone.onclick=()=>input.click();
  zone.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click();}};
  input.onchange=()=>handler(input.files);
  ['dragenter','dragover'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.add('drag');}));
  ['dragleave','drop'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.remove('drag');}));
  zone.addEventListener('drop',e=>handler(e.dataTransfer.files));
}
wireDrop(els.posDrop,els.posInput,addPos);
wireDrop(els.invoiceDrop,els.invoiceInput,addInvoices);
els.clearBtn.onclick=()=>{state.pos=null;state.invoices=[];els.posInput.value='';els.invoiceInput.value='';render();};
els.runBtn.onclick=()=>{
  els.status.className='status warn';
  els.status.textContent='The file-selection shell is working. The actual POS / CH2 parsing and reconciliation engine is the next component to connect.';
};
render();
