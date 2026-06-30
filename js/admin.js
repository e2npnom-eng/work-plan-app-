const adminUser = Session.requireLogin(true);

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

const dayNamesShort = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const monthNamesShort = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const DAY_START_HOUR = 6, DAY_END_HOUR = 22, HOUR_PX = 64;
let viewDate = new Date();
let approvedPlans = [];
let pendingById = {};

function pad(n) { return String(n).padStart(2, '0'); }
function toIsoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function sameDay(a, b) { return toIsoDate(a) === toIsoDate(b); }
function startOfWeek(d) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0,0,0,0); return r; }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function parseTimeToMinutes(t) {
  if (!t) return DAY_START_HOUR * 60;
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
}

async function init() {
  if (!adminUser) return;
  buildTimeColumn();
  loadPending();
  loadUsers();
  await loadApprovedPlans();
  renderWeek();
}

// ----- Google Map -----
function openMapFor(location) {
  const hint = document.getElementById('mapHint');
  if (!location) {
    hint.textContent = 'งานนี้ยังไม่ได้ระบุสถานที่ปฏิบัติงาน';
    return;
  }
  document.getElementById('mapFrame').src =
    'https://www.google.com/maps?q=' + encodeURIComponent(location) + '&output=embed';
  hint.textContent = 'กำลังแสดงตำแหน่ง: ' + location;
}

// ----- Plan detail modal -----
const planDetailModal = document.getElementById('planDetailModal');
function openPlanDetail(p, mode) {
  document.getElementById('pd_task').textContent = p.task;
  const badgeMap = { 'อนุมัติแล้ว': 'badge-success', 'รออนุมัติ': 'badge-warning', 'ยกเลิก': 'badge-danger', 'ปฏิเสธ': 'badge-danger' };
  document.getElementById('pd_statusBadge').innerHTML =
    `<span class="badge ${badgeMap[p.status] || 'badge-danger'}">${escapeHtml(p.status)}</span>`;
  document.getElementById('pd_date').textContent = p.date;
  document.getElementById('pd_time').textContent = p.startTime + ' - ' + p.endTime;
  document.getElementById('pd_pchg').textContent = p.pchg || '-';
  document.getElementById('pd_chchg').textContent = p.chchg || '-';
  document.getElementById('pd_team').textContent = p.team || '-';
  document.getElementById('pd_location').textContent = p.location || '-';
  document.getElementById('pd_outage').textContent = p.outageDetail || '-';
  document.getElementById('pd_emp').textContent = `${p.empName} (${p.empId})`;

  const reasonEl = document.getElementById('pd_cancelReason');
  if (p.cancelReason) { reasonEl.textContent = 'เหตุผล: ' + p.cancelReason; reasonEl.style.display = 'block'; }
  else { reasonEl.style.display = 'none'; }

  const actions = document.getElementById('pd_actions');
  if (mode === 'pending') {
    actions.innerHTML = '';
    const approveBtn = document.createElement('button');
    approveBtn.className = 'btn-success';
    approveBtn.textContent = 'อนุมัติ';
    approveBtn.onclick = async () => { await approve(p.id); planDetailModal.classList.remove('open'); };
    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'btn-danger';
    rejectBtn.textContent = 'ปฏิเสธ';
    rejectBtn.onclick = () => { planDetailModal.classList.remove('open'); openReject(p.id); };
    actions.append(approveBtn, rejectBtn);
  } else {
    actions.innerHTML = '';
  }

  openMapFor(p.location);
  planDetailModal.classList.add('open');
}
document.getElementById('closePlanDetailBtn').addEventListener('click', () => planDetailModal.classList.remove('open'));

// ----- Pending plans -----
async function loadPending() {
  const box = document.getElementById('pendingList');
  const res = await Api.getPendingPlans();
  if (!res.ok || res.plans.length === 0) {
    box.innerHTML = '<div class="empty-state">ไม่มีคำขอรออนุมัติ</div>';
    return;
  }
  pendingById = {};
  res.plans.forEach(p => pendingById[p.id] = p);
  box.innerHTML = res.plans.map(p => `
    <div class="request-item">
      <div>
        <p class="req-title-link" style="font-size:14px;margin:0;font-weight:600" onclick="openPlanDetail(pendingById[${p.id}], 'pending')">${escapeHtml(p.task)}</p>
        <p style="font-size:12px;color:var(--text-muted);margin:4px 0 0">
          ${p.date} · ${p.startTime}-${p.endTime} · ${escapeHtml(p.team)} · ขอโดย ${escapeHtml(p.empName)}
        </p>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="btn-success" style="font-size:12px;padding:6px 10px" onclick="approve(${p.id})">อนุมัติ</button>
        <button class="btn-danger" style="font-size:12px;padding:6px 10px" onclick="openReject(${p.id})">ปฏิเสธ</button>
      </div>
    </div>
  `).join('');
}

async function approve(id) {
  await Api.approvePlan(id);
  loadPending();
  loadApprovedPlans().then(renderWeek);
}

const rejectModal = document.getElementById('rejectModal');
let rejectTargetId = null;
function openReject(id) {
  rejectTargetId = id;
  document.getElementById('rejectReason').value = '';
  rejectModal.classList.add('open');
}
document.getElementById('closeRejectBtn').addEventListener('click', () => rejectModal.classList.remove('open'));
document.getElementById('confirmRejectBtn').addEventListener('click', async () => {
  const reason = document.getElementById('rejectReason').value.trim();
  if (!reason) { alert('กรุณาระบุเหตุผล'); return; }
  await Api.rejectPlan(rejectTargetId, reason);
  rejectModal.classList.remove('open');
  loadPending();
});

// ----- Week calendar (อ่านอย่างเดียว) -----
function buildTimeColumn() {
  let html = '';
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) html += `<div class="time-slot">${pad(h)}:00</div>`;
  document.getElementById('timeCol').innerHTML = html;
}

async function loadApprovedPlans() {
  const res = await Api.getApprovedPlans();
  approvedPlans = res.ok ? res.plans : [];
}

function renderWeek() {
  const weekStart = startOfWeek(viewDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const startLabel = `${days[0].getDate()} ${monthNamesShort[days[0].getMonth()]}`;
  const endLabel = `${days[6].getDate()} ${monthNamesShort[days[6].getMonth()]} ${days[6].getFullYear() + 543}`;
  document.getElementById('weekLabel').textContent = `${startLabel} – ${endLabel}`;

  document.getElementById('weekHeader').innerHTML = '<div class="time-gutter"></div>' + days.map(d => `
    <div class="day-header ${sameDay(d, today) ? 'today' : ''}">
      <div class="dname">${dayNamesShort[d.getDay()]}</div>
      <div class="dnum">${d.getDate()}</div>
    </div>
  `).join('');

  const body = document.getElementById('weekBody');
  body.querySelectorAll('.day-col').forEach(el => el.remove());
  const gridHeight = (DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_PX;
  let idx = 0;
  days.forEach(d => {
    const iso = toIsoDate(d);
    const dayEvents = approvedPlans.filter(p => p.date === iso || String(p.date).startsWith(iso));
    const col = document.createElement('div');
    col.className = 'day-col' + (sameDay(d, today) ? ' today-col' : '');
    col.style.height = gridHeight + 'px';
    col.innerHTML = dayEvents.map(e => eventBlockHtml(e, idx++)).join('');
    body.appendChild(col);
  });
  // ผูก event click หลังแทรก DOM
  body.querySelectorAll('.event-block').forEach(el => {
    el.addEventListener('click', () => {
      const plan = approvedPlans.find(p => String(p.id) === el.dataset.id);
      if (plan) openPlanDetail(plan, 'approved');
    });
  });
}

function eventBlockHtml(e) {
  const startMin = parseTimeToMinutes(e.startTime);
  const endMin = Math.max(parseTimeToMinutes(e.endTime), startMin + 20);
  const top = (startMin - DAY_START_HOUR * 60) / 60 * HOUR_PX;
  const height = Math.max((endMin - startMin) / 60 * HOUR_PX, 36);
  return `<div class="event-block" style="top:${top}px;height:${height}px;cursor:pointer" data-id="${e.id}">
    <strong>${escapeHtml(e.task)}</strong>
    <span>${e.startTime}-${e.endTime} · ${escapeHtml(e.team || '')}</span>
    ${e.location ? `<span class="ev-loc">สถานที่: ${escapeHtml(e.location)}</span>` : ''}
  </div>`;
}

document.getElementById('prevWeek').addEventListener('click', () => { viewDate = addDays(viewDate, -7); renderWeek(); });
document.getElementById('nextWeek').addEventListener('click', () => { viewDate = addDays(viewDate, 7); renderWeek(); });
document.getElementById('todayBtn').addEventListener('click', () => { viewDate = new Date(); renderWeek(); });

// ----- Users -----
function exportUsersJs(users) {
  const lines = users.map(u =>
    `  { empId: '${u.empId}', name: '${String(u.name).replace(/'/g, "\\'")}', role: '${u.role}' },`
  ).join('\n');
  const content = `// ===== รายชื่อพนักงาน (static) =====
// ห้ามแก้ไฟล์นี้ด้วยมือ ให้แก้ผ่านหน้าแอดมินแล้วกด "Export เป็น users.js" แทน
// แก้แล้วต้องอัปโหลดทับไฟล์นี้บน GitHub repo เอง
const USERS = [
${lines}
];
`;
  const blob = new Blob([content], { type: 'text/javascript' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'users.js';
  a.click();
  URL.revokeObjectURL(a.href);
}

let lastUsersList = [];

async function removeUser(empId) {
  if (!confirm('ยืนยันลบรหัสพนักงาน ' + empId + ' ?')) return;
  await Api.deleteUser(empId);
  loadUsers();
}

async function loadUsers() {
  const tbody = document.getElementById('userTableBody');
  const res = await Api.getUsers();
  if (!res.ok || res.users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">ยังไม่มีรายชื่อพนักงาน</td></tr>';
    return;
  }
  lastUsersList = res.users;
  const deployed = (typeof USERS !== 'undefined') ? USERS : [];
  function isDeployed(u) {
    return deployed.some(d =>
      String(d.empId) === String(u.empId) && d.name === u.name && d.role === u.role
    );
  }
  tbody.innerHTML = res.users.map(u => `
    <tr>
      <td>${escapeHtml(u.empId)}</td>
      <td>${escapeHtml(u.name)}</td>
      <td>${u.role === 'admin' ? 'แอดมิน' : 'พนักงาน'}</td>
      <td>${isDeployed(u)
          ? '<span class="badge badge-success">อัพเดทแล้ว</span>'
          : '<span class="badge badge-warning">รออัพเดท</span>'}</td>
      <td style="text-align:right">
        <button class="btn-danger" style="font-size:12px;padding:4px 8px" onclick="removeUser('${u.empId}')">ลบ</button>
      </td>
    </tr>
  `).join('');
}

const addUserModal = document.getElementById('addUserModal');
document.getElementById('openAddUserBtn').addEventListener('click', () => addUserModal.classList.add('open'));
document.getElementById('closeAddUserBtn').addEventListener('click', () => addUserModal.classList.remove('open'));

document.getElementById('submitAddUserBtn').addEventListener('click', async () => {
  const data = {
    empId: document.getElementById('u_empId').value.trim(),
    name: document.getElementById('u_name').value.trim(),
    role: document.getElementById('u_role').value,
  };
  const errEl = document.getElementById('userError');
  if (!data.empId || !data.name) {
    errEl.textContent = 'กรุณากรอกรหัสและชื่อให้ครบ';
    errEl.style.display = 'block';
    return;
  }
  const res = await Api.addUser(data);
  if (!res.ok) { errEl.textContent = res.error || 'บันทึกไม่สำเร็จ'; errEl.style.display = 'block'; return; }
  errEl.style.display = 'none';
  document.getElementById('u_empId').value = '';
  document.getElementById('u_name').value = '';
  addUserModal.classList.remove('open');
  loadUsers();
});

document.getElementById('exportUsersBtn').addEventListener('click', () => {
  if (lastUsersList.length === 0) { alert('ยังไม่มีรายชื่อพนักงานให้ export'); return; }
  exportUsersJs(lastUsersList);
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  Session.clear();
  window.location.href = 'index.html';
});

init();
