import test from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../src/index.js';

test('run prints help and exits cleanly with no args', async () => {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => {
    logs.push(args.join(' '));
  };

  try {
    await run([]);
    assert.equal(logs.some((line) => line.includes('Usage:')), true);
    assert.equal(logs.some((line) => line.includes('create-zeropress-theme <name>')), true);
  } finally {
    console.log = originalLog;
  }
});

test('run prints help and exits cleanly with --help', async () => {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => {
    logs.push(args.join(' '));
  };

  try {
    await run(['--help']);
    assert.equal(logs.some((line) => line.includes('Options:')), true);
    assert.equal(logs.some((line) => line.includes('--with-devtools')), true);
  } finally {
    console.log = originalLog;
  }
});
