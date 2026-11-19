// 당첨 연출: 등급이 높을수록 더 화려하게 (꽃가루 · 반짝이 · 폭죽 · 번쩍임 · 흔들림 · 효과음)
const Celebrate = (() => {
  const LV = { D: 0, C: 1, B: 2, A: 3, S: 4 };
  const COLORS = {
    S: ['#ffd23f', '#fff3a8', '#ff9f1c', '#ffffff', '#ff6fae', '#5ee6ff'],
    A: ['#ff8c42', '#ffd23f', '#ffffff', '#ff6fae'],
    B: ['#c77dff', '#e0aaff', '#ffffff', '#5ee6ff'],
    C: ['#5bc0eb', '#9be7ff', '#ffffff', '#8bd17c'],
    D: ['#8bd17c', '#d4ffb0', '#ffffff'],
  };
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------- 파티클 ----------------
  let cv, c, W = 0, H = 0, parts = [], raf = 0, last = 0;
  function ensure() {
    if (cv) return;
    cv = document.createElement('canvas');
    cv.className = 'fx-canvas';
    document.body.appendChild(cv);
    c = cv.getContext('2d');
    resize();
    addEventListener('resize', resize);
  }
  function resize() {
    const dpr = devicePixelRatio || 1;
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function confetti(x, y, n, cols, power) {
    for (let i = 0; i < n; i++) {
      const a = R(0, Math.PI * 2), s = R(0.3, 1) * power;
      parts.push({ k: 'c', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - power * 0.35, rot: R(0, 6.28), vr: R(-12, 12),
        w: R(6, 11), h: R(4, 7), col: pick(cols), life: R(1.6, 2.8), t: 0 });
    }
  }
  function sparks(x, y, n, cols, power) {
    for (let i = 0; i < n; i++) {
      const a = R(0, Math.PI * 2), s = R(0.2, 1) * power;
      parts.push({ k: 's', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: R(2, 5), col: pick(cols), life: R(0.6, 1.3), t: 0 });
    }
  }
  function ring(x, y, col, speed, delay = 0) {
    parts.push({ k: 'r', x, y, r: 10, vr: speed, col, life: 0.8, t: -delay });
  }
  function rain(n, cols, dur) {
    for (let i = 0; i < n; i++) {
      parts.push({ k: 'c', x: R(0, W), y: R(-60, -10), vx: R(-40, 40), vy: R(60, 200), rot: R(0, 6.28), vr: R(-10, 10),
        w: R(6, 11), h: R(4, 7), col: pick(cols), life: R(2.5, 4), t: -R(0, dur) });
    }
  }
  function firework(x, y, cols) {
    const col = pick(cols);
    sparks(x, y, 46, [col, '#ffffff'], 520);
    ring(x, y, col, 420);
    sound.pop();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    c.clearRect(0, 0, W, H);
    parts = parts.filter(p => (p.t += dt) < p.life);
    for (const p of parts) {
      if (p.t < 0) continue;
      const fade = Math.min(1, (p.life - p.t) / 0.5);
      if (p.k === 'c') {
        p.vy += 520 * dt; p.vx *= Math.exp(-1.6 * dt); p.vy *= Math.exp(-1.2 * dt);
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        c.save(); c.globalAlpha = fade; c.translate(p.x, p.y); c.rotate(p.rot);
        c.scale(1, Math.cos(p.rot * 2.3)); c.fillStyle = p.col; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); c.restore();
      } else if (p.k === 's') {
        if (!p.lin) { p.vy += 160 * dt; p.vx *= Math.exp(-2.4 * dt); p.vy *= Math.exp(-2.4 * dt); }
        p.x += p.vx * dt; p.y += p.vy * dt;
        c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = fade;
        c.fillStyle = p.col; c.shadowColor = p.col; c.shadowBlur = 12;
        star(p.x, p.y, p.r * (1 + 0.3 * Math.sin(p.t * 20))); c.fill(); c.restore();
      } else if (p.k === 'r') {
        p.r += p.vr * dt;
        c.save(); c.globalAlpha = (1 - p.t / p.life) * 0.9; c.strokeStyle = p.col; c.lineWidth = 6 * (1 - p.t / p.life) + 1;
        c.shadowColor = p.col; c.shadowBlur = 16;
        c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.stroke(); c.restore();
      }
    }
    if (parts.length) raf = requestAnimationFrame(frame);
    else { raf = 0; c.clearRect(0, 0, W, H); }
  }
  function star(x, y, r) {
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4, rr = i % 2 ? r * 0.35 : r;
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
  }
  function run() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  // ---------------- 화면 번쩍임 · 흔들림 ----------------
  function flash(col, strength) {
    const f = document.createElement('div');
    f.className = 'fx-flash';
    f.style.background = `radial-gradient(circle at 50% 45%, #fff, ${col} 45%, transparent 75%)`;
    f.style.setProperty('--o', strength);
    document.body.appendChild(f);
    f.addEventListener('animationend', () => f.remove());
  }
  function shake(el, lv) {
    if (!el) return;
    el.classList.remove('fx-shake-3', 'fx-shake-4'); void el.offsetWidth;
    el.classList.add(`fx-shake-${lv}`);
    setTimeout(() => el.classList.remove(`fx-shake-${lv}`), 700);
  }

  // ---------------- 효과음 (WebAudio로 직접 합성) ----------------
  const SOUND_KEY = 'mongle-sound';
  const sound = (() => {
    let ac = null;
    const on = () => { try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch (e) { return true; } };
    const ctx = () => {
      if (!on()) return null;
      if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    };
    // 소리는 사용자가 한 번이라도 누른 뒤에만 낼 수 있어서 첫 클릭 때 준비
    addEventListener('pointerdown', () => ctx(), { once: true });
    function tone(freq, at, dur, type = 'triangle', vol = 0.12, slideTo) {
      const a = ctx(); if (!a) return;
      const t = a.currentTime + at;
      const o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(a.destination);
      o.start(t); o.stop(t + dur + 0.05);
    }
    const N = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 2093];
    return {
      get on() { return on(); },
      toggle() { try { localStorage.setItem(SOUND_KEY, on() ? 'off' : 'on'); } catch (e) {} return on(); },
      pop() { tone(R(500, 900), 0, 0.25, 'sine', 0.06, 120); },
      charge(lv) {   // 두근두근 올라가는 소리
        const d = lv === 4 ? 1.3 : 0.75;
        tone(180, 0, d, 'sawtooth', 0.05, lv === 4 ? 1400 : 900);
        for (let i = 0; i < (lv === 4 ? 8 : 4); i++) tone(N[i % 5] / 2, i * (d / (lv === 4 ? 8 : 4)), 0.12, 'square', 0.03);
      },
      win(lv) {
        if (lv === 0) { tone(N[0], 0, 0.15); tone(N[2], 0.08, 0.25); return; }
        if (lv === 1) { [0, 2, 4].forEach((n, i) => tone(N[n], i * 0.07, 0.3)); return; }
        if (lv === 2) { [0, 2, 4, 5].forEach((n, i) => tone(N[n], i * 0.07, 0.35)); [7, 9].forEach((n, i) => tone(N[n], 0.35 + i * 0.06, 0.3, 'sine', 0.06)); return; }
        // A, S: 팡파레 + 화음 + 반짝반짝
        const steps = lv === 4 ? [0, 2, 4, 5, 7, 9] : [0, 2, 4, 5];
        steps.forEach((n, i) => tone(N[n], i * 0.08, 0.3, 'square', 0.05));
        const at = steps.length * 0.08;
        [5, 7, 9].forEach(n => tone(N[n], at, lv === 4 ? 1.6 : 1.0, 'triangle', 0.09));
        [0, 2, 4].forEach(n => tone(N[n] / 2, at, lv === 4 ? 1.6 : 1.0, 'sawtooth', 0.025));
        for (let i = 0; i < (lv === 4 ? 14 : 6); i++) tone(R(1800, 3200), at + 0.1 + i * 0.07, 0.15, 'sine', 0.035);
      },
    };
  })();

  // ---------------- 공개 ----------------
  // 당첨 순간 터뜨리기. x,y = 인형이 보이는 위치
  function burst(grade, x, y, opts = {}) {
    const lv = LV[grade] ?? 0, cols = COLORS[grade] || COLORS.D;
    sound.win(lv);
    if (reduce()) return;
    ensure();
    x = x ?? W / 2; y = y ?? H / 2;
    confetti(x, y, [14, 40, 80, 140, 220][lv], cols, [380, 520, 640, 760, 900][lv]);
    sparks(x, y, [10, 18, 30, 50, 80][lv], cols, [220, 300, 380, 460, 560][lv]);
    for (let i = 0; i < lv; i++) ring(x, y, cols[i % cols.length], 380 + i * 90, i * 0.12);
    if (lv >= 3) { flash(cols[0], lv === 4 ? 0.95 : 0.6); shake(opts.shakeEl, lv); }
    if (lv >= 3) rain(lv === 4 ? 160 : 60, cols, lv === 4 ? 2.2 : 1.2);
    if (lv >= 3) {
      const n = lv === 4 ? 7 : 2;
      for (let i = 0; i < n; i++) setTimeout(() => firework(R(W * 0.12, W * 0.88), R(H * 0.12, H * 0.5), cols), 250 + i * (lv === 4 ? 320 : 380));
    }
    if (opts.isNew && lv < 3) sparks(x, y - 40, 20, ['#ffffff', '#ffe066'], 260);
    run();
  }
  // A·S 등급: 공개 직전 두근두근 (빛이 모여드는 연출)
  function charge(grade, x, y) {
    const lv = LV[grade] ?? 0;
    sound.charge(lv);
    if (reduce()) return;
    ensure();
    x = x ?? W / 2; y = y ?? H / 2;
    const cols = COLORS[grade];
    const dur = lv === 4 ? 1.3 : 0.75;
    for (let i = 0; i < (lv === 4 ? 70 : 35); i++) {
      const a = R(0, 6.28), d = R(140, 320), delay = R(0, dur * 0.8);
      const life = dur - delay;
      parts.push({ k: 's', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: -Math.cos(a) * d / life, vy: -Math.sin(a) * d / life,
        r: R(2, 4), col: pick(cols), life, t: -delay, lin: true });
    }
    run();
  }

  return { burst, charge, sound, LV };
})();
