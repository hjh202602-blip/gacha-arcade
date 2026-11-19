// 매장 / 뽑기 / 진열장 화면과 저장 데이터
const SAVE_KEY = 'mongle-claw-save-v2';
const $ = id => document.getElementById(id);

// save = { coins, owned: { dollId: { count, first, last, sold } }, history, best, unlocked: [기계id] }
// owned에 기록이 있으면 '발견한 인형'(도감 등록), count는 지금 가지고 있는 개수 (팔면 0이 될 수 있음)
const save = (() => {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) {}
  return Object.assign({ coins: 10, owned: {}, history: [], best: {}, unlocked: [] }, data || {});
})();
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

const ownedCount = id => (save.owned[id] ? save.owned[id].count : 0);
const found = id => !!save.owned[id];
const isUnlocked = m => !m.unlock || save.unlocked.includes(m.id);
const priceOf = m => m.price || 1;
const sellPrice = d => GRADES[d.grade].sell;

function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 2200);
}
function addCoins(n) {
  save.coins += n; persist(); renderCoins(); bumpWallet();
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
function renderCoins() {
  $('coin-count').textContent = save.coins;
  $('btn-coin').disabled = save.coins < 1 || ClawGame.state !== 'idle';
  if (currentMachine && currentMachine.type !== 'claw') GAMES[currentMachine.type].refresh();
}
function bumpWallet() {
  const w = document.querySelector('.wallet');
  w.classList.remove('bump'); void w.offsetWidth; w.classList.add('bump');
}
function renderNavCount() {
  $('nav-count').textContent = DOLLS.filter(d => found(d.id)).length;
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
  spots.forEach(([px, py], i) => DollArt.drawAt(x, pool[i % pool.length], px, py, 20, ((i * 37) % 7 - 3) * 0.06));
  return c.toDataURL();
}

function renderStore() {
  const order = [...MACHINES].sort((a, b) => (a.unlock || 0) - (b.unlock || 0));
  $('machine-row').innerHTML = order.map(m => {
    const pool = dollsOf(m.id);
    const got = pool.filter(d => found(d.id)).length;
    const open = isUnlocked(m);
    const grades = [...new Set(pool.map(d => d.grade))].sort((a, b) => GRADE_ORDER.indexOf(a) - GRADE_ORDER.indexOf(b));
    return `
    <a class="mcab ${open ? '' : 'locked'}" href="#/play/${m.id}" data-machine="${m.id}" style="--cab:${m.theme.cab};--cab2:${m.theme.cab2}">
      <span class="price-tag">1회 ${priceOf(m)}코인</span>
      <div class="mcab-top">${m.name}</div>
      <div class="mcab-body">
        <div class="mcab-glass"><img src="${previewCache[m.id]}" alt="${m.name} 기계"></div>
        <div class="mcab-panel"><span class="stars">${stars(m.level)}</span><span>${levelLabel(m)}</span></div>
      </div>
      <div class="mcab-base"><span class="chute-door">PUSH ▼</span><span class="coin-slot"></span></div>
      <div class="mcab-info">${m.desc}<br><b>수집 ${got} / ${pool.length}</b> · 등급 ${grades.join(' ')}</div>
      ${open ? '' : `<div class="lock ${save.coins >= m.unlock ? 'can' : ''}"><b>🔒</b><span>🪙 ${m.unlock}코인으로 해금</span></div>`}
    </a>`;
  }).join('');

  const owned = DOLLS.filter(d => ownedCount(d.id) > 0).slice(-5);
  $('door-preview').innerHTML = owned.length
    ? owned.map(d => `<img src="${DollArt.url(d)}" alt="${d.name}">`).join('')
    : '아직 비어 있어요';
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

// ================= 뽑기 기계 =================
let currentMachine = null;

function openMachine(m) {
  currentMachine = m;
  const sec = playSection(m);
  sec.style.setProperty('--cab', m.theme.cab);
  sec.style.setProperty('--cab2', m.theme.cab2);
  sec.querySelector('.marquee').innerHTML = m.type === 'claw'
    ? `${m.name}<small>${stars(m.level)} 난이도 ${LEVEL_NAME[m.level]} · 집게 힘 ${Math.round(m.power * 100)}%</small>`
    : `${m.name}<small>${stars(m.level)} ${m.levelText} · 1회 ${priceOf(m)}코인</small>`;
  if (m.type === 'claw') {
    if (ClawGame.setMachine(m)) refund(1, '다른 기계로 옮겨서 진행 중이던 판이 취소됐어요');
  } else GAMES[m.type].open(m);
  renderLineup();
  renderCoins();
}

function renderLineup() {
  const m = currentMachine;
  if (!m) return;
  const odds = dollOdds(m.id);
  const pool = dollsOf(m.id).sort((a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade));
  const got = pool.filter(d => found(d.id)).length;
  const sec = playSection(m);
  sec.querySelector('.lineup-meta').textContent = `수집 ${got} / ${pool.length}`;
  sec.querySelector('.lineup').innerHTML = pool.map(d => {
    const n = ownedCount(d.id), f = found(d.id);
    return `<li class="${f ? '' : 'locked'}" style="${gradeStyle(d.grade)}">
      <img src="${DollArt.url(d)}" alt="">
      <div>
        <div class="nm">${f ? d.name : '???'} <span class="grade-badge" style="${gradeStyle(d.grade)}">${d.grade}</span></div>
        <div class="sub">${GRADES[d.grade].name} · ${m.rules ? m.rules[d.grade] : `출현 ${odds[d.id].toFixed(1)}%`}</div>
      </div>
      <span class="own">${n ? 'x' + n : ''}</span>
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

// 어느 기계에서든 인형을 받으면 여기로
function award(doll, note) {
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
  const head = first ? '🎉 새로운 인형 획득! 진열장에 전시됐어요' : `🎉 인형 획득! (보유 ${rec.count}개)`;
  queueModal(dollModal(doll, note ? `${note} · ${head}` : head));
}

ClawGame.init($('claw-canvas'), {
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

// 캡슐 / 펀치 / 10초 기계
const gameHooks = {
  // 지금 기계를 몇 번 할 수 있는지 (기계마다 1회 가격이 다름)
  coins: () => Math.floor(save.coins / priceOf(currentMachine || MACHINES[0])),
  spendCoin() {
    const p = priceOf(currentMachine || MACHINES[0]);
    if (save.coins < p) { toast(`코인이 부족해요 (1회 ${p}코인)`); return false; }
    save.coins -= p; persist(); renderCoins(); bumpWallet();
    return true;
  },
  addCoins,
  refund,
  award,
  // 최고 기록: 값을 주면 갱신 후 반환, 없으면 조회만 (lower=true면 낮을수록 좋음)
  best(key, val, lower) {
    if (val !== undefined) {
      const cur = save.best[key];
      if (cur === undefined || (lower ? val < cur : val > cur)) { save.best[key] = val; persist(); }
    }
    return save.best[key];
  },
};
const GAMES = {
  capsule: CapsuleGame, punch: PunchGame, timer: TimerGame,
  keyring: KeyringGame, keymaster: KeymasterGame, scissors: ScissorsGame, stacker: StackerGame,
  pusher: PusherGame,
};
CapsuleGame.init({ canvas: $('capsule-canvas'), btn: $('capsule-btn'), status: $('capsule-status'), extra: $('capsule-extra') }, gameHooks);
PunchGame.init({ canvas: $('punch-canvas'), btn: $('punch-btn'), status: $('punch-status'), extra: $('punch-extra') }, gameHooks);
TimerGame.init({ screen: $('timer-screen'), digits: $('timer-digits'), sub: $('timer-sub'), btn: $('timer-btn'), status: $('timer-status'), extra: $('timer-extra') }, gameHooks);
for (const type of ['keyring', 'keymaster', 'scissors', 'stacker', 'pusher']) {
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
  if (save.coins <= 0 || ClawGame.state !== 'idle') return;
  if (ClawGame.insertCoin()) {
    save.coins--; persist(); renderCoins(); bumpWallet();
  }
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
  if (!currentView.startsWith('play') || !$('modal').hidden) return;
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

  const tabs = [{ id: 'all', name: '전체' }, ...MACHINES];
  $('shelf-tabs').innerHTML = tabs.map(t => `<button data-tab="${t.id}" class="${t.id === shelfTab ? 'on' : ''}">${t.name}</button>`).join('');

  const list = DOLLS.filter(d => shelfTab === 'all' || d.machine === shelfTab);
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
        return `<button class="doll-card ${cls} ${n && recent.has(d.id) ? 'new' : ''}" data-doll="${d.id}" title="${f ? d.name : '아직 못 뽑은 인형'}">
          ${n > 1 ? `<span class="cnt">x${n}</span>` : ''}
          <img src="${DollArt.url(d)}" alt="${f ? d.name : '미획득'}">
          <span class="nm">${f ? d.name : '???'}</span>
          <span class="mc">${MACHINE_BY_ID[d.machine].name}</span>
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
  openDollDetail(DOLL_BY_ID[b.dataset.doll]);
});

function openDollDetail(d) {
  const rec = save.owned[d.id];
  if (!rec) {
    const m = MACHINE_BY_ID[d.machine];
    showModal({ ...dollModal(d, `'${m.name}' 기계에서 뽑을 수 있어요${isUnlocked(m) ? '' : ' (잠김)'}`), locked: true, name: '???', desc: '아직 정체를 알 수 없는 인형이에요.' });
    return;
  }
  const p = sellPrice(d), n = rec.count;
  const buttons = [];
  if (n > 1) buttons.push({ label: `중복 ${n - 1}개 팔기 (+${(n - 1) * p}코인)`, cls: 'gold', fn: () => { sellDoll(d, n - 1); openDollDetail(d); } });
  if (n > 0) buttons.push({ label: `1개 팔기 (+${p}코인)${n === 1 ? ' · 마지막 1개' : ''}`, cls: n === 1 ? '' : 'gold', fn: () => { sellDoll(d, 1); openDollDetail(d); } });
  buttons.push({ label: '닫기' });
  showModal({
    ...dollModal(d, n ? `보유 ${n}개 · 판매가 개당 🪙${p} · 처음 뽑은 날 ${fmtTime(rec.first)}` : `지금은 가지고 있지 않아요 (판매함) · 처음 뽑은 날 ${fmtTime(rec.first)}`),
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
  const n = list.reduce((s, d) => s + ownedCount(d.id) - 1, 0);
  const v = list.reduce((s, d) => s + (ownedCount(d.id) - 1) * sellPrice(d), 0);
  showModal({
    img: DollArt.url(list[0]), color: '#ffd23f', badge: '중복 인형 판매',
    name: `${n}개 팔기`, msg: `🪙 ${v}코인을 받아요`, desc: '종류마다 1개씩은 진열장에 남겨요.',
    buttons: [
      { label: `모두 팔기 (+${v}코인)`, cls: 'gold', fn: () => {
        list.forEach(d => { const r = save.owned[d.id]; r.sold = (r.sold || 0) + r.count - 1; r.count = 1; });
        save.coins += v; persist(); renderCoins(); bumpWallet(); renderShelf();
        toast(`중복 인형 ${n}개를 팔아 🪙 ${v}코인을 받았어요`);
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
  return { img: DollArt.url(d), color: GRADES[d.grade].color, badge: `${d.grade} · ${GRADES[d.grade].name}`, name: d.name, msg, desc: d.desc };
}
function showModal(spec) {
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
  $('modal').hidden = false;
}

// ================= 화면 전환 =================
// #/ 매장 · #/play/<기계id> · #/shelf 진열장
let currentView = 'store';
const previewCache = {};
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

MACHINES.forEach(m => { previewCache[m.id] = m.type === 'claw' ? machinePreview(m) : GAMES[m.type].preview(m); });
buildLights();
renderGradeLegend();
renderNavCount();
renderCoins();
route();
