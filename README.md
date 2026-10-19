# b32n.io

Source for **https://b32n.io**, Bharat Nadkarni's home on the web, where I build open tools and make open source approachable.

*Take back control of your data.*

## What's here
- `src/pages/` home, case studies (`/projects/spindle/`, `/projects/mindmaps/`), blog index, 404
- `src/posts/` blog posts, one HTML file each
- `public/assets/nano.js` the nanobot swarm: particles that assemble into shapes (canvas, no dependencies, respects `prefers-reduced-motion`)
- `public/assets/site.css` styles (light only)
- `build.py` a dependency-free Python build that renders `src/` into `public/`, plus RSS and sitemap

## Write a post
Create `src/posts/my-slug.html`:

```
title: My post
date: 2026-11-01
summary: One line for the index and RSS.
read: 4 min
swarm: orb
---
<p>HTML body…</p>
```

`swarm` picks the hero shape: `orb`, `grid`, `graph`, `key`, `plus`, or `word:anytext`.

## Build and run
    python3 build.py
    cd public && python3 -m http.server 8765

## Deploy
Cloudflare Worker with static assets (`wrangler.jsonc`, worker `b32n-io`, route `b32n.io/*`).

    python3 build.py && wrangler deploy

## Projects
- [Spindle](https://spindle.b32n.io) · [source](https://github.com/b32n/spindle)
- [Mindmaps](https://mindmaps.b32n.io)
- [Bit](https://bit.b32n.io) · [source](https://github.com/b32n/bit)
