const { spawn } = require('child_process');
const path = require('path');
const args = process.argv.slice(2);

const viteCli = path.join(__dirname, '..', 'node_modules', 'vite', 'bin', 'vite.js');
const polyfill = path.join(__dirname, 'crypto-hash-polyfill.js');

const proc = spawn(process.execPath, ['--require', polyfill, viteCli, ...args], {
  stdio: 'inherit'
});

proc.on('exit', code => process.exit(code));
