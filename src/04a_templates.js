/* =====================================================================
 * 04 图解模板库（上）：cover / number / compare / bars / trend / split / waterfall
 * 每个模板：{ skel: 偏好的背景骨架, min: 最短时长, draw(kit, s, R, S) }
 * R = 舞台矩形；所有坐标都从 R 推出来，所以三种画幅自动适配。
 * ===================================================================== */
const TEMPLATES = {};
const arr = v => (Array.isArray(v) ? v : v == null ? [] : [v]);
const str = v => (v == null ? '' : String(v));

/** 以中心弹出的复古窗口卡片；fn(body) 在卡片本地坐标里画内容 */
function card(kit, x, y, w, h, k, tilt, opts, fn) {
  kit.at(x + w / 2, y + h / 2, k, tilt, () => { const b = kit.window(-w / 2, -h / 2, w, h, opts); if (fn) fn(b); });
}
function splitTitle(s, max) {
  s = str(s); if (s.length <= max) return [s];
  const mid = s.length / 2; let best = -1, bd = 1e9;
  for (let i = 1; i < s.length - 1; i++) if ('：:，, ·|—-'.includes(s[i])) { const d = Math.abs(i - mid); if (d < bd) { bd = d; best = i; } }
  if (best > 0 && bd < s.length * 0.3) return [s.slice(0, best).trim(), s.slice(best + 1).trim()];
  const cut = Math.ceil(mid); return [s.slice(0, cut), s.slice(cut)];
}
/** 条形的赛璐珞阴影：右侧一条同色加深 */
function celBar(kit, x, y, w, h, fill, { r = 5, hatch = false } = {}) {
  if (Math.abs(h) < 0.5 || w < 0.5) return;
  const c = kit.c; if (h < 0) { y += h; h = -h; }
  kit.rrPath(x, y, w, h, Math.min(r * kit.U, w / 2, h / 2));
  c.save(); c.fillStyle = fill; c.fill(); c.clip();
  c.fillStyle = shade(fill); c.fillRect(x + w * 0.74, y, w * 0.3, h);
  if (hatch) kit.hatch(x, y, w, h, { gap: 7, alpha: 0.28 });
  c.restore();
  kit.rrPath(x, y, w, h, Math.min(r * kit.U, w / 2, h / 2)); kit.paint(null, true);
}
const seriesColors = p => [p.hero, p.accent, p.soft, shade(p.hero, 16, -8), shade(p.soft, -16, 6), p.paper];
function pickHighlight(h, items) {
  if (h == null) return -1;
  if (typeof h === 'number') return h;
  if (h === 'last') return items.length - 1;
  if (h === 'max') { let m = 0; items.forEach((it, i) => { if (it.num > items[m].num) m = i; }); return m; }
  return items.findIndex(it => it.label === h);
}

/* ---------- cover：封面 / 章节标题 ---------- */
TEMPLATES.cover = {
  skel: ['full', 'hills', 'arc', 'checker'], min: 3.2, dur: 4.5,
  draw(kit, s, R, S) {
    const L = S.L, U = L.U, t = kit.t, p = kit.pal;
    const ms = mascotSlot(kit, S, s, R, { frac: 0.2 }), M = ms.main, cx = M.x + M.w / 2;
    // 漂浮道具（在标题后面）
    const spots = [[0.06, 0.13, -0.2], [0.95, 0.2, 0.18], [0.09, 0.88, 0.14]];
    arr(s.props).slice(0, 3).forEach((name, i) => {
      const [fx, fy, rot] = spots[i], k = kit.in(T0 + 0.5 + i * 0.12, 'pop', 0.45, 2);
      drawProp(kit, name, M.x + M.w * fx, M.y + M.h * fy + Math.sin(t * 1.6 + i * 2) * 8 * U, Math.min(M.h, M.w) * 0.27, { rot: rot + Math.sin(t * 1.2 + i) * 0.04, k });
    });
    const lines = splitTitle(s.title || S.story.title, L.wide ? 11 : 6);
    const size = L.wide ? 150 : 132, lh = size * U * 1.14;
    const blockH = lines.length * lh + (s.sub ? 96 * U : 0) + (s.kicker ? 78 * U : 0);
    let y = M.y + M.h / 2 - blockH / 2;
    if (s.kicker) {
      const k = kit.in(T0, 'pop');
      kit.at(cx, y + 26 * U, k, -0.03, () => kit.tag(str(s.kicker), 0, 0, { size: 32, fill: p.hero, padX: 24, padY: 12, shadow: 4 }));
      y += 78 * U;
    }
    lines.forEach((ln, i) => {
      const at = T0 + 0.15 + i * 0.2, k = kit.in(at, 'stamp', 0.55, 1.7), wave = clamp(1 - (t - at) / 0.9);
      kit.at(cx, y + lh / 2, k, -0.02, () => kit.popText(ln, 0, 0, { size, maxW: M.w * 0.92, depth: 11, lw: 7, wave: wave * wave }));
      y += lh;
    });
    if (s.sub) {
      const k = kit.in(T0 + 0.6 + lines.length * 0.1, 'card');
      kit.at(cx, y + 50 * U, k, 0.012, () => kit.tag(str(s.sub), 0, 0, { size: 40, fill: PAPER, padX: 28, padY: 15, shadow: 5, maxW: M.w * 0.92 }));
    }
    ms.draw();
  },
};

/* ---------- number：一个大数字 ---------- */
TEMPLATES.number = {
  skel: ['arc', 'full', 'panel', 'hills'], min: 4,
  draw(kit, s, R, S) {
    const L = S.L, U = L.U, t = kit.t, p = kit.pal;
    const ms = mascotSlot(kit, S, s, R, { frac: 0.17 }), M = ms.main;
    const wide = M.w > M.h * 1.25, hasProp = !!s.prop;
    const pn = parseNum(s.value, str(s.unit), str(s.prefix));
    const [tLabel, tNum, tNote] = [T0, T0 + 0.3, T0 + 1.5];
    let tx, tw, align, ny, dcx, dcy, dr;
    if (wide) {
      const propLeft = ms.has && ms.side === 'left';
      tw = M.w * (hasProp ? 0.58 : 0.9); align = 'left';
      tx = propLeft && hasProp ? M.x + M.w * 0.4 : M.x + M.w * 0.02;
      dr = M.h * 0.4; dcx = propLeft ? M.x + dr * 1.02 : M.x + M.w - dr * 1.05; dcy = M.y + M.h * 0.5; ny = M.y + M.h * 0.5;
    } else {
      tw = M.w * 0.94; align = 'center'; tx = M.x + M.w / 2;
      dr = Math.min(M.w * 0.27, M.h * 0.2); dcx = M.x + M.w / 2; dcy = M.y + dr * 1.08;
      ny = hasProp ? M.y + dr * 2.2 + (M.h - dr * 2.2) * 0.5 : M.y + M.h * 0.5;
    }
    if (hasProp) { // 聚光圆盘 + 道具
      const k = kit.in(T0 + 0.1, 'pop', 0.55);
      kit.at(dcx, dcy, k, 0, () => {
        kit.circle(0, 0, dr, { fill: p.soft, shadow: 9 });
        kit.c.save(); kit.c.beginPath(); kit.c.arc(0, 0, dr, 0, TAU); kit.c.clip();
        kit.halftone(-dr, 0, dr * 2, dr, { color: shade(p.soft, -22, 8), alpha: 0.6, sp: 10, flip: true });
        kit.c.restore(); kit.circle(0, 0, dr, { fill: null });
      });
      drawProp(kit, s.prop, dcx, dcy + Math.sin(t * 1.7) * 5 * U, dr * 1.5, { k: kit.in(T0 + 0.3, null, 0.5, 1.9), rot: -0.05 });
      kit.at(dcx + dr * 0.78, dcy - dr * 0.74, pop(t, T0 + 0.7, 0.35, 2.4) * (0.9 + 0.12 * Math.sin(t * 4)), 0.2, () => kit.sparkle(0, 0, 26 * U));
    }
    const full = countText(pn, 1);
    const base = wide ? 210 : 170;
    const sz = kit.fit(full, base * U, tw, 'num', 0.3) / U;
    const numH = sz * U;
    if (s.label) {
      const k = kit.in(tLabel, 'card');
      kit.at(tx, ny - numH * 0.62 - 34 * U, k, -0.015, () => kit.tag(str(s.label), 0, 0, { size: 36, align, fill: PAPER, padX: 22, padY: 12, shadow: 4, maxW: tw }));
    }
    const kn = kit.in(tNum, 'coin', 0.5, 1.5);
    const cnt = E.outExpo(prog(t, tNum, 1.1));
    kit.at(tx, ny, kn, 0, () => kit.popText(countText(pn, cnt), 0, 0, { size: sz, kind: 'num', align, depth: 11, lw: 7 }));
    let yy = ny + numH * 0.62 + 30 * U;
    if (s.delta) {
      const up = !/^[-−↓]/.test(str(s.delta)) && s.trend !== 'down';
      const k = kit.in(tNote - 0.3, 'pop');
      kit.at(tx, yy + 6 * U, k, 0.02, () => kit.tag((up ? '▲ ' : '▼ ') + str(s.delta).replace(/^[-−+↑↓]/, ''), 0, 0, { size: 32, align, fill: up ? p.accent : p.soft, shadow: 4, kind: 'title' }));
      yy += 70 * U;
    }
    if (s.note) {
      const k = kit.in(tNote, 'card', 0.4);
      kit.at(tx, yy + 8 * U, k, 0, () => kit.tag(str(s.note), 0, 0, { size: 28, align, fill: PAPER, shadow: 3, kind: 'light', maxW: tw }));
    }
    ms.draw();
  },
};

/* ---------- compare：两项对比 ---------- */
TEMPLATES.compare = {
  skel: ['panel', 'checker', 'arc', 'full'], min: 5,
  draw(kit, s, R, S) {
    const L = S.L, U = L.U, t = kit.t, p = kit.pal;
    const ms = mascotSlot(kit, S, s, R, { frac: 0.15 }), M = ms.main;
    const wide = M.w > M.h * 1.1;
    const A = s.a || {}, B = s.b || {};
    const cues = cueTimes(s, [A.label, B.label, s.verdict || '']);
    const pa = parseNum(A.value, str(A.unit)), pb = parseNum(B.value, str(B.unit));
    const mx = Math.max(Math.abs(pa.num) || 0, Math.abs(pb.num) || 0) || 1;
    const win = s.win === 'a' ? 0 : s.win === 'b' ? 1 : -1;
    const cw = wide ? M.w * 0.41 : M.w * 0.9, ch = wide ? M.h * 0.9 : M.h * 0.42;
    const pos = wide ? [[M.x + M.w * 0.245, M.y + M.h * 0.5], [M.x + M.w * 0.755, M.y + M.h * 0.5]] : [[M.x + M.w / 2, M.y + M.h * 0.245], [M.x + M.w / 2, M.y + M.h * 0.755]];
    [[A, pa, p.hero], [B, pb, p.soft]].forEach(([it, pn, col], i) => {
      const k = kit.in(cues[i], 'card', 0.55), [cx, cy] = pos[i];
      const barCol = win === i ? p.accent : col;
      card(kit, cx - cw / 2, cy - ch / 2, cw, ch, k, (i ? 1 : -1) * 0.022, { title: str(it.label), bar: barCol }, b => {
        const horizontal = b.w > b.h * 1.5;
        const ps = it.prop ? (horizontal ? b.h * 0.86 : Math.min(b.h * 0.44, b.w * 0.5)) : 0;
        const tx = horizontal && ps ? b.x + ps + (b.w - ps) / 2 : b.x + b.w / 2;
        const twd = horizontal && ps ? b.w - ps - 10 * U : b.w;
        if (ps) drawProp(kit, it.prop, horizontal ? b.x + ps * 0.5 : b.x + b.w / 2, horizontal ? b.y + b.h / 2 : b.y + ps * 0.5, ps, { k: pop(t, cues[i] + 0.25, 0.45, 2), rot: (i ? 1 : -1) * 0.05 });
        const top = horizontal ? b.y : b.y + ps;
        const hh = horizontal ? b.h : b.h - ps;
        const cnt = E.outExpo(prog(t, cues[i] + 0.3, 0.9));
        const vs = kit.fit(countText(pn, 1), Math.min(hh * 0.42, 110 * U), twd * 0.96, 'num', 0.3);
        kit.text(countText(pn, cnt), tx, top + hh * 0.3, { size: vs / U, kind: 'num' });
        if (it.note) kit.para(str(it.note), tx, top + hh * 0.58, { size: 25, maxW: twd * 0.94, maxLines: 2, kind: 'light', vcenter: true });
        if (pn.ok && pb.ok && pa.ok) { // 比例条
          const bw = twd * 0.9, bh = Math.min(30 * U, hh * 0.13), bx = tx - bw / 2, by = top + hh - bh - 6 * U;
          kit.box(bx, by, bw, bh, { r: 7, fill: shade(PAPER, -8) });
          const g = E.outCubic(prog(t, cues[i] + 0.35, 0.8));
          celBar(kit, bx, by, Math.max(bh * 0.6, bw * (Math.abs(pn.num) / mx) * g), bh, barCol, { r: 7 });
        }
      });
    });
    const mid = [(pos[0][0] + pos[1][0]) / 2, (pos[0][1] + pos[1][1]) / 2];
    const kv = kit.in(cues[1] + 0.15, 'stamp', 0.45, 2.2);
    kit.at(mid[0], mid[1] - (wide ? M.h * 0.06 : 0), kv, -0.1, () => {
      kit.circle(0, 0, 50 * U, { fill: p.accent, shadow: 6 });
      kit.text('VS', 0, 2 * U, { size: 42, kind: 'num' });
    });
    if (s.verdict) {
      const k = kit.in(cues[2], 'stamp', 0.5, 2);
      kit.at(mid[0], wide ? M.y + M.h * 0.93 : mid[1] + 78 * U, k, -0.035, () => kit.tag(str(s.verdict), 0, 0, { size: 38, fill: p.accent, padX: 26, padY: 14, shadow: 6, kind: 'title', maxW: M.w * 0.8 }));
    }
    ms.draw();
  },
};

/* ---------- bars：柱状图 / 排行 ---------- */
TEMPLATES.bars = {
  skel: ['arc', 'desk', 'hills', 'full'], min: 5,
  draw(kit, s, R, S) {
    const L = S.L, U = L.U, t = kit.t, p = kit.pal;
    const ms = mascotSlot(kit, S, s, R, { frac: 0.17 }), M = ms.main;
    const items = arr(s.items).map(it => { const pn = parseNum(it.value, str(it.unit || s.unit)); return { label: str(it.label), pn, num: pn.ok ? pn.num : 0, cue: it.cue, at: it.at }; });
    const n = items.length || 1;
    const cues = cueTimes(s, items.map(it => (it.at != null ? { at: it.at } : it.cue || it.label)), { step: 0.5 });
    const hi = pickHighlight(s.highlight, items);
    const horiz = s.dir === 'h' || (s.dir !== 'v' && (n > 8 || (M.w < M.h && n > 4)));
    const mx = Math.max(...items.map(it => Math.abs(it.num)), 1e-9);
    const kc = kit.in(T0 - 0.15, 'card', 0.5, 1.2);
    card(kit, M.x, M.y, M.w, M.h, kc, -0.006, { title: str(s.title) }, b => {
      if (horiz) {
        const lw = b.w * 0.26, rowH = b.h / n, bh = Math.min(rowH * 0.56, 62 * U), bx = b.x + lw + 12 * U, bw = b.w - lw - 12 * U;
        items.forEach((it, i) => {
          const y = b.y + rowH * (i + 0.5), g = E.outCubic(prog(t, cues[i], 0.7));
          kit.beat(cues[i], 'tick');
          kit.text(it.label, b.x + lw, y, { size: 28, align: 'right', maxW: lw });
          const full = countText(it.pn, 1), vw = kit.measure(full, 30 * U, 'num') + 16 * U;
          const w = Math.max(4 * U, (bw - vw) * (Math.abs(it.num) / mx) * g);
          celBar(kit, bx, y - bh / 2, w, bh, i === hi ? p.accent : p.hero);
          if (g > 0.02) kit.text(countText(it.pn, g), bx + w + 10 * U, y, { size: 30, kind: 'num', align: 'left' });
        });
      } else {
        const padB = 62 * U, padT = 58 * U, slot = b.w / n, bw = Math.min(slot * 0.58, 170 * U), base = b.y + b.h - padB, H = b.h - padB - padT;
        kit.line(b.x, base, b.x + b.w, base);
        items.forEach((it, i) => {
          const x = b.x + slot * (i + 0.5), g = E.outCubic(prog(t, cues[i], 0.7));
          kit.beat(cues[i], 'tick');
          const h = Math.max(3 * U, H * (Math.abs(it.num) / mx) * g);
          celBar(kit, x - bw / 2, base - h, bw, h, i === hi ? p.accent : p.hero);
          if (g > 0.02) kit.text(countText(it.pn, g), x, base - h - 26 * U, { size: i === hi ? 36 : 30, kind: 'num', maxW: slot * 0.96 });
          kit.para(it.label, x, base + 20 * U, { size: 25, maxW: slot * 0.94, maxLines: 2, lh: 1.2 });
          if (i === hi) kit.at(x + bw * 0.5, base - h - 6 * U, pop(t, cues[i] + 0.7, 0.35, 2.4) * (0.9 + 0.12 * Math.sin(t * 4)), 0.3, () => kit.sparkle(0, 0, 20 * U));
        });
      }
    });
    ms.draw();
  },
};

/* ---------- trend：折线趋势（最多 3 条线） ---------- */
TEMPLATES.trend = {
  skel: ['hills', 'arc', 'full', 'desk'], min: 5,
  draw(kit, s, R, S) {
    const L = S.L, U = L.U, t = kit.t, p = kit.pal, c = kit.c;
    const ms = mascotSlot(kit, S, s, R, { frac: 0.17 }), M = ms.main;
    let labels, series;
    if (Array.isArray(s.series)) { labels = arr(s.labels).map(str); series = s.series.slice(0, 3).map(se => ({ name: str(se.name), vals: arr(se.values).map(v => parseNum(v, str(s.unit))) })); }
    else {
      const pts = arr(s.points || s.items);
      labels = pts.map(q => str(q.x != null ? q.x : q.label));
      series = [{ name: '', vals: pts.map(q => parseNum(q.y != null ? q.y : q.value, str(s.unit))) }];
    }
    const n = Math.max(2, labels.length);
    const all = series.flatMap(se => se.vals.map(v => (v.ok ? v.num : 0)));
    let lo = Math.min(...all), hi = Math.max(...all);
    if (lo >= 0 && lo < hi * 0.6) lo = 0; else lo -= (hi - lo) * 0.15;
    if (hi === lo) hi = lo + 1;
    const cols = [p.hero, p.accent, p.soft];
    const cues = cueTimes(s, [labels[0], labels[n - 1]], { start: T0 + 0.35 });
    const t0 = cues[0], t1 = Math.max(cues[1], t0 + 1.2);
    const pr = E.inOutCubic(prog(t, t0, t1 - t0));
    kit.beat(t0, 'whoosh');
    const kc = kit.in(T0 - 0.15, 'card', 0.5, 1.2);
    card(kit, M.x, M.y, M.w, M.h, kc, 0.006, { title: str(s.title) }, b => {
      const padB = 52 * U, padT = 64 * U, padX = 46 * U;
      const x0 = b.x + padX, x1 = b.x + b.w - padX * 1.6, y0 = b.y + b.h - padB, y1 = b.y + padT;
      const X = i => lerp(x0, x1, i / (n - 1)), Y = v => lerp(y0, y1, (v - lo) / (hi - lo));
      for (let g = 0; g <= 3; g++) kit.line(b.x, lerp(y0, y1, g / 3), b.x + b.w, lerp(y0, y1, g / 3), { lw: kit.lwThin * 0.8, color: shade(PAPER, -18), dash: g ? [6 * U, 8 * U] : null });
      kit.line(b.x, y0, b.x + b.w, y0);
      const upto = pr * (n - 1);
      series.forEach((se, si) => {
        const ptAt = u => { const i = Math.min(n - 2, Math.floor(u)), f = u - i; const a = se.vals[i] || { num: lo }, bb = se.vals[i + 1] || a; return [lerp(X(i), X(i + 1), f), lerp(Y(a.num), Y(bb.num), f)]; };
        const path = [];
        for (let i = 0; i <= Math.floor(upto); i++) path.push([X(i), Y((se.vals[i] || { num: lo }).num)]);
        if (upto < n - 1) path.push(ptAt(upto));
        if (path.length < 2) return;
        if (series.length === 1) { // 面积：平涂 + 网点
          c.beginPath(); c.moveTo(path[0][0], y0); path.forEach(q => c.lineTo(q[0], q[1])); c.lineTo(path[path.length - 1][0], y0); c.closePath();
          c.save(); c.fillStyle = shade(cols[0], 22, -18); c.fill(); c.clip();
          kit.halftone(x0, y1, x1 - x0, y0 - y1, { color: cols[0], alpha: 0.75, sp: 9, flip: true, r0: 0.4 });
          c.restore();
        }
        c.beginPath(); path.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
        c.lineWidth = kit.lw * 3.1; c.strokeStyle = INK; c.stroke();
        c.lineWidth = kit.lw * 1.5; c.strokeStyle = cols[si]; c.stroke();
        se.vals.forEach((v, i) => {
          if (i > upto + 0.001) return;
          const last = i === n - 1, k = pop(t, lerp(t0, t1, i / (n - 1)), 0.3, 2.2);
          kit.at(X(i), Y(v.num), k, 0, () => kit.circle(0, 0, (last ? 11 : 8) * U, { fill: last ? cols[si] : PAPER }));
          if (!last && n <= 8 && series.length === 1 && k > 0.5) kit.text(fmtNum(v.num, v.dec), X(i), Y(v.num) - 26 * U, { size: 24, kind: 'num', stroke: PAPER, sw: 6 });
        });
        if (upto >= n - 1.001) { // 末端数值标签
          const v = se.vals[n - 1] || { num: lo }, k = kit.in(t1, 'coin', 0.45, 2);
          kit.at(X(n - 1) + 8 * U, Y(v.num) - 40 * U - si * 2 * U, k, -0.04, () => kit.tag((se.name ? se.name + ' ' : '') + (v.ok ? countText(v, 1) : ''), 0, 0, { size: 30, fill: cols[si], kind: 'num', shadow: 4, align: 'center' }));
        }
      });
      labels.forEach((lb, i) => { if (n > 10 && i % 2 && i !== n - 1) return; kit.text(lb, X(i), y0 + 26 * U, { size: 24, maxW: ((x1 - x0) / (n - 1)) * (n > 10 ? 1.9 : 0.96) }); });
      if (series.length > 1) series.forEach((se, si) => kit.tag(se.name, b.x + 8 * U + si * 190 * U, b.y + 18 * U, { size: 22, fill: cols[si], align: 'left', shadow: 2, padX: 12, padY: 6, maxW: 180 * U }));
    });
    ms.draw();
  },
};

/* ---------- split：构成拆解（横条 / 杯子剖面 / 竖向堆叠） ---------- */
TEMPLATES.split = {
  skel: ['panel', 'arc', 'checker', 'full'], min: 5,
  draw(kit, s, R, S) {
    const L = S.L, U = L.U, t = kit.t, p = kit.pal, c = kit.c;
    const ms = mascotSlot(kit, S, s, R, { frac: 0.16 }), M = ms.main;
    const parts = arr(s.parts || s.items).slice(0, 6).map(it => { const pn = parseNum(it.value, str(it.unit || s.unit)); return { label: str(it.label), pn, num: pn.ok ? Math.abs(pn.num) : 0, cue: it.cue, at: it.at, prop: it.prop }; });
    const sum = parts.reduce((a, b) => a + b.num, 0) || 1, n = parts.length;
    const cues = cueTimes(s, parts.map(it => (it.at != null ? { at: it.at } : it.cue || it.label)), { step: 0.6 });
    const cols = seriesColors(p);
    const shape = s.shape || (M.w > M.h * 1.3 ? 'bar' : 'stack');
    if (s.total) {
      const tt = typeof s.total === 'object' ? str(s.total.label) + ' ' + str(s.total.value) : str(s.total);
      const k = kit.in(T0, 'card');
      kit.at(shape === 'bar' ? M.x + M.w / 2 : M.x + M.w * 0.72, M.y + 30 * U, k, -0.015, () => kit.tag(tt, 0, 0, { size: 34, fill: PAPER, shadow: 4, kind: 'title', maxW: M.w * 0.5 }));
    }
    if (shape === 'bar') {
      const bx = M.x + M.w * 0.03, bw = M.w * 0.94, bh = Math.min(120 * U, M.h * 0.24), by = M.y + M.h * 0.53 - bh / 2;
      kit.box(bx, by, bw, bh, { r: 16, fill: shade(PAPER, -8), shadow: 8 });
      c.save(); kit.rrPath(bx, by, bw, bh, 16 * U); c.clip();
      let x = bx; const centers = [];
      parts.forEach((it, i) => {
        const w = bw * (it.num / sum), g = E.outCubic(prog(t, cues[i], 0.6));
        kit.beat(cues[i], 'tick');
        c.fillStyle = cols[i % cols.length]; c.fillRect(x, by, w * g + 1, bh);
        c.fillStyle = shade(cols[i % cols.length]); c.fillRect(x, by + bh * 0.72, w * g + 1, bh * 0.28);
        if (g > 0.98 && i < n - 1) kit.line(x + w, by, x + w, by + bh);
        centers.push(x + w / 2); x += w;
      });
      c.restore(); kit.rrPath(bx, by, bw, bh, 16 * U); kit.paint(null, true);
      // 标签上下交错，避免挤在一起
      const lw = Math.min(bw / Math.max(2, Math.ceil(n / 2)) * 0.96, 420 * U);
      parts.forEach((it, i) => {
        const k = pop(t, cues[i] + 0.2, 0.45, 1.8); if (k <= 0) return;
        const up = i % 2 === 0, cx = clamp(centers[i], bx + lw * 0.42, bx + bw - lw * 0.42);
        const y1 = up ? by - 26 * U : by + bh + 26 * U, vy = up ? by - 128 * U : by + bh + 82 * U, ly = up ? by - 64 * U : by + bh + 146 * U;
        kit.line(centers[i], up ? by : by + bh, cx, y1, { lw: kit.lwThin });
        kit.at(cx, vy, k, 0, () => kit.popText(countText(it.pn, 1), 0, 0, { size: 60, kind: 'num', fill: cols[i % cols.length], depth: 5, lw: 5, maxW: lw }));
        kit.at(cx, ly, k, 0, () => kit.tag(it.label, 0, 0, { size: 28, fill: PAPER, shadow: 3, maxW: lw }));
      });
    } else {
      // 竖向容器：cup = 杯子剖面；stack/box = 圆角柱
      const isCup = shape === 'cup';
      const ch = M.h * (isCup ? 0.76 : 0.9), cw = Math.min(M.w * 0.34, ch * 0.62), cx = M.x + M.w * 0.24, top = M.y + M.h - ch - (isCup ? 0 : M.h * 0.04), bot = top + ch;
      const tw = cw, bw2 = isCup ? cw * 0.76 : cw;
      const body = () => {
        c.beginPath(); c.moveTo(cx - tw / 2, top); c.lineTo(cx + tw / 2, top);
        c.lineTo(cx + bw2 / 2, bot - 14 * U); c.quadraticCurveTo(cx + bw2 / 2, bot, cx + bw2 / 2 - 16 * U, bot);
        c.lineTo(cx - bw2 / 2 + 16 * U, bot); c.quadraticCurveTo(cx - bw2 / 2, bot, cx - bw2 / 2, bot - 14 * U); c.closePath();
      };
      const kc = kit.in(T0 - 0.1, 'pop', 0.5, 1.3);
      if (isCup && kc > 0) { // 吸管
        c.save(); c.translate(cx + tw * 0.12, top); c.rotate(0.16); c.scale(kc, kc);
        kit.box(-11 * U, -ch * 0.3, 22 * U, ch * 0.34, { r: 4, fill: p.accent }); c.restore();
      }
      c.save(); c.translate(cx, bot); c.scale(kc, kc); c.translate(-cx, -bot);
      body(); c.fillStyle = INK; c.save(); c.translate(9 * U, 9 * U); c.fill(); c.restore();
      body(); c.fillStyle = shade(PAPER, -6); c.fill();
      c.save(); body(); c.clip();
      let y = bot; const mids = [];
      parts.forEach((it, i) => {
        const h = ch * (it.num / sum), g = E.outCubic(prog(t, cues[i], 0.7));
        kit.beat(cues[i], 'tick');
        const col = cols[i % cols.length];
        c.fillStyle = col; c.fillRect(cx - tw, y - h * g, tw * 2, h * g + 1);
        c.fillStyle = shade(col); c.fillRect(cx + tw * 0.2, y - h * g, tw, h * g + 1);
        if (g > 0.98) kit.line(cx - tw, y - h, cx + tw, y - h);
        mids.push(y - h / 2); y -= h;
      });
      kit.hatch(cx + tw * 0.2, top, tw, ch, { gap: 8, alpha: 0.2 });
      c.restore(); body(); kit.paint(null, true);
      if (isCup) { // 杯盖
        kit.box(cx - tw / 2 - 12 * U, top - 20 * U, tw + 24 * U, 26 * U, { r: 10, fill: PAPER });
        c.beginPath(); c.moveTo(cx - tw * 0.42, top - 20 * U); c.quadraticCurveTo(cx, top - 20 * U - tw * 0.36, cx + tw * 0.42, top - 20 * U); c.closePath(); kit.paint(p.soft, true);
      }
      c.restore();
      // 右侧标签：按层对齐，间距不足时推开
      const lx = M.x + M.w * 0.47, lw = M.x + M.w - lx, minGap = Math.min(96 * U, (ch / Math.max(1, n)) * 1.1);
      const ys = mids.slice(); for (let i = 1; i < n; i++) if (ys[i - 1] - ys[i] < minGap) ys[i] = ys[i - 1] - minGap;
      const shift = Math.max(0, top + 20 * U - (ys[n - 1] || 0)); for (let i = 0; i < n; i++) ys[i] += shift * (i / Math.max(1, n - 1));
      parts.forEach((it, i) => {
        const k = pop(t, cues[i] + 0.2, 0.45, 1.8); if (k <= 0) return;
        const hw = lerp(bw2, tw, clamp((bot - mids[i]) / ch)) / 2;
        kit.line(cx + hw, mids[i], lx - 8 * U, ys[i], { lw: kit.lwThin });
        kit.circle(cx + hw, mids[i], 5 * U, { fill: INK, ink: false });
        const vt = countText(it.pn, 1), vsz = kit.fit(vt, 54 * U, lw * 0.36, 'num', 0.5), vw = kit.measure(vt, vsz, 'num');
        kit.at(lx, ys[i], k, 0, () => {
          kit.popText(vt, 0, 0, { size: vsz / U, kind: 'num', align: 'left', fill: cols[i % cols.length], depth: 4, lw: 5 });
          kit.tag(it.label, vw + 20 * U, 0, { size: 28, align: 'left', fill: PAPER, shadow: 3, maxW: lw - vw - 24 * U });
        });
      });
    }
    ms.draw();
  },
};

/* ---------- waterfall：利润瀑布（收入 → 各项成本 → 利润） ---------- */
TEMPLATES.waterfall = {
  skel: ['desk', 'arc', 'hills', 'full'], min: 6,
  draw(kit, s, R, S) {
    const L = S.L, U = L.U, t = kit.t, p = kit.pal;
    const ms = mascotSlot(kit, S, s, R, { frac: 0.16 }), M = ms.main;
    let run = 0;
    const items = arr(s.items).slice(0, 9).map((it, i) => {
      const pn = parseNum(it.value == null ? 0 : it.value, str(it.unit || s.unit));
      const isTotal = i === 0 || it.total === true;
      let from, to;
      if (isTotal) { from = 0; to = it.value != null && pn.ok ? pn.num : run; run = to; }
      else { from = run; to = run + (pn.ok ? pn.num : 0); run = to; }
      return { label: str(it.label), from, to, isTotal, pn: isTotal ? parseNum(to, str(it.unit || s.unit)) : pn, cue: it.cue, at: it.at, dec: pn.dec };
    });
    const n = items.length || 1;
    const hiV = Math.max(...items.flatMap(it => [it.from, it.to]), 1e-9), loV = Math.min(0, ...items.flatMap(it => [it.from, it.to]));
    const cues = cueTimes(s, items.map(it => (it.at != null ? { at: it.at } : it.cue || it.label)), { step: 0.6 });
    const kc = kit.in(T0 - 0.15, 'card', 0.5, 1.2);
    card(kit, M.x, M.y, M.w, M.h, kc, -0.005, { title: str(s.title) }, b => {
      const padB = 66 * U, padT = 56 * U, slot = b.w / n, bw = Math.min(slot * 0.62, 150 * U);
      const y0 = b.y + b.h - padB, y1 = b.y + padT, Y = v => lerp(y0, y1, (v - loV) / (hiV - loV));
      kit.line(b.x, Y(0), b.x + b.w, Y(0));
      items.forEach((it, i) => {
        const x = b.x + slot * (i + 0.5), g = E.outCubic(prog(t, cues[i], 0.6));
        kit.beat(cues[i], it.isTotal ? 'coin' : 'tick');
        if (g <= 0) return;
        const neg = it.to < it.from, last = i === n - 1;
        const fill = it.isTotal ? (last ? p.accent : p.hero) : neg ? shade(PAPER, -6) : p.soft;
        const ya = Y(it.from), yb = Y(lerp(it.from, it.to, g));
        if (i) kit.line(x - slot + bw / 2, ya, x - bw / 2, ya, { lw: kit.lwThin, dash: [5 * U, 6 * U] });
        celBar(kit, x - bw / 2, Math.min(ya, yb), bw, Math.max(3 * U, Math.abs(ya - yb)), fill, { hatch: neg && !it.isTotal });
        const vt = (it.isTotal ? '' : neg ? '−' : '+') + countText(Object.assign({}, it.pn, { num: Math.abs(it.pn.num) }), g);
        kit.text(vt, x, Math.min(ya, yb) - 24 * U, { size: it.isTotal ? 32 : 27, kind: 'num', maxW: slot * 0.98 });
        kit.para(it.label, x, y0 + 22 * U, { size: 24, maxW: slot * 0.94, maxLines: 2, lh: 1.2 });
      });
    });
    ms.draw();
  },
};
