'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');

function listen(server, port = 0) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server.address().port));
  });
}

function getFreePort() {
  const server = http.createServer();
  return listen(server).then((port) => new Promise((resolve) => server.close(() => resolve(port))));
}

function requestJson(port, pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path: pathname, timeout: 4000 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body, json: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, body, json: null }); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('request timeout')));
    req.on('error', reject);
  });
}

async function waitFor(fn, timeoutMs = 7000, intervalMs = 100) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeoutMs) {
    try {
      last = await fn();
      if (last) return last;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`waitFor timeout; last=${JSON.stringify(last)}`);
}

test('gateway tolerates brief probe stalls and only marks app unready after threshold', async (t) => {
  let slowHealth = false;
  const app = http.createServer((req, res) => {
    if (req.url === '/api/health') {
      const send = () => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end('{"status":"ok"}');
      };
      if (slowHealth) setTimeout(send, 1500);
      else send();
      return;
    }
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('upstream-ok');
  });
  const appPort = await listen(app);
  const gatewayPort = await getFreePort();
  const child = spawn(process.execPath, [path.join(process.cwd(), 'render-gateway.cjs')], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(gatewayPort),
      APP_HOST: '127.0.0.1',
      APP_PORT: String(appPort),
      WARMUP_MAX_MS: '1000',
      GATEWAY_PROBE_TIMEOUT_MS: '1000',
      GATEWAY_PROBE_INTERVAL_MS: '500',
      GATEWAY_PROBE_FAILURE_THRESHOLD: '3',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  t.after(() => {
    child.kill('SIGTERM');
    app.close();
  });

  await waitFor(async () => {
    const result = await requestJson(gatewayPort, '/__gateway/health');
    return result.json?.appReady === true ? result : null;
  });

  slowHealth = true;
  await new Promise((resolve) => setTimeout(resolve, 2200));

  // Fewer than three consecutive completed timeouts should not globally flip a
  // previously healthy application to unready. Normal traffic must still proxy.
  const duringBriefStall = await new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: gatewayPort, path: '/hello', timeout: 4000 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
  });
  assert.equal(duringBriefStall.status, 200);
  assert.equal(duringBriefStall.body, 'upstream-ok');

  // After enough consecutive probe failures, the gateway should eventually report
  // the application as unready rather than masking a persistent failure forever.
  await waitFor(async () => {
    const result = await requestJson(gatewayPort, '/__gateway/health');
    return result.json?.appReady === false && result.json?.consecutiveProbeFailures >= 3 ? result : null;
  }, 7000);

  slowHealth = false;
  const recovered = await waitFor(async () => {
    const result = await requestJson(gatewayPort, '/__gateway/health');
    return result.json?.appReady === true && result.json?.consecutiveProbeFailures === 0 ? result : null;
  }, 7000);
  assert.equal(recovered.json.lastProbeError, null);
});
