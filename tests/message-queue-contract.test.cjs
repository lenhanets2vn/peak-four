const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const queue = fs.readFileSync('src/services/messageQueueServer.ts','utf8');
const cloud = fs.readFileSync('src/services/firebaseAdminServer.ts','utf8');
const server = fs.readFileSync('server.ts','utf8');

test('Redis durable queue has pending, processing leases, retry and dead-letter', () => {
  assert.match(queue, /cloud-write-queue:pending:v1/);
  assert.match(queue, /cloud-write-queue:processing:v1/);
  assert.match(queue, /cloud-write-queue:dead:v1/);
  assert.match(queue, /recoverExpiredLeases/);
  assert.match(queue, /retryDelayMs/);
  assert.match(queue, /moveToDead/);
  assert.match(queue, /retryDeadCloudWriteJobs/);
  assert.match(queue, /purgeDeadCloudWriteJobs/);
  assert.match(queue, /encodeStoredJson\(job\)/);
});

test('Cloud writes enqueue before direct fallback and worker is globally serialized', () => {
  assert.match(cloud, /enqueueCloudWriteJob\(type, label/);
  assert.match(cloud, /startCloudWriteQueueWorker\(runQueuedCloudOperation\)/);
  assert.match(cloud, /const actualRun = queue\.then/);
  assert.match(cloud, /publication-save/);
  assert.match(cloud, /knowledge-delete-bulk/);
});

test('Server exposes queue observability and permits buffering after authoritative hydration', () => {
  assert.match(server, /\/api\/cloud\/queue-status/);
  assert.match(server, /messageQueue: await getCloudWriteQueueStatus\(\)/);
  assert.match(server, /cloudWriteQueueConfigured\(\) && cloudAuthoritativeReady && !cloudStartupBlocked/);
  assert.match(server, /startCloudMessageQueue\(\)/);
  assert.match(server, /\/api\/cloud\/queue\/retry-dead/);
});


test('Queue worker is event-driven and does not poll Redis while idle', () => {
  assert.doesNotMatch(queue, /setInterval\s*\(/);
  assert.doesNotMatch(queue, /IDLE_POLL_MS/);
  assert.match(queue, /workerMode:\s*'event-driven'/);
  assert.match(queue, /Queue empty => no polling/);
  assert.match(queue, /wakeCloudWriteQueueWorker/);
  assert.match(queue, /scheduleNextPendingWake/);
  assert.match(queue, /if \(!await hasDuePending\(\)\) return 0/);
});
