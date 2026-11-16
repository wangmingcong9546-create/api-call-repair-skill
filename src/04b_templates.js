/* =====================================================================
 * 04 图解模板库（下）
 * flow / wheel / network / timeline / quote / list / formula / table / stats / image / stage
 * 飞轮只画粗环，不画辐条；网络只用弧线，避免任何放射状线条。
 * ===================================================================== */
function emptyNote(kit, R, msg) {
  kit.tag(msg, R.x + R.w / 2, R.y + R.h / 2, { size: 30, fill: kit.pal.accent, maxW: R.w * 0.86, shadow: 4 });
}
function qbez(a, b, c, t) {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]];
}
function bow(a, b, k) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  return [mx + (-dy / len) * len * k, my + (dx / len) * len * k];
}

/* ---------- flow：步骤 ---------- */
TEMPLATES.flow = {
  skel: ['arc', 'full', 'panel', 'desk'], min: 5,
  draw(kit, s, R, S) {
    const items = arr(s.items).slice(0, 6).map(it => ({ label: str(it.label || it.text), note: str(it.note || ''), prop: it.prop, cue: it.cue, at: it.at }));
    const L = S.L, U = L.U, p = kit.pal;
    const ms = mascotSlot(kit, S, s, R, { frac: 0.16 }), M = ms.main;
    if (!items.length) { emptyNote(kit, M, '流程还没有步骤'); ms.draw(); return; }
    const cues = cueTimes(s, items.map(it => (it.at != null ? { at: it.at } : it.cue || it.label)), { step: 0.55 });
    const horizontal = items.length <= 5 && M.w > M.h && M.w / items.length > 170 * U;
    const n = items.length;
    if (horizontal) {
      const gap = Math.max(40 * U, M.w * 0.045);
      const cw = (M.w - gap * (n - 1)) / n, ch = M.h * 0.9, y = M.y + (M.h - ch) / 2;
      items.forEach((it, i) => {
        const x = M.x + i * (cw + gap), k = kit.in(cues[i], i === n - 1 ? 'stamp' : 'card', 0.5);
        card(kit, x, y, cw, ch, k, (i % 2 ? 1 : -1) * 0.012, { title: String(i + 1).padStart(2, '0'), bar: i === n - 1 ? p.accent : p.hero, dots: false }, b => {
          const ps = it.prop ? Math.min(b.w * 0.72, b.h * 0.42) : 0;
          if (ps) drawProp(kit, it.prop, b.x + b.w / 2, b.y + ps * 0.52, ps, { k: pop(kit.t, cues[i] + 0.15, 0.45, 1.8), rot: -0.04 });
          const ty = b.y + (ps ? ps + 8 * U : 4 * U);
          kit.para(it.label, b.x + b.w / 2, ty + 16 * U, { size: 32, maxW: b.w * 0.9, maxLines: 2, kind: 'title', lh: 1.25 });
          if (it.note) kit.para(it.note, b.x + b.w / 2, ty + 78 * U, { size: 22, maxW: b.w * 0.9, maxLines: 3, kind: 'light', color: shade(INK, 10, -20) });
        });
        if (i < n - 1) {
          const ap = slide(kit.t, cues[i] + 0.1, 0.35);
          const yA = y + ch * 0.5;
          kit.arrow(x + cw + 4 * U, yA, x + cw + gap / 2, yA - 16 * U, x + cw + gap - 6 * U, yA, { p: ap, head: 12 });
        }
      });
    } else {
      const gap = Math.max(28 * U, M.h * 0.03);
      const ch = (M.h - gap * (n - 1)) / n, cw = M.w * 0.92, x = M.x + (M.w - cw) / 2;
      items.forEach((it, i) => {
        const y = M.y + i * (ch + gap), k = kit.in(cues[i], 'card', 0.45);
        card(kit, x, y, cw, ch, k, 0, { title: String(i + 1).padStart(2, '0') + '  ' + it.label, bar: i === n - 1 ? p.accent : p.hero, dots: false }, b => {
          if (it.prop) drawProp(kit, it.prop, b.x + b.h * 0.5, b.y + b.h / 2, b.h * 0.8, { k: pop(kit.t, cues[i] + 0.1, 0.4, 1.7) });
          if (it.note) kit.para(it.note, b.x + (it.prop ? b.h : 8 * U) + (b.w - b.h) / 2, b.y + b.h / 2, { size: 26, maxW: b.w - (it.prop ? b.h + 16 * U : 16 * U), maxLines: 2, kind: 'light', vcenter: true });
        });
      });
    }
    ms.draw();
  },
};

/* ---------- wheel：飞轮。只有粗环和环上的节点，没有任何辐条 ---------- */
TEMPLATES.wheel = {
  skel: ['full', 'panel', 'arc', 'checker'], min: 6,
  draw(kit, s, R, S) {
    const items = arr(s.items).slice(0, 6).map(it => ({ label: str(it.label || it.text), note: str(it.note || ''), prop: it.prop }));
    const L = S.L, U = L.U, t = kit.t, p = kit.pal, c = kit.c;
    const ms = mascotSlot(kit, S, s, R, { frac: 0.15 }), M = ms.main;
    if (items.length < 3) { emptyNote(kit, M, '飞轮至少需要 3 个节点'); ms.draw(); return; }
    const n = items.length;
    const cx = M.x + M.w / 2, cy = M.y + M.h / 2;
    const rx = M.w * 0.33, ry = M.h * 0.3;
    const rad = Math.min(rx, ry) * 0.55;
    const turn = E.outCubic(prog(t, T0, 1.15));
    const cues = cueTimes(s, items.map(it => it.label), { start: T0 + 0.15, step: 0.4 });
    const kRing = kit.in(T0 - 0.05, 'gear', 0.6, 1.4);
    if (kRing > 0.02) {
      c.save(); c.translate(cx, cy); c.scale(kRing, kRing);
      c.beginPath(); c.arc(0, 0, rad, 0, TAU);
      c.lineWidth = 40 * U; c.strokeStyle = INK; c.stroke();
      c.beginPath(); c.arc(0, 0, rad, 0, TAU);
      c.lineWidth = 28 * U; c.strokeStyle = p.hero; c.stroke();
      c.beginPath(); c.arc(0, 0, rad, 0, TAU);
      c.lineWidth = 8 * U; c.strokeStyle = shade(p.hero); c.setLineDash([18 * U, 16 * U]); c.lineDashOffset = -turn * rad; c.stroke();
      c.restore();
      // 环上的方向箭头：沿切线，不指向圆心
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + turn * 0.7 + ((i + 0.5) / n) * TAU;
        c.save(); c.translate(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); c.rotate(a + Math.PI / 2);
        c.beginPath(); c.moveTo(13 * U, 0); c.lineTo(-9 * U, -9 * U); c.lineTo(-9 * U, 9 * U); c.closePath();
        c.fillStyle = INK; c.fill(); c.restore();
      }
    }
    const hubR = rad * 0.46;
    const kHub = kit.in(T0 + 0.1, 'stamp', 0.5, 1.6);
    kit.at(cx, cy, kHub, 0, () => {
      kit.circle(0, 0, hubR, { fill: p.accent, shadow: 6 });
      kit.para(str(s.hub || s.title || '飞轮'), 0, 0, { size: Math.max(16, Math.min(26, (hubR / U) * 0.32)), maxW: hubR * 1.5, maxLines: 3, kind: 'title', lh: 1.15, vcenter: true });
    });
    const r0 = mulberry(s._seed + 3);
    items.forEach((it, i) => {
      const a = -Math.PI / 2 + turn * 0.45 + (i / n) * TAU + (r0() - 0.5) * 0.08;
      const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
      const k = kit.in(cues[i], 'pop', 0.45, 1.8);
      const ps = Math.min(52 * U, rad * 0.55);
      if (it.prop) drawProp(kit, it.prop, x, y, ps, { k, still: true });
      const lx = x + Math.cos(a) * (ps * 0.55 + 8 * U), ly = y + Math.sin(a) * (ps * 0.45 + 22 * U);
      if (k > 0.35) kit.tag(it.label, lx, ly, { size: 24, fill: i === n - 1 ? p.accent : PAPER, shadow: 4, maxW: Math.min(M.w * 0.22, 200 * U), kind: 'title' });
    });
    ms.draw();
  },
};

/* ---------- network：中枢 + 不规则节点，弧线连接 ---------- */
TEMPLATES.network = {
  skel: ['full', 'hills', 'arc', 'desk'], min: 6,
  draw(kit, s, R, S) {
    const nodes = arr(s.nodes || s.items).slice(0, 8).map(it => ({ label: str(it.label || it.text), note: str(it.note || ''), prop: it.prop || 'store' }));
    const L = S.L, U = L.U, t = kit.t, p = kit.pal;
    const ms = mascotSlot(kit, S, s, R, { frac: 0.15 }), M = ms.main;
    if (!nodes.length) { emptyNote(kit, M, '网络还没有节点'); ms.draw(); return; }
    const slots = [[0.2, 0.2], [0.8, 0.2], [0.12, 0.52], [0.88, 0.52], [0.28, 0.78], [0.72, 0.78], [0.5, 0.1], [0.5, 0.8]];
    const hub = s.center || s.hub || {};
    const hx = M.x + M.w * 0.5, hy = M.y + M.h * 0.48;
    const cues = cueTimes(s, nodes.map(nd => nd.label), { start: T0 + 0.35, step: 0.38 });
    const kHub = kit.in(T0, 'stamp', 0.55, 1.5);
    nodes.forEach((nd, i) => {
      const [fx, fy] = slots[i];
      const x = M.x + M.w * fx, y = M.y + M.h * fy;
      const ctrl = bow([hx, hy], [x, y], i % 2 ? 0.22 : -0.26);
      const grow = slide(kit.t, cues[i] - 0.15, 0.45);
      kit.arrow(hx, hy, ctrl[0], ctrl[1], x, y, { p: grow, color: INK, head: 11, lw: kit.lw * 1.15 });
      if (grow > 0.2) {
        const moving = ((t * 0.18) + i * 0.17) % 1;
        const pt = qbez([hx, hy], ctrl, [x, y], moving);
        kit.circle(pt[0], pt[1], 8 * U, { fill: i % 2 ? p.accent : PAPER, shadow: 0 });
      }
    });
    nodes.forEach((nd, i) => {
      const [fx, fy] = slots[i];
      const x = M.x + M.w * fx, y = M.y + M.h * fy;
      const k = kit.in(cues[i], 'pop', 0.45, 1.7);
      const sz = Math.min(M.w, M.h) * (nodes.length > 6 ? 0.16 : 0.2);
      kit.at(x, y, k, 0, () => {
        kit.circle(0, 0, sz * 0.62, { fill: PAPER, shadow: 5 });
        drawProp(kit, nd.prop, 0, -sz * 0.02, sz * 0.92, { still: true });
      });
      if (k > 0.4) {
        const below = fy <= 0.58;
        kit.tag(nd.label, x, y + (below ? 1 : -1) * (sz * 0.62 + 14 * U), { size: 24, fill: p.accent, shadow: 3, maxW: M.w * 0.22, kind: 'title' });
      }
    });
    kit.at(hx, hy, kHub, 0, () => {
      const sz = Math.min(M.w, M.h) * 0.28;
      kit.circle(0, 0, sz * 0.62, { fill: p.hero, shadow: 8 });
      if (hub.prop) drawProp(kit, hub.prop, 0, -sz * 0.06, sz * 0.85, { still: true });
      else kit.para(str(hub.label || S.story.brand && S.story.brand.name || '中枢'), 0, 0, { size: 28, maxW: sz, maxLines: 2, kind: 'title', color: kit.on(p.hero), vcenter: true });
    });
    if (hub.prop && hub.label && kHub > 0.5) {
      kit.tag(str(hub.label), hx, hy + Math.min(M.w, M.h) * 0.22, { size: 26, fill: PAPER, shadow: 4, maxW: M.w * 0.3, kind: 'title' });
    }
    ms.draw();
  },
};

/* ---------- timeline ---------- */
TEMPLATES.timeline = {
  skel: ['arc', 'full', 'panel', 'desk'], min: 5,
  draw(kit, s, R, S) {
    const items = arr(s.items).slice(0, 8).map(it => ({ time: str(it.time || it.year || it.label), label: str(it.label && (it.time || it.year) ? it.label : it.text || it.note || ''), note: str(it.note || ''), cue: it.cue, at: it.at }));
    const L = S.L, U = L.U, p = kit.pal;
    const ms = mascotSlot(kit, S, s, R, { frac: 0.14 }), M = ms.main;
    if (!items.length) { emptyNote(kit, M, '时间线还没有节点'); ms.draw(); return; }
    const cues = cueTimes(s, items.map(it => (it.at != null ? { at: it.at } : it.cue || it.time)), { step: 0.45 });
    const n = items.length;
    const vertical = M.h > M.w * 1.05;
    if (!vertical) {
      const yLine = M.y + M.h * 0.56;
      const x0 = M.x + M.w * 0.06, x1 = M.x + M.w * 0.94;
      const grow = slide(kit.t, T0, 0.5);
      kit.line(x0, yLine, lerp(x0, x1, grow), yLine, { lw: kit.lw * 2.4 });
      items.forEach((it, i) => {
        const x = lerp(x0, x1, n === 1 ? 0.5 : i / (n - 1));
        const k = kit.in(cues[i], 'tick', 0.4, 1.8);
        const up = n === 1 ? true : i % 2 === 0;
        kit.at(x, yLine, k, 0, () => kit.circle(0, 0, 12 * U, { fill: i === n - 1 ? p.accent : p.hero, shadow: 0 }));
        if (k > 0.2) {
          const slot = Math.max(90 * U, (x1 - x0) / Math.max(1, n));
          const cy = up ? yLine - Math.min(M.h * 0.24, 150 * U) : yLine + Math.min(M.h * 0.22, 120 * U);
          kit.line(x, up ? yLine - 14 * U : yLine + 14 * U, x, up ? cy + 34 * U : cy - 34 * U, { lw: kit.lwThin });
          kit.at(x, cy, Math.min(1, k), 0, () => {
            kit.tag(it.label || it.time, 0, up ? -20 * U : 20 * U, { size: 22, fill: PAPER, shadow: 3, maxW: slot * 0.92 });
            kit.tag(it.time, 0, up ? 22 * U : -22 * U, { size: 24, fill: i === n - 1 ? p.accent : p.hero, shadow: 3, kind: 'num', maxW: slot * 0.9 });
          });
        }
      });
    } else {
      const xLine = M.x + M.w * 0.16;
      const y0 = M.y + 10 * U, y1 = M.y + M.h - 10 * U;
      const grow = slide(kit.t, T0, 0.5);
      kit.line(xLine, y0, xLine, lerp(y0, y1, grow), { lw: kit.lw * 2.4 });
      items.forEach((it, i) => {
        const y = lerp(y0, y1, n === 1 ? 0.5 : i / (n - 1));
        const k = kit.in(cues[i], 'tick', 0.4, 1.8);
        kit.at(xLine, y, k, 0, () => kit.circle(0, 0, 11 * U, { fill: i === n - 1 ? p.accent : p.hero }));
        if (k > 0.2) {
          kit.tag(it.time, xLine + 28 * U, y - 16 * U, { size: 24, fill: p.accent, align: 'left', shadow: 3, kind: 'num' });
          kit.para(it.label, xLine + 28 * U + kit.measure(it.time, 24 * U, 'num') + 16 * U, y + 8 * U, { size: 26, align: 'left', maxW: M.x + M.w - xLine - 160 * U, maxLines: 2 });
        }
      });
    }
    ms.draw();
  },
};

/* ---------- quote ---------- */
TEMPLATES.quote = {
  skel: ['panel', 'arc', 'desk', 'full'], min: 4, dur: 6,
  draw(kit, s, R, S) {
    const L = S.L, U = L.U, p = kit.pal;
    const ms = mascotSlot(kit, S, s, R, { frac: 0.16 }), M = ms.main;
    const text = str(s.text || s.quote || s.title);
    const k = kit.in(T0, 'card', 0.55, 1.3);
    card(kit, M.x, M.y, M.w, M.h, k, -0.01, { title: str(s.who || s.source || '原话'), bar: p.hero }, b => {
      const kq = pop(kit.t, T0 + 0.15, 0.4, 1.6);
      kit.at(b.x + 6 * U, b.y + b.h * 0.2, kq, -0.08, () => kit.popText('“', 0, 0, { size: 64, align: 'left', fill: p.accent, depth: 4, lw: 4 }));
      kit.para(text, b.x + b.w / 2, b.y + b.h * 0.5, { size: L.wide ? 40 : 36, maxW: b.w * 0.78, maxLines: 5, kind: 'title', lh: 1.35, vcenter: true });
      if (s.role || (s.source && s.who)) kit.tag(str(s.role || s.source), b.x + b.w - 4 * U, b.y + b.h - 8 * U, { size: 22, align: 'right', fill: p.soft, shadow: 3, maxW: b.w * 0.7 });
    });
    ms.draw();
  },
};

/* ---------- list ---------- */
TEMPLATES.list = {
  skel: ['arc', 'panel', 'full', 'hills'], min: 4,
  draw(kit, s, R, S) {
    const items = arr(s.items).slice(0, 6).map(it => (typeof it === 'string' ? { label: it } : { label: str(it.label || it.text), note: str(it.note || ''), prop: it.prop, cue: it.cue, at: it.at }));
    const L = S.L, U = L.U, p = kit.pal;
    const ms = mascotSlot(kit, S, s, R, { frac: 0.16 }), M = ms.main;
    if (!items.length) { emptyNote(kit, M, '还没有要点'); ms.draw(); return; }
    const cues = cueTimes(s, items.map(it => (it.at != null ? { at: it.at } : it.cue || it.label)), { step: 0.48 });
    const n = items.length, gap = 12 * U, rowH = (M.h - gap * (n - 1)) / n;
    items.forEach((it, i) => {
      const y = M.y + i * (rowH + gap), k = kit.in(cues[i], 'card', 0.42, 1.5);
      const h = rowH, badge = Math.min(h * 0.62, 72 * U);
      kit.at(M.x + h / 2, y + h / 2, k, 0, () => kit.circle(0, 0, badge / 2, { fill: i === n - 1 ? p.accent : p.hero, shadow: 4 }));
      if (k > 0.3) kit.text(String(i + 1), M.x + h / 2, y + h / 2, { size: badge * 0.42 / U, kind: 'num', color: kit.on(i === n - 1 ? p.accent : p.hero) });
      const rw = M.w - h - 14 * U;
      kit.at(M.x + h + 14 * U + rw / 2, y + h / 2, k, 0, () => kit.box(-rw / 2, -h / 2, rw, h, { r: 14, fill: PAPER, shadow: 5 }));
      if (k > 0.25) {
        const x = M.x + h + 36 * U;
        const tw = M.w - h - 60 * U - (it.prop ? h : 0);
        kit.para(it.label, x, y + h * (it.note ? 0.36 : 0.5), { size: 32, align: 'left', maxW: tw, maxLines: it.note ? 1 : 2, kind: 'title' });
        if (it.note) kit.para(it.note, x, y + h * 0.72, { size: 22, align: 'left', maxW: tw, maxLines: 1, kind: 'light' });
        if (it.prop) drawProp(kit, it.prop, M.x + M.w - h * 0.55, y + h / 2, h * 0.78, { k: pop(kit.t, cues[i] + 0.12, 0.4, 1.8) });
      }
    });
    ms.draw();
  },
};

/* ---------- formula ---------- */
TEMPLATES.formula = {
  skel: ['full', 'checker', 'arc', 'panel'], min: 5,
  draw(kit, s, R, S) {
    const terms = arr(s.terms).slice(0, 5).map(it => (typeof it === 'string' ? { text: it } : { text: str(it.text || it.label), hint: str(it.hint || it.note || ''), op: it.op ? str(it.op) : '', accent: !!it.accent, prop: it.prop }));
    const L = S.L, U = L.U, p = kit.pal;
    const ms = mascotSlot(kit, S, s, R, { frac: 0.15 }), M = ms.main;
    if (!terms.length) { emptyNote(kit, M, '公式还没有项'); ms.draw(); return; }
    if (!terms.some(t => t.accent)) terms[terms.length - 1].accent = true;
    const cues = cueTimes(s, terms.map(t => t.text), { step: 0.42 });
    const vertical = M.h > M.w * 1.15;
    const opN = terms.filter(t => t.op).length;
    if (!vertical) {
      const opW = 64 * U, gap = 10 * U;
      const cw = (M.w - opW * opN - gap * (terms.length - 1)) / terms.length;
      const ch = Math.min(M.h * 0.78, cw * 1.15), y = M.y + (M.h - ch) / 2;
      let x = M.x;
      terms.forEach((it, i) => {
        if (it.op) {
          const k = kit.in(cues[i] - 0.05, null, 0.3);
          kit.at(x + opW / 2, y + ch / 2, k, 0, () => kit.popText(it.op, 0, 0, { size: 64, fill: p.hero, depth: 4, lw: 4 }));
          x += opW;
        }
        const k = kit.in(cues[i], it.accent ? 'stamp' : 'card', 0.5, 1.6);
        const fill = it.accent ? p.accent : PAPER;
        kit.at(x + cw / 2, y + ch / 2, k, it.accent ? -0.03 : 0.02, () => {
          kit.box(-cw / 2, -ch / 2, cw, ch, { r: 18, fill, shadow: 8 });
          if (it.prop) drawProp(kit, it.prop, 0, -ch * 0.16, Math.min(cw, ch) * 0.4, { still: true });
          if (it.hint) kit.text(it.hint, 0, it.prop ? ch * 0.1 : -ch * 0.22, { size: 22, kind: 'light', maxW: cw * 0.84 });
          kit.para(it.text, 0, it.prop ? ch * 0.3 : ch * 0.08, { size: 40, maxW: cw * 0.84, maxLines: 2, kind: 'title', lh: 1.2 });
        });
        x += cw + gap;
      });
    } else {
      const ch = M.h / (terms.length + opN * 0.45), gap = 8 * U;
      let y = M.y;
      terms.forEach((it, i) => {
        if (it.op) {
          const k = kit.in(cues[i], null, 0.3);
          kit.at(M.x + M.w / 2, y + 22 * U, k, 0, () => kit.popText(it.op, 0, 0, { size: 40, fill: p.hero, depth: 3 }));
          y += 44 * U;
        }
        const k = kit.in(cues[i], 'card', 0.45);
        const h = Math.min(ch, M.h * 0.22);
        card(kit, M.x + M.w * 0.12, y, M.w * 0.76, h, k, 0, { title: it.hint, bar: it.accent ? p.accent : p.hero, dots: false }, b => {
          kit.para(it.text, b.x + b.w / 2, b.y + b.h / 2, { size: 36, maxW: b.w * 0.9, maxLines: 2, kind: 'title', vcenter: true });
        });
        y += h + gap;
      });
    }
    ms.draw();
  },
};

/* ---------- table ---------- */
TEMPLATES.table = {
  skel: ['desk', 'panel', 'arc', 'full'], min: 5,
  draw(kit, s, R, S) {
    const cols = arr(s.columns).map(str);
    const rows = arr(s.rows).slice(0, 8).map(r => (Array.isArray(r) ? r.map(str) : arr(r.cells).map(str)));
    const L = S.L, U = L.U, p = kit.pal, c = kit.c;
    const ms = mascotSlot(kit, S, s, R, { frac: 0.13 }), M = ms.main;
    if (!cols.length || !rows.length) { emptyNote(kit, M, '表格还没有数据'); ms.draw(); return; }
    const k = kit.in(T0, 'card', 0.5, 1.25);
    const hiR = s.highlightRow == null || s.highlightRow === '' ? -1 : +s.highlightRow;
    const hiC = s.highlightCol == null || s.highlightCol === '' ? -1 : +s.highlightCol;
    card(kit, M.x, M.y, M.w, M.h, k, -0.006, { title: str(s.title || '对照'), dots: true }, b => {
      const nc = cols.length, nr = rows.length;
      const headH = Math.min(58 * U, b.h * 0.16), rowH = (b.h - headH) / nr;
      const weights = cols.map((col, i) => Math.max(1, ...rows.map(r => (r[i] || '').length), col.length));
      const sum = weights.reduce((a, b2) => a + b2, 0);
      const xs = [b.x];
      for (let i = 0; i < nc; i++) xs.push(xs[i] + (b.w * weights[i]) / sum);
      c.save();
      c.beginPath(); c.rect(b.x, b.y, b.w, b.h); c.clip();
      c.fillStyle = p.hero; c.fillRect(b.x, b.y, b.w, headH);
      cols.forEach((col, i) => {
        kit.text(col, (xs[i] + xs[i + 1]) / 2, b.y + headH / 2, { size: 24, color: kit.on(p.hero), kind: 'title', maxW: xs[i + 1] - xs[i] - 12 * U });
      });
      rows.forEach((r, ri) => {
        const y = b.y + headH + ri * rowH;
        const bg = ri === hiR ? p.accent : ri % 2 ? shade(PAPER, -7) : PAPER;
        c.fillStyle = bg; c.fillRect(b.x, y, b.w, rowH);
        r.forEach((cell, ci) => {
          const hot = ci === hiC || ri === hiR;
          kit.text(cell, (xs[ci] + xs[ci + 1]) / 2, y + rowH / 2, { size: hot ? 28 : 24, kind: hot ? 'title' : 'body', maxW: xs[ci + 1] - xs[ci] - 12 * U, color: kit.on(bg) });
        });
        kit.line(b.x, y, b.x + b.w, y, { lw: kit.lwThin });
      });
      for (let i = 1; i < nc; i++) kit.line(xs[i], b.y, xs[i], b.y + b.h, { lw: kit.lwThin });
      c.restore();
      kit.beat(T0 + 0.35, 'tick');
    });
    ms.draw();
  },
};

/* ---------- stats：2–4 个指标并排 ---------- */
TEMPLATES.stats = {
  skel: ['arc', 'full', 'checker', 'panel'], min: 4,
  draw(kit, s, R, S) {
    const items = arr(s.items).slice(0, 4).map(it => ({ label: str(it.label), pn: parseNum(it.value, str(it.unit), str(it.prefix)), note: str(it.note || ''), prop: it.prop, cue: it.cue, at: it.at }));
    const L = S.L, U = L.U, p = kit.pal;
    const ms = mascotSlot(kit, S, s, R, { frac: 0.15 }), M = ms.main;
    if (!items.length) { emptyNote(kit, M, '还没有指标'); ms.draw(); return; }
    const cues = cueTimes(s, items.map(it => (it.at != null ? { at: it.at } : it.cue || it.label)), { step: 0.4 });
    const n = items.length;
    const cols = M.w >= M.h && n <= 4 ? n : n === 4 ? 2 : Math.min(n, 2);
    const rows = Math.ceil(n / cols);
    const gap = 16 * U, cw = (M.w - gap * (cols - 1)) / cols, ch = (M.h - gap * (rows - 1)) / rows;
    items.forEach((it, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = M.x + col * (cw + gap), y = M.y + row * (ch + gap);
      const k = kit.in(cues[i], 'coin', 0.5, 1.5);
      const wideCard = cw > ch * 1.35;
      card(kit, x, y, cw, ch, k, (i % 2 ? 1 : -1) * 0.012, { title: it.label, bar: i === n - 1 ? p.accent : p.hero, dots: false }, b => {
        const cnt = E.outExpo(prog(kit.t, cues[i] + 0.15, 0.9));
        const full = countText(it.pn, 1);
        const ps = it.prop ? Math.min(b.h, b.w) * (wideCard ? 0.7 : 0.34) : 0;
        if (ps) drawProp(kit, it.prop, wideCard ? b.x + ps * 0.5 : b.x + b.w / 2, wideCard ? b.y + b.h / 2 : b.y + ps * 0.45, ps, { k: pop(kit.t, cues[i] + 0.1, 0.4, 1.7) });
        const tx = wideCard && ps ? b.x + ps + (b.w - ps) / 2 : b.x + b.w / 2;
        const ty = wideCard ? b.y + b.h * 0.42 : b.y + (ps ? ps : 0) + (b.h - ps) * 0.38;
        const tw = wideCard && ps ? b.w - ps - 12 * U : b.w * 0.9;
        const sz = kit.fit(full, Math.min(96 * U, (wideCard ? b.h * 0.42 : b.h * 0.28)), tw, 'num', 0.35);
        kit.popText(countText(it.pn, cnt), tx, ty, { size: sz / U, kind: 'num', maxW: tw, depth: 6, lw: 5 });
        if (it.note) kit.text(it.note, tx, ty + sz * 0.75, { size: 22, kind: 'light', maxW: tw });
      });
    });
    ms.draw();
  },
};

/* ---------- image：招股书截图 / 图表，套进复古窗口 ---------- */
TEMPLATES.image = {
  skel: ['desk', 'panel', 'arc', 'full'], min: 4, dur: 6,
  draw(kit, s, R, S) {
    const L = S.L, U = L.U, p = kit.pal, c = kit.c;
    const ms = mascotSlot(kit, S, s, R, { frac: 0.16 }), M = ms.main;
    const k = kit.in(T0, 'card', 0.55, 1.3);
    const img = S.assets && (S.assets[s.src] || S.assets[s.name]);
    card(kit, M.x, M.y, M.w, M.h, k, -0.008, { title: str(s.caption || s.title || '资料'), bar: p.hero }, b => {
      if (img && img.complete && img.naturalWidth) {
        const ir = img.naturalWidth / img.naturalHeight, br = b.w / b.h;
        let dw = b.w, dh = b.h, dx = b.x, dy = b.y;
        if (ir > br) { dh = b.w / ir; dy = b.y + (b.h - dh) / 2; }
        else { dw = b.h * ir; dx = b.x + (b.w - dw) / 2; }
        c.save(); kit.rrPath(b.x, b.y, b.w, b.h, 8 * U); c.clip();
        c.drawImage(img, dx, dy, dw, dh);
        c.restore();
      } else {
        drawProp(kit, 'doc', b.x + b.w / 2, b.y + b.h * 0.42, Math.min(b.w, b.h) * 0.45, { k: 1 });
        kit.para(s.src ? '等待图片：' + s.src : '把截图文件名填进 src', b.x + b.w / 2, b.y + b.h * 0.78, { size: 26, maxW: b.w * 0.8, maxLines: 2, kind: 'light' });
      }
    });
    ms.draw();
  },
};

/* ---------- stage：自由摆放道具，用来做「物化隐喻」 ---------- */
TEMPLATES.stage = {
  skel: ['arc', 'full', 'checker', 'panel'], min: 5,
  draw(kit, s, R, S) {
    const items = arr(s.items).slice(0, 10).map((it, i) => ({ i, prop: it.prop || 'box', x: clamp(+it.x || 0.5, 0.05, 0.95), y: clamp(+it.y || 0.5, 0.08, 0.92), size: clamp(+it.size || 0.28, 0.08, 0.7), label: str(it.label || ''), rot: (+it.rot || 0) * Math.PI / 180, cue: it.cue, at: it.at }));
    const L = S.L, U = L.U, t = kit.t, p = kit.pal;
    const ms = mascotSlot(kit, S, s, R, { frac: 0.14 }), M = ms.main;
    if (!items.length) { emptyNote(kit, M, '舞台还没有道具'); ms.draw(); return; }
    const cues = cueTimes(s, items.map(it => (it.at != null ? { at: it.at } : it.cue || it.label || it.prop)), { step: 0.28 });
    const big = items.reduce((a, b) => (a.size >= b.size ? a : b));
    const bx = M.x + big.x * M.w, by = M.y + big.y * M.h;
    const br = Math.min(M.w, M.h) * big.size * 0.72;
    const kDisc = kit.in(T0, 'pop', 0.5, 1.3);
    kit.at(bx, by, kDisc, 0, () => kit.circle(0, 0, br, { fill: p.soft, shadow: 8 }));
    const links = arr(s.links);
    links.forEach((ln, li) => {
      const a = items[ln.from], b = items[ln.to];
      if (!a || !b) return;
      const A = [M.x + a.x * M.w, M.y + a.y * M.h], B = [M.x + b.x * M.w, M.y + b.y * M.h];
      const cpt = bow(A, B, li % 2 ? 0.2 : -0.24);
      const grow = slide(kit.t, Math.max(cues[ln.from] || T0, cues[ln.to] || T0), 0.4);
      kit.arrow(A[0], A[1], cpt[0], cpt[1], B[0], B[1], { p: grow, head: 12 });
      if (ln.label && grow > 0.8) {
        const mid = qbez(A, cpt, B, 0.5);
        kit.tag(str(ln.label), mid[0], mid[1], { size: 20, fill: PAPER, shadow: 3, maxW: 180 * U });
      }
    });
    items.forEach((it, i) => {
      const x = M.x + it.x * M.w, y = M.y + it.y * M.h + Math.sin(t * 1.5 + i) * 4 * U;
      const sz = Math.min(M.w, M.h) * it.size;
      const k = kit.in(cues[i], 'pop', 0.45, 1.7);
      drawProp(kit, it.prop, x, y, sz, { k, rot: it.rot });
      if (it.label && k > 0.45) kit.tag(it.label, x, y + sz * 0.52 + 12 * U, { size: 26, fill: i === big.i ? p.accent : PAPER, shadow: 4, kind: 'title', maxW: Math.max(sz, 160 * U) });
    });
    ms.draw();
  },
};

TEMPLATES.chapter = TEMPLATES.cover;
