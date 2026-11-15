# queenie-portfolio

Queenie's portfolio website (version 5).

Plain HTML / CSS / JS, no build step and no external dependencies.

```
index.html        all pages (home + four case studies), switched by URL hash
css/style.css     colours and fonts are the variables at the top (:root); case-study themes are near the end
js/main.js        scroll-driven work section, navigation, drawings list, case pages
js/metal.js       the shape-shifting liquid metal (WebGL shader)
fonts/  images/  media/  CV.pdf
```

Preview: open `index.html`, or run `python3 -m http.server` in this folder.

## Adding a project

The work section in `index.html` has one entry per project.
Each entry is one `<h2 class="work-title">` plus one `<article class="slide">`, in the same order.

1. In the `.slide`: remove `is-soon`, write the one-line description and the meta line, add a button
   (`<a class="btn btn-fill" href="#yourpage">View case study</a>`) and replace the placeholder
   `<div class="slide-shot is-empty">` with `<a class="slide-shot" href="#yourpage"><img src="images/..." alt="..."></a>`.
2. Metal shape, `data-shape`: 2 pill, 3 bag, 4 ring, 5 shuttlecock, 6 gem, 8 robot arm.
3. Colour: `style="--c:#hex"` on both the title and the slide, and `data-tint="r,g,b"` (0 to 1) for the light on the metal.
4. Case study page: copy one of the `<main class="page case">` blocks, give it a new id
   (for example `case-shuttlesync`) and add it to `PAGES` at the top of the router in `js/main.js`.
5. Theme: each case page has its own look. Copy one of the theme blocks at the end of
   `css/style.css` ("CASE STUDY THEMES"), rename the selectors to your new id and change the colours and fonts.

To hide a slot until it is ready, add the `hidden` attribute to both its `.work-title` and its `.slide`.
