# create-zeropress-theme

![npm](https://img.shields.io/npm/v/create-zeropress-theme)
![license](https://img.shields.io/npm/l/create-zeropress-theme)
![node](https://img.shields.io/node/v/create-zeropress-theme)

ZeroPress theme starter generator.

Generated starters are self-validated against the current ZeroPress runtime contract using `@zeropress/theme-validator`.

---

## Install

```bash
# Run directly with npx
npx create-zeropress-theme --help

# Or install globally
npm install -g create-zeropress-theme
create-zeropress-theme --help
```

---

## Quick Start

```bash
npx create-zeropress-theme --theme-slug my-theme --template blog
```

---

## Usage

```bash
create-zeropress-theme --theme-slug <slug> --template <template>
```

### Required Options

- `--theme-slug <slug>`: Theme slug and target directory name
- `--template <template>`: Starter template: `minimal`, `blog`, `magazine`, `docs`, `portfolio`

### Options

- `--help, -h`: Show help
- `--version, -v`: Show version

---

## Examples

```bash
create-zeropress-theme --theme-slug my-theme --template blog
create-zeropress-theme --theme-slug my-theme --template docs
create-zeropress-theme --theme-slug my-theme --template portfolio
```

---

## Templates

- `minimal`: Clean default starter with a lightweight content-first structure
- `blog`: Editorial blog starter with reading-focused layout and typography
- `magazine`: Grid-based starter with side rail and sectioned landing layout
- `docs`: Documentation starter for guides, references, and updates
- `portfolio`: Personal showcase starter for projects and case studies

---

## What It Generates

```text
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

- Required minimum for Theme Runtime v0.3 compatibility: `theme.json`, `layout.html`, `index.html`, `post.html`, `page.html`, `assets/style.css`
- Common optional files in the starter: `archive.html`, `category.html`, `tag.html`, `404.html`, `partials/*.html`
- Generated `theme.json` includes `$schema` for IDE validation and autocomplete
- Generated starters declare helper-only `menuSlots` for `primary` and `footer`
- Generated headers and footers use `{{menu:primary}}` and `{{menu:footer}}`
- Generated directory name, `theme.json.name`, and `theme.json.slug` all use `--theme-slug`
- Generated `namespace` is fixed to `my-company`
- The scaffold is validated immediately after generation and fails if the generated theme does not satisfy Theme Runtime v0.3

---

## Requirements

- Node.js >= 18.18.0
- ESM only

---

## Related

- [@zeropress/theme](https://www.npmjs.com/package/@zeropress/theme)
- [ZeroPress Theme Runtime v0.3](https://zeropress.dev/spec/theme-runtime-v0.3.html)

---

## License

MIT
