// 매장 / 뽑기 / 진열장 화면과 저장 데이터
const SAVE_KEY = 'mongle-claw-save-v2';
const $ = id => document.getElementById(id);

// save = { coins, owned: { dollId: { count, first, last } }, history: [{ id, t }] }
const save = (() => {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) {}
  return Object.assign({ coins: 10, owned: {}, history: [], best: {} }, data || {});
})();
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

const ownedCount = id => (save.owned[id] ? save.owned[id].count : 0);
const gradeStyle = g => `--g:${GRADES[g].color}`;
const stars = n => '★'.repeat(n) + '☆'.repeat(4 - n);
const LEVEL_NAME = ['', '쉬움', '보통', '어려움', '매우 어려움'];
const levelLabel = m => m.levelText || `난이도 ${LEVEL_NAME[m.level]}`;
const fmtTime = t => new Date(t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// ================= 공통 =================
function renderCoins() {
  $('coin-count').textContent = save.coins;
  $('btn-coin').disabled = save.coins <= 0 || ClawGame.state !== 'idle';
  if (currentMachine && currentMachine.type !== 'claw') GAMES[currentMachine.type].refresh();
}
function bumpWallet() {
  const w = document.querySelector('.wallet');
  w.classList.remove('bump'); void w.offsetWidth; w.classList.add('bump');
}
function renderNavCount() {
  $('nav-count').textContent = DOLLS.filter(d => ownedCount(d.id)).length;
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
  $('machine-row').innerHTML = MACHINES.map(m => {
    const pool = dollsOf(m.id);
    const got = pool.filter(d => ownedCount(d.id)).length;
    const grades = [...new Set(pool.map(d => d.grade))].sort((a, b) => GRADE_ORDER.indexOf(a) - GRADE_ORDER.indexOf(b));
    return `
    <a class="mcab" href="#/play/${m.id}" style="--cab:${m.theme.cab};--cab2:${m.theme.cab2}">
      <div class="mcab-top">${m.name}</div>
      <div class="mcab-body">
        <div class="mcab-glass"><img src="${previewCache[m.id]}" alt="${m.name} 기계"></div>
        <div class="mcab-panel"><span class="stars">${stars(m.level)}</span><span>${levelLabel(m)}</span></div>
      </div>
      <div class="mcab-base"><span class="chute-door">PUSH ▼</span><span class="coin-slot"></span></div>
      <div class="mcab-info">${m.desc}<br><b>수집 ${got} / ${pool.length}</b> · 등급 ${grades.join(' ')}</div>
    </a>`;
  }).join('');

  const owned = DOLLS.filter(d => ownedCount(d.id)).slice(-5);
  $('door-preview').innerHTML = owned.length
    ? owned.map(d => `<img src="${DollArt.url(d)}" alt="${d.name}">`).join('')
    : '아직 비어 있어요';
}

function renderGradeLegend() {
  const hint = { S: '거의 안 나오고, 집어도 잘 빠짐', A: '드물고 잘 미끄러짐', B: '꽤 까다로움', C: '조금만 집중하면 OK', D: '자주 나오고 잘 잡힘' };
  $('grade-legend').innerHTML = GRADE_ORDER.map(g => `
    <li><span class="grade-badge" style="${gradeStyle(g)}">${g}</span><span>${GRADES[g].name}</span><span>${hint[g]}</span></li>`).join('');
}

function buildLights() {
  const cols = ['#ff5fa2', '#ffd23f', '#4de8ff', '#8bd17c', '#c77dff'];
  $('machine-row').closest('.store').querySelector('.lights').innerHTML =
    Array.from({ length: 24 }, (_, i) => `<i style="--c:${cols[i % cols.length]};--d:${(i % 5) * 0.3}s"></i>`).join('');
}

$('coin-changer').onclick = () => {
  save.coins += 10; persist(); renderCoins(); bumpWallet();
};

// ================= 뽑기 기계 =================
let currentMachine = null;

function openMachine(m) {
  currentMachine = m;
  const sec = playSection(m);
  sec.style.setProperty('--cab', m.theme.cab);
  sec.style.setProperty('--cab2', m.theme.cab2);
  sec.querySelector('.marquee').innerHTML = m.type === 'claw'
    ? `${m.name}<small>${stars(m.level)} 난이도 ${LEVEL_NAME[m.level]} · 집게 힘 ${Math.round(m.power * 100)}%</small>`
    : `${m.name}<small>${stars(m.level)} ${m.levelText}</small>`;
  if (m.type === 'claw') ClawGame.setMachine(m); else GAMES[m.type].open(m);
  renderLineup();
  renderCoins();
}

function renderLineup() {
  const m = currentMachine;
  if (!m) return;
  const odds = dollOdds(m.id);
  const pool = dollsOf(m.id).sort((a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade));
  const got = pool.filter(d => ownedCount(d.id)).length;
  const sec = playSection(m);
  sec.querySelector('.lineup-meta').textContent = `수집 ${got} / ${pool.length}`;
  sec.querySelector('.lineup').innerHTML = pool.map(d => {
    const n = ownedCount(d.id);
    return `<li class="${n ? '' : 'locked'}" style="${gradeStyle(d.grade)}">
      <img src="${DollArt.url(d)}" alt="">
      <div>
        <div class="nm">${n ? d.name : '???'} <span class="grade-badge" style="${gradeStyle(d.grade)}">${d.grade}</span></div>
        <div class="sub">${GRADES[d.grade].name} · ${m.rules ? m.rules[d.grade] : `출현 ${odds[d.id].toFixed(1)}%`}</div>
      </div>
      <span class="own">${n ? 'x' + n : ''}</span>
    </li>`;
  }).join('');
}

const STATUS = {
  idle: () => (save.coins > 0 ? '코인을 넣어주세요' : '코인이 없어요! 매장의 교환기로'),
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
  const head = first ? '🎉 새로운 인형 획득! 진열장에 전시됐어요' : '🎉 인형 획득!';
  queueModal(doll, note ? `${note} · ${head}` : head);
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
  coins: () => save.coins,
  spendCoin() {
    if (save.coins <= 0) return false;
    save.coins--; persist(); renderCoins(); bumpWallet();
    return true;
  },
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
};
CapsuleGame.init({ canvas: $('capsule-canvas'), btn: $('capsule-btn'), status: $('capsule-status'), extra: $('capsule-extra') }, gameHooks);
PunchGame.init({ canvas: $('punch-canvas'), btn: $('punch-btn'), status: $('punch-status'), extra: $('punch-extra') }, gameHooks);
TimerGame.init({ screen: $('timer-screen'), digits: $('timer-digits'), sub: $('timer-sub'), btn: $('timer-btn'), status: $('timer-status'), extra: $('timer-extra') }, gameHooks);
for (const type of ['keyring', 'keymaster', 'scissors', 'stacker']) {
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
  const uniq = DOLLS.filter(d => ownedCount(d.id)).length;
  const total = DOLLS.reduce((s, d) => s + ownedCount(d.id), 0);
  const sCount = DOLLS.filter(d => d.grade === 'S' && ownedCount(d.id)).length;
  $('shelf-stats').innerHTML = `
    <div class="stat"><b>${uniq} / ${DOLLS.length}</b>도감 수집</div>
    <div class="stat"><b>${total}</b>뽑은 인형 수</div>
    <div class="stat"><b>${sCount} / ${DOLLS.filter(d => d.grade === 'S').length}</b>전설 등급</div>`;

  const tabs = [{ id: 'all', name: '전체' }, ...MACHINES];
  $('shelf-tabs').innerHTML = tabs.map(t => `<button data-tab="${t.id}" class="${t.id === shelfTab ? 'on' : ''}">${t.name}</button>`).join('');

  const list = DOLLS.filter(d => shelfTab === 'all' || d.machine === shelfTab);
  const recent = new Set(save.history.slice(0, 3).map(h => h.id));
  $('shelf-body').innerHTML = GRADE_ORDER.map(g => {
    const row = list.filter(d => d.grade === g);
    if (!row.length) return '';
    const got = row.filter(d => ownedCount(d.id)).length;
    return `<div class="grade-row">
      <h3><span class="grade-badge" style="${gradeStyle(g)}">${g}</span>${GRADES[g].name} <small>${got} / ${row.length}</small></h3>
      <div class="plank">${row.map(d => {
        const n = ownedCount(d.id);
        return `<button class="doll-card ${n ? '' : 'locked'} ${n && recent.has(d.id) ? 'new' : ''}" data-doll="${d.id}" title="${n ? d.name : '아직 못 뽑은 인형'}">
          ${n > 1 ? `<span class="cnt">x${n}</span>` : ''}
          <img src="${DollArt.url(d)}" alt="${n ? d.name : '미획득'}">
          <span class="nm">${n ? d.name : '???'}</span>
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
  const d = DOLL_BY_ID[b.dataset.doll], rec = save.owned[d.id];
  if (rec) showModal(d, `보유 ${rec.count}개 · 처음 뽑은 날 ${fmtTime(rec.first)}`);
  else showModal(d, `'${MACHINE_BY_ID[d.machine].name}' 기계에서 뽑을 수 있어요`, true);
});

// ================= 팝업 (연속 당첨은 순서대로) =================
const modalQueue = [];
function queueModal(doll, msg) { modalQueue.push([doll, msg]); if ($('modal').hidden) nextModal(); }
function nextModal() { const m = modalQueue.shift(); if (m) showModal(...m); }
function showModal(d, msg, locked) {
  $('modal').style.setProperty('--g', GRADES[d.grade].color);
  $('modal-img').src = DollArt.url(d);
  $('modal-img').style.filter = locked ? 'brightness(0) opacity(.45)' : '';
  $('modal-grade').textContent = `${d.grade} · ${GRADES[d.grade].name}`;
  $('modal-grade').setAttribute('style', gradeStyle(d.grade));
  $('modal-name').textContent = locked ? '???' : d.name;
  $('modal-msg').textContent = msg;
  $('modal-desc').textContent = locked ? '아직 정체를 알 수 없는 인형이에요.' : d.desc;
  $('modal').hidden = false;
}
$('modal-ok').onclick = () => { $('modal').hidden = true; nextModal(); };

// ================= 화면 전환 =================
// #/ 매장 · #/play/<기계id> · #/shelf 진열장
let currentView = 'store';
const previewCache = {};
function route() {
  const [, page, arg] = location.hash.replace(/^#/, '').split('/');
  const m = page === 'play' ? MACHINE_BY_ID[arg] : null;
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
