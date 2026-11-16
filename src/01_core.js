'use strict';
/* =====================================================================
 * 01 核心：数学 / 颜色 / 色板 / 绘图工具箱（Kit）
 * 所有动画都是时间 t 的纯函数；所有随机都是种子随机。
 * ===================================================================== */
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const E = {
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  outBack: (t, s = 1.6) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
};
const prog = (t, at, dur) => clamp((t - at) / dur);
/** 弹出缩放：at 之前为 0，之后带回弹到 1 */
const pop = (t, at, dur = 0.5, s = 1.6) => (t < at ? 0 : E.outBack(prog(t, at, dur), s));
const slide = (t, at, dur = 0.6) => E.outCubic(prog(t, at, dur));

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  s = String(s);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* ---------- 颜色 ---------- */
function hex2rgb(h) {
  h = String(h).replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}
function hsl2hex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const v = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(v * 255).toString(16).padStart(2, '0');
  };
  return '#' + f(0) + f(8) + f(4);
}
const hslOf = hex => rgb2hsl(...hex2rgb(hex));
/** 同色相加深：阴影永远不用灰，接近无彩的颜色往暖米色偏 */
function shade(hex, dl = -14, ds = 6) {
  let [h, s, l] = hslOf(hex);
  if (s < 14) { h = 36; s = 30; ds = 0; }
  if (l < 22) return hsl2hex(h, s, l + 12);
  return hsl2hex(h, clamp(s + ds, 0, 100), clamp(l + dl, 0, 100));
}
function lum(hex) {
  const [r, g, b] = hex2rgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const isHex = s => typeof s === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s);
function hueDist(a, b) { const d = Math.abs(hslOf(a)[0] - hslOf(b)[0]) % 360; return d > 180 ? 360 - d : d; }
function tooClose(a, b) {
  const A = hslOf(a), B = hslOf(b);
  if (A[1] < 15 || B[1] < 15) return Math.abs(A[2] - B[2]) < 12;
  return hueDist(a, b) < 34 && Math.abs(A[2] - B[2]) < 26;
}

const INK = '#141414';
const PAPER = '#F7F5F0';
const WHITE = '#FFFDF8';

/* ---------- 色板：每套只定「场色 field / 地色 ground / 辅色 soft」，
 * hero=品牌色（全片恒定），accent=数据高亮色（全片恒定）。---------- */
const PALETTES = {
  A: {
    cobalt:  { field: '#0077C8', ground: '#9CD4B5', soft: '#F7A8CC', hero: '#D94E34', accent: '#F7D117' },
    brick:   { field: '#D94E34', ground: '#007A4D', soft: '#F7A8CC', hero: '#5BA4E5', accent: '#F7D117' },
    sky:     { field: '#5BA4E5', ground: '#9CD4B5', soft: '#F285B8', hero: '#D94E34', accent: '#F7D117' },
    pink:    { field: '#F7A8CC', ground: '#007A4D', soft: '#5BA4E5', hero: '#0077C8', accent: '#F7D117' },
    emerald: { field: '#007A4D', ground: '#9CD4B5', soft: '#F7A8CC', hero: '#F285B8', accent: '#F7D117' },
    mustard: { field: '#E5B822', ground: '#0077C8', soft: '#F7F5F0', hero: '#D94E34', accent: '#F285B8' },
  },
  B: {
    sakura:  { field: '#F6A6B2', ground: '#5BB381', soft: '#82B6E2', hero: '#82B6E2', accent: '#FCE786' },
    powder:  { field: '#82B6E2', ground: '#F6A6B2', soft: '#5BB381', hero: '#E8606B', accent: '#FCE786' },
    mint:    { field: '#5BB381', ground: '#F6A6B2', soft: '#82B6E2', hero: '#E8606B', accent: '#FCE786' },
    butter:  { field: '#FCE786', ground: '#82B6E2', soft: '#F6A6B2', hero: '#5BB381', accent: '#E8606B' },
  },
};
function makePalette(theme, name, brandColor) {
  const set = PALETTES[theme] || PALETTES.A;
  const base = set[name] || set[Object.keys(set)[0]];
  const p = Object.assign({ name, paper: PAPER, ink: INK, white: WHITE }, base);
  if (isHex(brandColor)) {
    p.hero = brandColor;
    if (tooClose(p.accent, p.hero)) p.accent = tooClose('#F7D117', p.hero) ? '#F285B8' : '#F7D117';
    if (tooClose(p.soft, p.hero)) p.soft = tooClose(PAPER, p.hero) ? '#9CD4B5' : PAPER;
  }
  p.field2 = shade(p.field, -7, 4);
  p.ground2 = shade(p.ground, -9, 4);
  p.series = [p.hero, p.accent, p.soft, p.paper, p.ground].filter((c, i, a) => a.indexOf(c) === i);
  return p;
}
/** 给定品牌色，返回不会和品牌色撞色的色板名顺序 */
function paletteOrder(theme, brandColor) {
  const set = PALETTES[theme] || PALETTES.A;
  let names = Object.keys(set);
  if (isHex(brandColor)) {
    const ok = names.filter(n => !tooClose(set[n].field, brandColor) && !tooClose(set[n].ground, brandColor));
    if (ok.length >= 2) names = ok;
  }
  return names;
}

/* ---------- 字体 ---------- */
const FONT = {
  cjk: '"Noto Sans CJK SC","Source Han Sans SC","HarmonyOS Sans SC","PingFang SC","Hiragino Sans GB","Microsoft YaHei","WenQuanYi Micro Hei",sans-serif',
  custom: '',
};
function fontStr(size, kind = 'body') {
  const cust = FONT.custom ? `"${FONT.custom}",` : '';
  if (kind === 'num') return `900 ${size}px "Arial Black","Arial Bold",${cust}${FONT.cjk}`;
  if (kind === 'title') return `900 ${size}px ${cust}${FONT.cjk}`;
  if (kind === 'light') return `500 ${size}px ${FONT.cjk}`;
  return `700 ${size}px ${FONT.cjk}`;
}

/* ---------- 纹理（离屏生成一次） ---------- */
const TEX = { grain: [], size: 160 };
function buildGrain() {
  TEX.grain = [];
  for (let k = 0; k < 4; k++) {
    const cv = document.createElement('canvas'); cv.width = cv.height = TEX.size;
    const x = cv.getContext('2d'); const img = x.createImageData(TEX.size, TEX.size);
    const r = mulberry(977 + k * 131);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r();
      // 深色颗粒为主，少量亮颗粒：模拟 Riso 油墨不匀
      const dark = v < 0.55 ? Math.floor(r() * 150) : 0;
      const light = v > 0.965 ? 255 : 0;
      const c = light ? 255 : 20;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = c;
      img.data[i + 3] = light ? 130 : dark;
    }
    x.putImageData(img, 0, 0);
    TEX.grain.push(cv);
  }
}

/* =====================================================================
 * Kit：统一绘图工具箱。所有模板只通过它画东西，风格由它锁死。
 * ===================================================================== */
class Kit {
  constructor(ctx, W, H) {
    this.c = ctx; this.W = W; this.H = H;
    this.U = Math.min(W, H) / 720;
    this.pal = makePalette('A', 'cobalt');
    this.t = 0;        // 幕内时间
    this.gt = 0;       // 全片时间
    this.boil = 0;     // floor(gt*12)
    this.seed = 1;
    this.beats = null; // 采集音效节拍时为数组
    this.assets = {};
    this.defs = {};
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  }
  get lw() { return 2.8 * this.U; }
  get lwThin() { return 1.5 * this.U; }

  /** 颜色令牌 → 实际颜色 */
  col(tok) {
    if (tok == null || tok === 'none') return null;
    if (isHex(tok)) return tok;
    const p = this.pal;
    if (p[tok]) return p[tok];
    const m = /^(.+)-(d|l)$/.exec(tok);
    if (m && p[m[1]]) return m[2] === 'd' ? shade(p[m[1]]) : shade(p[m[1]], 12, -4);
    return p.paper;
  }
  /** 压在某底色上的文字颜色 */
  on(bg) { return lum(bg) > 0.36 ? INK : PAPER; }

  /** 元素入场：返回 0→1 的回弹缩放，并登记音效节拍 */
  in(at, sfx = 'pop', dur = 0.5, s = 1.6) {
    if (this.beats && sfx) this.beats.push({ t: at, sfx });
    return pop(this.t, at, dur, s);
  }
  beat(at, sfx) { if (this.beats && sfx) this.beats.push({ t: at, sfx }); }

  /** 以 (x,y) 为中心做缩放/旋转后执行 fn */
  at(x, y, k, rot, fn) {
    if (k <= 0.001) return;
    const c = this.c; c.save(); c.translate(x, y);
    if (rot) c.rotate(rot);
    if (k !== 1) c.scale(k, k);
    fn(); c.restore();
  }

  /* ---------- 基础形状 ---------- */
  rrPath(x, y, w, h, r) {
    const c = this.c; r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r);
    c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
    c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r);
    c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath();
  }
  paint(fill, ink = true, lw) {
    const c = this.c;
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (ink) { c.lineWidth = lw || this.lw; c.strokeStyle = INK; c.stroke(); }
  }
  /** 圆角矩形，可带实心墨黑硬投影 */
  box(x, y, w, h, { r = 10, fill = PAPER, ink = true, shadow = 0, lw } = {}) {
    const U = this.U, c = this.c;
    if (shadow) { this.rrPath(x + shadow * U, y + shadow * U, w, h, r * U); c.fillStyle = INK; c.fill(); c.lineWidth = lw || this.lw; c.strokeStyle = INK; c.stroke(); }
    this.rrPath(x, y, w, h, r * U); this.paint(fill, ink, lw);
  }
  circle(x, y, r, { fill = PAPER, ink = true, shadow = 0, lw } = {}) {
    const c = this.c, U = this.U;
    if (shadow) { c.beginPath(); c.arc(x + shadow * U, y + shadow * U, r, 0, TAU); c.fillStyle = INK; c.fill(); c.lineWidth = lw || this.lw; c.strokeStyle = INK; c.stroke(); }
    c.beginPath(); c.arc(x, y, r, 0, TAU); this.paint(fill, ink, lw);
  }
  line(x1, y1, x2, y2, { lw, color = INK, dash } = {}) {
    const c = this.c; c.save(); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
    c.lineWidth = lw || this.lw; c.strokeStyle = color; if (dash) c.setLineDash(dash); c.stroke(); c.restore();
  }

  /* ---------- 肌理 ---------- */
  /** 可变半径网点：在当前 clip 内，沿 dir 方向由密到疏 */
  halftone(x, y, w, h, { color = INK, sp = 9, alpha = 0.16, r0 = 0.42, r1 = 0.05, dir = 'v', flip = false } = {}) {
    const c = this.c, U = this.U, s = sp * U;
    c.save(); c.fillStyle = color; c.globalAlpha = alpha; c.beginPath();
    let row = 0;
    for (let yy = y; yy < y + h + s; yy += s * 0.866, row++) {
      for (let xx = x + (row % 2 ? s / 2 : 0); xx < x + w + s; xx += s) {
        let k = dir === 'v' ? (yy - y) / h : dir === 'h' ? (xx - x) / w : ((xx - x) / w + (yy - y) / h) / 2;
        if (flip) k = 1 - k;
        const rad = s * lerp(r0, r1, clamp(k));
        if (rad > 0.35) { c.moveTo(xx + rad, yy); c.arc(xx, yy, rad, 0, TAU); }
      }
    }
    c.fill(); c.restore();
  }
  /** 木刻排线：在当前 clip 内 */
  hatch(x, y, w, h, { gap = 5, alpha = 0.22, color = INK, lw = 1.1, ang = -35 } = {}) {
    const c = this.c, U = this.U; const g = gap * U;
    c.save(); c.strokeStyle = color; c.globalAlpha = alpha; c.lineWidth = lw * U; c.lineCap = 'butt';
    const tn = Math.tan((ang * Math.PI) / 180);
    c.beginPath();
    for (let xx = x - h; xx < x + w + h; xx += g) { c.moveTo(xx, y + h); c.lineTo(xx - tn * h, y); }
    c.stroke(); c.restore();
  }
  /** 四角星芒（唯一允许的「发光」符号） */
  sparkle(x, y, r, { fill, rot = 0, ink = true, lw } = {}) {
    const c = this.c; c.save(); c.translate(x, y); c.rotate(rot);
    const k = r * 0.2;
    c.beginPath(); c.moveTo(0, -r);
    c.quadraticCurveTo(k, -k, r, 0); c.quadraticCurveTo(k, k, 0, r);
    c.quadraticCurveTo(-k, k, -r, 0); c.quadraticCurveTo(-k, -k, 0, -r); c.closePath();
    this.paint(fill || this.pal.accent, ink, lw || this.lwThin * 1.3); c.restore();
  }
  /** 全屏纸张颗粒封层 */
  grain() {
    if (!TEX.grain.length) buildGrain();
    const c = this.c, tile = TEX.grain[this.boil % 4];
    const sc = Math.max(1, this.U * 0.9);
    c.save(); c.globalAlpha = 0.34; c.globalCompositeOperation = 'multiply';
    c.scale(sc, sc); c.fillStyle = c.createPattern(tile, 'repeat');
    const r = mulberry(this.boil * 7 + 3);
    c.translate(-Math.floor(r() * 80), -Math.floor(r() * 80));
    c.fillRect(0, 0, this.W / sc + 160, this.H / sc + 160); c.restore();
  }

  /* ---------- 文字 ---------- */
  setFont(size, kind) { this.c.font = fontStr(size, kind); }
  measure(str, size, kind) { this.setFont(size, kind); return this.c.measureText(str).width; }
  /** 字号自适应：超宽就缩小 */
  fit(str, size, maxW, kind, min = 0.5) {
    const w = this.measure(str, size, kind);
    return w <= maxW ? size : Math.max(size * min, (size * maxW) / w);
  }
  /** 中文断行：避免行首标点，数字/字母不拆开 */
  wrap(str, size, maxW, kind) {
    this.setFont(size, kind);
    const c = this.c, toks = String(str).match(/[A-Za-z0-9.,%¥$+\-–/]+|\s+|[\s\S]/g) || [];
    const lines = []; let cur = '';
    const noHead = '，。！？；：、）》」』”’%';
    for (const tk of toks) {
      if (tk === '\n') { lines.push(cur); cur = ''; continue; }
      if (c.measureText(cur + tk).width > maxW && cur && !noHead.includes(tk[0])) { lines.push(cur.trimEnd()); cur = tk.trimStart(); }
      else cur += tk;
    }
    if (cur.trim()) lines.push(cur.trimEnd());
    return lines;
  }
  text(str, x, y, { size = 28, color = INK, align = 'center', kind = 'body', base = 'middle', stroke, sw, maxW } = {}) {
    const c = this.c; str = String(str);
    let sz = size * this.U;
    if (maxW) sz = this.fit(str, sz, maxW, kind);
    c.font = fontStr(sz, kind); c.textAlign = align; c.textBaseline = base;
    if (stroke) { c.lineWidth = (sw || 5) * this.U; c.strokeStyle = stroke; c.strokeText(str, x, y); }
    c.fillStyle = color; c.fillText(str, x, y);
    return sz;
  }
  /** 多行文字，返回总高度。y 为首行中心 */
  para(str, x, y, { size = 28, color = INK, align = 'center', kind = 'body', maxW, lh = 1.4, maxLines = 6, vcenter = false } = {}) {
    let sz = size * this.U; let lines = this.wrap(str, sz, maxW, kind);
    let guard = 0;
    while (lines.length > maxLines && guard++ < 12) { sz *= 0.92; lines = this.wrap(str, sz, maxW, kind); }
    const c = this.c; c.font = fontStr(sz, kind); c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = color;
    const total = lines.length * sz * lh;
    const y0 = vcenter ? y - total / 2 + (sz * lh) / 2 : y;
    lines.forEach((ln, i) => c.fillText(ln, x, y0 + i * sz * lh));
    return { h: total, lines, size: sz, lh: sz * lh, y0 };
  }
  /** 立体波普大字：墨黑挤出 + 粗描边 + 套色错版填充 */
  popText(str, x, y, { size = 80, fill, depth = 7, align = 'center', kind = 'title', maxW, lw = 6, misreg = true, wave = 0 } = {}) {
    const c = this.c, U = this.U; str = String(str);
    let sz = size * U; if (maxW) sz = this.fit(str, sz, maxW, kind, 0.35);
    const k = sz / (size * U);
    c.font = fontStr(sz, kind); c.textAlign = align; c.textBaseline = 'middle'; c.lineJoin = 'round';
    const d = Math.max(2, Math.round(depth * k)), sw = Math.max(3, lw * k) * U;
    const draw = (dx, dy, mode, style) => {
      if (!wave) { mode === 's' ? (c.strokeStyle = style, c.strokeText(str, x + dx, y + dy)) : (c.fillStyle = style, c.fillText(str, x + dx, y + dy)); return; }
      // 逐字波浪基线（仅入场瞬间使用）
      const chars = [...str]; const total = c.measureText(str).width;
      let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
      c.textAlign = 'left';
      chars.forEach((ch, i) => {
        const oy = Math.sin(this.t * 9 + i * 0.8) * wave * U * 6;
        mode === 's' ? (c.strokeStyle = style, c.strokeText(ch, cx + dx, y + dy + oy)) : (c.fillStyle = style, c.fillText(ch, cx + dx, y + dy + oy));
        cx += c.measureText(ch).width;
      });
      c.textAlign = align;
    };
    c.lineWidth = sw;
    for (let i = d; i >= 1; i--) { draw(i * U, i * U, 's', INK); }
    draw(0, 0, 's', INK);
    const off = misreg ? 1.3 * U * Math.min(1, k + 0.3) : 0;
    draw(off, -off * 0.6, 'f', fill || this.pal.accent);
    return sz;
  }

  /* ---------- 组件 ---------- */
  /** 标签小卡 */
  tag(str, x, y, { size = 24, fill = PAPER, color, padX = 16, padY = 9, shadow = 3, align = 'center', r = 9, kind = 'body', maxW } = {}) {
    const U = this.U; let sz = size * U;
    if (maxW) sz = this.fit(str, sz, maxW - padX * 2 * U, kind, 0.6);
    const w = this.measure(str, sz, kind) + padX * 2 * U, h = sz + padY * 2 * U;
    const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    this.box(x0, y - h / 2, w, h, { r, fill, shadow });
    this.c.font = fontStr(sz, kind); this.c.textAlign = 'center'; this.c.textBaseline = 'middle';
    this.c.fillStyle = color || this.on(fill); this.c.fillText(str, x0 + w / 2, y + sz * 0.04);
    return { x: x0, y: y - h / 2, w, h };
  }
  /** 复古系统窗口卡片：返回内容区矩形 */
  window(x, y, w, h, { title = '', bar, fill = PAPER, shadow = 8, dots = true, tone = true } = {}) {
    const c = this.c, U = this.U, p = this.pal;
    const bh = Math.min(46 * U, h * 0.24), r = 14;
    this.box(x, y, w, h, { r, fill, shadow });
    c.save(); this.rrPath(x, y, w, h, r * U); c.clip();
    if (tone) this.halftone(x, y + h * 0.45, w, h * 0.55, { color: shade(fill, -22, 10), alpha: 0.5, sp: 8, flip: true, r0: 0.36 });
    c.fillStyle = bar || p.hero; c.fillRect(x, y, w, bh);
    c.restore();
    this.line(x, y + bh, x + w, y + bh);
    this.rrPath(x, y, w, h, r * U); this.paint(null, true);
    let tx = x + 18 * U;
    if (dots) {
      [p.accent, p.soft, PAPER].forEach((col, i) => this.circle(x + (22 + i * 22) * U, y + bh / 2, 7 * U, { fill: col, lw: this.lwThin }));
      tx = x + 86 * U;
    }
    if (title) this.text(title, tx, y + bh / 2 + U, { size: 22, align: 'left', color: this.on(bar || p.hero), maxW: w - (tx - x) - 16 * U });
    return { x: x + 20 * U, y: y + bh + 14 * U, w: w - 40 * U, h: h - bh - 28 * U, bh };
  }
  /** 顶部丝带横幅 */
  ribbon(str, cx, cy, maxW, k = 1) {
    if (k <= 0.001) return;
    const c = this.c, U = this.U, p = this.pal;
    let sz = this.fit(str, 40 * U, maxW - 150 * U, 'title', 0.55);
    const tw = this.measure(str, sz, 'title');
    const w = tw + 76 * U, h = sz * 1.72, tail = 44 * U;
    c.save(); c.translate(cx, cy); c.scale(k, k); c.rotate(-0.012);
    const tailFill = shade(p.paper, -16);
    for (const s of [-1, 1]) { // 燕尾
      c.beginPath();
      const x0 = s * (w / 2 - 14 * U), x1 = s * (w / 2 + tail);
      c.moveTo(x0, -h / 2 + 12 * U); c.lineTo(x1, -h / 2 + 12 * U); c.lineTo(x1 - s * 16 * U, 12 * U);
      c.lineTo(x1, h / 2 + 12 * U); c.lineTo(x0, h / 2 + 12 * U); c.closePath();
      this.paint(tailFill, true);
      c.beginPath(); c.moveTo(x0, h / 2 + 12 * U); c.lineTo(s * (w / 2), h / 2); c.lineTo(x0, h / 2); c.closePath();
      this.paint(INK, true, this.lwThin);
    }
    this.box(-w / 2, -h / 2, w, h, { r: 6, fill: p.paper, shadow: 0 });
    c.font = fontStr(sz, 'title'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = INK;
    c.fillText(str, 0, sz * 0.04);
    c.restore();
    return { w: w + tail * 2, h };
  }
  /** 带箭头的曲线。pts: 起点、控制点、终点 */
  arrow(x1, y1, cx, cy, x2, y2, { lw, color = INK, head = 13, dash, p = 1 } = {}) {
    const c = this.c, U = this.U;
    // 画到进度 p 的二次贝塞尔
    const q = t => [lerp(lerp(x1, cx, t), lerp(cx, x2, t), t), lerp(lerp(y1, cy, t), lerp(cy, y2, t), t)];
    if (p <= 0.01) return;
    c.save(); c.beginPath(); c.moveTo(x1, y1);
    const n = 24; for (let i = 1; i <= n; i++) { const [x, y] = q((i / n) * p); c.lineTo(x, y); }
    c.lineWidth = lw || this.lw * 1.25; c.strokeStyle = color; if (dash) c.setLineDash(dash); c.stroke();
    const [ex, ey] = q(p), [bx, by] = q(Math.max(0, p - 0.06));
    const a = Math.atan2(ey - by, ex - bx), hs = head * U;
    c.setLineDash([]); c.translate(ex, ey); c.rotate(a);
    c.beginPath(); c.moveTo(hs * 0.9, 0); c.lineTo(-hs * 0.7, -hs * 0.75); c.lineTo(-hs * 0.3, 0); c.lineTo(-hs * 0.7, hs * 0.75); c.closePath();
    c.fillStyle = color; c.fill(); c.lineWidth = this.lwThin; c.strokeStyle = color; c.stroke();
    c.restore();
  }
}

/* ---------- 数字工具 ---------- */
/** 把 97.6 / "¥4.0" / "4.6万" 解析成 {pre, num, suf, dec} */
function parseNum(v, unit = '', prefix = '') {
  if (typeof v === 'number') {
    const s = String(v); const dec = s.includes('.') ? s.split('.')[1].length : 0;
    return { pre: prefix, num: v, suf: unit, dec, ok: true };
  }
  const m = /^([^\d\-+]*)([-+]?[\d,]*\.?\d+)(.*)$/.exec(String(v == null ? '' : v).trim());
  if (!m) return { pre: '', num: NaN, suf: '', dec: 0, ok: false, raw: String(v == null ? '' : v) };
  const numS = m[2].replace(/,/g, '');
  return { pre: prefix + m[1], num: parseFloat(numS), suf: m[3] + unit, dec: numS.includes('.') ? numS.split('.')[1].length : 0, ok: true };
}
function fmtNum(n, dec = 0, comma = true) {
  const s = Math.abs(n).toFixed(dec);
  const [a, b] = s.split('.');
  const ai = comma && a.length > 4 ? a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : a;
  return (n < 0 ? '-' : '') + ai + (b ? '.' + b : '');
}
/** 滚动计数显示文本 */
function countText(pn, k) {
  if (!pn.ok) return pn.raw;
  return pn.pre + fmtNum(pn.num * clamp(k), pn.dec) + pn.suf;
}
