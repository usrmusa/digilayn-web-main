# Digilayn

Digilayn builds practical mobile apps, web portals, dashboards and internal tools for growing businesses.

This public repository contains the Digilayn business website, founder profile, portfolio, project support pages and authenticated management interfaces.

- Website: [digilayn.co.za](https://digilayn.co.za/)
- Contact: [digilayn@gmail.com](mailto:digilayn@gmail.com)

## Technology

Static HTML, CSS and JavaScript, with Tailwind CSS and Firebase-backed functionality. There is no application build step. Firebase-backed pages require the appropriate authentication and server permissions.

## Structure

- `index.html`: business homepage and services.
- `mgijima.html`: founder profile.
- `portfolio.html`: portfolio overview.
- `portfolio/projects/`: project pages, management interfaces and LaynFleet privacy, terms and account-deletion pages.
- `auth/action/`: Firebase account-action pages.
- `scripts/` and `styles/`: shared browser code and styles.
- `theme-source/`: shared web theme templates and asset generator.
- `img/` and `favicon/`: public visual assets.
- `tests/`: source tests.

## Local Preview

From the repository root, run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [localhost:8000](http://127.0.0.1:8000/). Use explicit `.html` paths with this simple server; it does not reproduce GitHub Pages extensionless URL handling. Previewing does not provide a separate Firebase test environment.

## Shared Theme

Both websites use the canonical Material colour palette from `Notes/Theme/css/` in the development workspace. Pages use semantic `--digilayn-*` CSS variables and `digilayn-*` Tailwind colours rather than defining their own palette.

The shared generator in [Digilayn's website repository](https://github.com/usrmusa/digilayn-web-main/tree/main/theme-source) creates these local assets for both sites:

- `styles/digilayn-theme.css`
- `scripts/theme.js`
- `scripts/digilayn-tailwind.js`
- Theme and background colours in `favicon/site.webmanifest`

With the canonical palette available in the workspace, run these commands from the Digilayn repository:

```sh
python3 theme-source/generate-theme.py
python3 theme-source/generate-theme.py --check
```

The check detects generated-asset drift and colour definitions introduced outside the shared theme. Generated assets are committed, so a standalone checkout can serve the site without the Notes workspace or generation step. Do not edit generated assets independently. Light, dark and contrast palettes are included. Provider artwork, such as the Google sign-in logo, retains its own colours.

## GitHub Pages

The publishing source is `main` at the repository root. `CNAME` declares `digilayn.co.za` as the custom domain. The root `.nojekyll` file tells GitHub Pages to publish the static files without Jekyll processing.

See [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) for publishing configuration.

## Public Repository Boundary

This repository is public intentionally. Keep credentials, service-account keys, access tokens, private account records, local environment files and editor metadata out of it. Backend functions and authoritative Firebase rules are maintained separately; do not deploy backend or rule changes from this website checkout.

Firebase browser configuration identifies the project for client SDKs and is included deliberately. It does not grant administrative access; backend services and Firebase rules must enforce authorization. See [Firebase API key guidance](https://firebase.google.com/docs/projects/api-keys).
