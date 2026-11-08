(() => {
  const R = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1),
      d: cs.display, v: cs.visibility, op: cs.opacity, fs: cs.fontSize, fw: cs.fontWeight,
      txt: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 48)
    };
  };
  const one = (sel) => { const el = document.querySelector(sel); return el ? R(el) : null; };
  const many = (sel, n = 12) => [...document.querySelectorAll(sel)].slice(0, n).map(R);
  const header = document.querySelector('.header-nav');
  const hb = header ? R(header) : null;
  // header children in visual order (left->right by x)
  const kids = header ? [...header.querySelectorAll('.logo, .logo > a, #theme-toggle, .nav-sep, .lang-menu, .lang-toggle, .nav-actions, #menu, .search-toggle, .menu-toggle')].map(e => ({ cls: e.className || e.id, ...R(e) })) : [];
  kids.sort((a, b) => a.x - b.x || a.y - b.y);
  // gaps between adjacent visible icon-ish items
  const vis = kids.filter(k => k.d !== 'none' && k.w > 0);
  const gaps = [];
  for (let i = 1; i < vis.length; i++) gaps.push({ from: vis[i - 1].cls, to: vis[i].cls, gap: +(vis[i].x - vis[i - 1].right).toFixed(1) });
  // interactive targets under 44px
  const small = [...document.querySelectorAll('header a, header button, .post-entry a, .paginav a, .share-buttons a, .terms-tags a')]
    .map(R).filter(o => o.d !== 'none' && (o.w < 44 || o.h < 44)).slice(0, 20).map(o => ({ t: o.txt.slice(0, 18), w: o.w, h: o.h }));
  return {
    url: location.href,
    vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio,
    scrollW: document.documentElement.scrollWidth,
    bodyScrollW: document.body.scrollWidth,
    overflowX: document.documentElement.scrollWidth - innerWidth,
    header: hb, headerKids: kids, gaps, smallTargets: small,
    logoText: one('.logo > a')?.txt, homeSvg: one('.logo-home svg'),
    langToggle: one('.lang-toggle'), langMenu: one('.lang-menu'),
    title: document.title,
    emptyish: document.body.innerText.trim().slice(0, 200)
  };
})()
