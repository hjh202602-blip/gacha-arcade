// 키 마스터: 좌우로 움직이는 열쇠를 멈추고 → 위아래로 움직이는 열쇠를 멈춰 → 열쇠구멍에 넣기
const KeymasterGame = (() => {
  const HOLE = { D: [28, 32], C: [22, 26], B: [17, 22], A: [13, 18], S: [9, 14] }; // 열쇠구멍 [너비, 높이]
  const LAYOUT = ['D', 'C', 'A', 'B', 'S', 'D'];   // 위 3칸, 아래 3칸
  const COLS = [105, 210, 315], ROWS = [96, 290];  // 사물함 윗변
  const BOX_W = 92, BOX_H = 170;
  const X_MIN = 50, X_MAX = 370, Y_MIN = 110, Y_MAX = 480;
  const SPEED_X = 220, SPEED_Y = 170;

  let canvas, ctx, els, hooks, machine, loop;
  let lockers = [], state = 'idle', t = 0, kx = X_MIN, ky = Y_MIN, dx = 1, dy = 1, won = null, open = 0;

  function build() {
    const pool = dollsOf(machine.id);
    const used = new Set();
    lockers = LAYOUT.map((g, i) => {
      const doll = pool.find(d => d.grade === g && !used.has(d.id)) || pool.find(d => d.grade === g);
      used.add(doll.id);
      const cx = COLS[i % 3], top = ROWS[Math.floor(i / 3)];
      return { doll, cx, top, hx: cx, hy: top + 140, hw: HOLE[g][0], hh: HOLE[g][1] };
    });
  }

  function sweep(v, d, min, max, speed, dt) {
    v += d * speed * dt;
    if (v > max) { v = max; d = -1; } else if (v < min) { v = min; d = 1; }
    return [v, d];
  }

  function update(dt) {
    t += dt;
    if (state === 'moveX') [kx, dx] = sweep(kx, dx, X_MIN, X_MAX, SPEED_X, dt);
    else if (state === 'moveY') [ky, dy] = sweep(ky, dy, Y_MIN, Y_MAX, SPEED_Y, dt);
    else if (state === 'insert') {
      if (t > 0.6) {
        won = lockers.find(l => Math.abs(kx - l.hx) <= l.hw / 2 && Math.abs(ky - l.hy) <= l.hh / 2) || null;
        state = won ? 'open' : 'fail'; t = 0; setUI();
      }
    } else if (state === 'open') {
      open = Math.min(1, t / 0.8);
      if (t > 1.0 && won) {
        hooks.award(won.doll, `열쇠가 딱 맞았다! ${won.doll.grade}등급 사물함`);
        state = 'done'; t = 0; setUI();
      }
    } else if (state === 'fail' || state === 'done') {
      if (t > 1.3) { state = 'idle'; won = null; open = 0; setUI(); }
    }
  }

  function keyhole(c, x, y, w, h, glow) {
    c.fillStyle = glow ? '#ffe066' : '#0b0c14';
    c.beginPath(); c.arc(x, y - h * 0.18, w / 2, 0, 6.28); c.fill();
    c.beginPath(); c.moveTo(x - w * 0.28, y); c.lineTo(x + w * 0.28, y); c.lineTo(x + w * 0.45, y + h / 2); c.lineTo(x - w * 0.45, y + h / 2); c.closePath(); c.fill();
  }

  function drawKey(c, x, y, s = 1) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#ffd23f'; c.strokeStyle = '#a87a00'; c.lineWidth = 2;
    c.beginPath(); c.arc(0, -26, 10, 0, 6.28); c.fill(); c.stroke();
    c.fillStyle = '#3a2f12'; c.beginPath(); c.arc(0, -26, 4, 0, 6.28); c.fill();
    c.fillStyle = '#ffd23f'; c.fillRect(-2.5, -17, 5, 20); c.strokeRect(-2.5, -17, 5, 20);
    c.fillRect(2, -6, 5, 3); c.fillRect(2, -1, 4, 3);
    c.restore();
  }

  function drawScene(c, m, live) {
    Kit.bg(c, m);
    const th = m.theme;
    c.fillStyle = '#ffd23f'; c.font = '900 26px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.save(); c.shadowColor = '#ffd23f'; c.shadowBlur = 14; c.fillText('🔑 KEY MASTER', 210, 52); c.restore();

    for (const l of lockers) {
      const x = l.cx - BOX_W / 2, isWon = live && won === l;
      c.fillStyle = th.cab; Kit.rr(c, x, l.top, BOX_W, BOX_H, 10); c.fill();
      c.lineWidth = 3; c.strokeStyle = GRADES[l.doll.grade].color; c.stroke();
      // 유리창 + 상품
      c.fillStyle = 'rgba(255,255,255,.1)'; Kit.rr(c, x + 8, l.top + 8, BOX_W - 16, 100, 8); c.fill();
      const lift = isWon ? open * 30 : 0;
      DollArt.drawAt(c, l.doll, l.cx, l.top + 62 - lift, 30);
      if (isWon) {
        c.fillStyle = `rgba(255,224,102,${0.4 * open})`; Kit.rr(c, x + 8, l.top + 8, BOX_W - 16, 100, 8); c.fill();
      }
      // 등급표
      c.fillStyle = GRADES[l.doll.grade].color; Kit.rr(c, l.cx - 14, l.top + 112, 28, 16, 5); c.fill();
      c.fillStyle = '#1a0f2c'; c.font = '900 12px sans-serif'; c.fillText(l.doll.grade, l.cx, l.top + 120);
      keyhole(c, l.hx, l.hy, l.hw, l.hh, isWon);
    }

    if (live && state !== 'idle') {
      // 레이저 가이드
      c.save(); c.strokeStyle = 'rgba(255,80,80,.75)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(kx, 80); c.lineTo(kx, 500); c.stroke();
      if (state !== 'moveX') { c.beginPath(); c.moveTo(30, ky); c.lineTo(390, ky); c.stroke(); }
      c.restore();
      const kyShow = state === 'moveX' ? 84 : ky;
      const push = state === 'insert' ? Math.min(1, t / 0.6) : state === 'moveX' || state === 'moveY' ? 0 : 1;
      drawKey(c, kx, kyShow + 14, 1.3 - 0.45 * push);
    }

    // 아래 패널
    c.fillStyle = th.cab2; Kit.rr(c, 20, 500, 380, 90, 20); c.fill();
    c.fillStyle = '#0b0c14'; Kit.rr(c, 150, 516, 120, 52, 10); c.fill();
    c.fillStyle = 'rgba(255,255,255,.65)'; c.font = 'bold 12px sans-serif';
    c.fillText('▼ 상품 나오는 곳', 210, 580);
    if (live && state === 'fail') {
      c.fillStyle = '#ff5c5c'; c.font = '900 40px sans-serif'; c.fillText('땡!', 210, 270);
    }
  }

  function draw() { drawScene(ctx, machine, true); }

  function setUI() {
    const map = {
      idle: ['🪙 코인 넣기', Kit.idleMsg(hooks)],
      moveX: ['가로 멈추기', '① 열쇠구멍 위에서 멈춰요'],
      moveY: ['세로 멈추기', '② 열쇠구멍 높이에서 멈춰요'],
      insert: ['...', '찰칵…'],
      open: ['...', '열렸다!!'],
      fail: ['...', '구멍에 안 맞았어요'],
      done: ['...', '획득!'],
    };
    const [label, msg] = map[state];
    els.btn.textContent = label;
    els.btn.disabled = !(state === 'moveX' || state === 'moveY' || (state === 'idle' && hooks.coins() > 0));
    els.status.textContent = msg;
  }

  function action() {
    if (state === 'idle') {
      if (hooks.spendCoin()) { state = 'moveX'; kx = X_MIN; dx = 1; ky = Y_MIN; dy = 1; t = 0; setUI(); }
    } else if (state === 'moveX') { state = 'moveY'; setUI(); }
    else if (state === 'moveY') { state = 'insert'; t = 0; setUI(); }
  }

  return {
    init(e, h) {
      els = e; hooks = h; canvas = e.canvas; ctx = Kit.setup(canvas);
      machine = MACHINES.find(m => m.type === 'keymaster');
      build();
      loop = Kit.loop(update, draw);
      canvas.addEventListener('pointerdown', () => { if (state === 'moveX' || state === 'moveY') action(); });
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
