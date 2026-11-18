// 캔버스형 뽑기 기계들이 같이 쓰는 도구
const Kit = {
  W: 420, H: 600,
  setup(canvas) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 420 * dpr; canvas.height = 600 * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  },
  bg(c, m) {
    const g = c.createLinearGradient(0, 0, 0, 600);
    g.addColorStop(0, m.theme.inside[0]); g.addColorStop(1, m.theme.inside[1]);
    c.fillStyle = g; c.fillRect(0, 0, 420, 600);
  },
  rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); },
  // 매장 진열용 썸네일 (위쪽 240px만 보임)
  preview(m, drawScene) {
    const S = 240, cv = document.createElement('canvas');
    cv.width = cv.height = S * 2;
    const c = cv.getContext('2d');
    c.scale(2, 2);
    const g = c.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, m.theme.inside[0]); g.addColorStop(1, m.theme.inside[1]);
    c.fillStyle = g; c.fillRect(0, 0, S, S);
    c.translate((S - 420 * 0.4) / 2, 0); c.scale(0.4, 0.4);
    drawScene(c, m, false);
    return cv.toDataURL();
  },
  // update(dt) + draw() 를 매 프레임 호출하는 루프
  loop(update, draw) {
    let running = false, raf = 0, last = 0;
    const frame = now => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      update(dt); draw();
      raf = requestAnimationFrame(frame);
    };
    return {
      start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
      stop() { running = false; cancelAnimationFrame(raf); },
    };
  },
  // 코인 없을 때 공통 문구
  idleMsg: hooks => (hooks.coins() > 0 ? '코인을 넣어주세요' : '코인이 없어요! 매장의 교환기로'),
};
