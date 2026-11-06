'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const cloud = fs.readFileSync('src/services/firebaseAdminServer.ts', 'utf8');
const gateway = fs.readFileSync('render-gateway.cjs', 'utf8');
const server = fs.readFileSync('server.ts', 'utf8');

test('Firestore publication no longer uses the old 8 second global timeout', () => {
  assert.doesNotMatch(cloud, /const\s+CLOUD_OP_TIMEOUT_MS\s*=\s*8000/);
  assert.match(cloud, /CLOUD_PUBLISH_TIMEOUT_MS[^\n]*60000/);
  assert.match(cloud, /publish CMS pages[\s\S]*timeoutMs:\s*CLOUD_PUBLISH_TIMEOUT_MS,\s*attempts:\s*1/);
});

test('a local Firestore timeout degrades Cloud without globally blocking CMS', () => {
  assert.match(cloud, /isLocalCloudTimeout\(error\)[\s\S]*ready:\s*Boolean\(db\)[\s\S]*degraded:\s*true/);
  assert.match(server, /if \(current\.ready && !current\.degraded && cloudAuthoritativeReady\) return;/);
});

test('gateway requires consecutive probe failures before marking an already healthy app unready', () => {
  assert.match(gateway, /GATEWAY_PROBE_TIMEOUT_MS \|\| 5000/);
  assert.match(gateway, /GATEWAY_PROBE_FAILURE_THRESHOLD \|\| 3/);
  assert.match(gateway, /consecutiveProbeFailures\s*>=\s*PROBE_FAILURE_THRESHOLD/);
  assert.match(gateway, /probeInFlight/);
});

test('page sync no longer adds a redundant Firestore marker write', () => {
  assert.doesNotMatch(server, /pages_sync/);
  assert.doesNotMatch(server, /writePageSyncMarker/);
});
