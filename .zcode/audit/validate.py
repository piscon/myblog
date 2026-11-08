import re, sys
from html.parser import HTMLParser

path = r'原型/二重奏-博客界面设计-交互版.html'
src = open(path, encoding='utf-8').read()

VOID = {'area','base','br','col','embed','hr','img','input','link','meta','source','track','wbr','path','circle','line','polyline','rect','g','use','stop'}

class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.errors = []
        self.in_script = False
    def handle_starttag(self, tag, attrs):
        if tag in VOID:
            return
        self.stack.append(tag)
    def handle_startendtag(self, tag, attrs):
        pass
    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack:
            self.errors.append('extra </%s>' % tag)
            return
        if self.stack[-1] == tag:
            self.stack.pop()
        else:
            # tolerate svg inner tags closing out of order
            if tag in self.stack:
                while self.stack and self.stack[-1] != tag:
                    self.errors.append('unclosed <%s> before </%s>' % (self.stack[-1], tag))
                    self.stack.pop()
                if self.stack:
                    self.stack.pop()
            else:
                self.errors.append('stray </%s>' % tag)

p = P()
p.feed(src)
print('unclosed at EOF:', p.stack[:10])
print('errors:', len(p.errors), p.errors[:8])
print('script open/close:', src.count('<script'), src.count('</script>'))
print('style open/close:', src.count('<style'), src.count('</style>'))
print('views:', len(re.findall(r'class="view"', src)))
print('chars:', len(src))
