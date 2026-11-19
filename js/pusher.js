// 코인 푸셔 (위에서 내려다본 모습): 코인을 떨어뜨리면 움직이는 판이 코인과 인형을 앞으로 밀어냄
// 앞 가장자리로 떨어진 코인은 지갑으로, 인형은 획득. 양옆 홈으로 떨어지면 사라짐
const PusherGame = (() => {
  const L = 50, R = 370, TOP = 60, FRONT = 500, GUTTER_Y = 420;
  const FACE_MID = 182, FACE_AMP = 34, FACE_W = 2.6;   // 미는 판 앞면이 오가는 범위
  const COIN_R = 13, DOLL_R = 24;
  const DROP_Y = 34, DROP_MIN = 70, DROP_MAX = 350, DROP_SPEED = 120, COOLDOWN = 0.25;

  let canvas, ctx, els, hooks, machine, loop;
  let items = [], time = 0, face = FACE_MID, dropX = 210, dropDir = 1, cool = 0;
  let floats = [], falling = [], session = { in: 0, out: 0 }, respawn = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const coin = (x, y) => ({ kind: 'coin', x, y, vx: 0, vy: 0, r: COIN_R, m: 1 });
  const doll = (x, y) => ({ kind: 'doll', doll: pickDoll(machine.id), x, y, vx: 0, vy: 0, r: DOLL_R, m: 3, a: rand(-0.4, 0.4) });

  function fill() {
    items = [];
    for (let y = 240; y < 490; y += 25) for (let x = L + 18; x < R - 12; x += 27) items.push(coin(x + rand(-4, 4), y + rand(-4, 4)));
    for (const [x, y] of [[130, 330], [270, 380], [200, 440]]) {
      items = items.filter(it => Math.hypot(it.x - x, it.y - y) > DOLL_R + COIN_R);
      items.push(doll(x, y));
    }
    for (let i = 0; i < 240; i++) physics(1 / 120, true);
  }

  function physics(dt, settle) {
    const prev = face;
    if (!settle) face = FACE_MID + Math.sin(time * FACE_W) * FACE_AMP;
    const fv = (face - prev) / dt;
    const damp = Math.exp(-7 * dt);
    for (const it of items) {
      it.x += it.vx * dt; it.y += it.vy * dt;
      it.vx *= damp; it.vy *= damp;
    }
    for (let k = 0; k < 6; k++) {
      for (let i = 0; i < items.length; i++) {
        const a = items[i];
        for (let j = i + 1; j < items.length; j++) {
          const b = items[j];
          const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
          if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue;
          const d2 = dx * dx + dy * dy;
          if (d2 >= rr * rr || d2 < 1e-6) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = rr - d;
          const ia = 1 / a.m, ib = 1 / b.m, s = ov / (ia + ib);
          a.x -= nx * s * ia; a.y -= ny * s * ia; b.x += nx * s * ib; b.y += ny * s * ib;
          const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rv < 0) { const im = -1.2 * rv / (ia + ib); a.vx -= im * nx * ia; a.vy -= im * ny * ia; b.vx += im * nx * ib; b.vy += im * ny * ib; }
        }
      }
      for (const it of items) {
        if (it.y - it.r < face) { it.y = face + it.r; if (it.vy < fv) it.vy = Math.max(0, fv); }
        if (it.y < GUTTER_Y) {
          if (it.x - it.r < L) { it.x = L + it.r; it.vx = Math.abs(it.vx) * 0.3; }
          if (it.x + it.r > R) { it.x = R - it.r; it.vx = -Math.abs(it.vx) * 0.3; }
        }
      }
    }
    if (settle) return;
    // 떨어지는 것들
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      const front = it.y > FRONT;
      const side = it.y > GUTTER_Y && (it.x < L + 4 || it.x > R - 4);
      if (!front && !side) continue;
      items.splice(i, 1);
      falling.push({ ...it, t: 0, win: front });
      if (front && it.kind === 'coin') {
        session.out++; hooks.addCoins(1);
        floats.push({ x: it.x, y: FRONT + 20, t: 0, text: '+1', col: '#ffd23f' });
      } else if (front) {
        floats.push({ x: it.x, y: FRONT + 10, t: 0, text: '인형 획득!', col: '#ff5fa2' });
        hooks.award(it.doll, '푸셔에서 떨어졌다!');
      } else if (it.kind === 'doll') {
        floats.push({ x: it.x, y: GUTTER_Y + 30, t: 0, text: '앗, 옆으로…', col: '#9aa5b1' });
      }
      setUI();
    }
  }

  function update(dt) {
    time += dt; cool = Math.max(0, cool - dt);
    dropX += dropDir * DROP_SPEED * dt;
    if (dropX > DROP_MAX) { dropX = DROP_MAX; dropDir = -1; } else if (dropX < DROP_MIN) { dropX = DROP_MIN; dropDir = 1; }
    physics(dt / 2); physics(dt / 2);
    for (const f of floats) f.t += dt;
    floats = floats.filter(f => f.t < 1);
    for (const f of falling) f.t += dt;
    falling = falling.filter(f => f.t < 0.4);
    // 인형이 3개보다 적으면 새로 올려놓기
    if (items.filter(i => i.kind === 'doll').length < 3) {
      respawn += dt;
      if (respawn > 1.5) { respawn = 0; items.push(doll(rand(L + 40, R - 40), face + DOLL_R + 4)); }
    }
  }

  function dropAt(x) {
    if (cool > 0) return;
    if (!hooks.spendCoin()) { setUI(); return; }
    cool = COOLDOWN;
    session.in++;
    const c = coin(Math.max(L + COIN_R, Math.min(R - COIN_R, x)), face + COIN_R + 1);
    c.vy = 60;
    items.push(c);
    setUI();
  }

  // ---------- 그리기 ----------
  function drawCoin(c, x, y, r, alpha = 1) {
    c.save(); c.globalAlpha = alpha;
    const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
    g.addColorStop(0, '#fff3a8'); g.addColorStop(0.6, '#ffc61a'); g.addColorStop(1, '#b07800');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.28); c.fill();
    c.strokeStyle = 'rgba(120,80,0,.6)'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(x, y, r * 0.68, 0, 6.28); c.stroke();
    c.restore();
  }

  function drawScene(c, m, live) {
    Kit.bg(c, m);
    const th = m.theme;
    // 판 바닥
    c.fillStyle = '#4a2f1c'; Kit.rr(c, L - 14, TOP, R - L + 28, FRONT - TOP + 8, 10); c.fill();
    const fg = c.createLinearGradient(0, TOP, 0, FRONT);
    fg.addColorStop(0, '#1d5c4a'); fg.addColorStop(1, '#2f8a6d');
    c.fillStyle = fg; c.fillRect(L, TOP, R - L, FRONT - TOP);
    // 옆 홈
    c.fillStyle = '#0b0710';
    c.fillRect(L - 14, GUTTER_Y, 18, FRONT - GUTTER_Y + 8); c.fillRect(R - 4, GUTTER_Y, 18, FRONT - GUTTER_Y + 8);
    // 앞 가장자리 & 받는 곳
    c.fillStyle = '#ffd23f'; c.fillRect(L, FRONT - 2, R - L, 5);
    c.fillStyle = th.cab2; Kit.rr(c, 20, FRONT + 20, 380, 70, 18); c.fill();
    c.fillStyle = '#120a06'; Kit.rr(c, 60, FRONT + 26, 300, 34, 10); c.fill();
    c.fillStyle = 'rgba(255,255,255,.7)'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('▲ 앞으로 떨어지면 획득 · 옆 홈은 꽝', 210, FRONT + 76);

    const list = live ? items : demoItems(m);
    for (const it of list) {
      if (it.kind === 'coin') drawCoin(c, it.x, it.y, it.r);
      else {
        if (it.doll.grade === 'S' || it.doll.grade === 'A') {
          const g = c.createRadialGradient(it.x, it.y, 6, it.x, it.y, it.r * 1.6);
          g.addColorStop(0, GRADES[it.doll.grade].color + 'aa'); g.addColorStop(1, GRADES[it.doll.grade].color + '00');
          c.fillStyle = g; c.beginPath(); c.arc(it.x, it.y, it.r * 1.6, 0, 6.28); c.fill();
        }
        DollArt.drawAt(c, it.doll, it.x, it.y, it.r, it.a);
      }
    }
    if (live) for (const f of falling) {
      const k = f.t / 0.4;
      if (f.kind === 'coin') drawCoin(c, f.x, f.y + k * 30, f.r * (1 - k * 0.5), 1 - k);
      else { c.save(); c.globalAlpha = 1 - k; DollArt.drawAt(c, f.doll, f.x, f.y + k * 30, f.r * (1 - k * 0.4)); c.restore(); }
    }

    // 미는 판
    const fy = live ? face : FACE_MID;
    c.fillStyle = th.cab; c.fillRect(L, TOP, R - L, fy - TOP);
    c.fillStyle = 'rgba(0,0,0,.15)';
    for (let x = L + 10; x < R; x += 40) c.fillRect(x, TOP, 18, fy - TOP);
    c.fillStyle = th.cab2; c.fillRect(L, fy - 8, R - L, 8);
    c.fillStyle = '#fff'; c.font = '900 22px sans-serif'; c.fillText('PUSHER', 210, TOP + (fy - TOP) / 2 - 4);

    // 코인 투입기
    const dx = live ? dropX : 210;
    c.fillStyle = '#c0c6d4'; c.fillRect(L, DROP_Y - 3, R - L, 6);
    c.fillStyle = '#6f7388'; Kit.rr(c, dx - 16, DROP_Y - 12, 32, 22, 6); c.fill();
    drawCoin(c, dx, DROP_Y, 8);
    if (live) {
      c.save(); c.setLineDash([4, 6]); c.strokeStyle = 'rgba(255,210,63,.6)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(dx, DROP_Y + 12); c.lineTo(dx, fy); c.stroke(); c.restore();
      for (const f of floats) {
        c.globalAlpha = 1 - f.t; c.fillStyle = f.col; c.font = '900 18px sans-serif';
        c.fillText(f.text, f.x, f.y - f.t * 30); c.globalAlpha = 1;
      }
    }
  }

  let demo = null;
  function demoItems(m) {
    if (demo) return demo;
    const pool = dollsOf(m.id);
    demo = [];
    for (let y = 250; y < 480; y += 26) for (let x = L + 18; x < R - 12; x += 28) demo.push({ kind: 'coin', x: x + ((y * 7) % 9) - 4, y, r: COIN_R });
    [[130, 330], [270, 380], [200, 440]].forEach(([x, y], i) => {
      demo = demo.filter(it => Math.hypot(it.x - x, it.y - y) > DOLL_R + COIN_R);
      demo.push({ kind: 'doll', doll: pool[(i * 2) % pool.length], x, y, r: DOLL_R, a: 0 });
    });
    return demo;
  }

  function draw() { drawScene(ctx, machine, true); }

  function setUI() {
    const can = hooks.coins() > 0;
    els.btn.textContent = '🪙 코인 떨어뜨리기';
    els.btn.disabled = !can;
    els.status.textContent = can ? '원하는 위치를 눌러 코인을 떨어뜨려요' : Kit.idleMsg(hooks);
    els.extra.textContent = session.in ? `넣음 ${session.in} · 나옴 ${session.out}` : '';
  }

  function onPointer(e) {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 420, y = ((e.clientY - rect.top) / rect.height) * 600;
    if (y < FRONT && x > L && x < R) dropAt(x);
  }

  return {
    init(e, h) {
      els = e; hooks = h; canvas = e.canvas; ctx = Kit.setup(canvas);
      machine = MACHINES.find(m => m.type === 'pusher');
      fill();
      loop = Kit.loop(update, draw);
      canvas.addEventListener('pointerdown', onPointer);
    },
    // 특별 뽑기 시작/종료 때 기계 안 인형을 새로 채움 (게임 중이면 다음에)
    restock() { for (const it of items) if (it.kind === 'doll') it.doll = pickDoll(machine.id); draw(); return true; },
    open(m) { machine = m; setUI(); draw(); },
    start() { loop.start(); },
    stop() { loop.stop(); },
    action() { dropAt(dropX); },
    get state() { return 'idle'; },
    stats: () => ({ ...session, onField: items.length }),
    refresh() { if (els) setUI(); },
    preview: m => Kit.preview(m, drawScene),
  };
})();
