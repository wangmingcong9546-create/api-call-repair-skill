/* =====================================================================
 * 02 道具库 + 吉祥物骨架
 * 道具 = 100×100 坐标盒里的一组形状（纯数据，不是代码）。
 * 引擎负责统一墨线、赛璐珞阴影、排线、抖动，所以任何 AI 画的形状都会自动入风格。
 * ===================================================================== */
const C = (x, y, r, fill, o) => Object.assign({ shape: 'circle', x, y, r, fill }, o);
const El = (x, y, rx, ry, fill, o) => Object.assign({ shape: 'ellipse', x, y, rx, ry, fill }, o);
const Rc = (x, y, w, h, r, fill, o) => Object.assign({ shape: 'rect', x, y, w, h, r, fill }, o);
const Pa = (d, fill, o) => Object.assign({ shape: 'path', d, fill }, o);
const Ln = (d, o) => Object.assign({ shape: 'line', d }, o);
const Tx = (x, y, text, size, fill, o) => Object.assign({ shape: 'text', x, y, text, size, fill }, o);

function gearPath(cx, cy, r1, r2, n) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, w = TAU / n;
    const pt = (ang, r) => `${(cx + Math.cos(ang) * r).toFixed(1)} ${(cy + Math.sin(ang) * r).toFixed(1)}`;
    d += (i ? 'L' : 'M') + pt(a - w * 0.18, r2) + 'L' + pt(a + w * 0.18, r2) + 'L' + pt(a + w * 0.32, r1) + 'L' + pt(a + w * 0.68, r1);
  }
  return d + 'Z';
}
function bust(dx, dy, k, body) {
  const X = v => +(dx + v * k).toFixed(1), Y = v => +(dy + v * k).toFixed(1);
  return [
    Pa(`M${X(14)} ${Y(96)} Q${X(14)} ${Y(60)} ${X(50)} ${Y(60)} Q${X(86)} ${Y(60)} ${X(86)} ${Y(96)} Z`, body, { shade: 6 * k }),
    C(X(50), Y(38), 21 * k, 'paper'),
    Pa(`M${X(29)} ${Y(37)} Q${X(27)} ${Y(13)} ${X(50)} ${Y(14)} Q${X(73)} ${Y(13)} ${X(71)} ${Y(37)} Q${X(62)} ${Y(25)} ${X(50)} ${Y(27)} Q${X(38)} ${Y(25)} ${X(29)} ${Y(37)} Z`, 'ink'),
    C(X(43), Y(42), 2.3 * k, 'ink', { ink: false }), C(X(57), Y(42), 2.3 * k, 'ink', { ink: false }),
    Ln(`M${X(44)} ${Y(49)} Q${X(50)} ${Y(54)} ${X(56)} ${Y(49)}`),
  ];
}

const PROPS = {
  cup: [
    Pa('M57 3 L66 5 L60 30 L51 30 Z', 'accent'),
    Pa('M24 34 L76 34 L69 92 Q68 96 64 96 L36 96 Q32 96 31 92 Z', 'paper', { shade: 9, hatch: true }),
    Pa('M27.4 52 L72.6 52 L70 78 L30 78 Z', 'hero'),
    C(50, 65, 7.5, 'paper', { thin: true }),
    Pa('M25 30 Q27 13 50 13 Q73 13 75 30 Z', 'soft', { shine: true }),
    Rc(19, 28, 62, 9, 4.5, 'paper'),
  ],
  coin: [
    C(50, 50, 40, 'accent', { shade: 7 }),
    C(50, 50, 29, 'none', { thin: true }),
    Tx(50, 52, '¥', 42, 'ink'),
  ],
  coins: [
    Pa('M14 70 v10 a36 11 0 0 0 72 0 v-10 Z', 'accent-d'), El(50, 70, 36, 11, 'accent'),
    Pa('M14 54 v10 a36 11 0 0 0 72 0 v-10 Z', 'accent-d'), El(50, 54, 36, 11, 'accent'),
    Pa('M14 38 v10 a36 11 0 0 0 72 0 v-10 Z', 'accent-d'), El(50, 38, 36, 11, 'accent'),
    El(50, 38, 23, 6.5, 'none', { thin: true }),
  ],
  store: [
    Rc(14, 40, 72, 54, 3, 'paper', { shade: 8, hatch: true }),
    Rc(42, 62, 18, 32, 2, 'soft'), C(56, 79, 1.6, 'ink', { ink: false }),
    Rc(20, 58, 16, 18, 2, 'white', { thin: true }), Rc(66, 58, 14, 18, 2, 'white', { thin: true }),
    Pa('M10 40 L16 22 L84 22 L90 40 Q83.3 50 76.7 40 Q70 50 63.3 40 Q56.7 50 50 40 Q43.3 50 36.7 40 Q30 50 23.3 40 Q16.7 50 10 40 Z', 'hero'),
    Pa('M23.3 40 L27.5 22 L39 22 L36.7 40 Q30 50 23.3 40 Z', 'paper', { thin: true }),
    Pa('M50 40 L50 22 L61.5 22 L63.3 40 Q56.7 50 50 40 Z', 'paper', { thin: true }),
    Pa('M76.7 40 L73 22 L84 22 L90 40 Q83.3 50 76.7 40 Z', 'paper', { thin: true }),
    Rc(30, 7, 40, 15, 4, 'accent'),
  ],
  factory: [
    Rc(66, 14, 13, 42, 2, 'paper'), Rc(64, 11, 17, 7, 2, 'hero'),
    C(74, 2, 5.5, 'white', { thin: true, bob: { dy: -3, speed: 1.3 } }),
    C(83, -6, 4, 'white', { thin: true, bob: { dy: -4, speed: 1.3, phase: 1.2 } }),
    Pa('M10 94 L10 52 L28 40 L28 52 L46 40 L46 52 L64 40 L64 52 L90 52 L90 94 Z', 'soft', { shade: 8, hatch: true }),
    Rc(42, 72, 16, 22, 2, 'hero'),
    Rc(17, 62, 14, 11, 1.5, 'accent', { thin: true }), Rc(68, 62, 14, 11, 1.5, 'accent', { thin: true }),
  ],
  box: [
    Rc(16, 36, 68, 54, 3, 'soft', { shade: 8, hatch: true }),
    Rc(11, 24, 78, 15, 3, 'soft'),
    Rc(44, 24, 12, 34, 0, 'paper', { thin: true }),
    Rc(56, 66, 20, 14, 2, 'paper', { thin: true }), Ln('M60 71 H72'), Ln('M60 75 H68'),
  ],
  truck: [
    Rc(6, 28, 57, 42, 4, 'paper', { shade: 7 }), Rc(6, 47, 57, 10, 0, 'hero', { thin: true }),
    Pa('M63 40 L80 40 Q84 40 86 44 L94 58 L94 70 L63 70 Z', 'hero'),
    Pa('M69 45 L79 45 L86 57 L69 57 Z', 'white', { thin: true }),
    C(24, 74, 10, 'ink'), C(24, 74, 4, 'paper', { thin: true }),
    C(76, 74, 10, 'ink'), C(76, 74, 4, 'paper', { thin: true }),
  ],
  bag: [
    Pa('M37 34 Q37 13 50 13 Q63 13 63 34', 'none'),
    Pa('M22 34 L78 34 L84 92 L16 92 Z', 'hero', { shade: 9 }),
    C(50, 62, 12, 'paper', { thin: true }),
  ],
  phone: [
    Rc(27, 5, 46, 90, 9, 'soft', { shade: 6 }),
    Rc(32, 13, 36, 66, 3, 'white', { thin: true }),
    Rc(37, 20, 26, 9, 2, 'hero', { thin: true }),
    Rc(37, 35, 26, 5, 2, 'accent', { thin: true }), Rc(37, 45, 17, 5, 2, 'accent', { thin: true }),
    Rc(37, 60, 26, 11, 5.5, 'hero', { thin: true }),
    C(50, 87, 3, 'paper', { thin: true }),
  ],
  doc: [
    Pa('M22 8 L64 8 L80 24 L80 92 L22 92 Z', 'paper', { shade: 7 }),
    Pa('M64 8 L64 24 L80 24 Z', 'soft'),
    Ln('M30 34 H70'), Ln('M30 43 H70'), Ln('M30 52 H56'),
    Rc(30, 70, 8, 14, 0, 'hero', { thin: true }), Rc(42, 63, 8, 21, 0, 'accent', { thin: true }), Rc(54, 73, 8, 11, 0, 'hero', { thin: true }),
  ],
  magnifier: [
    Rc(58, 62, 36, 12, 6, 'hero', { rot: 45 }),
    C(40, 40, 30, 'accent'),
    C(40, 40, 21, 'white', { shine: true }),
  ],
  crown: [
    Pa('M14 78 L8 34 L30 52 L50 22 L70 52 L92 34 L86 78 Z', 'accent', { shade: 8 }),
    Rc(13, 70, 74, 13, 3, 'accent'),
    C(50, 21, 5.5, 'hero'), C(8, 33, 4.5, 'hero'), C(92, 33, 4.5, 'hero'),
    C(50, 76.5, 3.6, 'hero', { thin: true }), C(30, 76.5, 2.6, 'paper', { thin: true }), C(70, 76.5, 2.6, 'paper', { thin: true }),
  ],
  person: bust(0, 0, 1, 'hero'),
  people: [...bust(-8, 8, 0.62, 'soft'), ...bust(46, 8, 0.62, 'accent'), ...bust(14, 22, 0.76, 'hero')],
  chip: [
    Pa('M34 22 V9 M50 22 V9 M66 22 V9 M34 78 V91 M50 78 V91 M66 78 V91 M22 34 H9 M22 50 H9 M22 66 H9 M78 34 H91 M78 50 H91 M78 66 H91', 'none'),
    Rc(22, 22, 56, 56, 6, 'hero', { shade: 7 }),
    Rc(34, 34, 32, 32, 3, 'accent', { thin: true }),
    Ln('M42 50 H58 M50 42 V58'),
  ],
  gear: [
    Pa(gearPath(50, 50, 31, 42, 8), 'soft', { spin: { x: 50, y: 50, speed: 0.7 }, shade: 5 }),
    C(50, 50, 13, 'paper'),
  ],
  moon: [Pa('M62 10 A42 42 0 1 0 90 62 A33 33 0 1 1 62 10 Z', 'accent', { shade: 5 })],
  saturn: [
    El(50, 50, 46, 12, 'none', { rot: -18 }),
    C(50, 50, 25, 'soft', { shade: 7, hatch: true }),
    Pa('M6.3 64.2 A46 12 -18 0 0 93.7 35.8', 'none'),
  ],
  cloud: [
    Pa('M22 72 Q6 72 8 57 Q10 45 24 46 Q26 28 46 30 Q58 21 69 33 Q87 31 89 48 Q99 54 93 65 Q90 72 80 72 Z', 'white', { shade: 9, hatch: true }),
  ],
  rocket: [
    Pa('M40 72 Q50 100 60 72 Z', 'accent', { sway: { x: 50, y: 72, deg: 7, speed: 9 } }),
    Pa('M33 50 L15 78 L33 70 Z', 'hero'), Pa('M67 50 L85 78 L67 70 Z', 'hero'),
    Pa('M50 3 Q73 28 68 66 L32 66 Q27 28 50 3 Z', 'paper', { shade: 8 }),
    C(50, 36, 9.5, 'soft', { shine: true }),
    Rc(37, 65, 26, 9, 2, 'hero'),
  ],
  bulb: [
    C(50, 40, 29, 'accent', { shine: true }),
    Ln('M41 47 L45.5 36 L50 47 L54.5 36 L59 47'),
    Rc(37, 64, 26, 11, 3, 'paper'), Rc(41, 75, 18, 9, 3, 'ink'),
  ],
  target: [
    C(46, 54, 38, 'paper', { shade: 6 }), C(46, 54, 27, 'hero'), C(46, 54, 16, 'paper'), C(46, 54, 6, 'hero'),
    Pa('M46 54 L86 14', 'none'), Pa('M74 10 L90 10 L90 26 Z', 'accent'),
  ],
  lock: [
    Pa('M28 46 V32 Q28 9 50 9 Q72 9 72 32 V46 H61 V32 Q61 20 50 20 Q39 20 39 32 V46 Z', 'soft'),
    Rc(21, 44, 58, 46, 9, 'accent', { shade: 8 }),
    C(50, 62, 6.5, 'ink'), Rc(47, 64, 6, 14, 2, 'ink', { ink: false }),
  ],
  castle: [
    Ln('M50 26 V5'), Pa('M50 5 L69 11 L50 17 Z', 'accent'),
    Pa('M18 42 V24 H31 V31 H41 V24 H59 V31 H69 V24 H82 V42 Z', 'paper'),
    Rc(22, 40, 56, 54, 2, 'paper', { shade: 8, hatch: true }),
    Pa('M40 94 V72 Q40 60 50 60 Q60 60 60 72 V94 Z', 'hero'),
    Rc(29, 50, 7, 11, 3.5, 'ink'), Rc(64, 50, 7, 11, 3.5, 'ink'),
  ],
  cart: [
    Pa('M6 16 L18 16 L32 62 H76', 'none'),
    Pa('M22 30 L86 30 L78 62 L32 62 Z', 'soft', { shade: 6 }),
    Ln('M40 30 L44 62 M57 30 L58 62 M72 30 L70 62 M25 46 H82'),
    C(40, 78, 8, 'ink'), C(40, 78, 3, 'paper', { thin: true }), C(70, 78, 8, 'ink'), C(70, 78, 3, 'paper', { thin: true }),
  ],
  card: [
    Rc(8, 22, 84, 56, 8, 'hero', { shade: 7 }),
    Rc(8, 33, 84, 11, 0, 'ink', { ink: false }),
    Rc(18, 53, 17, 13, 3, 'accent', { thin: true }),
    Ln('M44 57 H80 M44 65 H66'),
  ],
  moneybag: [
    Pa('M38 27 L31 11 Q50 20 69 11 L62 27 Q93 52 78 86 Q50 98 22 86 Q7 52 38 27 Z', 'accent', { shade: 9 }),
    Rc(33, 23, 34, 9, 4.5, 'hero'),
    Tx(50, 64, '¥', 34, 'ink'),
  ],
  chart: [
    Rc(13, 60, 17, 30, 2, 'soft'), Rc(36, 44, 17, 46, 2, 'hero'), Rc(59, 28, 17, 62, 2, 'accent'),
    Ln('M6 90 H94'),
    Pa('M10 46 L40 22 L56 32 L86 8', 'none'), Pa('M72 6 L90 4 L88 22 Z', 'ink'),
  ],
  clock: [
    C(50, 50, 40, 'hero', { shade: 6 }), C(50, 50, 31, 'white'),
    Pa('M50 50 V29 M50 50 L65 58', 'none'), C(50, 50, 3.2, 'ink'),
  ],
  calendar: [
    Rc(14, 18, 72, 72, 8, 'paper', { shade: 7 }),
    Pa('M14 26 Q14 18 22 18 H78 Q86 18 86 26 V40 H14 Z', 'hero'),
    Rc(29, 9, 7, 17, 3.5, 'ink'), Rc(64, 9, 7, 17, 3.5, 'ink'),
    Ln('M26 54 H74 M26 64 H74 M26 74 H56'),
  ],
  globe: [
    C(50, 50, 40, 'soft', { shade: 7 }),
    El(50, 50, 17, 40, 'none', { thin: true }),
    Ln('M10 50 H90 M17 30 Q50 40 83 30 M17 70 Q50 60 83 70'),
  ],
  flag: [
    Pa('M28 12 Q46 3 60 13 Q74 23 90 13 L90 50 Q74 60 60 50 Q46 40 28 49 Z', 'hero', { shade: 6, sway: { x: 28, y: 30, deg: 3, speed: 2.2 } }),
    Rc(21, 6, 7, 90, 3.5, 'ink'),
  ],
  heart: [Pa('M50 88 Q4 54 13 28 Q22 7 42 15 Q50 19 50 30 Q50 19 58 15 Q78 7 87 28 Q96 54 50 88 Z', 'hero', { shade: 8 })],
  fire: [
    Pa('M50 5 Q79 34 77 62 Q75 93 50 95 Q25 93 23 62 Q23 46 36 36 Q38 50 46 50 Q40 28 50 5 Z', 'hero'),
    Pa('M50 50 Q65 64 61 79 Q57 91 50 91 Q39 89 39 76 Q39 62 50 50 Z', 'accent', { thin: true }),
  ],
  bolt: [Pa('M58 4 L19 56 H44 L38 96 L81 40 H55 Z', 'accent', { shade: 6 })],
  question: [C(50, 50, 41, 'hero', { shade: 7 }), Tx(50, 53, '?', 58, 'paper')],
  check: [C(50, 50, 40, 'soft', { shade: 7 }), Pa('M30 52 L45 67 L72 34', 'none', { heavy: true })],
  cross: [C(50, 50, 40, 'hero', { shade: 7 }), Pa('M34 34 L66 66 M66 34 L34 66', 'none', { heavy: true })],
  up: [Pa('M50 7 L89 48 H67 V93 H33 V48 H11 Z', 'accent', { shade: 7 })],
  down: [Pa('M50 93 L11 52 H33 V7 H67 V52 H89 Z', 'hero', { shade: 7 })],
  folder: [
    Pa('M8 26 Q8 20 14 20 H38 L46 30 H86 Q92 30 92 36 V78 Q92 84 86 84 H14 Q8 84 8 78 Z', 'soft-d'),
    Rc(8, 38, 84, 46, 6, 'soft'),
  ],
  bean: [El(50, 50, 27, 39, 'hero', { rot: 25, shade: 7 }), Ln('M41 17 Q63 44 45 58 Q38 70 58 85')],
  house: [
    Rc(20, 48, 60, 44, 2, 'paper', { shade: 7, hatch: true }),
    Pa('M8 50 L50 13 L92 50 Z', 'hero'),
    Rc(44, 66, 14, 26, 2, 'soft'), Rc(26, 58, 12, 12, 2, 'accent', { thin: true }),
  ],
  building: [
    Rc(24, 10, 52, 84, 3, 'soft', { shade: 8, hatch: true }),
    ...[0, 1, 2, 3, 4].flatMap(r => [0, 1, 2].map(k => Rc(31.5 + k * 14, 18 + r * 12.5, 9, 8, 1, 'white', { thin: true }))),
    Rc(43, 81, 14, 13, 1, 'hero'),
  ],
  pin: [Pa('M50 95 Q17 54 17 38 Q17 7 50 7 Q83 7 83 38 Q83 54 50 95 Z', 'hero', { shade: 8 }), C(50, 38, 12.5, 'paper')],
  megaphone: [
    Rc(28, 56, 11, 26, 3, 'soft'),
    Pa('M18 40 L62 17 V79 L18 56 Z', 'hero', { shade: 7 }),
    Rc(7, 37, 14, 22, 4, 'paper'), Rc(61, 12, 9, 72, 4.5, 'paper'),
    Ln('M78 36 Q86 48 78 60 M86 28 Q98 48 86 68'),
  ],
  tag: [
    Pa('M10 50 L40 16 H84 Q90 16 90 22 V78 Q90 84 84 84 H40 Z', 'accent', { shade: 7 }),
    C(34, 50, 6, 'paper'), Tx(64, 52, '¥', 34, 'ink'),
  ],
  trophy: [
    Pa('M30 22 H17 Q15 45 35 47 M70 22 H83 Q85 45 65 47', 'none'),
    Rc(45, 60, 10, 17, 0, 'accent'),
    Pa('M29 13 H71 V40 Q71 63 50 63 Q29 63 29 40 Z', 'accent', { shade: 7, shine: true }),
    Rc(29, 76, 42, 13, 3, 'hero'),
  ],
  sparkle: [Pa('M50 4 Q56 44 96 50 Q56 56 50 96 Q44 56 4 50 Q44 44 50 4 Z', 'accent')],
  bubble: [Pa('M14 16 H86 Q94 16 94 24 V62 Q94 70 86 70 H46 L26 90 L30 70 H14 Q6 70 6 62 V24 Q6 16 14 16 Z', 'paper', { shade: 6 }), C(32, 43, 4, 'ink'), C(50, 43, 4, 'ink'), C(68, 43, 4, 'ink')],
  bottle: [
    Rc(42, 4, 16, 12, 3, 'hero'),
    Pa('M43 16 H57 V28 Q72 36 72 50 V88 Q72 95 65 95 H35 Q28 95 28 88 V50 Q28 36 43 28 Z', 'soft', { shade: 8, shine: true }),
    Rc(28, 54, 44, 22, 0, 'paper', { thin: true }),
  ],
  gift: [
    Rc(14, 40, 72, 52, 4, 'hero', { shade: 8 }), Rc(9, 28, 82, 16, 4, 'hero'),
    Rc(43, 28, 14, 64, 0, 'accent', { thin: true }),
    Pa('M50 28 Q30 4 22 16 Q18 28 50 28 Q82 28 78 16 Q70 4 50 28 Z', 'accent'),
  ],
  robot: [
    Ln('M50 16 V6'), C(50, 5, 4, 'accent'),
    Rc(22, 16, 56, 44, 10, 'soft', { shade: 7 }),
    C(38, 36, 7, 'white'), C(62, 36, 7, 'white'), C(38, 36, 2.6, 'ink', { ink: false }), C(62, 36, 2.6, 'ink', { ink: false }),
    Ln('M40 50 H60'),
    Rc(28, 64, 44, 30, 6, 'hero', { shade: 6 }), Rc(40, 72, 20, 10, 2, 'accent', { thin: true }),
  ],
};
const PROP_NAMES = Object.keys(PROPS);

/* ---------- 形状渲染 ---------- */
function shapeGeom(sh) {
  if (sh._g) return sh._g;
  const p = new Path2D(); let cx = 50, cy = 50, sz = 40;
  switch (sh.shape) {
    case 'circle': p.arc(sh.x, sh.y, sh.r, 0, TAU); cx = sh.x; cy = sh.y; sz = sh.r * 2; break;
    case 'ellipse': p.ellipse(sh.x, sh.y, Math.abs(sh.rx), Math.abs(sh.ry), 0, 0, TAU); cx = sh.x; cy = sh.y; sz = Math.min(sh.rx, sh.ry) * 2; break;
    case 'rect': {
      const { x, y, w, h } = sh; const r = Math.min(sh.r || 0, w / 2, h / 2);
      p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.arcTo(x + w, y, x + w, y + r, r);
      p.lineTo(x + w, y + h - r); p.arcTo(x + w, y + h, x + w - r, y + h, r);
      p.lineTo(x + r, y + h); p.arcTo(x, y + h, x, y + h - r, r);
      p.lineTo(x, y + r); p.arcTo(x, y, x + r, y, r); p.closePath();
      cx = x + w / 2; cy = y + h / 2; sz = Math.min(w, h); break;
    }
    case 'poly': {
      const a = sh.pts || []; for (let i = 0; i + 1 < a.length; i += 2) i ? p.lineTo(a[i], a[i + 1]) : p.moveTo(a[i], a[i + 1]);
      p.closePath(); break;
    }
    case 'path': case 'line': {
      let q; try { q = new Path2D(String(sh.d || '')); } catch (e) { q = new Path2D(); }
      sh._g = { p: q, cx, cy, sz }; return sh._g;
    }
    default: break;
  }
  sh._g = { p, cx, cy, sz };
  return sh._g;
}

function drawShape(kit, sh, sc, t, mirror) {
  const c = kit.c, g = shapeGeom(sh);
  const lwU = kit.lw / sc, thinU = kit.lwThin / sc;
  c.save();
  if (sh.rot) { c.translate(g.cx, g.cy); c.rotate((sh.rot * Math.PI) / 180); c.translate(-g.cx, -g.cy); }
  if (sh.spin) { const a = sh.spin; c.translate(a.x, a.y); c.rotate((a.speed || 1) * t + (a.phase || 0)); c.translate(-a.x, -a.y); }
  if (sh.sway) { const a = sh.sway; c.translate(a.x, a.y); c.rotate((((a.deg || 6) * Math.PI) / 180) * Math.sin(t * (a.speed || 2) + (a.phase || 0))); c.translate(-a.x, -a.y); }
  if (sh.bob) { const a = sh.bob, k = Math.sin(t * (a.speed || 2) + (a.phase || 0)); c.translate((a.dx || 0) * k, (a.dy || 0) * k); }
  if (sh.shape === 'text') {
    c.translate(sh.x, sh.y); if (mirror) c.scale(-1, 1);
    c.font = fontStr(sh.size || 30, 'num'); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = kit.col(sh.fill || 'ink'); c.fillText(String(sh.text || ''), 0, 0);
    c.restore(); return;
  }
  if (sh.shape === 'line') {
    c.lineWidth = sh.heavy ? lwU * 1.5 : thinU; c.strokeStyle = sh.color ? kit.col(sh.color) : INK; c.stroke(g.p);
    c.restore(); return;
  }
  const fill = kit.col(sh.fill);
  if (fill) {
    if (sh.shade) {
      const d = typeof sh.shade === 'number' ? sh.shade : Math.max(4, g.sz * 0.14);
      c.save(); c.clip(g.p);
      c.fillStyle = shade(fill); c.fill(g.p);
      if (sh.hatch) {
        c.strokeStyle = INK; c.globalAlpha = 0.24; c.lineWidth = 0.9 * (kit.U / sc); c.beginPath();
        for (let x = -100; x < 220; x += 4.2 * Math.max(1, (kit.U / sc) * 0.9)) { c.moveTo(x, 130); c.lineTo(x + 70, -30); }
        c.stroke(); c.globalAlpha = 1;
      }
      c.translate(-d, -d * 0.55); c.fillStyle = fill; c.fill(g.p);
      c.restore();
    } else { c.fillStyle = fill; c.fill(g.p); }
    if (sh.dots) {
      c.save(); c.clip(g.p); c.fillStyle = INK; c.globalAlpha = 0.16; c.beginPath();
      const s = 6; let row = 0;
      for (let y = -10; y < 115; y += s * 0.866, row++) for (let x = -10 + (row % 2 ? s / 2 : 0); x < 115; x += s) { c.moveTo(x + 1.2, y); c.arc(x, y, 1.2, 0, TAU); }
      c.fill(); c.restore();
    }
    if (sh.shine) {
      c.save(); c.clip(g.p); c.strokeStyle = WHITE; c.lineWidth = Math.max(thinU * 1.6, g.sz * 0.06); c.lineCap = 'round';
      c.beginPath();
      if (sh.shape === 'circle') c.arc(g.cx, g.cy, sh.r * 0.66, Math.PI * 1.08, Math.PI * 1.42);
      else { c.moveTo(g.cx - g.sz * 0.3, g.cy - g.sz * 0.05); c.quadraticCurveTo(g.cx - g.sz * 0.3, g.cy - g.sz * 0.3, g.cx - g.sz * 0.08, g.cy - g.sz * 0.34); }
      c.stroke(); c.restore();
    }
  }
  if (sh.ink !== false) {
    c.lineWidth = sh.heavy ? lwU * 1.8 : sh.thin ? thinU : lwU; c.strokeStyle = INK; c.stroke(g.p);
  }
  c.restore();
}

function propShapes(kit, name) {
  if (Array.isArray(name)) return name;
  const d = kit.defs && kit.defs[name];
  if (d) return Array.isArray(d) ? d : d.shapes || [];
  return PROPS[name] || null;
}
/** 画一个道具：以 (cx,cy) 为中心，size = 100 单位盒的边长（像素） */
function drawProp(kit, name, cx, cy, size, { rot = 0, flip = false, still = false, t, k = 1 } = {}) {
  let shapes = propShapes(kit, name);
  if (!shapes) shapes = PROPS.sparkle;
  if (k <= 0.001 || size <= 0) return;
  const c = kit.c, sc = (size / 100) * k, tt = t == null ? kit.t : t;
  c.save(); c.translate(cx, cy);
  if (!still) { // 线条抖动：12fps 轻微颤动
    const r = mulberry(kit.boil * 31 + hashStr(typeof name === 'string' ? name : 'x') + Math.round(cx));
    c.rotate((r() - 0.5) * 0.014); c.translate((r() - 0.5) * 0.9 * kit.U, (r() - 0.5) * 0.9 * kit.U);
  }
  if (rot) c.rotate(rot);
  c.scale(flip ? -sc : sc, sc); c.translate(-50, -50);
  for (const sh of shapes) { try { drawShape(kit, sh, sc, tt, flip); } catch (e) { /* 单个形状出错不影响整体 */ } }
  c.restore();
}

/* =====================================================================
 * 吉祥物：道具当身体 + 自动加表情、橡皮管手脚（1930s rubber hose）
 * ===================================================================== */
const POSES = {
  //            左手 [x,y]   右手 [x,y]    眼神 [dx,dy]  默认表情
  idle:    { L: [8, 76],   R: [92, 76],  gaze: [0, 0],    mood: 'smile' },
  hips:    { L: [20, 72],  R: [80, 72],  gaze: [0, 0],    mood: 'smirk', elbow: 1.6 },
  point:   { L: [20, 72],  R: [122, 40], gaze: [2, 0],    mood: 'smile', finger: 1 },
  up:      { L: [20, 72],  R: [108, -6], gaze: [1, -2],   mood: 'grin', finger: 1 },
  cheer:   { L: [-8, 4],   R: [108, 4],  gaze: [0, -1],   mood: 'grin', bounce: 1 },
  think:   { L: [20, 72],  R: [70, 70],  gaze: [-2, -2],  mood: 'hmm', chin: 1 },
  inspect: { L: [20, 72],  R: [110, 48], gaze: [2, 0.5],  mood: 'smirk', item: 'magnifier' },
  hold:    { L: [20, 72],  R: [108, 12], gaze: [1.5, -1], mood: 'grin', carry: 1 },
  wave:    { L: [20, 72],  R: [110, 6],  gaze: [0, 0],    mood: 'grin', wave: 1 },
  wow:     { L: [-4, 34],  R: [104, 34], gaze: [0, 0],    mood: 'wow' },
};
const POSE_NAMES = Object.keys(POSES);

function normMascot(m) {
  if (!m) return null;
  if (typeof m === 'string') m = { body: m };
  const o = Object.assign({ body: 'cup', eyes: 'dot', limb: 'ink', hands: 'white', shoes: 'hero', legs: true, arms: true, blush: true }, m);
  o.face = m.face === false ? false : Object.assign({ x: 50, y: 62, s: 1 }, m.face || {});
  o.armY = m.armY != null ? m.armY : 60; o.armL = m.armL != null ? m.armL : 26; o.armR = m.armR != null ? m.armR : 74;
  o.legY = m.legY != null ? m.legY : 94; o.legL = m.legL != null ? m.legL : 40; o.legR = m.legR != null ? m.legR : 60;
  return o;
}

/**
 * 画吉祥物。(cx, footY) = 脚底中心；size = 身体盒边长（像素）。
 * opts: pose, from(上一个姿势), k(姿势混合进度 0..1), flip, item(手里的道具), mood, enter(入场缩放)
 */
function drawMascot(kit, m, cx, footY, size, opts = {}) {
  m = normMascot(m); if (!m) return;
  const c = kit.c, t = kit.t, U = kit.U;
  const enter = opts.enter == null ? 1 : opts.enter; if (enter <= 0.001) return;
  const P = POSES[opts.pose] || POSES.idle, P0 = POSES[opts.from] || POSES.idle;
  // 预备动作：先反向蓄力再弹到位
  const kp = clamp(opts.k == null ? 1 : opts.k);
  const mix = kp < 0.18 ? -0.1 * Math.sin((kp / 0.18) * Math.PI) : E.outBack((kp - 0.18) / 0.82, 1.3);
  const legLen = m.legs ? 20 : 0;
  const sc = size / 100;
  const breathe = Math.sin(t * 2.85) * 0.012;
  const bounce = P.bounce ? Math.abs(Math.sin(t * 5.2)) * 5 * mix : 0;
  const bob = Math.sin(t * 2.85) * 0.9;

  c.save();
  c.translate(cx, footY); c.scale(enter, enter);
  { const r = mulberry(kit.boil * 17 + 5); c.translate((r() - 0.5) * 0.8 * U, 0); }
  c.scale((opts.flip ? -1 : 1) * sc, sc);
  c.translate(-50, -(100 + legLen) - bounce);       // 现在处于身体的 100 盒坐标系
  const lw = kit.lw / sc;
  const limbW = Math.max(4.6, (kit.lw * 1.35) / sc);
  const limbCol = kit.col(m.limb);

  const hose = (x1, y1, qx, qy, x2, y2) => {
    c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(qx, qy, x2, y2);
    c.lineWidth = limbW; c.strokeStyle = limbCol === INK ? INK : INK; c.stroke();
    if (limbCol !== INK) { c.lineWidth = Math.max(1, limbW - lw * 1.6); c.strokeStyle = limbCol; c.stroke(); }
  };
  // 腿和鞋（身体后面）
  if (m.legs) {
    const gy = 100 + legLen + bounce;
    for (const s of [-1, 1]) {
      const lx = s < 0 ? m.legL : m.legR;
      hose(lx, m.legY + bob - 3, lx + s * 1.5, (m.legY + gy) / 2, lx + s * 3, gy - 5);
      c.beginPath(); c.ellipse(lx + s * 8, gy - 5, 11, 6.2, 0, 0, TAU);
      c.fillStyle = kit.col(m.shoes); c.fill(); c.lineWidth = lw; c.strokeStyle = INK; c.stroke();
    }
  }
  // 身体
  c.save();
  c.translate(50, 100); c.scale(1 - breathe * 0.6, 1 + breathe); c.translate(-50, -100 + bob);
  const lean = (P.item ? 0.05 : 0) * mix;
  if (lean) { c.translate(50, 100); c.rotate(lean); c.translate(-50, -100); }
  const shapes = propShapes(kit, m.body) || PROPS.cup;
  for (const sh of shapes) { try { drawShape(kit, sh, sc, t, !!opts.flip); } catch (e) { /* ignore */ } }
  if (m.hat) {
    const h = typeof m.hat === 'string' ? { prop: m.hat } : m.hat;
    const hs = h.size || 42;
    c.save(); c.translate(h.x == null ? 50 : h.x, h.y == null ? 6 : h.y); c.rotate(((h.rot == null ? -8 : h.rot) * Math.PI) / 180);
    c.scale(hs / 100, hs / 100); c.translate(-50, -50);
    for (const sh of propShapes(kit, h.prop) || []) drawShape(kit, sh, (sc * hs) / 100, t, !!opts.flip);
    c.restore();
  }
  // 表情
  if (m.face) {
    const f = m.face, s = f.s || 1, mood = opts.mood || P.mood;
    const gz = [lerp(P0.gaze[0], P.gaze[0], clamp(mix)), lerp(P0.gaze[1], P.gaze[1], clamp(mix))];
    // 眨眼：种子随机间隔
    const cyc = 3.4, ph = (t + (hashStr(String(m.body)) % 100) / 37) % cyc;
    const blink = ph < 0.12 ? 0.12 : 1;
    c.save(); c.translate(f.x, f.y); c.scale(s, s);
    if (m.blush) {
      c.fillStyle = '#F49AB4';
      for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 15, 7, 4.6, 2.8, 0, 0, TAU); c.fill(); }
    }
    if (m.eyes === 'shades') {
      c.fillStyle = INK; c.strokeStyle = INK; c.lineWidth = lw / s;
      for (const sx of [-1, 1]) {
        c.beginPath(); const x0 = sx < 0 ? -17.5 : 1.5;
        c.moveTo(x0, -6); c.lineTo(x0 + 16, -6); c.quadraticCurveTo(x0 + 16, 6, x0 + 8, 6); c.quadraticCurveTo(x0, 6, x0, -6); c.closePath(); c.fill(); c.stroke();
      }
      c.beginPath(); c.moveTo(-2, -4.5); c.lineTo(2, -4.5); c.stroke();
      c.strokeStyle = WHITE; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-13.5, -2.5); c.lineTo(-10, -2.5); c.moveTo(5.5, -2.5); c.lineTo(9, -2.5); c.stroke();
    } else {
      for (const sx of [-1, 1]) {
        c.save(); c.translate(sx * 8.5 + gz[0], gz[1]); c.scale(1, blink);
        c.beginPath(); c.ellipse(0, 0, 3.7, mood === 'wow' ? 6.4 : 5.6, 0, 0, TAU); c.fillStyle = INK; c.fill();
        c.beginPath(); c.arc(1.1, -2.2, 1.25, 0, TAU); c.fillStyle = WHITE; c.fill();
        c.restore();
      }
    }
    c.lineWidth = Math.max(lw / s, 1.9); c.strokeStyle = INK; c.lineCap = 'round';
    c.beginPath();
    if (mood === 'grin') {
      c.moveTo(-7.5, 9.5); c.quadraticCurveTo(0, 22, 7.5, 9.5); c.closePath(); c.fillStyle = INK; c.fill(); c.stroke();
      c.beginPath(); c.ellipse(0, 14.6, 3.2, 2.2, 0, 0, TAU); c.fillStyle = '#F2718F'; c.fill();
    } else if (mood === 'wow') { c.ellipse(0, 13, 3.4, 4.4, 0, 0, TAU); c.fillStyle = INK; c.fill(); }
    else if (mood === 'smirk') { c.moveTo(-5, 11.5); c.quadraticCurveTo(2, 16, 8, 9.5); c.stroke(); }
    else if (mood === 'hmm') { c.moveTo(-4, 13); c.quadraticCurveTo(0, 11, 5, 13.5); c.stroke(); }
    else { c.moveTo(-6.5, 10.5); c.quadraticCurveTo(0, 17.5, 6.5, 10.5); c.stroke(); }
    c.restore();
  }
  c.restore();

  // 手臂（身体前面）
  if (m.arms) {
    const hand = (side) => {
      const sx = side === 'L' ? m.armL : m.armR, sy = m.armY + bob;
      const a = P0[side], b = P[side];
      let hx = lerp(a[0], b[0], mix), hy = lerp(a[1], b[1], mix) + bob * 0.5;
      if (side === 'R' && P.chin && m.face) { hx = lerp(a[0], m.face.x + 13, mix); hy = lerp(a[1], m.face.y + 22 * (m.face.s || 1), mix); }
      if (side === 'R' && P.wave) { const w = Math.sin(t * 7) * 7 * clamp(mix); hx += w; hy += Math.abs(w) * 0.3; }
      if (P.bounce) hy -= bounce * 0.5;
      const dir = side === 'L' ? -1 : 1;
      const mx = (sx + hx) / 2, my = (sy + hy) / 2;
      const dist = Math.hypot(hx - sx, hy - sy);
      const sag = clamp(1 - dist / 62, 0.12, 1) * 20 * (P.elbow || 1);
      const up = hy < sy - 8;
      hose(sx, sy, mx + dir * sag * (up ? 0.9 : 1), my + (up ? sag * 0.5 : sag * 0.45), hx, hy);
      // 手里的道具
      const itemName = side === 'R' ? (P.item || (P.carry ? opts.item : null)) : null;
      if (itemName && mix > 0.3) {
        const isz = P.carry ? 46 : 50, ix = hx + (P.carry ? 2 : 13), iy = hy - (P.carry ? 27 : 15);
        c.save(); c.translate(ix, iy); c.rotate(P.carry ? Math.sin(t * 2.2) * 0.05 : -0.25);
        c.scale((isz / 100) * clamp(mix), (isz / 100) * clamp(mix)); c.translate(-50, -50);
        for (const sh of propShapes(kit, itemName) || []) drawShape(kit, sh, (sc * isz) / 100, t, !!opts.flip);
        c.restore();
      }
      if (side === 'R' && P.finger && mix > 0.5) {
        const ang = Math.atan2(hy - sy, hx - sx);
        c.save(); c.translate(hx, hy); c.rotate(ang);
        c.beginPath(); c.roundRect ? c.roundRect(2, -3, 15, 6, 3) : c.rect(2, -3, 15, 6);
        c.fillStyle = kit.col(m.hands); c.fill(); c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); c.restore();
      }
      c.beginPath(); c.arc(hx, hy, 7.6, 0, TAU); c.fillStyle = kit.col(m.hands); c.fill(); c.lineWidth = lw; c.strokeStyle = INK; c.stroke();
    };
    hand('L'); hand('R');
  }
  c.restore();
}
