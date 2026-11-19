// 매장 / 뽑기 / 진열장 화면과 저장 데이터
// 전체를 즉시 실행 함수로 감싸서 코인·저장 데이터를 브라우저 콘솔에서 바로 건드릴 수 없게 한다.
(() => {
'use strict';
const $ = id => document.getElementById(id);

// ================= 보안 1: 게임 규칙·확률 조작 막기 =================
// 등급 확률, 기계 힘, 인형 데이터, 게임 모듈, Math.random 등을 얼려서 콘솔에서 바꿔치기 못 하게
const deepFreeze = o => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze); }
  return o;
};
[GRADES, GRADE_ORDER, MACHINES, BASE_DOLLS, DOLLS, PALETTES, OUTFITS, DOLL_BY_ID, MACHINE_BY_ID, REGULAR_POOL, SPECIAL_POOL].forEach(deepFreeze);
[ClawGame, CapsuleGame, PunchGame, TimerGame, KeyringGame, KeymasterGame, ScissorsGame, StackerGame, PusherGame, ReactionGame, MoleGame, MemoryGame, Kit, DollArt, SpecialState, Celebrate]
  .forEach(o => Object.freeze(o));
Object.freeze(Math);
try {
  const now = performance.now.bind(performance);
  Object.defineProperty(performance, 'now', { value: now, writable: false, configurable: false });
} catch (e) {}

// ================= 보안 2: 저장 데이터 서명 =================
// localStorage에는 base64 + 서명으로 저장. 값을 손으로 고치면 서명이 안 맞아 초기화된다.
const SAVE_KEY = 'mongle-claw-save-v3', OLD_KEY = 'mongle-claw-save-v2';
const SIGN_SALT = 'mg-claw::7f3a9c::몽글';
function sign(str) {
  let h1 = 0xdeadbeef ^ str.length, h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}
function toB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
const fromB64 = b => new TextDecoder().decode(Uint8Array.from(atob(b), c => c.charCodeAt(0)));
const encodeSave = obj => { const b = toB64(JSON.stringify(obj)); return `${b}.${sign(SIGN_SALT + b)}`; };
function decodeSave(raw) {
  const i = raw.lastIndexOf('.');
  const b = raw.slice(0, i), sig = raw.slice(i + 1);
  if (i < 0 || sign(SIGN_SALT + b) !== sig) return null;
  return JSON.parse(fromB64(b));
}

// 불러온 값은 범위를 확인해서 정리 (이상한 값이 끼어들지 않게)
const num = (v, min, max, def) => (Number.isFinite(+v) ? Math.min(max, Math.max(min, Math.floor(+v))) : def);
const T_MAX = 8.64e15;
function sanitize(d, caps) {
  const coinMax = caps ? caps.coins : 999999, countMax = caps ? caps.count : 99999;
  const out = {
    coins: num(d.coins, 0, coinMax, 10), owned: {}, history: [], best: {}, unlocked: [],
    seed: num(d.seed, 1, 2 ** 31 - 1, 1 + Math.floor(Math.random() * (2 ** 31 - 2))),
    daily: null, special: null, maxTime: num(d.maxTime, 0, T_MAX, 0),
  };
  for (const [id, r] of Object.entries(d.owned || {})) {
    if (!DOLL_BY_ID[id] || !r) continue;
    out.owned[id] = { count: num(r.count, 0, countMax, 0), first: num(r.first, 0, T_MAX, Date.now()), last: num(r.last, 0, T_MAX, 0), sold: num(r.sold, 0, 1e9, 0) };
  }
  if (Array.isArray(d.history)) out.history = d.history.filter(h => h && DOLL_BY_ID[h.id]).slice(0, 50).map(h => ({ id: h.id, t: num(h.t, 0, T_MAX, 0) }));
  for (const [k, v] of Object.entries(d.best || {})) if (/^[a-z]+$/.test(k) && Number.isFinite(+v)) out.best[k] = +v;
  if (Array.isArray(d.unlocked)) out.unlocked = [...new Set(d.unlocked.filter(id => MACHINE_BY_ID[id] && MACHINE_BY_ID[id].unlock))];
  const dl = d.daily;
  if (dl && typeof dl.day === 'string' && Array.isArray(dl.picks)) {
    out.daily = {
      day: dl.day,
      picks: dl.picks.filter(p => p && DOLL_BY_ID[p.id] && Number.isFinite(+p.mult)).slice(0, 3)
        .map(p => ({ id: p.id, mult: Math.min(2.5, Math.max(1.5, Math.round(+p.mult * 10) / 10)) })),
      free: dl.free == null ? null : num(dl.free, 0, 15, 0),
    };
  }
  if (d.special && Array.isArray(d.special.ids)) out.special = { k: num(d.special.k, 0, T_MAX, 0), ids: d.special.ids.filter(id => MACHINE_BY_ID[id]).slice(0, 2) };
  return out;
}

let tampered = false;
const save = (() => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = decodeSave(raw);
      if (data) return sanitize(data);
      tampered = true;
      return sanitize({});
    }
    // 이전 버전(서명 없음) 저장은 한 번만 옮겨옴. 손으로 부풀린 값은 상한으로 자름
    const old = localStorage.getItem(OLD_KEY);
    if (old) return sanitize(JSON.parse(old), { coins: 300, count: 30 });
  } catch (e) { tampered = true; }
  return sanitize({});
})();
function persist() {
  save.maxTime = Math.max(save.maxTime, Date.now());
  try { localStorage.setItem(SAVE_KEY, encodeSave(save)); localStorage.removeItem(OLD_KEY); } catch (e) {}
}
persist();

// 기기 시계를 과거로 돌린 경우 (하루 보상 반복 방지)
const clockBack = () => Date.now() < save.maxTime - 10 * 60e3;

// ================= 작은 도구들 =================
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const strSeed = s => parseInt(sign(s).slice(0, 8), 16);
const pad2 = n => String(n).padStart(2, '0');
const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`; };
const hhmm = t => { const d = new Date(t); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };

const ownedCount = id => (save.owned[id] ? save.owned[id].count : 0);
const found = id => !!save.owned[id];
const isUnlocked = m => !m.unlock || save.unlocked.includes(m.id);
const priceOf = m => (m && m.price) || 1;
const baseSell = d => GRADES[d.grade].sell;
// 오늘의 인형이면 판매가에 배율이 붙음
const dailyMult = id => { const dl = save.daily; if (!dl || dl.day !== dayKey()) return 0; const p = dl.picks.find(x => x.id === id); return p ? p.mult : 0; };
const sellPrice = d => { const m = dailyMult(d.id); return m ? Math.round(baseSell(d) * m) : baseSell(d); };
const byGrade = (a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade);

function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 2600);
}
function addCoins(n) {
  save.coins += n; persist(); renderCoins(); bumpWallet();
}
function spend(n) {
  if (save.coins < n) return false;
  save.coins -= n; persist(); renderCoins(); bumpWallet();
  return true;
}
// 판이 취소됐을 때 넣은 코인 돌려주기
function refund(n, why) {
  addCoins(n);
  toast(`${why} · 🪙 ${n}코인을 돌려받았어요`);
}
const gradeStyle = g => `--g:${GRADES[g].color}`;
const stars = n => '★'.repeat(n) + '☆'.repeat(4 - n);
const LEVEL_NAME = ['', '쉬움', '보통', '어려움', '매우 어려움'];
const levelLabel = m => m.levelText || `난이도 ${LEVEL_NAME[m.level]}`;
const fmtTime = t => new Date(t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// ================= 공통 =================
let currentView = 'store';
let currentMachine = null;
const previewCache = {};

function renderCoins() {
  $('coin-count').textContent = save.coins;
  const clawPrice = currentMachine && currentMachine.type === 'claw' ? priceOf(currentMachine) : 1;
  $('btn-coin').disabled = save.coins < clawPrice || ClawGame.state !== 'idle';
  if (currentMachine && currentMachine.type !== 'claw') GAMES[currentMachine.type].refresh();
  if (currentView === 'store') renderDaily();
  if (dev) renderDevInfo();
}
function bumpWallet() {
  const w = document.querySelector('.wallet');
  w.classList.remove('bump'); void w.offsetWidth; w.classList.add('bump');
}
function renderNavCount() {
  $('nav-count').textContent = DOLLS.filter(d => found(d.id)).length;
}

// ================= 특별 뽑기 =================
// 매시 정각과 30분에 시작해서 10분 동안, 해금된 기계 중 2대에 특별(오로라) 인형이 들어간다
const SLOT = 30 * 60e3, DUR = 10 * 60e3;
let devSpecial = null;   // 개발자 모드에서 강제로 켠 특별 뽑기
function specialEvent(t = Date.now()) {
  if (devSpecial) {
    if (t < devSpecial.end) return devSpecial.ids.length ? devSpecial : null;   // ids가 비면 '강제로 끔'
    devSpecial = null;
  }
  const k = Math.floor(t / SLOT), start = k * SLOT;
  if (t >= start + DUR) return null;
  if (!save.special || save.special.k !== k) {
    const r = rng(strSeed(`pick:${k}:${save.seed}`));
    const pool = MACHINES.filter(isUnlocked).map(m => m.id);
    const ids = [];
    while (ids.length < 2 && pool.length) ids.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    save.special = { k, ids }; persist();
  }
  return { key: `s${k}`, start, end: start + DUR, ids: save.special.ids };
}
const nextSpecialStart = (t = Date.now()) => (Math.floor(t / SLOT) + 1) * SLOT;

let spKey = null;
const stockKey = {};   // 기계마다 지금 채워진 인형 구성 (특별/평소)
const stockOf = m => (SpecialState.has(m.id) ? 'sp' : 'n');
function restockIfStale(m) {
  if (stockKey[m.id] === stockOf(m)) return;
  const g = m.type === 'claw' ? ClawGame : GAMES[m.type];
  if (!g.restock && !g.refresh) { stockKey[m.id] = stockOf(m); return; }
  const done = m.type === 'claw' ? ClawGame.refresh() : g.restock ? g.restock() : true;
  if (done) stockKey[m.id] = stockOf(m);
}

function applySpecial() {
  const ev = specialEvent();
  const ids = ev ? ev.ids : [];
  const key = ev ? `${ev.key}:${ids.join(',')}` : '';
  if (key !== spKey) {
    const before = SpecialState.ids;
    const first = spKey === null;
    SpecialState.set(ids);
    spKey = key;
    const changed = new Set([...before, ...ids]);
    changed.forEach(id => { previewCache[id] = makePreview(MACHINE_BY_ID[id]); });
    if (!first) {
      if (ev) toast(`✨ 특별 뽑기 시작! ${ids.map(id => MACHINE_BY_ID[id].name).join(', ')}에 오로라 인형이 들어왔어요`);
      else toast('특별 뽑기가 끝나서 기계들이 원래대로 돌아왔어요');
    }
    if (currentMachine && changed.has(currentMachine.id)) {
      if (currentMachine.type === 'claw') { if (ClawGame.refresh()) stockKey[currentMachine.id] = stockOf(currentMachine); }
      else restockIfStale(currentMachine);
      setMarquee(currentMachine);
      renderLineup();
    }
    if (currentView === 'store' && !first) renderStore();
  }
  renderSpecialClock(ev);
  // 자정이 지나면 오늘의 인형을 새로
  if (currentView === 'store' && save.daily && save.daily.day !== dayKey()) renderDaily();
}

function renderSpecialClock(ev) {
  const now = Date.now();
  document.querySelectorAll('[data-sp-left]').forEach(el => { el.textContent = ev ? mmss(ev.end - now) : ''; });
  const banner = $('special-banner');
  if (!banner) return;
  if (ev) {
    banner.classList.add('on');
    const html = `<b>✨ 특별 뽑기 진행 중!</b>
      <span>${ev.ids.map(id => `<a href="#/play/${id}">${MACHINE_BY_ID[id].name}</a>`).join(' · ')}에서 오로라 인형이 나와요</span>
      <span class="sp-clock">남은 시간 <b data-sp-left>${mmss(ev.end - now)}</b></span>`;
    if (banner.dataset.k !== ev.key) { banner.innerHTML = html; banner.dataset.k = ev.key; }
  } else {
    banner.classList.remove('on');
    const next = nextSpecialStart(now);
    const html = `<b>✨ 특별 뽑기</b><span>30분마다 10분 동안, 기계 2대에 평소에 없는 오로라 인형이 들어와요</span>
      <span class="sp-clock">다음 시작 ${hhmm(next)} · <b data-sp-next>${mmss(next - now)}</b> 남음</span>`;
    if (banner.dataset.k !== 'off') { banner.innerHTML = html; banner.dataset.k = 'off'; }
    const n = banner.querySelector('[data-sp-next]');
    if (n) n.textContent = mmss(next - now);
  }
}

// ================= 매장 =================
function machinePreview(m) {
  const S = 240, c = document.createElement('canvas');
  c.width = c.height = S * 2;
  const x = c.getContext('2d');
  x.scale(2, 2);
  const g = x.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, m.theme.inside[0]); g.addColorStop(1, m.theme.inside[1]);
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  // 레일과 집게
  x.fillStyle = '#c9c9d6'; x.fillRect(0, 18, S, 5);
  x.strokeStyle = '#ddd'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(150, 20); x.lineTo(150, 62); x.stroke();
  x.fillStyle = '#d7dbe8'; x.fillRect(140, 60, 20, 12);
  x.strokeStyle = '#9aa0b5'; x.lineWidth = 4; x.lineCap = 'round';
  x.beginPath(); x.moveTo(142, 72); x.lineTo(134, 86); x.lineTo(140, 96);
  x.moveTo(158, 72); x.lineTo(166, 86); x.lineTo(160, 96); x.stroke();
  // 출구
  x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 180, 52, 60);
  x.fillStyle = 'rgba(200,240,255,.4)'; x.fillRect(52, 176, 5, 64);
  // 인형 더미
  const pool = dollsOf(m.id);
  const spots = [[84, 212], [126, 214], [168, 212], [210, 214], [104, 180], [146, 180], [188, 182], [126, 150], [168, 152], [212, 178]];
  spots.forEach(([px, py], i) => DollArt.drawAt(x, pool[(i * 7) % pool.length], px, py, 20, ((i * 37) % 7 - 3) * 0.06));
  return c.toDataURL();
}
const makePreview = m => (m.type === 'claw' ? machinePreview(m) : GAMES[m.type].preview(m));

function renderStore() {
  const order = [...MACHINES].sort((a, b) => (a.unlock || 0) - (b.unlock || 0));
  $('machine-row').innerHTML = order.map(m => {
    const pool = dollsOf(m.id);
    const got = pool.filter(d => found(d.id)).length;
    const open = isUnlocked(m);
    const sp = SpecialState.has(m.id);
    const grades = [...new Set(pool.map(d => d.grade))].sort((a, b) => GRADE_ORDER.indexOf(a) - GRADE_ORDER.indexOf(b));
    return `
    <a class="mcab ${open ? '' : 'locked'} ${sp ? 'special' : ''}" href="#/play/${m.id}" data-machine="${m.id}" style="--cab:${m.theme.cab};--cab2:${m.theme.cab2}">
      <span class="price-tag">1회 ${priceOf(m)}코인</span>
      ${sp ? '<span class="sp-ribbon">✨ 특별 뽑기 <b data-sp-left></b></span>' : ''}
      <div class="mcab-top">${m.name}</div>
      <div class="mcab-body">
        <div class="mcab-glass"><img src="${previewCache[m.id]}" alt="${m.name} 기계"></div>
        <div class="mcab-panel"><span class="stars">${stars(m.level)}</span><span>${levelLabel(m)}</span></div>
      </div>
      <div class="mcab-base"><span class="chute-door">PUSH ▼</span><span class="coin-slot"></span></div>
      <div class="mcab-info">${sp ? '지금만 오로라 인형이 나와요!' : m.desc}<br><b>수집 ${got} / ${pool.length}</b> · 등급 ${grades.join(' ')}</div>
      ${open ? '' : `<div class="lock ${save.coins >= m.unlock ? 'can' : ''}"><b>🔒</b><span>🪙 ${m.unlock}코인으로 해금</span></div>`}
    </a>`;
  }).join('');

  const owned = DOLLS.filter(d => ownedCount(d.id) > 0).slice(-5);
  $('door-preview').innerHTML = owned.length
    ? owned.map(d => `<img src="${DollArt.url(d)}" alt="${d.name}">`).join('')
    : '아직 비어 있어요';
  renderDaily();
  renderSpecialClock(specialEvent());
}

function renderGradeLegend() {
  const hint = { S: '거의 안 나오고, 집어도 잘 빠짐', A: '드물고 잘 미끄러짐', B: '꽤 까다로움', C: '조금만 집중하면 OK', D: '자주 나오고 잘 잡힘' };
  $('grade-legend').innerHTML = GRADE_ORDER.map(g => `
    <li><span class="grade-badge" style="${gradeStyle(g)}">${g}</span><span>${GRADES[g].name} · 판매 🪙${GRADES[g].sell}</span><span>${hint[g]}</span></li>`).join('');
}

function buildLights() {
  const cols = ['#ff5fa2', '#ffd23f', '#4de8ff', '#8bd17c', '#c77dff'];
  $('machine-row').closest('.store').querySelector('.lights').innerHTML =
    Array.from({ length: 24 }, (_, i) => `<i style="--c:${cols[i % cols.length]};--d:${(i % 5) * 0.3}s"></i>`).join('');
}

// 무료 동전: 코인이 거의 없을 때만 (해금 경제가 무너지지 않게)
$('coin-changer').onclick = () => {
  if (save.coins >= 3) { toast('동전 교환기는 코인이 3개 미만일 때만 쓸 수 있어요. 인형을 팔아 코인을 모아요!'); return; }
  addCoins(5);
  toast('무료 코인 5개를 받았어요!');
};

$('machine-row').addEventListener('click', e => {
  const card = e.target.closest('[data-machine]');
  if (!card) return;
  const m = MACHINE_BY_ID[card.dataset.machine];
  if (isUnlocked(m)) return;
  e.preventDefault();
  askUnlock(m);
});

function askUnlock(m) {
  const enough = save.coins >= m.unlock;
  showModal({
    img: previewCache[m.id], color: m.theme.cab, badge: `🔒 잠긴 기계 · 1회 ${priceOf(m)}코인`,
    name: m.name,
    msg: enough ? `🪙 ${m.unlock}코인으로 해금할 수 있어요` : `해금하려면 🪙 ${m.unlock}코인이 필요해요 (${m.unlock - save.coins}개 부족)`,
    desc: enough ? m.desc : '진열장에서 인형을 팔면 코인을 모을 수 있어요.',
    buttons: [
      { label: `🔓 ${m.unlock}코인으로 해금하기`, cls: 'gold', disabled: !enough, fn: () => unlock(m) },
      enough ? { label: '나중에' } : { label: '진열장으로 가서 팔기', cls: 'primary', fn: () => { location.hash = '#/shelf'; } },
    ],
  });
}

function unlock(m) {
  if (isUnlocked(m) || save.coins < m.unlock) return;
  save.coins -= m.unlock;
  save.unlocked.push(m.id);
  persist(); renderCoins(); renderStore();
  showModal({
    img: previewCache[m.id], color: m.theme.cab, badge: '🔓 해금 완료',
    name: m.name, msg: '새 기계가 열렸어요!', desc: m.desc,
    buttons: [{ label: '바로 하러 가기', cls: 'primary', fn: () => { location.hash = `#/play/${m.id}`; } }, { label: '닫기' }],
  });
}

// ================= 오늘의 인형 TOP 3 · 오늘의 무료 코인 =================
// C~S 등급에서 무작위 (높은 등급일수록 드묾). 오늘 하루 이 인형을 팔면 판매가가 x1.5~2.5
const DAILY_W = [['C', 50], ['B', 30], ['A', 15], ['S', 5]];
const MULT_W = [[1.5, 40], [1.8, 30], [2.0, 18], [2.2, 8], [2.5, 4]];   // 배율과 확률(%)
function makeDaily(day, seed) {
  const r = rng(seed);
  const picks = [], used = new Set();
  while (picks.length < 3) {
    let roll = r() * 100, g = 'C';
    for (const [gg, w] of DAILY_W) if ((roll -= w) < 0) { g = gg; break; }
    const pool = DOLLS.filter(d => !d.special && d.grade === g && !used.has(d.id));
    const d = pool[Math.floor(r() * pool.length)];
    used.add(d.id);
    let mr = r() * 100, mult = 1.5;
    for (const [m, w] of MULT_W) if ((mr -= w) < 0) { mult = m; break; }
    picks.push({ id: d.id, mult });
  }
  picks.sort((a, b) => b.mult - a.mult || byGrade(DOLL_BY_ID[a.id], DOLL_BY_ID[b.id]));
  return { day, picks, free: null };
}
function ensureDaily() {
  const day = dayKey();
  if (!save.daily || save.daily.day !== day || save.daily.picks.length < 3) {
    const free = save.daily && save.daily.day === day ? save.daily.free : null;   // 같은 날 무료 코인 기록은 유지
    save.daily = makeDaily(day, strSeed(`daily2:${day}:${save.seed}`));
    save.daily.free = free;
    persist();
  }
  return save.daily;
}

function renderDaily() {
  const dl = ensureDaily();
  $('daily-date').textContent = `${dl.day.replace(/-/g, '.')} · 오늘 이 인형을 팔면 판매가가 올라요 · 자정에 바뀌어요`;
  $('daily-picks').innerHTML = dl.picks.map((p, i) => {
    const d = DOLL_BY_ID[p.id], base = baseSell(d), now = sellPrice(d), n = ownedCount(d.id);
    return `<div class="daily-card ${p.mult >= 2.2 ? 'hot' : ''}" style="${gradeStyle(d.grade)}">
      <span class="daily-rank">${i + 1}위</span>
      <span class="daily-mult">x${p.mult.toFixed(1)}</span>
      <button class="daily-pedestal" data-look="${p.id}" aria-label="${d.name} 자세히"><img src="${DollArt.url(d)}" alt="${d.name}"></button>
      <div class="daily-name"><span class="grade-badge" style="${gradeStyle(d.grade)}">${d.grade}</span>${found(d.id) ? d.name : '???'}</div>
      <div class="daily-mc">${MACHINE_BY_ID[d.machine].name} · ${n ? `보유 ${n}개` : '없음'}</div>
      <div class="daily-price">판매가 <s>🪙${base}</s> → <b>🪙${now}</b></div>
      <button class="sell-btn" data-sell="${p.id}" ${n ? '' : 'disabled'}>${n ? `🪙 ${now}코인에 팔기` : '가지고 있지 않아요'}</button>
    </div>`;
  }).join('');
  const btn = $('daily-free-btn');
  btn.disabled = dl.free != null;
  btn.textContent = dl.free == null ? '🎁 받기' : `✔ 오늘 받음 (+${dl.free})`;
  $('daily-free-note').textContent = dl.free == null ? '하루 한 번 · 5~15코인 중 랜덤' : '내일 또 받을 수 있어요';
}

$('daily-picks').addEventListener('click', e => {
  const b = e.target.closest('[data-look], [data-sell]');
  if (!b) return;
  const d = DOLL_BY_ID[b.dataset.look || b.dataset.sell];
  if (found(d.id)) openDollDetail(d);
  else showModal({ ...dollModal(d, `'${MACHINE_BY_ID[d.machine].name}'에서 뽑을 수 있어요 · 오늘 팔면 🪙${sellPrice(d)}`), locked: true, name: '???', desc: '아직 정체를 알 수 없는 인형이에요.' });
});

$('daily-free-btn').onclick = () => {
  const dl = ensureDaily();
  if (dl.free != null) return;
  if (clockBack()) { toast('기기 시간이 이상해요. 시간을 맞춘 뒤 다시 시도해 주세요'); return; }
  const n = 5 + Math.floor(Math.random() * 11);
  dl.free = n;
  addCoins(n);
  renderDaily();
  toast(`🎁 오늘의 무료 코인 ${n}개를 받았어요!`);
};

// ================= 뽑기 기계 =================
const recentMachines = [];   // 최근에 연 기계 (당첨 인형은 이 기계 것만 인정)
let clawMachine = null;

function setMarquee(m) {
  const sec = playSection(m);
  const sp = SpecialState.has(m.id) ? '<span class="sp-tag">✨ 특별 뽑기 · 오로라 인형 <b data-sp-left></b></span>' : '';
  sec.querySelector('.marquee').innerHTML = m.type === 'claw'
    ? `${m.name}<small>${stars(m.level)} 난이도 ${LEVEL_NAME[m.level]} · 집게 힘 ${Math.round(m.power * 100)}% · 1회 ${priceOf(m)}코인</small>${sp}`
    : `${m.name}<small>${stars(m.level)} ${m.levelText} · 1회 ${priceOf(m)}코인</small>${sp}`;
}

// 기믹이 다른 기계의 도움말
const TIPS = {
  randtimer: '목표 시간이 매번 달라요. 1.5초 만에 숫자가 사라지니 처음 1.5초의 속도를 잘 느껴 두세요.',
  zigzag: '벨트가 빨라졌다 느려졌다, 거꾸로도 가요. 속도가 느려질 때가 기회예요!',
  pingpong: '한 번 탭하면 출발, 다시 탭하면 싹둑! 끝에 닿을 때마다 빨라지니 초반에 노리세요.',
  slidekey: '열쇠구멍이 좌우로 움직여요. 세로를 멈추는 순간 구멍 위치로 판정해요.',
  luckycap: '레버의 빨간 끝이 위쪽 금색 칸에 있을 때 멈추면 S·A 확률이 크게 올라요.',
  combopunch: '세 번 쳐서 평균으로 판정해요. 칠 때마다 게이지가 25%씩 빨라져요.',
};
function openMachine(m) {
  currentMachine = m;
  if (recentMachines[0] !== m.id) { recentMachines.unshift(m.id); recentMachines.length = Math.min(2, recentMachines.length); }
  const sec = playSection(m);
  sec.style.setProperty('--cab', m.theme.cab);
  sec.style.setProperty('--cab2', m.theme.cab2);
  setMarquee(m);
  const tip = sec.querySelector('.lineup-tip');
  if (tip) { if (!tip.dataset.base) tip.dataset.base = tip.textContent; tip.textContent = TIPS[m.id] || tip.dataset.base; }
  if (m.type === 'claw') {
    const prev = clawMachine;
    clawMachine = m;
    if (prev !== m) stockKey[m.id] = stockOf(m);
    if (ClawGame.setMachine(m)) refund(priceOf(prev), '다른 기계로 옮겨서 진행 중이던 판이 취소됐어요');
    $('btn-coin').textContent = `🪙 코인 넣기 · ${priceOf(m)}개`;
  } else GAMES[m.type].open(m);
  restockIfStale(m);
  renderLineup();
  renderCoins();
  renderSpecialClock(specialEvent());
}

// 이 기계의 인형: 등급별로 한 줄씩 (기본 + 색 바꾼 인형 + 옷 입은 인형)
function renderLineup() {
  const m = currentMachine;
  if (!m) return;
  const odds = dollOdds(m.id);
  const pool = dollsOf(m.id).sort(byGrade);
  const got = pool.filter(d => found(d.id)).length;
  const sec = playSection(m);
  sec.querySelector('.lineup-meta').textContent = `수집 ${got} / ${pool.length}${SpecialState.has(m.id) ? ' · ✨ 지금은 특별 인형만 나와요' : ''}`;
  sec.querySelector('.lineup').innerHTML = GRADE_ORDER.map(g => {
    const row = pool.filter(d => d.grade === g);
    if (!row.length) return '';
    const pct = row.reduce((s, d) => s + odds[d.id], 0);
    const have = row.filter(d => found(d.id)).length;
    return `<li style="${gradeStyle(g)}">
      <span class="grade-badge" style="${gradeStyle(g)}">${g}</span>
      <div class="lg-body">
        <div class="sub">${GRADES[g].name} · ${m.rules ? m.rules[g] : `출현 ${pct.toFixed(1)}%`} · ${have}/${row.length}</div>
        <div class="lg-dolls">${row.map(d => {
          const f = found(d.id), n = ownedCount(d.id);
          return `<span class="lg-doll ${f ? '' : 'locked'}" title="${f ? d.name : '???'}${n ? ` x${n}` : ''}"><img src="${DollArt.url(d)}" alt="">${n ? `<i>${n}</i>` : ''}</span>`;
        }).join('')}</div>
      </div>
    </li>`;
  }).join('');
}

const STATUS = {
  idle: () => (save.coins > 0 ? '코인을 넣어주세요' : '코인이 없어요! 인형을 팔거나 매장의 교환기로'),
  ready: () => '움직이고 집기!',
  drop: () => '내려가는 중...',
  close: () => '집는 중...',
  rise: () => '두근두근...',
  return: () => '두근두근...',
  release: () => '출구로!',
  reset: () => '',
};

let lastStatus = '', lastTimer = '', lastPlaying = null;
function playSection(m) { return document.querySelector(`[data-view="play-${m.type}"]`); }

// 인형을 진열장에 넣기 (뽑기 당첨, 오늘의 인형 구매)
function giveDoll(doll, note) {
  const first = !save.owned[doll.id];
  const now = Date.now();
  const rec = save.owned[doll.id] || { count: 0, first: now };
  rec.count++; rec.last = now;
  save.owned[doll.id] = rec;
  save.history.unshift({ id: doll.id, t: now });
  save.history.length = Math.min(save.history.length, 50);
  persist();
  renderLineup();
  renderNavCount();
  if (currentView === 'store') renderStore();
  const head = first ? '🎉 새로운 인형 획득! 진열장에 전시됐어요' : `🎉 인형 획득! (보유 ${rec.count}개)`;
  queueModal({ ...dollModal(doll, note ? `${note} · ${head}` : head), fx: { grade: doll.grade, isNew: first } });
}
// 기계에서 당첨: 방금 열었던 기계의 인형만 인정
function award(doll, note) {
  if (!doll || !DOLL_BY_ID[doll.id] || !recentMachines.includes(doll.machine)) return;
  giveDoll(DOLL_BY_ID[doll.id], note);
}

// 지금 기계 1회 가격만큼 코인 쓰기
function spendCoin() {
  const p = priceOf(currentMachine);
  if (!currentMachine || !spend(p)) { toast(`코인이 부족해요 (1회 ${p}코인)`); return false; }
  return true;
}

ClawGame.init($('claw-canvas'), {
  spendCoin,
  onWin: doll => award(doll),
  onGrab(q) {
    $('claw-status').textContent = q > 0.85 ? '정중앙! 꽉 잡았다' : q > 0.6 ? '살짝 빗나갔다...' : '가장자리를 집었다...';
    lastStatus = '앗';
  },
  onSlip() {
    $('claw-status').textContent = '앗, 미끄러졌다!';
    lastStatus = '앗';
  },
  onRoundEnd: renderCoins,
  onTick(state, timer) {
    const s = STATUS[state]();
    const t = state === 'ready' ? `⏱ ${Math.ceil(timer)}` : '';
    if (s !== lastStatus && !(lastStatus === '앗' && (state === 'close' || state === 'rise' || state === 'return'))) {
      $('claw-status').textContent = s; lastStatus = s;
    }
    if (t !== lastTimer) { $('claw-timer').textContent = t; lastTimer = t; }
    const playing = state === 'ready';
    if (playing !== lastPlaying) {
      $('btn-left').disabled = $('btn-right').disabled = $('btn-drop').disabled = !playing;
      lastPlaying = playing;
    }
  },
});

// 캡슐 / 펀치 / 10초 등 다른 기계
const gameHooks = Object.freeze({
  // 지금 기계를 몇 번 할 수 있는지 (기계마다 1회 가격이 다름)
  coins: () => Math.floor(save.coins / priceOf(currentMachine)),
  spendCoin,
  // 코인 푸셔에서 앞으로 떨어진 코인 (1개씩만)
  addCoins: () => { if (currentMachine && currentMachine.type === 'pusher') addCoins(1); },
  refund: (n, why) => refund(Math.min(Math.max(1, n | 0), 3), why),   // 1회 가격은 최대 3코인
  award,
  // 최고 기록: 값을 주면 갱신 후 반환, 없으면 조회만 (lower=true면 낮을수록 좋음)
  best(key, val, lower) {
    if (val !== undefined && Number.isFinite(val)) {
      const cur = save.best[key];
      if (cur === undefined || (lower ? val < cur : val > cur)) { save.best[key] = val; persist(); }
    }
    return save.best[key];
  },
});
const GAMES = Object.freeze({
  capsule: CapsuleGame, punch: PunchGame, timer: TimerGame,
  keyring: KeyringGame, keymaster: KeymasterGame, scissors: ScissorsGame, stacker: StackerGame,
  pusher: PusherGame, reaction: ReactionGame, mole: MoleGame, memory: MemoryGame,
});
CapsuleGame.init({ canvas: $('capsule-canvas'), btn: $('capsule-btn'), status: $('capsule-status'), extra: $('capsule-extra') }, gameHooks);
PunchGame.init({ canvas: $('punch-canvas'), btn: $('punch-btn'), status: $('punch-status'), extra: $('punch-extra') }, gameHooks);
TimerGame.init({ screen: $('timer-screen'), digits: $('timer-digits'), sub: $('timer-sub'), btn: $('timer-btn'), status: $('timer-status'), extra: $('timer-extra') }, gameHooks);
for (const type of ['keyring', 'keymaster', 'scissors', 'stacker', 'pusher', 'reaction', 'mole', 'memory']) {
  GAMES[type].init({ canvas: $(`${type}-canvas`), btn: $(`${type}-btn`), status: $(`${type}-status`), extra: $(`${type}-extra`) }, gameHooks);
}
for (const [type, g] of Object.entries(GAMES)) {
  const b = $(`${type}-btn`);
  if (g.press) {
    // 누르고 있다가 떼는 기계 (가위)
    b.addEventListener('pointerdown', e => { e.preventDefault(); g.press(); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => g.release()));
  } else b.onclick = () => g.action();
}

function insertCoin() {
  if (ClawGame.state !== 'idle') return;
  ClawGame.insertCoin();   // 코인 차감은 spendCoin 훅에서
}

$('btn-coin').onclick = insertCoin;
$('btn-drop').onclick = () => ClawGame.drop();

for (const [id, dir] of [['btn-left', 'left'], ['btn-right', 'right']]) {
  const b = $(id);
  const on = e => { e.preventDefault(); ClawGame.setInput(dir, true); b.classList.add('held'); };
  const off = () => { ClawGame.setInput(dir, false); b.classList.remove('held'); };
  b.addEventListener('pointerdown', on);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, off));
}

const KEY_DIR = { ArrowLeft: 'left', ArrowRight: 'right' };
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') { e.preventDefault(); openDevLogin(); return; }
  if (!currentView.startsWith('play') || !$('modal').hidden || !$('dev-login').hidden) return;
  if (currentMachine.type !== 'claw') {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) (GAMES[currentMachine.type].press || GAMES[currentMachine.type].action)();
    }
    return;
  }
  if (KEY_DIR[e.key]) { e.preventDefault(); ClawGame.setInput(KEY_DIR[e.key], true); }
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault();
    if (ClawGame.state === 'idle') insertCoin(); else ClawGame.drop();
  }
});
document.addEventListener('keyup', e => {
  if (e.code === 'Space' && currentMachine && GAMES[currentMachine.type] && GAMES[currentMachine.type].release) GAMES[currentMachine.type].release();
  if (KEY_DIR[e.key]) ClawGame.setInput(KEY_DIR[e.key], false);
});

// ================= 진열장 =================
let shelfTab = 'all';

function renderShelf() {
  renderBulk();
  const uniq = DOLLS.filter(d => found(d.id)).length;
  const total = DOLLS.reduce((s, d) => s + ownedCount(d.id), 0);
  const sCount = DOLLS.filter(d => d.grade === 'S' && found(d.id)).length;
  const dupes = DOLLS.reduce((s, d) => s + Math.max(0, ownedCount(d.id) - 1), 0);
  const dupeValue = DOLLS.reduce((s, d) => s + Math.max(0, ownedCount(d.id) - 1) * sellPrice(d), 0);
  $('sell-info').textContent = dupes
    ? `중복 인형 ${dupes}개 · 모두 팔면 🪙 ${dupeValue}코인 (종류마다 1개씩은 남겨요)`
    : '중복 인형이 없어요. 같은 인형을 또 뽑으면 팔 수 있어요.';
  $('sell-dupes').disabled = !dupes;
  $('shelf-stats').innerHTML = `
    <div class="stat"><b>${uniq} / ${DOLLS.length}</b>도감 수집</div>
    <div class="stat"><b>${total}</b>보유 인형 수</div>
    <div class="stat"><b>${sCount} / ${DOLLS.filter(d => d.grade === 'S').length}</b>전설 등급</div>`;

  const tabs = [{ id: 'all', name: '전체' }, { id: 'special', name: '✨ 특별' }, ...MACHINES];
  $('shelf-tabs').innerHTML = tabs.map(t => `<button data-tab="${t.id}" class="${t.id === shelfTab ? 'on' : ''}">${t.name}</button>`).join('');

  const list = DOLLS.filter(d => shelfTab === 'all' || (shelfTab === 'special' ? d.special : d.machine === shelfTab));
  const recent = new Set(save.history.slice(0, 3).map(h => h.id));
  $('shelf-body').innerHTML = GRADE_ORDER.map(g => {
    const row = list.filter(d => d.grade === g);
    if (!row.length) return '';
    const got = row.filter(d => found(d.id)).length;
    return `<div class="grade-row">
      <h3><span class="grade-badge" style="${gradeStyle(g)}">${g}</span>${GRADES[g].name} <small>${got} / ${row.length} · 판매가 🪙${GRADES[g].sell}</small></h3>
      <div class="plank">${row.map(d => {
        const n = ownedCount(d.id), f = found(d.id);
        const cls = !f ? 'locked' : n ? '' : 'sold';
        const q = bulk ? bulkQty(d) : 0;
        const pick = bulk ? (q ? `pick ${bulk.sel.has(d.id) ? 'on' : ''}` : 'nopick') : '';
        return `<button class="doll-card ${cls} ${pick} ${n && recent.has(d.id) ? 'new' : ''} ${d.special ? 'sp' : ''}" data-doll="${d.id}" title="${f ? d.name : '아직 못 뽑은 인형'}">
          ${bulk && q ? `<span class="pick-mark">${bulk.sel.has(d.id) ? '✔' : ''}</span><span class="pick-qty">${q}개 · 🪙${q * sellPrice(d)}</span>` : ''}
          ${n > 1 ? `<span class="cnt">x${n}</span>` : ''}
          ${dailyMult(d.id) ? `<span class="boost">🔥x${dailyMult(d.id).toFixed(1)}</span>` : ''}
          <img src="${DollArt.url(d)}" alt="${f ? d.name : '미획득'}">
          <span class="nm">${f ? d.name : '???'}</span>
          <span class="mc">${MACHINE_BY_ID[d.machine].name}${d.special ? ' · 특별' : ''}</span>
        </button>`;
      }).join('')}</div>
    </div>`;
  }).join('');

  $('history').innerHTML = save.history.length
    ? save.history.slice(0, 15).map(h => {
        const d = DOLL_BY_ID[h.id];
        if (!d) return '';
        return `<li><img src="${DollArt.url(d)}" alt=""><span class="grade-badge" style="${gradeStyle(d.grade)}">${d.grade}</span>
          <span>${d.name}</span><span class="mc">· ${MACHINE_BY_ID[d.machine].name}</span><time>${fmtTime(h.t)}</time></li>`;
      }).join('')
    : '<li class="empty">아직 뽑은 인형이 없어요. 매장에서 도전해 보세요!</li>';
}

$('shelf-tabs').addEventListener('click', e => {
  const b = e.target.closest('button[data-tab]');
  if (b) { shelfTab = b.dataset.tab; renderShelf(); }
});
$('shelf-body').addEventListener('click', e => {
  const b = e.target.closest('[data-doll]');
  if (!b) return;
  const d = DOLL_BY_ID[b.dataset.doll];
  if (bulk) {   // 일괄 판매 중에는 눌러서 고르기
    if (!bulkQty(d)) return;
    bulk.sel.has(d.id) ? bulk.sel.delete(d.id) : bulk.sel.add(d.id);
    renderShelf();
    return;
  }
  openDollDetail(d);
});

// ================= 일괄 판매 =================
// 진열장에서 여러 인형을 골라 한 번에 팔기. '종류마다 1개 남기기'를 끄면 마지막 1개까지 판다
let bulk = null;   // { sel: Set<dollId>, keep: boolean }
const bulkQty = d => Math.max(0, ownedCount(d.id) - (bulk && bulk.keep ? 1 : 0));
const shelfList = () => DOLLS.filter(d => shelfTab === 'all' || (shelfTab === 'special' ? d.special : d.machine === shelfTab));
function renderBulk() {
  $('bulk-bar').hidden = !bulk;
  $('bulk-start').hidden = !!bulk;
  document.querySelector('.shelf-view').classList.toggle('bulk-on', !!bulk);
  if (!bulk) return;
  for (const id of [...bulk.sel]) if (!bulkQty(DOLL_BY_ID[id])) bulk.sel.delete(id);
  const items = [...bulk.sel].map(id => DOLL_BY_ID[id]);
  const n = items.reduce((s, d) => s + bulkQty(d), 0);
  const v = items.reduce((s, d) => s + bulkQty(d) * sellPrice(d), 0);
  $('bulk-info').innerHTML = items.length ? `<b>${items.length}종 · ${n}개</b> 선택 · 받을 코인 <b class="gold">🪙 ${v}</b>` : '팔 인형을 눌러서 골라주세요';
  $('bulk-sell').disabled = !items.length;
  $('bulk-sell').textContent = items.length ? `🪙 ${v}코인에 팔기` : '팔기';
  $('bulk-keep').checked = bulk.keep;
}
$('bulk-start').onclick = () => { bulk = { sel: new Set(), keep: true }; renderShelf(); };
$('bulk-cancel').onclick = () => { bulk = null; renderShelf(); };
$('bulk-keep').onchange = e => { bulk.keep = e.target.checked; renderShelf(); };
$('bulk-bar').addEventListener('click', e => {
  const b = e.target.closest('[data-bulk]');
  if (!b || !bulk) return;
  const k = b.dataset.bulk;
  if (k === 'none') bulk.sel.clear();
  else shelfList().filter(d => bulkQty(d) && (k === 'all' || d.grade === k)).forEach(d => bulk.sel.add(d.id));
  renderShelf();
});
$('bulk-sell').onclick = () => {
  if (!bulk || !bulk.sel.size) return;
  const items = [...bulk.sel].map(id => DOLL_BY_ID[id]);
  const n = items.reduce((s, d) => s + bulkQty(d), 0);
  const v = items.reduce((s, d) => s + bulkQty(d) * sellPrice(d), 0);
  const lastOnes = bulk.keep ? 0 : items.filter(d => ownedCount(d.id) === bulkQty(d)).length;
  const top = items.slice().sort(byGrade)[0];
  showModal({
    img: DollArt.url(top), color: '#ffd23f', badge: '🧺 일괄 판매',
    name: `${items.length}종 ${n}개 팔기`, msg: `🪙 ${v}코인을 받아요`,
    desc: lastOnes ? `⚠️ ${lastOnes}종은 마지막 1개까지 팔려서 진열장에서 비게 돼요 (도감 기록은 남아요).` : '종류마다 1개씩은 진열장에 남겨요.',
    buttons: [
      { label: `팔기 (+${v}코인)`, cls: 'gold', fn: () => {
        if (!bulk) return;
        let total = 0, count = 0;
        for (const id of bulk.sel) {
          const d = DOLL_BY_ID[id], q = bulkQty(d), r = save.owned[id];
          if (!q || !r) continue;
          total += q * sellPrice(d); count += q;
          r.count -= q; r.sold = (r.sold || 0) + q;
        }
        save.coins += total;
        bulk = null;
        persist(); renderCoins(); bumpWallet(); renderShelf();
        toast(`🧺 인형 ${count}개를 한 번에 팔아 🪙 ${total}코인을 받았어요`);
      } },
      { label: '취소' },
    ],
  });
};

function openDollDetail(d) {
  const rec = save.owned[d.id];
  if (!rec) {
    const m = MACHINE_BY_ID[d.machine];
    const where = d.special ? `특별 뽑기 때 '${m.name}' 기계에서만 나와요` : `'${m.name}' 기계에서 뽑을 수 있어요${isUnlocked(m) ? '' : ' (잠김)'}`;
    showModal({ ...dollModal(d, where), locked: true, name: '???', desc: '아직 정체를 알 수 없는 인형이에요.' });
    return;
  }
  const p = sellPrice(d), n = rec.count, m = dailyMult(d.id);
  const boost = m ? ` · 🔥 오늘의 인형 x${m.toFixed(1)}` : '';
  const buttons = [];
  if (n > 1) buttons.push({ label: `중복 ${n - 1}개 팔기 (+${(n - 1) * p}코인)`, cls: 'gold', fn: () => { sellDoll(d, n - 1); openDollDetail(d); } });
  if (n > 0) buttons.push({ label: `1개 팔기 (+${p}코인)${n === 1 ? ' · 마지막 1개' : ''}`, cls: n === 1 ? '' : 'gold', fn: () => { sellDoll(d, 1); openDollDetail(d); } });
  buttons.push({ label: '닫기' });
  showModal({
    ...dollModal(d, n ? `보유 ${n}개 · 판매가 개당 🪙${p}${boost} · 처음 뽑은 날 ${fmtTime(rec.first)}` : `지금은 가지고 있지 않아요 (판매함) · 처음 뽑은 날 ${fmtTime(rec.first)}`),
    locked: !n, buttons,
  });
}

function sellDoll(d, n) {
  const rec = save.owned[d.id];
  n = Math.min(n, rec ? rec.count : 0);
  if (n <= 0) return;
  rec.count -= n;
  rec.sold = (rec.sold || 0) + n;
  save.coins += n * sellPrice(d);
  persist(); renderCoins(); bumpWallet();
  if (currentView === 'shelf') renderShelf();
  toast(`${d.name} ${n}개를 팔아 🪙 ${n * sellPrice(d)}코인을 받았어요`);
}

$('sell-dupes').onclick = () => {
  const list = DOLLS.filter(d => ownedCount(d.id) > 1);
  if (!list.length) return;
  const n = list.reduce((s, d) => s + ownedCount(d.id) - 1, 0);
  const v = list.reduce((s, d) => s + (ownedCount(d.id) - 1) * sellPrice(d), 0);
  showModal({
    img: DollArt.url(list[0]), color: '#ffd23f', badge: '중복 인형 판매',
    name: `${n}개 팔기`, msg: `🪙 ${v}코인을 받아요`, desc: '종류마다 1개씩은 진열장에 남겨요.',
    buttons: [
      { label: `모두 팔기 (+${v}코인)`, cls: 'gold', fn: () => {
        const now = DOLLS.filter(d => ownedCount(d.id) > 1);
        const value = now.reduce((s, d) => s + (ownedCount(d.id) - 1) * sellPrice(d), 0);
        now.forEach(d => { const r = save.owned[d.id]; r.sold = (r.sold || 0) + r.count - 1; r.count = 1; });
        save.coins += value; persist(); renderCoins(); bumpWallet(); renderShelf();
        toast(`중복 인형을 팔아 🪙 ${value}코인을 받았어요`);
      } },
      { label: '취소' },
    ],
  });
};

// ================= 팝업 (연속 당첨은 순서대로) =================
// spec = { img, color, badge, name, msg, desc, locked, buttons: [{ label, cls, disabled, fn }] }
const modalQueue = [];
function queueModal(spec) { modalQueue.push(spec); if ($('modal').hidden) nextModal(); }
function nextModal() { const m = modalQueue.shift(); if (m) showModal(m); }
function dollModal(d, msg) {
  return { img: DollArt.url(d), color: GRADES[d.grade].color, badge: `${d.grade} · ${GRADES[d.grade].name}${d.special ? ' · ✨특별' : ''}`, name: d.name, msg, desc: d.desc };
}
// 등급별 당첨 연출: D~B는 바로 터지고, A·S는 실루엣으로 두근두근 모였다가 공개
const HYPE = { S: '★ LEGEND ★', A: 'AMAZING!!', B: 'GREAT!', C: 'NICE!', D: 'GET!' };
function showModal(spec) {
  const card = document.querySelector('.modal-card');
  clearTimeout(showModal.timer);
  card.classList.remove('fx', 'fx-D', 'fx-C', 'fx-B', 'fx-A', 'fx-S', 'charging', 'revealed');
  $('modal-new').hidden = true;
  $('modal-hype').textContent = '';
  const fx = spec.fx;
  if (!fx) { fillModal(spec); $('modal').hidden = false; return; }
  const lv = Celebrate.LV[fx.grade];
  card.classList.add('fx', `fx-${fx.grade}`);
  const reveal = () => {
    if (!card.classList.contains('fx')) return;
    card.classList.remove('charging');
    void card.offsetWidth;
    card.classList.add('revealed');
    fillModal(spec);
    $('modal-hype').textContent = HYPE[fx.grade];
    $('modal-new').hidden = !fx.isNew;
    const r = $('modal-img').getBoundingClientRect();
    Celebrate.burst(fx.grade, r.left + r.width / 2, r.top + r.height / 2, { isNew: fx.isNew, shakeEl: card });
  };
  $('modal').style.setProperty('--g', spec.color);
  if (lv >= 3) {
    card.classList.add('charging');
    $('modal-img').src = spec.img; $('modal-img').style.filter = '';
    $('modal-grade').textContent = '? ? ?';
    $('modal-grade').setAttribute('style', `--g:${spec.color}`);
    $('modal-name').textContent = lv === 4 ? '……!!' : '……!';
    $('modal-msg').textContent = lv === 4 ? '엄청난 기운이 느껴진다…' : '뭔가 반짝인다…';
    $('modal-desc').textContent = '';
    $('modal-actions').innerHTML = '';
    $('modal').hidden = false;
    const r = $('modal-img').getBoundingClientRect();
    Celebrate.charge(fx.grade, r.left + r.width / 2, r.top + r.height / 2);
    showModal.timer = setTimeout(reveal, lv === 4 ? 1400 : 800);
    // 기다리기 싫으면 눌러서 바로 공개
    card.onclick = () => { if (card.classList.contains('charging')) { clearTimeout(showModal.timer); reveal(); } };
  } else {
    $('modal').hidden = false;
    reveal();
  }
}
function fillModal(spec) {
  $('modal').style.setProperty('--g', spec.color);
  $('modal-img').src = spec.img;
  $('modal-img').style.filter = spec.locked ? 'brightness(0) opacity(.45)' : '';
  $('modal-grade').textContent = spec.badge;
  $('modal-grade').setAttribute('style', `--g:${spec.color}`);
  $('modal-name').textContent = spec.name;
  $('modal-msg').textContent = spec.msg;
  $('modal-desc').textContent = spec.desc || '';
  const box = $('modal-actions');
  box.innerHTML = '';
  for (const b of spec.buttons || [{ label: '확인', cls: 'primary' }]) {
    const el = document.createElement('button');
    el.textContent = b.label;
    if (b.cls) el.className = b.cls;
    el.disabled = !!b.disabled;
    el.onclick = () => { $('modal').hidden = true; if (b.fn) b.fn(); if ($('modal').hidden) nextModal(); };
    box.appendChild(el);
  }
}

// ================= 개발자 모드 =================
// 로고 5번 연속 클릭 또는 Ctrl+Shift+D → 암호 입력. 암호는 코드에 해시로만 들어 있음
const DEV_SALT = 'mongle-dev-salt::';
const DEV_HASH = '2225da8df95df42bb591839aacf9ffce145f28d32c159c83805ec10f90467d1b';
let fxDemoStep = 0;
let dev = false, devFails = 0, devLockUntil = 0, logoClicks = [];

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function openDevLogin() {
  if (dev) { $('dev-panel').hidden = false; return; }
  $('dev-msg').textContent = '';
  $('dev-pass').value = '';
  $('dev-login').hidden = false;
  setTimeout(() => $('dev-pass').focus(), 30);
}
document.querySelector('.logo').addEventListener('click', () => {
  const now = Date.now();
  logoClicks = logoClicks.filter(t => now - t < 2500);
  logoClicks.push(now);
  if (logoClicks.length >= 5) { logoClicks = []; openDevLogin(); }
});
const renderSoundBtn = () => { $('sound-btn').textContent = Celebrate.sound.on ? '🔊' : '🔇'; };
$('sound-btn').onclick = () => { Celebrate.sound.toggle(); renderSoundBtn(); toast(Celebrate.sound.on ? '🔊 효과음을 켰어요' : '🔇 효과음을 껐어요'); };
renderSoundBtn();
$('dev-cancel').onclick = () => { $('dev-login').hidden = true; };
$('dev-form').addEventListener('submit', async e => {
  e.preventDefault();
  const now = Date.now();
  if (now < devLockUntil) { $('dev-msg').textContent = `잠시 후 다시 시도하세요 (${Math.ceil((devLockUntil - now) / 1000)}초)`; return; }
  if (!window.crypto || !crypto.subtle) { $('dev-msg').textContent = 'https 또는 localhost에서만 쓸 수 있어요'; return; }
  const ok = (await sha256(DEV_SALT + $('dev-pass').value)) === DEV_HASH;
  $('dev-pass').value = '';
  if (!ok) {
    devFails++;
    if (devFails >= 5) { devFails = 0; devLockUntil = Date.now() + 60e3; $('dev-msg').textContent = '5번 틀려서 1분 동안 잠겼어요'; }
    else $('dev-msg').textContent = `암호가 틀렸어요 (${devFails}/5)`;
    return;
  }
  dev = true; devFails = 0;
  $('dev-login').hidden = true;
  $('dev-panel').hidden = false;
  document.body.classList.add('dev-on');
  renderDevInfo();
  toast('🛠 개발자 모드가 켜졌어요');
});

function renderDevInfo() {
  if (!dev) return;
  const ev = specialEvent();
  const dl = ensureDaily();
  $('dev-info').innerHTML = `
    <div>코인 <b>${save.coins}</b> · 도감 <b>${DOLLS.filter(d => found(d.id)).length}/${DOLLS.length}</b> · 해금 <b>${MACHINES.filter(isUnlocked).length}/${MACHINES.length}</b></div>
    <div>특별 뽑기: ${ev ? `<b>진행 중</b> (${ev.ids.map(id => MACHINE_BY_ID[id].name).join(', ')})` : `다음 ${hhmm(nextSpecialStart())}`}</div>
    <div>오늘의 TOP3: ${dl.picks.map(p => `${DOLL_BY_ID[p.id].grade} x${p.mult.toFixed(1)}`).join(' / ')} · 무료코인 ${dl.free == null ? '안 받음' : `+${dl.free}`}</div>`;
}

const DEV_ACTIONS = {
  coins100: () => addCoins(100),
  coins1000: () => addCoins(1000),
  coins0: () => { save.coins = 0; persist(); renderCoins(); },
  unlockAll: () => { save.unlocked = MACHINES.filter(m => m.unlock).map(m => m.id); persist(); refreshAll(); },
  lockAll: () => { save.unlocked = []; persist(); if (currentMachine && !isUnlocked(currentMachine)) location.hash = '#/'; refreshAll(); },
  specialOn: () => {
    const pool = MACHINES.filter(isUnlocked).map(m => m.id), ids = [];
    while (ids.length < 2 && pool.length) ids.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    const now = Date.now();
    devSpecial = { key: `dev${now}`, start: now, end: now + DUR, ids };
    applySpecial();
  },
  specialOff: () => {
    devSpecial = null;
    const ev = specialEvent();
    if (ev) devSpecial = { key: `off${Date.now()}`, start: 0, end: ev.end, ids: [] };
    applySpecial();
  },
  dailyReroll: () => { const free = ensureDaily().free; save.daily = makeDaily(dayKey(), 1 + Math.floor(Math.random() * 2e9)); save.daily.free = free; persist(); refreshAll(); },
  freeReset: () => { ensureDaily().free = null; persist(); refreshAll(); },
  allDolls: () => {
    const now = Date.now();
    for (const d of DOLLS) { const r = save.owned[d.id] || { count: 0, first: now, last: now }; r.count = Math.max(1, r.count); save.owned[d.id] = r; }
    persist(); renderNavCount(); refreshAll();
  },
  // 당첨 연출 미리보기 (인형은 주지 않음): 누를 때마다 D → C → B → A → S
  fxDemo: () => {
    const g = GRADE_ORDER[4 - (fxDemoStep++ % 5)];
    const d = BASE_DOLLS.find(x => x.grade === g);
    showModal({ ...dollModal(d, '개발자 모드 연출 미리보기 (인형은 지급되지 않아요)'), fx: { grade: g, isNew: true } });
  },
  resetSave: () => showModal({
    img: DollArt.url(DOLLS[0]), color: '#ff5c74', badge: '🛠 개발자 모드', name: '저장 데이터 초기화',
    msg: '코인·인형·해금이 모두 처음 상태로 돌아가요', desc: '되돌릴 수 없어요.',
    buttons: [
      { label: '초기화하기', cls: 'primary', fn: () => { try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(OLD_KEY); } catch (e) {} location.hash = '#/'; location.reload(); } },
      { label: '취소' },
    ],
  }),
};
function refreshAll() {
  renderCoins(); renderNavCount();
  if (currentView === 'store') renderStore();
  if (currentView === 'shelf') renderShelf();
  if (currentMachine) renderLineup();
  renderDevInfo();
}
$('dev-panel').addEventListener('click', e => {
  const b = e.target.closest('[data-dev]');
  if (b && dev && DEV_ACTIONS[b.dataset.dev]) { DEV_ACTIONS[b.dataset.dev](); renderDevInfo(); }
});
$('dev-close').onclick = () => {
  dev = false;
  $('dev-panel').hidden = true;
  document.body.classList.remove('dev-on');
  toast('개발자 모드를 껐어요');
};

// ================= 화면 전환 =================
// #/ 매장 · #/play/<기계id> · #/shelf 진열장
function route() {
  const [, page, arg] = location.hash.replace(/^#/, '').split('/');
  let m = page === 'play' ? MACHINE_BY_ID[arg] : null;
  if (m && !isUnlocked(m)) { const lockedM = m; location.replace('#/'); setTimeout(() => askUnlock(lockedM), 0); m = null; }
  if (m) currentView = 'play-' + m.type;
  else if (page === 'shelf') currentView = 'shelf';
  else currentView = 'store';

  document.querySelectorAll('.view').forEach(v => { v.hidden = v.dataset.view !== currentView; });
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === currentView));

  // 보이는 기계만 돌리기
  ClawGame.stop();
  Object.values(GAMES).forEach(g => g.stop());
  if (m) {
    openMachine(m);
    (m.type === 'claw' ? ClawGame : GAMES[m.type]).start();
  } else currentMachine = null;
  if (currentView === 'store') renderStore();
  if (currentView === 'shelf') renderShelf();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

MACHINES.forEach(m => { stockKey[m.id] = 'n'; });   // 처음엔 모든 기계가 평소 인형으로 채워져 있음
applySpecial();   // 특별 뽑기 상태를 먼저 정한 뒤 미리보기 그리기
MACHINES.forEach(m => { previewCache[m.id] = makePreview(m); });
buildLights();
renderGradeLegend();
renderNavCount();
renderCoins();
route();
setInterval(applySpecial, 1000);
if (tampered) setTimeout(() => toast('⚠️ 저장 데이터가 변조된 것 같아 처음 상태로 초기화했어요'), 300);
})();
