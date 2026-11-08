import io

adds = {
    'i18n/zh-CN.toml': [
        '# 编辑部式首页（2026-11-08 Phase 2，layouts/index.html 覆盖）三语文案',
        'homeRead = "读这篇"',
        'homeRecent = "近作"',
        'homeAllPosts = "全部文章"',
        'homeIndex = "目录"',
        'homeByYear = "按年份浏览"',
    ],
    'i18n/ja.toml': [
        '# editorial home (Phase 2, 2026-11-08)',
        'homeRead = "この一篇を読む"',
        'homeRecent = "近作"',
        'homeAllPosts = "すべての記事"',
        'homeIndex = "目次"',
        'homeByYear = "年ごとに見る"',
    ],
    'i18n/en.toml': [
        '# editorial home (Phase 2, 2026-11-08)',
        'homeRead = "Read this one"',
        'homeRecent = "Recent"',
        'homeAllPosts = "All posts"',
        'homeIndex = "Index"',
        'homeByYear = "Browse by year"',
    ],
}
for path, lines in adds.items():
    s = io.open(path, encoding='utf-8', newline='').read()
    if 'homeRead' in s:
        print(path, 'already'); continue
    if not s.endswith('\n'):
        s += '\n'
    s += '\n'.join(lines) + '\n'
    io.open(path, 'w', encoding='utf-8', newline='').write(s)
    print(path, 'ok')
