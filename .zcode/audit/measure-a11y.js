(() => {
  const out = {};
  const ids = {};
  document.querySelectorAll('[id]').forEach(el => { ids[el.id] = (ids[el.id] || 0) + 1; });
  out.duplicateIds = Object.keys(ids).filter(k => ids[k] > 1);

  out.imgNoAlt = [...document.images].filter(i => !i.hasAttribute('alt')).map(i => i.getAttribute('src'));
  out.imgEmptyAlt = [...document.images].filter(i => i.getAttribute('alt') === '').map(i => i.getAttribute('src'));
  out.imgNoDims = [...document.images].filter(i => !i.getAttribute('width') || !i.getAttribute('height')).map(i => i.getAttribute('src'));
  out.imgNoLazy = [...document.images].filter(i => !i.hasAttribute('loading') && !i.closest('.hero')).length;

  const name = (el) => (el.innerText || '').trim() || el.getAttribute('aria-label') || el.getAttribute('title') || '';
  out.emptyLinks = [...document.querySelectorAll('a[href]')].filter(a => !name(a)).map(a => a.getAttribute('href'));

  out.brokenAriaControls = [...document.querySelectorAll('[aria-controls]')].map(el => el.getAttribute('aria-controls')).filter(id => !document.getElementById(id));
  out.brokenAriaLabelledby = [...document.querySelectorAll('[aria-labelledby]')].map(el => el.getAttribute('aria-labelledby')).filter(id => !document.getElementById(id));

  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => +h.tagName[1]);
  const jumps = [];
  for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i - 1] > 1) jumps.push('h' + hs[i - 1] + '->h' + hs[i]);
  out.headingJumps = jumps;
  out.h1Count = hs.filter(x => x === 1).length;

  out.landmarks = ['header', 'nav', 'main', 'footer'].map(t => ({ tag: t, n: document.querySelectorAll(t).length }));
  out.mainFocusable = document.querySelector('main')?.getAttribute('tabindex');

  // contrast
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map(s => parseFloat(s.trim()));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const ratio = (a, b) => { const L1 = lum(a), L2 = lum(b); return +(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2)); };
  const bg = parse(getComputedStyle(document.body).backgroundColor);
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const fg = over(parse(cs.color), bg);
    return { sel, color: cs.color, size: cs.fontSize, weight: cs.fontWeight, ratio: ratio(fg, bg) };
  };
  out.contrast = ['.hero-deck', '.hero-byline', '.figcap', '.brand-en', '.masthead-line', '.nav a', '.mono', '.eyebrow', '.read-link']
    .map(pick).filter(Boolean);

  out.htmlLang = document.documentElement.lang;
  out.langAttrs = [...document.querySelectorAll('[hreflang]')].map(a => a.getAttribute('hreflang')).slice(0, 6);
  out.ariaCurrent = [...document.querySelectorAll('[aria-current]')].map(a => a.getAttribute('aria-current') + ':' + a.textContent.trim().slice(0, 10));

  out.overflowX = document.documentElement.scrollWidth - innerWidth;
  out.tables = [...document.querySelectorAll('table')].map(t => ({ w: Math.round(t.getBoundingClientRect().width), sw: t.scrollWidth, cw: t.clientWidth }));
  out.codeBlocks = [...document.querySelectorAll('pre')].map(p => ({ w: Math.round(p.getBoundingClientRect().width), sw: p.scrollWidth, cw: p.clientWidth, fs: getComputedStyle(p).fontSize }));
  out.textLengths = [...document.querySelectorAll('.article-body p, .hero-deck, .recent-item p')].slice(0, 6).map(p => {
    const r = p.getBoundingClientRect();
    return { w: Math.round(r.width), fs: getComputedStyle(p).fontSize, chars: p.textContent.trim().length };
  });
  return out;
})()
