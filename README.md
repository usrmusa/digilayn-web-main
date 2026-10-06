# Digilayn

Digilayn is Musa Mgijima's software business. We build practical mobile apps, web portals, dashboards, and internal tools that help growing businesses move from manual workflows to digital systems.

This repository contains Digilayn's main website: our services, founder profile, portfolio, and project support pages.

- **Website:** [www.digilayn.co.za](https://www.digilayn.co.za/)
- **Contact:** [digilayn@gmail.com](mailto:digilayn@gmail.com)

## Website Structure

- `index.html` — business homepage and services.
- `mgijima.html` — founder profile.
- `portfolio.html` — portfolio overview.
- `portfolio/projects/` — project pages, administration screens, and LaynFleet privacy, terms, and account-deletion pages.
- `scripts/`, `styles/`, `img/`, and `favicon/` — shared scripts and assets.

The website uses static HTML, CSS, and JavaScript, with Firebase-backed functionality. GitHub Pages serves the site directly from `main` at the repository root; there is no local build step.

## Single Source of Truth

The only active local checkout is:

```text
/Users/lincoln.mgijima/Digilayn/Web/web-main
```

Do not resume work in the retired `WebstormProjects/web-digilayn` copy. Firebase Cloud Functions belong in `/Users/lincoln.mgijima/Digilayn/Firebase/Backend/functions/`, not in this repository.

## Repository and Hosting

[usrmusa/digilayn-web-main](https://github.com/usrmusa/digilayn-web-main) is the only development and GitHub Pages hosting repository. The previous dual-repository workflow is retired.

`origin` must fetch and push only to `usrmusa/digilayn-web-main`. The owner runs commits and pushes; the agent never pushes.

`CNAME` is set to `www.digilayn.co.za` for the current domain test. GitHub Pages publishes `main` from `/`.

### Configure a Fresh Checkout

```sh
git remote set-url origin git@github.com:usrmusa/digilayn-web-main.git
git config --local --replace-all remote.origin.pushurl git@github.com:usrmusa/digilayn-web-main.git
git remote -v
```

## Local Preview

Serve the repository with WebStorm's local web server or another static HTTP server. Firebase-backed pages still require the appropriate authentication and permissions. Never commit credentials, service-account keys, or private account records: this repository and its published website are public.
