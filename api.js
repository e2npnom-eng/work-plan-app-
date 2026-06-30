// ===== ตั้งค่า API URL ตรงนี้ (ได้จากตอน Deploy Apps Script) =====
const API_URL = 'https://script.google.com/macros/s/AKfycbw53bQkHOB8zLR9lu4LeRfQ-FbaAdSUhLmjM7vWuknLw_p0HHQ1oN7Xl9mISO99i1HdIg/exec';

const Api = {
  async call(action, payload) {
    const res = await fetch(API_URL + '?action=' + action, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
    if (!res.ok) throw new Error('เครือข่ายมีปัญหา (' + res.status + ')');
    return res.json();
  },
  login: (empId) => Api.call('login', { empId }),
  getApprovedPlans: () => Api.call('getApprovedPlans'),
  getMyRequests: (empId) => Api.call('getMyRequests', { empId }),
  addPlan: (data) => Api.call('addPlan', data),
  cancelPlan: (id, reason) => Api.call('cancelPlan', { id, reason }),
  getPendingPlans: () => Api.call('getPendingPlans'),
  approvePlan: (id) => Api.call('approvePlan', { id }),
  rejectPlan: (id, reason) => Api.call('rejectPlan', { id, reason }),
  getUsers: () => Api.call('getUsers'),
  addUser: (data) => Api.call('addUser', data),
  deleteUser: (empId) => Api.call('deleteUser', { empId }),
};

const Session = {
  KEY: 'workplan_session',
  save(user) { sessionStorage.setItem(this.KEY, JSON.stringify(user)); },
  get() {
    const raw = sessionStorage.getItem(this.KEY);
    return raw ? JSON.parse(raw) : null;
  },
  clear() { sessionStorage.removeItem(this.KEY); },
  requireLogin(requireAdmin) {
    const user = this.get();
    if (!user) {
      window.location.href = 'index.html';
      return null;
    }
    if (requireAdmin && user.role !== 'admin') {
      window.location.href = 'calendar.html';
      return null;
    }
    return user;
  },
};
