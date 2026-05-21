import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '',
  withCredentials: true,
  headers: {
    'ngrok-skip-browser-warning': '1',
  },
});
