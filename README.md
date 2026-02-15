# create-zeropress-theme

Scaffolding CLI for ZeroPress theme projects.

## Quick Start

```bash
npx create-zeropress-theme my-theme
```

## Usage

```bash
npx create-zeropress-theme <name> [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--template <name>` | Template variant (`minimal`, `blog`, `magazine`) | `minimal` |
| `--with-devtools` | Include a convenience `package.json` with dev scripts | - |

### Examples

```bash
# Default theme
npx create-zeropress-theme my-theme

# Specify a template
npx create-zeropress-theme my-theme --template blog

# Include devtools
npx create-zeropress-theme my-theme --with-devtools
```

> In v0.1 all templates generate the same starter structure. Template differentiation is planned for a future release.

## Generated Structure

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

## --with-devtools

When `--with-devtools` is passed, a `package.json` is added to the theme folder with convenience scripts:

```bash
npx create-zeropress-theme my-theme --with-devtools
cd my-theme
npm run dev       # Preview server
npm run validate  # Theme validation
npm run pack      # Zip packaging
```

These scripts are thin wrappers around the `zeropress-theme` CLI. No dependencies or lockfiles are generated. The devtools layer does not alter the theme runtime spec — uploaded packages are still validated against pure theme files only.

## Requirements

- Node.js >= 18.18.0
- ESM only

## Related

- [zeropress-theme](https://www.npmjs.com/package/zeropress-theme) — Theme developer toolkit (dev / validate / pack)
- [ZeroPress Theme Spec](https://github.com/user/zeropress/blob/main/theme_guide_v2/THEME_SPEC.md)

## License

MIT
