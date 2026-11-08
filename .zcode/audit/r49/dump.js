(() => {
  const qa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const q = (s, r = document) => r.querySelector(s);
  const T = (el, n = 90) => el ? (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, n) : null;
  const B = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; };
  const ident = (el) => el ? el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '') : null;
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };

  const out = { url: location.href, title: document.title, lang: document.documentElement.lang, theme: document.documentElement.dataset.theme || null, vw: innerWidth };

  // ---------- header ----------
  const header = q('.header');
  out.header = {};
  if (header) {
    out.header.height = Math.round(header.getBoundingClientRect().height);
    out.header.tree = qa('.header .nav, .header .nav > *, .header .nav-actions > *, .logo-switches > *').slice(0, 40).map(el => ({ el: ident(el), box: B(el), text: T(el, 40) }));
    out.header.controls = qa('.header a, .header button').filter(vis).map((el, i) => {
      const r = el.getBoundingClientRect();
      return {
        i, el: ident(el),
        text: T(el, 10), aria: el.getAttribute('aria-label'), title: el.getAttribute('title'),
        href: el.getAttribute('href'), accesskey: el.getAttribute('accesskey'),
        x: Math.round(r.x), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height)
      };
    });
  }

  // ---------- main outline ----------
  const main = q('.main') || q('main');
  out.mainClass = main ? main.className : null;
  out.mainChildren = main ? Array.from(main.children).map(el => ({ el: ident(el), box: B(el), text: T(el, 70) })) : [];

  // ---------- list cards ----------
  const entries = qa('.post-entry');
  out.cards = { count: entries.length };
  if (entries.length) {
    out.cards.gapPx = entries.length > 1 ? Math.round(entries[1].getBoundingClientRect().top - entries[0].getBoundingClientRect().bottom) : null;
    out.cards.items = entries.slice(0, 3).map(en => {
      const fig = q('figure', en), img = q('img', en), t = q('.entry-title', en), c = q('.entry-content', en), f = q('.entry-footer', en);
      const isr = img ? getComputedStyle(img) : null;
      return {
        cls: en.className,
        order: (en.getAttribute('style') || ''),
        figBox: B(fig), imgNatural: img ? [img.naturalWidth, img.naturalHeight] : null,
        figAspect: fig ? getComputedStyle(fig).aspectRatio : null,
        imgRadius: isr ? isr.borderRadius : null, imgFit: isr ? isr.objectFit : null,
        title: T(t, 60), titleSize: t ? getComputedStyle(t).fontSize : null, titleWeight: t ? getComputedStyle(t).fontWeight : null,
        titleLH: t ? getComputedStyle(t).lineHeight : null, titleH: t ? Math.round(t.getBoundingClientRect().height) : null,
        sum: T(c, 70), sumSize: c ? getComputedStyle(c).fontSize : null,
        sumClamp: c ? getComputedStyle(c).webkitLineClamp : null, sumH: c ? Math.round(c.getBoundingClientRect().height) : null,
        meta: f ? Array.from(f.children).map(x => ({ el: ident(x), text: T(x, 40) })) : []
      };
    });
    const first = entries[0];
    out.cards.titleToSum = (() => { const t = q('.entry-title', first), c = q('.entry-content', first); return t && c ? Math.round(c.getBoundingClientRect().top - t.getBoundingClientRect().bottom) : null; })();
    out.cards.figToTitle = (() => { const t = q('.entry-title', first), fig = q('figure', first); return t && fig ? Math.round(t.getBoundingClientRect().top - fig.getBoundingClientRect().bottom) : null; })();
    out.cards.cardWidth = Math.round(first.getBoundingClientRect().width);
  }

  // ---------- pagination ----------
  const pag = q('.pagination');
  out.pagination = pag ? { box: B(pag), html: pag.innerHTML.replace(/\s+/g, ' ').slice(0, 500), items: qa('a, span', pag).map(a => ({ t: T(a, 12), href: a.getAttribute('href'), cls: a.className })) } : null;

  // ---------- article page ----------
  const single = q('.post-single');
  out.single = null;
  if (single) {
    const kids = Array.from(single.children);
    out.single.children = kids.map((el, i) => ({
      i, el: ident(el), box: B(el), order: getComputedStyle(el).order,
      top: Math.round(el.getBoundingClientRect().top + scrollY), text: T(el, 60)
    }));
    const toc = q('.toc');
    out.single.toc = toc ? {
      box: B(toc), pos: getComputedStyle(toc).position, open: toc.hasAttribute('open'),
      entries: qa('a', toc).length, text: T(toc, 120)
    } : null;
    const meta = q('.post-meta');
    out.single.meta = meta ? Array.from(meta.querySelectorAll(':scope > *')).map(x => ({ el: ident(x), text: T(x, 30), svg: !!q('svg', x), link: !!q('a', x) })) : null;
    const cov = q('.entry-cover');
    out.single.cover = cov ? { box: B(cov), aspect: getComputedStyle(cov).aspectRatio, img: q('img', cov) ? [q('img', cov).naturalWidth, q('img', cov).naturalHeight, q('img', cov).getAttribute('sizes')] : null, caption: T(q('figcaption', cov), 40) } : null;
    out.single.desc = q('.post-description') ? { text: T(q('.post-description'), 120), box: B(q('.post-description')) } : null;
    out.single.tags = qa('.post-tags a').map(a => T(a, 20));
    out.single.share = q('.share-buttons') ? { box: B(q('.share-buttons')), links: qa('.share-buttons a', single).filter(vis).map(a => ({ href: a.getAttribute('href'), aria: a.getAttribute('aria-label') })) } : null;
    out.single.paginav = q('.paginav') ? { text: T(q('.paginav'), 120), items: qa('.paginav a', single).map(a => ({ href: a.getAttribute('href'), text: T(a, 40) })) } : null;
    out.single.giscus = { iframe: !!q('iframe.giscus-frame'), script: q('script[src*="giscus"]') ? q('script[src*="giscus"]').getAttribute('src') : null, section: !!q('#giscus-container, .giscus, script[src*="giscus"]') };
    out.single.related = qa('.post-single h2, .post-single h3').filter(h => /相关|関連|Related/i.test(h.innerText)).map(h => T(h, 40));
    out.single.contentBlocks = qa('.post-content > *').slice(0, 25).map(el => ident(el));
    out.single.h2 = qa('.post-content h2').map(h => T(h, 30));
  }

  // ---------- archive ----------
  const arch = qa('.archive-entry');
  out.archive = arch.length ? { count: arch.length, sample: arch.slice(0, 2).map(a => ({ el: ident(a), text: T(a, 80), meta: qa('[class*=meta]', a).map(m => ({ el: ident(m), text: T(m, 40) })) })), months: qa('.archive-month, .archive-year, h2').slice(0, 6).map(h => T(h, 30)) } : null;

  // ---------- search page ----------
  const si = q('#searchInput');
  out.search = si ? {
    input: { box: B(si), font: getComputedStyle(si).fontSize, radius: getComputedStyle(si).borderRadius, bg: getComputedStyle(si).backgroundColor, placeholder: si.placeholder },
    results: q('#searchResults') ? { box: B(q('#searchResults')), children: q('#searchResults').children.length, disp: getComputedStyle(q('#searchResults')).display } : null,
    headings: qa('.main h1, .main h2').map(h => ({ el: ident(h), text: T(h, 30), size: getComputedStyle(h).fontSize })),
    termLists: qa('.terms-tags').map(ul => ({ count: ul.children.length, sample: Array.from(ul.children).slice(0, 3).map(li => T(li, 30)), box: B(ul) })),
    termStyle: q('.terms-tags a') ? { box: B(q('.terms-tags a')), font: getComputedStyle(q('.terms-tags a')).fontSize, radius: getComputedStyle(q('.terms-tags a')).borderRadius, border: getComputedStyle(q('.terms-tags a')).border, pad: getComputedStyle(q('.terms-tags a')).padding } : null
  } : null;

  // ---------- taxonomy term page ----------
  out.term = q('.page-header') && qa('.post-entry').length ? { header: T(q('.page-header'), 60), h1: q('.page-header h1') ? { text: T(q('.page-header h1'), 40), size: getComputedStyle(q('.page-header h1')).fontSize } : null } : null;

  // ---------- footer ----------
  const foot = q('.footer');
  out.footer = foot ? { box: B(foot), children: Array.from(foot.children).map(el => ({ el: ident(el), text: T(el, 200), links: qa('a', el).map(a => ({ t: T(a, 20), href: a.getAttribute('href') })) })), text: T(foot, 300) } : null;

  // ---------- language links ----------
  out.lang = {
    head: qa('link[rel="alternate"][hreflang]').map(l => ({ hreflang: l.getAttribute('hreflang'), href: l.getAttribute('href') })),
    switcher: qa('.logo-switches a, .lang-menu a, .lang-menu .current-lang, .lang-toggle').filter(vis).map(a => ({ el: ident(a), t: T(a, 12), href: a.getAttribute('href'), aria: a.getAttribute('aria-label'), cur: a.classList.contains('current-lang') })),
    all: qa('.lang-menu a, .lang-menu li').slice(0, 8).map(a => ({ el: ident(a), t: T(a, 14), href: a.getAttribute('href') }))
  };

  out.homeProfile = q('.profile') ? { img: q('.profile img') ? [q('.profile img').naturalWidth, q('.profile img').naturalHeight] : null, title: T(q('.profile h1'), 40), buttons: qa('.profile .buttons a').map(a => ({ t: T(a, 14), href: a.getAttribute('href') })), social: qa('.profile .social-icons a').map(a => a.getAttribute('href')) } : null;
  out.firstH1 = q('h1') ? { text: T(q('h1'), 50), size: getComputedStyle(q('h1')).fontSize, weight: getComputedStyle(q('h1')).fontWeight } : null;

  return out;
})()
