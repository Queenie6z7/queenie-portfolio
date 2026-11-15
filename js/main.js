/* QUEENIE — portfolio v3. Vanilla JS, no dependencies. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  var session = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };
  var TINTS = { lime: [0.62, 1, 0], cyan: [0.45, 0.97, 1], pink: [1, 0.24, 0.94], violet: [0.55, 0.45, 1] };
  function tintOf(v) { if (TINTS[v]) return TINTS[v]; var a = String(v || '').split(',').map(Number); return a.length === 3 && a.every(isFinite) ? a : TINTS.lime; }

  /* ---------- preloader: a count that widens as it loads ---------- */
  function loader(done) {
    var el = $('#loader'), num = $('#loaderNum');
    function finish() { document.body.classList.remove('is-loading'); done(); }
    if (!el || REDUCE || session.get('q-seen')) { if (el) el.remove(); return finish(); }
    session.set('q-seen', '1');
    var t0 = performance.now(), D = 1150;
    (function step(now) {
      var p = clamp((now - t0) / D, 0, 1), e = 1 - Math.pow(1 - p, 3);
      num.textContent = Math.round(e * 100);
      num.style.setProperty('--ly', Math.round(2050 - e * 71)); // the number un-melts as it loads
      if (p < 1) return requestAnimationFrame(step);
      el.classList.add('is-done');
      finish();
      setTimeout(function () { el.remove(); }, 750);
    })(t0);
  }

  /* ---------- cursor ---------- */
  function cursor() {
    if (!FINE) return;
    var el = $('#cursor'), label = $('#cursorLabel');
    document.documentElement.classList.add('has-cursor');
    window.addEventListener('pointermove', function (e) {
      el.style.opacity = 1;
      el.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
    }, { passive: true });
    var cur = null;
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest && e.target.closest('[data-cursor], a, button, .zoomable');
      if (t === cur) return;
      cur = t;
      var text = t ? (t.getAttribute('data-cursor') || (t.classList.contains('zoomable') ? 'Zoom' : '')) : '';
      el.classList.toggle('is-active', !!text);
      el.classList.toggle('is-link', !!t && !text);
      label.textContent = text;
    });
    document.addEventListener('pointerdown', function () { el.classList.add('is-down'); });
    document.addEventListener('pointerup', function () { el.classList.remove('is-down'); });
    document.addEventListener('mouseleave', function () { el.style.opacity = 0; });
  }

  /* ---------- magnetic buttons ---------- */
  function magnets() {
    if (!FINE) return;
    $$('.btn').forEach(function (b) {
      b.addEventListener('pointerenter', function (e) { // the fill blooms from where the pointer came in
        var r = b.getBoundingClientRect();
        b.style.setProperty('--bx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        b.style.setProperty('--by', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      });
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        b.style.translate = (dx * 0.28).toFixed(1) + 'px ' + (dy * 0.4).toFixed(1) + 'px';
      });
      b.addEventListener('pointerleave', function () { b.style.translate = ''; });
    });
  }

  /* ---------- warped headings: letters widen near the pointer ---------- */
  var warps = [];
  function warpInit() {
    $$('[data-warp]').forEach(function (el) {
      var text = el.textContent.trim(), chars = [];
      el.setAttribute('aria-label', text); el.textContent = '';
      text.split(' ').forEach(function (word, wi, arr) {
        var w = document.createElement('span'); w.className = 'wd'; w.setAttribute('aria-hidden', 'true');
        word.split('').forEach(function (c) {
          var s = document.createElement('span'); s.className = 'ch'; s.textContent = c; s.style.setProperty('--w', REDUCE ? 100 : 50);
          w.appendChild(s); chars.push(s);
        });
        el.appendChild(w);
        if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
      });
      warps.push({ el: el, chars: chars, visible: false, entered: false });
    });
    if (!('IntersectionObserver' in window)) return warps.forEach(function (w) { w.entered = true; w.chars.forEach(function (c) { c.style.setProperty('--w', 100); }); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var w = warps.filter(function (x) { return x.el === e.target; })[0];
        w.visible = e.isIntersecting;
        if (e.isIntersecting && !w.entered) {
          w.entered = true;
          w.chars.forEach(function (c, i) { setTimeout(function () { c.style.setProperty('--w', 100); }, 60 + i * 32); });
        }
      });
    }, { threshold: 0.2 });
    warps.forEach(function (w) { io.observe(w.el); });
  }
  function warpMove(px, py) {
    warps.forEach(function (w) {
      if (!w.visible || !w.entered) return;
      var r = w.el.getBoundingClientRect();
      var near = py > r.top - 120 && py < r.bottom + 120;
      w.chars.forEach(function (c) {
        if (!near) return c.style.setProperty('--w', 100);
        var cr = c.getBoundingClientRect();
        var dx = (px - (cr.left + cr.width / 2)) / (r.width * 0.16 + 60);
        c.style.setProperty('--w', Math.round(100 + 50 * Math.exp(-dx * dx)));
      });
    });
  }

  /* ---------- hero word ---------- */
  function hero() {
    var word = $('#heroWord'), heroEl = $('#top');
    var letters = $$('span', word), n = letters.length;
    var pointer = { x: 0.5, y: 0.5, t: 0 }, intro = performance.now();
    function fit() {
      letters.forEach(function (l) { l.style.setProperty('--w', 100); });
      word.style.fontSize = '100px';
      var w = 0; letters.forEach(function (l) { w += l.getBoundingClientRect().width; });
      var W = heroEl.clientWidth, H = heroEl.clientHeight, fs = (W * 0.95) / w * 100;
      word.style.fontSize = fs + 'px';
      word.dataset.sy = clamp((W < 700 ? H * 0.36 : H * 0.46) / (fs * 0.74), 1, 5);
    }
    function apply(now) {
      var auto = !REDUCE && (now - pointer.t > 2600);
      var cx = auto ? 0.5 + 0.46 * Math.sin(now / 1400) : pointer.x;
      var raw = [], sum = 0, i;
      for (i = 0; i < n; i++) { var d = (cx - (i + 0.5) / n) / 0.2, f = Math.exp(-d * d); raw.push(f); sum += 55 + 95 * f; }
      var k = (100 * n) / sum;
      letters.forEach(function (l, j) {
        l.style.setProperty('--w', clamp((55 + 95 * raw[j]) * k, 50, 150).toFixed(1));
        l.classList.toggle('is-hot', raw[j] > 0.72 && !auto);
      });
      // the word grows in on load and is pressed flat as you scroll away
      var grow = REDUCE ? 1 : smooth(0, 900, now - intro);
      var press = 1 - 0.75 * clamp(window.scrollY / (heroEl.offsetHeight * 0.9), 0, 1);
      var base = parseFloat(word.dataset.sy || 1.6);
      word.style.setProperty('--sy', (base * (0.86 + 0.28 * (1 - (auto ? 0.5 : pointer.y))) * (0.08 + 0.92 * grow) * press).toFixed(3));
    }
    var running = false, visible = true;
    function loop(now) { running = false; if (!visible) return; apply(now); if (!REDUCE) { running = true; requestAnimationFrame(loop); } }
    function kick() { if (!running) { running = true; requestAnimationFrame(loop); } }
    function refit() { fit(); kick(); }
    window.addEventListener('pointermove', function (e) {
      var r = heroEl.getBoundingClientRect();
      if (e.clientY > r.bottom) return;
      pointer.x = clamp((e.clientX - r.left) / r.width, 0, 1); pointer.y = clamp((e.clientY - r.top) / r.height, 0, 1); pointer.t = performance.now();
    }, { passive: true });
    window.addEventListener('resize', refit);
    if (REDUCE) window.addEventListener('scroll', kick, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(heroEl);
    if (document.fonts) {
      if (document.fonts.ready) document.fonts.ready.then(refit);
      if (document.fonts.load) document.fonts.load('900 100px Anybody').then(refit, function () {});
      if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', refit);
    }
    refit();
  }

  /* ---------- marquee reacts to scroll speed ---------- */
  function marquee() {
    var track = $('#marquee'); if (!track || REDUCE) return;
    var last = scrollY, timer;
    window.addEventListener('scroll', function () {
      var v = clamp(Math.abs(scrollY - last), 0, 60); last = scrollY;
      track.style.setProperty('--mw', Math.round(120 - v * 1.1));
      clearTimeout(timer); timer = setTimeout(function () { track.style.setProperty('--mw', 120); }, 140);
    }, { passive: true });
  }

  /* ---------- nav ---------- */
  var navSet = function () {};
  function nav() {
    var links = $$('.nav nav a[data-spy]');
    navSet = function (id) { links.forEach(function (a) { a.classList.toggle('is-current', a.dataset.spy === id); }); };
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting && currentPage === 'home-page') navSet(e.target.id); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    ['top', 'work', 'about', 'other-works', 'contact'].forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- router (home / case studies share one file) ---------- */
  var PAGES = { medeasy: 'case-medeasy', airpal: 'case-airpal', shuttlesync: 'case-shuttlesync', portraits: 'case-portraits' };
  var currentPage = 'home-page';
  function route(initial) {
    var hash = (location.hash || '#top').slice(1);
    var pageId = PAGES[hash] || 'home-page';
    function show() {
      $$('.page').forEach(function (p) { var on = p.id === pageId; p.classList.toggle('is-active', on); p.hidden = !on; });
      currentPage = pageId;
      document.body.classList.toggle('on-case', pageId !== 'home-page');
      document.body.dataset.page = pageId; // each case study has its own theme, see css
      $$('.case video').forEach(function (v) { v.pause(); });
      document.body.classList.remove('curtain-open'); // the Portraits page opens like a theatre
      if (pageId === 'case-portraits') setTimeout(function () { document.body.classList.add('curtain-open'); }, REDUCE ? 0 : 450);
      if (pageId === 'home-page') {
        var t = document.getElementById(hash);
        if (t) t.scrollIntoView({ behavior: 'instant', block: 'start' }); else window.scrollTo({ top: 0, behavior: 'instant' });
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
        navSet('work');
        chapters.refresh();
      }
      window.dispatchEvent(new Event('resize'));
    }
    if (pageId === currentPage && !initial) return;
    if (initial || REDUCE) return show();
    var wipe = $('#wipe');
    wipe.classList.remove('is-on'); void wipe.offsetWidth; wipe.classList.add('is-on');
    setTimeout(show, 230);
    setTimeout(function () { wipe.classList.remove('is-on'); }, 520);
  }

  /* ---------- work: pinned, scroll-driven ---------- */
  var work = { top: 0, vh: 1, n: 0, slides: [] };
  function workInit() {
    var sec = $('#work'), pin = $('#workPin'), layer = $('.work-titles', sec);
    var slides = $$('.slide', sec).filter(function (s) { return !s.hidden; });
    var titles = $$('.work-title', sec).filter(function (t) { return !t.hidden; });
    var dotsBox = $('#workDots'), count = $('#workCount'), n = slides.length, current = -1;
    work.n = n; work.slides = slides;
    sec.style.setProperty('--n', n);
    $('#workTotal').textContent = '/ ' + ('0' + n).slice(-2);
    slides.forEach(function (s, i) {
      if (s.classList.contains('is-soon') && titles[i]) titles[i].classList.add('is-soon-title');
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = ('0' + (i + 1)).slice(-2);
      b.style.setProperty('--c', s.style.getPropertyValue('--c'));
      b.setAttribute('aria-label', 'Project ' + (i + 1) + ': ' + (titles[i] ? titles[i].textContent : ''));
      b.addEventListener('click', function () { window.scrollTo({ top: work.top + i * work.vh + 1, behavior: REDUCE ? 'auto' : 'smooth' }); });
      dotsBox.appendChild(b);
    });
    var dots = $$('button', dotsBox);

    function fit() {
      work.vh = pin.offsetHeight; work.top = sec.offsetTop;
      var maxW = pin.clientWidth - 2 * parseFloat(getComputedStyle(sec).getPropertyValue('--pad') || 20) || pin.clientWidth * 0.9;
      var pad = (pin.clientWidth - layer.clientWidth) / 2;
      titles.forEach(function (t) {
        t.style.fontSize = '100px'; t.style.setProperty('--tw', 150);
        var w = t.getBoundingClientRect().width || 1, target = pin.clientWidth * 0.86;
        t.style.fontSize = Math.min(target / w * 100, work.vh * 0.3) + 'px';
        t.style.removeProperty('--tw');
      });
      update();
    }
    function update() {
      var r = sec.getBoundingClientRect();
      var on = r.bottom > 0 && r.top < innerHeight && currentPage === 'home-page';
      layer.classList.toggle('is-on', on);
      if (!on) return;
      // follow the pin: slide in with it, hold while it is stuck, leave with it
      var ty = r.top > 0 ? r.top : (r.bottom < work.vh ? r.bottom - work.vh : 0);
      layer.style.transform = 'translate3d(0,' + ty.toFixed(1) + 'px,0)';
      var local = clamp(-r.top / work.vh, 0, n - 1), idx = Math.round(local), dist = Math.abs(local - idx);
      layer.style.setProperty('--tw', (150 - 200 * dist).toFixed(1));
      layer.style.setProperty('--ty', (1 - dist * 1.3).toFixed(3));
      pin.style.setProperty('--melt', Math.round(1979 + dist * 2 * 71)); // the counter melts between projects
      if (idx !== current) {
        current = idx;
        slides.forEach(function (s, i) {
          s.classList.toggle('is-current', i === idx);
          var v = $('video', s); if (v) { if (i === idx && !REDUCE) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); } else v.pause(); }
        });
        titles.forEach(function (t, i) { t.classList.toggle('is-current', i === idx); });
        dots.forEach(function (d, i) { d.classList.toggle('is-current', i === idx); });
        count.textContent = ('0' + (idx + 1)).slice(-2);
        pin.style.setProperty('--c', getComputedStyle(slides[idx]).getPropertyValue('--c'));
      }
    }
    work.update = update;
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', fit);
    if (FINE && !REDUCE) pin.addEventListener('pointermove', function (e) {
      pin.style.setProperty('--rx', (e.clientX / innerWidth - 0.5).toFixed(3));
      pin.style.setProperty('--ry', (e.clientY / innerHeight - 0.5).toFixed(3));
    });
    fit();
  }

  /* ---------- the metal: one object, scrubbed through shapes by scroll ---------- */
  function metal() {
    var canvas = $('#metal');
    var gfx = window.QMetal && window.QMetal.start(canvas);
    if (!gfx) { document.body.classList.add('no-metal'); return; }
    var skills = $('#skills'), labels = $$('li', skills);
    var keys = [], drops = new Float32Array(21), rot = new Float32Array(9);
    var cur = { a: 0, b: 0, mix: 0, cx: 0.42, cy: 0.2, scale: 1, tint: [0.78, 1, 0] };
    var mouse = { x: 1.4, y: -0.2, tx: 1.4, ty: -0.2, last: 0, nx: 0, ny: 0 }, stir = 0, raf = 0, dirty = true;

    function mode() { return innerWidth < 700 ? 'small' : 'wide'; }
    // where the object sits for each stop: [x, y, scale] in world units
    var SMALL = { top: [0, 1.6, 1], work: [0.85, -2.0, 1.0], about: [1.05, 2.55, 0.62], 'other-works': [1.15, 2.7, 0.55], contact: [1.0, 2.5, 0.7] };
    var WIDE_WORK = [-0.72, -0.62, 1.0];

    function build() {
      var small = mode() === 'small', vh = innerHeight, max = Math.max(1, document.documentElement.scrollHeight - vh);
      keys = [];
      function add(y, shape, pos, tint) { keys.push({ y: clamp(y, 0, max), shape: shape, pos: pos, tint: tintOf(tint) }); }
      $$('#home-page [data-shape][data-pos]').forEach(function (s) {
        var pos = small ? SMALL[s.id] : s.dataset.pos.split(',').map(Number);
        var shape = +s.dataset.shape;
        if (small && shape === 1) shape = 0; // no room for the droplet orbit on phones
        var y = s.id === 'top' ? 0 : s.offsetTop - vh * (s.id === 'contact' ? 0.2 : 0.3);
        add(y, shape, pos, s.dataset.tint);
        if (s.id === 'top') work.slides.forEach(function (sl, i) { add(work.top + i * work.vh, +sl.dataset.shape, small ? SMALL.work : WIDE_WORK, sl.dataset.tint); });
      });
      keys.sort(function (p, q) { return p.y - q.y; });
      skills.classList.toggle('is-orbit', !small);
      dirty = true;
    }

    function target() {
      var s = window.scrollY, k = 0;
      while (k < keys.length - 2 && s >= keys[k + 1].y) k++;
      var A = keys[k], B = keys[k + 1] || A;
      var t = B.y > A.y ? clamp((s - A.y) / (B.y - A.y), 0, 1) : 0, m = smooth(0.42, 0.96, t);
      return { a: A.shape, b: B.shape, mix: m,
        cx: lerp(A.pos[0], B.pos[0], m), cy: lerp(A.pos[1], B.pos[1], m), scale: lerp(A.pos[2], B.pos[2], m),
        tint: [lerp(A.tint[0], B.tint[0], m), lerp(A.tint[1], B.tint[1], m), lerp(A.tint[2], B.tint[2], m)] };
    }

    var lastNow = 0, slow = 0;
    function frame(now) {
      raf = 0;
      if (document.hidden || currentPage !== 'home-page') { lastNow = 0; return; }
      // slow device? render the metal at a lower resolution rather than drop frames
      if (lastNow && now - lastNow < 200) { slow = now - lastNow > 30 ? slow + 1 : Math.max(0, slow - 1); if (slow > 40 && gfx.quality > 0.45) { gfx.quality *= 0.8; gfx.resize(); slow = 0; } }
      lastNow = now;
      var t = REDUCE ? 8 : now / 1000, T = target(), e = REDUCE ? 1 : 0.14;
      if (T.a !== cur.a || T.b !== cur.b) { cur.a = T.a; cur.b = T.b; cur.mix = T.mix; } else cur.mix = lerp(cur.mix, T.mix, REDUCE ? 1 : 0.25);
      cur.cx = lerp(cur.cx, T.cx, e); cur.cy = lerp(cur.cy, T.cy, e); cur.scale = lerp(cur.scale, T.scale, e);
      cur.tint = T.tint;

      if (!REDUCE && now - mouse.last > 2600) { mouse.tx = cur.cx + Math.sin(t * 0.6) * 1.6 * cur.scale; mouse.ty = cur.cy + Math.cos(t * 0.6) * 1.3 * cur.scale; }
      mouse.x = lerp(mouse.x, mouse.tx, 0.09); mouse.y = lerp(mouse.y, mouse.ty, 0.09);
      stir *= 0.95;

      // rigid shapes turn slowly and lean toward the pointer
      var yaw = t * 0.45 + mouse.nx * 0.9, pitch = 0.3 + mouse.ny * 0.5;
      var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      rot[0] = cy; rot[1] = sp * sy; rot[2] = -cp * sy; rot[3] = 0; rot[4] = cp; rot[5] = sp; rot[6] = sy; rot[7] = -sp * cy; rot[8] = cp * cy;

      // skill droplets orbit; their labels follow in the DOM
      var w = (cur.a === 1 ? 1 - cur.mix : 0) + (cur.b === 1 ? cur.mix : 0);
      for (var i = 0; i < 7; i++) {
        var th = i / 7 * Math.PI * 2 + t * 0.22;
        var ox = Math.cos(th) * 1.0, oy = Math.sin(th) * 0.78, oz = Math.sin(th * 2 + i) * 0.22;
        drops[i * 3] = ox; drops[i * 3 + 1] = oy; drops[i * 3 + 2] = oz;
        if (labels[i] && skills.classList.contains('is-orbit')) {
          var p = gfx.project(cur.cx + ox * cur.scale, cur.cy + oy * cur.scale, oz);
          labels[i].style.setProperty('--o', (w * w).toFixed(3));
          var rpx = 0.15 * cur.scale * (1.7 / (3.4 - oz) / gfx.zoom) * gfx.cssH / 2;
          labels[i].style.transform = 'translate3d(' + (p[0] + rpx + 12).toFixed(1) + 'px,' + (p[1] - 13).toFixed(1) + 'px,0)';
        }
      }

      // the blob has eyes; they shrink away when it becomes something else, and blink now and then
      var eyes = (cur.a === 0 ? 1 - cur.mix : 0) + (cur.b === 0 ? cur.mix : 0);
      var bl = (t % 5.1), blink = REDUCE ? 0 : (bl < 0.16 ? Math.sin(bl / 0.16 * Math.PI) : 0);
      gfx.render({ eye: smooth(0.5, 1, eyes), blink: blink, t: t, mx: mouse.x, my: mouse.y, stir: stir, cx: cur.cx, cy: cur.cy, scale: cur.scale, a: cur.a, b: cur.b, mix: cur.mix, rot: rot, tint: cur.tint, drops: drops });
      if (!REDUCE) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    window.addEventListener('pointermove', function (e) {
      var p = gfx.unproject(e.clientX, e.clientY, 0.15);
      var dx = p[0] - mouse.tx, dy = p[1] - mouse.ty;
      stir = Math.min(stir + Math.min(Math.sqrt(dx * dx + dy * dy) * 6, 1.5) * 0.35, 1.6);
      mouse.tx = p[0]; mouse.ty = p[1]; mouse.last = performance.now();
      mouse.nx = e.clientX / innerWidth - 0.5; mouse.ny = e.clientY / innerHeight - 0.5;
      kick();
    }, { passive: true });
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', function () { gfx.resize(); build(); kick(); });
    document.addEventListener('visibilitychange', kick);
    window.addEventListener('load', function () { build(); kick(); });
    if ('ResizeObserver' in window) new ResizeObserver(function () { build(); kick(); }).observe($('#home-page'));
    build(); kick();
  }

  /* ---------- numbers count up when they come into view ---------- */
  function counters() {
    var items = $$('.record b[data-count]');
    if (REDUCE || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var el = e.target, end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
        var pre = el.dataset.prefix || '', suf = el.dataset.suffix || '', t0 = performance.now();
        (function step(now) {
          var p = clamp((now - t0) / 1100, 0, 1), v = end * (1 - Math.pow(1 - p, 3));
          el.textContent = pre + v.toFixed(dec) + suf;
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.6 });
    items.forEach(function (i) { io.observe(i); });
  }

  /* ---------- lightbox ---------- */
  var lightbox = (function () {
    var box, lastFocus;
    function open(src, alt, infoNode) {
      lastFocus = document.activeElement;
      var img = $('#lightboxImg'), info = $('#lightboxInfo');
      img.src = src; img.alt = alt || ''; info.innerHTML = '';
      if (infoNode) info.appendChild(infoNode);
      box.hidden = false; document.body.classList.add('is-locked');
      $('#lightboxClose').focus();
    }
    function close() {
      if (!box || box.hidden) return;
      box.hidden = true; document.body.classList.remove('is-locked');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    function init() {
      box = $('#lightbox');
      box.addEventListener('click', function (e) { if (e.target === box || e.target.id === 'lightboxClose') close(); });
      document.addEventListener('click', function (e) { var z = e.target.closest && e.target.closest('.zoomable'); if (z) open(z.currentSrc || z.src, z.alt); });
      box.addEventListener('keydown', function (e) { if (e.key === 'Tab') { e.preventDefault(); $('#lightboxClose').focus(); } });
    }
    return { open: open, close: close, init: init };
  })();

  /* ---------- drawings: a list of titles; the picture follows the pointer ---------- */
  function works() {
    var list = $('#works'); if (!list) return;
    var rows = $$('.work-row', list), peek = $('#peek'), img = $('img', peek);
    function inspect(r) {
      var info = document.createElement('div'), h = document.createElement('h3'), m = document.createElement('span'), d = document.createElement('p');
      h.textContent = $('.work-row-title', r).textContent; m.className = 'piece-meta'; m.textContent = $('.work-row-meta', r).textContent; d.textContent = $('p', r).textContent;
      info.appendChild(m); info.appendChild(h); info.appendChild(d);
      lightbox.open(r.dataset.src, r.dataset.alt, info);
    }
    rows.forEach(function (r) { r.addEventListener('click', function () { inspect(r); }); });
    if (!FINE) { document.documentElement.classList.add('is-touch'); return; }
    var x = 0, y = 0, tx = 0, ty = 0, on = false, raf = 0;
    function loop() {
      raf = 0;
      var dx = tx - x, dy = ty - y;
      x += dx * 0.14; y += dy * 0.14;
      // the picture leans and stretches with the speed of the pointer
      var skew = clamp(dx * 0.06, -14, 14), sq = clamp(Math.abs(dx) * 0.0012, 0, 0.18);
      peek.style.transform = 'translate3d(' + (x + 28).toFixed(1) + 'px,' + (y - peek.offsetHeight * 0.5).toFixed(1) + 'px,0) skewX(' + (REDUCE ? 0 : -skew).toFixed(2) + 'deg) scale(' + (1 + sq).toFixed(3) + ',' + (1 - sq * 0.6).toFixed(3) + ')';
      if (on || Math.abs(dx) + Math.abs(dy) > 0.5) raf = requestAnimationFrame(loop);
    }
    rows.forEach(function (r) {
      r.addEventListener('pointerenter', function (e) {
        img.src = r.dataset.src;
        if (!on) { x = tx = e.clientX; y = ty = e.clientY; }
        on = true; peek.classList.add('is-on'); if (!raf) raf = requestAnimationFrame(loop);
      });
    });
    list.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; if (!raf) raf = requestAnimationFrame(loop); });
    list.addEventListener('pointerleave', function () { on = false; peek.classList.remove('is-on'); });
    window.addEventListener('scroll', function () { if (on) { on = false; peek.classList.remove('is-on'); } }, { passive: true });
  }

  /* ---------- contact: click the address to copy it ---------- */
  function contact() {
    var btn = $('#mailCopy'), note = $('#mailNote'), mail = '54liuzi7@gmail.com';
    function ok() {
      btn.classList.add('is-copied'); note.textContent = 'copied to clipboard';
      setTimeout(function () { btn.classList.remove('is-copied'); note.textContent = 'click to copy'; }, 1800);
    }
    function fallback() {
      try { var ta = document.createElement('textarea'); ta.value = mail; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); ok(); }
      catch (e) { location.href = 'mailto:' + mail; }
    }
    btn.addEventListener('click', function () {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(mail).then(ok, fallback); else fallback();
    });
  }

  /* ---------- case study chapters ---------- */
  var chapters = (function () {
    var cases = [];
    function init() {
      $$('.case').forEach(function (page) {
        var list = $('.chapters ol', page), bar = $('.chapters-bar i', page), items = [];
        $$('.chapter', page).forEach(function (ch, i) {
          ch.id = page.id + '-ch' + i;
          var li = document.createElement('li'), a = document.createElement('a');
          a.href = '#' + ch.id; a.textContent = ch.dataset.chapter;
          a.addEventListener('click', function (e) { e.preventDefault(); ch.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' }); });
          li.appendChild(a); list.appendChild(li); items.push({ ch: ch, a: a });
        });
        cases.push({ page: page, bar: bar, items: items });
      });
      window.addEventListener('scroll', refresh, { passive: true });
    }
    function refresh() {
      cases.forEach(function (c) {
        if (!c.page.classList.contains('is-active')) return;
        var max = document.documentElement.scrollHeight - innerHeight;
        c.bar.style.width = (max > 0 ? clamp(scrollY / max, 0, 1) * 100 : 0) + '%';
        var cur = -1;
        c.items.forEach(function (it, i) { if (it.ch.getBoundingClientRect().top < innerHeight * 0.45) cur = i; });
        c.items.forEach(function (it, i) { it.a.classList.toggle('is-current', i === cur); it.a.classList.toggle('is-done', i < cur); });
      });
    }
    return { init: init, refresh: refresh };
  })();

  /* ---------- hidden mini game: Idea Catcher (↑↑↓↓←→←→BA) ---------- */
  function arcade() {
    var box = $('#arcade'), cv = $('#arcadeCanvas'), ctx = cv.getContext('2d');
    var scoreEl = $('#arcadeScore'), timeEl = $('#arcadeTime'), msg = $('#arcadeMsg'), play = $('#arcadePlay');
    var W = cv.width, H = cv.height, state = null, raf = 0, keys = {}, lastFocus;
    var COLORS = ['#c8ff00', '#00e1ff', '#ff2bd6', '#ffe600'];
    function open(bonus) {
      lastFocus = document.activeElement;
      box.hidden = false; document.body.classList.add('is-locked');
      msg.textContent = 'Move the mouse or use ← → to catch new ideas. Avoid the red bugs.';
      play.hidden = false; play.textContent = 'Play'; play.focus();
      state = null; box._bonus = bonus || 0; draw();
    }
    function close() { cancelAnimationFrame(raf); state = null; box.hidden = true; document.body.classList.remove('is-locked'); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
    function start() {
      state = { x: W / 2, items: [], score: box._bonus || 0, t0: performance.now(), spawn: 0, last: performance.now() };
      box._bonus = 0; play.hidden = true; cv.focus();
      cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    }
    function loop(now) {
      if (!state) return;
      var dt = Math.min(now - state.last, 40) / 16; state.last = now;
      var left = 30 - (now - state.t0) / 1000;
      if (keys.ArrowLeft) state.x -= 8 * dt;
      if (keys.ArrowRight) state.x += 8 * dt;
      state.x = clamp(state.x, 40, W - 40);
      if (now > state.spawn) {
        state.spawn = now + 420 - Math.min(200, (30 - left) * 7);
        state.items.push({ x: 20 + Math.random() * (W - 40), y: -12, v: 2.4 + Math.random() * 2 + (30 - left) * 0.06, bug: Math.random() < 0.25, c: COLORS[(Math.random() * 4) | 0] });
      }
      state.items = state.items.filter(function (it) {
        it.y += it.v * dt;
        if (it.y > H - 34 && it.y < H - 12 && Math.abs(it.x - state.x) < 46) { state.score = it.bug ? Math.max(0, state.score - 2) : state.score + 1; return false; }
        return it.y < H + 20;
      });
      scoreEl.textContent = state.score; timeEl.textContent = Math.max(0, Math.ceil(left));
      draw();
      if (left <= 0) { var s = state.score; state = null; msg.textContent = 'Final score ' + s + '.'; play.hidden = false; play.textContent = 'Play again'; play.focus(); return; }
      raf = requestAnimationFrame(loop);
    }
    function draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      for (var gx = 0; gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
      for (var gy = 0; gy < H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
      var x = state ? state.x : W / 2;
      ctx.fillStyle = '#c8ff00'; ctx.fillRect(x - 40, H - 26, 80, 10);
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 6, H - 34, 12, 8);
      if (!state) return;
      state.items.forEach(function (it) {
        ctx.save(); ctx.translate(it.x, it.y);
        if (it.bug) { ctx.fillStyle = '#ff3b3b'; ctx.fillRect(-9, -9, 18, 18); ctx.fillStyle = '#000'; ctx.fillRect(-5, -4, 3, 3); ctx.fillRect(2, -4, 3, 3); }
        else { ctx.rotate(Math.PI / 4); ctx.fillStyle = it.c; ctx.fillRect(-8, -8, 16, 16); }
        ctx.restore();
      });
    }
    cv.tabIndex = 0;
    cv.addEventListener('pointermove', function (e) { if (!state) return; var r = cv.getBoundingClientRect(); state.x = (e.clientX - r.left) / r.width * W; });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { keys[e.key] = true; e.preventDefault(); }
      if (e.key === 'Tab') {
        var f = [$('#arcadeClose'), cv, play].filter(function (n) { return !n.hidden; });
        var i = f.indexOf(document.activeElement); e.preventDefault();
        f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
      }
    });
    box.addEventListener('keyup', function (e) { keys[e.key] = false; });
    play.addEventListener('click', start);
    $('#arcadeClose').addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    $('#coin').addEventListener('click', function () { open(0); });
    var code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'], ci = 0;
    document.addEventListener('keydown', function (e) {
      if (!box.hidden) return;
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      ci = k === code[ci] ? ci + 1 : (k === code[0] ? 1 : 0);
      if (ci === code.length) { ci = 0; open(5); }
    });
    return { close: close, isOpen: function () { return !box.hidden; } };
  }

  /* ---------- go ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    warpInit();
    nav();
    chapters.init();
    lightbox.init();
    cursor();
    marquee();
    workInit();
    works();
    contact();
    counters();
    var game = arcade();
    route(true);
    window.addEventListener('hashchange', function () { route(false); });
    metal();
    magnets();
    loader(hero);

    var px = 0, py = 0, pending = false;
    window.addEventListener('pointermove', function (e) {
      px = e.clientX; py = e.clientY;
      if (!pending && !REDUCE) { pending = true; requestAnimationFrame(function () { pending = false; warpMove(px, py); }); }
    }, { passive: true });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (game.isOpen()) return game.close();
      lightbox.close();
    });
  });
})();
