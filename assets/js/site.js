/* Site-layer enhancements, loaded fingerprinted from extend_head.
   Ten self-gating features — each activates only when its DOM exists:
   1. Reading progress bar — only on article pages (article.post-single)
   2. Lightbox — clicks on images inside .post-content
   3. TOC scrollspy — highlights the .toc entry of the heading in view
   4. Ctrl/Cmd+K — focus the search input on the search page, otherwise
      jump to the current language's search page (menu link is the
      language-correct source of truth)
   5. Language switcher — PaperMod only renders the OTHER languages, so
      the list members swap on every switch; prepend the current language
      (from <html lang>) at its weight position, marked non-clickable,
      retargeted to the same page via the head hreflang links. Phones fold
      the row into a globe toggle whose panel mirrors the hamburger's;
      desktop keeps the inline names. Falls back to the theme's behavior
      without JS. Language names mirror hugo.toml labels.
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
   9. Related-after-footer — moves .post-related after .post-footer so
      DOM/tab order matches the visual flex order (ui.css order:5 places
      it last but its DOM slot — the extend_post_content hook — is before
      the footer, making keyboard focus jump backwards). Without JS the
      order property alone keeps the identical visual position.
   10. Collapsed SEO summary — the header .post-description (the
      search-engine lede) folds into an eyebrow toggle on the meta row:
      typography.css grids the header (label+chevron left, meta right,
      keyed on html.js for first paint) and this script re-parents the
      raw text into .desc-body (a full-width row below the label — CSS
      cannot select a text node, so the grid mutes it with font-size:0
      and the body restores the size). aria-label follows the page
      language, same map as the hamburger. No JS → no toggle, the
      description stays the stacked block under the title.
   Theme DOM coupling: PaperMod's .post-single / .post-content / .toc /
   #menu / .header-nav / .logo-switches / #searchInput / .lang-menu /
   .share-buttons / .post-footer / .post-related / .post-header
   .post-description; regression-guarded by feature-check assertions. */
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
     links). On phones (≤768px, ui.css) the inline row is replaced by an
     injected globe toggle that opens the list as a full-width panel under
     the header — the hamburger panel's geometry; desktop keeps the inline
     full names. The switcher is marked translate=no so Chrome Translate
     never mangles language names or re-prompts off them. */
  var langMenu = document.querySelector('.lang-menu');
  if (langMenu) {
    langMenu.setAttribute('translate', 'no');
    langMenu.classList.add('notranslate');
    var docLang = (document.documentElement.getAttribute('lang') || '').slice(0, 2);
    var langMeta = {
      zh: { name: '简体中文', order: 0 },
      ja: { name: '日本語', order: 1 },
      en: { name: 'English', order: 2 }
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
    });
    var meta = langMeta[docLang];
    var listed = meta && langMenu.querySelector('a[data-lang="' + docLang + '"]');
    if (meta && !listed) {
      var li = document.createElement('li');
      li.className = 'current-lang';
      var label = document.createElement('span');
      label.setAttribute('aria-current', 'true');
      label.textContent = meta.name;
      li.appendChild(label);
      var before = null;
      langMenu.querySelectorAll('a').forEach(function (a) {
        if (before) return;
        if (a.dataset.lang && langMeta[a.dataset.lang].order > meta.order) before = a.parentElement;
      });
      langMenu.insertBefore(li, before);
    }
    /* Mobile globe (≤768px): the theme's inline row collapses into one
       icon — the list opens as the hamburger panel's twin (same geometry,
       same outside-click/Escape contract, and the two header panels are
       mutually exclusive: opening one closes the other). The button goes
       after the list inside .logo-switches, so the header row reads
       logo · theme · globe; ui.css does the breakpoint switch (the list
       hides, the button shows, .lang-open renders the panel). Desktop
       keeps the inline names and display:none's the button. */
    var headerNav = document.querySelector('.header-nav');
    var switchWrap = langMenu.closest('.logo-switches');
    if (headerNav && switchWrap) {
      langMenu.id = 'lang-menu';
      var langToggle = document.createElement('button');
      langToggle.type = 'button';
      langToggle.className = 'lang-toggle';
      langToggle.setAttribute('aria-controls', 'lang-menu');
      langToggle.setAttribute('aria-expanded', 'false');
      langToggle.setAttribute('aria-label', {
        zh: '语言',
        ja: '言語',
        en: 'Language'
      }[docLang] || 'Language');
      langToggle.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"' +
        ' width="20" height="20" fill="none" stroke="currentColor"' +
        ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' +
        ' aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2"' +
        ' y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10' +
        ' 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1' +
        ' 4-10z"/></svg>';
      var setLangOpen = function (open) {
        langMenu.classList.toggle('lang-open', open);
        langToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      langToggle.addEventListener('click', function () {
        var open = !langMenu.classList.contains('lang-open');
        if (open) {
          var mt = headerNav.querySelector('.menu-toggle');
          if (mt) {
            headerNav.classList.remove('menu-open');
            mt.setAttribute('aria-expanded', 'false');
          }
        }
        setLangOpen(open);
      });
      document.addEventListener('click', function (e) {
        if (langMenu.classList.contains('lang-open') &&
            !langMenu.contains(e.target) && !langToggle.contains(e.target)) {
          setLangOpen(false);
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && langMenu.classList.contains('lang-open')) {
          setLangOpen(false);
        }
      });
      switchWrap.appendChild(langToggle);
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
      if (open) {
        /* the header hosts two panels (menu + language) — mutually
           exclusive: opening one closes the other (mirrored inside
           feature 5's lang toggle) */
        var openLang = document.querySelector('.lang-menu.lang-open');
        if (openLang) {
          openLang.classList.remove('lang-open');
          var lt = document.querySelector('.lang-toggle');
          if (lt) lt.setAttribute('aria-expanded', 'false');
        }
      }
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

  /* 9. Related posts after the footer: the visual order (ui.css) shows
     related LAST (order:5, after tags/share/paginav), but its DOM slot
     — the extend_post_content hook inside the theme's single.html — is
     BEFORE the footer, so keyboard focus ran content → related → tags
     while the screen showed content → tags → related. Moving the node
     aligns tab order with the visual order; ui.css order:5 stays as the
     no-JS fallback and yields the identical visual position either way. */
  var related = document.querySelector('.post-single > .post-related');
  var footer = document.querySelector('.post-single > .post-footer');
  if (related && footer) {
    footer.insertAdjacentElement('afterend', related);
  }

  /* 10. Collapsed SEO summary: the theme renders the description as a
     bare <div> of text between the title and the meta line; fold it into
     an eyebrow toggle on the meta row (label+chevron left, meta right —
     typography.css does the html.js-gated grid). The text is re-parented
     into .desc-body — a header-level grid row that spans full width when
     .desc-open is set — because CSS can't select a text node to hide it
     (the grid mutes the original position with font-size:0 instead).
     Inserted after .post-meta so DOM order matches the visual top-to-
     bottom (title, label row, meta right, body below); the body carries
     no interactive content, so tab order is unaffected. */
  var header = document.querySelector('.post-header');
  var desc = document.querySelector('.post-header .post-description');
  var metaLine = document.querySelector('.post-header .post-meta');
  if (header && desc) {
    var descBody = document.createElement('div');
    descBody.className = 'desc-body';
    descBody.id = 'desc-body';
    while (desc.firstChild) descBody.appendChild(desc.firstChild);
    (metaLine || desc).insertAdjacentElement('afterend', descBody);
    var descToggle = document.createElement('button');
    descToggle.type = 'button';
    descToggle.className = 'desc-toggle';
    descToggle.setAttribute('aria-controls', 'desc-body');
    descToggle.setAttribute('aria-expanded', 'false');
    descToggle.setAttribute('aria-label', {
      zh: '摘要',
      ja: '概要',
      en: 'Summary'
    }[(document.documentElement.getAttribute('lang') || 'zh').slice(0, 2)] || 'Summary');
    descToggle.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"' +
      ' width="14" height="14" fill="none" stroke="currentColor"' +
      ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' +
      ' aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
    descToggle.addEventListener('click', function () {
      var open = header.classList.toggle('desc-open');
      descToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    desc.appendChild(descToggle);
  }
})();
