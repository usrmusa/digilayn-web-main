(() => {
  const links = document.querySelectorAll('[data-legal-link]');
  const sections = [...document.querySelectorAll('[data-legal-section]')];

  function selectSection() {
    const fragment = document.getElementById(window.location.hash.slice(1));
    const selected = fragment?.closest('[data-legal-section]')?.dataset.legalSection || 'terms';
    sections.forEach(section => {
      section.hidden = section.dataset.legalSection !== selected;
    });
    links.forEach(link => {
      const current = link.dataset.legalLink === selected;
      if (current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
      link.classList.toggle('bg-digilayn-primary/10', current);
    });
    if (fragment && fragment.dataset.legalSection === undefined) fragment.scrollIntoView();
  }

  window.addEventListener('hashchange', selectSection);
  selectSection();
})();
