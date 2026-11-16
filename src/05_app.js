/* =====================================================================
 * 05 剪辑台：播放、口播稿、画幅、音效、导出。
 * 画面只由 STORY 数据驱动。换片子 = 换一份 JSON，不要改渲染代码。
 * ===================================================================== */
const ALIAS = {
  bar: 'bars', column: 'bars', line: 'trend', pie: 'split', donut: 'split',
  steps: 'flow', process: 'flow', flywheel: 'wheel', loop: 'wheel',
  hub: 'network', map: 'network', kpi: 'number', kpis: 'stats', numbers: 'stats',
  text: 'list', bullets: 'list', title: 'cover', chapter: 'cover', citation: 'quote',
};

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const q = new URLSearchParams(location.search);
if (q.get('bare') === '1') document.body.classList.add('bare');

const S = { story: null, L: null, total: 0, events: [], assets: {}, rev: 0 };
let kit = new Kit(ctx, cv.width, cv.height);
let t = 0, lastT = 0, playing = false, lastTs = 0, exporting = false, cancelExport = false;
let subsOn = q.get('subs') !== '0';
let guidesOn = false;
let lockSize = null;
if (q.get('rw') && q.get('rh')) lockSize = { w: +q.get('rw'), h: +q.get('rh') };

const audio = createAudio();

function preprocess(st) {
  st.scenes.forEach(s => {
    if (s.type === 'chapter') { s.type = 'cover'; s.chapter = true; }
    if (ALIAS[s.type]) s.type = ALIAS[s.type];
  });
}
function countBits(s) {
  const a = s.items || s.parts || s.nodes || s.rows || s.terms || s.points || [];
  return Array.isArray(a) ? a.length : 0;
}
function ensureRoom(st) {
  const pace = clamp(+st.pace || 4.6, 2.5, 8);
  st.scenes.forEach(s => {
    if (+s.dur > 0.8 && !s._autoDur) return;
    const tpl = TEMPLATES[s.type] || TEMPLATES.list;
    const chars = stripSay(s.say).length;
    let d = chars ? Math.max(tpl.min || 4, chars / pace + 1) : (tpl.dur || 5.5);
    const n = countBits(s);
    if (['bars', 'flow', 'timeline', 'list', 'network', 'waterfall', 'table'].includes(s.type)) d = Math.max(d, 2.4 + n * 0.55);
    if (s.type === 'trend') d = Math.max(d, 6);
    if (s.type === 'compare' || s.type === 'split') d = Math.max(d, 5.5);
    s.dur = Math.round(d * 10) / 10;
    s._autoDur = true;
  });
}
function validate(st) {
  const known = new Set(Object.keys(TEMPLATES));
  const warns = [];
  if (!st.scenes.length) warns.push('没有分镜。scenes 是一个数组，每一项是一幕。');
  st.scenes.forEach((s, i) => {
    const n = i + 1;
    if (!known.has(s.type)) warns.push('第 ' + n + ' 幕的 type「' + s.type + '」不认识，已按要点列表来画。');
    if (s.ribbon && String(s.ribbon).length > 16) warns.push('第 ' + n + ' 幕丝带有 ' + String(s.ribbon).length + ' 个字，建议不超过 12 个字。');
    if (s.punch && String(s.punch).length > 12) warns.push('第 ' + n + ' 幕金句有 ' + String(s.punch).length + ' 个字，建议不超过 8 个字。');
    if (!s.say) warns.push('第 ' + n + ' 幕没有口播稿 say。');
    if (s._err) warns.push('第 ' + n + ' 幕画不出来：' + s._err);
    if (s.type === 'stage' && Array.isArray(s.links) && s.links.length >= 5 && s.links.every(l => l.from === s.links[0].from)) {
      warns.push('第 ' + n + ' 幕所有连线都从同一个点射出，容易像放射线。请改用 network。');
    }
  });
  return warns;
}
function cleanStory(st) {
  const drop = k => k[0] === '_';
  const sc = st.scenes.map(s => {
    const o = {};
    Object.keys(s).forEach(k => { if (!drop(k)) o[k] = s[k]; });
    if (s._autoDur) delete o.dur;
    return o;
  });
  const o = {};
  Object.keys(st).forEach(k => { if (!drop(k) && k !== 'scenes') o[k] = st[k]; });
  o.scenes = sc;
  return o;
}

function sizeOf(st) {
  if (lockSize) return lockSize;
  const a = ASPECTS[st.aspect] || ASPECTS['16:9'];
  return { w: a[0], h: a[1] };
}
function mount(st) {
  const size = sizeOf(st);
  cv.width = size.w; cv.height = size.h;
  S.L = getLayout(size.w, size.h, st.presenter);
  kit = new Kit(ctx, size.w, size.h);
  fitCanvas();
}
function applyStory(raw) {
  const st = normalizeStory(raw);
  preprocess(st);
  S.story = st;
  ensureRoom(st);
  mount(st);
  planStory(S);
  collectBeats(S);
  const warns = validate(st);
  t = 0; lastT = 0; playing = false;
  const ed = document.getElementById('editor');
  if (ed && document.activeElement !== ed) ed.value = JSON.stringify(cleanStory(st), null, 2);
  document.getElementById('presenter').value = st.presenter || 'none';
  document.querySelectorAll('[data-aspect]').forEach(b => b.classList.toggle('on', b.dataset.aspect === st.aspect));
  buildList();
  document.getElementById('warn').textContent = warns.join('\n');
  draw();
  const sc = st.scenes.length, bad = st.scenes.filter(s => s._err).length;
  console.log('[nrp] ' + sc + ' 幕 / ' + S.total.toFixed(1) + 's' + (bad ? ' / ' + bad + ' 幕有错误' : ''));
}

function fmt(sec) {
  sec = Math.max(0, sec || 0);
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
function locateNow() { return locate(S, t); }
function buildList() {
  const box = document.getElementById('scenes');
  box.innerHTML = '';
  S.story.scenes.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'sc';
    b.innerHTML = '<b>' + (i + 1) + '  ' + (s.ribbon || s.title || s.type) + '</b><span>' + fmt(s._start) + ' · ' + s.type + ' · ' + s._dur.toFixed(1) + 's</span>';
    b.onclick = () => seek(s._start + 0.25);
    box.appendChild(b);
  });
}
function updateHud() {
  const { i } = locateNow();
  const sc = S.story.scenes;
  const s = sc[i];
  document.getElementById('time').textContent = fmt(t) + ' / ' + fmt(S.total);
  const scrub = document.getElementById('scrub');
  if (document.activeElement !== scrub) scrub.value = S.total ? Math.round((t / S.total) * 1000) : 0;
  document.getElementById('say').textContent = s ? (s.say || '（这一幕没有口播稿）') : '';
  const n = sc[i + 1];
  document.getElementById('saynext').textContent = n ? '下一幕  ' + (n.ribbon || n.title || n.type) : '全片结束';
  document.getElementById('play').textContent = playing ? '暂停' : '播放';
  document.querySelectorAll('.sc').forEach((el, idx) => el.classList.toggle('on', idx === i));
  document.getElementById('subs').classList.toggle('on', subsOn);
  document.getElementById('guides').classList.toggle('on', guidesOn);
  document.getElementById('mute').classList.toggle('on', !audio.muted);
}
function draw() {
  try { renderFrame(kit, S, Math.min(t, Math.max(0, S.total - 0.001)), { subs: subsOn, guides: guidesOn && !exporting }); }
  catch (e) { console.error('[nrp]', e); }
}
function seek(v) {
  t = clamp(v, 0, Math.max(0, S.total - 0.001));
  lastT = t;
  audio.stopAll();
  draw(); updateHud();
}
function fitCanvas() {
  if (document.body.classList.contains('bare')) { cv.style.width = '100vw'; cv.style.height = '100vh'; return; }
  const wrap = document.getElementById('stageWrap');
  const ar = cv.width / cv.height;
  const wr = wrap.clientWidth || 800, hr = wrap.clientHeight || 450;
  let w, h;
  if (wr / hr > ar) { h = hr; w = h * ar; } else { w = wr; h = w / ar; }
  cv.style.width = Math.max(1, Math.floor(w)) + 'px';
  cv.style.height = Math.max(1, Math.floor(h)) + 'px';
}

function loop(ts) {
  if (!lastTs) lastTs = ts;
  if (playing && !exporting) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    const prev = t;
    t = Math.min(S.total, t + dt);
    audio.advance(prev, t);
    if (t >= S.total - 0.03) { t = Math.max(0, S.total - 0.001); playing = false; }
    lastT = t;
  }
  lastTs = ts;
  if (!exporting) { draw(); updateHud(); }
  requestAnimationFrame(loop);
}

function extractJSON(text) {
  text = String(text || '').trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a >= 0 && b > a) text = text.slice(a, b + 1);
  return JSON.parse(text);
}

async function exportRange(a, b, name) {
  if (exporting) return;
  if (typeof MediaRecorder === 'undefined') { alert('这个浏览器不能导出视频。'); return; }
  audio.ensure();
  await audio.resume();
  exporting = true; cancelExport = false; playing = false;
  const mask = document.getElementById('mask'); mask.hidden = false;
  const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || '';
  const stream = cv.captureStream(60);
  audio.stream().getAudioTracks().forEach(tr => stream.addTrack(tr));
  const rec = new MediaRecorder(stream, Object.assign({ videoBitsPerSecond: 12000000, audioBitsPerSecond: 128000 }, mime ? { mimeType: mime } : {}));
  const chunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise(r => { rec.onstop = r; });
  rec.start(250);
  const t0 = performance.now();
  let prev = a;
  while (!cancelExport) {
    const gt = a + (performance.now() - t0) / 1000;
    if (gt >= b) break;
    t = gt;
    audio.advance(prev, t);
    prev = t;
    renderFrame(kit, S, t, { subs: subsOn, guides: false });
    document.getElementById('pct').textContent = '正在导出 ' + Math.round(((t - a) / (b - a)) * 100) + '%';
    await new Promise(r => requestAnimationFrame(r));
  }
  rec.stop();
  await stopped;
  exporting = false; mask.hidden = true; audio.stopAll(); lastT = t;
  if (!cancelExport && chunks.length) {
    const blob = new Blob(chunks, { type: chunks[0].type || 'video/webm' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}
function chapterRange() {
  const sc = S.story.scenes, { i } = locateNow();
  const c = sc[i]._chap;
  let a = i, b = i;
  while (a > 0 && sc[a - 1]._chap === c) a--;
  while (b + 1 < sc.length && sc[b + 1]._chap === c) b++;
  return [sc[a]._start, b + 1 < sc.length ? sc[b + 1]._start : S.total];
}

function createAudio() {
  let ac = null, comp = null, dest = null, master = null;
  const live = new Set();
  const api = { muted: false };
  api.ensure = function () {
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext;
    ac = new AC();
    comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.12;
    master = ac.createGain(); master.gain.value = 0.5;
    dest = ac.createMediaStreamDestination();
    comp.connect(master); master.connect(ac.destination); master.connect(dest);
    return ac;
  };
  api.resume = function () { api.ensure(); return ac.state === 'running' ? Promise.resolve() : ac.resume(); };
  api.stream = function () { api.ensure(); return dest.stream; };
  api.stopAll = function () { live.forEach(n => { try { n.stop(); } catch (e) { /* already ended */ } }); live.clear(); };
  function tone(when, f0, f1, dur, type, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(Math.max(1, f0), when);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), when + dur);
    g.gain.setValueAtTime(vol, when); g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    o.connect(g); g.connect(comp); live.add(o); o.onended = () => live.delete(o);
    o.start(when); o.stop(when + dur + 0.02);
  }
  function noise(when, dur, vol, freq) {
    const n = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.6;
    const g = ac.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(comp); live.add(src); src.onended = () => live.delete(src);
    src.start(when); src.stop(when + dur);
  }
  const SFX = {
    pop: w => tone(w, 640, 180, 0.12, 'sine', 0.22),
    card: w => noise(w, 0.09, 0.16, 1600),
    stamp: w => { tone(w, 130, 48, 0.16, 'sine', 0.32); noise(w, 0.07, 0.18, 700); },
    coin: w => { tone(w, 1560, 1560, 0.07, 'sine', 0.12); tone(w + 0.06, 2080, 2080, 0.1, 'triangle', 0.1); },
    tick: w => noise(w, 0.03, 0.1, 2800),
    whoosh: w => noise(w, 0.22, 0.12, 500),
    sheen: w => tone(w, 1600, 3200, 0.2, 'sine', 0.05),
    gear: w => tone(w, 220, 80, 0.05, 'square', 0.06),
  };
  api.play = function (name, when) {
    if (api.muted || !ac) return;
    (SFX[name] || SFX.pop)(when);
  };
  api.advance = function (prev, now) {
    if (api.muted || !ac || !S.events) return;
    const when0 = ac.currentTime;
    for (let i = 0; i < S.events.length; i++) {
      const ev = S.events[i];
      if (ev.t <= prev || ev.t > now + 0.04) continue;
      api.play(ev.sfx, when0 + Math.max(0, ev.t - now));
    }
  };
  return api;
}

document.getElementById('play').onclick = async () => {
  if (t >= S.total - 0.05) seek(0);
  playing = !playing;
  if (playing) { await audio.resume(); lastT = t; }
  updateHud();
};
document.getElementById('scrub').oninput = e => seek((+e.target.value / 1000) * S.total);
document.getElementById('subs').onclick = () => { subsOn = !subsOn; draw(); updateHud(); };
document.getElementById('guides').onclick = () => { guidesOn = !guidesOn; draw(); updateHud(); };
document.getElementById('mute').onclick = () => { audio.muted = !audio.muted; if (audio.muted) audio.stopAll(); updateHud(); };
document.querySelectorAll('[data-aspect]').forEach(b => b.onclick = () => {
  lockSize = null; S.story.aspect = b.dataset.aspect; mount(S.story);
  document.querySelectorAll('[data-aspect]').forEach(x => x.classList.toggle('on', x === b));
  draw();
});
document.getElementById('presenter').onchange = e => { S.story.presenter = e.target.value; mount(S.story); draw(); };
document.getElementById('apply').onclick = () => {
  try { applyStory(extractJSON(document.getElementById('editor').value)); }
  catch (e) { document.getElementById('warn').textContent = 'JSON 解析失败：' + e.message; }
};
document.getElementById('demo').onclick = () => { window.__bootRaw = null; applyStory(JSON.parse(JSON.stringify(DEMO_STORY))); };
document.getElementById('copy').onclick = async () => {
  const text = S.story.scenes.map(s => fmt(s._start) + '  ' + (s.ribbon || s.title || s.type) + '\n' + (s.say || '（无口播）')).join('\n\n');
  try { await navigator.clipboard.writeText(text); } catch (e) { alert(text); }
};
document.getElementById('imgs').onchange = async e => {
  for (const f of e.target.files) {
    const im = new Image(); im.src = URL.createObjectURL(f);
    try { await im.decode(); } catch (err) { continue; }
    S.assets[f.name] = im;
  }
  draw();
};
document.getElementById('exp').onclick = () => exportRange(0, S.total, (S.story.title || 'video') + '.webm');
document.getElementById('expChap').onclick = () => {
  const [a, b] = chapterRange();
  exportRange(a, b, (S.story.title || 'video') + '-章节' + (S.story.scenes[locateNow().i]._chap + 1) + '.webm');
};
document.getElementById('cancel').onclick = () => { cancelExport = true; };
window.addEventListener('resize', fitCanvas);
window.addEventListener('keydown', e => {
  if (e.target.matches('textarea, input')) return;
  if (e.code === 'Space') { e.preventDefault(); document.getElementById('play').click(); }
  if (e.code === 'ArrowRight') { const { i } = locateNow(); seek(S.story.scenes[Math.min(S.story.scenes.length - 1, i + 1)]._start + 0.05); }
  if (e.code === 'ArrowLeft') { const { i } = locateNow(); seek(S.story.scenes[Math.max(0, i - 1)]._start + 0.05); }
});

window.showScene = function (i, frac) {
  playing = false;
  const s = S.story.scenes[Math.max(0, Math.min(S.story.scenes.length - 1, i | 0))];
  seek(s._start + s._dur * (frac == null ? 0.82 : +frac));
  return { i: s._i, type: s.type, err: s._err || '', dur: s._dur, pal: s._pal.name };
};
window.__S = S;

function start() {
  const raw = JSON.parse(JSON.stringify(typeof DEMO_STORY === 'undefined' ? { title: '空白', scenes: [] } : DEMO_STORY));
  if (q.get('aspect') && ASPECTS[q.get('aspect')]) raw.aspect = q.get('aspect');
  if (q.get('presenter')) raw.presenter = q.get('presenter');
  applyStory(raw);
  const jump = q.get('scene');
  if (jump != null) window.showScene(+jump, q.get('frac') == null ? 0.82 : +q.get('frac'));
  window.__READY = true;
  requestAnimationFrame(loop);
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
