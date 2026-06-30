// ===== ตารางแผนงานการปฏิบัติงาน - Backend (Google Apps Script) =====
// วิธีติดตั้ง: เปิด Google Sheet > Extensions > Apps Script > วางโค้ดนี้ทับ
// แล้ว Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone
// คัดลอก URL ที่ได้ไปใส่ใน js/api.js (CONFIG.API_URL)

const SS = SpreadsheetApp.getActiveSpreadsheet();
const SHEET_USERS = 'Users';
const SHEET_PLANS = 'Plans';

function doGet(e) {
  return handle(e);
}
function doPost(e) {
  return handle(e);
}

function handle(e) {
  try {
    const action = e.parameter.action;
    const payload = e.postData ? JSON.parse(e.postData.contents || '{}') : {};
    let result;

    switch (action) {
      case 'login':
        result = login(payload.empId || e.parameter.empId);
        break;
      case 'getApprovedPlans':
        result = getPlans('อนุมัติแล้ว');
        break;
      case 'getMyRequests':
        result = getPlans(null, payload.empId || e.parameter.empId);
        break;
      case 'addPlan':
        result = addPlan(payload);
        break;
      case 'cancelPlan':
        result = cancelPlan(payload.id, payload.reason);
        break;
      case 'getPendingPlans': // admin
        result = getPlans('รออนุมัติ');
        break;
      case 'approvePlan': // admin
        result = setPlanStatus(payload.id, 'อนุมัติแล้ว');
        break;
      case 'rejectPlan': // admin
        result = setPlanStatus(payload.id, 'ปฏิเสธ', payload.reason);
        break;
      case 'getUsers': // admin
        result = getUsers();
        break;
      case 'addUser': // admin
        result = addUser(payload);
        break;
      case 'deleteUser': // admin
        result = deleteUser(payload.empId);
        break;
      default:
        result = { ok: false, error: 'ไม่รู้จัก action: ' + action };
    }
    return jsonOut(result);
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheet(name) {
  return SS.getSheetByName(name);
}

// แคชผลลัพธ์ไว้ 30 วินาที ลดการอ่านชีตซ้ำเวลามีคนเปิดพร้อมกันหรือกดรัวๆ
const CACHE = CacheService.getScriptCache();
function cachedRows(sheetName) {
  const key = 'rows_' + sheetName;
  const hit = CACHE.get(key);
  if (hit) return JSON.parse(hit);
  const rows = rowsToObjects(sheet(sheetName));
  CACHE.put(key, JSON.stringify(rows), 30);
  return rows;
}
function clearCache(sheetName) {
  CACHE.remove('rows_' + sheetName);
}

function rowsToObjects(sh) {
  const data = sh.getDataRange().getValues();
  const headers = data.shift();
  return data
    .filter(r => r.join('') !== '')
    .map(r => {
      const o = {};
      headers.forEach((h, i) => (o[h] = r[i]));
      return o;
    });
}

// ----- Users -----
function login(empId) {
  if (!empId) return { ok: false, error: 'กรุณากรอกรหัสพนักงาน' };
  const users = cachedRows(SHEET_USERS);
  const user = users.find(u => String(u.empId) === String(empId));
  if (!user) return { ok: false, error: 'ไม่พบรหัสพนักงานนี้ในระบบ' };
  return { ok: true, user: { empId: user.empId, name: user.name, role: user.role } };
}

function getUsers() {
  return { ok: true, users: cachedRows(SHEET_USERS) };
}

function addUser(data) {
  const sh = sheet(SHEET_USERS);
  const users = rowsToObjects(sh);
  if (users.find(u => String(u.empId) === String(data.empId))) {
    return { ok: false, error: 'มีรหัสพนักงานนี้อยู่แล้ว' };
  }
  sh.appendRow([data.empId, data.name, data.role || 'employee']);
  clearCache(SHEET_USERS);
  return { ok: true };
}

function deleteUser(empId) {
  const sh = sheet(SHEET_USERS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(empId)) {
      sh.deleteRow(i + 1);
      clearCache(SHEET_USERS);
      return { ok: true };
    }
  }
  return { ok: false, error: 'ไม่พบรหัสพนักงาน' };
}

// ----- Plans -----
function nextPlanId(sh) {
  const data = sh.getDataRange().getValues();
  let max = 0;
  for (let i = 1; i < data.length; i++) {
    const n = Number(data[i][0]) || 0;
    if (n > max) max = n;
  }
  return max + 1;
}

function getPlans(status, empId) {
  let plans = cachedRows(SHEET_PLANS);
  if (status) plans = plans.filter(p => p.status === status);
  if (empId) plans = plans.filter(p => String(p.empId) === String(empId));
  return { ok: true, plans: plans };
}

function addPlan(data) {
  const sh = sheet(SHEET_PLANS);
  const id = nextPlanId(sh);
  sh.appendRow([
    id,
    data.date,
    data.startTime,
    data.endTime,
    data.task,
    data.pchg,
    data.chchg,
    data.team,
    data.location,
    data.outageDetail,
    data.empId,
    data.empName,
    'รออนุมัติ',
    '',
    new Date()
  ]);
  clearCache(SHEET_PLANS);
  return { ok: true, id: id };
}

function setPlanStatus(id, status, reason) {
  const sh = sheet(SHEET_PLANS);
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const colStatus = headers.indexOf('status') + 1;
  const colReason = headers.indexOf('cancelReason') + 1;
  for (let i = 1; i < data.length; i++) {
    if (Number(data[i][0]) === Number(id)) {
      sh.getRange(i + 1, colStatus).setValue(status);
      if (reason) sh.getRange(i + 1, colReason).setValue(reason);
      clearCache(SHEET_PLANS);
      return { ok: true };
    }
  }
  return { ok: false, error: 'ไม่พบแผนงานนี้' };
}

function cancelPlan(id, reason) {
  return setPlanStatus(id, 'ยกเลิก', reason);
}
