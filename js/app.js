// Lógica do fluxograma — render do grafo, painel lateral, drag/drop,
// import/export Mermaid e persistência em sessionStorage.
// Dados (DEFAULT_DATA, COLORS, SUPPORT_DATA, OTHER_AREAS) vêm de data.js.
//
// Observação: funções addNodeGlobal/openMermaid/exportHTML/resetAll/
// confirmAddNode/saveNode foram preservadas da versão antiga, que tinha
// botões de edição no cabeçalho. Hoje o HTML não liga esses handlers,
// mas o código fica pronto pra quando a UI de edição voltar.

let S = load();
let curNode = null, curTab = 'info';
let mmdView_ = 'export';
let dragSrc = null;

function load(){
  try{ const s = sessionStorage.getItem('coop1'); if(s) return JSON.parse(s); }catch(e){}
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}
function save_(){ sessionStorage.setItem('coop1', JSON.stringify(S)); }
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function uid(){ return 'n-'+ Math.random().toString(36).slice(2,8); }

// ── RENDER ──────────────────────────────────────────────────────
function render(){
  const flow = document.getElementById('flow');
  flow.innerHTML = '';

  // Legend
  const lgData = [
    {color:'blue', label:'Comercial / Faturamento'},
    {color:'amber', label:'Cadastro / Programação'},
    {color:'green', label:'Financeiro'},
    {color:'purple', label:'Fiscal / CTE'},
    {color:'coral', label:'Monitoramento'},
    {color:'pink', label:'Contabilidade'},
    {color:'red', label:'Desvio / Reprovação'}
  ];
  const lg = document.createElement('div');
  lg.className = 'legend';
  lgData.forEach(({color,label}) => {
    const item = document.createElement('div');
    item.className = 'lg-item';
    item.innerHTML = `<div class="lg-dot" style="background:${COLOR_HEX[color]}"></div><span>${label}</span>`;
    lg.appendChild(item);
  });
  flow.appendChild(lg);

  // Support bar (setores de apoio que atravessam todo o fluxo)
  flow.appendChild(makeSupportBar());

  // START pill
  flow.appendChild(makePill('Início da operação'));
  flow.appendChild(makeConn(''));

  S.phases.forEach((phase, pi) => {
    // Phase header
    const ph = document.createElement('div');
    ph.className = 'phase-header';
    ph.innerHTML = `<div class="ph-num">${pi+1}</div><div class="ph-label">${esc(phase.label)}</div><div class="ph-line"></div>`;
    flow.appendChild(ph);

    phase.nodes.forEach((slot, si) => {
      if(slot.layout === 'single'){
        const nd = S.nodes[slot.id];
        if(!nd) return;
        flow.appendChild(makeNode(slot.id, nd));
      } else if(slot.layout === 'row'){
        const row = document.createElement('div');
        row.className = 'row';
        slot.items.forEach(nid => {
          const nd = S.nodes[nid];
          if(nd) row.appendChild(makeNode(nid, nd));
        });
        flow.appendChild(row);
      } else if(slot.layout === 'branches'){
        flow.appendChild(makeBranchBlock(slot));
      }

      if(si < phase.nodes.length - 1){
        flow.appendChild(makeConn('', slot.id));
      }
    });

    if(pi < S.phases.length - 1) flow.appendChild(makeConn(''));
  });

  flow.appendChild(makeConn(''));
  flow.appendChild(makePill('Fim da operação'));

  // ── Outras áreas (fora do fluxo de frete) ──
  flow.appendChild(makeOtherAreas());
}

function makePill(txt){
  const d = document.createElement('div');
  d.className = 'pill';
  d.textContent = txt;
  return d;
}

function makeSupportBar(){
  const bar = document.createElement('div');
  bar.className = 'support-bar';
  const groupsHtml = SUPPORT_DATA.map(grp=>`<div class="oa-group"><div class="sb-group-tit">${esc(grp.g)}</div><div class="area-fn">${esc(grp.fn)}</div></div>`).join('');
  bar.innerHTML = `
    <div class="support-head" onclick="this.parentNode.classList.toggle('open')">
      <div class="sb-ic">⚙</div>
      <div class="sb-tit">Setores de apoio · atravessam todo o fluxo</div>
      <div class="sb-arrow">▶</div>
    </div>
    <div class="support-body">${groupsHtml}</div>`;
  return bar;
}

function makeOtherAreas(){
  const wrap = document.createElement('div');
  wrap.className = 'other-wrap';
  const cards = OTHER_AREAS.map(a=>{
    const groups = a.groups.map(gr=>`<div class="oa-group"><div class="sb-group-tit">${esc(gr.g)}</div><div class="area-fn">${esc(gr.fn)}</div></div>`).join('');
    return `<div class="oa-card c-${a.color}">
      <div class="oa-head" onclick="this.parentNode.classList.toggle('open')">
        <div class="oa-ic">${a.icon}</div>
        <div class="oa-tt"><div class="oa-title">${esc(a.title)}</div><div class="oa-desc">${esc(a.desc)}</div></div>
        <div class="sb-arrow">▶</div>
      </div>
      <div class="oa-body">${groups}</div>
    </div>`;
  }).join('');
  wrap.innerHTML = `
    <div class="phase-header" style="margin-top:34px"><div class="ph-num" style="background:var(--surface3)">+</div><div class="ph-label">Outras áreas · fora do fluxo de frete</div><div class="ph-line"></div></div>
    <div class="oa-note">Áreas com operação própria que não fazem parte do ciclo da carga, mas integram o grupo.</div>
    ${cards}`;
  return wrap;
}

function makeConn(lbl, afterSlotId){
  const wrap = document.createElement('div');
  wrap.className = 'conn';
  wrap.style.position = 'relative';
  const line = document.createElement('div');
  line.className = 'conn-line med';
  wrap.appendChild(line);
  if(lbl){ const l = document.createElement('div'); l.className='conn-lbl'; l.textContent=lbl; wrap.appendChild(l); }
  return wrap;
}

function makeBranchBlock(slot){
  const wrapper = document.createElement('div');
  wrapper.className = 'bif-wrapper';

  const cols = document.createElement('div');
  cols.className = 'bif-cols';

  slot.branches.forEach((branch, bi) => {
    const col = document.createElement('div');
    col.className = 'bif-col';

    const hdr = document.createElement('div');
    hdr.className = 'bif-col-hdr';
    const ramoClass = bi === 0 ? 'ramo ramo-a' : 'ramo ramo-b';
    const ramoLetter = bi === 0 ? 'A' : 'B';
    const ramoDesc = bi === 0 ? 'Recebimento do cliente' : 'Pagamento ao cooperado';
    hdr.innerHTML = `<div class="${ramoClass}">Ramo ${ramoLetter}</div><div class="ramo-sub">${ramoDesc}</div>`;
    col.appendChild(hdr);

    const body = document.createElement('div');
    body.className = 'bif-col-body';

    branch.items.forEach((nid, idx) => {
      const nd = S.nodes[nid];
      if(!nd) return;
      if(idx > 0){
        const c = makeConn('');
        c.style.alignSelf = 'center';
        body.appendChild(c);
      }
      body.appendChild(makeNode(nid, nd));
    });

    col.appendChild(body);
    cols.appendChild(col);
  });

  wrapper.appendChild(cols);
  return wrapper;
}

function makeNode(id, d){
  const el = document.createElement('div');
  el.className = `node c-${d.color}`;
  el.id = id;
  el.draggable = true;
  el.dataset.nodeId = id;
  el.innerHTML = `
    <span class="drag-handle" title="Arrastar">⠿</span>
    <div class="n-tag">${esc(d.sector)}</div>
    <div class="n-tit">${esc(d.title)}</div>
    <div class="n-sub">${esc(d.sub)}</div>`;
  el.onclick = () => openNode(id);
  el.addEventListener('dragstart', e => { dragSrc=id; el.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });
  el.addEventListener('dragend', () => { el.classList.remove('dragging'); document.querySelectorAll('.drag-over').forEach(n=>n.classList.remove('drag-over')); });
  el.addEventListener('dragover', e => { e.preventDefault(); if(dragSrc && dragSrc!==id) el.classList.add('drag-over'); });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  el.addEventListener('drop', e => { e.preventDefault(); el.classList.remove('drag-over'); if(dragSrc && dragSrc!==id) swapNodes(dragSrc,id); dragSrc=null; });
  return el;
}

// ── NODE OPS ─────────────────────────────────────────────────────
function swapNodes(aId, bId){
  const tmp = S.nodes[aId];
  S.nodes[aId] = S.nodes[bId];
  S.nodes[bId] = tmp;
  save_(); render();
  toast_('Etapas trocadas ✓');
}

function deleteNode(id){
  if(!confirm(`Remover a etapa "${S.nodes[id]?.title}"?`)) return;
  delete S.nodes[id];
  S.phases.forEach(ph => {
    ph.nodes = ph.nodes.filter(slot => {
      if(slot.layout==='single' && slot.id===id) return false;
      if(slot.layout==='row'){ slot.items=slot.items.filter(i=>i!==id); if(slot.items.length===0) return false; if(slot.items.length===1){slot.layout='single';slot.id=slot.items[0];delete slot.items;} return true; }
      if(slot.layout==='branches'){ slot.branches.forEach(br=>{br.items=br.items.filter(i=>i!==id);}); return true; }
      return true;
    });
  });
  S.phases = S.phases.filter(ph=>ph.nodes.length>0);
  if(curNode===id) closePanel();
  save_(); render();
  toast_('Etapa removida');
}

// ── PANEL ────────────────────────────────────────────────────────
function openNode(id){
  curNode = id;
  document.querySelectorAll('.node').forEach(n=>n.classList.remove('selected'));
  const el = document.getElementById(id);
  if(el) el.classList.add('selected');
  const d = S.nodes[id];
  const sec = document.getElementById('p-sector');
  sec.textContent = d.sector;
  sec.style.color = COLOR_HEX[d.color] || '#888';
  document.getElementById('p-tit').textContent = d.title;
  switchTab('info');
  document.getElementById('panel').classList.add('open');
}

function closePanel(){ document.getElementById('panel').classList.remove('open'); document.querySelectorAll('.node').forEach(n=>n.classList.remove('selected')); curNode=null; }

function peopleBlock(d){
  if(!d.operates) return '';
  return `<div class="iblk operates-blk"><h4>Como funciona</h4><p>${esc(d.operates)}</p></div>`;
}

function switchTab(t){
  curTab='info';
  document.getElementById('t-info').className='tab on';
  document.getElementById('b-info').style.display='';
  if(!curNode) return;
  const d = S.nodes[curNode];
  document.getElementById('b-info').innerHTML=`
      <div class="iblk"><h4>O que é</h4><p>${esc(d.desc)}</p></div>
      ${peopleBlock(d)}
      <div class="iblk"><h4>Responsabilidades</h4><ul>${(d.resp||[]).map(r=>`<li>${esc(r)}</li>`).join('')}</ul></div>
      ${indicadoresBlock(d)}
      ${travasBlock(d)}
      <div class="iblk"><h4>Resultado desta etapa</h4><p>${esc(d.res)}</p></div>`;
}

function indicadoresBlock(d){
  if(!d.indicadores || !d.indicadores.length) return '';
  const items = d.indicadores.map(i=>`<span class="ind-tag">${esc(i)}</span>`).join('');
  return `<div class="iblk ind-blk"><h4>📊 Indicadores operacionais</h4><div class="ind-wrap">${items}</div></div>`;
}

function travasBlock(d){
  if(!d.travas || !d.travas.length) return '';
  const items = d.travas.map(t=>`<li>${esc(t)}</li>`).join('');
  return `<div class="iblk travas-blk"><h4>🔒 Travas e bloqueios do sistema</h4><ul>${items}</ul></div>`;
}

function saveNode(){
  if(!curNode) return;
  S.nodes[curNode]={sector:document.getElementById('e-sec').value,title:document.getElementById('e-tit').value,sub:document.getElementById('e-sub').value,color:document.getElementById('e-col').value,desc:document.getElementById('e-desc').value,resp:document.getElementById('e-resp').value.split('\n').filter(l=>l.trim()),res:document.getElementById('e-res').value,operates:S.nodes[curNode].operates||''};
  save_(); render();
  openNode(curNode); switchTab('edit');
  const ok=document.getElementById('sok');
  if(ok){ ok.style.display='block'; setTimeout(()=>ok.style.display='none',2500); }
  toast_('Alterações salvas');
}

// ── ADD NODE ────────────────────────────────────────────────────
let _addAfterSlotId = null;
function addNodeGlobal(afterSlotId){
  _addAfterSlotId = afterSlotId||null;
  const sw=document.getElementById('am-swatches');
  sw.innerHTML='';
  COLORS.forEach(c=>{const s=document.createElement('div');s.className='swatch'+(c==='blue'?' sel':'');s.style.background=COLOR_HEX[c];s.dataset.color=c;s.onclick=()=>{sw.querySelectorAll('.swatch').forEach(x=>x.classList.remove('sel'));s.classList.add('sel');};sw.appendChild(s);});
  const ph=document.getElementById('am-phase');
  ph.innerHTML=S.phases.map(p=>`<option value="${p.id}">${esc(p.label)}</option>`).join('')+'<option value="__new__">+ Nova fase…</option>';
  const af=document.getElementById('am-after');
  af.innerHTML='<option value="">No início da fase</option>';
  Object.entries(S.nodes).forEach(([id,nd])=>{af.innerHTML+=`<option value="${id}">${esc(nd.title)}</option>`;});
  document.getElementById('am-sector').value='';
  document.getElementById('am-title').value='';
  document.getElementById('am-sub').value='';
  document.getElementById('add-modal').classList.add('open');
}
function closeAddModal(){ document.getElementById('add-modal').classList.remove('open'); }
function confirmAddNode(){
  const sector=document.getElementById('am-sector').value.trim();
  const title=document.getElementById('am-title').value.trim();
  const sub=document.getElementById('am-sub').value.trim();
  const color=document.querySelector('#am-swatches .swatch.sel')?.dataset.color||'blue';
  const phaseId=document.getElementById('am-phase').value;
  const afterId=document.getElementById('am-after').value;
  if(!title){ alert('Informe o título da etapa.'); return; }
  const id=uid();
  S.nodes[id]={sector:sector||'Geral',title,sub:sub||'',color,desc:'',resp:[],res:''};
  const slot={id,layout:'single'};
  if(phaseId==='__new__'){ S.phases.push({id:'p-'+uid(),label:'Nova Fase',nodes:[slot]}); }
  else {
    const phase=S.phases.find(p=>p.id===phaseId);
    if(phase){
      if(afterId){ let ins=false; for(let i=0;i<phase.nodes.length;i++){const n=phase.nodes[i];if(n.layout==='single'&&n.id===afterId){phase.nodes.splice(i+1,0,slot);ins=true;break;}if(n.layout==='row'&&n.items?.includes(afterId)){phase.nodes.splice(i+1,0,slot);ins=true;break;}} if(!ins) phase.nodes.push(slot); }
      else phase.nodes.push(slot);
    }
  }
  closeAddModal(); save_(); render();
  toast_('Etapa adicionada ✓');
  setTimeout(()=>editNode(id),100);
}

// ── MERMAID ──────────────────────────────────────────────────────
function openMermaid(view){
  mmdView('export');
  document.getElementById('mmd-panel').classList.add('open');
  if(view==='import') mmdView('import');
}
function closeMermaid(){ document.getElementById('mmd-panel').classList.remove('open'); }
function mmdView(v){
  mmdView_=v;
  document.getElementById('mmd-tab-exp').className='mmd-tab'+(v==='export'?' on':'');
  document.getElementById('mmd-tab-imp').className='mmd-tab'+(v==='import'?' on':'');
  document.getElementById('mmd-export-area').style.display=v==='export'?'':'none';
  document.getElementById('mmd-import-area').style.display=v==='import'?'':'none';
  document.getElementById('mmd-action-btn').textContent=v==='export'?'Copiar código':'Importar fluxo';
  if(v==='export') document.getElementById('mmd-out').value=generateMermaid();
}
function generateMermaid(){
  const lines=['flowchart TD'];
  const nodeIds={};
  let counter=0;
  Object.keys(S.nodes).forEach(id=>{nodeIds[id]='N'+counter++;});
  Object.entries(S.nodes).forEach(([id,d])=>{
    const label=d.sector?`${d.sector}: ${d.title}`:d.title;
    lines.push(`  ${nodeIds[id]}["${label.replace(/"/g,"'")}"]`);
  });
  function getFirstIds(slot){
    if(slot.layout==='single') return [slot.id];
    if(slot.layout==='row') return slot.items||[];
    if(slot.layout==='branches') return slot.branches?.flatMap(b=>b.items)||[];
    return [];
  }
  lines.push(''); lines.push('  %% Connections');
  if(S.phases.length>0&&S.phases[0].nodes.length>0){
    getFirstIds(S.phases[0].nodes[0]).forEach(id=>lines.push(`  START([Início]) --> ${nodeIds[id]}`));
  }
  S.phases.forEach(phase=>{
    for(let si=0;si<phase.nodes.length-1;si++){
      const froms=getFirstIds(phase.nodes[si]);
      const tos=getFirstIds(phase.nodes[si+1]);
      froms.forEach(f=>tos.forEach(t=>lines.push(`  ${nodeIds[f]} --> ${nodeIds[t]}`)));
    }
  });
  S.phases.forEach((phase,pi)=>{
    if(pi<S.phases.length-1){
      const froms=getFirstIds(phase.nodes[phase.nodes.length-1]);
      const tos=getFirstIds(S.phases[pi+1].nodes[0]);
      froms.forEach(f=>tos.forEach(t=>lines.push(`  ${nodeIds[f]} --> ${nodeIds[t]}`)));
    }
  });
  if(S.phases.length>0){
    const lastPhase=S.phases[S.phases.length-1];
    getFirstIds(lastPhase.nodes[lastPhase.nodes.length-1]).forEach(id=>lines.push(`  ${nodeIds[id]} --> END([Fim])`));
  }
  lines.push(''); lines.push('  %% Styles');
  Object.entries(S.nodes).forEach(([id,d])=>{
    const hex=COLOR_HEX[d.color]||'#4f8ef7';
    lines.push(`  style ${nodeIds[id]} stroke:${hex},stroke-width:2px`);
  });
  return lines.join('\n');
}
function mmdAction(){
  if(mmdView_==='export'){
    const txt=document.getElementById('mmd-out').value;
    navigator.clipboard.writeText(txt).then(()=>toast_('Mermaid copiado ✓')).catch(()=>{document.getElementById('mmd-out').select();document.execCommand('copy');toast_('Mermaid copiado ✓');});
  } else { importMermaid(); }
}
function importMermaid(){
  const txt=document.getElementById('mmd-in').value.trim();
  if(!txt){alert('Cole um código Mermaid antes de importar.');return;}
  try{
    const newNodes={};
    const newPhases=[{id:'p1',label:'Fase Importada',nodes:[]}];
    const seenIds=new Set();
    const nodeRe=/^\s*([A-Za-z0-9_]+)\[["']?([^"\]']+)["']?\]/gm;
    let m;
    while((m=nodeRe.exec(txt))!==null){
      const mId=m[1];
      if(mId==='START'||mId==='END') continue;
      const label=m[2].trim();
      const colonIdx=label.indexOf(':');
      const sector=colonIdx>-1?label.slice(0,colonIdx).trim():'Geral';
      const title=colonIdx>-1?label.slice(colonIdx+1).trim():label;
      const nid='n-'+mId.toLowerCase();
      newNodes[nid]={sector,title,sub:'',color:'blue',desc:'',resp:[],res:''};
      if(!seenIds.has(mId)){seenIds.add(mId);newPhases[0].nodes.push({id:nid,layout:'single'});}
    }
    if(Object.keys(newNodes).length===0){alert('Nenhum nó encontrado. Verifique o formato.');return;}
    if(!confirm(`Importar ${Object.keys(newNodes).length} etapas? O fluxo atual será substituído.`)) return;
    S.nodes=newNodes; S.phases=newPhases;
    save_(); render(); closeMermaid();
    toast_(`${Object.keys(newNodes).length} etapas importadas ✓`);
  }catch(e){alert('Erro ao analisar o Mermaid: '+e.message);}
}

// ── EXPORT HTML ──────────────────────────────────────────────────
function exportHTML(){
  const blob=new Blob([document.documentElement.outerHTML],{type:'text/html'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='fluxograma_coopertruni_v3.html';
  a.click();
  toast_('HTML exportado com sucesso');
}

function resetAll(){
  if(!confirm('Restaurar fluxo para o padrão original?')) return;
  S=JSON.parse(JSON.stringify(DEFAULT_DATA));
  sessionStorage.removeItem('coop1');
  render(); closePanel();
  toast_('Fluxo restaurado ao padrão');
}

function toast_(msg){
  const t=document.getElementById('toast');
  t.textContent='✓ '+msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3000);
}

render();
