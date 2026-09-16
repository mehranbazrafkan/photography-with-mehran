/* ============================================================
   Live photo discovery.

   A static site cannot list its own folders from the browser on
   GitHub Pages, so this script discovers the portfolio images at
   runtime and rebuilds window.PHOTO_CATEGORIES:

   Source of truth, in order of preference:
     1. Live directory listing of assets/images/ (available on
        most dev servers, e.g. `python -m http.server`) — this
        reflects your actual local folders, including images you
        haven't pushed yet.
     2. GitHub's public API file tree (used on the deployed
        GitHub Pages site, where directory listing is disabled).
     3. The checked-in js/portfolio-data.js fallback
        (offline / API-blocked).

   Every page load (stale-while-revalidate):
     1. Instantly uses the local cache or the checked-in
        js/portfolio-data.js.
     2. Tries the listing, then the API.
     3. Rebuilds PHOTO_CATEGORIES from whatever is found.
     4. Notifies the page (custom event "photocategories") to
        re-render and refreshes the local cache.

   Result: drop new thumbnails + full images into a category
   folder, reload — they appear automatically. No build step and
   no code changes.
   ============================================================ */

window.PHOTOS_REPO = 'mehranbazrafkan/photography-with-mehran';

(function () {
  'use strict';

  var CACHE_KEY = 'photo-with-mehran:categories';
  var IMG_RE = /\.(jpe?g|png)$/i;

  /* ----------------------------------------------------------
     Local cache (guarded — localStorage is blocked on some
     origins, e.g. local files).
     ---------------------------------------------------------- */

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed && parsed.t && Array.isArray(parsed.cats) && parsed.cats.length) return parsed;
    } catch (e) {}
    return null;
  }

  function writeCache(cats) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), cats: cats }));
    } catch (e) {}
  }

  /* ----------------------------------------------------------
     Ordering helper: keep existing category order from the seed,
     then append any new folders alphabetically.
     ---------------------------------------------------------- */

  function orderIds(byCat, seed) {
    var ids = [];
    (seed || []).forEach(function (c) { if (byCat[c.id] && ids.indexOf(c.id) === -1) ids.push(c.id); });
    Object.keys(byCat).sort().forEach(function (id) {
      if (ids.indexOf(id) === -1) ids.push(id);
    });
    return ids;
  }

  /* ----------------------------------------------------------
     Shared category builder.
     ---------------------------------------------------------- */

  function displayName(id) {
    return id.split(/[-_ ]+/).map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }

  function makeCategory(id, files, seed) {
    files = files.slice().sort();
    var seedCat = null;
    (seed || []).forEach(function (c) { if (c.id === id) seedCat = c; });
    return {
      id: id,
      name: seedCat && seedCat.name ? seedCat.name : displayName(id),
      description: seedCat ? (seedCat.description || '') : '',
      preview: id + '/' + files[0],
      images: files.map(function (f) {
        return { thumb: 'thumbnails/' + id + '/' + f, full: 'portfolio/' + id + '/' + f };
      })
    };
  }

  /* ----------------------------------------------------------
     Provider 1: local directory listing.
     ---------------------------------------------------------- */

  // Fetches an HTML directory index and returns the decoded
  // link targets. Returns [] when there is no listing (the
  // deployed site, or a server that hides folders).
  function listDir(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) return [];
      return res.text();
    }).then(function (html) {
      if (!html) return [];
      var out = [];
      var re = /href="([^"]+)"/g;
      var m;
      while ((m = re.exec(html)) !== null) {
        var h = m[1];
        if (!h || h.charAt(0) === '/' || /^\.\.?\//.test(h) || h.indexOf('#') !== -1) continue;
        try { h = decodeURIComponent(h); } catch (e) {}
        out.push(h);
      }
      return out;
    }).catch(function () { return []; });
  }

  // Lists category folders that have BOTH a thumbnails and a
  // portfolio directory, then pairs up image files. Returns a
  // Promise<Array>. Empty again means "no local listing".
  function fetchCategoriesFromListing(seed) {
    return listDir('assets/images/thumbnails/').then(function (thumbLinks) {
      var cats = thumbLinks
        .filter(function (h) { return /\/$/.test(h); })
        .map(function (h) { return h.replace(/\/+$/, ''); })
        .filter(function (c) { return c && !/^\./.test(c); });
      if (!cats.length) return [];

      return listDir('assets/images/portfolio/').then(function (fullLinks) {
        var fullCats = {};
        fullLinks.forEach(function (h) {
          if (/\/$/.test(h)) fullCats[h.replace(/\/+$/, '')] = true;
        });
        cats = cats.filter(function (c) { return fullCats[c]; });
        if (!cats.length) return [];

        return Promise.all(cats.map(function (cat) {
          return listDir('assets/images/thumbnails/' + cat + '/').then(function (files) {
            var candidates = files.filter(function (f) { return IMG_RE.test(f); });
            if (!candidates.length) return null;
            // Only keep images that also exist in the portfolio dir.
            return listDir('assets/images/portfolio/' + cat + '/').then(function (fulls) {
              var fset = {};
              fulls.forEach(function (f) { if (IMG_RE.test(f)) fset[f] = true; });
              candidates = candidates.filter(function (f) { return fset[f]; });
              if (!candidates.length) return null;
              return makeCategory(cat, candidates, seed);
            });
          });
        })).then(function (found) {
          var byCat = {};
          found.forEach(function (c) { if (c) byCat[c.id] = c.images.map(function (i) { return i.full.split('/').pop(); }); });
          return orderIds(byCat, seed).map(function (id) {
            return makeCategory(id, byCat[id], seed);
          });
        });
      });
    });
  }

  /* ----------------------------------------------------------
     Provider 2: GitHub API file tree. Tries HEAD first, then
     main, then master so it keeps working whatever the default
     branch is.
     ---------------------------------------------------------- */

  function fetchTree() {
    var refs = ['HEAD', 'main', 'master'];
    var attempt = function (ref) {
      return fetch('https://api.github.com/repos/' + window.PHOTOS_REPO + '/git/trees/' + ref + '?recursive=1', {
        headers: { Accept: 'application/vnd.github+json' }
      }).then(function (res) {
        if (res.status === 404) return null; // wrong ref, try next
        if (!res.ok) throw new Error('GitHub API HTTP ' + res.status);
        return res.json();
      });
    };
    return attempt(refs[0]).then(function (tree) {
      if (tree) return tree;
      return attempt(refs[1]).then(function (t2) {
        if (t2) return t2;
        return attempt(refs[2]);
      });
    });
  }

  // Rebuild PHOTO_CATEGORIES from the file tree.
  function buildCategories(tree, seed) {
    var thumbIndex = {};
    var byCat = {};
    var i, m, paths = (tree.tree || []).map(function (n) { return n.path; });

    for (i = 0; i < paths.length; i++) {
      m = /^assets\/images\/thumbnails\/([^/]+)\/([^/]+)$/.exec(paths[i]);
      if (m) thumbIndex[m[1] + '/' + m[2]] = true;
    }

    for (i = 0; i < paths.length; i++) {
      m = /^assets\/images\/portfolio\/([^/]+)\/([^/]+)$/.exec(paths[i]);
      if (m && thumbIndex[m[1] + '/' + m[2]]) {
        (byCat[m[1]] = byCat[m[1]] || []).push(m[2]);
      }
    }

    return orderIds(byCat, seed).map(function (id) {
      return makeCategory(id, byCat[id], seed);
    });
  }

  /* ----------------------------------------------------------
     Boot.
     ---------------------------------------------------------- */

  // Stale-while-revalidate: show whatever we know instantly
  // (local cache first, then the checked-in seed data), while
  // always refreshing in the background so a fresh reload
  // reflects newly added images right away.
  var cache = readCache();
  if (cache) {
    window.PHOTO_CATEGORIES = cache.cats;
  }

  var seed = window.PHOTO_CATEGORIES || [];

  function apply(cats) {
    if (!cats.length) return;
    window.PHOTO_CATEGORIES = cats;
    writeCache(cats);
    try {
      document.dispatchEvent(new CustomEvent('photocategories'));
    } catch (e) {}
  }

  // GitHub Pages does not expose directory listings, so go
  // straight to the API there.
  var onGitHubPages = /(^|\.)github\.io$/i.test(location.hostname);

  var discovery = onGitHubPages
    ? Promise.resolve([]) // no listing available
    : fetchCategoriesFromListing(seed);

  discovery.then(function (cats) {
    if (cats.length) {
      apply(cats);
      return;
    }
    // No local listing (deployed site) — use the GitHub API.
    return fetchTree().then(function (tree) {
      if (tree) apply(buildCategories(tree, seed));
    });
  }).catch(function (err) {
    // Discovery blocked/offline — keep the data that was already loaded.
    if (window.console && console.info) {
      console.info('Photo auto-discovery unavailable; using known data.', err && err.message);
    }
  });
})();