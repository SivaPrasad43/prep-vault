/**
 * Tiny dependency-free confetti burst on a temporary full-screen canvas.
 * No-op when the user prefers reduced motion.
 */
const COLORS = ['#68da23', '#120a3d', '#ffd400', '#ff2bd6', '#00f0ff', '#ff8a00', '#ffffff'];

export function confetti(opts: { count?: number; duration?: number } = {}): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const count = opts.count ?? 160;
  const duration = opts.duration ?? 2600;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '9999' });
  document.body.appendChild(canvas);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  const w = window.innerWidth;
  const h = window.innerHeight;
  const parts = Array.from({ length: count }, (_, i) => {
    const fromLeft = i % 2 === 0;
    return {
      x: fromLeft ? w * 0.2 : w * 0.8,
      y: h * 0.55,
      vx: (fromLeft ? 1 : -1) * (2 + Math.random() * 7) + (Math.random() - 0.5) * 3,
      vy: -(8 + Math.random() * 9),
      size: 5 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: COLORS[i % COLORS.length],
      shape: i % 3,
    };
  });

  const start = performance.now();
  const frame = (t: number) => {
    const elapsed = t - start;
    ctx.clearRect(0, 0, w, h);
    const fade = Math.max(0, 1 - Math.max(0, elapsed - duration * 0.6) / (duration * 0.4));
    for (const p of parts) {
      p.vy += 0.28;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 0) ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      else if (p.shape === 1) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -p.size / 2);
        ctx.lineTo(p.size / 2, p.size / 2);
        ctx.lineTo(-p.size / 2, p.size / 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (elapsed < duration) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
