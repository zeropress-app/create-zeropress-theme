# create-zeropress-theme

![npm](https://img.shields.io/npm/v/create-zeropress-theme)
![license](https://img.shields.io/npm/l/create-zeropress-theme)
![node](https://img.shields.io/node/v/create-zeropress-theme)

ZeroPress v0.5 starter generator.

This package creates a small buildable ZeroPress starter project for the
`preview-data.json + theme/` workflow.

---

## Quick Start

```bash
npx create-zeropress-theme --theme-slug my-portfolio --template portfolio
cd my-portfolio
npm install
npm run build
```

The build output is written to `dist/`.

For local preview while developing the theme:

```bash
npm run dev
```

---

## Usage

```bash
create-zeropress-theme --theme-slug <slug> --template <template>
```

### Required Options

- `--theme-slug <slug>`: starter directory name and generated `theme.json.slug`
- `--template <template>`: `minimal`, `blog`, `docs`, `portfolio`, or `magazine`

### Other Options

- `--help`, `-h`: show help
- `--version`, `-v`: show package version

---

## Templates

- `minimal`: clean content-first blog starter.
- `blog`: editorial blog starter with menus, widgets, posts, categories, and tags.
- `docs`: compact documentation starter with pages, navigation, and page TOC.
- `portfolio`: personal portfolio starter using `site.meta` and named collections.
- `magazine`: editorial magazine starter with sectioned landing and post lists.

Each template includes a matching `preview-data.json` fixture. The fixture is
part of the starter because different theme categories need different render
data shapes.

---

## Generated Project

```text
my-portfolio/
  package.json
  preview-data.json
  theme/
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
    assets/
```

Generated `package.json` includes:

```json
{
  "scripts": {
    "build": "zeropress-build ./theme --data ./preview-data.json --out ./dist",
    "dev": "zeropress-theme dev ./theme --data ./preview-data.json"
  },
  "dependencies": {
    "@zeropress/build": "0.5.2",
    "@zeropress/theme": "0.5.1"
  }
}
```

Generated `theme/theme.json` is rewritten with:

- `$schema: "https://zeropress.dev/schemas/theme.v0.5.runtime.schema.json"`
- `runtime: "0.5"`
- `namespace: "my-company"`
- `slug` and `name` from `--theme-slug`
- `version: "0.1.0"`

Update `namespace`, `name`, and demo fixture content before publishing a theme.

---

## Validation

The generated theme is validated immediately with
[`@zeropress/theme-validator`](https://www.npmjs.com/package/@zeropress/theme-validator).

The package test suite also builds every bundled starter with
[`@zeropress/build`](https://www.npmjs.com/package/@zeropress/build) to verify
that each template and fixture works together.

---

## Requirements

- Node.js >= 18.18.0
- ESM-only package

---

## Related

- [@zeropress/build](https://www.npmjs.com/package/@zeropress/build)
- [@zeropress/theme](https://www.npmjs.com/package/@zeropress/theme)
- [ZeroPress Theme Runtime v0.5](https://zeropress.dev/spec/theme-runtime-v0.5.html)
- [ZeroPress Preview Data v0.5](https://zeropress.dev/spec/preview-data-v0.5.html)

---

## License

MIT
