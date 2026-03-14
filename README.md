# create-zeropress-theme

![npm](https://img.shields.io/npm/v/create-zeropress-theme)
![license](https://img.shields.io/npm/l/create-zeropress-theme)
![node](https://img.shields.io/node/v/create-zeropress-theme)

Scaffolding CLI for ZeroPress theme projects.

Generated starters are self-validated against the current ZeroPress runtime contract using `@zeropress/theme-validator`.

---

## Quick Start

```bash
npx create-zeropress-theme my-theme
```

* * *

Usage
-----

```bash
npx create-zeropress-theme <name> [options]
```

To print help:

```bash
npx create-zeropress-theme --help
```

### Options

| Option | Description | Default |
| --- | --- | --- |
| `--template <name>` | Template variant (`minimal`, `blog`, `magazine`) | `minimal` |
| `--namespace <value>` | Theme namespace written to `theme.json` | `my-company` |
| `--with-devtools` | Include convenience dev scripts | — |

Examples:

```bash
npx create-zeropress-theme my-theme
npx create-zeropress-theme my-theme --namespace acme-studio
npx create-zeropress-theme my-theme --template blog
npx create-zeropress-theme my-theme --template magazine
npx create-zeropress-theme my-theme --with-devtools
```

Each template (`minimal`, `blog`, `magazine`) is scaffolded from its own complete file set.

Important:

- `<name>` must already be a valid theme slug
- allowed characters are lowercase letters, digits, and internal hyphens
- slug length must be between 3 and 32 characters

Template notes:

- `minimal`: clean default starter based on `zeropress-starter-theme.v0.02`
- `blog`: editorial blog-focused typography and reading flow
- `magazine`: grid-based layout with side rail and sectioned homepage blocks

* * *

Starter Output
---------------------

```
my-theme/
  theme.json
  layout.html
  index.html
  post.html
  page.html
  archive.html
  category.html
  tag.html
  404.html
  partials/
    header.html
    footer.html
  assets/
    style.css
```

Runtime contract note:

- Required minimum for runtime compatibility: `theme.json`, `layout.html`, `index.html`, `post.html`, `page.html`, `assets/style.css`
- Common optional files in the starter: `archive.html`, `category.html`, `tag.html`, `404.html`, `partials/*.html`
- Generated `theme.json` follows Runtime v0.2
- Generated `name` and `slug` both use the provided theme slug
- Generated `namespace` defaults to `my-company` unless `--namespace` is provided
- The scaffold is validated immediately after generation, and the command fails if the generated theme does not satisfy the current runtime contract

* * *

### --with-devtools

Adds a `package.json` with convenience scripts:

```bash
cd my-theme
npm run dev
npm run validate
npm run pack
```

Validate generated themes with:

```bash
npx zeropress-theme validate my-theme
```

These scripts are thin wrappers around `npx zeropress-theme` (no global install required).  
On first run, `npx` may download the CLI package if it is not cached locally.  
No dependencies or lockfiles are generated.  
The runtime contract remains unchanged.

* * *

Requirements
------------

*   Node.js >= 18.18.0
*   ESM only

* * *

Related
-------

*   [zeropress-theme](https://www.npmjs.com/package/zeropress-theme)
*   ZeroPress Theme Spec v0.2: [https://zeropress.dev/spec/theme-runtime-v0.2.html](https://zeropress.dev/spec/theme-runtime-v0.2.html)

* * *

About ZeroPress
---------------

ZeroPress is a CMS built around file-based themes and a defined runtime contract.  
It emphasizes predictable structure and portable theme bundles.

Project website:  
[https://zeropress.app](https://zeropress.app)

* * *

License
-------

MIT
