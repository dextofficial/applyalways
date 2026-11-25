// Change the platform name here (and in index.html + public/manifest.webmanifest)
export const APP_NAME = 'Applyly';
export const COMPANY_NAME = 'Applyly';
export const SUPPORT_EMAIL = 'support@YOURDOMAIN.com';
export const SITE_URL = 'https://YOURDOMAIN.com';
export const LAST_UPDATED = '2026-11-25';
export const API = import.meta.env.VITE_API_URL || 'https://applyly-yki0.onrender.com/api';

export const getToken = () => localStorage.getItem('token');
export const setToken = (t) => (t ? localStorage.setItem('token', t) : localStorage.removeItem('token'));

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + path, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }
  if (res.status === 401 && token) {
    setToken(null);
    window.location.href = '/login';
  }
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

export const naira = (n) => '₦' + Number(n || 0).toLocaleString();
export const dateTime = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
