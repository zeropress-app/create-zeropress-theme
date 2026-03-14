import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_RUNTIME,
  validateNamespace,
  validateSlug,
  validateThemeFiles,
  validateThemeManifest,
} from '@zeropress/theme-validator';

const TEMPLATES = new Set(['minimal', 'blog', 'magazine', 'docs', 'portfolio']);
const DEFAULT_NAMESPACE = 'my-company';
const DEFAULT_VERSION = '0.1.0';
const DEFAULT_LICENSE = 'MIT';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_ROOT = path.join(__dirname, 'templates');

export async function run(argv) {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    printHelp();
    return;
  }

  const { name, template, withDevtools, namespace } = parseArgs(argv);
  const slug = validateSlug(name);
  const targetDir = path.resolve(process.cwd(), name);

  await ensureEmptyDirectory(targetDir);
  await scaffoldTheme(targetDir, {
    slug,
    namespace,
    template,
  });

  if (withDevtools) {
    await writeDevtoolsPackageJson(targetDir);
  }

  console.log(`Created ZeroPress theme at ${targetDir}`);
  console.log(`Template: ${template}`);
  console.log(`theme.json namespace: ${namespace}`);
  console.log('Update theme.json namespace before publishing if needed.');
  if (withDevtools) {
    console.log('Devtools enabled: npm run dev / npm run validate / npm run pack');
  }
}

function printHelp() {
  console.log(`create-zeropress-theme - ZeroPress theme scaffolding CLI

Usage:
  create-zeropress-theme <name> [--template <minimal|blog|magazine|docs|portfolio>] [--namespace <value>] [--with-devtools]

Options:
  --template <name>   Template variant (minimal, blog, magazine, docs, portfolio)
  --namespace <value> Theme namespace (default: ${DEFAULT_NAMESPACE})
  --with-devtools     Add package.json with dev / validate / pack scripts`);
}

function parseArgs(argv) {
  if (argv.length === 0) {
    throw new Error('Usage: create-zeropress-theme <name> [--template <minimal|blog|magazine|docs|portfolio>] [--namespace <value>] [--with-devtools]');
  }

  const positional = [];
  let template = 'minimal';
  let withDevtools = false;
  let namespace = DEFAULT_NAMESPACE;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }

    if (arg === '--with-devtools') {
      withDevtools = true;
      continue;
    }

    if (arg === '--template') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('--template requires a value');
      }
      if (!TEMPLATES.has(value)) {
        throw new Error(`Invalid template "${value}". Allowed: minimal, blog, magazine, docs, portfolio`);
      }
      template = value;
      i += 1;
      continue;
    }

    if (arg === '--namespace') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('--namespace requires a value');
      }
      namespace = validateNamespace(value);
      i += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  if (positional.length !== 1) {
    throw new Error('Expected exactly one theme directory name');
  }

  const name = positional[0];
  if (!name || name.includes('..') || path.isAbsolute(name)) {
    throw new Error('Theme name must be a relative directory name');
  }

  return { name, template, withDevtools, namespace };
}

async function ensureEmptyDirectory(targetDir) {
  try {
    const stat = await fs.stat(targetDir);
    if (!stat.isDirectory()) {
      throw new Error(`Path exists and is not a directory: ${targetDir}`);
    }
    const entries = await fs.readdir(targetDir);
    if (entries.length > 0) {
      throw new Error(`Directory is not empty: ${targetDir}`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(targetDir, { recursive: true });
      return;
    }
    throw error;
  }
}

async function scaffoldTheme(targetDir, options) {
  const { slug, namespace, template } = options;
  const templateDir = path.join(TEMPLATE_ROOT, template);
  let stat;

  try {
    stat = await fs.stat(templateDir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Template "${template}" is not available`);
    }
    throw error;
  }

  if (!stat.isDirectory()) {
    throw new Error(`Template path is not a directory: ${templateDir}`);
  }

  await fs.cp(templateDir, targetDir, { recursive: true });
  const manifest = {
    name: slug,
    namespace,
    slug,
    version: DEFAULT_VERSION,
    license: DEFAULT_LICENSE,
    runtime: DEFAULT_RUNTIME,
  };
  await updateThemeManifest(path.join(targetDir, 'theme.json'), manifest);
  await validateScaffoldedTheme(targetDir, manifest);
}

async function updateThemeManifest(themeJsonPath, values) {
  const raw = await fs.readFile(themeJsonPath, 'utf8');
  const parsed = JSON.parse(raw);
  parsed.name = values.name;
  parsed.namespace = values.namespace;
  parsed.slug = values.slug;
  parsed.version = values.version;
  parsed.license = values.license;
  parsed.runtime = values.runtime;
  delete parsed.author;
  await fs.writeFile(themeJsonPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
}

async function validateScaffoldedTheme(targetDir, manifest) {
  const manifestCheck = validateThemeManifest(manifest);
  if (!manifestCheck.ok) {
    throw new Error(manifestCheck.errors[0]?.message || 'Generated manifest is invalid');
  }

  const fileMap = await readThemeFiles(targetDir);
  const result = await validateThemeFiles(fileMap);
  if (!result.ok) {
    throw new Error(result.errors[0]?.message || 'Generated theme failed validation');
  }
}

async function readThemeFiles(rootDir) {
  const files = new Map();
  await walkThemeFiles(rootDir, rootDir, files);
  return files;
}

async function walkThemeFiles(rootDir, currentDir, files) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    const relativePath = path.relative(rootDir, absolutePath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      await walkThemeFiles(rootDir, absolutePath, files);
      continue;
    }

    files.set(relativePath, await fs.readFile(absolutePath));
  }
}

async function writeDevtoolsPackageJson(targetDir) {
  const pkg = {
    name: path.basename(targetDir),
    private: true,
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'npx zeropress-theme dev',
      validate: 'npx zeropress-theme validate',
      pack: 'npx zeropress-theme pack',
    },
  };
  await fs.writeFile(path.join(targetDir, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
}
