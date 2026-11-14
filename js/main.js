/* QUEENIE — player file. Vanilla JS, no dependencies. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ---------- storage (safe) ---------- */
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    sget: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    sset: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- sound (off by default) ---------- */
  var sound = (function () {
    var ctx = null, on = false, last = 0;
    function beep(freq, dur, type, vol) {
      if (!on || !ctx) return;
      var o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
      o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol || 0.04, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.08));
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + (dur || 0.08));
    }
    return {
      toggle: function () {
        on = !on;
        if (on && !ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { on = false; } }
        if (on && ctx && ctx.state === 'suspended') ctx.resume();
        if (on) beep(660, 0.12);
        return on;
      },
      hover: function () { var n = performance.now(); if (n - last > 70) { last = n; beep(980, 0.03, 'square', 0.015); } },
      click: function () { beep(420, 0.07, 'square', 0.04); },
      unlock: function () { beep(523, 0.09); setTimeout(function () { beep(784, 0.09); }, 90); setTimeout(function () { beep(1047, 0.16); }, 180); },
      bad: function () { beep(140, 0.15, 'sawtooth', 0.05); },
      tick: function () { beep(300, 0.04, 'triangle', 0.03); }
    };
  })();

  /* ---------- toasts ---------- */
  function toast(title, small, plain) {
    var box = $('#toasts'); if (!box) return;
    var t = document.createElement('div');
    t.className = 'toast' + (plain ? ' is-plain' : '');
    t.innerHTML = '<small></small><b></b>';
    t.firstChild.textContent = small || '';
    t.lastChild.textContent = title;
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, 3800);
  }

  /* ---------- achievements ---------- */
  var TROPHIES = [
    ['start', 'Player one', 'Pressed start'],
    ['stir', 'Metal bender', 'Stirred the liquid metal'],
    ['tree', 'Fully specced', 'Unlocked the whole skill tree'],
    ['file', 'Background check', 'Read the character file'],
    ['spin', 'Stage hand', 'Rotated the mission stage'],
    ['m1', 'Mission 01', 'Opened the MedEasy case study'],
    ['m2', 'Mission 02', 'Opened the AirPal case study'],
    ['done', 'Completionist', 'Read a case study to the end'],
    ['throw', 'Mess maker', 'Threw a drawing across the canvas'],
    ['inspect', 'Art collector', 'Inspected a drawing up close'],
    ['signal', 'Signal sent', 'Copied the email address'],
    ['arcade', 'High score', 'Scored 10 or more in Idea Catcher']
  ];
  var got = store.get('q-trophies', {});
  function renderTrophies() {
    var n = TROPHIES.filter(function (t) { return got[t[0]]; }).length;
    $('#trophyCount').textContent = n + '/' + TROPHIES.length;
    $('#hudLevel').textContent = ('0' + (n + 1)).slice(-2);
    $('#hudXp').style.width = (n / TROPHIES.length * 100) + '%';
    var ul = $('#trophyList'); ul.innerHTML = '';
    TROPHIES.forEach(function (t) {
      var li = document.createElement('li');
      if (got[t[0]]) li.className = 'is-got';
      var b = document.createElement('b'); b.textContent = t[1];
      var d = document.createElement('div'); d.appendChild(b); d.appendChild(document.createTextNode(got[t[0]] ? t[2] : 'Locked — ' + t[2]));
      li.appendChild(d); ul.appendChild(li);
    });
  }
  function award(id) {
    if (got[id]) return;
    var t = TROPHIES.filter(function (x) { return x[0] === id; })[0]; if (!t) return;
    got[id] = 1; store.set('q-trophies', got);
    renderTrophies(); sound.unlock();
    toast(t[1], 'Achievement unlocked');
  }

  /* ---------- boot sequence ---------- */
  function boot() {
    var el = $('#boot');
    function finish(first) {
      if (!el || el.dataset.done) return;
      el.dataset.done = '1';
      store.sset('q-booted', '1');
      document.body.classList.remove('is-booting');
      el.classList.add('is-leaving');
      setTimeout(function () { el.remove(); }, 600);
      window.dispatchEvent(new Event('q:start'));
      if (first) setTimeout(function () { award('start'); }, 700);
    }
    if (store.sget('q-booted')) { el.remove(); document.body.classList.remove('is-booting'); setTimeout(function () { window.dispatchEvent(new Event('q:start')); }, 0); return; }

    var lines = [
      'QUEENIE.SYS  v2026',
      'loading interface design ......... ok',
      'loading front-end prototyping .... ok',
      'calibrating liquid metal ......... ok',
      'location: Sydney, Australia',
      'player file found: ZIQI LIU',
      ''
    ];
    var log = $('#bootLog'), i = 0;
    function ready() { el.classList.add('is-ready'); $('#bootStart').focus(); }
    function next() {
      if (el.dataset.done) return;
      if (i >= lines.length) return ready();
      log.textContent += lines[i++] + '\n';
      setTimeout(next, 190);
    }
    if (REDUCE) { log.textContent = lines.join('\n'); ready(); } else { next(); }

    $('#bootStart').addEventListener('click', function () { finish(true); });
    $('#bootSkip').addEventListener('click', function () { finish(false); });
    document.addEventListener('keydown', function onKey(e) {
      if (el.dataset.done) return document.removeEventListener('keydown', onKey);
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); finish(e.key !== 'Escape'); }
    });
  }

  /* ---------- reticle cursor ---------- */
  function reticle() {
    if (!FINE) return;
    var el = $('#reticle'), label = $('#reticleLabel');
    document.documentElement.classList.add('has-reticle');
    var x = innerWidth / 2, y = innerHeight / 2;
    window.addEventListener('pointermove', function (e) {
      x = e.clientX; y = e.clientY; el.style.opacity = 1;
      el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      $('#hudCoords').textContent = 'X ' + ('00' + Math.round(x)).slice(-4) + ' / Y ' + ('00' + Math.round(y)).slice(-4);
    }, { passive: true });
    var cur = null;
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest && e.target.closest('[data-cursor], a, button, .zoomable');
      if (t === cur) return;
      cur = t;
      el.classList.toggle('is-active', !!t);
      label.textContent = t ? (t.getAttribute('data-cursor') || (t.classList.contains('zoomable') ? 'Zoom' : '')) : '';
      if (t) sound.hover();
    });
    document.addEventListener('pointerdown', function () { el.classList.add('is-down'); sound.click(); });
    document.addEventListener('pointerup', function () { el.classList.remove('is-down'); });
    document.addEventListener('mouseleave', function () { el.style.opacity = 0; });
    document.addEventListener('mouseenter', function () { el.style.opacity = 1; });
  }

  /* ---------- warped type ---------- */
  var warps = [];
  function splitWarp(el) {
    var text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.textContent = '';
    var chars = [];
    text.split(' ').forEach(function (word, wi, arr) {
      var w = document.createElement('span'); w.className = 'wd'; w.setAttribute('aria-hidden', 'true');
      word.split('').forEach(function (c) {
        var s = document.createElement('span'); s.className = 'ch'; s.textContent = c; s.style.setProperty('--w', REDUCE ? 100 : 50);
        w.appendChild(s); chars.push(s);
      });
      el.appendChild(w);
      if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return { el: el, chars: chars, visible: false, entered: false };
  }
  function warpInit() {
    $$('[data-warp]').forEach(function (el) { warps.push(splitWarp(el)); });
    if (!('IntersectionObserver' in window)) { warps.forEach(function (w) { w.chars.forEach(function (c) { c.style.setProperty('--w', 100); }); }); return; }
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
        if (!near) { c.style.setProperty('--w', 100); return; }
        var cr = c.getBoundingClientRect();
        var dx = (px - (cr.left + cr.width / 2)) / (r.width * 0.16 + 60);
        var f = Math.exp(-dx * dx);
        c.style.setProperty('--w', Math.round(78 + 72 * f));
      });
    });
  }

  /* ---------- hero word ---------- */
  function hero() {
    var word = $('#heroWord'), heroEl = $('#top');
    if (!word) return;
    var letters = $$('span', word), n = letters.length;
    var pointer = { x: 0.5, y: 0.5, t: 0 };

    function fit() {
      letters.forEach(function (l) { l.style.setProperty('--w', 100); });
      word.style.fontSize = '100px';
      var w = 0; letters.forEach(function (l) { w += l.getBoundingClientRect().width; });
      var W = heroEl.clientWidth, H = heroEl.clientHeight;
      var fs = (W * 0.95) / w * 100;
      word.style.fontSize = fs + 'px';
      var natural = fs * 0.74;
      var target = W < 700 ? H * 0.34 : H * 0.62;
      word.dataset.sy = clamp(target / natural, 1, 4.2);
      word.style.setProperty('--sy', word.dataset.sy);
    }

    function apply(now) {
      var auto = REDUCE ? false : (now - pointer.t > 2600);
      var cx = auto ? 0.5 + 0.46 * Math.sin(now / 1400) : pointer.x;
      var raw = [], sum = 0;
      for (var i = 0; i < n; i++) {
        var c = (i + 0.5) / n, d = (cx - c) / 0.2, f = Math.exp(-d * d);
        raw.push(f); sum += 55 + 95 * f;
      }
      var k = (100 * n) / sum;
      letters.forEach(function (l, i) {
        l.style.setProperty('--w', clamp((55 + 95 * raw[i]) * k, 50, 150).toFixed(1));
        l.classList.toggle('is-hot', raw[i] > 0.72 && !auto);
      });
      if (!auto) {
        var base = parseFloat(word.dataset.sy || 1.6);
        word.style.setProperty('--sy', (base * (0.86 + 0.28 * (1 - pointer.y))).toFixed(3));
      }
    }

    var running = false, visible = true;
    function loop(now) { running = false; if (!visible) return; apply(now); if (!REDUCE) { running = true; requestAnimationFrame(loop); } }
    function kick() { if (!running) { running = true; requestAnimationFrame(loop); } }

    window.addEventListener('pointermove', function (e) {
      var r = heroEl.getBoundingClientRect();
      if (e.clientY > r.bottom) return;
      pointer.x = clamp((e.clientX - r.left) / r.width, 0, 1);
      pointer.y = clamp((e.clientY - r.top) / r.height, 0, 1);
      pointer.t = performance.now();
    }, { passive: true });
    window.addEventListener('resize', fit);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(heroEl);
    function refit() { fit(); kick(); }
    if (document.fonts) {
      if (document.fonts.ready) document.fonts.ready.then(refit);
      if (document.fonts.load) document.fonts.load("900 100px Anybody").then(refit, function () {});
      if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', refit);
    }
    fit(); kick();

    if (window.QBlob) window.QBlob.start($('#blob'), { onStir: function () { award('stir'); } });
  }

  /* ---------- marquee reacts to scroll speed ---------- */
  function marquee() {
    var track = $('#marquee'); if (!track || REDUCE) return;
    var last = scrollY, v = 0;
    window.addEventListener('scroll', function () {
      v = clamp(Math.abs(scrollY - last), 0, 60); last = scrollY;
      track.style.setProperty('--mw', Math.round(120 - v * 1.1));
      clearTimeout(track._t); track._t = setTimeout(function () { track.style.setProperty('--mw', 120); }, 140);
    }, { passive: true });
    $$('span', track).forEach(function (s) { s.style.fontVariationSettings = "'wdth' var(--mw, 120), 'wght' 900"; });
  }

  /* ---------- HUD: scrollspy + quest ---------- */
  function hud() {
    var quest = $('#hudQuest'), links = $$('#mapList a');
    function setCurrent(id, text) {
      links.forEach(function (a) { a.classList.toggle('is-current', a.dataset.spy === id); if (a.dataset.spy === id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      if (text) quest.textContent = text;
    }
    hud.setCurrent = setCurrent;
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting && $('#home-page').classList.contains('is-active')) setCurrent(e.target.id, e.target.dataset.quest); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      $$('[data-quest]').forEach(function (s) { io.observe(s); });
    }
    setCurrent('top', $('#top').dataset.quest);

    var toggle = $('#mapToggle'), list = $('#mapList');
    toggle.addEventListener('click', function () { var o = list.classList.toggle('is-open'); toggle.setAttribute('aria-expanded', o); });
    list.addEventListener('click', function () { list.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); });

    var st = $('#soundToggle');
    st.addEventListener('click', function () { var on = sound.toggle(); st.setAttribute('aria-pressed', on); st.textContent = on ? 'Sound on' : 'Sound off'; });

    var tt = $('#trophyToggle'), panel = $('#trophyPanel');
    function setPanel(o) { panel.hidden = !o; tt.setAttribute('aria-expanded', o); }
    tt.addEventListener('click', function () { setPanel(panel.hidden); });
    $('#trophyClose').addEventListener('click', function () { setPanel(false); tt.focus(); });
    $('#trophyReset').addEventListener('click', function () { got = {}; store.set('q-trophies', got); renderTrophies(); toast('Progress reset', 'Save file', true); });
  }

  /* ---------- router ---------- */
  var PAGES = { medeasy: 'case-medeasy', airpal: 'case-airpal' };
  var currentPage = 'home-page';
  function route(initial) {
    var hash = (location.hash || '#top').slice(1);
    var pageId = PAGES[hash] || 'home-page';
    function show() {
      $$('.page').forEach(function (p) { var on = p.id === pageId; p.classList.toggle('is-active', on); p.hidden = !on; });
      currentPage = pageId;
      if (pageId === 'home-page') {
        var t = document.getElementById(hash);
        if (t) t.scrollIntoView({ behavior: 'instant', block: 'start' }); else window.scrollTo({ top: 0, behavior: 'instant' });
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
        chapters.opened = performance.now();
        hud.setCurrent('work', 'Read the mission briefing');
        award(hash === 'medeasy' ? 'm1' : 'm2');
        chapters.refresh();
      }
      window.dispatchEvent(new Event('resize'));
    }
    if (pageId === currentPage && !initial) return; // same page: let the browser scroll to the anchor
    if (initial || REDUCE) return show();
    var wipe = $('#wipe');
    wipe.classList.remove('is-on'); void wipe.offsetWidth; wipe.classList.add('is-on');
    setTimeout(show, 230);
    setTimeout(function () { wipe.classList.remove('is-on'); }, 520);
  }

  /* ---------- skill tree ---------- */
  function tree() {
    var box = $('#tree'); if (!box) return;
    var svg = $('#treeLines'), root = $('.tree-root', box), nodes = $$('.node', box), status = $('#treeStatus');
    var NS = 'http://www.w3.org/2000/svg', unlocked = 0;
    function draw() {
      var b = box.getBoundingClientRect(), r = root.getBoundingClientRect();
      var rx = r.left + r.width / 2 - b.left, ry = r.top + r.height / 2 - b.top;
      svg.setAttribute('viewBox', '0 0 ' + b.width + ' ' + b.height);
      nodes.forEach(function (n) {
        var q = n.getBoundingClientRect();
        var nx = q.left + q.width / 2 - b.left, ny = q.top + q.height / 2 - b.top;
        var vertical = b.width < 700;
        var d = vertical
          ? 'M' + rx + ' ' + ry + ' V' + ny + ' H' + (q.left - b.left)
          : 'M' + rx + ' ' + ry + ' H' + (rx + (nx - rx) * 0.5) + ' V' + ny + ' H' + nx;
        if (!n._p) { n._p = document.createElementNS(NS, 'path'); svg.appendChild(n._p); }
        n._p.setAttribute('d', d);
        n._p.style.setProperty('--len', Math.ceil(n._p.getTotalLength()));
        n._p.style.setProperty('--c', getComputedStyle(n).getPropertyValue('--c'));
      });
    }
    function unlock(n, i) {
      setTimeout(function () {
        n.classList.add('is-on', 'is-pop'); n._p.classList.add('is-on');
        unlocked++; status.textContent = unlocked + ' / ' + nodes.length + ' unlocked';
        sound.tick();
        if (unlocked === nodes.length) setTimeout(function () { award('tree'); }, 400);
      }, REDUCE ? 0 : 260 * i + 200);
    }
    draw();
    window.addEventListener('resize', draw);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', draw);
    var started = false;
    function begin() { if (started) return; started = true; draw(); nodes.forEach(unlock); }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { begin(); io.disconnect(); } }, { threshold: 0.35 });
      io.observe(box);
    } else begin();
    nodes.forEach(function (n) {
      $('button', n).addEventListener('click', function () {
        if (!n.classList.contains('is-on')) return;
        n.classList.remove('is-pop'); void n.offsetWidth; n.classList.add('is-pop');
      });
    });
  }

  /* ---------- character file: typewriter ---------- */
  function bio() {
    var box = $('#bio'); if (!box) return;
    function done() { award('file'); }
    if (REDUCE || !('IntersectionObserver' in window)) {
      if ('IntersectionObserver' in window) { var io0 = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { done(); io0.disconnect(); } }, { threshold: 0.6 }); io0.observe(box); }
      return;
    }
    var ps = $$('p', box).map(function (p) {
      var full = p.textContent;
      p.setAttribute('aria-label', full);
      p.textContent = '';
      var a = document.createElement('span'), caret = document.createElement('span'), b = document.createElement('span');
      a.setAttribute('aria-hidden', 'true'); b.setAttribute('aria-hidden', 'true');
      caret.className = 'caret'; caret.hidden = true; b.style.visibility = 'hidden'; b.textContent = full;
      p.appendChild(a); p.appendChild(caret); p.appendChild(b);
      return { full: full, a: a, b: b, caret: caret, i: 0 };
    });
    var k = 0;
    function step() {
      var p = ps[k]; if (!p) return done();
      p.caret.hidden = false;
      p.i = Math.min(p.full.length, p.i + 5);
      p.a.textContent = p.full.slice(0, p.i); p.b.textContent = p.full.slice(p.i);
      if (p.i >= p.full.length) { p.caret.hidden = true; k++; }
      requestAnimationFrame(step);
    }
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); step(); } }, { threshold: 0.3 });
    io.observe(box);
  }

  /* ---------- mission select: 3D stage ---------- */
  function stage() {
    var el = $('#stage'); if (!el) return;
    var carts = $$('.cart', el), briefs = $$('.brief-item'), N = carts.length;
    var pos = 0, target = 0, raf = 0, current = -1, spun = false;
    carts.forEach(function (c) { c.draggable = false; $$('img', c).forEach(function (i) { i.draggable = false; }); });

    function wrap(d) { d = ((d % N) + N) % N; return d > N / 2 ? d - N : d; }
    function render() {
      carts.forEach(function (c, i) {
        var d = wrap(i - pos), ad = Math.abs(d);
        c.style.setProperty('--d', d.toFixed(4));
        c.style.setProperty('--ad', ad.toFixed(4));
        c.style.setProperty('--o', clamp((1.5 - ad) / 0.3, 0, 1).toFixed(3));
        c.style.zIndex = 10 - Math.round(ad * 4);
      });
      var cur = ((Math.round(pos) % N) + N) % N;
      if (cur !== current) {
        if (current !== -1 && !spun) { spun = true; award('spin'); }
        current = cur;
        carts.forEach(function (c, i) { c.classList.toggle('is-current', i === cur); c.tabIndex = i === cur ? 0 : -1; c.setAttribute('data-cursor', i === cur ? 'Open' : 'Drag'); });
        briefs.forEach(function (b, i) { b.classList.toggle('is-current', i === cur); });
        sound.tick();
      }
    }
    function tick() {
      raf = 0;
      pos += (target - pos) * (REDUCE ? 1 : 0.14);
      if (Math.abs(target - pos) < 0.001) pos = target; else raf = requestAnimationFrame(tick);
      render();
    }
    function go(t) { target = t; if (!raf) raf = requestAnimationFrame(tick); }

    var drag = null;
    el.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.stage-arrow') || (e.pointerType === 'mouse' && e.button !== 0)) return;
      drag = { x: e.clientX, y: e.clientY, pos: pos, moved: false, w: carts[0].offsetWidth * 0.7 };
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - drag.y)) { drag.moved = true; cancelAnimationFrame(raf); raf = 0; }
      if (drag.moved) { pos = drag.pos - dx / drag.w; target = pos; render(); }
    }, { passive: true });
    function end() { if (!drag) return; var m = drag.moved; drag = null; if (m) { el._justDragged = true; setTimeout(function () { el._justDragged = false; }, 60); go(Math.round(pos)); } }
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);

    carts.forEach(function (c, i) {
      c.addEventListener('click', function (e) {
        if (el._justDragged) return e.preventDefault();
        if (i !== current) { e.preventDefault(); go(Math.round(pos) + wrap(i - Math.round(pos))); }
      });
    });
    $('#stagePrev').addEventListener('click', function () { go(Math.round(target) - 1); });
    $('#stageNext').addEventListener('click', function () { go(Math.round(target) + 1); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(Math.round(target) - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(Math.round(target) + 1); }
    });
    render();
  }

  /* ---------- lightbox ---------- */
  var lightbox = (function () {
    var box, img, info, lastFocus;
    function open(src, alt, infoNode) {
      box = box || $('#lightbox'); img = img || $('#lightboxImg'); info = info || $('#lightboxInfo');
      lastFocus = document.activeElement;
      img.src = src; img.alt = alt || '';
      info.innerHTML = '';
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
      document.addEventListener('click', function (e) {
        var z = e.target.closest && e.target.closest('.zoomable');
        if (z) open(z.currentSrc || z.src, z.alt);
      });
      box.addEventListener('keydown', function (e) { if (e.key === 'Tab') { e.preventDefault(); $('#lightboxClose').focus(); } });
    }
    return { open: open, close: close, init: init };
  })();

  /* ---------- free canvas ---------- */
  function board() {
    var el = $('#board'); if (!el) return;
    var pieces = $$('.piece', el);
    function inspect(p) {
      var im = $('img', p), cap = $('figcaption', p).cloneNode(true), wrap = document.createElement('div');
      while (cap.firstChild) wrap.appendChild(cap.firstChild);
      lightbox.open(im.currentSrc || im.src, im.alt, wrap);
      award('inspect');
    }
    pieces.forEach(function (p) {
      p.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inspect(p); } });
    });

    if (!FINE) { // touch: tidy grid, tap to inspect
      document.documentElement.classList.add('is-touch');
      $('.board-tools span').textContent = 'Tap a drawing to inspect';
      pieces.forEach(function (p, i) { p.style.setProperty('--pr', (i % 2 ? 1.2 : -1.2) + 'deg'); p.addEventListener('click', function () { inspect(p); }); });
      return;
    }

    var S = pieces.map(function () { return { x: 0, y: 0, r: 0, vx: 0, vy: 0 }; });
    var z = 1;
    function bounds(p) { return { w: el.clientWidth - p.offsetWidth, h: el.clientHeight - p.offsetHeight }; }
    function put(i) { var s = S[i], p = pieces[i]; p.style.setProperty('--px', s.x.toFixed(1) + 'px'); p.style.setProperty('--py', s.y.toFixed(1) + 'px'); p.style.setProperty('--pr', s.r.toFixed(2) + 'deg'); }
    var SLOTS = [[0.04, 0.10, -7], [0.30, 0.42, 5], [0.56, 0.06, -3], [0.74, 0.40, 8]];
    function layout(mode) {
      pieces.forEach(function (p, i) {
        var b = bounds(p), s = S[i];
        if (mode === 'tidy') { s.x = b.w * (i / (pieces.length - 1)); s.y = b.h * 0.5; s.r = 0; }
        else if (mode === 'shuffle') { s.x = Math.random() * b.w; s.y = Math.random() * b.h; s.r = Math.random() * 40 - 20; }
        else { s.x = clamp(el.clientWidth * SLOTS[i][0], 0, b.w); s.y = clamp(el.clientHeight * SLOTS[i][1], 0, b.h); s.r = SLOTS[i][2]; }
        s.vx = s.vy = 0; p.classList.remove('is-thrown'); put(i);
      });
    }
    layout();
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { layout(); }, 150); });
    $('#boardShuffle').addEventListener('click', function () { layout('shuffle'); });
    $('#boardTidy').addEventListener('click', function () { layout('tidy'); });

    pieces.forEach(function (p, i) {
      var d = null;
      p.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        p.setPointerCapture(e.pointerId);
        d = { x: e.clientX, y: e.clientY, sx: S[i].x, sy: S[i].y, moved: 0, lx: e.clientX, ly: e.clientY, lt: performance.now() };
        S[i].vx = S[i].vy = 0;
        p.classList.add('is-dragging'); p.classList.remove('is-thrown'); p.style.zIndex = ++z;
      });
      p.addEventListener('pointermove', function (e) {
        if (!d) return;
        var b = bounds(p), now = performance.now(), dt = Math.max(now - d.lt, 1);
        d.moved = Math.max(d.moved, Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y));
        S[i].vx = (e.clientX - d.lx) / dt * 16; S[i].vy = (e.clientY - d.ly) / dt * 16;
        d.lx = e.clientX; d.ly = e.clientY; d.lt = now;
        S[i].x = clamp(d.sx + e.clientX - d.x, -40, b.w + 40); S[i].y = clamp(d.sy + e.clientY - d.y, -40, b.h + 40);
        S[i].r = clamp(S[i].r + S[i].vx * 0.05, -25, 25);
        put(i);
      });
      function up() {
        if (!d) return;
        var moved = d.moved; d = null; p.classList.remove('is-dragging');
        if (moved < 6) return inspect(p);
        var sp = Math.abs(S[i].vx) + Math.abs(S[i].vy);
        if (sp > 26) award('throw');
        if (sp > 2 && !REDUCE) { p.classList.add('is-thrown'); fling(i); }
      }
      p.addEventListener('pointerup', up);
      p.addEventListener('pointercancel', up);
    });
    function fling(i) {
      var s = S[i], p = pieces[i];
      (function step() {
        if (!p.classList.contains('is-thrown')) return;
        var b = bounds(p);
        s.x += s.vx; s.y += s.vy; s.r += s.vx * 0.12; s.vx *= 0.94; s.vy *= 0.94;
        if (s.x < 0) { s.x = 0; s.vx *= -0.6; } if (s.x > b.w) { s.x = b.w; s.vx *= -0.6; }
        if (s.y < 0) { s.y = 0; s.vy *= -0.6; } if (s.y > b.h) { s.y = b.h; s.vy *= -0.6; }
        put(i);
        if (Math.abs(s.vx) + Math.abs(s.vy) > 0.3) requestAnimationFrame(step); else p.classList.remove('is-thrown');
      })();
    }
  }

  /* ---------- contact ---------- */
  function contact() {
    var count = $('#countdown'), sec = $('#contact'), n = 9, timer = 0;
    function tick() {
      n = n <= 0 ? 9 : n - 1;
      count.textContent = n;
      count.classList.remove('is-tick'); void count.offsetWidth; count.classList.add('is-tick');
      sound.tick();
    }
    if (!REDUCE && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        clearInterval(timer);
        if (es[0].isIntersecting) timer = setInterval(tick, 1000);
      }, { threshold: 0.2 }).observe(sec);
    }
    var btn = $('#mailCopy'), mail = '54liuzi7@gmail.com';
    function ok() {
      btn.classList.add('is-copied'); $('span', btn).textContent = 'Copied!';
      toast('Email copied to clipboard', 'Signal sent', true); award('signal');
      setTimeout(function () { btn.classList.remove('is-copied'); $('span', btn).textContent = mail; }, 1600);
    }
    btn.addEventListener('click', function () {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(mail).then(ok, fallback); else fallback();
      function fallback() {
        try { var ta = document.createElement('textarea'); ta.value = mail; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); ok(); }
        catch (e) { location.href = 'mailto:' + mail; }
      }
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
        var prog = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
        c.bar.style.width = (prog * 100) + '%';
        var cur = -1;
        c.items.forEach(function (it, i) { if (it.ch.getBoundingClientRect().top < innerHeight * 0.45) cur = i; });
        c.items.forEach(function (it, i) { it.a.classList.toggle('is-current', i === cur); it.a.classList.toggle('is-done', i < cur); });
        if (prog > 0.97 && max > innerHeight && performance.now() - (api.opened || 0) > 4000) award('done');
      });
    }
    var api = { init: init, refresh: refresh, opened: 0 };
    return api;
  })();

  /* ---------- mini game: Idea Catcher ---------- */
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
        var bug = Math.random() < 0.25;
        state.items.push({ x: 20 + Math.random() * (W - 40), y: -12, v: 2.4 + Math.random() * 2 + (30 - left) * 0.06, bug: bug, c: COLORS[(Math.random() * 4) | 0] });
      }
      state.items = state.items.filter(function (it) {
        it.y += it.v * dt;
        if (it.y > H - 34 && it.y < H - 12 && Math.abs(it.x - state.x) < 46) {
          if (it.bug) { state.score = Math.max(0, state.score - 2); sound.bad(); } else { state.score++; sound.tick(); }
          return false;
        }
        return it.y < H + 20;
      });
      scoreEl.textContent = state.score; timeEl.textContent = Math.max(0, Math.ceil(left));
      draw();
      if (left <= 0) return over();
      raf = requestAnimationFrame(loop);
    }
    function over() {
      var s = state.score; state = null;
      msg.textContent = s >= 10 ? 'Final score ' + s + '. New ideas secured.' : 'Final score ' + s + '. Catch 10 to earn the trophy.';
      play.hidden = false; play.textContent = 'Play again'; play.focus();
      if (s >= 10) award('arcade');
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
      if (e.key === 'Tab') { // keep focus inside
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

    // Konami code: ↑ ↑ ↓ ↓ ← → ← → B A — opens the game with a head start
    var code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'], ci = 0;
    document.addEventListener('keydown', function (e) {
      if (!box.hidden) return;
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      ci = k === code[ci] ? ci + 1 : (k === code[0] ? 1 : 0);
      if (ci === code.length) { ci = 0; toast('Cheat code accepted: +5 ideas', 'Secret', true); open(5); }
    });
    return { close: close, isOpen: function () { return !box.hidden; } };
  }

  /* ---------- go ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    renderTrophies();
    warpInit();
    hud();
    chapters.init();
    lightbox.init();
    reticle();
    marquee();
    stage();
    board();
    contact();
    var game = arcade();

    route(true);
    window.addEventListener('hashchange', function () { route(false); });

    // these wait for PRESS START so their entrance is seen
    window.addEventListener('q:start', function () { hero(); tree(); bio(); }, { once: true });
    boot();

    var px = 0, py = 0, pending = false;
    window.addEventListener('pointermove', function (e) {
      px = e.clientX; py = e.clientY;
      if (!pending && !REDUCE) { pending = true; requestAnimationFrame(function () { pending = false; warpMove(px, py); }); }
    }, { passive: true });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (game.isOpen()) return game.close();
      lightbox.close();
      $('#trophyPanel').hidden = true; $('#trophyToggle').setAttribute('aria-expanded', 'false');
    });
  });
})();
