'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const queue = fs.readFileSync('src/services/messageQueueServer.ts','utf8');
const cloud = fs.readFileSync('src/services/firebaseAdminServer.ts','utf8');
const server = fs.readFileSync('server.ts','utf8');
const seo = fs.readFileSync('src/components/admin/SeoManager.tsx','utf8');
const dashboard = fs.readFileSync('src/components/admin/AdminDashboard.tsx','utf8');

test('mutable queue jobs use latest-write-wins coalescing and event-driven worker wakeups', () => {
  assert.match(queue, /COALESCE_KEY/);
  assert.match(queue, /inferCoalesceKey/);
  assert.match(queue, /compactPendingCloudWriteJobs/);
  assert.match(queue, /WORKER_BATCH_SIZE/);
  assert.match(queue, /workerMode:\s*'event-driven'/);
  assert.doesNotMatch(queue, /setInterval\(\(\) => \{ void tick\(\); \}, POLL_MS\)/);
});

test('page/settings/AI entity writes provide coalesce keys', () => {
  assert.match(cloud, /entity:page:/);
  assert.match(cloud, /settings:global/);
  assert.match(cloud, /ai:taxonomy/);
  assert.match(cloud, /entity:knowledge:/);
});

test('startup replays durable queued writes before hydrating Firestore into memory', () => {
  const replay = server.indexOf('Startup replay:');
  const read = server.indexOf('const remote = await readCloudState()', replay);
  assert.ok(replay > 0 && read > replay);
});

test('home SEO resolves canonical page_home instead of synthetic home id', () => {
  assert.match(server, /raw === 'home'.*raw === 'page_home'.*return getHomePage\(\)/s);
  assert.match(seo, /p\.id === 'page_home'/);
  assert.doesNotMatch(seo, /initialPageId \|\| 'home'/);
});

test('save UI distinguishes immediate local save from background Firestore sync', () => {
  assert.match(dashboard, /Đã lưu bản nháp ngay trên server\. Firestore đang đồng bộ nền/);
  assert.match(server, /persistence:\{localSaved:true,cloud:/);
});
