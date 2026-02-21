const API_BASE = '/api';

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const cgToken = localStorage.getItem('caregiverToken');
  if (cgToken) headers['X-Caregiver-Token'] = cgToken;
  return headers;
}

async function request(method, path, body) {
  const opts = { method, headers: getHeaders() };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  login: (body) => request('POST', '/auth/login', body),
  register: (body) => request('POST', '/auth/register', body),
  verifyPIN: (pin) => request('POST', '/auth/verify-pin', { pin }),
  getMe: () => request('GET', '/auth/me'),

  // Medicines
  getMedicines: () => request('GET', '/medicines'),
  addMedicine: (body) => request('POST', '/medicines', body),
  updateMedicine: (id, body) => request('PUT', `/medicines/${id}`, body),
  deleteMedicine: (id) => request('DELETE', `/medicines/${id}`),
  getRefillAlerts: () => request('GET', '/medicines/refill-alerts'),

  // Dose Logs
  getTodayLogs: () => request('GET', '/dose-logs/today'),
  markDoseTaken: (id) => request('PUT', `/dose-logs/${id}/take`),
  getWeeklySummary: () => request('GET', '/dose-logs/weekly-summary'),
  generateLogs: () => request('POST', '/dose-logs/generate'),

  // Notifications
  getNotifications: () => request('GET', '/notifications'),
  markNotificationAsRead: (id) => request('PUT', `/notifications/${id}/read`),
  markAllNotificationsAsRead: () => request('PUT', '/notifications/read-all'),

  // AI
  suggestSchedule: (input) => request('POST', '/ai/suggest-schedule', { input }),
};
