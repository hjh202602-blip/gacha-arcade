// 인형뽑기 기계: 캔버스 물리 + 집게 상태 머신
const ClawGame = (() => {
  // 기계 내부 좌표 (캔버스 논리 크기 420x600)
  const W = 420, H = 600;
  const LEFT = 20, RIGHT = 400, FLOOR = 520;
  const CHUTE_X = 112, DIV_W = 8, DIV_TOP = 450; // 왼쪽 아래가 상품 출구
  const HOME_X = 66, HOME_Y = 70, RAIL_Y = 46;
  const GRAVITY = 1400;
  const HEAD_BOTTOM = 16, TIP = 50, GRIP_Y = 36;
  const PLAY_TIME = 20;

  let canvas, ctx, hooks = {};
  let raf = 0, last = 0, acc = 0, running = false;
  let prizes = [];
  let claw;
  const input = { left: false, right: false };

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));

  function newClaw() {
    return { x: HOME_X, y: HOME_Y, vx: 0, vy: 0, open: 0, closeTo: 0,
             state: 'idle', t: 0, timer: 0, held: null, target: null,
             willHold: false, slipTime: -1, turns: 0, lastDir: 0 };
  }

  let machine = MACHINES[0];

  function makePrize(x, y) {
    const doll = pickDoll(machine.id);
    return { doll, x, y, vx: rand(-20, 20), vy: 0, r: GRADES[doll.grade].r, a: rand(-0.3, 0.3) };
  }

  function fillPile() {
    prizes = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        const x = 150 + col * 54 + (row % 2) * 20 + rand(-4, 4);
        prizes.push(makePrize(Math.min(x, RIGHT - 30), FLOOR - 30 - row * 52));
      }
    }
    for (let i = 0; i < 720; i++) step(1 / 120, true); // 미리 쌓아두기
  }

  // ---------- 물리 ----------
  function step(dt, silent) {
    updateClaw(dt);
    for (const p of prizes) {
      if (p === claw.held) continue;
      p.vy += GRAVITY * dt;
      p.vx *= 0.996;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.a += (p.vx / p.r) * dt * 0.5;
      p.a *= 0.995;
    }
    for (let k = 0; k < 4; k++) {
      collidePairs();
      for (const p of prizes) if (p !== claw.held) collideWorld(p);
    }
    // 출구로 떨어진 상품 = 당첨
    for (let i = prizes.length - 1; i >= 0; i--) {
      const p = prizes[i];
      if (p.y - p.r > H) {
        prizes.splice(i, 1);
        if (!silent) {
          hooks.onWin && hooks.onWin(p.doll, machine);
          prizes.push(makePrize(rand(CHUTE_X + 50, RIGHT - 40), 30)); // 새 인형 보충
        }
      }
    }
  }

  function collideWorld(p) {
    if (p.x - p.r < LEFT) { p.x = LEFT + p.r; if (p.vx < 0) p.vx *= -0.3; }
    if (p.x + p.r > RIGHT) { p.x = RIGHT - p.r; if (p.vx > 0) p.vx *= -0.3; }
    if (p.x > CHUTE_X && p.y + p.r > FLOOR) {
      p.y = FLOOR - p.r;
      if (p.vy > 0) p.vy *= -0.15;
      p.vx *= 0.9;
    }
    // 출구 칸막이 (사각형)
    const cx = clamp(p.x, CHUTE_X, CHUTE_X + DIV_W);
    const cy = clamp(p.y, DIV_TOP, FLOOR + 40);
    const dx = p.x - cx, dy = p.y - cy, d2 = dx * dx + dy * dy;
    if (d2 < p.r * p.r && d2 > 1e-6) {
      const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
      p.x += nx * (p.r - d); p.y += ny * (p.r - d);
      const vn = p.vx * nx + p.vy * ny;
      if (vn < 0) { p.vx -= 1.3 * vn * nx; p.vy -= 1.3 * vn * ny; }
      if (ny < -0.98) p.vx += (Math.random() < 0.5 ? -8 : 8); // 칸막이 위에 걸치지 않게
    }
  }

  function collidePairs() {
    const held = claw.held;
    for (let i = 0; i < prizes.length; i++) {
      for (let j = i + 1; j < prizes.length; j++) {
        const a = prizes[i], b = prizes[j];
        const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 < 1e-6) continue;
        const ia = a === held ? 0 : 1, ib = b === held ? 0 : 1;
        if (ia + ib === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
        const s = (rr - d) / (ia + ib);
        a.x -= nx * s * ia; a.y -= ny * s * ia;
        b.x += nx * s * ib; b.y += ny * s * ib;
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) {
          const imp = -1.1 * rv / (ia + ib);
          a.vx -= imp * nx * ia; a.vy -= imp * ny * ia;
          b.vx += imp * nx * ib; b.vy += imp * ny * ib;
        }
        // 마찰
        const tx = -ny, ty = nx;
        const tv = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
        const f = tv * 0.05 / (ia + ib);
        a.vx += f * tx * ia; a.vy += f * ty * ia;
        b.vx -= f * tx * ib; b.vy -= f * ty * ib;
      }
    }
  }

  // ---------- 집게 ----------
  function contactTipY(c) {
    let y = FLOOR - 4;
    for (const p of prizes) {
      if (Math.abs(p.x - c.x) < p.r * 0.9) y = Math.min(y, p.y - p.r + (TIP - HEAD_BOTTOM));
    }
    return y;
  }

  // 정중앙으로 치는 범위 (q = 1 - 중심에서 벗어난 거리 / 인형 반지름)
  // 쉬운 기계는 넓게, 어려운 기계는 좁게
  const centerZone = m => (m.level >= 4 ? 0.86 : m.level >= 3 ? 0.82 : 0.74);
  const NEAR_ZONE = 0.4;

  // 숨겨진 행동 (기계마다 다름) → 맞으면 hooks.secret()이 일정 확률로 히든 인형을 줌
  const CLAW_SECRET = {
    animal: c => c.x < CHUTE_X,                // 빈 출구 위에서 내리기
    dessert: (c, auto) => auto,                // 시간이 다 될 때까지 기다리기
    space: c => c.x >= RIGHT - 32,             // 오른쪽 끝 벽에 붙여 내리기
    treasure: c => c.turns >= 10,              // 좌우로 10번 넘게 방향 바꾸기
  };
  function secretOnDrop(c, auto) {
    const f = CLAW_SECRET[machine.id];
    if (f && f(c, auto) && hooks.secret) hooks.secret();
  }

  function startClose(c) {
    const gx = c.x, gy = c.y + GRIP_Y;
    let best = null, bd = Infinity;
    for (const p of prizes) {
      const d = Math.hypot(p.x - gx, p.y - gy);
      if (d < p.r + 14 && d < bd) { best = p; bd = d; }
    }
    c.target = best;
    c.willHold = false;
    c.closeTo = 0;
    c.slipChance = 0;
    if (best) {
      const q = 1 - Math.min(1, Math.abs(best.x - gx) / best.r); // 중앙에 가까울수록 1
      const g = GRADES[best.doll.grade];
      // 잡는 위치를 세 구역으로 나눔
      //  정중앙: 거의 확실히 들어 올림 (어려운 기계일수록 구역이 좁음)
      //  가까움: 가까울수록 들어 올릴 확률이 오르고, 들고 가다 떨어뜨릴 확률은 10% 미만
      //  옆:    못 잡고 옆으로 밀려남 (중앙에 가까웠을수록 세게 밀림)
      const zc = centerZone(machine), zn = NEAR_ZONE;
      const zone = q >= zc ? 'center' : q >= zn ? 'near' : 'side';
      const gradeHold = 0.55 + 0.45 * g.hold;            // D 1.0 … S 0.75
      const power = 0.6 + 0.4 * machine.power;           // 집게 힘 100% → 1.0, 65% → 0.86
      let lift = 0, drop = 0;
      if (zone === 'center') {
        lift = 0.97 * gradeHold * power;
        drop = 0.01 + g.slip * 0.03;                     // D 1.8% … S 3.6%
      } else if (zone === 'near') {
        const k = (q - zn) / (zc - zn);                  // 0(옆 쪽) ~ 1(정중앙 쪽)
        // 어려운 기계(집게 힘이 약함)일수록 '가까움'으로는 잘 안 걸림
        lift = (0.12 + 0.5 * k) * gradeHold * machine.power ** 2;
        drop = 0.04 + g.slip * 0.05;                     // D 5.3% … S 8.3%
      }
      c.willHold = Math.random() < lift;
      c.slipChance = Math.min(0.095, drop);
      c.pushQ = q;
      hooks.onGrab && hooks.onGrab(q, zone);
      if (c.willHold) c.closeTo = best.r / 34;
    }
    c.state = 'close';
  }

  function updateClaw(dt) {
    const c = claw;
    const px = c.x, py = c.y;
    switch (c.state) {
      case 'idle':
        c.open = approach(c.open, 0, dt * 2);
        break;
      case 'ready': {
        c.timer -= dt;
        const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        if (dir && dir !== c.lastDir) { if (c.lastDir) c.turns++; c.lastDir = dir; }
        c.x = clamp(c.x + dir * 170 * dt, HOME_X, RIGHT - 30);
        c.open = approach(c.open, 0.3, dt * 2);
        if (c.timer <= 0) { c.timer = 0; c.state = 'drop'; secretOnDrop(c, true); }
        break;
      }
      case 'drop':
        c.open = approach(c.open, 1, dt * 3);
        c.y += 200 * dt;
        if (c.y + TIP >= contactTipY(c)) startClose(c);
        break;
      case 'close':
        c.open = approach(c.open, c.closeTo, dt * 2.5);
        if (c.open === c.closeTo) {
          const p = c.target;
          if (p && c.willHold) {
            c.held = p;
            const est = (c.y - HOME_Y) / 160 + (c.x - HOME_X) / 140;
            c.slipTime = Math.random() < c.slipChance ? rand(0.2, Math.max(0.3, est)) : -1;
          } else if (p) {
            // 못 잡으면 옆으로 밀려남. 중앙에 가까웠을수록 세게 밀림
            const k = c.pushQ || 0;
            p.vx += (p.x < c.x ? -1 : 1) * (50 + 210 * k) * rand(0.85, 1.15);
            p.vy -= 60 + 80 * k;
          }
          c.state = 'rise'; c.t = 0;
        }
        break;
      case 'rise':
        c.t += dt;
        c.y = Math.max(HOME_Y, c.y - 160 * dt);
        if (c.y === HOME_Y) c.state = 'return';
        break;
      case 'return':
        c.t += dt;
        c.x = approach(c.x, HOME_X, 140 * dt);
        if (c.x === HOME_X) { c.state = 'release'; c.t = 0; }
        break;
      case 'release':
        c.t += dt;
        c.open = approach(c.open, 1, dt * 3);
        if (c.held && c.open > 0.75) dropHeld(0, 0);
        if (c.t > 0.9) c.state = 'reset';
        break;
      case 'reset':
        c.open = approach(c.open, 0, dt * 2);
        if (c.open === 0) { c.state = 'idle'; hooks.onRoundEnd && hooks.onRoundEnd(); }
        break;
    }
    c.vx = (c.x - px) / dt;
    c.vy = (c.y - py) / dt;

    if (c.held) {
      // 올라가는 도중 미끄러짐
      if ((c.state === 'rise' || c.state === 'return') && c.slipTime >= 0 && c.t >= c.slipTime) {
        dropHeld(c.vx, c.vy);
        c.closeTo = 0.15;
      } else {
        const p = c.held, k = Math.min(1, dt * 15);
        p.x += (c.x - p.x) * k;
        p.y += (c.y + GRIP_Y - p.y) * k;
        p.a *= 0.95;
        p.vx = c.vx; p.vy = c.vy;
      }
    }
  }

  function dropHeld(vx, vy) {
    const p = claw.held;
    if (!p) return;
    p.vx = vx; p.vy = vy;
    claw.held = null;
    claw.slipTime = -1;
    if (claw.state !== 'release') hooks.onSlip && hooks.onSlip(p.doll);
  }

  // ---------- 그리기 ----------
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // 뒷벽
    const th = machine.theme;
    const bg = ctx.createLinearGradient(0, 0, 0, FLOOR);
    bg.addColorStop(0, th.inside[0]); bg.addColorStop(1, th.inside[1]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, FLOOR);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let y = 60; y < FLOOR; y += 36)
      for (let x = 30 + ((y / 36) % 2) * 18; x < W; x += 36) {
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      }

    // 바닥 & 아래 패널
    ctx.fillStyle = th.floor;
    ctx.fillRect(0, FLOOR, W, H - FLOOR);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(CHUTE_X, FLOOR, W - CHUTE_X, 6);

    // 출구 구멍
    const hole = ctx.createLinearGradient(0, DIV_TOP, 0, H);
    hole.addColorStop(0, 'rgba(0,0,0,0.15)'); hole.addColorStop(0.5, '#120818'); hole.addColorStop(1, '#000');
    ctx.fillStyle = hole;
    ctx.fillRect(LEFT, DIV_TOP, CHUTE_X - LEFT, H - DIV_TOP);
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('▼ 출구', (LEFT + CHUTE_X) / 2, FLOOR + 40);

    // 상품
    for (const p of prizes) drawPrize(p);

    // 칸막이 (아크릴)
    ctx.fillStyle = 'rgba(200,240,255,0.35)';
    ctx.fillRect(CHUTE_X, DIV_TOP, DIV_W, FLOOR - DIV_TOP);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(CHUTE_X, DIV_TOP, DIV_W, 3);

    drawClaw();

    // 레일
    ctx.fillStyle = '#c9c9d6';
    ctx.fillRect(LEFT, RAIL_Y - 5, RIGHT - LEFT, 6);
    ctx.fillStyle = '#8a8aa0';
    ctx.fillRect(LEFT, RAIL_Y + 1, RIGHT - LEFT, 2);

    // 유리 반사
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.moveTo(250, 0); ctx.lineTo(320, 0); ctx.lineTo(160, FLOOR); ctx.lineTo(90, FLOOR);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(340, 0); ctx.lineTo(356, 0); ctx.lineTo(196, FLOOR); ctx.lineTo(180, FLOOR);
    ctx.fill();

    // 양쪽 벽
    ctx.fillStyle = '#2a1030';
    ctx.fillRect(0, 0, LEFT, H);
    ctx.fillRect(RIGHT, 0, W - RIGHT, H);
  }

  function drawPrize(p) {
    const grade = p.doll.grade;
    if (grade === 'S' || grade === 'A') {
      const color = GRADES[grade].color;
      const pulse = grade === 'S' ? 1.5 + Math.sin(performance.now() / 300) * 0.15 : 1.4;
      const g = ctx.createRadialGradient(p.x, p.y, p.r * 0.3, p.x, p.y, p.r * pulse);
      g.addColorStop(0, color + 'aa'); g.addColorStop(1, color + '00');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2); ctx.fill();
    }
    DollArt.drawAt(ctx, p.doll, p.x, p.y, p.r, p.a);
  }

  function drawClaw() {
    const c = claw;
    // 조준 가이드선 (조작 중에만)
    if (c.state === 'ready') {
      ctx.save();
      ctx.strokeStyle = 'rgba(77,232,255,0.45)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
      ctx.beginPath(); ctx.moveTo(c.x, c.y + TIP + 4); ctx.lineTo(c.x, FLOOR); ctx.stroke();
      ctx.restore();
    }
    // 이동 카트
    ctx.fillStyle = '#555a70';
    ctx.fillRect(c.x - 18, RAIL_Y - 10, 36, 14);
    // 줄
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(c.x, RAIL_Y); ctx.lineTo(c.x, c.y - 8); ctx.stroke();
    // 집게 팔
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of [-1, 1]) {
      const elbowX = c.x + s * (14 + 16 * c.open);
      const tipX = c.x + s * (3 + 28 * c.open);
      ctx.strokeStyle = '#6f7388'; ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(c.x + s * 9, c.y + 12);
      ctx.lineTo(elbowX, c.y + 32);
      ctx.lineTo(tipX, c.y + TIP);
      ctx.lineTo(tipX - s * 7, c.y + TIP - 2);
      ctx.stroke();
      ctx.strokeStyle = '#d7dbe8'; ctx.lineWidth = 3;
      ctx.stroke();
    }
    // 집게 머리
    const g = ctx.createLinearGradient(c.x - 16, 0, c.x + 16, 0);
    g.addColorStop(0, '#8d91a6'); g.addColorStop(0.5, '#f0f2f8'); g.addColorStop(1, '#8d91a6');
    ctx.fillStyle = g;
    roundRect(c.x - 16, c.y - 8, 32, HEAD_BOTTOM + 8, 6);
    ctx.fill();
    ctx.fillStyle = c.state === 'ready' ? '#4de8ff' : '#ff5fa2';
    ctx.beginPath(); ctx.arc(c.x, c.y + 3, 3.5, 0, Math.PI * 2); ctx.fill();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function frame(t) {
    if (!running) return;
    acc += Math.min(0.05, (t - last) / 1000);
    last = t;
    const h = 1 / 120;
    while (acc >= h) { step(h); acc -= h; }
    draw();
    hooks.onTick && hooks.onTick(claw.state, claw.timer);
    raf = requestAnimationFrame(frame);
  }

  return {
    init(c, h) {
      canvas = c; ctx = c.getContext('2d'); hooks = h || {};
      resize();
      window.addEventListener('resize', resize);
      claw = newClaw();
    },
    // 다른 기계로 바꾸면 집게와 인형 더미를 새로 준비
    // 진행 중이던 판이 취소되면 true (호출한 쪽에서 코인을 돌려줌)
    setMachine(m) {
      if (machine === m && prizes.length) return false;
      const cancelled = !!claw && claw.state !== 'idle' && claw.state !== 'reset';
      machine = m;
      claw = newClaw();
      input.left = input.right = false;
      fillPile();
      draw();
      return cancelled;
    },
    // 기계 안 인형 구성이 바뀌었을 때(특별 뽑기 시작/종료) 쉬는 중이면 더미를 새로 채움
    refresh() {
      if (!claw || claw.state !== 'idle') return false;
      fillPile(); draw();
      return true;
    },
    start() {
      if (running) return;
      running = true; last = performance.now(); acc = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false; cancelAnimationFrame(raf);
      input.left = input.right = false;
    },
    // 코인을 내고 한 판 시작 (코인 차감은 hooks.spendCoin이 맡음)
    insertCoin() {
      if (claw.state !== 'idle' || !hooks.spendCoin || !hooks.spendCoin()) return false;
      claw.state = 'ready'; claw.timer = PLAY_TIME;
      return true;
    },
    drop() {
      if (claw.state === 'ready') { claw.state = 'drop'; secretOnDrop(claw, false); return true; }
      return false;
    },
    setInput(dir, on) { input[dir] = on; },
    get state() { return claw.state; },
  };
})();
