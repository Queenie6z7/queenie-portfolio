/* Shape-shifting liquid metal — one raymarched object that follows the whole page.
   Shapes are signed distance fields; morphing blends two of them.
   Only the pixels around the object are shaded (scissor + bounding spheres),
   which is what lets it run at full sharpness without slowing the page.
   No libraries. If WebGL is unavailable start() returns null. */
(function () {
  'use strict';

  // shape ids — keep in sync with data-shape in index.html
  // 0 blob (one eye) · 1 droplets · 2 pill · 3 bag · 4 ring · 5 shuttlecock · 6 gem · 7 envelope · 8 robot arm
  var FRAG = [
    'precision highp float;',
    'uniform vec2 uRes; uniform float uT; uniform vec3 uMouse; uniform float uStir; uniform float uZoom;',
    'uniform vec2 uCenter; uniform float uScale; uniform float uA; uniform float uB; uniform float uMix;',
    'uniform mat3 uRot; uniform vec3 uTint; uniform vec3 uDrop[7]; uniform float uEye; uniform float uBlink; uniform float uBound;',
    'const vec3 EYE = vec3(0.06, 0.10, 0.52);',
    'float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0); return mix(b, a, h) - k*h*(1.0-h); }',
    'float rbox(vec3 p, vec3 b, float r){ vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r; }',
    'float torus(vec3 p, vec2 t){ vec2 q = vec2(length(p.xy) - t.x, p.z); return length(q) - t.y; }',
    'float cap(vec3 p, vec3 a, vec3 b, float r){ vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }',
    'float shape(vec3 p, float id){',
    '  float t = uT;',
    '  if (id < 0.5) {',
    '    float d = length(p) - 0.66;',
    '    d = smin(d, length(p - 0.62*vec3(sin(t*0.70), cos(t*0.90), -0.4 + 0.3*sin(t*0.50))) - 0.30, 0.42);',
    '    d = smin(d, length(p - 0.66*vec3(sin(t*0.55+2.1), cos(t*0.45+1.7), -0.4 + 0.3*cos(t*0.8))) - 0.34, 0.42);',
    '    d = smin(d, length(p - 0.58*vec3(cos(t*0.62+4.0), sin(t*0.74+3.2), -0.4 + 0.3*sin(t*0.6+2.0))) - 0.26, 0.42);',
    '    if (uEye > 0.02) d = smin(d, length(p - EYE) - 0.27*uEye, 0.03);',
    '    return d;',
    '  }',
    '  if (id < 1.5) {',
    '    float d = 10.0;',
    '    for (int i = 0; i < 7; i++) d = smin(d, length(p - uDrop[i]) - 0.15, 0.10);',
    '    return d;',
    '  }',
    '  vec3 q = uRot * p;',
    '  if (id < 2.5) {', // pill
    '    vec3 c = q; c.x -= clamp(c.x, -0.44, 0.44);',
    '    return max(length(c) - 0.31, 0.014 - abs(q.x));',
    '  }',
    '  if (id < 3.5) {', // bag
    '    float d = rbox(q, vec3(0.50, 0.26, 0.15), 0.12);',
    '    d = smin(d, torus(q - vec3(0.0, 0.16, 0.0), vec2(0.62, 0.04)), 0.05);',
    '    d = min(d, rbox(q - vec3(0.0, 0.0, 0.29), vec3(0.30, 0.15, 0.012), 0.02));',
    '    return d;',
    '  }',
    '  if (id < 4.5) return torus(q, vec2(0.50, 0.18));',
    '  if (id < 5.5) {', // shuttlecock: cork + flared skirt
    '    vec3 s = q; s.y += 0.1;',
    '    float cork = length(s - vec3(0.0, -0.42, 0.0)) - 0.2;',
    '    float h = clamp((s.y + 0.3) / 0.85, 0.0, 1.0);',
    '    float rad = mix(0.16, 0.56, h);',
    '    float cone = abs(length(s.xz) - rad) - 0.022;',
    '    cone = max(cone, abs(s.y - 0.125) - 0.425);',
    '    float ribs = 0.012 * sin(atan(s.z, s.x) * 16.0);',
    '    return smin(cork, cone + ribs, 0.05);',
    '  }',
    '  if (id < 6.5) { vec3 a = abs(q); return (a.x + a.y + a.z - 0.74) * 0.57735 - 0.06; }',
    '  if (id < 7.5) {', // envelope
    '    float d = rbox(q, vec3(0.64, 0.42, 0.07), 0.05);',
    '    float g = abs(q.y - (0.30 - abs(q.x) * 0.78)) - 0.014;',
    '    return max(d, -max(g, 0.06 - q.z));',
    '  }',
    '  float a1 = 0.45 + 0.35*sin(t*0.9), a2 = a1 - 1.7 + 0.45*sin(t*1.3 + 1.0);', // robot arm
    '  vec3 J0 = vec3(0.12, -0.50, 0.0);',
    '  vec3 J1 = J0 + 0.58*vec3(-sin(a1), cos(a1), 0.0);',
    '  vec3 J2 = J1 + 0.52*vec3(-sin(a2), cos(a2), 0.0);',
    '  vec3 dir = normalize(J2 - J1); vec3 per = vec3(-dir.y, dir.x, 0.0);',
    '  float d = rbox(q - vec3(0.12, -0.64, 0.0), vec3(0.26, 0.05, 0.26), 0.04);',
    '  d = min(d, cap(q, J0, J1, 0.10)); d = min(d, cap(q, J1, J2, 0.085));',
    '  d = min(d, length(q - J0) - 0.16); d = min(d, length(q - J1) - 0.14); d = min(d, length(q - J2) - 0.11);',
    '  d = min(d, cap(q, J2 + per*0.07, J2 + per*0.10 + dir*0.22, 0.035));',
    '  d = min(d, cap(q, J2 - per*0.07, J2 - per*0.10 + dir*0.22, 0.035));',
    '  return d;',
    '}',
    'float map(vec3 p){',
    '  vec3 l = (p - vec3(uCenter, 0.0)) / uScale;',
    '  float d;',
    '  if (uMix < 0.002) d = shape(l, uA);',
    '  else if (uMix > 0.998) d = shape(l, uB);',
    '  else {',
    '    d = mix(shape(l, uA), shape(l, uB), uMix);',
    '    d += 0.05 * sin(uMix * 3.14159) * sin(l.x*6.0 + uT*3.0) * sin(l.y*5.0 - uT*2.0) * sin(l.z*4.0 + uT);',
    '  }',
    '  d *= uScale;',
    '  d = smin(d, length(p - uMouse) - 0.2, 0.42);',
    '  d += 0.022 * uStir * sin(p.x*7.0 + uT*5.0) * sin(p.y*6.0 - uT*4.0) * sin(p.z*5.0 + uT*3.0);',
    '  return d;',
    '}',
    // a soft studio: one big top light, two coloured side panels, a violet floor
    'vec3 env(vec3 d){',
    '  float a = atan(d.x, d.z);',
    '  vec3 col = mix(vec3(0.05, 0.02, 0.16), vec3(0.008, 0.008, 0.02), smoothstep(-1.0, 0.1, d.y));',
    '  col += vec3(1.0, 0.98, 1.0) * smoothstep(0.55, 0.92, d.y) * 1.25;',
    '  col += uTint * (0.25 + 0.75 * smoothstep(0.15, 0.6, d.y)) * smoothstep(0.75, 0.0, abs(a - 1.15)) * 1.5;',
    '  col += vec3(1.0, 0.24, 0.92) * smoothstep(0.7, 0.0, abs(a + 1.25)) * (0.4 + 0.6 * smoothstep(-0.5, 0.4, d.y)) * 1.15;',
    '  col += vec3(0.45, 0.4, 1.0) * smoothstep(0.0, -0.9, d.y) * 0.55;',
    '  col += vec3(0.45, 0.97, 1.0) * pow(max(0.0, -d.z), 3.0) * 0.5;',
    '  col += vec3(1.0) * pow(max(0.0, dot(d, normalize(vec3(-0.35, 0.5, 0.8)))), 60.0) * 2.2;',
    '  return col;',
    '}',
    'vec3 tone(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }',
    'void main(){',
    '  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y * uZoom;',
    '  vec3 ro = vec3(0.0, 0.0, 3.4);',
    '  vec3 rd = normalize(vec3(uv, -1.7));',
    // skip rays that cannot touch the object or the pointer droplet
    '  vec3 oc = vec3(uCenter, 0.0) - ro; float tc = dot(oc, rd); float d2 = dot(oc, oc) - tc * tc;',
    '  vec3 om = uMouse - ro; float tm = dot(om, rd); float m2 = dot(om, om) - tm * tm;',
    '  float R = uBound * uScale;',
    '  if (d2 > R * R && m2 > 0.5) { gl_FragColor = vec4(0.0); return; }',
    '  float t = max(1.0, min(tc - R, tm - 0.75));',
    '  float md = 10.0; bool hit = false;',
    '  for (int i = 0; i < 52; i++) {',
    '    float d = map(ro + rd * t);',
    '    md = min(md, d);',
    '    if (d < 0.0018) { hit = true; break; }',
    '    t += d * 0.9;',
    '    if (t > 6.5) break;',
    '  }',
    '  if (!hit) { float g = smoothstep(0.012, 0.0, md); gl_FragColor = vec4(vec3(0.85, 0.82, 1.0) * g * 0.9, g); return; }',
    '  vec3 p = ro + rd * t;',
    '  vec2 e = vec2(0.0015, -0.0015);',
    '  vec3 n = normalize(e.xyy*map(p+e.xyy) + e.yyx*map(p+e.yyx) + e.yxy*map(p+e.yxy) + e.xxx*map(p+e.xxx));',
    '  vec3 r = reflect(rd, n);',
    '  float fr = pow(1.0 - max(dot(n, -rd), 0.0), 4.0);',
    '  float ao = clamp(map(p + n * 0.18) / 0.18, 0.0, 1.0);',
    '  vec3 col = env(r) * mix(0.55, 1.0, ao);',
    '  col += fr * (0.25 + 0.55 * (0.5 + 0.5 * cos(6.2831 * (fr * 1.2 + n.y * 0.35 + vec3(0.0, 0.33, 0.67)))));',
    '  if (uEye > 0.3) {', // one detailed eye on the blob
    '    vec3 l = (p - vec3(uCenter, 0.0)) / uScale; vec3 v = l - EYE; float er = 0.27 * uEye;',
    '    float lid = er * (1.0 - uBlink) - abs(v.y - 0.02);',
    '    if (length(v) < er + 0.01 && lid > 0.0) {',
    '      vec3 en = normalize(v);',
    '      vec3 look = normalize(vec3(clamp((uMouse.xy - uCenter) / uScale - EYE.xy, -1.6, 1.6) * 0.55, 1.0));',
    '      vec3 up = normalize(cross(look, vec3(1.0, 0.0, 0.0))); vec3 rt = cross(up, look);',
    '      float c = dot(en, look); float rr = acos(clamp(c, -1.0, 1.0)) / 0.62;', // 0 centre .. 1 iris edge
    '      float ang = atan(dot(en, up), dot(en, rt));',
    '      float fib = 0.5 + 0.5 * sin(ang * 46.0 + sin(ang * 9.0) * 2.5 + rr * 9.0);',
    '      fib = mix(fib, 0.5 + 0.5 * sin(ang * 17.0 - rr * 14.0), 0.35);',
    '      vec3 sclera = vec3(0.97, 0.96, 1.0) * (0.62 + 0.38 * smoothstep(-0.5, 0.9, en.y)) - vec3(0.0, 0.05, 0.03) * smoothstep(0.55, 0.0, c);',
    '      vec3 iris = mix(vec3(0.42, 0.25, 1.0), uTint, smoothstep(0.35, 0.95, rr)) * (0.5 + 0.7 * fib);',
    '      iris *= 1.0 - 0.75 * smoothstep(0.82, 1.0, rr);', // limbal ring
    '      iris = mix(iris, vec3(1.0, 0.95, 0.6) * 0.9, 0.35 * smoothstep(0.55, 0.36, rr) * fib);', // warm collarette
    '      float pupil = 0.36 + 0.05 * sin(uT * 0.8) - 0.08 * min(uStir, 1.0);',
    '      vec3 ec = mix(iris, sclera, smoothstep(0.97, 1.03, rr));',
    '      ec = mix(vec3(0.01, 0.0, 0.03), ec, smoothstep(pupil - 0.03, pupil + 0.03, rr));',
    '      ec += env(r) * 0.16;', // wet cornea
    '      ec += vec3(1.0) * smoothstep(0.985, 0.995, dot(en, normalize(vec3(-0.38, 0.5, 0.78)))) * 1.4;',
    '      ec += vec3(1.0) * smoothstep(0.996, 0.999, dot(en, normalize(vec3(0.3, -0.25, 0.92)))) * 0.6;',
    '      ec *= 0.45 + 0.55 * smoothstep(0.0, 0.05, lid);', // lid shadow
    '      float edge = smoothstep(er + 0.01, er - 0.006, length(v));',
    '      col = mix(col, ec, edge);',
    '    }',
    '  }',
    '  gl_FragColor = vec4(tone(col * 1.05), 1.0);',
    '}'
  ].join('\n');
  var VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';

  function start(canvas) {
    var gl = null;
    try { gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'high-performance' }); } catch (e) {}
    if (!gl) return null;
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
    } catch (e) { if (window.console) console.warn('metal: shader failed', e); return null; }

    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.SCISSOR_TEST);

    var U = {};
    ['uRes', 'uT', 'uMouse', 'uStir', 'uZoom', 'uCenter', 'uScale', 'uA', 'uB', 'uMix', 'uRot', 'uTint', 'uDrop', 'uEye', 'uBlink', 'uBound'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    var api = { w: 1, h: 1, cssW: 1, cssH: 1, zoom: 1, quality: 1, px: 1 };
    api.resize = function () {
      api.cssW = canvas.clientWidth || innerWidth; api.cssH = canvas.clientHeight || innerHeight;
      api.zoom = api.cssW < 700 ? 1.9 : (api.cssW < 1100 ? 1.35 : 1.0);
      api.px = Math.min(window.devicePixelRatio || 1, 2) * 0.8 * api.quality; // canvas pixels per CSS pixel
      api.w = Math.max(2, Math.round(api.cssW * api.px)); api.h = Math.max(2, Math.round(api.cssH * api.px));
      canvas.width = api.w; canvas.height = api.h;
      gl.viewport(0, 0, api.w, api.h);
    };
    api.project = function (x, y, z) {
      var k = 1.7 / (3.4 - (z || 0)) / api.zoom;
      return [(x * k * api.cssH + api.cssW) / 2, api.cssH / 2 - y * k * api.cssH / 2];
    };
    api.unproject = function (px, py, z) {
      var k = (3.4 - (z || 0)) / 1.7 * api.zoom;
      return [((px * 2 - api.cssW) / api.cssH) * k, -((py * 2 - api.cssH) / api.cssH) * k];
    };
    // screen box (canvas pixels, y up) around a world-space sphere
    function box(x, y, z, r) {
      var c = api.project(x, y, z), rp = r * (1.7 / (3.4 - z - r) / api.zoom) * api.cssH / 2 + 6;
      return [(c[0] - rp) * api.px, (api.cssH - c[1] - rp) * api.px, (c[0] + rp) * api.px, (api.cssH - c[1] + rp) * api.px];
    }
    function pass(b) {
      var x0 = Math.max(0, Math.floor(b[0])), y0 = Math.max(0, Math.floor(b[1]));
      var x1 = Math.min(api.w, Math.ceil(b[2])), y1 = Math.min(api.h, Math.ceil(b[3]));
      if (x1 <= x0 || y1 <= y0) return;
      gl.scissor(x0, y0, x1 - x0, y1 - y0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    api.render = function (s) {
      var bound = (s.a === 1 || s.b === 1) ? 1.45 : 1.38;
      gl.scissor(0, 0, api.w, api.h);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.uRes, api.w, api.h);
      gl.uniform1f(U.uT, s.t);
      gl.uniform3f(U.uMouse, s.mx, s.my, 0.15);
      gl.uniform1f(U.uStir, s.stir);
      gl.uniform1f(U.uZoom, api.zoom);
      gl.uniform2f(U.uCenter, s.cx, s.cy);
      gl.uniform1f(U.uScale, s.scale);
      gl.uniform1f(U.uA, s.a); gl.uniform1f(U.uB, s.b); gl.uniform1f(U.uMix, s.mix);
      gl.uniformMatrix3fv(U.uRot, false, s.rot);
      gl.uniform3f(U.uTint, s.tint[0], s.tint[1], s.tint[2]);
      gl.uniform3fv(U.uDrop, s.drops);
      gl.uniform1f(U.uEye, s.eye); gl.uniform1f(U.uBlink, s.blink);
      gl.uniform1f(U.uBound, bound);
      var A = box(s.cx, s.cy, 0, bound * s.scale), B = box(s.mx, s.my, 0.15, 0.72);
      var overlap = !(B[2] < A[0] || B[0] > A[2] || B[3] < A[1] || B[1] > A[3]);
      if (overlap) pass([Math.min(A[0], B[0]), Math.min(A[1], B[1]), Math.max(A[2], B[2]), Math.max(A[3], B[3])]);
      else { pass(A); pass(B); }
    };
    api.resize();
    return api;
  }

  window.QMetal = { start: start };
})();
