(() => {
  const R = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1),
      d: cs.display, v: cs.visibility, fs: cs.fontSize, fw: cs.fontWeight, lh: cs.lineHeight,
      txt: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40)
    };
  };
  const vis = (el) => {
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getBoundingClientRect().width > 0;
  };
  const sel = (el) => {
    if (el.id) return '#' + el.id;
    let s = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\s+/).join('.');
    return s;
  };

  const headKids = [...document.querySelectorAll('.brand, .nav, .head-actions > *')].map(el => ({ s: sel(el), ...R(el) }));

  // anything sticking out horizontally
  const bleed = [...document.querySelectorAll('body *')].filter(el => {
    if (!vis(el)) return false;
    const r = el.getBoundingClientRect();
    return r.right > innerWidth + 0.6 || r.left < -0.6;
  }).slice(0, 12).map(el => ({ s: sel(el), l: +el.getBoundingClientRect().left.toFixed(1), r: +el.getBoundingClientRect().right.toFixed(1) }));

  // clipped text (single-line ellipsis / overflow hidden without scroll)
  const clipped = [...document.querySelectorAll('body *')].filter(el => {
    if (!vis(el)) return false;
    const cs = getComputedStyle(el);
    if (cs.overflow === 'visible') return false;
    return el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0 && el.children.length === 0;
  }).slice(0, 10).map(el => ({ s: sel(el), sw: el.scrollWidth, cw: el.clientWidth, t: (el.textContent || '').trim().slice(0, 30) }));

  // interactive target sizes (visible, in flow)
  const targets = [...document.querySelectorAll('a[href], button, summary, input')].filter(vis).map(el => {
    const r = el.getBoundingClientRect();
    return { s: sel(el), w: +r.width.toFixed(1), h: +r.height.toFixed(1), t: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20) };
  });
  const smallTargets = targets.filter(t => t.h < 24 || t.w < 24);

  const headings = [...document.querySelectorAll('h1,h2,h3,h4')].filter(vis).map(h => ({ tag: h.tagName, fs: getComputedStyle(h).fontSize, t: h.textContent.trim().slice(0, 30) }));

  return {
    view: (location.hash || '#/'),
    vw: innerWidth, vh: innerHeight,
    scrollW: document.documentElement.scrollWidth,
    overflowX: +(document.documentElement.scrollWidth - innerWidth).toFixed(1),
    scrollH: document.documentElement.scrollHeight,
    header: R(document.querySelector('.site-head')),
    headKids,
    menuBtn: document.querySelector('.menu-btn') ? R(document.querySelector('.menu-btn')) : null,
    langWrap: document.querySelector('.lang-wrap') ? R(document.querySelector('.lang-wrap')) : null,
    mobileMenuHidden: document.getElementById('mobile-menu') ? document.getElementById('mobile-menu').hidden : null,
    bleed, clipped,
    smallTargets: smallTargets.slice(0, 12),
    targetCount: targets.length,
    headings,
    bodyFs: getComputedStyle(document.body).fontSize,
    measure: document.querySelector('.article-body') ? R(document.querySelector('.article-body')) : null
  };
})()
