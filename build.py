#!/usr/bin/env python3
"""Tiny static build for b32n.io. No dependencies.

Pages live in src/pages/*.html, posts in src/posts/*.html.
Each source file starts with `key: value` lines, then a line `---`, then the HTML body.
Run `python3 build.py` and deploy ./public.
"""
import html, pathlib, re, datetime, hashlib

ROOT = pathlib.Path(__file__).parent
SRC, OUT = ROOT / "src", ROOT / "public"
SITE = "https://b32n.io"

def ver(name):
    return hashlib.sha1((OUT / "assets" / name).read_bytes()).hexdigest()[:8]

def parse(path):
    raw = path.read_text()
    head, body = raw.split("\n---\n", 1)
    meta = dict(line.split(": ", 1) for line in head.strip().splitlines())
    return meta, body

LOGO = """<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#2f5bff"/><stop offset=".6" stop-color="#12b5cb"/><stop offset="1" stop-color="#19c39a"/></linearGradient></defs>
<g fill="url(#lg)"><circle cx="6" cy="6" r="2.4"/><circle cx="6" cy="16" r="2.4"/><circle cx="6" cy="26" r="2.4"/><circle cx="16" cy="16" r="2.4"/><circle cx="16" cy="26" r="2.4"/><circle cx="26" cy="21" r="2.4"/><circle cx="26" cy="11" r="1.6" opacity=".45"/><circle cx="17" cy="6" r="1.2" opacity=".3"/></g></svg>"""

NAV = [("/#projects", "Projects", "projects"), ("/blog/", "Blog", "blog"), ("/#about", "About", "about")]

def layout(title, body, *, desc, path, section="", og_type="website"):
    nav = "".join(f'<a href="{h}"{" aria-current=page" if s == section else ""}>{l}</a>' for h, l, s in NAV)
    full_title = title if title.startswith("b32n") else f"{title} · b32n"
    year = datetime.date.today().year
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(full_title)}</title>
<meta name="description" content="{html.escape(desc)}">
<meta name="theme-color" content="#f7f8fb">
<link rel="canonical" href="{SITE}{path}">
<meta property="og:title" content="{html.escape(full_title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:type" content="{og_type}">
<meta property="og:url" content="{SITE}{path}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="b32n blog" href="/blog/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&family=Space+Grotesk:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css?v={ver('site.css')}">
</head>
<body>
<header class="nav"><div class="wrap">
  <a class="brand" href="/" aria-label="b32n home">{LOGO}<span>b32n</span></a>
  <nav aria-label="Main">{nav}</nav>
</div></header>
<main>
{body}
</main>
<footer><div class="wrap">
  <div>
    <a class="brand" href="/">{LOGO}<span>b32n</span></a>
    <p class="motto">Take back control of your data.</p>
    <p style="color:var(--ink-2);max-width:38ch;margin:0">Making open source approachable. Open tools built by Bharat Nadkarni.</p>
  </div>
  <div><h4>Projects</h4><ul>
    <li><a href="/projects/spindle/">Spindle</a></li>
    <li><a href="/projects/mindmaps/">Mindmaps</a></li>
    <li><a href="https://bit.b32n.io">Bit · CS essentials</a></li>
  </ul></div>
  <div><h4>Elsewhere</h4><ul>
    <li><a href="/blog/">Blog</a></li>
    <li><a href="/blog/feed.xml">RSS</a></li>
    <li><a href="https://github.com/b32n">GitHub</a></li>
  </ul></div>
  <div class="fine"><span>© {year} Bharat Nadkarni · b32n</span><span>Built in the open · <a href="https://github.com/b32n/b32n.io">source</a></span></div>
</div></footer>
<script src="/assets/nano.js?v={ver('nano.js')}" defer></script>
</body>
</html>
"""

def fmt_date(d):
    return datetime.date.fromisoformat(d).strftime("%d %b %Y")

def build():
    posts = []
    for p in sorted((SRC / "posts").glob("*.html")):
        meta, body = parse(p)
        meta["slug"] = p.stem
        posts.append((meta, body))
    posts.sort(key=lambda mb: mb[0]["date"], reverse=True)

    def post_rows(items):
        return "\n".join(
            f'<a class="post-row" href="/blog/{m["slug"]}/"><time datetime="{m["date"]}">{fmt_date(m["date"])}</time>'
            f'<div><h3>{html.escape(m["title"])}</h3><p>{html.escape(m["summary"])}</p></div><span class="go">→</span></a>'
            for m, _ in items)

    for page in (SRC / "pages").glob("*.html"):
        meta, body = parse(page)
        body = body.replace("{{POSTS}}", post_rows(posts[:3])).replace("{{ALL_POSTS}}", post_rows(posts))
        dest = OUT / meta["path"].strip("/") / "index.html" if meta["path"] != "/" else OUT / "index.html"
        if meta["path"].endswith(".html"):
            dest = OUT / meta["path"].strip("/")
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(layout(meta["title"], body, desc=meta["description"], path=meta["path"], section=meta.get("section", "")))

    for m, body in posts:
        art = f"""<section class="page-hero" data-swarm-host><canvas class="swarm" data-shapes="{m.get('swarm','orb')}" data-count="520"></canvas><div class="wrap">
<div class="crumbs"><a href="/blog/">Blog</a> / {fmt_date(m["date"])}</div>
<h1>{html.escape(m["title"])}</h1>
<p class="lede">{html.escape(m["summary"])}</p>
<p class="meta">{html.escape(m.get("author","Bharat Nadkarni"))} · {m.get("read","3 min")} read</p>
</div></section>
<section style="padding-top:24px"><div class="wrap"><article class="prose">{body}</article>
<p style="margin-top:56px"><a class="btn" href="/blog/"><span class="arrow" style="transform:scaleX(-1)">→</span> All posts</a></p></div></section>"""
        d = OUT / "blog" / m["slug"] / "index.html"
        d.parent.mkdir(parents=True, exist_ok=True)
        d.write_text(layout(m["title"], art, desc=m["summary"], path=f'/blog/{m["slug"]}/', section="blog", og_type="article"))

    items = "".join(
        f"<item><title>{html.escape(m['title'])}</title><link>{SITE}/blog/{m['slug']}/</link><guid>{SITE}/blog/{m['slug']}/</guid>"
        f"<pubDate>{datetime.date.fromisoformat(m['date']).strftime('%a, %d %b %Y 00:00:00 +0000')}</pubDate><description>{html.escape(m['summary'])}</description></item>"
        for m, _ in posts)
    (OUT / "blog").mkdir(parents=True, exist_ok=True)
    (OUT / "blog" / "feed.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>b32n blog</title><link>{SITE}/blog/</link>'
        f"<description>Notes on open source, owning your data, and building in the open.</description>{items}</channel></rss>")

    urls = ["/", "/projects/spindle/", "/projects/mindmaps/", "/blog/"] + [f"/blog/{m['slug']}/" for m, _ in posts]
    (OUT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        + "".join(f"<url><loc>{SITE}{u}</loc></url>" for u in urls) + "</urlset>")
    (OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n")
    (OUT / "favicon.svg").write_text(LOGO.replace('aria-hidden="true"', 'xmlns="http://www.w3.org/2000/svg"'))
    print(f"built {len(posts)} posts")

if __name__ == "__main__":
    build()
