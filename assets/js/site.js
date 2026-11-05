/* Site-layer enhancements, loaded fingerprinted from extend_head.
   Eight self-gating features — each activates only when its DOM exists:
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
   7. Native share — on touch screens the system share sheet replaces the
      X/Telegram link flow (both unreachable from mainland phones): the
      theme's intent links are hidden under the same gate and the sheet
      entry is injected first. Desktop keeps the icon links.
   8. Mobile hamburger — injects a top-right toggle that collapses the
      inline menu row into a dropdown panel on phones (≤768px, the actual
      show/hide lives in ui.css; the theme has no hamburger of its own).
      No JS → no button → the theme's inline wrapped menu stays.
   Theme DOM coupling: PaperMod's .post-single / .post-content / .toc /
   #menu / .header-nav / #searchInput / .lang-menu / .share-buttons;
   regression-guarded by feature-check assertions. */
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

  /* 5. Language switcher: stable full list (all languages, current marked),
     switching to the SAME page in the target language. Data source is the
     head hreflang links the theme emits on every page (<link rel=alternate
     hreflang> per translation, self included): a translated page gets its
     sibling permalink, an untranslated one keeps the theme's language
     homepage link (never a 404). JS disabled → theme default (homepage
     links). Every item gets a dual label — full name (≥768px) / short code
     (<768px, keeps the crowded mobile header on one line). The switcher is
     marked translate=no so Chrome Translate never mangles language names
     or re-prompts off them. */
  var langMenu = document.querySelector('.lang-menu');
  if (langMenu) {
    langMenu.setAttribute('translate', 'no');
    langMenu.classList.add('notranslate');
    var docLang = (document.documentElement.getAttribute('lang') || '').slice(0, 2);
    var langMeta = {
      zh: { name: '简体中文', short: 'ZH', order: 0 },
      ja: { name: '日本語', short: 'JA', order: 1 },
      en: { name: 'English', short: 'EN', order: 2 }
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
    /* this page's per-language permalinks from head (x-default and the RSS
       alternates carry no 2-letter hreflang, so they drop out) */
    var pageLangs = {};
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(function (l) {
      var m = (l.getAttribute('hreflang') || '').match(/^[a-z]{2}(?=-|$)/i);
      if (m && langMeta[m[0].toLowerCase()] && l.href) pageLangs[m[0].toLowerCase()] = l.href;
    });
    /* tag each anchor with its target language BEFORE rewriting hrefs —
       theme hrefs are always language homepages (/zh/ style) */
    langMenu.querySelectorAll('a').forEach(function (a) {
      var m = (a.getAttribute('href') || '').match(/\/(zh|ja|en)\/?$/);
      if (!m) return;
      var lang = m[1];
      a.dataset.lang = lang;
      if (pageLangs[lang]) a.href = pageLangs[lang];
      var text = a.textContent;
      a.textContent = '';
      dualLabel(text, langMeta[lang].short).forEach(function (sp) {
        a.appendChild(sp);
      });
    });
    var meta = langMeta[docLang];
    var listed = meta && langMenu.querySelector('a[data-lang="' + docLang + '"]');
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
        if (a.dataset.lang && langMeta[a.dataset.lang].order > meta.order) before = a.parentElement;
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

  /* 7. Native share on phones: system share sheet instead of the X/
     Telegram intent links (both unreachable from mainland phones, and
     the sheet carries any installed target). Under the same gate the
     theme's intent links are hidden, so touch devices see one clean
     entry; desktop browsers that expose navigator.share keep the links. */
  var shareButtons = document.querySelector('.share-buttons');
  if (shareButtons && navigator.share &&
      window.matchMedia('(pointer: coarse)').matches) {
    shareButtons.querySelectorAll('li').forEach(function (li) {
      li.style.display = 'none';
    });
    var shareLi = document.createElement('li');
    var shareBtn = document.createElement('a');
    shareBtn.href = '#';
    shareBtn.setAttribute('aria-label', 'share this page');
    shareBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"' +
      ' width="26" height="26" fill="none" stroke="currentColor"' +
      ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' +
      ' aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6"' +
      ' cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59"' +
      ' y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51"' +
      ' x2="8.59" y2="10.49"/></svg>';
    shareBtn.addEventListener('click', function (e) {
      e.preventDefault();
      navigator.share({ title: document.title, url: location.href })
        .catch(function () {}); // user dismiss of the sheet is not an error
    });
    shareLi.appendChild(shareBtn);
    shareButtons.insertBefore(shareLi, shareButtons.firstChild);
  }

  /* 8. Mobile hamburger: the toggle is appended LAST in .header-nav so
     the space-between row lands it top-right, opposite the logo; ui.css
     (≤768px) does the actual collapsing via the html.js gate (set by
     extend_head's first-paint inline script — a :has(>.menu-toggle) hide
     only matched after this script ran, flashing the theme's wrapped menu
     on every page transition) and the .menu-open panel. Outside clicks
     and Escape close it; navigating away resets it naturally. aria-label
     follows the page language. */
  var nav = document.querySelector('.header-nav');
  var menuList = document.getElementById('menu');
  if (nav && menuList) {
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'menu-toggle';
    toggle.setAttribute('aria-controls', 'menu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', {
      zh: '菜单',
      ja: 'メニュー',
      en: 'Menu'
    }[(document.documentElement.getAttribute('lang') || 'zh').slice(0, 2)] || 'Menu');
    toggle.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"' +
      ' width="20" height="20" fill="none" stroke="currentColor"' +
      ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' +
      ' aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/>' +
      '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18"' +
      ' x2="21" y2="18"/></svg>';
    var setOpen = function (open) {
      nav.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    toggle.addEventListener('click', function () {
      setOpen(!nav.classList.contains('menu-open'));
    });
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('menu-open') && !nav.contains(e.target)) {
        setOpen(false);
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('menu-open')) {
        setOpen(false);
      }
    });
    nav.appendChild(toggle);
  }
})();
