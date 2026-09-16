/* ============================================================
   Portfolio page: category overview cards, category galleries,
   and the full-image photo viewer (lightbox).
   Expects window.PHOTO_CATEGORIES (js/portfolio-data.js) and
   the shared navigation (js/shared.js) to be loaded first.
   ============================================================ */

(function () {
  'use strict';

  var categories = window.PHOTO_CATEGORIES || [];

  var BASE = 'assets/images/';

  function thumbPath(cat, suffix) {
    return BASE + 'thumbnails/' + cat + '/' + suffix;
  }

  function fullPath(cat, suffix) {
    return BASE + 'portfolio/' + cat + '/' + suffix;
  }

  function categoryHref(id) {
    return 'portfolio.html?cat=' + encodeURIComponent(id);
  }

  function esc(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ----------------------------------------------------------
     Fast filename lookup helpers (avoid URL-encoding surprises
     for the "still life" category with a space in its name).
     ---------------------------------------------------------- */

  function imageName(image) {
    var parts = image.split('/');
    return parts[parts.length - 1];
  }

  /* ----------------------------------------------------------
     Current category from the URL (?cat=...)
     ---------------------------------------------------------- */

  function currentCategory() {
    var params = new URLSearchParams(window.location.search);
    var id = '';
    try {
      id = decodeURIComponent(params.get('cat') || '');
    } catch (e) {
      return null;
    }
    for (var i = 0; i < categories.length; i++) {
      if (categories[i].id === id) return categories[i];
    }
    return null;
  }

  /* ----------------------------------------------------------
     Broken-image fallback
     ---------------------------------------------------------- */

  function markMissing(img) {
    if (!img || img.classList.contains('img-fallback-applied')) return;
    img.classList.add('img-fallback-applied');
    img.removeAttribute('src');
    img.alt = 'Photo unavailable';
    var wrap = img.closest('[data-photo-card]');
    if (wrap) {
      wrap.classList.add('img-missing');
      if (!wrap.querySelector('.img-missing-text')) {
        var note = document.createElement('span');
        note.className = 'img-missing-text';
        note.textContent = 'Photo unavailable';
        wrap.appendChild(note);
      }
    }
  }

  /* ==========================================================
     LANDING VIEW — one card per category, using thumbnails.
     ========================================================== */

  function renderLanding() {
    var grid = document.getElementById('category-grid');
    if (!grid) return;

    categories.forEach(function (cat, i) {
      var count = cat.images.length;
      var preview = categoryPreview(cat);
      var alt = cat.name + ' preview photo';
      var card = document.createElement('a');
      card.className = 'group block overflow-hidden rounded-3xl border border-black/5 bg-white shadow-lg shadow-black/5 transition hover:-translate-y-1.5 hover:shadow-xl reveal';
      card.style.transitionDelay = (i % 3) * 60 + 'ms';
      card.href = categoryHref(cat.id);
      card.setAttribute('data-category-card', cat.id);

      card.innerHTML =
        '<div class="aspect-[4/3] overflow-hidden bg-black/5" data-card-media>' +
          '<img src="' + esc(preview) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async" ' +
               'class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />' +
        '</div>' +
        '<div class="flex items-center justify-between p-5">' +
          '<div>' +
            '<h3 class="font-serif text-xl font-semibold">' + esc(cat.name) + '</h3>' +
            '<p class="mt-1 text-xs text-ink/50">' + count + (count === 1 ? ' photo' : ' photos') + '</p>' +
          '</div>' +
          '<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 transition group-hover:bg-amber-500 group-hover:text-ink">' +
            '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>' +
          '</span>' +
        '</div>';

      grid.appendChild(card);
    });

    if (categories.length === 0) {
      document.getElementById('category-empty').classList.remove('hidden');
    }

    // Fallback for any category card whose preview thumbnail is missing.
    grid.querySelectorAll('img').forEach(function (img) {
      img.addEventListener('error', function () {
        var media = img.closest('[data-card-media]');
        if (media) {
          media.classList.add('img-missing');
          var note = document.createElement('span');
          note.className = 'img-missing-text';
          note.textContent = 'Photos coming soon';
          media.appendChild(note);
          img.remove();
        }
      });
    });
  }

  function categoryPreview(cat) {
    if (cat.preview) {
      return BASE + 'thumbnails/' + cat.preview;
    }
    if (cat.images.length) {
      return thumbPath(cat.id, imageName(cat.images[0].full));
    }
    return '';
  }

  /* ==========================================================
     CATEGORY VIEW — thumbnail grid + full-image viewer.
     ========================================================== */

  function renderCategory(cat) {
    document.getElementById('landing-view').classList.add('hidden');
    document.getElementById('category-view').classList.remove('hidden');

    document.title = cat.name + ' - Photo With Mehran';

    document.getElementById('category-name').textContent = cat.name;
    document.getElementById('category-description').textContent = cat.description || '';

    var countEl = document.getElementById('category-count');
    var count = cat.images.length;
    countEl.textContent = count + (count === 1 ? ' photo' : ' photos');

    var grid = document.getElementById('photo-grid');
    var viewer = document.getElementById('photo-viewer');
    var viewerImg = document.getElementById('pv-img');
    var viewerCount = document.getElementById('pv-count');
    var current = 0;

    grid.innerHTML = '';

    if (count === 0) {
      document.getElementById('category-empty-gallery').classList.remove('hidden');
      return;
    }

    cat.images.forEach(function (image, i) {
      var name = imageName(image.full);
      var thumb = thumbPath(cat.id, name);
      var full = fullPath(cat.id, name);

      var tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'group relative aspect-square overflow-hidden rounded-2xl bg-black/5 text-left shadow-md transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-500';
      tile.setAttribute('data-photo-card', '');
      tile.setAttribute('aria-label', 'Open photo ' + (i + 1) + ' of ' + count);
      tile.innerHTML =
        '<img src="' + esc(thumb) + '" alt="' + esc(cat.name) + ' photo ' + (i + 1) + '" loading="lazy" decoding="async" ' +
             'class="h-full w-full object-cover transition duration-500 group-hover:scale-110" />';

      tile.addEventListener('error', function () {
        var wrap = this.closest('[data-photo-card]');
        if (wrap) {
          markMissing(wrap.querySelector('img'));
        }
      }, true);

      tile.addEventListener('click', function () {
        openPhoto(i);
      });

      grid.appendChild(tile);
    });

    /* ----- full-image viewer ----- */

    function openPhoto(i) {
      if (!cat.images.length) return;
      current = (i + cat.images.length) % cat.images.length;
      displayCurrent();
      viewer.classList.add('open');
      document.body.classList.add('nav-locked');
      viewerImg.focus && viewerImg.focus();
    }

    function displayCurrent() {
      var image = cat.images[current];
      viewerImg.src = fullPath(cat.id, imageName(image.full));
      viewerImg.alt = cat.name + ' photo ' + (current + 1);
      viewerCount.textContent = (current + 1) + ' / ' + cat.images.length;
    }

    function closeViewer() {
      viewer.classList.remove('open');
      document.body.classList.remove('nav-locked');
      viewerImg.removeAttribute('src');
    }

    function step(dir) {
      current = (current + dir + cat.images.length) % cat.images.length;
      displayCurrent();
    }

    document.getElementById('pv-close').addEventListener('click', closeViewer);
    document.getElementById('pv-prev').addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
    document.getElementById('pv-next').addEventListener('click', function (e) { e.stopPropagation(); step(1); });

    viewer.addEventListener('click', function (e) {
      if (e.target === viewer) closeViewer();
    });

    viewerImg.addEventListener('error', function () {
      var fallback = document.createElement('div');
      fallback.className = 'flex h-48 items-center justify-center rounded-2xl border border-white/15 px-6 text-sm text-white/60';
      fallback.textContent = 'Full-resolution photo unavailable';
      viewer.querySelectorAll('.pv-fallback').forEach(function (el) { el.remove(); });
      fallback.classList.add('pv-fallback');
      viewer.appendChild(fallback);
    });

    viewerImg.addEventListener('load', function () {
      viewer.querySelectorAll('.pv-fallback').forEach(function (el) { el.remove(); });
    });

    document.addEventListener('keydown', function onKey(e) {
      if (!viewer.classList.contains('open')) return;
      if (e.key === 'Escape') closeViewer();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    });

    // Pointer swipe for mobile / touch screens.
    var touchStartX = null;
    viewer.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });
    viewer.addEventListener('touchend', function (e) {
      if (touchStartX === null) return;
      var deltaX = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(deltaX) > 48) {
        step(deltaX < 0 ? 1 : -1);
      }
      touchStartX = null;
    }, { passive: true });
  }

  /* ==========================================================
     SCROLL REVEAL (matches the rest of the site)
     ========================================================== */

  function setupReveal(root) {
    var items = root.querySelectorAll('.reveal');
    if (!items.length) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { observer.observe(el); });
  }

  /* ==========================================================
     FOOTER YEAR
     ========================================================== */

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ==========================================================
     BOOT
     ========================================================== */

  var pageCategory = currentCategory();

  if (pageCategory) {
    renderCategory(pageCategory);
  } else {
    renderLanding();
    setupReveal(document.getElementById('landing-view'));
  }
})();