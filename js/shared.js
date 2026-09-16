/* ============================================================
   Shared site behaviour: top navigation, dropdowns, mobile menu,
   active-section highlighting.
   Load after js/portfolio-data.js and js/live-photos.js.
   Rebuilds the nav when window.PHOTO_CATEGORIES changes
   ("photocategories" event from live auto-discovery).
   ============================================================ */

(function () {
  'use strict';

  var TOOLS = [
    { id: 'depth', label: 'Depth Calculator', meta: 'Background blur circle calculator', href: 'calculator.html', soon: false },
    { id: 'dof', label: 'Depth of Field', meta: 'Near / far focus and total DOF', href: '', soon: true },
    { id: 'fov', label: 'Field of View', meta: 'Focal length vs. framing', href: '', soon: true },
    { id: 'compare', label: 'Lens Comparison', meta: 'Compare lenses, same conditions', href: '', soon: true },
  ];

  var chevDown =
    '<svg class="chev" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>';

  function esc(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function categoryHref(id) {
    return 'portfolio.html?cat=' + encodeURIComponent(id);
  }

  function currentCategories() {
    return (window.PHOTO_CATEGORIES || []).map(function (c) {
      return { id: c.id, name: c.name };
    });
  }

  /* ----------------------------------------------------------
     Build the pieces for a given category list
     ---------------------------------------------------------- */

  function categoryChips(categories, activeCategory) {
    var page = document.body.getAttribute('data-page') || '';
    return categories.map(function (c) {
      var active = page === 'portfolio' && activeCategory === c.id ? ' is-active' : '';
      return '<a class="nav-drop__link' + active + '" href="' + esc(categoryHref(c.id)) + '">' +
        esc(c.name) + '</a>';
    }).join('');
  }

  function toolRows() {
    var page = document.body.getAttribute('data-page') || '';
    return TOOLS.map(function (t) {
      if (t.soon) {
        return '<span class="nav-tool nav-tool--soon">' +
          '<span class="nav-tool__label">' + esc(t.label) +
          '<em class="soon-badge">Coming soon</em></span>' +
          '<span class="nav-tool__meta">' + esc(t.meta) + '</span></span>';
      }
      var active = page === 'tools' && !t.soon ? ' is-active' : '';
      return '<a class="nav-tool' + active + '" href="' + esc(t.href) + '">' +
        '<span class="nav-tool__label">' + esc(t.label) + '</span>' +
        '<span class="nav-tool__meta">' + esc(t.meta) + '</span></a>';
    }).join('');
  }

  function mobileLinks(categories, activeCategory) {
    var page = document.body.getAttribute('data-page') || '';
    return categories.map(function (c) {
      var active = page === 'portfolio' && activeCategory === c.id ? ' is-active' : '';
      return '<a class="' + (active ? 'is-active' : '') + '" href="' + esc(categoryHref(c.id)) + '">' +
        esc(c.name) + '</a>';
    }).join('');
  }

  function mobileTools() {
    var page = document.body.getAttribute('data-page') || '';
    return TOOLS.map(function (t) {
      if (t.soon) {
        return '<span>' +
          '<span>' + esc(t.label) + '</span>' +
          '<em class="soon-badge">Coming soon</em></span>';
      }
      var active = page === 'tools' ? ' is-active' : '';
      return '<a class="' + (active ? 'is-active' : '') + '" href="' + esc(t.href) + '">' + esc(t.label) + '</a>';
    }).join('');
  }

  /* ----------------------------------------------------------
     Assemble the header
     ---------------------------------------------------------- */

  function renderHeader() {
    var page = document.body.getAttribute('data-page') || '';
    var requestedCategory = document.body.getAttribute('data-category') || '';
    var categories = currentCategories();
    var hasCategory = categories.some(function (c) { return c.id === requestedCategory; });
    var activeCategory = hasCategory ? requestedCategory : '';

    var ctaHref = document.body.getAttribute('data-cta-href');
    var ctaLabel = document.body.getAttribute('data-cta-label');
    if (!ctaHref) ctaHref = 'index.html#contact';
    if (!ctaLabel) ctaLabel = 'Book a Session';

    var portfolioActive = page === 'portfolio' ? ' is-active' : '';
    var homeActive = page === 'home' ? ' is-active' : '';
    var toolsActive = page === 'tools' ? ' is-active' : '';

    // Remove a previously rendered nav so the DOM is never duplicated.
    var old = document.getElementById('site-nav');
    if (old) old.parentNode.removeChild(old);

    var html =
      '<nav class="site-nav" aria-label="Main">' +
        '<a href="index.html" class="brand">Photo With Mehran<span>.</span></a>' +

        '<div class="site-nav__links">' +

          '<a href="index.html" class="nav-item' + homeActive + '">Home</a>' +

          '<div class="nav-drop">' +
            '<a href="portfolio.html" class="nav-item nav-drop__toggle' + portfolioActive + '">' +
              'Portfolio' + chevDown + '</a>' +
            '<div class="nav-drop__panel nav-drop__panel--wide">' +
              '<p class="nav-drop__title">Browse categories</p>' +
              '<div class="nav-drop__grid">' + categoryChips(categories, activeCategory) + '</div>' +
              '<a href="portfolio.html" class="nav-drop__all">View all work &rarr;</a>' +
            '</div>' +
          '</div>' +

          '<div class="nav-drop nav-drop--right">' +
            '<a href="calculator.html" class="nav-item nav-drop__toggle' + toolsActive + '">' +
              'Tools' + chevDown + '</a>' +
            '<div class="nav-drop__panel">' +
              '<p class="nav-drop__title">Photography tools</p>' +
              '<div class="nav-drop__tools">' + toolRows() + '</div>' +
            '</div>' +
          '</div>' +

        '</div>' +

        '<a href="' + esc(ctaHref) + '" class="nav-cta">' + esc(ctaLabel) + '</a>' +
        '<button type="button" class="nav-burger" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">' +
          '<svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
          '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7h16M4 12h16M4 17h16" /></svg>' +
        '</button>' +
      '</nav>' +

      '<div class="mobile-panel" id="mobile-menu" aria-hidden="true">' +
        '<div class="mobile-panel__brand">' +
          'Photo With Mehran<span>.</span>' +
          '<button type="button" class="mobile-panel__close" aria-label="Close menu">' +
            '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 6l12 12M18 6L6 18" /></svg>' +
          '</button>' +
        '</div>' +
        '<a href="index.html" class="mobile-link' + homeActive + '">Home</a>' +
        '<button type="button" class="mobile-acc' + portfolioActive + '" aria-expanded="false">' +
          'Portfolio' + chevDown + '</button>' +
        '<div class="mobile-acc__body">' + mobileLinks(categories, activeCategory) + '</div>' +
        '<button type="button" class="mobile-acc' + toolsActive + '" aria-expanded="false">' +
          'Tools' + chevDown + '</button>' +
        '<div class="mobile-acc__body">' + mobileTools() + '</div>' +
        '<a href="' + esc(ctaHref) + '" class="mobile-cta">' + esc(ctaLabel) + '</a>' +
      '</div>';

    var header = document.createElement('header');
    header.className = 'site-header';
    header.id = 'site-nav';
    header.innerHTML = html;
    document.body.insertBefore(header, document.body.firstChild);

    /* ----- Interactions ----- */

    var burger = header.querySelector('.nav-burger');
    var panel = header.querySelector('.mobile-panel');
    var closeBtn = header.querySelector('.mobile-panel__close');

    function openMobile() {
      panel.classList.add('open');
      panel.setAttribute('aria-hidden', 'false');
      burger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('nav-locked');
    }

    function closeMobile() {
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
      burger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-locked');
    }

    burger.addEventListener('click', function () {
      if (panel.classList.contains('open')) {
        closeMobile();
      } else {
        openMobile();
      }
    });

    closeBtn.addEventListener('click', closeMobile);

    header.querySelectorAll('.mobile-acc').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var isOpen = btn.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(isOpen));
      });
    });

    // Close the mobile menu after choosing a destination.
    panel.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMobile);
    });

    function closeDropdowns() {
      header.querySelectorAll('.nav-drop.open').forEach(function (d) {
        d.classList.remove('open');
      });
    }

    document.addEventListener('click', function (e) {
      if (!header.parentNode) return; // header was replaced meanwhile
      if (panel.classList.contains('open') && !panel.contains(e.target) && !burger.contains(e.target)) {
        closeMobile();
      }
      if (!header.contains(e.target)) {
        closeDropdowns();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (!header.parentNode) return;
      if (e.key === 'Escape') {
        closeMobile();
        closeDropdowns();
      }
    });

    // Touch devices: hovering is unavailable, so let a tap open
    // the dropdown.  Desktop keeps hover + normal link navigation.
    var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    function setupDropdown(drop) {
      var toggle = drop.querySelector('.nav-drop__toggle');
      if (!toggle || !finePointer) return;

      toggle.addEventListener('click', function (e) {
        e.preventDefault();
        var isOpen = drop.classList.contains('open');
        closeDropdowns();
        if (!isOpen) drop.classList.add('open');
      });
    }

    header.querySelectorAll('.nav-drop').forEach(setupDropdown);
  }

  renderHeader();

  // Categories changed (new images discovered at runtime) — rebuild.
  document.addEventListener('photocategories', renderHeader);
})();