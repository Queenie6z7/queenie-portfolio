# queenie-portfolio

Queenie's portfolio website (version 2 — "player file" redesign).

Plain HTML / CSS / JS, no build step and no external dependencies.

```
index.html        all pages (home, MedEasy, AirPal) — switch by URL hash
css/style.css     design tokens at the top (:root) — colours and fonts live there
js/main.js        interactions: boot screen, HUD, skill tree, 3D stage, canvas, trophies, mini game
js/blob.js        liquid-metal WebGL shader used in the hero
fonts/            Anybody, Chakra Petch, Schibsted Grotesk (SIL Open Font License)
images/           WebP versions of the original images
CV.pdf
```

To preview: open `index.html` in a browser, or run `python3 -m http.server` in this folder.

Secrets: click "Insert coin" in the footer, or type ↑ ↑ ↓ ↓ ← → ← → B A.
