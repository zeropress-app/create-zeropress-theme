# create-zeropress-theme

![npm](https://img.shields.io/npm/v/create-zeropress-theme)
![license](https://img.shields.io/npm/l/create-zeropress-theme)
![node](https://img.shields.io/node/v/create-zeropress-theme)

Scaffolding CLI for ZeroPress theme projects.

Generated starters are self-validated against the current ZeroPress runtime contract using `@zeropress/theme-validator`.

---

## Quick Start

```bash
npx create-zeropress-theme --theme-slug my-theme --template blog
```

* * *

Usage
-----

```bash
npx create-zeropress-theme --theme-slug <value> --template <minimal|blog|magazine|docs|portfolio>
```

To print help:

```bash
npx create-zeropress-theme --help
```

### Options

| Option | Description | Default |
| --- | --- | --- |
| `--theme-slug <value>` | Theme slug and target directory name | — |
| `--template <name>` | Template variant (`minimal`, `blog`, `magazine`, `docs`, `portfolio`) | — |

Examples:

```bash
npx create-zeropress-theme --theme-slug my-theme --template blog
npx create-zeropress-theme --theme-slug my-theme --template magazine
npx create-zeropress-theme --theme-slug my-theme --template docs
npx create-zeropress-theme --theme-slug my-theme --template portfolio
```

Notes:

- `--theme-slug` and `--template` are both required
- `--theme-slug` must already be a valid theme slug
- allowed characters are lowercase letters, digits, and internal hyphens
- slug length must be between 3 and 32 characters

Template notes:

- `minimal`: clean default starter based on `zeropress-starter-theme.v0.02`
- `blog`: editorial blog-focused typography and reading flow
- `magazine`: grid-based layout with side rail and sectioned homepage blocks
- `docs`: documentation-focused starter for guides, references, and updates
- `portfolio`: personal showcase starter for projects and case studies

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
- Generated `theme.json` follows Runtime v0.3
- Generated `theme.json` includes `$schema` for IDE validation and autocomplete
- Generated starters declare helper-only `menuSlots` for `primary` and `footer`
- Generated headers and footers use `{{menu:primary}}` and `{{menu:footer}}`
- Generated directory name, `theme.json.name`, and `theme.json.slug` all use `--theme-slug`
- Generated `namespace` is fixed to `my-company`
- The scaffold is validated immediately after generation, and the command fails if the generated theme does not satisfy the current runtime contract

* * *

Requirements
------------

*   Node.js >= 18.18.0
*   ESM only

* * *

Related
-------

*   [zeropress-theme](https://www.npmjs.com/package/zeropress-theme)
*   ZeroPress Theme Spec v0.3: [https://zeropress.dev/spec/theme-runtime-v0.3.html](https://zeropress.dev/spec/theme-runtime-v0.3.html)

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
