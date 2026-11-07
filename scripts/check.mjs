import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const required = ['app/blog.py', 'app/index.html', 'app/admin.html', 'app/admin-content.html', 'app/app.js', 'app/admin.js', 'app/mirror-catalog.json', 'app/friends.json', 'app/legal_documents.json'];
for (const file of required) await readFile(file);
for (const [command, args] of [['python', ['-m', 'py_compile', 'app/blog.py']], ['node', ['--check', 'app/app.js']], ['node', ['--check', 'app/admin.js']]]) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`checked ${required.length} application files`);
