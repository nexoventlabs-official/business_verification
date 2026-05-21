import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '',
  withCredentials: true,
  headers: {
    'ngrok-skip-browser-warning': '1',
  },
});

export function markLoggedIn()  { localStorage.setItem('bsp_session', '1'); }
export function markLoggedOut() { localStorage.removeItem('bsp_session'); }
export function hasSessionHint() { return !!localStorage.getItem('bsp_session'); }
