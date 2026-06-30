const adminUser = Session.requireLogin(true);

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

async function init() {
  if (!adminUser) return;
  loadPending();
  loadUsers();
}

// ----- Pending plans -----
async function loadPending() {
  const box = document.getElementById('pendingList');
  const res = await Api.getPendingPlans();
  if (!res.ok || res.plans.length === 0) {
    box.innerHTML = '<div class="empty-state">ไม่มีคำขอรออนุมัติ</div>';
    return;
  }
  box.innerHTML = res.plans.map(p => `
    <div class="request-item">
      <div>
        <p style="font-size:14px;margin:0;font-weight:600">${escapeHtml(p.task)}</p>
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

// ----- Users -----
async function loadUsers() {
  const tbody = document.getElementById('userTableBody');
  const res = await Api.getUsers();
  if (!res.ok || res.users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">ยังไม่มีรายชื่อพนักงาน</td></tr>';
    return;
  }
  tbody.innerHTML = res.users.map(u => `
    <tr>
      <td>${escapeHtml(u.empId)}</td>
      <td>${escapeHtml(u.name)}</td>
      <td>${u.role === 'admin' ? 'แอดมิน' : 'พนักงาน'}</td>
      <td style="text-align:right">
        <button class="btn-danger" style="font-size:12px;padding:4px 8px" onclick="removeUser('${u.empId}')">ลบ</button>
      </td>
    </tr>
  `).join('');
}

async function removeUser(empId) {
  if (!confirm('ยืนยันลบรหัสพนักงาน ' + empId + ' ?')) return;
  await Api.deleteUser(empId);
  loadUsers();
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

document.getElementById('logoutBtn').addEventListener('click', () => {
  Session.clear();
  window.location.href = 'index.html';
});

init();
