/* Liquid chrome blob — raymarched metaballs in a single fragment shader.
   No libraries. Falls back to a CSS shape when WebGL or motion is unavailable. */
(function () {
  'use strict';

  var FRAG = [
    'precision highp float;',
    'uniform vec2 uRes; uniform float uT; uniform vec2 uMouse; uniform float uStir; uniform vec2 uCenter; uniform float uZoom;',
    'float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0); return mix(b, a, h) - k*h*(1.0-h); }',
    'float map(vec3 p){',
    '  vec3 c = vec3(uCenter, 0.0);',
    '  float t = uT;',
    '  float d = length(p - c) - 0.66;',
    '  d = smin(d, length(p - c - 0.62*vec3(sin(t*0.70), cos(t*0.90), sin(t*0.50))) - 0.30, 0.42);',
    '  d = smin(d, length(p - c - 0.66*vec3(sin(t*0.55+2.1), cos(t*0.45+1.7), cos(t*0.8))) - 0.34, 0.42);',
    '  d = smin(d, length(p - c - 0.58*vec3(cos(t*0.62+4.0), sin(t*0.74+3.2), sin(t*0.6+2.0))) - 0.26, 0.42);',
    '  d = smin(d, length(p - vec3(uMouse, 0.15)) - 0.24, 0.5);',
    '  d += 0.035 * uStir * sin(p.x*9.0 + t*5.0) * sin(p.y*8.0 - t*4.0) * sin(p.z*7.0 + t*3.0);',
    '  return d;',
    '}',
    'vec3 env(vec3 d){',
    '  float a = atan(d.z, d.x);',
    '  vec3 lime = vec3(0.78, 1.0, 0.0), cyan = vec3(0.0, 0.88, 1.0), pink = vec3(1.0, 0.17, 0.84), yel = vec3(1.0, 0.9, 0.0);',
    '  vec3 col = vec3(0.015);',
    '  col += pink * pow(max(0.0, sin(a*2.0 + 1.0 + uT*0.25)), 6.0) * 1.5;',
    '  col += cyan * pow(max(0.0, sin(a*2.0 + 3.9 - uT*0.2)), 6.0) * 1.5;',
    '  col += lime * smoothstep(0.45, 0.95, d.y) * 1.5;',
    '  col += yel  * smoothstep(-0.45, -0.95, d.y) * 1.1;',
    '  col += vec3(1.0) * pow(max(0.0, d.z), 18.0) * 1.3;',
    '  col += 0.22 * step(0.9, fract(d.y * 7.0 + uT * 0.15));',
    '  return col;',
    '}',
    'void main(){',
    '  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y * uZoom;',
    '  vec3 ro = vec3(0.0, 0.0, 3.4);',
    '  vec3 rd = normalize(vec3(uv, -1.7));',
    '  float t = 1.4; float md = 10.0; bool hit = false;',
    '  for (int i = 0; i < 44; i++) {',
    '    float d = map(ro + rd * t);',
    '    md = min(md, d);',
    '    if (d < 0.003) { hit = true; break; }',
    '    t += d * 0.9;',
    '    if (t > 6.0) break;',
    '  }',
    '  if (!hit) { float g = smoothstep(0.02, 0.0, md); gl_FragColor = vec4(vec3(0.9) * g, g); return; }',
    '  vec3 p = ro + rd * t;',
    '  vec2 e = vec2(0.002, -0.002);',
    '  vec3 n = normalize(e.xyy*map(p+e.xyy) + e.yyx*map(p+e.yyx) + e.yxy*map(p+e.yxy) + e.xxx*map(p+e.xxx));',
    '  vec3 r = reflect(rd, n);',
    '  float fr = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);',
    '  vec3 col = env(r) * (0.85 + 0.5 * fr) + fr * 0.35;',
    '  col = pow(col, vec3(0.85));',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  var VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';

  function start(canvas, opts) {
    opts = opts || {};
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var gl = null;
    try { gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false }); } catch (e) {}
    if (!gl) { canvas.classList.add('is-fallback'); return null; }

    function shader(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
    } catch (e) { canvas.classList.add('is-fallback'); return null; }

    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    var U = {};
    ['uRes', 'uT', 'uMouse', 'uStir', 'uCenter', 'uZoom'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    var w = 1, h = 1, small = false;
    var mouse = { x: 0.9, y: -0.2, tx: 0.9, ty: -0.2, last: 0 };
    var stir = 0, stirTotal = 0, visible = true, raf = 0;

    function resize() {
      var r = canvas.getBoundingClientRect();
      small = r.width < 700;
      var scale = Math.min(window.devicePixelRatio || 1, 1.5) * (small ? 0.7 : 0.6);
      w = Math.max(2, Math.round(r.width * scale));
      h = Math.max(2, Math.round(r.height * scale));
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
      if (reduce) draw(8.0);
    }

    function onMove(ev) {
      var r = canvas.getBoundingClientRect();
      if (ev.clientY < r.top || ev.clientY > r.bottom) return;
      var x = ((ev.clientX - r.left) / r.width * 2 - 1) * (r.width / r.height);
      var y = -((ev.clientY - r.top) / r.height * 2 - 1);
      // project screen position onto the z=0.15 plane the droplet lives on
      var k = (3.4 - 0.15) / 1.7 * (small ? 1.9 : 1.0);
      var nx = x * k, ny = y * k;
      var dx = nx - mouse.tx, dy = ny - mouse.ty;
      var sp = Math.min(Math.sqrt(dx * dx + dy * dy) * 6, 1.5);
      stir = Math.min(stir + sp * 0.35, 1.6);
      stirTotal += sp;
      mouse.tx = nx; mouse.ty = ny; mouse.last = performance.now();
      if (opts.onStir && stirTotal > 40) { opts.onStir(); opts.onStir = null; }
    }

    function draw(t) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.uRes, w, h);
      gl.uniform1f(U.uT, t);
      gl.uniform2f(U.uMouse, mouse.x, mouse.y);
      gl.uniform1f(U.uStir, stir);
      gl.uniform2f(U.uCenter, small ? 0.0 : 0.42, small ? 1.25 : 0.2);
      gl.uniform1f(U.uZoom, small ? 1.9 : 1.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      var t = now / 1000;
      if (now - mouse.last > 2600) { // idle: droplet wanders on its own
        mouse.tx = Math.sin(t * 0.6) * 1.5;
        mouse.ty = (small ? 1.25 : 0.2) + Math.cos(t * 0.8) * 0.75;
      }
      mouse.x += (mouse.tx - mouse.x) * 0.09;
      mouse.y += (mouse.ty - mouse.y) * 0.09;
      stir *= 0.95;
      draw(t);
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && !reduce) raf = requestAnimationFrame(frame); }

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('visibilitychange', kick);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; kick(); }).observe(canvas);
    }
    resize();
    kick();
    return { resize: resize, kick: kick };
  }

  window.QBlob = { start: start };
})();
