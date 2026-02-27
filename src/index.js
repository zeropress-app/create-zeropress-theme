import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATES = new Set(['minimal', 'blog', 'magazine']);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_ROOT = path.join(__dirname, 'templates');

export async function run(argv) {
  const { name, template, withDevtools } = parseArgs(argv);
  const targetDir = path.resolve(process.cwd(), name);

  await ensureEmptyDirectory(targetDir);
  await scaffoldTheme(targetDir, name, template);

  if (withDevtools) {
    await writeDevtoolsPackageJson(targetDir);
  }

  console.log(`Created ZeroPress theme at ${targetDir}`);
  console.log(`Template: ${template}`);
  if (withDevtools) {
    console.log('Devtools enabled: npm run dev / npm run validate / npm run pack');
  }
}

function parseArgs(argv) {
  if (argv.length === 0) {
    throw new Error('Usage: create-zeropress-theme <name> [--template <minimal|blog|magazine>] [--with-devtools]');
  }

  const positional = [];
  let template = 'minimal';
  let withDevtools = false;

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
        throw new Error(`Invalid template "${value}". Allowed: minimal, blog, magazine`);
      }
      template = value;
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

  return { name, template, withDevtools };
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

async function scaffoldTheme(targetDir, name, template) {
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
  await updateThemeName(path.join(targetDir, 'theme.json'), name);
}

async function updateThemeName(themeJsonPath, name) {
  const raw = await fs.readFile(themeJsonPath, 'utf8');
  const parsed = JSON.parse(raw);
  parsed.name = name;
  await fs.writeFile(themeJsonPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
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
