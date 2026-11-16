/**
 * Digilayn Global Information & Component Registry
 * Single Source of Truth for company information, contact details, and shared UI components.
 */
(function () {
    'use strict';

    const DIGILAYN = {
        email: 'info@digilayn.co.za',
        phone: '+27 81 553 2209',
        whatsappUrl: 'https://wa.me/27815532209',
        website: 'https://digilayn.co.za',
        websiteDisplay: 'digilayn.co.za',
        entity: 'Musa Mgijima trading as Digilayn',
        founder: 'Musa Mgijima',
        year: 2026
    };

    window.DigilaynInfo = DIGILAYN;

    function hydrate() {
        // Hydrate email text & links
        document.querySelectorAll('[data-digilayn="email"]').forEach(el => {
            if (!el.textContent.trim() || el.textContent.includes('@')) {
                el.textContent = DIGILAYN.email;
            }
            if (el.tagName === 'A') {
                el.href = 'mailto:' + DIGILAYN.email;
            }
        });

        // Hydrate email link only (where text is custom, e.g. "Email Digilayn")
        document.querySelectorAll('[data-digilayn="email-link"]').forEach(el => {
            if (el.tagName === 'A') {
                el.href = 'mailto:' + DIGILAYN.email;
            }
        });

        // Hydrate WhatsApp links
        document.querySelectorAll('[data-digilayn="whatsapp"]').forEach(el => {
            if (el.tagName === 'A') {
                el.href = DIGILAYN.whatsappUrl;
            }
        });

        // Hydrate WhatsApp contact text + link
        document.querySelectorAll('[data-digilayn="whatsapp-contact"]').forEach(el => {
            if (el.tagName === 'A') {
                el.href = DIGILAYN.whatsappUrl;
            }
            if (!el.textContent.trim() || el.textContent.startsWith('+')) {
                el.textContent = DIGILAYN.phone;
            }
        });

        // Hydrate phone text
        document.querySelectorAll('[data-digilayn="phone"]').forEach(el => {
            el.textContent = DIGILAYN.phone;
            if (el.tagName === 'A') {
                el.href = 'tel:' + DIGILAYN.phone.replace(/\s+/g, '');
            }
        });

        // Hydrate legal entity name
        document.querySelectorAll('[data-digilayn="entity"]').forEach(el => {
            el.textContent = DIGILAYN.entity;
        });

        // Hydrate founder name
        document.querySelectorAll('[data-digilayn="founder"]').forEach(el => {
            el.textContent = DIGILAYN.founder;
        });

        // Hydrate website display
        document.querySelectorAll('[data-digilayn="website"]').forEach(el => {
            el.textContent = DIGILAYN.websiteDisplay;
            if (el.tagName === 'A') {
                el.href = DIGILAYN.website;
            }
        });
    }

    // Reusable Custom Web Component: <digilayn-footer>
    class DigilaynFooter extends HTMLElement {
        connectedCallback() {
            const context = this.getAttribute('context');
            let navLinks = '';

            if (context === 'laynfleet') {
                navLinks = `
                    <a href="/privacy" class="hover:text-digilayn-primary font-bold transition">Digilayn Privacy Policy</a>
                    <span>&bull;</span>
                    <a href="/laynfleet/privacy" class="hover:text-digilayn-primary font-bold transition">LaynFleet Privacy</a>
                    <span>&bull;</span>
                    <a href="/laynfleet/terms" class="hover:text-digilayn-primary font-bold transition">LaynFleet Terms</a>
                `;
            } else {
                navLinks = `
                    <a href="/terms" class="hover:text-digilayn-primary font-bold transition">Terms of Use</a>
                    <span>&bull;</span>
                    <a href="/privacy" class="hover:text-digilayn-primary font-bold transition">Privacy Policy</a>
                    <span>&bull;</span>
                    <a href="/portfolio" class="hover:text-digilayn-primary transition">Portfolio</a>
                    <span>&bull;</span>
                    <a href="/mgijima" class="hover:text-digilayn-primary transition">Founder</a>
                `;
            }

            this.innerHTML = `
                <footer class="text-center py-10 sm:py-12 border-t border-digilayn-outline-variant dark:border-digilayn-outline-variant text-sm opacity-80">
                    <div class="flex flex-wrap justify-center gap-4 mb-3 text-xs sm:text-sm">
                        ${navLinks}
                    </div>
                    <p>&copy; ${DIGILAYN.year} Digilayn. All rights reserved.</p>
                    <p class="mt-2 text-xs">Built by <a href="https://linkedin.com/in/mgijima" target="_blank" class="hover:text-digilayn-primary underline transition">${DIGILAYN.founder}</a>.</p>
                </footer>
            `;
        }
    }

    if (!customElements.get('digilayn-footer')) {
        customElements.define('digilayn-footer', DigilaynFooter);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hydrate);
    } else {
        hydrate();
    }
})();
