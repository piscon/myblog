# -*- coding: utf-8 -*-
"""Apply the whitespace fix list to the prototype's inline stylesheet.
Every replacement is asserted to occur exactly once; nothing is written unless all pass.
"""
import io, sys

PATH = '原型/二重奏-博客界面设计-交互版.html'
html = io.open(PATH, encoding='utf-8').read()

pairs = [
    # ---- tokens -------------------------------------------------------
    ("""  --measure: 680px;
}""",
     """  --measure: 680px;
  /* Spacing scale — 4px grid. New rules take a token, never a bare number.
     See 原型/留白审计-报告.html for the measurement behind each step. */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-5: 28px;
  --sp-6: 40px;
  --sp-7: 48px;
  --sp-8: 64px;
  --sp-9: 96px;
  --sp-section: 96px;   /* between chapters */
  --sp-head: 64px;      /* page head top */
  --sp-tail: 96px;      /* last block → footer rule */
}"""),

    # ---- P1-4 chapter spacing ----------------------------------------
    ("""  gap: 32px;
  padding: 74px 0 92px;""",
     """  gap: 32px;
  padding: 74px 0 var(--sp-section);"""),

    (".recent { padding: 26px 0 78px; }",
     ".recent { padding: 0 0 var(--sp-section); }"),

    (".ledger { padding: 0 0 96px; }",
     ".ledger { padding: 0 0 var(--sp-section); }"),

    # ---- P1-5 page head ----------------------------------------------
    (".page-head { padding: 64px 0 34px; }",
     ".page-head { padding: var(--sp-head) 0 0; }"),

    (".search-head { padding: 64px 0 0; }",
     ".search-head { padding: var(--sp-head) 0 0; }"),

    (".article-head { padding: 54px 0 0; max-width: var(--measure); margin: 0 auto; }",
     ".article-head { padding: var(--sp-head) 0 0; max-width: var(--measure); margin: 0 auto; }"),

    # ---- P1-6 filter band --------------------------------------------
    (""".filters {
  display: flex;
  align-items: center;
  gap: 26px;
  padding: 18px 0 0;
  border-top: 1px solid var(--rule);
  margin-top: 34px;
}""",
     """.filters {
  display: flex;
  align-items: center;
  gap: 26px;
  padding: var(--sp-4) 0;
  border-top: 1px solid var(--rule);
  margin-top: var(--sp-7);
}"""),

    (".search-results { margin-top: 30px; }",
     ".search-results { margin-top: var(--sp-6); }"),

    # ---- year groups: section step, tight first group under filters ---
    ("""  grid-template-columns: 156px 1fr;
  gap: 40px;
  padding-top: 58px;
}""",
     """  grid-template-columns: 156px 1fr;
  gap: 40px;
  padding-top: var(--sp-8);
}
/* The group directly under the filter band keeps the band tight (16 above /
   40 below the labels); later groups take the full section step. Desktop
   only — on phones the year label stacks and owns the gap itself. */
@media (min-width: 769px) {
  .filters + #list-groups > .year-group { padding-top: var(--sp-6); }
}"""),

    # ---- P2-8 symmetric row padding ----------------------------------
    ("""  gap: 4px 18px;
  padding: 19px 0 20px;""",
     """  gap: 4px 18px;
  padding: var(--sp-5) 0 var(--sp-5);"""),

    ("""  gap: 20px;
  padding: 16px 0 17px;""",
     """  gap: 20px;
  padding: var(--sp-4) 0;"""),

    ("""  gap: 22px;
  padding: 18px 0 19px;""",
     """  gap: 22px;
  padding: 18px 0;"""),

    ("""  grid-template-columns: 96px 1fr;
  gap: 22px;
  padding: 19px 0 20px;""",
     """  grid-template-columns: 96px 1fr;
  gap: 22px;
  padding: 19px 0;"""),

    ("  .ledger-row { grid-template-columns: 1fr; gap: 2px; padding: 14px 0 15px; }",
     "  .ledger-row { grid-template-columns: 1fr; gap: 2px; padding: 14px 0; }"),

    # ---- P0-3 body block rhythm --------------------------------------
    (".article-body > p { margin: 1.5em 0; }",
     ".article-body > p { margin: var(--sp-5) 0; }"),

    (".article-body ul, .article-body ol { margin: 1.4em 0; padding-left: 1.4em; }",
     ".article-body ul, .article-body ol { margin: var(--sp-5) 0; padding-left: 1.4em; }"),

    ("""  border-collapse: collapse;
  margin: 2em 0;""",
     """  border-collapse: collapse;
  margin: var(--sp-6) 0;"""),

    (""".article-body pre {
  margin: 2em 0;""",
     """.article-body pre {
  margin: var(--sp-6) 0;"""),

    (".article-body .highlight { margin: 2em 0; }",
     ".article-body .highlight { margin: var(--sp-6) 0; }"),

    (""".article-body blockquote {
  margin: 2.1em 0;""",
     """.article-body blockquote {
  margin: var(--sp-6) 0;"""),

    (".article-body figure { margin: 44px 0; }",
     ".article-body figure { margin: var(--sp-7) 0; }"),

    (".article-body .code-block { position: relative; margin: 2em 0; }",
     ".article-body .code-block { position: relative; margin: var(--sp-6) 0; }"),

    (".media-embed { margin: 44px 0; }",
     ".media-embed { margin: var(--sp-7) 0; }"),

    # ---- P2-7 audio figcaption gap -----------------------------------
    (".media-embed audio { width: 100%; margin-top: 2px; }",
     ".media-embed audio { display: block; width: 100%; margin-top: 0; }"),

    # ---- P0-2 page tail ----------------------------------------------
    (".comments { margin-top: 56px; }",
     ".comments { margin-top: 56px; padding-bottom: var(--sp-tail); }"),

    (".tag-hub { margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--rule); }",
     ".tag-hub { margin-top: 40px; padding-top: 20px; padding-bottom: var(--sp-tail); border-top: 1px solid var(--rule); }"),

    # ---- tails folded into the token --------------------------------
    (".list-foot { padding: 46px 0 96px;",
     ".list-foot { padding: var(--sp-7) 0 var(--sp-tail);"),

    (".about-grid {\n  display: grid;\n  grid-template-columns: 224px 1fr;\n  gap: 56px;\n  padding: 40px 0 96px;\n}",
     ".about-grid {\n  display: grid;\n  grid-template-columns: 224px 1fr;\n  gap: 56px;\n  padding: var(--sp-6) 0 var(--sp-tail);\n}"),

    (".term-index-cloud { display: flex; flex-wrap: wrap; gap: 6px 26px; padding: 44px 0 96px; }",
     ".term-index-cloud { display: flex; flex-wrap: wrap; gap: 6px 26px; padding: var(--sp-6) 0 var(--sp-tail); }"),

    (".notfound { padding: 88px 0 96px; }",
     ".notfound { padding: 88px 0 var(--sp-tail); }"),

    # ---- guestbook intro sits under a zero-bottom page head ----------
    (".guestbook-intro { max-width: var(--measure); padding: 8px 0 6px;",
     ".guestbook-intro { max-width: var(--measure); padding: var(--sp-6) 0 6px;"),

    # ---- mobile: breakpoint values ----------------------------------
    ("  :root { --gap: 24px; }",
     "  :root { --gap: 24px; --sp-section: 72px; --sp-head: 48px; --sp-tail: 72px; }"),

    ("  .page-head { padding-top: 46px; }",
     "  .page-head { padding-top: var(--sp-head); }"),

    ("  .search-head { padding-top: 46px; }",
     "  .search-head { padding-top: var(--sp-head); }"),

    ("  .article-head { padding-top: 40px; }",
     "  .article-head { padding-top: var(--sp-head); }"),

    ("  .hero { grid-template-columns: 1fr; gap: 30px; padding: 46px 0 64px; }",
     "  .hero { grid-template-columns: 1fr; gap: 30px; padding: var(--sp-head) 0 var(--sp-section); }"),

    ("  .year-group { grid-template-columns: 1fr; gap: 12px; padding-top: 44px; }",
     "  .year-group { grid-template-columns: 1fr; gap: 12px; padding-top: var(--sp-7); }"),
]

fails = []
for old, new in pairs:
    n = html.count(old)
    if n != 1:
        fails.append((n, old.splitlines()[0][:70]))
        continue
    html = html.replace(old, new, 1)

if fails:
    for n, s in fails:
        print('FAIL count=%d  %s' % (n, s))
    sys.exit(1)

io.open(PATH, 'w', encoding='utf-8', newline='').write(html)
print('patched %d rules, file size %d' % (len(pairs), len(html)))
