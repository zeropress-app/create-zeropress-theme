# create-zeropress-theme

![npm](https://img.shields.io/npm/v/create-zeropress-theme)
![license](https://img.shields.io/npm/l/create-zeropress-theme)
![node](https://img.shields.io/node/v/create-zeropress-theme)

Scaffolding CLI for ZeroPress theme projects.

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

### Options

| Option | Description | Default |
| --- | --- | --- |
| `--template <name>` | Template variant (`minimal`, `blog`, `magazine`) | `minimal` |
| `--with-devtools` | Include convenience dev scripts | — |

Examples:

```bash
npx create-zeropress-theme my-theme
npx create-zeropress-theme my-theme --template blog
npx create-zeropress-theme my-theme --template magazine
npx create-zeropress-theme my-theme --with-devtools
```

> In v0.1 all templates generate the same starter structure.

* * *

Starter Output (v0.1)
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

* * *

### --with-devtools

Adds a `package.json` with convenience scripts:

```bash
cd my-theme
npm run dev
npm run validate
npm run pack
```

These scripts are thin wrappers around `npx zeropress-theme` (no global install required).  
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
*   ZeroPress Theme Spec: [https://zeropress.dev](https://zeropress.dev)

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
