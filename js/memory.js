// 따라해 멜로디: 4개 버튼이 빛나는 순서를 기억해서 똑같이 누르기. 성공할 때마다 하나씩 길어지고 빨라짐
const MemoryGame = (() => {
  const W = 420, H = 600, MAX = 15;
  const TIERS = [['S', 12], ['A', 9], ['B', 7], ['C', 5], ['D', 3]];
  const PADS = [
    { x: 54, y: 150, col: '#ff6fae', dim: '#6a2a48' },
    { x: 216, y: 150, col: '#ffd23f', dim: '#6a5512' },
    { x: 54, y: 312, col: '#5ee6ff', dim: '#1d5866' },
    { x: 216, y: 312, col: '#7ee081', dim: '#2b5c2d' },
  ];
  const PAD = 150;

  let canvas, ctx, els, hooks, machine, loop;
  let state = 'idle', t = 0, seq = [], step = 0, lit = -1, litT = 0, cleared = 0, grade = null, wrong = -1;
  let showTaps = 0, secretDone = false;   // 숨겨진 행동: 보여주는 중에 버튼 다섯 번 누르기

  const bestKey = () => (machine ? machine.id : 'melody');
  const stepTime = () => Math.max(0.28, 0.62 - seq.length * 0.025);

  function nextRound() {
    seq.push(Math.floor(Math.random() * 4));
    state = 'show'; step = 0; t = -0.5; lit = -1;
    setUI();
  }
  function flash(i, dur) { lit = i; litT = dur; Celebrate.sound.note(i); }

  function finish() {
    state = 'end'; t = 0;
    const tier = TIERS.find(([, n]) => cleared >= n);
    grade = tier ? tier[0] : null;
    const best = hooks.best(bestKey(), cleared);
    els.extra.textContent = `최고 ${best}단계`;
    if (grade) {
      const doll = pickOfGrade(machine.id, grade);
      setTimeout(() => hooks.award(doll, `${cleared}단계 기억 성공! ${grade}등급`), 600);
    }
    setUI();
  }

  function update(dt) {
    t += dt;
    if (litT > 0) { litT -= dt; if (litT <= 0) lit = -1; }
    if (state === 'show') {
      const st = stepTime();
      if (t >= 0 && step < seq.length && t >= step * (st + 0.14)) { flash(seq[step], st); step++; }
      if (step >= seq.length && t >= seq.length * (st + 0.14)) { state = 'input'; step = 0; t = 0; setUI(); }
    } else if (state === 'good' && t > 0.6) {
      if (cleared >= MAX) finish(); else nextRound();
    } else if (state === 'end' && t > 2) { state = 'idle'; seq = []; setUI(); }
  }

  function tap(i) {
    if (state === 'show') {
      lit = i; litT = 0.12;
      if (!secretDone && ++showTaps >= 5) { secretDone = true; hooks.secret(); }
      return;
    }
    if (state !== 'input') return;
    flash(i, 0.22);
    if (seq[step] !== i) { wrong = i; finish(); return; }
    step++;
    if (step >= seq.length) { cleared = seq.length; state = 'good'; t = 0; setUI(); }
    else setUI();
  }

  function onPointer(e) {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
    const i = PADS.findIndex(p => x >= p.x && x <= p.x + PAD && y >= p.y && y <= p.y + PAD);
    if (i >= 0) tap(i);
  }

  function drawScene(c, m, live) {
    Kit.bg(c, m);
    const th = m.theme;
    c.fillStyle = th.cab2; Kit.rr(c, 20, 24, 380, 104, 22); c.fill();
    c.fillStyle = '#fff'; c.font = '900 24px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('♪ 따라해 멜로디 ♪', 210, 56);
    c.font = 'bold 16px sans-serif';
    const lvl = live ? seq.length : 7;
    const info = live && state === 'show' ? '잘 보고 기억해요…' : live && state === 'input' ? `따라 누르기 ${step} / ${seq.length}` : `${lvl}단계`;
    c.fillText(info, 210, 94);
    // 바탕 원판
    c.fillStyle = '#0d0a1a'; c.beginPath(); c.arc(210, 312, 184, 0, 6.28); c.fill();
    PADS.forEach((p, i) => {
      const on = live ? lit === i : i === 1;
      const bad = live && state === 'end' && wrong === i;
      c.save();
      if (on) { c.shadowColor = p.col; c.shadowBlur = 36; }
      c.fillStyle = bad ? '#ff3b30' : on ? p.col : p.dim;
      Kit.rr(c, p.x, p.y, PAD, PAD, 28); c.fill();
      c.restore();
      c.fillStyle = on ? '#fff' : 'rgba(255,255,255,.35)'; c.font = '900 28px sans-serif';
      c.fillText(['♪', '♫', '♬', '♩'][i], p.x + PAD / 2, p.y + PAD / 2 - 6);
      c.font = 'bold 13px sans-serif'; c.fillText(String(i + 1), p.x + PAD / 2, p.y + PAD - 18);
    });
    c.fillStyle = '#0d0a1a'; c.beginPath(); c.arc(210, 312, 34, 0, 6.28); c.fill();
    c.fillStyle = '#fff'; c.font = '900 22px sans-serif'; c.fillText(String(live ? cleared : 6), 210, 313);

    if (live && state === 'good') {
      c.fillStyle = '#7ee081'; c.font = '900 40px sans-serif'; c.fillText('딩동댕!', 210, 520);
    }
    if (live && state === 'end') {
      c.fillStyle = grade ? GRADES[grade].color : '#ff8a8a'; c.font = '900 34px sans-serif';
      c.fillText(grade ? `${cleared}단계! ${grade}등급` : `${cleared}단계… 땡!`, 210, 520);
    }
    c.fillStyle = th.cab; Kit.rr(c, 20, 548, 380, 42, 16); c.fill();
    c.fillStyle = 'rgba(255,255,255,.85)'; c.font = 'bold 13px sans-serif';
    c.fillText('빛난 순서대로 누르기 · 키보드 1~4', 210, 569);
  }
  function draw() { drawScene(ctx, machine, true); }

  function setUI() {
    const map = {
      idle: ['🪙 코인 넣기', Kit.idleMsg(hooks)],
      ready: ['START', '빛나는 순서를 기억했다가 똑같이 눌러요'],
      show: ['...', `${seq.length}단계 · 잘 보세요!`],
      input: ['...', `따라 누르기 ${step} / ${seq.length}`],
      good: ['...', '정답! 하나 더 길어져요'],
      end: ['...', grade ? `${cleared}단계 성공! ${grade}등급 인형 획득` : `${cleared}단계… ${TIERS[4][1]}단계 이상이면 인형을 받아요`],
    };
    const [label, msg] = map[state];
    els.btn.textContent = label;
    els.btn.disabled = !(state === 'ready' || (state === 'idle' && hooks.coins() > 0));
    els.status.textContent = msg;
  }
  function action() {
    if (state === 'idle') { if (hooks.spendCoin()) { state = 'ready'; setUI(); } }
    else if (state === 'ready') { seq = []; cleared = 0; grade = null; wrong = -1; showTaps = 0; secretDone = false; nextRound(); }
  }

  return {
    init(e, h) {
      els = e; hooks = h; canvas = e.canvas; ctx = Kit.setup(canvas);
      machine = MACHINES.find(m => m.type === 'memory');
      loop = Kit.loop(update, draw);
      canvas.addEventListener('pointerdown', onPointer);
      document.addEventListener('keydown', ev => {
        if ((state === 'input' || state === 'show') && canvas.offsetParent && /^[1-4]$/.test(ev.key)) tap(+ev.key - 1);
      });
    },
    open(m) {
      if (machine !== m && state === 'ready') hooks.refund(machine.price || 1, '다른 기계로 옮겨서 넣어둔 코인을 돌려받았어요');
      if (machine !== m) state = 'idle';
      machine = m;
      const b = hooks.best(bestKey());
      els.extra.textContent = b !== undefined ? `최고 ${b}단계` : '';
      setUI(); draw();
    },
    start() { loop.start(); },
    // 도중에 나가면 그때까지 성공한 단계로 판정
    stop() { loop.stop(); if (state === 'show' || state === 'input' || state === 'good') finish(); },
    action,
    get state() { return state; },
    refresh() { if (els) setUI(); },
    preview: m => Kit.preview(m, drawScene),
  };
})();
