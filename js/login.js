const empIdInput = document.getElementById('empId');
const loginBtn = document.getElementById('loginBtn');
const errorMsg = document.getElementById('errorMsg');

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = 'block';
}

function doLogin() {
  const empId = empIdInput.value.trim();
  if (!empId) { showError('กรุณากรอกรหัสพนักงาน'); return; }
  const user = USERS.find(u => String(u.empId) === String(empId));
  if (!user) { showError('ไม่พบรหัสพนักงานนี้ในระบบ'); return; }
  Session.save({ empId: user.empId, name: user.name, role: user.role });
  window.location.href = user.role === 'admin' ? 'admin.html' : 'calendar.html';
}

loginBtn.addEventListener('click', doLogin);
empIdInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

// ถ้า login ค้างอยู่แล้วให้ข้ามไปหน้าที่ถูกต้องเลย
const existing = Session.get();
if (existing) {
  window.location.href = existing.role === 'admin' ? 'admin.html' : 'calendar.html';
}
