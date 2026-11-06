import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Add CSRF only to our own API. Service tokens never enter browser requests.
const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const target = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
  const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  if (target.origin === location.origin && target.pathname.startsWith('/api/') && ['POST','PUT','PATCH','DELETE'].includes(method)) {
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    const csrf = document.cookie.split(';').find(v=>v.trim().startsWith('bv_csrf='));
    if(csrf)headers.set('X-CSRF-Token', decodeURIComponent(csrf.trim().slice(8)));
    return nativeFetch(input, {...init, headers, credentials:'same-origin'});
  }
  return nativeFetch(input, init);
};

// Defensive event handler to prevent benign iframe, Vite websocket, or popup errors from crashing UI
const isBenignError = (msg: string) => {
  const lower = (msg || '').toLowerCase();
  return (
    lower.includes('websocket') ||
    lower.includes('không thể kết nối với websocket') ||
    lower.includes('đã đóng mà chưa được mở') ||
    lower.includes('closed before the connection was established') ||
    lower.includes('failed to connect to websocket') ||
    lower.includes('popup-closed-by-user') ||
    lower.includes('cancelled-popup-request') ||
    lower.includes('cannot set property fetch') ||
    lower.includes('[vite]')
  );
};

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.message || String(event.reason || '');
  if (isBenignError(reason)) {
    event.preventDefault();
    event.stopImmediatePropagation?.();
  }
});

window.addEventListener('error', (event) => {
  const msg = event.message || event.error?.message || String(event || '');
  if (isBenignError(msg)) {
    event.preventDefault();
    event.stopImmediatePropagation?.();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
