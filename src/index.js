import fs from 'node:fs/promises';
import path from 'node:path';

const TEMPLATES = new Set(['minimal', 'blog', 'magazine']);

export async function run(argv) {
  const { name, template, withDevtools } = parseArgs(argv);
  const targetDir = path.resolve(process.cwd(), name);

  await ensureEmptyDirectory(targetDir);
  await scaffoldTheme(targetDir, name);

  if (withDevtools) {
    await writeDevtoolsPackageJson(targetDir);
  }

  console.log(`Created ZeroPress theme at ${targetDir}`);
  console.log(`Template: ${template} (current v0.1 behavior uses same starter files for all templates)`);
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

async function scaffoldTheme(targetDir, name) {
  await fs.mkdir(path.join(targetDir, 'partials'), { recursive: true });
  await fs.mkdir(path.join(targetDir, 'assets'), { recursive: true });

  const files = {
    'theme.json': JSON.stringify(
      {
        name,
        version: '0.1.0',
        author: 'Author Name',
        description: 'ZeroPress theme',
      },
      null,
      2
    ) + '\n',
    'layout.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{site.title}}</title>
    <meta name="description" content="{{site.description}}" />
    <link rel="stylesheet" href="/assets/style.css" />
  </head>
  <body>
    <header>{{slot:header}}</header>
    <main>{{slot:content}}</main>
    <footer>{{slot:footer}}</footer>
  </body>
</html>
`,
    'index.html': `<section>
  <h1>{{site.title}}</h1>
  <p>{{site.description}}</p>
  <div>{{posts}}</div>
  <nav>{{pagination}}</nav>
</section>
`,
    'post.html': `<article>
  <h1>{{post.title}}</h1>
  <div>{{post.html}}</div>
</article>
`,
    'page.html': `<article>
  <h1>{{page.title}}</h1>
  <div>{{page.html}}</div>
</article>
`,
    'archive.html': `<section>
  <h1>Archive</h1>
  <div>{{posts}}</div>
</section>
`,
    'category.html': `<section>
  <h1>Category</h1>
  <div>{{posts}}</div>
</section>
`,
    'tag.html': `<section>
  <h1>Tag</h1>
  <div>{{posts}}</div>
</section>
`,
    '404.html': `<section>
  <h1>404</h1>
  <p>Not Found</p>
</section>
`,
    'partials/header.html': '<a href="/">Home</a>\n',
    'partials/footer.html': '<small>Powered by ZeroPress</small>\n',
    'assets/style.css': `:root { font-family: system-ui, sans-serif; }
body { margin: 0; padding: 2rem; line-height: 1.5; }
h1 { margin-top: 0; }
`,
  };

  await Promise.all(
    Object.entries(files).map(([filePath, content]) =>
      fs.writeFile(path.join(targetDir, filePath), content, 'utf8')
    )
  );
}

async function writeDevtoolsPackageJson(targetDir) {
  const pkg = {
    name: path.basename(targetDir),
    private: true,
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'zeropress-theme dev',
      validate: 'zeropress-theme validate',
      pack: 'zeropress-theme pack',
    },
  };
  await fs.writeFile(path.join(targetDir, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
}
