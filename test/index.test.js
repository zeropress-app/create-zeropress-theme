import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { run } from '../src/index.js';

const packageJsonPath = new URL('../package.json', import.meta.url);

test('run prints help and exits cleanly with no args', async () => {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => {
    logs.push(args.join(' '));
  };

  try {
    await run([]);
    assert.equal(logs.some((line) => line.includes('Usage:')), true);
    assert.equal(logs.some((line) => line.includes('create-zeropress-theme --theme-slug <slug> --template <template>')), true);
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
    assert.equal(logs.some((line) => line.includes('Required Options:')), true);
    assert.equal(logs.some((line) => line.includes('--theme-slug <slug>')), true);
    assert.equal(logs.some((line) => line.includes('--template <template>')), true);
    assert.equal(logs.some((line) => line.includes('--help, -h')), true);
    assert.equal(logs.some((line) => line.includes('--version, -v')), true);
  } finally {
    console.log = originalLog;
  }
});

for (const flag of ['--version', '-v']) {
  test(`run prints version with ${flag}`, async () => {
    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => {
      logs.push(args.join(' '));
    };

    try {
      await run([flag]);
      const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      assert.deepEqual(logs, [pkg.version]);
    } finally {
      console.log = originalLog;
    }
  });
}

test('run prints help when --help appears anywhere in argv', async () => {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => {
    logs.push(args.join(' '));
  };

  try {
    await run(['--theme-slug', 'my-theme', '--help']);
    assert.equal(logs.some((line) => line.includes('Usage:')), true);
    assert.equal(logs.some((line) => line.includes('create-zeropress-theme --theme-slug <slug> --template <template>')), true);
  } finally {
    console.log = originalLog;
  }
});

test('run rejects the unsupported --slug option', async () => {
  await assert.rejects(
    () => run(['--slug', 'my-theme']),
    /Unknown option: --slug/,
  );
});

test('run requires --template when only --theme-slug is provided', async () => {
  await assert.rejects(
    () => run(['--theme-slug', 'my-theme']),
    /--template is required\. Allowed: minimal, blog, magazine, docs, portfolio/,
  );
});

test('run rejects invalid template values', async () => {
  await assert.rejects(
    () => run(['--theme-slug', 'my-theme', '--template', 'cms']),
    /Invalid template "cms"\. Allowed: minimal, blog, magazine, docs, portfolio/,
  );
});

test('run requires --theme-slug when only --template is provided', async () => {
  await assert.rejects(
    () => run(['--template', 'blog']),
    /--theme-slug is required/,
  );
});

test('run guides allowed templates when --template value is missing', async () => {
  await assert.rejects(
    () => run(['--theme-slug', 'my-theme', '--template']),
    /--template requires a value\. Allowed: minimal, blog, magazine, docs, portfolio/,
  );
});

test('run scaffolds a theme with required flags and fixed namespace', async () => {
  const cwd = process.cwd();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'create-zp-theme-'));
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => {
    logs.push(args.join(' '));
  };

  try {
    process.chdir(tempDir);
    await run(['--theme-slug', 'my-theme', '--template', 'blog']);

    const raw = await fs.readFile(path.join(tempDir, 'my-theme', 'theme.json'), 'utf8');
    const layoutHtml = await fs.readFile(path.join(tempDir, 'my-theme', 'layout.html'), 'utf8');
    const headerHtml = await fs.readFile(path.join(tempDir, 'my-theme', 'partials', 'header.html'), 'utf8');
    const footerHtml = await fs.readFile(path.join(tempDir, 'my-theme', 'partials', 'footer.html'), 'utf8');
    const themeJson = JSON.parse(raw);

    assert.equal(themeJson.$schema, 'https://zeropress.dev/schemas/theme.schema.json');
    assert.equal(themeJson.name, 'my-theme');
    assert.equal(themeJson.namespace, 'my-company');
    assert.equal(themeJson.slug, 'my-theme');
    assert.equal(themeJson.version, '0.1.0');
    assert.equal(themeJson.license, 'MIT');
    assert.equal(themeJson.runtime, '0.3');
    assert.deepEqual(themeJson.menuSlots, {
      primary: {
        title: 'Primary Menu',
        description: 'Recommended menu_id for the main header navigation',
      },
      footer: {
        title: 'Footer Menu',
        description: 'Recommended menu_id for footer links',
      },
    });
    assert.deepEqual(Object.keys(themeJson), [
      '$schema',
      'name',
      'namespace',
      'slug',
      'version',
      'license',
      'runtime',
      'description',
      'menuSlots',
    ]);
    assert.match(layoutHtml, /<title>\{\{meta\.title\}\}<\/title>/);
    assert.match(layoutHtml, /\{\{meta\.head_tags\}\}/);
    assert.match(headerHtml, /\{\{menu:primary\}\}/);
    assert.match(footerHtml, /\{\{menu:footer\}\}/);
    assert.equal(logs.some((line) => line.includes('Template: blog')), true);
    assert.equal(logs.some((line) => line.includes('theme.json namespace: my-company')), true);
    await assert.rejects(() => fs.access(path.join(tempDir, 'my-theme', 'package.json')));
  } finally {
    process.chdir(cwd);
    console.log = originalLog;
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

for (const template of ['minimal', 'blog', 'magazine', 'docs', 'portfolio']) {
  test(`run self-validates generated ${template} template`, async () => {
    const cwd = process.cwd();
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'create-zp-theme-'));

    try {
      process.chdir(tempDir);
      await run(['--theme-slug', `${template}-starter`, '--template', template]);

      const raw = await fs.readFile(path.join(tempDir, `${template}-starter`, 'theme.json'), 'utf8');
      const layoutHtml = await fs.readFile(path.join(tempDir, `${template}-starter`, 'layout.html'), 'utf8');
      const headerHtml = await fs.readFile(path.join(tempDir, `${template}-starter`, 'partials', 'header.html'), 'utf8');
      const footerHtml = await fs.readFile(path.join(tempDir, `${template}-starter`, 'partials', 'footer.html'), 'utf8');
      const themeJson = JSON.parse(raw);
      assert.equal(themeJson.slug, `${template}-starter`);
      assert.equal(themeJson.runtime, '0.3');
      assert.deepEqual(Object.keys(themeJson.menuSlots || {}), ['primary', 'footer']);
      assert.match(layoutHtml, /<title>\{\{meta\.title\}\}<\/title>/);
      assert.match(layoutHtml, /\{\{meta\.head_tags\}\}/);
      assert.match(headerHtml, /\{\{menu:primary\}\}/);
      assert.match(footerHtml, /\{\{menu:footer\}\}/);
    } finally {
      process.chdir(cwd);
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
}

test('run rejects a theme slug that is not already valid', async () => {
  await assert.rejects(
    () => run(['--theme-slug', 'My Theme', '--template', 'blog']),
    /Theme slug must use lowercase/,
  );
});

test('run fails when generated scaffold does not pass self-check', async () => {
  const cwd = process.cwd();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'create-zp-theme-'));
  const originalReadDir = fs.readdir;

  fs.readdir = async function patchedReadDir(currentPath, options) {
    const result = await originalReadDir.call(this, currentPath, options);
    if (typeof currentPath === 'string' && currentPath.endsWith('/broken-theme') && Array.isArray(result)) {
      return result.filter((entry) => {
        const name = typeof entry === 'string' ? entry : entry.name;
        return name !== 'page.html';
      });
    }
    return result;
  };

  try {
    process.chdir(tempDir);
    await assert.rejects(
      () => run(['--theme-slug', 'broken-theme', '--template', 'minimal']),
      /Required template 'page\.html' is missing/,
    );
  } finally {
    fs.readdir = originalReadDir;
    process.chdir(cwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
