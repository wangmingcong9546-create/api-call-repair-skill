/* =====================================================================
 * 03 分镜系统：脚本 → 时间轴 → 版式 → 背景骨架 → 一幕的完整渲染
 * ===================================================================== */
const TR = 0.55;   // 转场时长
const T0 = 0.6;    // 每幕第一个元素的出现时间

/* ---------- 口播对位：在台词里找到关键词出现的位置，换算成出现时间 ---------- */
const stripSay = s => String(s || '').replace(/\s+/g, '');
function findCue(say, key, from = 0) {
  key = String(key || '').replace(/[\s，。、！？：；“”"'()（）%¥$·\-—]/g, '');
  if (!key || !say) return -1;
  for (let len = key.length; len >= 2; len--) {
    const idx = say.indexOf(key.slice(0, len), from);
    if (idx >= 0) return idx;
  }
  return -1;
}
/** 返回每个 key 的出现时间（秒，幕内）。找不到对位就均匀铺开。 */
function cueTimes(s, keys, { start = T0 + 0.3, gap = 0.45, lead = 0.3, step = 0.75 } = {}) {
  const id = keys.join('|') + start;
  s._cue = s._cue || {};
  if (s._cue[id]) return s._cue[id];
  const say = stripSay(s.say), dur = s._dur || 6, n = keys.length;
  const speech = Math.max(1, dur - 0.9);
  let from = 0;
  let ts = keys.map(k => {
    if (k && typeof k === 'object' && k.at != null) return +k.at;
    const key = k && typeof k === 'object' ? (k.cue || k.key) : k;
    const idx = findCue(say, key, from);
    if (idx < 0) return null;
    from = idx + 1;
    return 0.3 + (idx / Math.max(1, say.length)) * speech - lead;
  });
  const st = Math.min(step, Math.max(0.3, (dur * 0.62 - start) / Math.max(1, n - 1)));
  for (let i = 0; i < n; i++) {
    if (ts[i] != null) continue;
    let a = i - 1, b = i + 1;
    while (b < n && ts[b] == null) b++;
    if (a >= 0 && b < n) ts[i] = lerp(ts[a], ts[b], 1 / (b - a));
    else if (a >= 0) ts[i] = ts[a] + st;
    else if (b < n) ts[i] = lerp(start, ts[b], b <= 0 ? 0 : i / b);
    else ts[i] = start + i * st;
  }
  let prev = start - gap;
  ts = ts.map(v => { v = Math.max(v, prev + gap); v = Math.min(v, Math.max(start, dur - 1.0)); prev = v; return v; });
  s._cue[id] = ts;
  return ts;
}

/* ---------- 版式 ---------- */
const ASPECTS = { '16:9': [1920, 1080], '9:16': [1080, 1920], '3:4': [1350, 1800] };
function getLayout(W, H, presenter) {
  const U = Math.min(W, H) / 720, ar = W / H, wide = ar > 1.2, tall = ar < 0.65;
  let cx0 = 0, cw = W;
  const pres = wide && (presenter === 'left' || presenter === 'right') ? presenter : 'none';
  if (pres === 'right') cw = W * 0.66;
  if (pres === 'left') { cx0 = W * 0.34; cw = W * 0.66; }
  const Z = wide ? { rib: 0.1, sTop: 0.19, sTop0: 0.085, sBot: 0.875, sBotP: 0.725, punch: 0.81, sub: 0.945 }
    : tall ? { rib: 0.135, sTop: 0.2, sTop0: 0.115, sBot: 0.765, sBotP: 0.66, punch: 0.725, sub: 0.805 }
      : { rib: 0.095, sTop: 0.17, sTop0: 0.075, sBot: 0.865, sBotP: 0.735, punch: 0.805, sub: 0.925 };
  return { W, H, U, wide, tall, cx0, cw, cx: cx0 + cw / 2, m: cw * (wide ? 0.05 : 0.06), Z, pres };
}
function stageRect(L, s) {
  const top = s.ribbon ? L.Z.sTop : L.Z.sTop0, bot = s.punch ? L.Z.sBotP : L.Z.sBot;
  return { x: L.cx0 + L.m, y: L.H * top, w: L.cw - 2 * L.m, h: L.H * (bot - top) };
}

/* ---------- 背景骨架（L0 + L1 静态部分，按幕缓存） ---------- */
const SKELS = ['arc', 'panel', 'full', 'hills', 'checker', 'desk'];
function wavyBand(kit, y, amp, thick, color, phase, len) {
  const c = kit.c, W = kit.W; c.beginPath();
  const f = x => y + Math.sin((x / W) * TAU * len + phase) * amp;
  c.moveTo(-10, f(-10));
  for (let x = 0; x <= W + 20; x += 20) c.lineTo(x, f(x));
  for (let x = W + 20; x >= -20; x -= 20) c.lineTo(x, f(x) + thick);
  c.closePath(); c.fillStyle = color; c.fill();
}
function drawBackdrop(kit, L, skel, seed) {
  const c = kit.c, { W, H, U } = L, p = kit.pal, r = mulberry(seed);
  c.fillStyle = p.field; c.fillRect(0, 0, W, H);
  const waves = () => {
    const n = 2 + (r() > 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) wavyBand(kit, H * (0.16 + i * 0.2 + r() * 0.08), H * 0.022, H * (0.035 + r() * 0.02), p.field2, r() * 6, 1.5 + r());
  };
  const cornerDots = () => {
    c.save(); c.beginPath(); c.rect(0, 0, W, H * 0.5); c.clip();
    kit.halftone(0, 0, W, H * 0.42, { color: shade(p.field, -16, 6), alpha: 0.55, sp: 13, r0: 0.34, r1: 0.02 });
    c.restore();
  };
  if (skel === 'arc') {
    cornerDots(); waves();
    const gy = H * (L.Z.sBot - 0.075), bulge = H * 0.05;
    c.beginPath(); c.moveTo(-10, gy + bulge); c.quadraticCurveTo(W / 2, gy - bulge, W + 10, gy + bulge); c.lineTo(W + 10, H + 10); c.lineTo(-10, H + 10); c.closePath();
    c.save(); c.fillStyle = p.ground; c.fill(); c.clip();
    kit.halftone(0, gy, W, H - gy, { color: shade(p.ground, -20, 8), alpha: 0.6, sp: 11, flip: true, r0: 0.38 });
    c.restore(); c.lineWidth = kit.lw; c.strokeStyle = INK; c.stroke();
  } else if (skel === 'panel') {
    waves();
    const x = L.cx0 + L.m * 0.42, w = L.cw - L.m * 0.84, y = H * (L.Z.sTop0 - 0.035), h = H * (L.Z.sBot + 0.02) - y;
    kit.box(x, y, w, h, { r: 30, fill: p.ground, shadow: 12 });
    c.save(); kit.rrPath(x, y, w, h, 30 * U); c.clip();
    kit.halftone(x, y + h * 0.5, w, h * 0.5, { color: shade(p.ground, -20, 8), alpha: 0.55, sp: 11, flip: true, r0: 0.36 });
    c.restore(); kit.rrPath(x, y, w, h, 30 * U); kit.paint(null, true);
  } else if (skel === 'full') {
    // 全幅点阵网格天空
    c.fillStyle = p.field2; c.beginPath();
    const s = 44 * U;
    for (let y = s / 2; y < H; y += s) for (let x = s / 2; x < W; x += s) { c.moveTo(x + 3 * U, y); c.arc(x, y, 3 * U, 0, TAU); }
    c.fill();
    wavyBand(kit, H * (0.78 + r() * 0.06), H * 0.02, H * 0.05, p.field2, r() * 6, 1.3);
  } else if (skel === 'hills') {
    cornerDots();
    const sunX = W * (0.72 + r() * 0.16), sunY = H * 0.6;
    kit.circle(sunX, sunY, H * 0.15, { fill: p.soft });
    const hill = (x0, x1, top, base, fill, hatch) => {
      c.beginPath(); c.moveTo(x0, base); c.quadraticCurveTo((x0 + x1) / 2, top - (base - top), x1, base); c.lineTo(x1, H + 10); c.lineTo(x0, H + 10); c.closePath();
      c.save(); c.fillStyle = fill; c.fill(); c.clip();
      if (hatch) kit.hatch(x0, top - (base - top) * 0.2, x1 - x0, H, { gap: 9, alpha: 0.2 });
      else kit.halftone(x0, top, x1 - x0, H - top, { color: shade(fill, -20, 8), alpha: 0.55, sp: 11, flip: true });
      c.restore(); c.lineWidth = kit.lw; c.strokeStyle = INK; c.stroke();
    };
    hill(-W * 0.25, W * 0.7, H * 0.66, H * 0.86, p.ground2, true);
    hill(W * 0.3, W * 1.3, H * 0.7, H * 0.92, p.ground2, true);
    hill(-W * 0.3, W * 1.3, H * 0.8, H * 0.98, p.ground, false);
  } else if (skel === 'checker') {
    waves();
    const fy = H * (L.Z.sBot - 0.1), vx = W / 2, vy = fy - H * 0.55, rows = 4, cols = 10;
    c.save(); c.beginPath(); c.rect(0, fy, W, H - fy); c.clip();
    c.fillStyle = p.ground; c.fillRect(0, fy, W, H - fy);
    const ys = []; for (let k = 0; k <= rows; k++) ys.push(fy + (H - fy) * Math.pow(k / rows, 1.7));
    const xAt = (col, y) => vx + ((col - cols / 2) * (W * 0.24)) * ((y - vy) / (H - vy));
    c.fillStyle = p.paper;
    for (let k = 0; k < rows; k++) for (let j = -6; j < cols + 6; j++) {
      if ((j + k) % 2) continue;
      c.beginPath(); c.moveTo(xAt(j, ys[k]), ys[k]); c.lineTo(xAt(j + 1, ys[k]), ys[k]); c.lineTo(xAt(j + 1, ys[k + 1]), ys[k + 1]); c.lineTo(xAt(j, ys[k + 1]), ys[k + 1]); c.closePath(); c.fill();
    }
    c.restore(); kit.line(-10, fy, W + 10, fy);
  } else if (skel === 'desk') {
    // Y2K 桌面：稀疏点阵 + 边缘被裁切的文件夹
    c.fillStyle = p.field2; c.beginPath();
    const s = 60 * U;
    for (let y = s / 2; y < H; y += s) for (let x = s / 2; x < W; x += s) { c.moveTo(x + 2.4 * U, y); c.arc(x, y, 2.4 * U, 0, TAU); }
    c.fill();
    const fs = Math.min(W, H) * 0.115;
    const spots = [[0.03, 0.2], [0.035, 0.42], [0.972, 0.3], [0.965, 0.55], [0.1, 0.035], [0.9, 0.965], [0.03, 0.9], [0.975, 0.08]];
    spots.forEach(([fx, fy], i) => { if (r() < 0.78) drawProp(kit, 'folder', fx * W, fy * H, fs, { still: true, rot: (r() - 0.5) * 0.2 }); });
  }
}
const backdropCache = new Map();
function cachedBackdrop(S, kit, s) {
  const L = S.L, key = [s._i, L.W, L.H, L.pres, s._pal.name, s._pal.hero, s._skel, S.rev].join('|');
  let cv = backdropCache.get(key);
  if (!cv) {
    cv = document.createElement('canvas'); cv.width = L.W; cv.height = L.H;
    const k2 = new Kit(cv.getContext('2d'), L.W, L.H);
    k2.pal = s._pal; k2.defs = kit.defs; k2.boil = 0; k2.t = 0;
    drawBackdrop(k2, L, s._skel, s._seed);
    if (backdropCache.size > 10) backdropCache.delete(backdropCache.keys().next().value);
    backdropCache.set(key, cv);
  }
  return cv;
}

/* ---------- 动态装饰（L1）：星芒、云、月亮、土星、品牌小图标 ---------- */
function drawDecor(kit, S, s) {
  const L = S.L, { W, H, U } = L, t = kit.t, p = kit.pal, r = mulberry(s._seed + 99);
  const slots = [[0.035, 0.27], [0.965, 0.23], [0.045, 0.6], [0.958, 0.63], [0.17, 0.05], [0.83, 0.055], [0.3, 0.93], [0.72, 0.045]];
  const X = fx => L.cx0 + fx * L.cw;
  const order = slots.map((v, i) => [r(), i]).sort((a, b) => a[0] - b[0]).map(v => v[1]);
  const echo = s._next && s._next.field !== p.field ? s._next.field : p.soft;
  const nStar = s._skel === 'desk' ? 2 : 4;
  for (let i = 0; i < nStar; i++) {
    const [fx, fy] = slots[order[i]];
    const tw = 0.85 + 0.2 * Math.sin(t * 3.9 + i * 1.7);
    const k = pop(t, 0.25 + i * 0.09, 0.35, 2.2);
    const size = (15 + r() * 17) * U;
    kit.at(X(fx) + (r() - 0.5) * 30 * U, fy * H + (r() - 0.5) * 30 * U, k * tw, Math.sin(t * 1.1 + i) * 0.12, () =>
      kit.sparkle(0, 0, size, { fill: i === 1 ? echo : i === 3 ? PAPER : p.accent }));
  }
  if (s._skel === 'full' || s._skel === 'hills') {
    const drift = Math.sin(t * 0.35) * 14 * U;
    drawProp(kit, 'cloud', X(0.1) + drift, H * 0.17, H * 0.17, { still: true });
    drawProp(kit, 'cloud', X(0.9) - drift, H * (s._skel === 'full' ? 0.3 : 0.2), H * 0.13, { still: true, flip: true });
    if (s._skel === 'full') {
      drawProp(kit, r() > 0.5 ? 'moon' : 'saturn', X(0.94), H * 0.82, H * 0.14, { rot: -0.2 + Math.sin(t * 0.8) * 0.04 });
    }
  }
  // 品牌小图标：贴在边缘、被画面裁切
  const icons = S.story.icons || [];
  if (icons.length && s._skel !== 'desk' && s._skel !== 'panel') {
    const name = icons[s._i % icons.length], side = r() > 0.5 ? 1 : 0;
    const k = pop(t, 0.35, 0.4, 1.8);
    drawProp(kit, name, side ? L.cx0 + L.cw + (L.pres === 'right' ? 0.05 * W : -0.012 * W) : L.cx0 + (L.pres === 'left' ? -0.05 * W : 0.012 * W),
      H * (0.36 + r() * 0.2) + Math.sin(t * 1.3) * 6 * U, H * 0.15, { rot: (side ? -1 : 1) * 0.22, k });
  }
}
/** 前景（L3）：压住舞台下沿、被画面底边裁切的道具 */
function drawForeground(kit, S, s) {
  if (!['arc', 'hills', 'checker'].includes(s._skel)) return;
  const L = S.L, { H, U } = L, r = mulberry(s._seed + 7);
  const icons = (S.story.icons && S.story.icons.length ? S.story.icons : ['box', 'coin']);
  const name = icons[(s._i + 1) % icons.length];
  const right = s.source ? true : r() > 0.5;
  const k = pop(kit.t, 0.3, 0.45, 1.5);
  const x = right ? L.cx0 + L.cw * 0.965 : L.cx0 + L.cw * 0.035;
  drawProp(kit, name, x, H * (L.tall ? 0.955 : 0.94), Math.min(L.W, H) * 0.24, { rot: right ? -0.16 : 0.16, k, flip: !right });
}

/* ---------- 底部立体金句（带斜向扫光） ---------- */
let sheenCanvas = null;
function drawPunch(kit, S, s) {
  const L = S.L, { H, U } = L, t = kit.t, at = s._punchAt;
  const k = kit.in(at, 'stamp', 0.5, 1.8);
  if (k <= 0.001) return;
  const c = kit.c, cy = H * L.Z.punch, maxW = L.cw * 0.86;
  const wave = clamp(1 - (t - at) / 0.9);
  const size = L.wide ? 84 : L.tall ? 76 : 80;
  c.save(); c.translate(L.cx, cy); c.rotate(-0.022); c.scale(k, k);
  const sz = kit.popText(s.punch, 0, 0, { size, maxW, depth: 8, wave: wave * wave, fill: kit.pal.accent });
  c.restore();
  // 扫光：全片唯一允许的渐变
  const sp = prog(t, at + 0.45, 0.7);
  if (sp > 0 && sp < 1) {
    kit.beat(at + 0.45, 'sheen');
    if (!sheenCanvas) sheenCanvas = document.createElement('canvas');
    const oc = sheenCanvas, ow = Math.ceil(maxW + 80 * U), oh = Math.ceil(sz * 2);
    if (oc.width !== ow || oc.height !== oh) { oc.width = ow; oc.height = oh; }
    const x = oc.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, ow, oh);
    x.globalCompositeOperation = 'source-over';
    x.font = fontStr(sz, 'title'); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff';
    x.fillText(s.punch, ow / 2, oh / 2);
    x.globalCompositeOperation = 'source-in';
    const bx = lerp(-0.1, 1.1, sp) * ow, bw = ow * 0.16;
    const g = x.createLinearGradient(bx - bw, 0, bx + bw, 0);
    g.addColorStop(0, 'rgba(255,253,248,0)'); g.addColorStop(0.5, 'rgba(255,253,248,0.85)'); g.addColorStop(1, 'rgba(255,253,248,0)');
    x.save(); x.transform(1, 0, -0.45, 1, oh * 0.22, 0); x.fillStyle = g; x.fillRect(-ow, 0, ow * 3, oh); x.restore();
    c.save(); c.translate(L.cx, cy); c.rotate(-0.022); c.drawImage(oc, -ow / 2, -oh / 2); c.restore();
  }
}
function drawSource(kit, S, s) {
  const L = S.L, U = L.U, k = slide(kit.t, T0, 0.4);
  if (k <= 0) return;
  const y = L.H * (L.tall ? L.Z.sub - 0.05 : 0.972);
  kit.c.save(); kit.c.globalAlpha = 1;
  kit.at(L.cx0 + L.m * 0.6, y, 1, 0, () => {
    kit.c.translate(-(1 - k) * 60 * U, 0);
    kit.tag('来源：' + s.source, 0, 0, { size: L.tall ? 19 : 17, align: 'left', padX: 10, padY: 6, shadow: 2, r: 6, kind: 'light', maxW: L.cw * (L.tall ? 0.8 : 0.26) });
  });
  kit.c.restore();
}

/* ---------- 吉祥物统一摆放（含交接钩子） ---------- */
const DEFAULT_POSE = { cover: 'wave', number: 'point', compare: 'inspect', bars: 'point', trend: 'up', split: 'inspect', waterfall: 'think', flow: 'hold', wheel: 'hips', network: 'cheer', timeline: 'wave', quote: 'think', list: 'point', formula: 'think', table: 'inspect', image: 'point', stage: 'idle' };
function mascotWanted(S, s) {
  if (!S.story.mascot || s.mascot === false || s.mascot === 'none') return null;
  if (typeof s.mascot === 'string' && POSES[s.mascot]) return s.mascot;
  if (s.mascot === true || s.handoff) return DEFAULT_POSE[s.type] || 'idle';
  if (s.mascot == null) return s._i % 3 === 2 ? null : (DEFAULT_POSE[s.type] || 'idle');
  return null;
}
/**
 * 把舞台切成「主内容区 + 吉祥物位」。返回 { main, draw() }。
 * 吉祥物会面向主内容；有 handoff 时在最后 2.5 秒转身指向画面边缘（交接给真人）。
 */
function mascotSlot(kit, S, s, R, { frac = 0.2, at = T0 + 0.15, item } = {}) {
  const pose = mascotWanted(S, s), L = S.L;
  if (!pose) return { main: R, draw() {}, has: false };
  let side = s.mascotSide || (L.pres !== 'none' ? L.pres : s._i % 2 ? 'left' : 'right');
  if (s.handoff === 'left' || s.handoff === 'right') side = s.handoff;
  let main, cx, foot, size;
  if (L.wide || R.w > R.h * 1.1) {
    const sw = R.w * frac;
    main = side === 'right' ? { x: R.x, y: R.y, w: R.w - sw, h: R.h } : { x: R.x + sw, y: R.y, w: R.w - sw, h: R.h };
    size = Math.min(R.h * 0.5, sw * 0.86);
    cx = side === 'right' ? R.x + R.w - sw * 0.46 : R.x + sw * 0.46; foot = R.y + R.h * 0.985;
  } else {
    const sh = R.h * 0.2;
    main = { x: R.x, y: R.y, w: R.w, h: R.h - sh };
    size = Math.min(sh * 0.86, R.w * 0.26);
    cx = side === 'right' ? R.x + R.w * 0.82 : R.x + R.w * 0.18; foot = R.y + R.h * 0.995;
  }
  return {
    main, has: true, side, cx, foot, size,
    draw() {
      const t = kit.t, enter = kit.in(at, 'pop', 0.5, 1.5);
      let p = pose, from = 'idle', k = prog(t, at + 0.35, 0.6), flip = side === 'right';
      if (s.handoff) {
        const ht = Math.max(at + 1.4, s._dur - 2.5);
        if (t >= ht) { from = pose; p = 'point'; k = prog(t, ht, 0.55); flip = s.handoff === 'left'; kit.beat(ht, 'pop'); }
      }
      drawMascot(kit, S.story.mascot, cx, foot, size, { pose: p, from, k, flip, enter, item: item || s.item || (S.story.icons || [])[0] || 'coin', mood: s.mood });
    },
  };
}

/* ---------- 故事规范化与时间轴 ---------- */
function normalizeStory(raw) {
  const st = Object.assign({ title: '未命名', theme: 'A', aspect: '16:9', pace: 4.6, presenter: 'none', icons: [], defs: {} }, raw || {});
  if (typeof st.brand === 'string') st.brand = { name: st.brand };
  st.brand = st.brand || {};
  st.theme = String(st.theme).toUpperCase() === 'B' ? 'B' : 'A';
  if (!ASPECTS[st.aspect]) st.aspect = '16:9';
  st.pace = clamp(+st.pace || 4.6, 2.5, 8);
  st.scenes = (Array.isArray(st.scenes) ? st.scenes : Array.isArray(st.acts) ? st.acts : []).filter(s => s && typeof s === 'object');
  st.icons = (Array.isArray(st.icons) ? st.icons : []).filter(n => typeof n === 'string');
  st.defs = st.defs && typeof st.defs === 'object' ? st.defs : {};
  return st;
}
const TRANSITIONS = ['wipe', 'drop', 'iris'];
function planStory(S) {
  const st = S.story, order = paletteOrder(st.theme, st.brand.color);
  let palIdx = -1, inChap = 0, start = 0, prevSkel = '', chap = 0;
  const skelUse = {};
  st.scenes.forEach((s, i) => {
    const tpl = TEMPLATES[s.type] || TEMPLATES.list;
    s._i = i; s._cue = {};
    const newChap = i === 0 || s.type === 'cover' || s.chapter;
    if (newChap) { palIdx++; inChap = 0; if (i) chap++; } else { inChap++; if (inChap % 5 === 0) palIdx++; }
    s._chap = chap;
    const set = PALETTES[st.theme];
    const palName = s.pal && set[s.pal] ? s.pal : order[palIdx % order.length];
    s._pal = makePalette(st.theme, palName, st.brand.color);
    // 骨架：按模板偏好轮换，且不与上一幕相同（避免每幕都是同一种分割）
    const prefs = tpl.skel || SKELS;
    if (s.bg && SKELS.includes(s.bg)) s._skel = s.bg;
    else {
      const n = skelUse[s.type] = (skelUse[s.type] || 0) + 1;
      let pick = prefs[(n - 1) % prefs.length];
      if (pick === prevSkel && prefs.length > 1) pick = prefs[n % prefs.length];
      s._skel = pick;
    }
    prevSkel = s._skel;
    s._seed = hashStr(st.title + '#' + i + s.type);
    const chars = stripSay(s.say).length;
    const minDur = tpl.min || 4;
    s._auto = chars ? Math.max(minDur, chars / st.pace + 1.0) : (tpl.dur || 5.5);
    s._dur = +s.dur > 0.8 ? +s.dur : s._auto;
    s._start = start; start += s._dur;
    s._tr = s.type === 'cover' ? 'iris' : TRANSITIONS[i % 2];
    if (TRANSITIONS.includes(s.transition)) s._tr = s.transition;
    s._punchAt = Math.max(T0 + 1.0, s._dur * 0.5);
  });
  st.scenes.forEach((s, i) => { s._next = st.scenes[i + 1] ? st.scenes[i + 1]._pal : null; });
  S.total = start;
  S.rev = (S.rev || 0) + 1;
  backdropCache.clear();
}
/** 预演一遍每一幕，采集音效节拍 + 决定金句出现时间 */
function collectBeats(S) {
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = Math.round((320 * S.L.H) / S.L.W);
  const L2 = getLayout(cv.width, cv.height, S.story.presenter);
  const kit = new Kit(cv.getContext('2d'), cv.width, cv.height);
  kit.defs = S.story.defs; kit.assets = S.assets;
  const S2 = Object.assign({}, S, { L: L2 });
  S.events = [];
  S.story.scenes.forEach((s, i) => {
    kit.beats = [];
    try { renderScene(kit, S2, i, s._dur - 0.01, true); } catch (e) { console.error('[nrp] 第' + (i + 1) + '幕渲染出错：' + e.message); s._err = e.message; }
    const body = kit.beats.filter(b => b.sfx !== 'stamp' && b.sfx !== 'sheen');
    const last = body.reduce((m, b) => Math.max(m, b.t), T0);
    if (s.punch) {
      const say = stripSay(s.say), idx = findCue(say, s.punch);
      let at = idx >= 0 ? 0.3 + (idx / say.length) * Math.max(1, s._dur - 0.9) - 0.2 : last + 0.7;
      s._punchAt = clamp(Math.max(at, T0 + 0.6), T0 + 0.6, Math.max(T0 + 0.6, s._dur - 1.7));
      body.push({ t: s._punchAt, sfx: 'stamp' }, { t: s._punchAt + 0.45, sfx: 'sheen' });
    }
    const seen = new Set();
    body.forEach(b => {
      const key = b.sfx + '@' + b.t.toFixed(2);
      if (seen.has(key) || b.t > s._dur) return; seen.add(key);
      S.events.push({ t: s._start + b.t, sfx: b.sfx });
    });
    if (i) S.events.push({ t: s._start + 0.02, sfx: 'whoosh' });
  });
  S.events.sort((a, b) => a.t - b.t);
  backdropCache.clear();
}

/* ---------- 一幕的完整渲染 ---------- */
function renderScene(kit, S, i, t, planning) {
  const s = S.story.scenes[i], L = S.L, c = kit.c;
  kit.pal = s._pal; kit.t = t; kit.seed = s._seed;
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (planning) { const k2 = kit; drawBackdrop(k2, L, s._skel, s._seed); }
  else c.drawImage(cachedBackdrop(S, kit, s), 0, 0);
  drawDecor(kit, S, s);
  const R = stageRect(L, s);
  const tpl = TEMPLATES[s.type] || TEMPLATES.list;
  try { tpl.draw(kit, s, R, S); }
  catch (e) {
    if (!s._err) { s._err = e.message; console.error('[nrp] 第' + (i + 1) + '幕(' + s.type + ')出错：' + e.message); }
    kit.tag('这一幕的数据有问题：' + e.message, R.x + R.w / 2, R.y + R.h / 2, { size: 26, fill: kit.pal.accent, maxW: R.w * 0.9 });
  }
  drawForeground(kit, S, s);
  if (s.ribbon) {
    const k = kit.in(0.32, 'card', 0.5, 1.4);
    kit.ribbon(String(s.ribbon), L.cx, L.H * L.Z.rib - (1 - Math.min(1, k)) * 40 * L.U, L.cw * 0.86, k);
    if (k > 0.5) { // 丝带两侧的星芒
      const w = Math.min(L.cw * 0.86, kit.measure(String(s.ribbon), 40 * L.U, 'title') + 190 * L.U);
      const tw = 0.9 + 0.15 * Math.sin(t * 4);
      kit.sparkle(L.cx - w / 2 - 34 * L.U, L.H * L.Z.rib - 8 * L.U, 15 * L.U * tw, { fill: kit.pal.accent });
      kit.sparkle(L.cx + w / 2 + 34 * L.U, L.H * L.Z.rib + 10 * L.U, 11 * L.U * tw, { fill: PAPER });
    }
  }
  if (s.punch) drawPunch(kit, S, s);
  if (s.source) drawSource(kit, S, s);
  c.restore();
}

/* ---------- 字幕 ---------- */
function subtitleChunks(s, maxChars) {
  if (s._subs && s._subsN === maxChars) return s._subs;
  const say = String(s.say || '').trim(); const out = [];
  if (say) {
    const parts = say.split(/(?<=[，。！？；：,.!?;、])/).map(v => v.trim()).filter(Boolean);
    let cur = '';
    const push = v => { while (v.length > maxChars) { out.push(v.slice(0, maxChars)); v = v.slice(maxChars); } return v; };
    for (const p of parts) {
      if ((cur + p).length <= maxChars) cur += p;
      else { if (cur) out.push(cur); cur = push(p); }
    }
    if (cur) out.push(cur);
  }
  const total = out.reduce((n, v) => n + v.length, 0) || 1;
  let acc = 0; const span = Math.max(0.5, (s._dur || 5) - 0.5);
  s._subs = out.map(v => { const a = 0.25 + (acc / total) * span; acc += v.length; return { text: v.replace(/[，。；、,.;]$/, ''), a, b: 0.25 + (acc / total) * span }; });
  s._subsN = maxChars;
  return s._subs;
}
function drawSubtitle(kit, S, s, t) {
  const L = S.L, ch = subtitleChunks(s, L.wide ? (L.pres === 'none' ? 24 : 17) : L.tall ? 15 : 17);
  const cur = ch.find(v => t >= v.a && t < v.b); if (!cur) return;
  kit.text(cur.text, L.cx, L.H * L.Z.sub, { size: L.wide ? 40 : 44, color: PAPER, stroke: INK, sw: 9, kind: 'title', maxW: L.cw * 0.92 });
}

/* ---------- 整帧渲染：转场 + 幕 + 字幕 + 颗粒 ---------- */
function locate(S, gt) {
  const sc = S.story.scenes; if (!sc.length) return { i: -1, t: 0 };
  gt = clamp(gt, 0, Math.max(0, S.total - 0.001));
  let lo = 0, hi = sc.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (sc[mid]._start <= gt) lo = mid; else hi = mid - 1; }
  return { i: lo, t: gt - sc[lo]._start };
}
function renderFrame(kit, S, gt, opts = {}) {
  const c = kit.c, L = S.L, { W, H, U } = L;
  kit.gt = gt; kit.boil = Math.floor(gt * 12); kit.beats = null;
  kit.defs = S.story.defs; kit.assets = S.assets;
  c.setTransform(1, 0, 0, 1, 0, 0);
  const { i, t } = locate(S, gt);
  if (i < 0) { c.fillStyle = '#0077C8'; c.fillRect(0, 0, W, H); return; }
  const s = S.story.scenes[i];
  if (i > 0 && t < TR) {
    const prev = S.story.scenes[i - 1], p = t / TR;
    renderScene(kit, S, i - 1, prev._dur);
    c.save(); c.beginPath();
    let edge = null;
    if (s._tr === 'iris') {
      const rad = Math.hypot(W, H) * 0.56 * E.inOutCubic(p);
      c.arc(L.cx, H / 2, rad, 0, TAU);
      edge = () => { c.beginPath(); c.arc(L.cx, H / 2, rad, 0, TAU); };
    } else if (s._tr === 'drop') {
      const y = E.outCubic(p) * (H + 40 * U);
      const f = x => y - 26 * U + Math.sin((x / W) * TAU * 2.5 + 1) * 16 * U;
      c.moveTo(0, -10); c.lineTo(W, -10); c.lineTo(W, f(W));
      for (let x = W; x >= 0; x -= 24) c.lineTo(x, f(x));
      c.closePath();
      edge = () => { c.beginPath(); c.moveTo(W, f(W)); for (let x = W; x >= -24; x -= 24) c.lineTo(x, f(x)); };
    } else {
      const xe = E.inOutCubic(p) * (W + 120 * U) - 60 * U;
      const f = y => xe + Math.sin((y / H) * TAU * 1.5 + 2) * 30 * U;
      c.moveTo(-10, 0); c.lineTo(f(0), 0);
      for (let y = 0; y <= H; y += 24) c.lineTo(f(y), y);
      c.lineTo(-10, H); c.closePath();
      edge = () => { c.beginPath(); c.moveTo(f(0), 0); for (let y = 0; y <= H + 24; y += 24) c.lineTo(f(y), y); };
    }
    c.clip();
    renderScene(kit, S, i, t);
    c.restore();
    if (edge && p < 0.98) { edge(); c.lineWidth = 7 * U; c.strokeStyle = INK; c.stroke(); }
  } else renderScene(kit, S, i, t);
  if (opts.subs) drawSubtitle(kit, S, s, t);
  kit.grain();
  if (opts.guides) drawGuides(kit, S);
}
function drawGuides(kit, S) {
  const c = kit.c, L = S.L, { W, H, U } = L;
  c.save(); c.setLineDash([10 * U, 8 * U]); c.lineWidth = 2 * U; c.strokeStyle = 'rgba(255,255,255,.85)';
  const mx = W * (L.wide ? 0.035 : 0.05), top = H * (L.tall ? 0.1 : 0.04), bot = H * (L.tall ? 0.18 : 0.04);
  c.strokeRect(mx, top, W - 2 * mx, H - top - bot);
  if (L.pres !== 'none') {
    const x = L.pres === 'right' ? L.cw : 0, w = W - L.cw;
    c.strokeStyle = 'rgba(20,20,20,.9)'; c.strokeRect(x + 14 * U, 14 * U, w - 28 * U, H - 28 * U);
    c.setLineDash([]); c.font = fontStr(26 * U, 'body'); c.fillStyle = 'rgba(20,20,20,.9)'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('真人出镜区（导出时不会画这条线）', x + w / 2, H * 0.5);
  }
  c.restore();
}
