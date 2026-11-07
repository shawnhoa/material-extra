<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/images/wordmark-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="./docs/images/wordmark-light.png">
    <img src="./docs/images/wordmark-light.png" width="560" alt="Meterial Extra">
  </picture>
</p>

<p align="center">An open Material-inspired theme and frontend framework for expressive content.</p>

<p align="center">English | <a href="./README_zh_CN.md">简体中文</a></p>

# Meterial Extra

**Meterial Extra** is an open, dependency-free Material-inspired theme and frontend framework for expressive personal sites, documentation hubs, journals, and curated story collections.

The public repository contains a fresh demo, reusable design tokens, responsive navigation, theme controls, and sample components. It does not contain the private content, branding, account data, uploads, or deployment configuration of any production site.

## Open-source scope

| Included | Not included |
| --- | --- |
| Responsive layouts and generated pages | Private production APIs or admin endpoints |
| Theme, navigation, filters, search, and palette controls | Databases, accounts, sessions, or credentials |
| API request adapter and configuration examples | Original articles, private images, or uploaded media |
| Runtime, deployment, and packaging scripts | Any production server secret |

The generated template includes Home, Article Catalog, Archive, Friend Links, Announcements, About, Components, and Palette pages.

## Live examples

- [GitHub Pages demo](https://shawnhoa.github.io/meterial-extra/)
- [Production deployment example](https://shawnho.top/)

The production example demonstrates Meterial Extra in a real public site. Its private content and server configuration are not part of this repository.

## Preview

<table>
  <tr>
    <td width="72%"><img src="./docs/images/demo-desktop.png" alt="Meterial Extra desktop demo"></td>
    <td width="28%"><img src="./docs/images/demo-mobile.png" alt="Meterial Extra mobile demo in Chinese"></td>
  </tr>
</table>

## Production deployment example

[ShawnHo's Cottage](https://shawnho.top/) is linked as a public deployment example. Its internal API, article database, source images, and uploads are not included. All repository screenshots use regenerated demonstration content.

## Highlights

- Material-inspired color roles and elevation
- Four palettes, light/dark modes, and adjustable corner styles
- Fixed desktop rail with a compact portrait header
- Responsive story cards, topic filters, search, and statistics
- Keyboard-friendly controls and reduced-motion support
- No runtime dependencies and no build step
- Small JavaScript API for integrations
- Ready-to-use GitHub Pages workflow
- Deployment recipes for static hosting, Nginx, and Docker
- English and Simplified Chinese demo interface

## Preview locally

```bash
git clone https://github.com/shawnhoa/meterial-extra.git
cd meterial-extra
npm start
```

Windows:

```powershell
.\run.ps1
```

Linux/macOS:

```bash
sh run.sh
```

Then open `http://localhost:4173`.

Any static server works. The project can also be deployed by serving the repository root.

See [DEPLOYMENT.md](DEPLOYMENT.md) for GitHub Pages, static hosting, Nginx, and Docker instructions.

## API configuration

The public repository contains interface templates only. Private production endpoints, account data, uploaded images, and articles are not included. Read [API_TEMPLATE.md](API_TEMPLATE.md), copy the structure from `config.example.js` into `config.js`, and adapt `src/js/api.js` to your public response shapes.

Never put secrets, database credentials, private admin tokens, or internal management endpoints in frontend configuration.

The generated `config.example.js` contains endpoint placeholders only. No real service address is required to run the demo.

## Package a release

```bash
npm run package
```

The generated archive in `dist/` contains the source, runtime server, deployment configuration, API templates, and generated demo content.

Release assets are also available from [GitHub Releases](https://github.com/shawnhoa/meterial-extra/releases/tag/v0.1.0).

## Use the framework

1. Copy `src/css/tokens.css` and `src/css/theme.css`.
2. Copy the component styles you need from `src/css/site.css`.
3. Import `src/js/theme.js` for palette and navigation state.
4. Replace `src/data/demo.js` with content from your own API.
5. Connect your own endpoint using `config.example.js` and [API_TEMPLATE.md](API_TEMPLATE.md).

The public browser API is available as:

```js
MeterialExtra.setPalette("rose");
MeterialExtra.setColorMode("dark");
MeterialExtra.setRadius("rounded");
MeterialExtra.openNavigation(true);
```

## Project structure

```text
public/assets/       Brand-safe demo logo and rendered theme wordmark
src/css/             Tokens, theme system, and demo component styles
src/data/            Generated demonstration content only
src/js/              Navigation and theme interaction
scripts/serve.mjs    Dependency-free local preview server
scripts/package-release.mjs   Portable source archive builder
config.js            Public runtime configuration
API_TEMPLATE.md      Endpoint and response-shape template
```

## Palettes

| Palette | Character |
| --- | --- |
| Lilac | Calm editorial violet |
| Rose | Warm publication accent |
| Ocean | Technical blue-green |
| Moss | Quiet natural green |

All palettes support light and dark color modes.

## Font and branding notice

The Meterial Extra wordmark uses the included **Big John Regular** font. The project owner has confirmed that the font is free for commercial use and redistribution with no copyright dispute.

The font keeps its author attribution to Ion Lucin. See [BRAND_ASSET_LICENSE.md](BRAND_ASSET_LICENSE.md). Theme code is MIT licensed; the font remains the author's separately attributed typeface work.

## License

Source code and documentation are released under the [MIT License](LICENSE).

The MIT license does not grant rights to third-party trademarks, the Big John font, or any separately identified brand asset.

## Star History

<a href="https://star-history.com/#shawnhoa/meterial-extra&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=shawnhoa/meterial-extra&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=shawnhoa/meterial-extra&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=shawnhoa/meterial-extra&type=Date" />
  </picture>
</a>

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). New demo content must be original, generic, and free of personal or production data.
