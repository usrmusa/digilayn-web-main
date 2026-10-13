// Shared Digilayn theme behavior. Generated into each site's scripts/theme.js.
(function () {
    'use strict';
    const html = document.documentElement;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
    const systemContrast = window.matchMedia('(prefers-contrast: more)');
    const paletteSchemes = /* PALETTE_SCHEMES */ {};

    function savedTheme() {
        try { return localStorage.getItem('theme'); }
        catch (_) { return null; }
    }

    function getColor(role, mode) {
        const contrast = html.dataset.contrast === 'high' ? '-hc' : html.dataset.contrast === 'medium' ? '-mc' : '';
        const value = mode ? paletteSchemes[mode + contrast]?.[role] :
            getComputedStyle(html).getPropertyValue(`--digilayn-${role}-rgb`).trim();
        const channels = (value || '').split(/\s+/);
        if (channels.length !== 3 || channels.some(value => !/^\d+$/.test(value))) {
            throw new Error(`Unknown Digilayn colour role: ${role}`);
        }
        return '#' + channels.map(value => Number(value).toString(16).padStart(2, '0')).join('');
    }

    function updateIcons() {
        const dark = html.classList.contains('dark');
        ['theme-icon', 'menu-theme-icon'].forEach(id => {
            const icon = document.getElementById(id);
            if (icon) icon.textContent = dark ? '☀️' : (html.dataset.themeDefault === 'light' ? '🌓' : '🌙');
        });
    }

    function updateChrome() {
        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'theme-color';
            document.head.appendChild(meta);
        }
        meta.content = getColor('primary-container');
        updateIcons();
    }

    function applyTheme() {
        const preference = savedTheme();
        const dark = preference === 'dark' ||
            (preference !== 'light' && html.dataset.themeDefault !== 'light' && systemTheme.matches);
        html.classList.toggle('dark', dark);
        html.classList.toggle('light', !dark);
        html.dataset.contrast = systemContrast.matches ? 'high' : 'standard';
    }

    function refresh() {
        applyTheme();
        updateChrome();
        window.dispatchEvent(new Event('themeChanged'));
    }

    window.DigilaynTheme = Object.freeze({ getColor });
    applyTheme();
    systemTheme.addEventListener('change', () => { if (!savedTheme()) refresh(); });
    systemContrast.addEventListener('change', refresh);
    window.addEventListener('storage', event => { if (event.key === 'theme') refresh(); });

    function initTheme() {
        updateChrome();
        ['theme-toggle', 'menu-theme-toggle'].forEach(id => {
            const button = document.getElementById(id);
            if (!button) return;
            button.addEventListener('click', () => {
                const dark = !html.classList.contains('dark');
                try { localStorage.setItem('theme', dark ? 'dark' : 'light'); }
                catch (_) { /* The current page can still switch theme when storage is blocked. */ }
                html.classList.toggle('dark', dark);
                html.classList.toggle('light', !dark);
                updateChrome();
                window.dispatchEvent(new Event('themeChanged'));
            });
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initTheme);
    else initTheme();
})();
