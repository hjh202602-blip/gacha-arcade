// 캡슐 뽑기: 코인 → 레버 돌리기 → 캡슐이 굴러 나옴 → 눌러서 열기
const CapsuleGame = (() => {
  const W = 420, H = 600;
  const GX = 210, GY = 190, GR = 150, CR = 20;
  const HANDLE = { x: 150, y: 455, r: 44 };
  const EXIT = { x: 290, y: 548 };
  const COLORS = ['#ff6b8a', '#5bc0eb', '#8bd17c', '#ffb347', '#b28dff', '#ff8fb8', '#4de8ff', '#ffe066'];
  const TURN_TIME = 1.3, OPEN_TIME = 1.0;

  let canvas, ctx, els, hooks, machine;
  let running = false, raf = 0, last = 0;
  let caps = [], state = 'idle', t = 0, handleA = 0, out = null;
  // 골든 레버: 레버가 빙글빙글 돌고, 손잡이 끝이 위쪽 금색 칸에 있을 때 멈추면 높은 등급 확률이 크게 오름
  const isLucky = () => machine && machine.gimmick === 'lucky';
  const LUCKY_A = -Math.PI / 2, LUCKY_W = 0.3, SPIN = 7.2;
  const BOOST = { S: 5, A: 3, B: 1.5, C: 1, D: 0.6 };
  let lucky = false, a0 = 0;
  let waitT = 0, secretDone = false;   // 숨겨진 행동: 캡슐 15초 방치 / 골든 레버 10초 넘게 돌리기
  const angDiff = (a, b) => Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  function pickBoosted() {
    const pool = dollsOf(machine.id);
    const w = d => gradeWeight(machine.id, d.grade) * BOOST[d.grade];
    let roll = Math.random() * pool.reduce((s, d) => s + w(d), 0);
    for (const d of pool) if ((roll -= w(d)) < 0) return d;
    return pool[pool.length - 1];
  }

  const rand = (a, b) => a + Math.random() * (b - a);
  const ease = k => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);

  function newCap(x, y) {
    return { x, y, vx: rand(-30, 30), vy: 0, a: rand(0, 6.28), col: COLORS[Math.floor(Math.random() * COLORS.length)] };
  }
  function fill() {
    caps = [];
    for (let i = 0; i < 24; i++) {
      const a = rand(0, 6.28), r = rand(0, GR - 40);
      caps.push(newCap(GX + Math.cos(a) * r, GY + Math.sin(a) * r));
    }
    for (let i = 0; i < 600; i++) physics(1 / 120);
  }

  // ---------- 지구본 속 캡슐 물리 ----------
  function physics(dt) {
    for (const c of caps) {
      c.vy += 900 * dt; c.vx *= 0.995;
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.a += (c.vx * dt) / CR * 0.6;
    }
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < caps.length; i++) {
        for (let j = i + 1; j < caps.length; j++) {
          const a = caps[i], b = caps[j];
          const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, rr = CR * 2;
          if (d2 >= rr * rr || d2 < 1e-6) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, s = (rr - d) / 2;
          a.x -= nx * s; a.y -= ny * s; b.x += nx * s; b.y += ny * s;
          const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rv < 0) { const im = -0.65 * rv; a.vx -= im * nx; a.vy -= im * ny; b.vx += im * nx; b.vy += im * ny; }
        }
      }
      for (const c of caps) {
        const dx = c.x - GX, dy = c.y - GY, d = Math.hypot(dx, dy), lim = GR - CR - 4;
        if (d > lim) {
          const nx = dx / d, ny = dy / d;
          c.x = GX + nx * lim; c.y = GY + ny * lim;
          const vn = c.vx * nx + c.vy * ny;
          if (vn > 0) { c.vx -= 1.4 * vn * nx; c.vy -= 1.4 * vn * ny; }
          c.vx *= 0.98;
        }
      }
    }
  }

  function dropCapsule() {
    let low = 0;
    caps.forEach((c, i) => { if (c.y > caps[low].y) low = i; });
    const picked = caps.splice(low, 1)[0];
    caps.push(newCap(GX + rand(-40, 40), GY - GR + 50));
    const doll = lucky ? pickBoosted() : pickDoll(machine.id);
    const col = doll.grade === 'S' ? 'gold' : doll.grade === 'A' ? 'silver' : picked.col;
    out = { x: EXIT.x - 30, y: 505, vx: 60, vy: 0, a: 0, col, doll, open: 0, rest: 0 };
    state = 'dropping'; t = 0;
    setUI();
  }

  const isLuckyM = m => m && m.gimmick === 'lucky';
  function update(dt) {
    t += dt;
    if (state === 'tray' || state === 'spin') {
      waitT += dt;
      const need = state === 'tray' ? (isLucky() ? Infinity : 15) : 10;
      if (!secretDone && waitT >= need) { secretDone = true; hooks.secret(); }
    } else waitT = 0;
    if (state === 'spin') {
      handleA = (handleA + SPIN * dt) % (Math.PI * 2);
      for (const c of caps) if (Math.random() < 0.04) { c.vx += rand(-120, 120); c.vy -= rand(50, 200); }
    } else if (state === 'turning' && isLucky()) {
      handleA = a0 + ease(Math.min(1, t / 0.7)) * Math.PI * 2;
      for (const c of caps) if (Math.random() < 0.12) { c.vx += rand(-260, 260); c.vy -= rand(100, 480); }
      if (t >= 0.7) dropCapsule();
    } else if (state === 'turning') {
      handleA = ease(Math.min(1, t / TURN_TIME)) * Math.PI * 2;
      for (const c of caps) if (Math.random() < 0.12) { c.vx += rand(-260, 260); c.vy -= rand(100, 480); }
      if (t >= TURN_TIME) dropCapsule();
    } else if (state === 'dropping') {
      out.vy += 1600 * dt;
      out.x += out.vx * dt; out.y += out.vy * dt;
      out.a += (out.vx * dt) / CR;
      if (out.y > EXIT.y) {
        out.y = EXIT.y;
        if (out.vy > 140) out.vy *= -0.35; else { out.vy = 0; out.vx *= 0.85; }
      }
      if (out.x > EXIT.x + 22) { out.x = EXIT.x + 22; out.vx *= -0.5; }
      if (out.vy === 0) out.rest += dt;
      if (out.rest > 0.35) { state = 'tray'; setUI(); }
    } else if (state === 'opening') {
      out.open = Math.min(1, t / OPEN_TIME);
      if (out.open >= 1) {
        state = 'done'; t = 0;
        hooks.award(out.doll, out.col === 'gold' ? '✨ 황금 캡슐 대박!' : '캡슐에서 나왔다!');
      }
    } else if (state === 'done') {
      if (t > 1.2) { out = null; state = 'idle'; setUI(); }
    }
    physics(dt);
  }

  // ---------- 그리기 ----------
  function capFill(c, col, r) {
    if (col === 'gold' || col === 'silver') {
      const g = c.createLinearGradient(-r, -r, r, r);
      const stops = col === 'gold' ? ['#fff3a8', '#ffc61a', '#c98a00', '#ffe066'] : ['#ffffff', '#c9cfdd', '#8e97ad', '#eef1f8'];
      stops.forEach((s, i) => g.addColorStop(i / 3, s));
      return g;
    }
    return col;
  }

  function drawCapsule(c, x, y, r, a, col, split = 0) {
    c.save(); c.translate(x, y); c.rotate(a);
    c.lineWidth = r * 0.09; c.strokeStyle = 'rgba(0,0,0,.25)';
    // 아래 반쪽 (투명)
    c.save(); c.translate(0, split * r * 0.9);
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI); c.closePath();
    c.fillStyle = 'rgba(245,245,252,.95)'; c.fill(); c.stroke();
    c.restore();
    // 위 반쪽 (색)
    c.save(); c.translate(split * r * 0.4, -split * r * 1.8); c.rotate(-split * 0.6);
    c.beginPath(); c.arc(0, 0, r, Math.PI, Math.PI * 2); c.closePath();
    c.fillStyle = capFill(c, col, r); c.fill(); c.stroke();
    c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(-r, -r * 0.12, r * 2, r * 0.12);
    c.beginPath(); c.ellipse(-r * 0.38, -r * 0.55, r * 0.28, r * 0.14, -0.5, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,255,255,.55)'; c.fill();
    c.restore();
    c.restore();
  }

  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }

  function drawScene(c, m, live) {
    const th = m.theme;
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, th.inside[0]); bg.addColorStop(1, th.inside[1]);
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.25)';
    for (let y = 30; y < H; y += 40) for (let x = 20 + ((y / 40) % 2) * 20; x < W; x += 40) { c.beginPath(); c.arc(x, y, 3, 0, 6.28); c.fill(); }

    // 받침대 몸통
    c.fillStyle = th.cab2; roundRect(c, GX - 60, GY + GR - 30, 120, 50, 10); c.fill();
    c.fillStyle = th.cab; roundRect(c, 60, 360, 300, 230, 28); c.fill();
    c.lineWidth = 6; c.strokeStyle = th.cab2; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.18)'; roundRect(c, 76, 372, 268, 12, 6); c.fill();

    // 뚜껑
    c.fillStyle = th.cab2; roundRect(c, GX - 50, GY - GR - 24, 100, 34, 12); c.fill();
    c.fillStyle = th.cab; roundRect(c, GX - 34, GY - GR - 36, 68, 18, 8); c.fill();

    // 유리 지구본 + 캡슐
    c.save();
    c.beginPath(); c.arc(GX, GY, GR, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,255,255,.28)'; c.fill();
    c.clip();
    for (const cp of caps) drawCapsule(c, cp.x, cp.y, CR, cp.a, cp.col);
    c.restore();
    c.lineWidth = 7; c.strokeStyle = 'rgba(255,255,255,.85)';
    c.beginPath(); c.arc(GX, GY, GR, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 10; c.strokeStyle = 'rgba(255,255,255,.55)';
    c.beginPath(); c.arc(GX, GY, GR - 22, Math.PI * 1.1, Math.PI * 1.45); c.stroke();

    // 가격판
    c.fillStyle = '#fff8e8'; roundRect(c, 236, 400, 108, 40, 10); c.fill();
    c.fillStyle = th.cab2; c.font = 'bold 18px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(`${m.price || 1} COIN`, 290, 421);

    // 골든 레버: 금색 칸
    if (isLuckyM(m)) {
      c.save(); c.translate(HANDLE.x, HANDLE.y);
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(0, 0, HANDLE.r + 16, 0, 6.28); c.fill();
      c.fillStyle = '#ffd23f'; c.shadowColor = '#ffd23f'; c.shadowBlur = live && state === 'spin' ? 16 : 6;
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, HANDLE.r + 16, LUCKY_A - LUCKY_W, LUCKY_A + LUCKY_W); c.closePath(); c.fill();
      c.restore();
      if (live && (state === 'turning' || state === 'dropping' || state === 'tray') && lucky) {
        c.save(); c.fillStyle = '#ffd23f'; c.font = '900 26px sans-serif'; c.textAlign = 'center';
        c.shadowColor = '#ff9f1c'; c.shadowBlur = 14; c.fillText('★ LUCKY! ★', HANDLE.x, HANDLE.y - HANDLE.r - 30); c.restore();
      }
    }
    // 레버
    c.save(); c.translate(HANDLE.x, HANDLE.y);
    const hg = c.createRadialGradient(-12, -14, 6, 0, 0, HANDLE.r);
    hg.addColorStop(0, '#ffffff'); hg.addColorStop(1, '#a3a9bb');
    c.fillStyle = hg; c.beginPath(); c.arc(0, 0, HANDLE.r, 0, 6.28); c.fill();
    c.lineWidth = 4; c.strokeStyle = '#6f7388'; c.stroke();
    c.rotate(handleA);
    c.fillStyle = th.cab2; roundRect(c, -38, -11, 76, 22, 11); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 9, 0, 6.28); c.fill();
    if (isLuckyM(m)) { c.fillStyle = '#ff3d6e'; c.beginPath(); c.arc(32, 0, 7, 0, 6.28); c.fill(); }   // 손잡이 끝 표시
    c.restore();
    if (live && state === 'ready' && Math.floor(performance.now() / 400) % 2) {
      c.fillStyle = '#fff'; c.font = 'bold 15px sans-serif';
      c.fillText('↻ 돌려요!', HANDLE.x, HANDLE.y - HANDLE.r - 14);
    }

    // 출구
    c.fillStyle = '#2a1420'; roundRect(c, EXIT.x - 56, 492, 112, 76, 14); c.fill();
    if (live && out && out.open === 0) drawCapsule(c, out.x, out.y, CR, out.a, out.col);
    c.fillStyle = th.cab2; roundRect(c, EXIT.x - 60, 562, 120, 14, 6); c.fill();
    c.fillStyle = 'rgba(255,255,255,.6)'; c.font = 'bold 12px sans-serif';
    c.fillText('▼ 캡슐 나오는 곳', EXIT.x, 484);
  }

  function drawOpening() {
    const k = out.open;
    const m = ease(Math.min(1, k * 1.8));
    c_dim(0.5 * m);
    const x = out.x + (GX - out.x) * m, y = out.y + (300 - out.y) * m;
    const r = CR * (1 + 2.6 * m), split = Math.max(0, (k - 0.55) / 0.45);
    if (out.col === 'gold' || out.doll.grade === 'S') {
      ctx.save(); ctx.translate(x, y); ctx.rotate(performance.now() / 900);
      ctx.fillStyle = 'rgba(255,230,120,.35)';
      for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-14, -200); ctx.lineTo(14, -200); ctx.fill(); }
      ctx.restore();
    }
    drawCapsule(ctx, x, y, r, out.a * (1 - m), out.col, split);
    if (split > 0) {
      const s = ease(split);
      DollArt.drawAt(ctx, out.doll, x, y - 30 * s, 30 + 42 * s, Math.sin(performance.now() / 200) * 0.08 * s);
    }
  }
  function c_dim(a) { ctx.fillStyle = `rgba(20,10,30,${a})`; ctx.fillRect(0, 0, W, H); }

  function draw() {
    drawScene(ctx, machine, true);
    if (out && out.open > 0) drawOpening();
  }

  // ---------- 입력 / UI ----------
  const UI = {
    idle: ['🪙 코인 넣기', () => (hooks.coins() > 0 ? '코인을 넣어주세요' : '코인이 부족해요! 인형을 팔거나 교환기로')],
    ready: ['레버 돌리기', () => (isLucky() ? '레버를 돌리고, 빨간 끝이 금색 칸에 올 때 멈춰요!' : '레버를 돌려주세요!')],
    spin: ['⏹ 멈추기!', () => '빨간 끝이 위쪽 금색 칸에 왔을 때 멈춰요!'],
    turning: ['데구루루...', () => (isLucky() ? (lucky ? '★ LUCKY! 황금 캡슐 확률 UP!' : '아쉽게 금색 칸을 지나쳤어요') : '드르륵 드르륵...')],
    dropping: ['데구루루...', () => '캡슐이 나온다!'],
    tray: ['캡슐 열기', () => (out.col === 'gold' ? '✨ 황금 캡슐이다!! 눌러서 열기' : out.col === 'silver' ? '은빛 캡슐! 눌러서 열기' : '캡슐을 눌러서 열어보세요')],
    opening: ['두근두근...', () => '두근두근...'],
    done: ['...', () => ''],
  };
  function setUI() {
    const [label, msg] = UI[state];
    els.btn.textContent = label;
    els.btn.disabled = !(state === 'ready' || state === 'spin' || state === 'tray' || (state === 'idle' && hooks.coins() > 0));
    els.btn.classList.toggle('stop', state === 'spin');
    els.status.textContent = msg();
  }

  function action() {
    if (state === 'idle') { if (hooks.spendCoin()) { state = 'ready'; t = 0; secretDone = false; setUI(); } }
    else if (state === 'ready' && isLucky()) { state = 'spin'; t = 0; lucky = false; setUI(); }
    else if (state === 'spin') {
      lucky = angDiff(handleA, LUCKY_A) <= LUCKY_W;
      a0 = handleA; state = 'turning'; t = 0; setUI();
    }
    else if (state === 'ready') { lucky = false; state = 'turning'; t = 0; setUI(); }
    else if (state === 'tray') { state = 'opening'; t = 0; setUI(); }
  }

  function onPointer(e) {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W, y = ((e.clientY - rect.top) / rect.height) * H;
    if ((state === 'ready' || state === 'spin') && Math.hypot(x - HANDLE.x, y - HANDLE.y) < HANDLE.r + 16) action();
    else if (state === 'tray' && Math.hypot(x - out.x, y - out.y) < CR + 26) action();
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }

  return {
    init(e, h) {
      els = e; hooks = h; canvas = e.canvas; ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      canvas.addEventListener('pointerdown', onPointer);
      machine = MACHINES.find(m => m.type === 'capsule');
      fill();
    },
    open(m) {
      if (machine !== m) {
        if (state === 'ready' || state === 'spin') hooks.refund(machine.price || 1, '다른 기계로 옮겨서 넣어둔 코인을 돌려받았어요');
        if (state === 'ready' || state === 'spin') state = 'idle';
        machine = m;
      }
      setUI(); draw();
    },
    start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    action,
    get state() { return state; },
    refresh() { if (els) setUI(); },
    preview(m) {
      const S = 240, cv = document.createElement('canvas');
      cv.width = cv.height = S * 2;
      const c = cv.getContext('2d');
      c.scale(2, 2);
      const g = c.createLinearGradient(0, 0, 0, S);
      g.addColorStop(0, m.theme.inside[0]); g.addColorStop(1, m.theme.inside[1]);
      c.fillStyle = g; c.fillRect(0, 0, S, S);
      c.translate((S - W * 0.4) / 2, 0); c.scale(0.4, 0.4);
      drawScene(c, m, false);
      return cv.toDataURL();
    },
  };
})();
