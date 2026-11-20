/* Global Nova Technologies: smooth scroll + scroll animations
   - Inertia smooth scrolling on desktop (mouse wheel / trackpad)
   - Fast, eased keyboard scrolling (Arrow keys, PageUp/Down, Space, Home/End)
   - Scroll-triggered reveal animations, auto-applied to every page the router renders
   - Image parallax tied to the scroll engine
   Touch devices keep native scrolling (it is already smooth there). */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desktop = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const root = document.documentElement;

  /* ---------------- Smooth scroll engine ---------------- */
  let target = scrollY, current = scrollY, running = false, ours = false;
  const maxY = () => root.scrollHeight - innerHeight;
  const clamp = v => Math.max(0, Math.min(maxY(), v));
  const EASE = 0.085;          // lower = floatier, higher = snappier

  function tick() {
    const d = target - current;
    current = Math.abs(d) < 0.4 ? target : current + d * EASE;
    ours = true;
    scrollTo(0, current);
    if (current !== target) requestAnimationFrame(tick);
    else running = false;
  }
  function go(y) {
    target = clamp(y);
    if (!running) { running = true; current = scrollY; requestAnimationFrame(tick); }
  }
  // Any scroll we did not cause (scrollbar drag, route change, find-in-page) wins.
  addEventListener("scroll", () => {
    if (ours) { ours = false; return; }
    if (!running) target = current = scrollY;
  }, { passive: true });

  function scrollableParent(el) {
    for (; el && el !== document.body; el = el.parentElement) {
      const s = getComputedStyle(el);
      if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1) return el;
    }
    return null;
  }

  if (desktop && !reduce) {
    root.style.scrollBehavior = "auto";
    addEventListener("wheel", e => {
      if (e.ctrlKey || e.defaultPrevented || scrollableParent(e.target)) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1;
      go((running ? target : scrollY) + e.deltaY * unit * 1.05);
    }, { passive: false });
  }

  addEventListener("keydown", e => {
    if (reduce || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (t.closest && t.closest("input,textarea,select,[contenteditable],button[aria-haspopup],.language-menu")) return;
    // Arrow keys: cinematic glide. Holding the key cruises at a steady, slow
    // speed (good for screen recordings); releasing it eases to a stop.
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      cruiseDir = e.key === "ArrowDown" ? 1 : -1;
      if (!e.repeat && Math.abs(cruiseV) < CRUISE_SPEED * 0.5) { cruiseV = cruiseDir * CRUISE_SPEED * 0.6; cruiseY = scrollY; lastT = 0; }
      if (!cruising) { cruising = true; requestAnimationFrame(cruise); }
      return;
    }
    const base = running ? target : scrollY;
    const step = { PageDown: 0.85, PageUp: -0.85 }[e.key];
    let y = null;
    if (step) y = base + step * innerHeight;
    else if (e.key === " " ) y = base + (e.shiftKey ? -0.85 : 0.85) * innerHeight;
    else if (e.key === "Home") y = 0;
    else if (e.key === "End") y = maxY();
    if (y === null) return;
    e.preventDefault();
    go(y);
  });

  /* Arrow-key cruise: speed in px per second. Lower CRUISE_SPEED = slower glide. */
  const CRUISE_SPEED = 520, ACCEL = 0.035, DECEL = 0.045;
  let cruising = false, cruiseDir = 0, cruiseV = 0, cruiseY = 0, lastT = 0;
  function cruise(t) {
    if (!lastT) { lastT = t; cruiseY = scrollY; }
    const dt = Math.min(50, t - lastT) / 1000; lastT = t;
    const want = cruiseDir * CRUISE_SPEED;
    cruiseV += (want - cruiseV) * (cruiseDir ? ACCEL : DECEL) * 60 * dt;
    cruiseY = Math.max(0, Math.min(maxY(), cruiseY + cruiseV * dt));
    running = false; target = current = cruiseY; ours = true;
    scrollTo(0, cruiseY);
    if (cruiseDir || Math.abs(cruiseV) > 4) requestAnimationFrame(cruise);
    else { cruising = false; cruiseV = 0; lastT = 0; }
  }
  addEventListener("keyup", e => {
    if ((e.key === "ArrowDown" && cruiseDir === 1) || (e.key === "ArrowUp" && cruiseDir === -1)) cruiseDir = 0;
  });
  addEventListener("blur", () => { cruiseDir = 0; });

  // Page change: the router jumps to the top; stop any glide still in progress.
  addEventListener("hashchange", () => { target = current = scrollY; });

  window.gntScrollTo = go;  // usable by buttons: gntScrollTo(element.offsetTop)

  /* ---------------- Scroll reveal animations ---------------- */
  if (reduce) return;
  root.classList.add("fx-on");

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add("fx-in");
    io.unobserve(e.target);
  }), { rootMargin: "0px 0px -9% 0px", threshold: 0.08 });

  const parallax = new Set();

  function tag(el, kind, delay = 0) {
    if (!el || el.dataset.fx || el.classList.contains("rv") || el.closest("[data-fx], .hero, .ph, header")) return;
    el.dataset.fx = kind;
    if (delay) el.style.setProperty("--fx-d", delay + "ms");
    io.observe(el);
  }

  function apply(scope) {
    // Section titles: wipe up from a mask
    scope.querySelectorAll("h1, h2").forEach(h => tag(h, "title"));
    // Eyebrows / small labels above titles
    scope.querySelectorAll(".eyebrow, .tag, .kicker, .ph small").forEach(x => tag(x, "pop"));
    // Paragraph copy (not inside cards; cards animate as a unit)
    scope.querySelectorAll("section p, .ph p, .hero p").forEach(p => {
      if (!p.closest(".card, form, [data-fx]")) tag(p, "up", 120);
    });
    // Grids: cards rise in 3D with a stagger
    scope.querySelectorAll(".g3, .g2, .g4, .team-grid, .social-grid, [class*='grid']").forEach(g => {
      [...g.children].forEach((c, i) => tag(c, "card", (i % 6) * 85));
    });
    scope.querySelectorAll(".card").forEach((c, i) => tag(c, "card", (i % 3) * 85));
    // Big imagery: curtain wipe + zoom settle + parallax
    scope.querySelectorAll(".vis, .about-image, .blog-feature-image").forEach(v => {
      if (v.closest(".card") && !v.classList.contains("blog-feature-image")) return;
      tag(v, "img");
      const img = v.querySelector("img");
      if (img) { img.classList.add("fx-par"); parallax.add(img); }
    });
    // Two-column splits: columns slide in from opposite sides
    scope.querySelectorAll(".split").forEach(s => {
      const [a, b] = s.children;
      if (a && !a.dataset.fx) tag(a, "left");
      if (b && !b.dataset.fx) tag(b, "right", 120);
    });
    // Buttons and stats
    scope.querySelectorAll(".btn, .button, [data-n]").forEach((b, i) => tag(b, "pop", 160 + (i % 3) * 70));
    // Anything still left as a section child gets a soft rise
    scope.querySelectorAll("section > .wrap > *").forEach(x => { if (!x.querySelector("[data-fx]")) tag(x, "up"); });
  }

  function rescue() {
    document.querySelectorAll("[data-fx]:not(.fx-in)").forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) el.classList.add("fx-in");
    });
  }
  setInterval(rescue, 1200);

  function refresh() {
    parallax.forEach(i => { if (!document.contains(i)) parallax.delete(i); });
    const app = document.getElementById("app");
    if (app) apply(app);
    const ft = document.getElementById("ft");
    if (ft) ft.querySelectorAll(".fg > *").forEach((c, i) => tag(c, "up", i * 90));
  }

  // The site is a single-page app: re-apply after every route render.
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; refresh(); }); };
  const start = () => {
    refresh();
    const app = document.getElementById("app");
    if (app) new MutationObserver(later).observe(app, { childList: true, subtree: true });
  };
  document.readyState === "loading" ? addEventListener("DOMContentLoaded", start) : start();

  /* ---------------- Parallax (one rAF loop, visible images only) ---------------- */
  let lastY = -1;
  (function loop() {
    const y = scrollY;
    if (y !== lastY) {
      lastY = y;
      const vh = innerHeight;
      parallax.forEach(img => {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const p = (r.top + r.height / 2 - vh / 2) / vh;   // -1..1 around viewport centre
        img.style.setProperty("--fx-py", (p * -38).toFixed(1) + "px");
      });
    }
    requestAnimationFrame(loop);
  })();
})();
