#!/bin/bash
cd /home/piscon/codespace/myblog
export PATH="$HOME/.local/bin:$PATH"
hugo --gc --minify -d /tmp/blog-phase2-public >/dev/null 2>&1
python3 - <<'EOF'
h = open('/tmp/blog-phase2-public/zh/index.html', encoding='utf-8').read()
print('len', len(h))
print('has <head', '<head' in h)
print('has header', 'header' in h[:3000])
print(h[:600])
EOF
