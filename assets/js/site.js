/* Site-layer enhancements, loaded fingerprinted from extend_head.
   Seventeen self-gating features — each activates only when its DOM exists
   (15 was reserved for a back-to-top button; the theme's #top-link
   already ships one and chrome.css reshapes it to the prototype form
   instead — no JS needed):
   1. Reading progress bar — only on article pages (article.post-single)
   2. Lightbox — clicks on images inside .post-content; touch panning is
      blocked on the overlay (iOS ignores root overflow:hidden)
   3. TOC scrollspy — highlights the .toc entry of the heading in view
   4. Ctrl/Cmd+K — focus the search input on the search page, otherwise
      jump to the current language's search page (the injected header
      icon's link is the language-correct source of truth)
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
   8. Right action cluster + mobile hamburger — a .nav-actions wrapper
      appended last in .header-nav becomes the row's flush-right edge
      (flex space-between) and receives the moved #menu first, then the
      search icon (feature 11 slots it before the toggle) and the
      hamburger itself: ☰ keeps the absolute right edge on phones,
      search hugs it as the high-frequency neighbor, menu items join
      the cluster on desktop. ui.css (≤768px) collapses #menu via the
      html.js gate (set by extend_head's first-paint inline script — a
      :has(>.menu-toggle) hide only matched after this script ran,
      flashing the theme's wrapped menu on every page transition; the
      hide rule covers BOTH DOM states, pre-wrap and wrapped) and
      .menu-open opens the panel. Outside clicks and Escape close it.
      No JS → no wrapper, the theme's inline wrapped menu stays.
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
   11. Header search icon — search left the nav menu (hugo.toml) and
      lives on as a standalone icon in feature 8's right cluster,
      between #menu and the hamburger (the OS header pattern: search is
      the rightmost high-frequency entry, ☰ the absolute edge; the
      low-frequency theme/lang toggles stay by the logo on the left).
      The language-correct URL comes from the head link[rel=search]
      that extend_head emits. accesskey=/ keeps the theme's Alt+/
      contract that used to ride on the menu item. No JS → no icon
      (homepage profile button and direct URL still reach the search
      page).
   12. Logo identity per breakpoint — desktop keeps the brand text,
      phones swap it for a Feather home glyph (one 20px icon family
      across the header). The text is wrapped into a span so CSS can
      switch text↔icon at the breakpoint; the .logo-home class only
      exists after this script ran, doubling as the no-JS gate. The
      anchor keeps its title tooltip and accesskey=h. No JS → the
      theme's text logo stays at every width.
   13. Search page, no autofocus — the theme's fastsearch enables+
      focus()es the input on window load (soft keyboard on phones,
      categories pushed below the fold); the shadowed .focus swallows
      exactly that first call, later ones (Escape reset, clicks) stay
      native, and the Ctrl+K shortcut uses the saved focusNative.
   14. Search page ?q= prefill — OpenSearch lands on the search page
      with the query in the URL; fastsearch reads neither the URL nor a
      disabled input, so the value is set up front and input events are
      re-dispatched on a short poll until results render (its
      performSearch drops events while the index fetches).
   Theme DOM coupling: PaperMod's .post-single / .post-content / .toc /
   #menu / .header-nav / .logo / .logo-switches / #theme-toggle /
   #searchInput / .searchResults / .lang-menu / .nav-sep /
   .share-buttons / .post-footer / .post-related /
   .post-header .post-description; regression-guarded by feature-check
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
      /* iOS ignores overflow:hidden on the root for touch panning — one
         finger on the overlay would scroll the page behind it. Block the
         default pan on the overlay itself (non-passive); the listener dies
         with the node on close, and pinch-zoom is a separate gesture that
         still reaches the browser. */
      overlay.addEventListener('touchmove', function (ev) {
        ev.preventDefault();
      }, { passive: false });
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
        /* focusNative: feature 13 shadows .focus to swallow the theme's
           init autofocus — the shortcut must bypass that shadow */
        (input.focusNative || input.focus).call(input);
        input.select();
        return;
      }
      var link = document.querySelector('.search-toggle') ||
                 document.querySelector('a[href*="/search/"]');
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
      /* gold check = the "you are here" mark on both surfaces (desktop
         inline suffix / phone panel row right edge) — weight alone was
         indistinguishable from the 500 links */
      label.insertAdjacentHTML('beforeend',
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"' +
        ' width="14" height="14" fill="none" stroke="currentColor"' +
        ' stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"' +
        ' aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>');
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

  /* 8. Right action cluster + mobile hamburger: .nav-actions goes last
     in the space-between .header-nav row (flush-right edge) and takes,
     in order, the moved #menu (desktop: 文章 归档), the search icon
     (feature 11 inserts it before the toggle) and the hamburger — ☰
     keeps the absolute right edge on phones, search hugs it, menu
     items ride the same cluster on desktop. ui.css (≤768px) does the
     collapsing via the html.js gate (set by extend_head's first-paint
     inline script — a :has(>.menu-toggle) hide only matched after this
     script ran, flashing the theme's wrapped menu on every page
     transition; the hide rule covers both DOM states, pre-wrap and
     wrapped) and the .menu-open panel. Outside clicks and Escape close
     it; navigating away resets it naturally. aria-label follows the
     page language. */
  var nav = document.querySelector('.header-nav');
  var menuList = document.getElementById('menu');
  if (nav && menuList) {
    var actions = document.createElement('div');
    actions.className = 'nav-actions';
    actions.appendChild(menuList);
    nav.appendChild(actions);
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
    actions.appendChild(toggle);
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

  /* 11. Header search icon: search left the nav menu and lives on as a
     standalone icon inside feature 8's .nav-actions cluster, slotted
     between #menu and the hamburger — the OS header pattern (search is
     the rightmost high-frequency entry, ☰ the absolute edge; the
     low-frequency theme/lang toggles stay by the logo on the left).
     The link[rel=search] from extend_head is the language-correct
     permalink; no link → no icon (self-gating, same as every feature
     above). accesskey=/ preserves the Alt+/ shortcut the theme used to
     attach to the menu item, and the tooltip carries the same hint.
     ui.css sizes it like every header icon (20px Feather glyph, 12px
     padding = a 44px tap target). The :not([type]) skips the OpenSearch
     link — extend_head emits a second link[rel=search] carrying the
     OpenSearch MIME type, and this icon wants the plain permalink. */
  var searchLink = document.querySelector('link[rel="search"]:not([type])');
  var navActions = document.querySelector('.nav-actions');
  if (searchLink && navActions) {
    var searchToggle = document.createElement('a');
    searchToggle.className = 'search-toggle';
    searchToggle.href = searchLink.href;
    searchToggle.setAttribute('accesskey', '/');
    var searchLabel = {
      zh: '搜索',
      ja: '検索',
      en: 'Search'
    }[(document.documentElement.getAttribute('lang') || 'zh').slice(0, 2)] || 'Search';
    searchToggle.title = searchLabel + ' (Alt + /)';
    searchToggle.setAttribute('aria-label', searchLabel);
    searchToggle.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"' +
      ' width="20" height="20" fill="none" stroke="currentColor"' +
      ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' +
      ' aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21"' +
      ' y1="21" x2="16.65" y2="16.65"/></svg>';
    navActions.insertBefore(searchToggle, navActions.querySelector('.menu-toggle'));
  }

  /* 12. Logo identity per breakpoint: desktop keeps the brand text,
     phones swap it for a Feather home glyph (every header icon then
     shares one 20px form — ui.css unifies the sizes; the theme's 17px
     moon/sun attributes included). The text is wrapped into a span so
     CSS can switch text↔icon at the breakpoint (a bare text node
     can't be styled); the .logo-home class only exists after this
     script ran, doubling as the no-JS gate. The anchor keeps its title
     tooltip and accesskey=h; the title text becomes the accessible
     name on phones, where the text is hidden. No JS → the theme's
     text logo stays at every width. */
  var logoLink = document.querySelector('.logo > a');
  if (logoLink) {
    logoLink.classList.add('logo-home');
    if (!logoLink.getAttribute('aria-label')) {
      logoLink.setAttribute('aria-label', logoLink.title);
    }
    var logoText = document.createElement('span');
    logoText.className = 'logo-text';
    while (logoLink.firstChild) logoText.appendChild(logoLink.firstChild);
    logoLink.appendChild(logoText);
    logoText.insertAdjacentHTML('beforebegin',
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"' +
      ' width="20" height="20" fill="none" stroke="currentColor"' +
      ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' +
      ' aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2' +
      ' 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>');
  }

  /* 13. Search page, no autofocus: visitors mostly land on /search/ for
     the taxonomy hub, but the theme's fastsearch enables + focus()es
     the input on window load — popping the soft keyboard on phones and
     shoving the categories below the fold. fastsearch is a theme asset
     (untouchable), and its init focus can only be told apart from user
     flows by ORDER: it is always the FIRST .focus() call on the input
     (the input is disabled — unclickable — until load; reset()'s
     Escape-refocus and clicks can only come later), so the shadowed
     method swallows exactly one call and forwards the rest to the
     saved native. The Ctrl+K shortcut (feature 4) goes through
     focusNative and never consumes the init slot; click, Tab and the
     Alt+/ accesskey focus natively, bypassing the shadow entirely. */
  var searchInput = document.getElementById('searchInput');
  if (searchInput) {
    var nativeFocus = searchInput.focus.bind(searchInput);
    var initFocusPending = true;
    searchInput.focus = function () {
      if (initFocusPending) {
        initFocusPending = false;
        return;
      }
      nativeFocus();
    };
    searchInput.focusNative = nativeFocus;
  }

  /* 14. Search page ?q= prefill: OpenSearch (and any ?q= link) lands on
     the search page with the query in the URL, but fastsearch reads
     neither the URL nor a disabled input. Set the value up front (it
     persists on the disabled element) and re-dispatch input events on a
     short poll until the results actually render — performSearch drops
     every event while the Fuse index is still fetching, so the first
     dispatches are lost by design and the poll retries through that
     window (max 5s, stopped as soon as a result row exists). */
  var searchInputQ = document.getElementById('searchInput');
  var queryParam = new URLSearchParams(location.search).get('q');
  if (searchInputQ && queryParam) {
    searchInputQ.value = queryParam;
    var qTries = 0;
    var qPoll = setInterval(function () {
      qTries += 1;
      searchInputQ.dispatchEvent(new Event('input', { bubbles: true }));
      if (document.querySelector('#searchResults li') || qTries > 20) {
        clearInterval(qPoll);
      }
    }, 250);
  }
})();

  /* 16. Search page companion — the .search-meta count tracks typing
     live (found-N while querying, corpus total when idle), and a
     no-match query renders the prototype's empty state: serif title
     quoting the query, a hint line, and underline suggestion chips
     that refill the input and re-dispatch the fastsearch input event.
     Gated on #searchInput; no search page, no-op. */
  (function () {
    var input = document.getElementById('searchInput');
    var box = document.getElementById('searchbox');
    if (!input || !box) return;
    var countEl = document.getElementById('search-count');
    var results = document.getElementById('searchResults');
    var lang = (document.documentElement.getAttribute('lang') || 'zh').slice(0, 2);
    var m = ((countEl && countEl.textContent) || '').match(/\d+/);
    var total = m ? parseInt(m[0], 10) : 0;
    var found = {
      zh: function (n) { return '找到 ' + n + ' 篇'; },
      ja: function (n) { return n + ' 件見つかりました'; },
      en: function (n) { return n + ' found'; }
    };
    var idle = {
      zh: function (n) { return '共 ' + n + ' 篇'; },
      ja: function (n) { return '全 ' + n + ' 件'; },
      en: function (n) { return n + ' entries'; }
    };
    var fmtFound = found[lang] || found.en;
    var fmtIdle = idle[lang] || idle.en;
    var titled = {
      zh: function (q) { return '没有找到「' + q + '」'; },
      ja: function (q) { return '「' + q + '」は見つかりません'; },
      en: function (q) { return 'No results for \u201C' + q + '\u201D'; }
    };
    var hints = {
      zh: ['琴声', '散步', 'Hugo', 'AI'],
      ja: ['ピアノ', 'Hugo', 'AI'],
      en: ['piano', 'Hugo', 'AI']
    };
    var hintText = {
      zh: '换一个短一点的词，或者从这些开始。',
      ja: 'もっと短い語に変えるか、ここから始めてみてください。',
      en: 'Try a shorter term, or start from these.'
    };
    var tip = titled[lang] || titled.en;
    var hint = hintText[lang] || hintText.en;
    var panel = null;

    function clearPanel() {
      if (panel) { panel.remove(); panel = null; }
    }

    function sync() {
      var q = input.value.trim();
      var hits = results.querySelectorAll('li').length;
      if (countEl) countEl.textContent = q ? fmtFound(hits) : fmtIdle(total);
      clearPanel();
      if (q && hits === 0) {
        panel = document.createElement('div');
        panel.className = 'empty-state';
        var h = document.createElement('h2');
        h.textContent = tip(q);
        var p = document.createElement('p');
        p.textContent = hint;
        var links = document.createElement('div');
        links.className = 'hint-links';
        (hints[lang] || hints.en).forEach(function (word) {
          var b = document.createElement('button');
          b.type = 'button';
          b.textContent = word;
          b.addEventListener('click', function () {
            input.value = word;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.focus();
          });
          links.appendChild(b);
        });
        panel.appendChild(h);
        panel.appendChild(p);
        panel.appendChild(links);
        box.appendChild(panel);
      }
    }

    input.addEventListener('input', sync);
  })();

  /* 17. Identity pages — the prototype's about/guestbook heads. /about/
     gets the side rail (avatar, name, role, GitHub/Email/X links — same
     accounts as hugo.toml socialIcons) injected before .post-header;
     ui.css grids .post-single via :has() (224px rail + content column,
     ≤768px stacks back to one column). No JS → the theme's single-column
     article stays. /guestbook/ gets a kicker + "giscus" count row as a
     SIBLING above .post-header (inside the header is the summary-fold
     grid with explicit rows — a sibling can't disturb it). Both pages
     are CMS content served by the theme's single.html; injecting here
     keeps that template un-overridden. */
  (function () {
    var single = document.querySelector('.post-single');
    var header = single && single.querySelector('.post-header');
    if (!single || !header) return;
    var lang = (document.documentElement.getAttribute('lang') || 'zh').slice(0, 2);
    var path = location.pathname;

    if (/\/about\/?$/.test(path)) {
      if (single.querySelector('.about-side')) return;
      var role = {
        zh: '三语博客 · 日常与技术',
        ja: '三言語ブログ · 日常と技術',
        en: 'Trilingual blog · essays & tech'
      }[lang] || 'Trilingual blog · essays & tech';
      var links = [
        { href: 'https://github.com/piscon', label: 'GitHub', icon: '<path d="M9 19c-4 1.5-4-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6 0C7.7 2.8 6.7 3.1 6.7 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 5.3 9.5c0 4.6 2.7 5.7 5.5 6-.5.6-.5 1.2-.5 2V21"></path>' },
        { href: 'mailto:hello@deux.top', label: 'hello@deux.top', icon: '<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path>' },
        { href: 'https://x.com/deux_top', label: '@deux_top', icon: '<path d="M4 4l16 16M20 4L4 20"></path>' }
      ];
      var aside = document.createElement('aside');
      aside.className = 'about-side';
      var img = document.createElement('img');
      img.src = '/images/about-avatar.jpg';
      img.alt = '二重奏';
      img.width = 104;
      img.height = 104;
      var name = document.createElement('p');
      name.className = 'about-name';
      name.textContent = '二重奏';
      var roleEl = document.createElement('p');
      roleEl.className = 'about-role';
      roleEl.textContent = role;
      var nav = document.createElement('nav');
      nav.className = 'about-links';
      nav.setAttribute('aria-label', 'social');
      links.forEach(function (l) {
        var a = document.createElement('a');
        a.href = l.href;
        if (l.href.indexOf('https:') === 0) {
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        }
        a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + l.icon + '</svg>';
        a.appendChild(document.createTextNode(' ' + l.label));
        nav.appendChild(a);
      });
      aside.appendChild(img);
      aside.appendChild(name);
      aside.appendChild(roleEl);
      aside.appendChild(nav);
      single.insertBefore(aside, header);
      return;
    }

    if (/\/guestbook\/?$/.test(path)) {
      if (single.querySelector('.gb-head')) return;
      var head = document.createElement('div');
      head.className = 'gb-head';
      var kick = document.createElement('p');
      kick.className = 'kicker';
      kick.textContent = {
        zh: 'Guestbook · 留言',
        ja: 'Guestbook · ゲストブック',
        en: 'Guestbook · Notes'
      }[lang] || 'Guestbook · Notes';
      var count = document.createElement('span');
      count.className = 'page-count';
      count.textContent = 'giscus';
      head.appendChild(kick);
      head.appendChild(count);
      single.insertBefore(head, header);
    }
  })();
