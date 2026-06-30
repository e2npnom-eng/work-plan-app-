const user = Session.requireLogin(false);
let viewDate = new Date();       // วันที่ใช้คำนวณสัปดาห์ที่แสดง
let miniMonthDate = new Date();  // เดือนที่แสดงใน mini calendar
let approvedPlans = null;

const dayNamesShort = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const monthNames = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const monthNamesShort = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 22;
const HOUR_PX = 48;

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
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function init() {
  if (!user) return;
  document.getElementById('welcomeText').textContent = `สวัสดี ${user.name} (${user.role === 'admin' ? 'แอดมิน' : 'พนักงาน'})`;
  if (user.role === 'admin') {
    const btn = document.getElementById('adminBackBtn');
    btn.style.display = 'inline-block';
    btn.addEventListener('click', () => window.location.href = 'admin.html');
  }
  buildTimeColumn();
  Promise.all([loadPlans(), loadMyRequests()]).then(() => {
    renderWeek();
    renderMiniCalendar();
  });
}

function buildTimeColumn() {
  const col = document.getElementById('timeCol');
  let html = '';
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) {
    html += `<div class="time-slot">${pad(h)}:00</div>`;
  }
  col.innerHTML = html;
}

async function loadPlans(forceRefresh) {
  if (forceRefresh || approvedPlans === null) {
    const res = await Api.getApprovedPlans();
    approvedPlans = res.ok ? res.plans : [];
  }
}

// ===== Week grid (main view) =====
function renderWeek() {
  const weekStart = startOfWeek(viewDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const startLabel = `${days[0].getDate()} ${monthNamesShort[days[0].getMonth()]}`;
  const endLabel = `${days[6].getDate()} ${monthNamesShort[days[6].getMonth()]} ${days[6].getFullYear() + 543}`;
  document.getElementById('weekLabel').textContent = `${startLabel} – ${endLabel}`;

  const header = document.getElementById('weekHeader');
  header.innerHTML = '<div class="time-gutter"></div>' + days.map(d => `
    <div class="day-header ${sameDay(d, today) ? 'today' : ''}">
      <div class="dname">${dayNamesShort[d.getDay()]}</div>
      <div class="dnum">${d.getDate()}</div>
    </div>
  `).join('');

  const body = document.getElementById('weekBody');
  // ลบคอลัมน์วันเก่า เหลือแค่ time-col แล้วเพิ่มใหม่
  body.querySelectorAll('.day-col').forEach(el => el.remove());

  const gridHeight = (DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_PX;
  days.forEach(d => {
    const iso = toIsoDate(d);
    const dayEvents = approvedPlans.filter(p => p.date === iso || String(p.date).startsWith(iso));
    const col = document.createElement('div');
    col.className = 'day-col' + (sameDay(d, today) ? ' today-col' : '');
    col.style.height = gridHeight + 'px';
    col.innerHTML = dayEvents.map(e => eventBlockHtml(e)).join('');
    body.appendChild(col);
  });
}

function eventBlockHtml(e) {
  const startMin = parseTimeToMinutes(e.startTime);
  const endMin = Math.max(parseTimeToMinutes(e.endTime), startMin + 20);
  const top = (startMin - DAY_START_HOUR * 60) / 60 * HOUR_PX;
  const height = Math.max((endMin - startMin) / 60 * HOUR_PX, 22);
  return `<div class="event-block" style="top:${top}px;height:${height}px" title="${escapeHtml(e.task)}">
    <strong>${escapeHtml(e.task)}</strong>
    <span>${e.startTime}-${e.endTime} · ${escapeHtml(e.team || '')}</span>
  </div>`;
}

function goToWeek(d) { viewDate = new Date(d); renderWeek(); renderMiniCalendar(); }

document.getElementById('prevWeek').addEventListener('click', () => goToWeek(addDays(viewDate, -7)));
document.getElementById('nextWeek').addEventListener('click', () => goToWeek(addDays(viewDate, 7)));
document.getElementById('todayBtn').addEventListener('click', () => { miniMonthDate = new Date(); goToWeek(new Date()); });

// ===== Mini calendar (sidebar นำทาง) =====
function renderMiniCalendar() {
  document.getElementById('miniLabel').textContent =
    monthNames[miniMonthDate.getMonth()] + ' ' + (miniMonthDate.getFullYear() + 543);

  document.getElementById('miniDayNames').innerHTML =
    dayNamesShort.map(d => `<div class="mini-dayname">${d}</div>`).join('');

  const year = miniMonthDate.getFullYear();
  const month = miniMonthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const weekStart = startOfWeek(viewDate);
  const weekEnd = addDays(weekStart, 6);

  let cells = [];
  for (let i = 0; i < startOffset; i++) cells.push({ date: addDays(firstDay, i - startOffset), muted: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d), muted: false });
  while (cells.length % 7 !== 0) cells.push({ date: addDays(cells[cells.length - 1].date, 1), muted: true });

  document.getElementById('miniDays').innerHTML = cells.map(c => {
    const iso = toIsoDate(c.date);
    const hasEvent = approvedPlans && approvedPlans.some(p => p.date === iso || String(p.date).startsWith(iso));
    const cls = [
      'mini-day',
      c.muted ? 'muted' : '',
      sameDay(c.date, today) ? 'today' : '',
      (c.date >= weekStart && c.date <= weekEnd) ? 'in-week' : '',
      hasEvent ? 'has-event' : '',
    ].filter(Boolean).join(' ');
    return `<div class="${cls}" data-date="${iso}">${c.date.getDate()}</div>`;
  }).join('');
}

document.getElementById('miniDays').addEventListener('click', (e) => {
  const cell = e.target.closest('.mini-day');
  if (!cell) return;
  goToWeek(new Date(cell.dataset.date));
});
document.getElementById('miniPrev').addEventListener('click', () => {
  miniMonthDate = new Date(miniMonthDate.getFullYear(), miniMonthDate.getMonth() - 1, 1);
  renderMiniCalendar();
});
document.getElementById('miniNext').addEventListener('click', () => {
  miniMonthDate = new Date(miniMonthDate.getFullYear(), miniMonthDate.getMonth() + 1, 1);
  renderMiniCalendar();
});

// ===== My requests =====
async function loadMyRequests() {
  const box = document.getElementById('myRequests');
  const res = await Api.getMyRequests(user.empId);
  if (!res.ok || res.plans.length === 0) {
    box.innerHTML = '<div class="empty-state">ยังไม่มีคำขอแผนงาน</div>';
    return;
  }
  const statusBadge = (s) => {
    if (s === 'อนุมัติแล้ว') return '<span class="badge badge-success">อนุมัติแล้ว</span>';
    if (s === 'รออนุมัติ') return '<span class="badge badge-warning">รออนุมัติ</span>';
    if (s === 'ยกเลิก') return '<span class="badge badge-danger">ยกเลิก</span>';
    return `<span class="badge badge-danger">${s}</span>`;
  };
  box.innerHTML = res.plans.map(p => `
    <div class="request-item">
      <div>
        <p style="font-size:13px;margin:0;font-weight:600">${escapeHtml(p.task)}</p>
        <p style="font-size:11.5px;color:var(--text-muted);margin:2px 0 0">${p.date} · ${p.startTime}-${p.endTime} · ${escapeHtml(p.team)}</p>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        ${statusBadge(p.status)}
        ${p.status === 'รออนุมัติ' ? `<button class="btn-danger" style="font-size:11px;padding:3px 8px" onclick="openCancel(${p.id})">ยกเลิกคำขอ</button>` : ''}
      </div>
    </div>
  `).join('');
}

// ===== Add plan modal =====
const addModal = document.getElementById('addModal');
document.getElementById('openAddBtn').addEventListener('click', () => addModal.classList.add('open'));
document.getElementById('closeModalBtn').addEventListener('click', () => addModal.classList.remove('open'));
document.getElementById('cancelAddBtn').addEventListener('click', () => addModal.classList.remove('open'));

document.getElementById('submitAddBtn').addEventListener('click', async () => {
  const data = {
    date: document.getElementById('f_date').value,
    startTime: document.getElementById('f_start').value,
    endTime: document.getElementById('f_end').value,
    task: document.getElementById('f_task').value.trim(),
    pchg: document.getElementById('f_pchg').value.trim(),
    chchg: document.getElementById('f_chchg').value.trim(),
    team: document.getElementById('f_team').value.trim(),
    location: document.getElementById('f_location').value.trim(),
    outageDetail: document.getElementById('f_outage').value.trim(),
    empId: user.empId,
    empName: user.name,
  };
  const errEl = document.getElementById('addError');
  if (!data.date || !data.startTime || !data.endTime || !data.task) {
    errEl.textContent = 'กรุณากรอกวันที่ เวลา และงานที่จะทำให้ครบ';
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';
  const res = await Api.addPlan(data);
  if (!res.ok) { errEl.textContent = res.error || 'บันทึกไม่สำเร็จ'; errEl.style.display = 'block'; return; }
  addModal.classList.remove('open');
  clearAddForm();
  loadMyRequests();
});

function clearAddForm() {
  ['f_date','f_start','f_end','f_task','f_pchg','f_chchg','f_team','f_location','f_outage']
    .forEach(id => document.getElementById(id).value = '');
}

// ===== Cancel modal =====
const cancelModal = document.getElementById('cancelModal');
let cancelTargetId = null;
function openCancel(id) {
  cancelTargetId = id;
  document.getElementById('cancelReason').value = '';
  cancelModal.classList.add('open');
}
document.getElementById('closeCancelBtn').addEventListener('click', () => cancelModal.classList.remove('open'));
document.getElementById('confirmCancelBtn').addEventListener('click', async () => {
  const reason = document.getElementById('cancelReason').value.trim();
  if (!reason) { alert('กรุณาระบุเหตุผลที่ยกเลิก'); return; }
  await Api.cancelPlan(cancelTargetId, reason);
  cancelModal.classList.remove('open');
  loadMyRequests();
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  Session.clear();
  window.location.href = 'index.html';
});

init();
