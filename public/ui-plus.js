// ui-plus.js - gorsel yukseltme (bagimliliksiz, derleme yok, CSP: yalnizca 'self')
//  1) WebGL "ipek dalga" zemini (meshh.dev ilhamli, kendi shader'imiz). Pil dostu: dusuk cozunurluk,
//     kare siniri, sekme/panel acikken durur, hareket azaltma tercihine uyar. Hata olursa CSS yedegine duser.
//  2) Dokunma dalgasi icin basilan nokta (--rx/--ry)
//  3) Avatarlar icin isimden sabit ton (--h)
(() => {
  'use strict';
  const root = document.documentElement;
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);

  /* ---------- 1. Zemin ---------- */
  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 uRes; uniform float uTime;',
    'uniform vec3 uBase; uniform vec3 uA; uniform vec3 uB; uniform float uRidge; uniform float uVig;',
    'void main(){',
    '  vec2 q = gl_FragCoord.xy / uRes;',
    '  vec2 p = (q - .5) * vec2(uRes.x / uRes.y, 1.) * 2.2;',
    '  float t = uTime * .06;',
    '  for (int i = 1; i < 5; i++) {',
    '    float fi = float(i);',
    '    p += vec2(.42 / fi * sin(fi * 1.7 * p.y + t * (1. + .3 * fi) + 1.3 * fi),',
    '              .42 / fi * cos(fi * 1.5 * p.x - t * (.9 + .25 * fi) + .7 * fi));',
    '  }',
    '  float f = .5 + .5 * sin(p.x * 1.6 + p.y * 1.1 + t * 1.5);',
    '  float ridge = pow(1. - abs(sin(p.x * 2.4 - p.y * 1.3 + t)), 12.);',
    '  vec3 col = uBase;',
    '  col = mix(col, uA, smoothstep(.15, 1., f) * .55);',
    '  col = mix(col, uB, smoothstep(0., 1., 1. - f) * .35);',
    '  col += uA * ridge * uRidge;',
    '  float vig = 1. - smoothstep(.25, 1.25, length(q - .5) * 1.4);',
    '  col *= 1. - uVig * (1. - vig);',
    '  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - .5) / 255.;',
    '  gl_FragColor = vec4(col, 1.);',
    '}',
  ].join('\n');

  // Paletler (0-1 arasi rgb). Koyu: neredeyse siyah, cok soluk krem/lavanta. Acik: soluk yesil/lavanta.
  const PAL = {
    dark:  { base: [.012, .012, .014], a: [.145, .14, .125], b: [.09, .075, .16], ridge: .22, vig: .4 },
    light: { base: [.957, .957, .969], a: [.80, .90, .85], b: [.86, .82, .95], ridge: -.05, vig: .05 },
  };

  function fallback() {
    root.classList.add('bg-static');
  }

  function startShader() {
    let canvas;
    let gl;
    try {
      canvas = document.createElement('canvas');
      gl = canvas.getContext('webgl', {
        alpha: false, antialias: false, depth: false, stencil: false,
        powerPreference: 'low-power', preserveDrawingBuffer: false,
      });
    } catch (e) { gl = null; }
    if (!gl) { fallback(); return; }

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { fallback(); return; }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { fallback(); return; }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = {};
    ['uRes', 'uTime', 'uBase', 'uA', 'uB', 'uRidge', 'uVig'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

    canvas.id = 'bg-shader';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);

    // Cozunurluk: gradyanlar yumusak oldugundan CSS pikselinin yarisi yeter (DPR'ye bakmadan); telefonda daha dusuk.
    const SCALE = coarse ? .4 : .5;
    let bw = 0;
    let bh = 0;
    function size() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      // Adres cubugu gizlenip acilirken buffer'i surekli yeniden kurma
      if (bw && Math.abs(w * SCALE - bw) < 2 && Math.abs(h * SCALE - bh) < bh * .2) return;
      bw = Math.max(2, Math.round(w * SCALE));
      bh = Math.max(2, Math.round(h * SCALE));
      canvas.width = bw;
      canvas.height = bh;
      gl.viewport(0, 0, bw, bh);
    }

    function applyPalette() {
      const pal = root.dataset.theme === 'light' ? PAL.light : PAL.dark;
      gl.uniform3fv(U.uBase, pal.base);
      gl.uniform3fv(U.uA, pal.a);
      gl.uniform3fv(U.uB, pal.b);
      gl.uniform1f(U.uRidge, pal.ridge);
      gl.uniform1f(U.uVig, pal.vig);
    }

    const t0 = performance.now();
    let last = 0;
    let raf = 0;
    let to = 0;
    const FRAME = 1000 / (coarse ? 24 : 40);

    function draw(now) {
      size();
      gl.uniform2f(U.uRes, bw, bh);
      gl.uniform1f(U.uTime, (now - t0) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    const stop = () => { cancelAnimationFrame(raf); clearTimeout(to); };
    function loop(now) {
      if (document.hidden || mqReduce.matches || saveData) return;
      // Ustte bir panel (sheet) aciksa zemin zaten kapali: cizmeyi durdur, seyrek kontrol et
      if (document.querySelector('dialog[open]')) { to = setTimeout(go, 350); return; }
      raf = requestAnimationFrame(loop);
      if (now - last < FRAME) return;
      last = now;
      draw(now);
    }
    function go() { stop(); raf = requestAnimationFrame(loop); }

    applyPalette();
    size();
    draw(performance.now());                 // ilk kare hemen: hareket kapaliyken de zemin gorunur
    requestAnimationFrame(() => canvas.classList.add('on'));
    if (!mqReduce.matches && !saveData) go();

    let rz = 0;
    window.addEventListener('resize', () => {
      clearTimeout(rz);
      rz = setTimeout(() => { size(); if (mqReduce.matches || saveData) draw(performance.now()); }, 150);
    }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) go(); });
    if (mqReduce.addEventListener) {
      mqReduce.addEventListener('change', () => { if (mqReduce.matches) stop(); else go(); });
    }
    new MutationObserver(() => { applyPalette(); draw(performance.now()); })
      .observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      stop();
      canvas.remove();
      fallback();
    });
  }

  /* ---------- 2. Dokunma dalgasi ---------- */
  document.addEventListener('pointerdown', (e) => {
    const t = e.target;
    const el = t && t.closest ? t.closest('button, .pill') : null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--rx', (e.clientX - r.left).toFixed(0) + 'px');
    el.style.setProperty('--ry', (e.clientY - r.top).toFixed(0) + 'px');
  }, { passive: true });

  /* ---------- 3. Avatar tonu ---------- */
  function hueOf(text) {
    let h = 7;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
    return h % 360;
  }
  function tint(scope) {
    scope.querySelectorAll('.avatar:not([data-h])').forEach((av) => {
      const holder = av.closest('.contact-card, .view-head');
      const nameEl = holder && holder.querySelector('.contact-name, h2');
      const name = (nameEl ? nameEl.textContent : av.textContent || '').trim();
      av.style.setProperty('--h', String(hueOf(name)));
      av.dataset.h = '1';
    });
  }
  let tintQueued = false;
  function queueTint() {
    if (tintQueued) return;
    tintQueued = true;
    requestAnimationFrame(() => { tintQueued = false; tint(document); });
  }
  const mo = new MutationObserver(queueTint);
  ['contacts-grid', 'view-body'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) mo.observe(el, { childList: true, subtree: true });
  });
  tint(document);

  startShader();
})();
