import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

// Separate processes keep browser globals in DOM tests isolated. Invoke each
// module directly so node:test registers the actual cases under the TS loader.
const files = readdirSync('tests').filter(file => /\.test\.tsx?$/.test(file)).sort();
let passed = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', path.join('tests', file)], {encoding:'utf8'});
  if (result.status !== 0 || result.error) {
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || String(result.error || ''));
    process.exit(1);
  }
  const count = Number((result.stdout.match(/(?:ℹ|#) pass (\d+)/) || [])[1] || 0);
  if (!count) throw new Error(`No test cases reported for ${file}`);
  passed += count;
  console.log(`${file}: ${count} passed`);
}
console.log(`Total: ${passed} cases passed in ${files.length} test files.`);
