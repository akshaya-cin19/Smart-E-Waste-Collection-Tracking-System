/* ---------------- Data layer ---------------- */
const STATUSES = ['Requested','Scheduled','Collected','In Transit','Processing','Recycled'];
const STATUS_CLASS = { 'Requested':'st-requested','Scheduled':'st-scheduled','Collected':'st-collected','In Transit':'st-transit','Processing':'st-processing','Recycled':'st-recycled' };

const CENTERS = [
  { id:'C1', name:'Velachery Recovery Hub', area:'Velachery, Chennai', capacity:64, items:['Laptops','Mobiles','Batteries'] },
  { id:'C2', name:'Guindy E-Waste Depot', area:'Guindy, Chennai', capacity:82, items:['TVs/Monitors','Appliances'] },
  { id:'C3', name:'Anna Nagar Collection Point', area:'Anna Nagar, Chennai', capacity:41, items:['Mobiles','Printers','Cables'] },
  { id:'C4', name:'Perungudi Processing Center', area:'Perungudi, Chennai', capacity:93, items:['All categories'] },
  { id:'C5', name:'Tambaram Community Kiosk', area:'Tambaram, Chennai', capacity:28, items:['Mobiles','Batteries','Cables'] },
];

const WEIGHT_KG = { 'Laptop / Computer':2.4,'Mobile phone':0.18,'Battery (Li-ion)':0.15,'Television / Monitor':9.5,'Printer / Peripherals':4.2,'Large appliance':28,'Mixed cables & accessories':1.1 };

let state = { requests: [], role: 'citizen' };

function loadState(){
  try {
    const raw = localStorage.getItem('recircuit_requests_v1');
    state.requests = raw ? JSON.parse(raw) : seedData();
    if (!raw) saveState();
  } catch(e) { state.requests = seedData(); }
}
function saveState(){
  try { localStorage.setItem('recircuit_requests_v1', JSON.stringify(state.requests)); } catch(e) {}
}

function seedData(){
  const now = Date.now();
  const mk = (id,name,item,qty,center,statusIdx,daysAgo)=>{
    const created = now - daysAgo*86400000;
    const hist = [];
    for(let i=0;i<=statusIdx;i++){
      hist.push({ status: STATUSES[i], timestamp: created + i*(daysAgo*86400000/(statusIdx+1||1)) });
    }
    return { id, name, phone:'98765'+ (10000+Math.floor(Math.random()*9000)), itemType:item, quantity:qty, address:'Sample address, Chennai', centerId:center, statusIdx, history:hist, createdAt:created };
  };
  return [
    mk('RC-7QM2LX','Divya S','Laptop / Computer',1,'C1',4,6),
    mk('RC-3KP9WZ','Karthik R','Mobile phone',2,'C3',5,10),
    mk('RC-9TN4YB','Fathima A','Television / Monitor',1,'C4',2,3),
    mk('RC-1VD6RC','Suresh M','Battery (Li-ion)',5,'C5',1,1),
  ];
}

/* ---------------- Nav ---------------- */
const ICONS = {
  dashboard: '<path d="M3 3h8v8H3zM13 3h8v5h-8zM13 11h8v10h-8zM3 14h8v7H3z"/>',
  request: '<path d="M12 5v14M5 12h14"/>',
  track: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  queue: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>',
  centers: '<path d="M3 9l9-6 9 6v11a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z"/>',
  analytics: '<path d="M4 19V9M12 19V4M20 19v-7"/>',
};
const PAGES = [
  { id:'dashboard', label:'Dashboard', roles:['citizen','collector'] },
  { id:'request', label:'New pickup', roles:['citizen'] },
  { id:'track', label:'Track', roles:['citizen','collector'] },
  { id:'queue', label:'Collector queue', roles:['collector'] },
  { id:'centers', label:'Centers', roles:['citizen','collector'] },
  { id:'analytics', label:'Analytics', roles:['citizen','collector'] },
];
let currentPage = 'dashboard';

function renderNav(){
  const nav = document.getElementById('nav');
  nav.innerHTML = PAGES.filter(p=>p.roles.includes(state.role)).map(p=>`
    <button class="tab-btn ${currentPage===p.id?'active':''}" onclick="go('${p.id}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[p.id]}</svg>
      <span>${p.label}</span>
    </button>`).join('');
}

function go(pageId){
  currentPage = pageId;
  document.querySelectorAll('.page').forEach(el=>el.classList.remove('active'));
  document.getElementById('page-'+pageId).classList.add('active');
  renderNav();
  renderAll();
  window.scrollTo(0,0);
}

function setRole(role){
  state.role = role;
  document.querySelectorAll('.role-btn').forEach(b=>b.classList.toggle('active', b.dataset.role===role));
  const allowed = PAGES.filter(p=>p.roles.includes(role)).map(p=>p.id);
  if(!allowed.includes(currentPage)) currentPage = allowed[0];
  go(currentPage);
}

/* ---------------- Helpers ---------------- */
function genId(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'RC-';
  for(let i=0;i<6;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}
function timeAgo(ts){
  const diff = Date.now()-ts;
  const mins = Math.floor(diff/60000);
  if(mins < 60) return mins<=0 ? 'just now' : mins+'m ago';
  const hrs = Math.floor(mins/60);
  if(hrs < 24) return hrs+'h ago';
  const days = Math.floor(hrs/24);
  return days+'d ago';
}
function fmtDate(ts){
  return new Date(ts).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}
function centerName(id){ const c = CENTERS.find(c=>c.id===id); return c ? c.name : '—'; }
function statusBadge(statusIdx){
  const s = STATUSES[statusIdx];
  return `<span class="badge ${STATUS_CLASS[s]}"><span class="dot"></span>${s}</span>`;
}
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._h);
  showToast._h = setTimeout(()=>t.classList.remove('show'), 2600);
}

/* ---------------- Dashboard ---------------- */
function renderDashboard(){
  const reqs = state.requests;
  const total = reqs.length;
  const recycled = reqs.filter(r=>r.statusIdx===5).length;
  const active = reqs.filter(r=>r.statusIdx>0 && r.statusIdx<5).length;
  const pending = reqs.filter(r=>r.statusIdx===0).length;

  document.getElementById('stat-row').innerHTML = `
    <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-label">Total pickups logged</div></div>
    <div class="stat-card warn"><div class="stat-num">${pending}</div><div class="stat-label">Awaiting scheduling</div></div>
    <div class="stat-card"><div class="stat-num">${active}</div><div class="stat-label">In progress</div></div>
    <div class="stat-card trace"><div class="stat-num">${recycled}</div><div class="stat-label">Fully recycled</div></div>
  `;

  const sorted = [...reqs].sort((a,b)=>{
    const at = a.history[a.history.length-1]?.timestamp||a.createdAt;
    const bt = b.history[b.history.length-1]?.timestamp||b.createdAt;
    return bt-at;
  }).slice(0,6);

  document.getElementById('dash-empty').style.display = reqs.length ? 'none' : 'block';
  document.getElementById('dash-activity').innerHTML = sorted.map(r=>{
    const last = r.history[r.history.length-1];
    return `<tr class="row-btn" onclick="openDetail('${r.id}')">
      <td class="mono">${r.id}</td>
      <td>${r.itemType.split(' / ')[0]} ×${r.quantity}</td>
      <td>${statusBadge(r.statusIdx)}</td>
      <td class="mono" style="color:var(--text-faint); font-size:11.5px;">${timeAgo(last?.timestamp||r.createdAt)}</td>
    </tr>`;
  }).join('');

  // material recovered
  const byCat = {};
  reqs.forEach(r=>{
    if(r.statusIdx===5){
      const kg = (WEIGHT_KG[r.itemType]||1) * r.quantity;
      byCat[r.itemType] = (byCat[r.itemType]||0) + kg;
    }
  });
  const totalKg = Object.values(byCat).reduce((a,b)=>a+b,0);
  const co2 = totalKg * 1.8; // indicative factor
  const cats = Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  document.getElementById('dash-material').innerHTML = `
    <div class="detail-grid" style="margin-bottom:14px;">
      <div class="detail-item"><div class="k">MATERIAL RECOVERED</div><div class="v">${totalKg.toFixed(1)} kg</div></div>
      <div class="detail-item"><div class="k">CO₂ AVOIDED (EST.)</div><div class="v">${co2.toFixed(0)} kg</div></div>
    </div>
    ${cats.length ? cats.map(([cat,kg])=>`
      <div style="display:flex; justify-content:space-between; font-size:12.5px; padding:5px 0; border-top:1px solid var(--line); color:var(--text-dim);">
        <span>${cat}</span><span class="mono">${kg.toFixed(1)} kg</span>
      </div>`).join('') : `<div style="font-size:12px; color:var(--text-faint);">No items fully recycled yet.</div>`}
  `;
}

/* ---------------- New request ---------------- */
function populateCenterSelect(){
  const sel = document.getElementById('f-center');
  sel.innerHTML = CENTERS.map(c=>`<option value="${c.id}">${c.name} — ${c.area}</option>`).join('');
}
function fillSample(){
  document.getElementById('f-name').value = 'Ananya Rao';
  document.getElementById('f-phone').value = '9876543210';
  document.getElementById('f-item').value = 'Laptop / Computer';
  document.getElementById('f-qty').value = 1;
  document.getElementById('f-address').value = '14 Lake View Street, Velachery, Chennai 600042';
  const d = new Date(); d.setDate(d.getDate()+3);
  document.getElementById('f-date').value = d.toISOString().slice(0,10);
}
function submitRequest(){
  const name = document.getElementById('f-name').value.trim();
  const phone = document.getElementById('f-phone').value.trim();
  const address = document.getElementById('f-address').value.trim();
  if(!name || !phone || !address){
    showToast('Please fill name, phone and address.');
    return;
  }
  const id = genId();
  const req = {
    id, name, phone,
    itemType: document.getElementById('f-item').value,
    quantity: parseInt(document.getElementById('f-qty').value)||1,
    address,
    preferredDate: document.getElementById('f-date').value,
    centerId: document.getElementById('f-center').value,
    statusIdx: 0,
    createdAt: Date.now(),
    history: [{ status:'Requested', timestamp: Date.now() }],
  };
  state.requests.unshift(req);
  saveState();
  ['f-name','f-phone','f-address'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('f-qty').value = 1;
  showToast(`Request submitted · Tracking ID ${id}`);
  openDetail(id);
  go('track');
}

/* ---------------- Track ---------------- */
function renderTrackList(){
  const reqs = [...state.requests].sort((a,b)=>b.createdAt-a.createdAt);
  document.getElementById('track-empty').style.display = reqs.length ? 'none' : 'block';
  document.getElementById('track-list').innerHTML = reqs.map(r=>`
    <tr class="row-btn" onclick="openDetail('${r.id}')">
      <td class="mono">${r.id}</td>
      <td>${r.name}</td>
      <td>${r.itemType.split(' / ')[0]} ×${r.quantity}</td>
      <td>${statusBadge(r.statusIdx)}</td>
      <td><button class="btn ghost sm" onclick="event.stopPropagation(); openDetail('${r.id}')">View</button></td>
    </tr>`).join('');
}
function trackById(){
  const val = document.getElementById('track-input').value.trim().toUpperCase();
  const req = state.requests.find(r=>r.id.toUpperCase()===val);
  const box = document.getElementById('track-result');
  if(!req){
    box.style.display = 'block';
    box.innerHTML = `<div class="empty" style="padding:18px 0;">No pickup found for <span class="mono">${val||'—'}</span>. Check the ID and try again.</div>`;
    return;
  }
  box.style.display = 'block';
  box.innerHTML = detailContent(req);
}

function detailContent(r){
  const timeline = STATUSES.map((s,i)=>{
    const hist = r.history.find(h=>h.status===s);
    const cls = i < r.statusIdx ? 'done' : (i===r.statusIdx ? 'current' : '');
    return `<div class="tl-step ${cls}">
      ${i<STATUSES.length-1 ? '<div class="tl-line"></div>' : ''}
      <div class="tl-dot"><div class="tl-dot-inner"></div></div>
      <div class="tl-body">
        <div class="tl-title">${s}</div>
        <div class="tl-time">${hist ? fmtDate(hist.timestamp)+' · '+new Date(hist.timestamp).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : 'Pending'}</div>
      </div>
    </div>`;
  }).join('');

  return `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
      <div>
        <div class="id-chip">${r.id}</div>
        <div style="font-size:16px; font-weight:600; font-family:'Space Grotesk',sans-serif; margin-top:3px;">${r.itemType} ×${r.quantity}</div>
      </div>
      ${statusBadge(r.statusIdx)}
    </div>
    <div class="detail-grid" style="margin-bottom:18px;">
      <div class="detail-item"><div class="k">REQUESTER</div><div class="v">${r.name}</div></div>
      <div class="detail-item"><div class="k">PHONE</div><div class="v">${r.phone}</div></div>
      <div class="detail-item"><div class="k">ASSIGNED CENTER</div><div class="v">${centerName(r.centerId)}</div></div>
      <div class="detail-item"><div class="k">PICKUP ADDRESS</div><div class="v">${r.address}</div></div>
    </div>
    <div class="timeline">${timeline}</div>
  `;
}

function openDetail(id){
  const req = state.requests.find(r=>r.id===id);
  if(!req) return;
  const backdrop = document.getElementById('modal-backdrop');
  document.getElementById('modal-body').innerHTML = `
    <div class="modal-head">
      <h3 style="font-size:15px;">Pickup detail</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    ${detailContent(req)}
  `;
  backdrop.classList.add('show');
}
function closeModal(){ document.getElementById('modal-backdrop').classList.remove('show'); }

/* ---------------- Collector queue ---------------- */
function renderQueue(){
  const reqs = [...state.requests].filter(r=>r.statusIdx<5).sort((a,b)=>a.statusIdx-b.statusIdx || a.createdAt-b.createdAt);
  document.getElementById('queue-empty').style.display = reqs.length ? 'none' : 'block';
  document.getElementById('queue-list').innerHTML = reqs.map(r=>`
    <tr>
      <td class="mono">${r.id}</td>
      <td>${r.itemType.split(' / ')[0]} ×${r.quantity}</td>
      <td style="font-size:12.5px; color:var(--text-dim);">${centerName(r.centerId)}</td>
      <td>${statusBadge(r.statusIdx)}</td>
      <td><button class="btn sm" onclick="advanceStatus('${r.id}')">Mark ${STATUSES[r.statusIdx+1]}</button></td>
    </tr>`).join('');
}
function advanceStatus(id){
  const req = state.requests.find(r=>r.id===id);
  if(!req || req.statusIdx>=5) return;
  req.statusIdx += 1;
  req.history.push({ status: STATUSES[req.statusIdx], timestamp: Date.now() });
  saveState();
  showToast(`${id} → ${STATUSES[req.statusIdx]}`);
  renderAll();
}

/* ---------------- Centers ---------------- */
function renderCenters(){
  document.getElementById('centers-list').innerHTML = CENTERS.map(c=>{
    const cls = c.capacity>85 ? 'full' : (c.capacity>65 ? 'warn' : '');
    return `<div class="center-card">
      <div>
        <div class="center-name">${c.name}</div>
        <div class="center-meta">${c.area}</div>
        <div class="capacity-bar"><div class="capacity-fill ${cls}" style="width:${c.capacity}%;"></div></div>
        <div class="center-meta" style="margin-top:5px; font-family:'IBM Plex Mono',monospace; font-size:11px;">${c.capacity}% capacity</div>
      </div>
      <div class="item-tags">${c.items.map(i=>`<span class="tag">${i}</span>`).join('')}</div>
    </div>`;
  }).join('');
}

/* ---------------- Analytics ---------------- */
function renderAnalytics(){
  const reqs = state.requests;
  // by category
  const byCat = {};
  reqs.forEach(r=>{ byCat[r.itemType] = (byCat[r.itemType]||0) + r.quantity; });
  const maxCat = Math.max(1, ...Object.values(byCat));
  const catHtml = Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([cat,n])=>`
    <div class="bar-row">
      <div class="bar-label">${cat.split(' / ')[0]}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(n/maxCat*100).toFixed(0)}%;"></div></div>
      <div class="bar-val">${n}</div>
    </div>`).join('') || `<div class="empty" style="padding:10px 0;">No data yet.</div>`;
  document.getElementById('chart-category').innerHTML = catHtml;

  // by stage
  const byStage = STATUSES.map(s=>reqs.filter(r=>STATUSES[r.statusIdx]===s).length);
  const maxStage = Math.max(1, ...byStage);
  const stageHtml = STATUSES.map((s,i)=>`
    <div class="bar-row">
      <div class="bar-label">${s}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(byStage[i]/maxStage*100).toFixed(0)}%;"></div></div>
      <div class="bar-val">${byStage[i]}</div>
    </div>`).join('');
  document.getElementById('chart-stage').innerHTML = stageHtml;
}

/* ---------------- Root render ---------------- */
function renderAll(){
  renderDashboard();
  populateCenterSelect();
  renderTrackList();
  renderQueue();
  renderCenters();
  renderAnalytics();
  const box = document.getElementById('track-result');
  if(box) box.style.display = 'none';
}

loadState();
renderNav();
populateCenterSelect();
go('dashboard');