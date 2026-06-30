const empIdInput = document.getElementById('empId');
const loginBtn = document.getElementById('loginBtn');
const errorMsg = document.getElementById('errorMsg');

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = 'block';
}

async function doLogin() {
  const empId = empIdInput.value.trim();
  if (!empId) { showError('กรุณากรอกรหัสพนักงาน'); return; }
  loginBtn.disabled = true;
  loginBtn.textContent = 'กำลังเข้าสู่ระบบ...';
  try {
    const res = await Api.login(empId);
    if (!res.ok) { showError(res.error || 'ไม่พบรหัสพนักงานนี้'); return; }
    Session.save(res.user);
    window.location.href = res.user.role === 'admin' ? 'admin.html' : 'calendar.html';
  } catch (e) {
    showError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: ' + e.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'เข้าสู่ระบบ';
  }
}

loginBtn.addEventListener('click', doLogin);
empIdInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

// ถ้า login ค้างอยู่แล้วให้ข้ามไปหน้าที่ถูกต้องเลย
const existing = Session.get();
if (existing) {
  window.location.href = existing.role === 'admin' ? 'admin.html' : 'calendar.html';
}
