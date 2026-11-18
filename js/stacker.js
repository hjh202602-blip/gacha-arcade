// 스태커: 좌우로 움직이는 블록 줄을 멈춰 한 층씩 쌓기. 어긋난 블록은 떨어짐. 높이 쌓을수록 좋은 등급
const StackerGame = (() => {
  const COLS = 7, ROWS = 12, CELL = 34;
  const GX = 210 - (COLS * CELL) / 2, GY = 488; // 맨 아래 줄의 윗변
  const PRIZE_ROWS = [['D', 4], ['C', 6], ['B', 8], ['A', 10], ['S', 12]];
  const START_LEN = 3;
  const interval = row => Math.max(0.05, 0.17 * 0.87 ** row);      // 한 칸 이동 시간 (위로 갈수록 빨라짐)
  const maxLen = row => (row >= 8 ? 1 : row >= 4 ? 2 : 3);         // 위로 갈수록 폭 제한

  let canvas, ctx, els, hooks, machine, loop;
  let state = 'idle', t = 0, time = 0;
  let stack = [], row = 0, pos = 0, len = START_LEN, dir = 1, acc = 0, falling = [], reached = 0, flash = 0;

  const rowTop = r => GY - r * CELL;

  function reset() { stack = []; row = 0; pos = 0; len = START_LEN; dir = 1; acc = 0; falling = []; reached = 0; }

  function update(dt) {
    time += dt; t += dt;
    flash = Math.max(0, flash - dt * 2);
    for (const f of falling) { f.vy += 900 * dt; f.y += f.vy * dt; }
    falling = falling.filter(f => f.y < 640);
    if (state === 'play') {
      acc += dt;
      const step = interval(row);
      while (acc >= step) {
        acc -= step;
        if (pos + dir < 0 || pos + len + dir > COLS) dir = -dir;
        pos += dir;
      }
    } else if (state === 'end') {
      if (t > 1.6) { state = 'idle'; setUI(); }
    }
  }

  function stopRow() {
    let from = pos, to = pos + len; // [from, to)
    if (row > 0) {
      const below = stack[row - 1];
      const nf = Math.max(from, below.from), nt = Math.min(to, below.to);
      for (let x = from; x < to; x++) if (x < nf || x >= nt) falling.push({ x, y: rowTop(row), vy: 0 });
      from = nf; to = nt;
    }
    if (to - from <= 0) { finish(); return; }
    stack.push({ from, to });
    reached = row + 1;
    flash = 1;
    if (reached >= ROWS) { finish(); return; }
    row++;
    len = Math.min(to - from, maxLen(row));
    pos = Math.random() < 0.5 ? 0 : COLS - len;
    dir = pos === 0 ? 1 : -1;
    acc = 0;
    setUI();
  }

  function finish() {
    state = 'end'; t = 0;
    const tier = [...PRIZE_ROWS].reverse().find(([, r]) => reached >= r);
    if (tier) {
      const doll = dollsOf(machine.id).find(d => d.grade === tier[0]);
      setTimeout(() => hooks.award(doll, `${reached}층 달성! ${tier[0]}등급`), 500);
    }
    setUI(tier);
  }

  function cell(c, x, y, col, glow) {
    c.fillStyle = col;
    if (glow) { c.save(); c.shadowColor = col; c.shadowBlur = 12; }
    Kit.rr(c, GX + x * CELL + 2, y + 2, CELL - 4, CELL - 4, 6); c.fill();
    if (glow) c.restore();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(GX + x * CELL + 6, y + 5, CELL - 12, 4);
  }

  function drawScene(c, m, live) {
    Kit.bg(c, m);
    const th = m.theme;
    c.fillStyle = th.cab; c.font = '900 30px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.save(); c.shadowColor = th.cab; c.shadowBlur = 18; c.fillStyle = '#ffe0f0'; c.fillText('STACKER', 210, 40); c.restore();

    // 판
    c.fillStyle = '#05020a'; Kit.rr(c, GX - 10, rowTop(ROWS - 1) - 10, COLS * CELL + 20, ROWS * CELL + 20, 12); c.fill();
    for (let r = 0; r < ROWS; r++) for (let x = 0; x < COLS; x++) {
      c.fillStyle = 'rgba(255,255,255,.05)'; Kit.rr(c, GX + x * CELL + 2, rowTop(r) + 2, CELL - 4, CELL - 4, 6); c.fill();
    }
    // 등급 줄 표시
    for (const [g, r] of PRIZE_ROWS) {
      const y = rowTop(r - 1);
      c.strokeStyle = GRADES[g].color; c.lineWidth = 2; c.setLineDash([4, 4]);
      c.beginPath(); c.moveTo(GX - 6, y); c.lineTo(GX + COLS * CELL + 6, y); c.stroke(); c.setLineDash([]);
      c.fillStyle = GRADES[g].color; Kit.rr(c, GX - 40, y - 10, 26, 20, 5); c.fill();
      c.fillStyle = '#1a0f2c'; c.font = '900 13px sans-serif'; c.fillText(g, GX - 27, y);
      const doll = dollsOf(m.id).find(d => d.grade === g);
      if (doll) DollArt.drawAt(c, doll, GX + COLS * CELL + 32, y + 2, 15);
    }
    // 블록
    const blockCol = '#ff4fa0';
    const list = live ? stack : [{ from: 2, to: 5 }, { from: 2, to: 5 }, { from: 3, to: 5 }, { from: 3, to: 5 }, { from: 3, to: 4 }];
    list.forEach((s, r) => { for (let x = s.from; x < s.to; x++) cell(c, x, rowTop(r), r === list.length - 1 && flash > 0 ? '#ffd23f' : blockCol); });
    if (live && state === 'play') for (let x = pos; x < pos + len; x++) cell(c, x, rowTop(row), '#4de8ff', true);
    if (live) for (const f of falling) cell(c, f.x, f.y, 'rgba(255,79,160,.5)');

    // 아래 패널
    c.fillStyle = th.cab2; Kit.rr(c, 20, 530, 380, 60, 18); c.fill();
    c.fillStyle = '#fff'; c.font = 'bold 15px sans-serif';
    c.fillText(live ? `${reached} / ${ROWS} 층` : '꼭대기까지 쌓아라!', 210, 560);
    if (live && state === 'end') {
      c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, 250, 420, 80);
      c.fillStyle = reached >= 4 ? '#ffd23f' : '#ff8a8a'; c.font = '900 34px sans-serif';
      c.fillText(reached >= ROWS ? '꼭대기 정복!!' : reached >= 4 ? `${reached}층 성공!` : 'GAME OVER', 210, 290);
    }
  }

  function draw() { drawScene(ctx, machine, true); }

  function setUI(tier) {
    const map = {
      idle: ['🪙 코인 넣기', Kit.idleMsg(hooks)],
      play: ['STOP', row === 0 ? '원하는 자리에서 멈춰요' : `${row + 1}층 · 아래 블록과 겹치게 멈춰요`],
      end: ['...', tier ? `${reached}층! ${tier[0]}등급 인형 획득` : `${reached}층… 4층 이상 쌓으면 인형을 받아요`],
    };
    const [label, msg] = map[state];
    els.btn.textContent = label;
    els.btn.disabled = !(state === 'play' || (state === 'idle' && hooks.coins() > 0));
    els.status.textContent = msg;
    const best = hooks.best('stacker');
    els.extra.textContent = best ? `최고 ${best}층` : '';
  }

  function action() {
    if (state === 'idle') { if (hooks.spendCoin()) { reset(); state = 'play'; setUI(); } }
    else if (state === 'play') {
      stopRow();
      if (state === 'end') hooks.best('stacker', reached);
      setUI(state === 'end' ? [...PRIZE_ROWS].reverse().find(([, r]) => reached >= r) : undefined);
    }
  }

  return {
    init(e, h) {
      els = e; hooks = h; canvas = e.canvas; ctx = Kit.setup(canvas);
      machine = MACHINES.find(m => m.type === 'stacker');
      loop = Kit.loop(update, draw);
      canvas.addEventListener('pointerdown', () => { if (state === 'play') action(); });
    },
    open(m) { machine = m; setUI(); draw(); },
    start() { loop.start(); },
    stop() { loop.stop(); },
    action,
    get state() { return state; },
    refresh() { if (els) setUI(); },
    preview: m => Kit.preview(m, drawScene),
  };
})();
