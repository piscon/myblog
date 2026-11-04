/* Site-layer enhancements, loaded fingerprinted from extend_head.
   Six self-gating features — each activates only when its DOM exists:
   1. Reading progress bar — only on article pages (article.post-single)
   2. Lightbox — clicks on images inside .post-content
   3. TOC scrollspy — highlights the .toc entry of the heading in view
   4. Ctrl/Cmd+K — focus the search input on the search page, otherwise
      jump to the current language's search page (menu link is the
      language-correct source of truth)
   5. Language switcher — PaperMod only renders the OTHER languages, so
      the list members swap on every switch; prepend the current language
      (from <html lang>) at its weight position, marked non-clickable.
      Falls back to the theme's behavior without JS. Language names mirror
      hugo.toml labels.
   6. Floating side TOC — wide screens (≥1280px) pin the toc beside the
      content column and force the details open; below the breakpoint the
      inline collapsed details is restored (see ui.css media block).
   Theme DOM coupling: PaperMod's .post-single / .post-content / .toc /
   #menu / #searchInput / .lang-menu; regression-guarded by feature-check
   assertions. */
(function () {
  'use strict';

  /* 1. Reading progress */
  if (document.querySelector('article.post-single')) {
    var bar = document.createElement('div');
    bar.className = 'reading-progress';
    document.body.appendChild(bar);
    var raf = false;
    var update = function () {
      raf = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var p = max > 0 ? (doc.scrollTop || document.body.scrollTop) / max : 0;
      bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, p)) + ')';
    };
    document.addEventListener('scroll', function () {
      if (!raf) {
        raf = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* 2. Lightbox */
  var content = document.querySelector('.post-content');
  if (content) {
    content.addEventListener('click', function (e) {
      var img = e.target.closest('img');
      if (!img) return;
      e.preventDefault();
      var overlay = document.createElement('div');
      overlay.className = 'lightbox';
      var view = document.createElement('img');
      view.src = img.currentSrc || img.src;
      view.alt = img.alt || '';
      overlay.appendChild(view);
      document.documentElement.style.overflow = 'hidden';
      var onKey = function (ev) {
        if (ev.key === 'Escape') close();
      };
      var close = function () {
        overlay.remove();
        document.documentElement.style.overflow = '';
        document.removeEventListener('keydown', onKey);
      };
      overlay.addEventListener('click', close);
      document.addEventListener('keydown', onKey);
      document.body.appendChild(overlay);
    });
  }

  /* 3. TOC scrollspy */
  var toc = document.querySelector('.toc');
  var post = document.querySelector('.post-content');
  if (toc && post) {
    var map = {};   // heading id -> toc <li>
    var heads = []; // heading elements in TOC order (= document order)
    toc.querySelectorAll('a[href^="#"]').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (href.length < 2) return;
      var h = document.getElementById(decodeURIComponent(href.slice(1)));
      if (h) {
        heads.push(h);
        map[h.id] = a.parentElement;
      }
    });
    if (heads.length) {
      var current = null;
      var spy = function () {
        var best = null;
        for (var i = 0; i < heads.length; i++) {
          if (heads[i].getBoundingClientRect().top <= 96) best = heads[i];
          else break;
        }
        var id = best ? best.id : null;
        if (id !== current) {
          if (current && map[current]) map[current].classList.remove('active');
          current = id;
          if (id && map[id]) map[id].classList.add('active');
        }
      };
      var ticking = false;
      document.addEventListener('scroll', function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(function () {
            ticking = false;
            spy();
          });
        }
      }, { passive: true });
      spy();
    }
  }

  /* 4. Ctrl/Cmd+K search shortcut */
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey &&
        (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      var input = document.getElementById('searchInput');
      if (input) {
        input.focus();
        input.select();
        return;
      }
      var link = document.querySelector('#menu a[href*="/search/"]');
      if (link) location.href = link.href;
    }
  });

  /* 5. Language switcher: stable full list (all languages, current marked).
     Every item gets a dual label — full name (≥768px) / short code
     (<768px, keeps the crowded mobile header on one line). The switcher is
     marked translate=no so Chrome Translate never mangles language names
     or re-prompts off them. */
  var langMenu = document.querySelector('.lang-menu');
  if (langMenu) {
    langMenu.setAttribute('translate', 'no');
    langMenu.classList.add('notranslate');
    var docLang = (document.documentElement.getAttribute('lang') || '').slice(0, 2);
    var langMeta = {
      zh: { name: '简体中文', short: 'ZH', home: '/zh/', order: 0 },
      ja: { name: '日本語', short: 'JA', home: '/ja/', order: 1 },
      en: { name: 'English', short: 'EN', home: '/en/', order: 2 }
    };
    var dualLabel = function (text, short) {
      var full = document.createElement('span');
      full.className = 'lang-full';
      full.textContent = text;
      var s = document.createElement('span');
      s.className = 'lang-short';
      s.textContent = short;
      s.setAttribute('translate', 'no');
      return [full, s];
    };
    langMenu.querySelectorAll('a').forEach(function (a) {
      var m = (a.getAttribute('href') || '').match(/\/(zh|ja|en)\/?$/);
      if (!m) return;
      var meta = langMeta[m[1]];
      var text = a.textContent;
      a.textContent = '';
      dualLabel(text, meta.short).forEach(function (sp) {
        a.appendChild(sp);
      });
    });
    var meta = langMeta[docLang];
    var listed = meta && langMenu.querySelector('a[href$="' + meta.home + '"]');
    if (meta && !listed) {
      var li = document.createElement('li');
      li.className = 'current-lang';
      var label = document.createElement('span');
      label.setAttribute('aria-current', 'true');
      dualLabel(meta.name, meta.short).forEach(function (sp) {
        label.appendChild(sp);
      });
      li.appendChild(label);
      var before = null;
      langMenu.querySelectorAll('a').forEach(function (a) {
        if (before) return;
        var m = (a.getAttribute('href') || '').match(/\/(zh|ja|en)\/?$/);
        if (m && langMeta[m[1]].order > meta.order) before = a.parentElement;
      });
      langMenu.insertBefore(li, before);
    }
  }

  /* 6. Floating side TOC on wide screens */
  var tocDetails = document.querySelector('details.toc');
  if (tocDetails) {
    var wideToc = window.matchMedia('(min-width: 1280px)');
    var tocForced = false;
    var syncToc = function () {
      if (wideToc.matches) {
        if (!tocDetails.open) {
          tocDetails.open = true;
          tocForced = true;
        }
      } else if (tocForced) {
        tocDetails.open = false;
        tocForced = false;
      }
    };
    if (wideToc.addEventListener) {
      wideToc.addEventListener('change', syncToc);
    } else if (wideToc.addListener) {
      wideToc.addListener(syncToc);
    }
    syncToc();
  }
})();
