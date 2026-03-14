import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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

test('run scaffolds a v0.2 theme with default namespace', async () => {
  const cwd = process.cwd();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'create-zp-theme-'));
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => {
    logs.push(args.join(' '));
  };

  try {
    process.chdir(tempDir);
    await run(['mytheme1']);

    const raw = await fs.readFile(path.join(tempDir, 'mytheme1', 'theme.json'), 'utf8');
    const themeJson = JSON.parse(raw);

    assert.equal(themeJson.name, 'mytheme1');
    assert.equal(themeJson.namespace, 'my-company');
    assert.equal(themeJson.slug, 'mytheme1');
    assert.equal(themeJson.version, '0.1.0');
    assert.equal(themeJson.license, 'MIT');
    assert.equal(themeJson.runtime, '0.2');
    assert.equal(Object.hasOwn(themeJson, 'author'), false);
    assert.equal(logs.some((line) => line.includes('theme.json namespace: my-company')), true);
  } finally {
    process.chdir(cwd);
    console.log = originalLog;
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('run accepts an explicit namespace override', async () => {
  const cwd = process.cwd();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'create-zp-theme-'));

  try {
    process.chdir(tempDir);
    await run(['editorial-kit', '--namespace', 'acme-studio']);

    const raw = await fs.readFile(path.join(tempDir, 'editorial-kit', 'theme.json'), 'utf8');
    const themeJson = JSON.parse(raw);

    assert.equal(themeJson.name, 'editorial-kit');
    assert.equal(themeJson.namespace, 'acme-studio');
    assert.equal(themeJson.slug, 'editorial-kit');
  } finally {
    process.chdir(cwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('run rejects a theme name that is not already a valid slug', async () => {
  await assert.rejects(
    () => run(['My Theme']),
    /valid slug/
  );
});
