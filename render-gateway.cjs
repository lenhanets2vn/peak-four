'use strict';

const http = require('http');

const PUBLIC_PORT = Number(process.env.PORT || 10000);
const APP_HOST = process.env.APP_HOST || '127.0.0.1';
const APP_PORT = Number(process.env.APP_PORT || 10001);
const BOOT_STARTED_AT = Date.now();
const WARMUP_MAX_MS = Number(process.env.WARMUP_MAX_MS || 180000);
const PROBE_TIMEOUT_MS = Math.max(1000, Math.min(15000, Number(process.env.GATEWAY_PROBE_TIMEOUT_MS || 5000)));
const PROBE_INTERVAL_MS = Math.max(500, Math.min(10000, Number(process.env.GATEWAY_PROBE_INTERVAL_MS || 2000)));
const PROBE_FAILURE_THRESHOLD = Math.max(1, Math.min(10, Number(process.env.GATEWAY_PROBE_FAILURE_THRESHOLD || 3)));

let appReady = false;
let lastProbeAt = 0;
let lastProbeError = '';
let lastSuccessfulProbeAt = 0;
let consecutiveProbeFailures = 0;
let probeInFlight = null;

function markProbeSuccess() {
  appReady = true;
  consecutiveProbeFailures = 0;
  lastProbeAt = Date.now();
  lastSuccessfulProbeAt = lastProbeAt;
  lastProbeError = '';
}

function markProbeFailure(message) {
  consecutiveProbeFailures += 1;
  lastProbeAt = Date.now();
  lastProbeError = message || 'probe failed';
  // Once the app has been healthy, tolerate short probe stalls. Render Free and
  // Firestore activity can briefly delay /api/health without the Node process dying.
  if (!appReady || consecutiveProbeFailures >= PROBE_FAILURE_THRESHOLD) appReady = false;
}

function probeApp() {
  if (probeInFlight) return probeInFlight;
  probeInFlight = new Promise((resolve) => {
    const req = http.request({
      host: APP_HOST,
      port: APP_PORT,
      path: '/api/health',
      method: 'GET',
      timeout: PROBE_TIMEOUT_MS,
      headers: { 'x-render-gateway-probe': '1' },
    }, (res) => {
      res.resume();
      if (res.statusCode >= 200 && res.statusCode < 500) {
        markProbeSuccess();
        resolve(true);
      } else {
        markProbeFailure(`HTTP ${res.statusCode}`);
        resolve(false);
      }
    });
    req.on('timeout', () => req.destroy(new Error('probe timeout')));
    req.on('error', (err) => {
      markProbeFailure(err && err.message ? err.message : 'probe failed');
      resolve(false);
    });
    req.end();
  }).finally(() => { probeInFlight = null; });
  return probeInFlight;
}

setInterval(() => { void probeApp(); }, PROBE_INTERVAL_MS).unref();
void probeApp();

function sendWarmup(res, status = 200) {
  const elapsed = Math.max(0, Math.round((Date.now() - BOOT_STARTED_AT) / 1000));
  const body = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Đang khởi động</title><style>body{margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f5f8fc;color:#10234a;display:grid;min-height:100vh;place-items:center}.box{max-width:520px;padding:32px;text-align:center}.dot{width:44px;height:44px;border:4px solid #d8e5f6;border-top-color:#0b63ce;border-radius:999px;margin:0 auto 20px;animation:s 1s linear infinite}@keyframes s{to{transform:rotate(360deg)}}h1{font-size:24px;margin:0 0 8px}p{color:#60708e;line-height:1.55;margin:0}</style></head><body><div class="box"><div class="dot"></div><h1>Hệ thống đang khởi động</h1><p>Vui lòng chờ trong giây lát. Trang sẽ tự tải lại khi dịch vụ sẵn sàng.</p></div><script>setTimeout(()=>location.reload(),2500)</script></body></html>`;
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store, no-cache, must-revalidate',
    'x-app-warmup-seconds': String(elapsed),
  });
  res.end(body);
}

function proxy(req, res) {
  const headers = { ...req.headers, host: `${APP_HOST}:${APP_PORT}`, 'x-forwarded-host': req.headers.host || '', 'x-forwarded-proto': process.env.GATEWAY_BEHIND_TLS_PROXY === 'true' ? String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim() : (req.socket.encrypted ? 'https' : 'http'), 'x-forwarded-for': process.env.GATEWAY_BEHIND_TLS_PROXY === 'true' ? [req.headers['x-forwarded-for'], req.socket.remoteAddress].filter(Boolean).join(', ') : req.socket.remoteAddress };
  const upstream = http.request({ host: APP_HOST, port: APP_PORT, path: req.url, method: req.method, headers, timeout: 125000 }, (upRes) => {
    res.writeHead(upRes.statusCode || 502, upRes.headers);
    upRes.pipe(res);
  });
  upstream.on('timeout', () => upstream.destroy(new Error('upstream timeout')));
  upstream.on('error', (err) => {
    markProbeFailure(err && err.message ? err.message : 'upstream failed');
    if (res.headersSent) return res.end();
    const elapsed = Date.now() - BOOT_STARTED_AT;
    if (elapsed < WARMUP_MAX_MS && (req.method === 'GET' || req.method === 'HEAD')) return sendWarmup(res, 200);
    res.writeHead(503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ ok: false, warming: elapsed < WARMUP_MAX_MS, error: err.message || 'Application unavailable' }));
  });
  req.pipe(upstream);
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/__gateway/health') {
    const ready = appReady || await probeApp();
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    return res.end(JSON.stringify({ ok: true, gateway: 'ready', appReady: ready, appPort: APP_PORT, uptimeSeconds: Math.round((Date.now()-BOOT_STARTED_AT)/1000), lastProbeAt: lastProbeAt || null, lastSuccessfulProbeAt: lastSuccessfulProbeAt || null, consecutiveProbeFailures, probeTimeoutMs: PROBE_TIMEOUT_MS, failureThreshold: PROBE_FAILURE_THRESHOLD, lastProbeError: lastProbeError || null }));
  }

  if (!appReady) await probeApp();
  if (!appReady) {
    const elapsed = Date.now() - BOOT_STARTED_AT;
    if (req.url === '/api/health') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(JSON.stringify({ status: 'warming', gateway: true, appReady: false, uptimeSeconds: Math.round(elapsed/1000), lastProbeError: lastProbeError || null }));
    }
    if (elapsed < WARMUP_MAX_MS && (req.method === 'GET' || req.method === 'HEAD')) return sendWarmup(res, 200);
    res.writeHead(503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    return res.end(JSON.stringify({ ok: false, warming: false, error: 'Application process is not ready', lastProbeError: lastProbeError || null }));
  }
  return proxy(req, res);
});

server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;
server.requestTimeout = 130000;
server.listen(PUBLIC_PORT, '0.0.0.0', () => {
  console.log(`[gateway] public warm-up gateway listening on http://0.0.0.0:${PUBLIC_PORT}; app target http://${APP_HOST}:${APP_PORT}`);
});
