import io

adds = {
    'i18n/zh-CN.toml': ['postsUnit = "篇"'],
    'i18n/ja.toml': ['postsUnit = "件"'],
    'i18n/en.toml': ['postsUnit = "entries"'],
}
for path, lines in adds.items():
    s = io.open(path, encoding='utf-8', newline='').read()
    if 'postsUnit' in s:
        print(path, 'already'); continue
    if not s.endswith('\n'):
        s += '\n'
    s += '\n'.join(lines) + '\n'
    io.open(path, 'w', encoding='utf-8', newline='').write(s)
    print(path, 'ok')
