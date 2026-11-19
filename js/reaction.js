// 번개 반응: 코인 → START → 빨간불 … 초록불이 켜지는 순간 탭! 반응 시간(ms)으로 등급
// gimmick 'fake': 기다리는 동안 노란 가짜 번쩍임이 나옴 (이때 누르면 실패)
const ReactionGame = (() => {
  const W = 420, H = 600;
  const TIERS = [['S', 190], ['A', 230], ['B', 280], ['C', 340], ['D', 450]];
  const LAMP = { x: 210, y: 270, r: 118 };

  let canvas, ctx, els, hooks, machine, loop;
  let state = 'idle', t = 0, time = 0, goAt = 0, goTime = 0, fakes = [], ms = 0, grade = null, why = '';

  const fakeOn = () => state === 'wait' && fakes.some(f => t >= f && t < f + 0.3);
  const bestKey = () => (machine ? machine.id : 'flash');

  function begin() {
    state = 'wait'; t = 0;
    goAt = 1.6 + Math.random() * 2.8;
    fakes = [];
    if (machine.gimmick === 'fake') {
      const n = Math.floor(Math.random() * 3);   // 0~2번
      for (let i = 0; i < n; i++) fakes.push(0.5 + Math.random() * Math.max(0.2, goAt - 0.9));
    }
    setUI();
  }

  function finish(result) {
    ms = result; state = 'result'; t = 0;
    const tier = result != null ? TIERS.find(([, lim]) => result <= lim) : null;
    grade = tier ? tier[0] : null;
    if (result != null) {
      const best = hooks.best(bestKey(), result, true);
      els.extra.textContent = `최고 기록 ${best}ms`;
    }
    if (grade) {
      const doll = pickOfGrade(machine.id, grade);
      setTimeout(() => hooks.award(doll, `반응 ${result}ms! ${grade}등급`), 500);
    }
    setUI();
  }

  function update(dt) {
    time += dt; t += dt;
    if (state === 'wait' && t >= goAt) { state = 'go'; goTime = performance.now(); setUI(); }
    else if (state === 'go' && performance.now() - goTime > 1000) { why = 'late'; finish(null); }
    else if ((state === 'result' || state === 'early') && t > 1.6) { state = 'idle'; setUI(); }
  }

  function press() {
    if (state === 'idle') { if (hooks.spendCoin()) { state = 'ready'; why = ''; setUI(); } }
    else if (state === 'ready') begin();
    else if (state === 'wait') { why = fakeOn() ? 'fake' : 'early'; state = 'early'; t = 0; setUI(); }
    else if (state === 'go') { why = ''; finish(Math.round(performance.now() - goTime)); }
  }

  function drawScene(c, m, live) {
    Kit.bg(c, m);
    const th = m.theme;
    // 신호등 기둥
    c.fillStyle = th.cab2; Kit.rr(c, 60, 40, 300, 460, 40); c.fill();
    c.fillStyle = th.cab; Kit.rr(c, 72, 52, 276, 436, 32); c.fill();
    c.fillStyle = '#111'; c.font = '900 22px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('⚡ REACTION ⚡', 210, 86);

    const st = live ? state : 'go';
    const fake = live && fakeOn();
    let col = '#3a3a48', label = 'START', sub = '';
    if (st === 'ready') { col = '#4a4a5c'; label = 'READY'; sub = '누르면 시작'; }
    if (st === 'wait') { col = fake ? '#ffd60a' : '#e8304a'; label = fake ? '?!' : '기다려…'; sub = fake ? '속지 마!' : ''; }
    if (st === 'go') { col = '#3ddc84'; label = '지금!'; }
    if (st === 'result') { col = grade ? GRADES[grade].color : '#6b6b80'; label = ms != null ? `${ms}ms` : '느려요!'; sub = grade ? `${grade}등급!` : '0.45초 안에 눌러야 해요'; }
    if (st === 'early') { col = '#6b6b80'; label = why === 'fake' ? '페이크!' : '부정출발!'; sub = why === 'fake' ? '노란불에 속았어요' : '초록불이 켜진 뒤에 눌러요'; }

    c.fillStyle = '#0b0b12'; c.beginPath(); c.arc(LAMP.x, LAMP.y, LAMP.r + 14, 0, 6.28); c.fill();
    const g = c.createRadialGradient(LAMP.x - 30, LAMP.y - 36, 10, LAMP.x, LAMP.y, LAMP.r);
    g.addColorStop(0, '#ffffffcc'); g.addColorStop(0.25, col); g.addColorStop(1, col);
    c.save();
    if (st === 'go' || st === 'wait' || fake) { c.shadowColor = col; c.shadowBlur = 40; }
    c.fillStyle = g; c.beginPath(); c.arc(LAMP.x, LAMP.y, LAMP.r, 0, 6.28); c.fill();
    c.restore();
    c.fillStyle = '#fff'; c.font = `900 ${label.length > 5 ? 40 : 52}px sans-serif`;
    c.fillText(label, LAMP.x, LAMP.y - (sub ? 10 : 0));
    if (sub) { c.font = 'bold 18px sans-serif'; c.fillText(sub, LAMP.x, LAMP.y + 36); }

    // 등급표
    c.font = 'bold 13px sans-serif';
    TIERS.forEach(([gr, lim], i) => {
      const x = 98 + i * 56;
      c.fillStyle = GRADES[gr].color; Kit.rr(c, x - 24, 418, 48, 44, 10); c.fill();
      c.fillStyle = '#1a0f2c'; c.font = '900 15px sans-serif'; c.fillText(gr, x, 432);
      c.font = 'bold 11px sans-serif'; c.fillText(`${lim}ms`, x, 450);
    });
    // 아래 패널
    c.fillStyle = th.cab2; Kit.rr(c, 20, 512, 380, 76, 20); c.fill();
    c.fillStyle = 'rgba(255,255,255,.8)'; c.font = 'bold 14px sans-serif';
    c.fillText(m.gimmick === 'fake' ? '노란 번쩍임은 가짜! 초록불에만 탭' : '초록불이 켜지면 탭', 210, 550);
  }
  function draw() { drawScene(ctx, machine, true); }

  function setUI() {
    const map = {
      idle: ['🪙 코인 넣기', Kit.idleMsg(hooks)],
      ready: ['START', 'START를 누르고 초록불을 기다려요'],
      wait: ['탭!', '아직… 아직… (초록불에 탭)'],
      go: ['탭!', '지금!!'],
      result: ['...', grade ? `${ms}ms! ${grade}등급 인형 획득` : ms != null ? `${ms}ms… 아쉬워요` : '너무 늦었어요'],
      early: ['...', why === 'fake' ? '가짜 번쩍임에 속았어요!' : '너무 빨리 눌렀어요!'],
    };
    const [label, msg] = map[state];
    els.btn.textContent = label;
    els.btn.disabled = !(state === 'ready' || state === 'wait' || state === 'go' || (state === 'idle' && hooks.coins() > 0));
    els.btn.classList.toggle('stop', state === 'wait' || state === 'go');
    els.status.textContent = msg;
  }

  return {
    init(e, h) {
      els = e; hooks = h; canvas = e.canvas; ctx = Kit.setup(canvas);
      machine = MACHINES.find(m => m.type === 'reaction');
      loop = Kit.loop(update, draw);
      canvas.addEventListener('pointerdown', e2 => { e2.preventDefault(); if (state !== 'idle') press(); });
    },
    open(m) {
      if (machine !== m && state === 'ready') hooks.refund(machine.price || 1, '다른 기계로 옮겨서 넣어둔 코인을 돌려받았어요');
      if (machine !== m) state = 'idle';
      machine = m;
      const b = hooks.best(bestKey());
      els.extra.textContent = b !== undefined ? `최고 기록 ${b}ms` : '';
      setUI(); draw();
    },
    start() { loop.start(); },
    // 기다리는 중에 화면을 나가면 취소하고 코인을 돌려줌
    stop() {
      loop.stop();
      if (state === 'wait' || state === 'go') { state = 'idle'; hooks.refund(machine.price || 1, '화면을 나가서 반응 도전이 취소됐어요'); }
    },
    press, release() {}, action: press,
    get state() { return state; },
    refresh() { if (els) setUI(); },
    preview: m => Kit.preview(m, drawScene),
  };
})();
