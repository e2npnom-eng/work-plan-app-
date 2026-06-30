const user = Session.requireLogin(false);
let viewDate = new Date();
let approvedPlans = null;

const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const monthNames = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

function pad(n) { return String(n).padStart(2, '0'); }
function toIsoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

function init() {
  if (!user) return;
  document.getElementById('welcomeText').textContent = `สวัสดี ${user.name} (${user.role === 'admin' ? 'แอดมิน' : 'พนักงาน'})`;
  renderCalendarHead();
  // โหลดข้อมูลทั้งสองส่วนพร้อมกัน แทนที่จะรอทีละอย่าง ช่วยลดเวลารวมลงครึ่งหนึ่ง
  Promise.all([loadCalendar(), loadMyRequests()]);
}

function renderCalendarHead() {
  const head = document.getElementById('calendarHead');
  head.innerHTML = dayNames.map(d => `<div class="calendar-head">${d}</div>`).join('');
}

async function loadCalendar(forceRefresh) {
  document.getElementById('monthLabel').textContent =
    monthNames[viewDate.getMonth()] + ' ' + (viewDate.getFullYear() + 543);
  // ดึงจาก server แค่ครั้งแรก เปลี่ยนเดือนแล้วกรองข้อมูลที่มีอยู่แล้วในเครื่อง ไม่ต้องยิง request ใหม่
  if (forceRefresh || approvedPlans === null) {
    const res = await Api.getApprovedPlans();
    approvedPlans = res.ok ? res.plans : [];
  }
  renderCalendarBody();
}

function renderCalendarBody() {
  const body = document.getElementById('calendarBody');
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let cells = [];
  for (let i = 0; i < startOffset; i++) {
    const d = new Date(year, month, 1 - (startOffset - i));
    cells.push({ date: d, muted: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), muted: false });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), muted: true });
  }

  body.innerHTML = cells.map(c => {
    const iso = toIsoDate(c.date);
    const events = approvedPlans.filter(p => p.date === iso || String(p.date).startsWith(iso));
    const hasEvent = events.length > 0 && !c.muted;
    const labels = events.slice(0, 2).map(e => `<div class="event-label">${escapeHtml(e.task)}</div>`).join('');
    return `<div class="calendar-cell ${c.muted ? 'muted' : ''} ${hasEvent ? 'has-event' : ''}">
      ${c.date.getDate()}
      ${hasEvent ? labels : ''}
    </div>`;
  }).join('');
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

document.getElementById('prevMonth').addEventListener('click', () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
  loadCalendar();
});
document.getElementById('nextMonth').addEventListener('click', () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
  loadCalendar();
});

// ----- My requests -----
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
        <p style="font-size:14px;margin:0;font-weight:600">${escapeHtml(p.task)}</p>
        <p style="font-size:12px;color:var(--text-muted);margin:2px 0 0">${p.date} · ${p.startTime}-${p.endTime} · ${escapeHtml(p.team)}</p>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        ${statusBadge(p.status)}
        ${p.status === 'รออนุมัติ' ? `<button class="btn-danger" style="font-size:12px;padding:4px 10px" onclick="openCancel(${p.id})">ยกเลิกคำขอ</button>` : ''}
      </div>
    </div>
  `).join('');
}

// ----- Add plan modal -----
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

// ----- Cancel modal -----
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
