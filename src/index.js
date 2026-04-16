import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_RUNTIME,
  validateSlug,
  validateThemeFiles,
  validateThemeManifest,
} from '@zeropress/theme-validator';

const TEMPLATES = new Set(['minimal', 'blog', 'magazine', 'docs', 'portfolio']);
const TEMPLATE_LIST = 'minimal, blog, magazine, docs, portfolio';
const DEFAULT_NAMESPACE = 'my-company';
const DEFAULT_VERSION = '0.1.0';
const DEFAULT_LICENSE = 'MIT';
const DEFAULT_THEME_SCHEMA = 'https://zeropress.dev/schemas/theme.schema.json';
const MANIFEST_ORDERED_KEYS = new Set(['$schema', 'name', 'namespace', 'slug', 'version', 'license', 'runtime']);
const require = createRequire(import.meta.url);
const { version: PACKAGE_VERSION } = require('../package.json');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_ROOT = path.join(__dirname, 'templates');

export async function run(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    return;
  }

  if (argv.includes('--version') || argv.includes('-v')) {
    console.log(PACKAGE_VERSION);
    return;
  }

  if (argv.length === 0) {
    printHelp();
    return;
  }

  const { themeSlug, template } = parseArgs(argv);
  const slug = validateSlug(themeSlug);
  const targetDir = path.resolve(process.cwd(), themeSlug);

  await ensureEmptyDirectory(targetDir);
  await scaffoldTheme(targetDir, {
    slug,
    template,
  });

  console.log(`Created ZeroPress theme at ${targetDir}`);
  console.log(`Template: ${template}`);
  console.log(`theme.json namespace: ${DEFAULT_NAMESPACE}`);
  console.log('Update theme.json namespace before publishing if needed.');
}

function printHelp() {
  console.log(`create-zeropress-theme - ZeroPress theme starter generator

Usage:
  create-zeropress-theme --theme-slug <slug> --template <template>

Required Options:
  --theme-slug <slug>   Theme slug and target directory name
  --template <template> Starter template: ${TEMPLATE_LIST}

Options:
  --help, -h            Show help
  --version, -v         Show version

Notes:
  - creates a new theme directory in the current working directory
  - generated theme.json uses the current ZeroPress runtime contract
  - generated starters include helper-only menuSlots for primary and footer`);
}

function parseArgs(argv) {
  if (argv.length === 0) {
    throw new Error('create-zeropress-theme requires --theme-slug and --template. Run with --help to see usage.');
  }

  let themeSlug = null;
  let template = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected positional argument: ${arg}. Use --theme-slug <value> and --template <value>.`);
    }

    if (arg === '--theme-slug') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--theme-slug requires a value');
      }
      themeSlug = value;
      i += 1;
      continue;
    }

    if (arg === '--template') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`--template requires a value. Allowed: ${TEMPLATE_LIST}`);
      }
      if (!TEMPLATES.has(value)) {
        throw new Error(`Invalid template "${value}". Allowed: ${TEMPLATE_LIST}`);
      }
      template = value;
      i += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  if (!themeSlug) {
    throw new Error('--theme-slug is required');
  }

  if (!template) {
    throw new Error(`--template is required. Allowed: ${TEMPLATE_LIST}`);
  }

  return { themeSlug, template };
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
  const { slug, template } = options;
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
    namespace: DEFAULT_NAMESPACE,
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
  const optionalEntries = Object.entries(parsed).filter(([key]) => !MANIFEST_ORDERED_KEYS.has(key));
  const orderedManifest = {
    $schema: DEFAULT_THEME_SCHEMA,
    name: values.name,
    namespace: values.namespace,
    slug: values.slug,
    version: values.version,
    license: values.license,
    runtime: values.runtime,
    ...Object.fromEntries(optionalEntries),
  };
  await fs.writeFile(themeJsonPath, `${JSON.stringify(orderedManifest, null, 2)}\n`, 'utf8');
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
