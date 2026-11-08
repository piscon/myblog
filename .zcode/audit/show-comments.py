import json
d = json.load(open("/home/piscon/codespace/myblog/.zcode/audit/survey-list.json"))
for r in d:
    c = r.get("comments") or {}
    print(r["site"], "|", str(c.get("article", ""))[:60], "| giscus", c.get("giscus"), "| disqus", c.get("disqus"), "| utter", c.get("utterances"), "| other", c.get("other"), "|", str(c.get("err", ""))[:50])
