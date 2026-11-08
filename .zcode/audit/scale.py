import re

path = r'原型/二重奏-博客界面设计-交互版.html'
src = open(path, encoding='utf-8').read()

m = re.search(r'<style>(.*?)</style>', src, re.S)
css = m.group(1)

# protect the logotype lockup: brand-cn is a mark, not body text
css = css.replace('.brand-cn {\n  font-family: var(--display);\n  font-size: 26px;',
                  '.brand-cn {\n  font-family: var(--display);\n  font-size: @@BRAND@@;')

MAP = {
    '8': '10', '9': '10', '10': '12', '11': '12', '11.5': '12', '12.5': '12',
    '13': '14', '14.5': '14', '17': '18', '17.5': '18', '19': '18', '20': '22',
    '21': '22', '23': '22', '24': '22', '25': '28', '26': '28', '29': '28',
    '31': '28', '34': '36', '38': '36', '40': '36', '46': '44', '48': '52',
    '50': '52', '58': '60',
}

hits = {}


def repl(mo):
    v = mo.group(1)
    if v in MAP:
        hits[v] = hits.get(v, 0) + 1
        return 'font-size: %spx' % MAP[v]
    return mo.group(0)


css = re.sub(r'font-size: (\d+(?:\.\d+)?)px', repl, css)

# body text: one size everywhere (CJK 18), including the two mobile overrides
css = css.replace('.article-body { margin-top: 46px; font-size: 18px; line-height: 1.88; }',
                  '.article-body { margin-top: 46px; font-size: 18px; line-height: 1.9; }')
css = css.replace('.article-body { font-size: 16.5px; }', '.article-body { font-size: 18px; }')

# display clamps onto the display ramp 28 / 36 / 44 / 52 / 60
css = css.replace('font-size: clamp(38px, 4.9vw, 58px);', 'font-size: clamp(36px, 4.9vw, 60px);')
css = css.replace('font-size: clamp(34px, 8vw, 44px);', 'font-size: clamp(36px, 8vw, 44px);')
css = css.replace('font-size: clamp(36px, 4.4vw, 48px);', 'font-size: clamp(36px, 4.4vw, 44px);')
css = css.replace('font-size: clamp(32px, 4.4vw, 50px);', 'font-size: clamp(28px, 4.4vw, 52px);')

css = css.replace('font-size: @@BRAND@@;', 'font-size: 26px;')

src = src[:m.start(1)] + css + src[m.end(1):]
open(path, 'w', encoding='utf-8').write(src)

print('replacements:', dict(sorted(hits.items(), key=lambda kv: float(kv[0]))))
print('remaining off-scale sizes:', sorted(set(re.findall(r'font-size: (\d+(?:\.\d+)?)px', css)), key=float))
print('clamps:', re.findall(r'font-size: clamp\([^)]*\)', css))
