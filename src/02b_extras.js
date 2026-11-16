/* =====================================================================
 * 02b 额外道具。不改道具库本体，只往里面追加。
 * 雪人 / 圆团子是给吉祥物用的身体，五官由吉祥物系统另画，这里不要画眼睛。
 * ===================================================================== */
const PROP_META = {};

function addProp(name, shapes, meta) {
  PROPS[name] = shapes;
  if (meta) PROP_META[name] = meta;
}

addProp('lemon', [
  El(50, 54, 30, 36, 'accent', { rot: -18, shade: 7, shine: true }),
  Pa('M48 20 C44 6 62 2 66 16 C58 12 52 16 48 20 Z', 'soft'),
]);

addProp('percent', [
  C(50, 50, 40, 'paper', { shade: 6 }),
  Tx(50, 54, '%', 46, 'hero'),
]);

addProp('snowman', [
  El(50, 76, 30, 24, 'paper', { shade: 8, hatch: true }),
  El(50, 48, 22, 19, 'paper', { shade: 6 }),
  C(50, 24, 15, 'white', { shine: true }),
  Pa('M26 36 Q50 50 74 36 L78 43 Q50 56 22 43 Z', 'hero'),
  C(50, 62, 3.1, 'ink', { ink: false }),
  C(50, 74, 3.1, 'ink', { ink: false }),
  C(50, 86, 3.1, 'ink', { ink: false }),
], { face: { x: 50, y: 25, s: 0.66 }, armY: 50, armL: 30, armR: 70, legs: false });

addProp('blob', [
  Pa('M50 6 Q86 8 88 40 Q92 78 62 94 Q50 102 38 94 Q8 78 12 40 Q14 8 50 6 Z', 'hero', { shade: 9, shine: true }),
  El(50, 64, 16, 13, 'paper'),
], { face: { x: 50, y: 42, s: 0.92 }, armY: 62, armL: 24, armR: 76, legY: 96, legL: 40, legR: 60 });

/* 让新身体自动带上脸的位置和手脚挂点，调用方仍可覆盖。 */
(function () {
  const orig = drawMascot;
  // eslint-disable-next-line no-global-assign
  drawMascot = function (kit, m, cx, foot, size, opts) {
    if (typeof m === 'string') m = { body: m };
    const meta = m && PROP_META[m.body];
    if (meta) m = Object.assign({}, meta, m);
    return orig(kit, m, cx, foot, size, opts);
  };
})();
