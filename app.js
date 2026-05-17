/* ══════════════════════════════════════════════════════
   ЗКС — ScrollCanvas Engine
   ══════════════════════════════════════════════════════ */

const TOTAL_FRAMES = 1;          // placeholder — no frames yet
const PAGE_COUNT   = 5;
const LERP         = 0.07;
const CONCURRENCY  = 48;
const isMobile     = window.innerWidth < 768;
const FRAME_DIR    = isMobile ? 'frames-mobile' : 'frames-webp';

// Canvas
const canvas = document.getElementById('gl-canvas');
const ctx    = canvas.getContext('2d');

let images       = [];
let currentFrame = 0;
let targetFrame  = 0;
let isReady      = false;
let hasFrames    = false;

/* ──────────────────────────────────────────────────────
   CANVAS RESIZE
────────────────────────────────────────────────────── */
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  if (!hasFrames) drawGradientBg();
  else if (isReady) drawFrame(Math.round(currentFrame));
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/* ──────────────────────────────────────────────────────
   GRADIENT BACKGROUND (fallback when no video frames)
────────────────────────────────────────────────────── */
function drawGradientBg() {
  const w = canvas.width, h = canvas.height;
  const progress = window.scrollY / (document.documentElement.scrollHeight - h || 1);

  // Dynamic night-mountain gradient
  const grad = ctx.createLinearGradient(0, 0, w * 0.6, h);
  const r1 = Math.round(7 + progress * 15);
  const g1 = Math.round(8 + progress * 10);
  const b1 = Math.round(20 + progress * 30);
  grad.addColorStop(0,   `rgb(${r1},${g1},${b1})`);
  grad.addColorStop(0.4, `rgb(${r1+8},${g1+5},${b1+10})`);
  grad.addColorStop(1,   `rgb(${r1+3},${g1+2},${b1+5})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Mountain silhouette
  drawMountains(progress);

  // Stars
  drawStars(progress);

  // Golden glow at horizon
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.55, 0, w * 0.5, h * 0.55, w * 0.5);
  glow.addColorStop(0,   `rgba(201,168,76,${0.04 + progress * 0.06})`);
  glow.addColorStop(0.5, `rgba(201,168,76,0.01)`);
  glow.addColorStop(1,   'rgba(201,168,76,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

/* Procedural mountain silhouettes */
function drawMountains(progress) {
  const w = canvas.width, h = canvas.height;
  const baseY = h * 0.55;

  // Far range
  ctx.beginPath();
  ctx.moveTo(0, h);
  const pts1 = [
    [0.05,0.50],[0.13,0.35],[0.20,0.42],[0.28,0.28],[0.35,0.40],
    [0.42,0.25],[0.50,0.38],[0.58,0.22],[0.65,0.35],[0.72,0.28],
    [0.80,0.40],[0.88,0.32],[0.95,0.45],[1.0,0.52]
  ];
  pts1.forEach(([x,y]) => ctx.lineTo(w*x, h*(y + progress*0.05)));
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = 'rgba(12,16,32,0.95)';
  ctx.fill();

  // Near range
  ctx.beginPath();
  ctx.moveTo(0, h);
  const pts2 = [
    [0.0,0.72],[0.08,0.62],[0.15,0.55],[0.22,0.63],[0.30,0.50],
    [0.38,0.60],[0.45,0.48],[0.52,0.58],[0.60,0.46],[0.68,0.57],
    [0.75,0.50],[0.83,0.62],[0.90,0.55],[1.0,0.68]
  ];
  pts2.forEach(([x,y]) => ctx.lineTo(w*x, h*(y + progress*0.03)));
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = 'rgba(8,11,22,0.98)';
  ctx.fill();

  // Snow caps
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  [[0.28,0.28],[0.42,0.25],[0.58,0.22],[0.72,0.28]].forEach(([x,y]) => {
    const px = w*x, py = h*(y + progress*0.05);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - w*0.025, py + h*0.04);
    ctx.lineTo(px + w*0.025, py + h*0.04);
    ctx.closePath();
    ctx.fill();
  });
}

/* Procedural star field */
function drawStars(progress) {
  const w = canvas.width, h = canvas.height;
  const seed = 42;
  ctx.fillStyle = `rgba(255,255,255,${0.6 - progress * 0.3})`;
  for (let i = 0; i < 180; i++) {
    const sx = ((Math.sin(i * 127.1 + seed) * 0.5 + 0.5)) * w;
    const sy = ((Math.sin(i * 311.7 + seed) * 0.5 + 0.5)) * h * 0.5;
    const sr = 0.5 + (Math.sin(i * 91.3) * 0.5 + 0.5) * 1.2;
    const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() * 0.001 + i));
    ctx.globalAlpha = twinkle * (0.6 - progress * 0.3);
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ──────────────────────────────────────────────────────
   FRAME LOADER (video frames if available)
────────────────────────────────────────────────────── */
function pad(n, len = 6) { return String(n).padStart(len, '0'); }

async function loadFrame(idx) {
  return new Promise((resolve) => {
    const img = new Image();
    const frameNum = idx + 1;
    img.src = `${FRAME_DIR}/frame_${pad(frameNum)}.webp`;
    img.onload = () => { img.decode?.().catch(()=>{}).finally(() => { images[idx] = img; resolve(); }); };
    img.onerror = () => resolve();
  });
}

function drawFrame(idx) {
  const img = images[Math.max(0, Math.min(idx, images.length - 1))];
  if (!img) return;
  const sw = canvas.width / img.naturalWidth;
  const sh = canvas.height / img.naturalHeight;
  const scale = Math.max(sw, sh);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = (canvas.width - dw) / 2;
  const dy = (canvas.height - dh) / 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, dx, dy, dw, dh);
}

async function tryLoadFrames() {
  // probe frame 1
  const probe = new Image();
  probe.src = `${FRAME_DIR}/frame_000001.webp`;
  await new Promise(r => { probe.onload = r; probe.onerror = r; });
  if (!probe.naturalWidth) return; // no frames — use gradient
  hasFrames = true;

  const ACTUAL_FRAMES = await detectFrameCount();
  const queue = Array.from({ length: ACTUAL_FRAMES }, (_, i) => i);
  let loaded = 0;

  async function worker() {
    while (queue.length > 0) {
      const idx = queue.shift();
      await loadFrame(idx);
      loaded++;
      const pct = Math.round((loaded / ACTUAL_FRAMES) * 100);
      document.getElementById('loader-bar').style.width = pct + '%';
      document.getElementById('loader-pct').textContent = pct + '%';
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
}

async function detectFrameCount() {
  let lo = 1, hi = 2000;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const probe = new Image();
    probe.src = `${FRAME_DIR}/frame_${pad(mid)}.webp`;
    const ok = await new Promise(r => { probe.onload = () => r(true); probe.onerror = () => r(false); });
    if (ok) lo = mid; else hi = mid - 1;
  }
  return lo;
}

/* ──────────────────────────────────────────────────────
   ANIMATION LOOP
────────────────────────────────────────────────────── */
function animate() {
  requestAnimationFrame(animate);
  if (hasFrames && isReady) {
    currentFrame += (targetFrame - currentFrame) * LERP;
    drawFrame(Math.round(currentFrame));
  } else {
    drawGradientBg();
  }
}
animate();

/* ──────────────────────────────────────────────────────
   SCROLL → FRAME
────────────────────────────────────────────────────── */
window.addEventListener('scroll', () => {
  if (!isReady || !hasFrames) return;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress  = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  targetFrame = progress * (images.length - 1);
}, { passive: true });

/* ──────────────────────────────────────────────────────
   INTERSECTION OBSERVER (section reveal)
────────────────────────────────────────────────────── */
const pages = Array.from(document.querySelectorAll('.page'));
const navLinks = Array.from(document.querySelectorAll('.nav-link'));
const drawerLinks = Array.from(document.querySelectorAll('.drawer-link'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-active');
      const idx = pages.indexOf(entry.target);
      navLinks.forEach((l, i) => l.classList.toggle('active', i === idx - 1));
      drawerLinks.forEach((l, i) => l.classList.toggle('active', i === idx - 1));
    }
  });
}, { root: null, rootMargin: '-35% 0px -35% 0px', threshold: 0 });

pages.forEach(p => observer.observe(p));

/* ──────────────────────────────────────────────────────
   NAV SCROLL-TO
────────────────────────────────────────────────────── */
function scrollToSection(idx) {
  const target = pages[parseInt(idx)];
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.querySelectorAll('[data-scroll]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    scrollToSection(el.dataset.scroll);
    // close drawer if open
    closeDrawer();
  });
});

/* ──────────────────────────────────────────────────────
   MOBILE DRAWER
────────────────────────────────────────────────────── */
const burger  = document.getElementById('nav-burger');
const drawer  = document.getElementById('nav-drawer');
const scrim   = document.getElementById('nav-scrim');
const closBtn = document.getElementById('drawer-close');

function openDrawer()  { drawer.hidden = false; scrim.hidden = false; document.body.style.overflow = 'hidden'; }
function closeDrawer() { drawer.hidden = true;  scrim.hidden = true;  document.body.style.overflow = ''; }

burger?.addEventListener('click', openDrawer);
closBtn?.addEventListener('click', closeDrawer);
scrim?.addEventListener('click', closeDrawer);

/* ──────────────────────────────────────────────────────
   NAVBAR transparency on scroll
────────────────────────────────────────────────────── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 80) {
    navbar.style.background = 'rgba(7,8,13,0.95)';
  } else {
    navbar.style.background = 'rgba(7,8,13,0.85)';
  }
}, { passive: true });

/* ──────────────────────────────────────────────────────
   CONTACT FORM
────────────────────────────────────────────────────── */
const form        = document.getElementById('contact-form');
const formSuccess = document.getElementById('form-success');

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const btn = document.getElementById('form-submit');
  btn.textContent = 'Отправляем...';
  btn.disabled = true;
  setTimeout(() => {
    form.hidden = true;
    formSuccess.hidden = false;
  }, 1200);
});

/* ──────────────────────────────────────────────────────
   INIT SEQUENCE
────────────────────────────────────────────────────── */
async function init() {
  const loader    = document.getElementById('loader');
  const loaderBar = document.getElementById('loader-bar');
  const loaderPct = document.getElementById('loader-pct');

  // Try to load video frames; fall back gracefully
  try {
    await tryLoadFrames();
  } catch(e) {
    console.info('No frames — using procedural background');
  }

  // Simulate min loader time for brand feel
  if (!hasFrames) {
    let fakeProgress = 0;
    await new Promise(resolve => {
      const interval = setInterval(() => {
        fakeProgress = Math.min(fakeProgress + Math.random() * 15, 100);
        loaderBar.style.width = fakeProgress + '%';
        loaderPct.textContent = Math.round(fakeProgress) + '%';
        if (fakeProgress >= 100) { clearInterval(interval); resolve(); }
      }, 80);
    });
  }

  await new Promise(r => setTimeout(r, 300));

  // Hide loader
  loader.classList.add('hidden');
  setTimeout(() => { loader.style.display = 'none'; }, 700);

  isReady = true;

  // Activate hero immediately
  pages[0]?.classList.add('is-active');
}

init();
