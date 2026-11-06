# Digilayn

Digilayn builds practical mobile apps, web portals, dashboards and internal tools for growing businesses.

This public repository contains the Digilayn business website, founder profile, portfolio, project support pages and authenticated management interfaces.

- Website: [digilayn.co.za](https://digilayn.co.za/)
- Contact: [digilayn@gmail.com](mailto:digilayn@gmail.com)

## Technology

Static HTML, CSS and JavaScript, with Tailwind CSS and Firebase-backed functionality. The service target is selected by the static build step below. Firebase-backed pages require the appropriate authentication and server permissions.

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

Double-click `launch-local.command` in Finder. It rebuilds `dist/local`, verifies
that the service target is local, starts http://127.0.0.1:8101/ and opens your
browser. Keep the Terminal window open; Control-C stops the website server.
Python 3 is required. Start the Backend Firebase Emulator Suite separately.
The launcher never serves the live build; an unavailable emulator remains an error.
Extensionless page URLs are supported by the local server.

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

## Service Target Builds

Run `python3 tools/build-site.py local` or `python3 tools/build-site.py live`.
Serve `dist/local` for IntelliJ development and use `dist/live` for live publication.
The generated `scripts/build-target.js` selects services; the prod/dev fleet selector
only selects data within those services. Neither hostname nor `env=dev` selects emulators.
For IntelliJ, open the generated local output as the web root once; its page URLs need
no service-target parameter. Existing absolute `/scripts` and `/styles` paths require
serving the output at the URL root.

Local Auth, Firestore and Storage use ports 9099, 8080 and 9199.
Functions SDK calls target the Functions emulator on port 5001. Backend now includes
`checkAdminAccess`; restart the local emulator suite after compiling the new backend. Local fleet HTTP API requests explicitly
fail until an endpoint is configured. Local web tracking is unavailable while the
Realtime Database emulator is missing. No live-service fallback is used for these paths.
Admin login requires `checkAdminAccess` to confirm the authenticated email
`admin@digilayn.co.za` and explicit email verification. No account document,
suspension check, UID allowlist or local-hosting bypass participates in admin access.

## Superuser Login

Projects, global user management and the canonical LaynFleet manager/errors/tracking
pages share one admin gate. Modular and compat Firebase adapters call the same
backend function. Signed-out startup makes no authorization request. Authenticated
entry and restored sessions remain closed until the backend approves the identity.
Backend errors and malformed responses cannot publish admin access. Normal user
account gates remain separate; the superuser gate performs no profile lookup.

The new function and website wiring remain local/unpublished until the owner
confirms behavior and separately authorizes delivery. No admin account or email
verification flag is created or changed by this implementation.

For Android Studio Play actions, use the scripts in
`Apps/LaynFleet/local-dev/` in the Digilayn workspace. Console actions select a
page via `tools/launch-local.py --page <relative-html-path>` and can reuse an
already-running server after verifying its local build configuration.
