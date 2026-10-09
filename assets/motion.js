/* =====================================================================
   Global Nova Technologies — Motion engine
   Scroll reveals, parallax, page transitions, smooth scroll, header.
   Content is never modified; only classes, attributes and inline styles.
   ===================================================================== */
(function () {
  "use strict";
  var d = document, root = d.documentElement, W = window;
  var RM = W.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINE = W.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var MOBILE = W.matchMedia("(max-width: 960px)");
  var motion = !RM && "IntersectionObserver" in W && W.CSS && CSS.supports && CSS.supports("translate", "0 0");
  if (motion) root.classList.add("gm");

  var $ = function (s, e) { return (e || d).querySelector(s); };
  var $$ = function (s, e) { return Array.prototype.slice.call((e || d).querySelectorAll(s)); };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var vh = W.innerHeight;

  /* ------------------------------------------------------------------
     Intro loader + page transition overlay
     ------------------------------------------------------------------ */
  var pt = d.createElement("div");
  pt.className = "gpt" + (motion ? " is-load" : "");
  pt.setAttribute("aria-hidden", "true");
  pt.innerHTML = '<i class="gpt-b"></i><i class="gpt-a"></i><div class="gpt-mark"><img src="assets/logo-180.webp" alt="" width="96" height="64"><span class="gpt-bar"></span></div>';
  d.body.appendChild(pt);
  if (motion) root.classList.add("gm-loading");

  function liftLoader() {
    if (!pt.classList.contains("is-load")) return;
    pt.className = "gpt is-reveal";
    root.classList.remove("gm-loading");
    setTimeout(function () { if (pt.classList.contains("is-reveal")) pt.className = "gpt"; }, 1100);
  }
  if (motion) {
    var fontsReady = d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve();
    Promise.race([Promise.all([fontsReady, wait(900)]), wait(2200)]).then(liftLoader);
  }

  var busy = false;
  function transition(go) {
    if (!motion || pt.classList.contains("is-load")) { go(); return; }
    if (busy) { go(); return; }
    busy = true;
    pt.className = "gpt is-cover";
    setTimeout(function () {
      try { go(); } finally {
        pt.className = "gpt is-reveal";
        setTimeout(function () { pt.className = "gpt"; busy = false; }, 1000);
      }
    }, 600);
  }

  /* ------------------------------------------------------------------
     Smooth scrolling (desktop / precise pointers only)
     ------------------------------------------------------------------ */
  var lenis = null;
  if (motion && FINE && W.Lenis) {
    try {
      lenis = new W.Lenis({ lerp: 0.095, smoothWheel: true, wheelMultiplier: 1 });
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    } catch (e) { lenis = null; }
  }
  function toTop(smooth) {
    if (lenis) lenis.scrollTo(0, smooth ? { duration: 1.4 } : { immediate: true, force: true });
    else W.scrollTo({ top: 0, behavior: smooth && !RM ? "smooth" : "auto" });
  }

  /* ------------------------------------------------------------------
     Reveal engine
     ------------------------------------------------------------------ */
  // Order matters: containers first, atoms last. Descendants of an
  // already-animated element are skipped so nothing animates twice.
  var RULES = [
    [".about-image, .vis.tall, .g > .vis", "img"],
    ["form.card", "up"],
    [".team-card", "card"],
    [".card", "card"],
    [".tl2 > div", "up"],
    [".social-link", "pop"],
    [".st > div", "up"],
    [".tk", "up"],
    ["details", "up"],
    [".mt > div", "up"],
    [".contact-info > *", "up"],
    [".trust .wrap > *", "fade"],
    [".emp", "up"],
    ["footer .fg > div, footer .fb", "up"],
    ["h1, h2", "mask"],
    [".eb", "line"],
    ["h3, p, li, .cta, .tg, .sh > .more, .wrap > .more, .art > .more, .fl, blockquote, .who, #lm", "up"]
  ];
  var SKIP = ".hero, .ph, .kband, .gpt, .gtop, #menu, .language-menu";

  var io = null, observed = new WeakSet(), pending = [];
  function onIntersect(entries) {
    var hits = [];
    entries.forEach(function (e) {
      if (e.isIntersecting) hits.push(e.target);
      else if (e.boundingClientRect.bottom < 0) reveal(e.target, 0, true);
    });
    hits.sort(function (a, b) {
      var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return (Math.round(ra.top / 8) - Math.round(rb.top / 8)) || (ra.left - rb.left);
    });
    hits.forEach(function (el, i) { reveal(el, Math.min(i, 7) * 85, false); });
  }
  function reveal(el, delay, instant) {
    if (io) io.unobserve(el);
    if (el.classList.contains("is-in")) return;
    el.style.setProperty("--rdl", delay + "ms");
    if (instant) el.classList.add("gm-instant");
    el.classList.add("is-in");
  }
  function newIO() {
    if (io) io.disconnect();
    observed = new WeakSet();
    io = new IntersectionObserver(onIntersect, { rootMargin: "0px 0px -9% 0px", threshold: 0 });
  }

  function scan() {
    if (!motion) return;
    if (!io) newIO();
    var roots = [$("#app"), $("#ft")].filter(Boolean);
    roots.forEach(function (rootEl) {
      RULES.forEach(function (rule) {
        $$(rule[0], rootEl).forEach(function (el) {
          if (el.hasAttribute("data-r")) return;
          if (el.closest(SKIP)) return;
          if (el.parentElement && el.parentElement.closest("[data-r]")) return;
          el.setAttribute("data-r", rule[1]);
        });
      });
      // chip stagger indexes
      $$(".tg, .tk > div", rootEl).forEach(function (g) {
        $$("span", g).forEach(function (s, i) { s.style.setProperty("--si", i); });
      });
      $$("[data-r]:not(.is-in)", rootEl).forEach(function (el) {
        if (observed.has(el)) return;
        observed.add(el);
        io.observe(el);
      });
    });
  }

  /* ------------------------------------------------------------------
     Scroll-linked effects
     ------------------------------------------------------------------ */
  var fx = { fill: [], depth: [], hero: null, heroText: null, globe: null, tag: null, blobs: [], cv: null, par: [], cs: [], tl: [], kb: [], foot: null };
  var y = 0, lastY = 0, vel = 0, smoothVel = 0, ticking = false;
  var hd = null, pb = null, gtop = null, marquee = null, menu = null;

  function collect() {
    fx.hero = $(".hero");
    fx.heroText = fx.hero && $(".hg > div:first-child", fx.hero);
    fx.globe = fx.hero && $(".gv", fx.hero);
    fx.tag = fx.hero && $(".tag", fx.hero);
    fx.blobs = fx.hero ? $$(".bl", fx.hero) : [];
    fx.cv = fx.hero && $("#cv", fx.hero);
    fx.par = $$(".about-image img, .pc .vis img, .vis.tall img, .g > .vis img, .blog-feature-image img").map(function (img) {
      img.classList.add("gpx");
      return { el: img, box: img.parentElement, amt: img.closest(".about-image, .tall") ? 46 : 26 };
    });
    fx.cs = $$(".cs");
    fx.tl = $$(".tl2").map(function (t) { return { el: t, steps: $$(":scope > div", t) }; });
    fx.kb = $$(".kband-row");
    fx.foot = $("#ft");
    // headings that fill with ink on scroll
    fx.fill = motion ? $$("#app section h2").filter(function (h) { return !h.closest(".card, .kband"); }) : [];
    fx.fill.forEach(function (h) { h.classList.add("gfill"); });
    // depth columns (desktop)
    fx.depth = $$("#app .g3").filter(function (g) { return g.children.length >= 3 && g.querySelector(".card"); });
    fx.depth.forEach(function (g) { g.classList.add("gdepth"); });
    setupPin();
    setupShowcase();
    setupStacks();
    setupGrow();
    footReveal();
    var mq = $(".mq .tl");
    marquee = null;
    if (mq && mq.getAnimations) { var a = mq.getAnimations(); marquee = a[0] || null; }
  }

  function inView(r, pad) { pad = pad || 0; return r.bottom > -pad && r.top < vh + pad; }

  function update() {
    ticking = false;
    y = W.scrollY || W.pageYOffset;
    vel = y - lastY;
    smoothVel += (vel - smoothVel) * 0.18;
    var docH = root.scrollHeight - vh;
    var prog = docH > 0 ? clamp(y / docH, 0, 1) : 0;

    // header hide / show
    if (hd) {
      var menuOpen = menu && menu.classList.contains("o");
      if (!RM && !menuOpen && y > 360 && vel > 3) hd.classList.add("gh-hide");
      else if (vel < -3 || y < 120 || menuOpen) hd.classList.remove("gh-hide");
    }
    root.classList.toggle("gm-scrolled", y > 40);
    if (gtop) { gtop.classList.toggle("on", y > 700); gtop.style.setProperty("--p", prog.toFixed(4)); }

    if (motion) {
      // hero parallax
      if (fx.hero && pin) heroPin();
      else if (fx.hero) {
        var hh = fx.hero.offsetHeight;
        if (y < hh * 1.2) {
          var k = clamp(y / hh, 0, 1);
          if (fx.heroText) { fx.heroText.style.translate = "0 " + (y * 0.22).toFixed(1) + "px"; fx.heroText.style.opacity = (1 - k * 1.15).toFixed(3); }
          if (fx.globe) { fx.globe.style.translate = "0 " + (y * 0.12).toFixed(1) + "px"; fx.globe.style.scale = (1 - k * 0.12).toFixed(4); }
          if (fx.tag) fx.tag.style.translate = "0 " + (y * 0.3).toFixed(1) + "px";
          fx.blobs.forEach(function (b, i) { b.style.translate = "0 " + (y * (i ? -0.15 : 0.35)).toFixed(1) + "px"; });
          if (fx.cv) fx.cv.style.opacity = (1 - k * 0.8).toFixed(3);
        }
      }
      // image parallax
      for (var i = 0; i < fx.par.length; i++) {
        var p = fx.par[i], r = p.box.getBoundingClientRect();
        if (!inView(r, 100)) continue;
        var t = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        p.el.style.translate = "0 " + (clamp(t, -1, 1) * -p.amt / 2).toFixed(1) + "px";
      }
      // CTA panel expands as it enters
      fx.cs.forEach(function (s) {
        var r = s.getBoundingClientRect();
        if (!inView(r, 50)) return;
        var q = clamp((vh - r.top) / (vh * 0.75), 0, 1), e = 1 - Math.pow(1 - q, 3);
        var mob = MOBILE.matches, ix = (1 - e) * (mob ? 14 : 56), rad = (1 - e) * (mob ? 22 : 40);
        s.style.clipPath = "inset(0 " + ix.toFixed(1) + "px round " + rad.toFixed(1) + "px)";
        var w = s.querySelector(".wrap");
        if (w) w.style.scale = (0.94 + e * 0.06).toFixed(4);
      });
      // process timeline draws itself
      fx.tl.forEach(function (o) {
        var r = o.el.getBoundingClientRect();
        if (!inView(r, 200)) return;
        var q = clamp((vh * 0.82 - r.top) / Math.max(r.height, vh * 0.35), 0, 1);
        o.el.style.setProperty("--p", q.toFixed(4));
        var n = o.steps.length;
        o.steps.forEach(function (s, j) { s.classList.toggle("is-on", q >= (j + 0.35) / n); });
      });
      // kinetic band
      if (fx.kb.length) {
        var band = fx.kb[0].parentElement, br = band.getBoundingClientRect();
        if (inView(br, 200)) {
          var bp = (vh - br.top) / (vh + br.height);
          var skew = clamp(smoothVel * -0.12, -7, 7);
          fx.kb.forEach(function (row, idx) {
            var span = row.scrollWidth - band.clientWidth;
            var x = idx % 2 ? -span * (0.75 - bp * 0.55) : -span * (0.2 + bp * 0.55);
            row.style.transform = "translate3d(" + x.toFixed(1) + "px,0,0) skewX(" + skew.toFixed(2) + "deg)";
          });
        }
      }
      // hero zooms out into a rounded card
      if (fx.hero && !pin) {
        var hh2 = fx.hero.offsetHeight, k2 = clamp(y / hh2, 0, 1);
        if (y < hh2 * 1.2) {
          var inset = k2 * (MOBILE.matches ? 10 : 34), rr = k2 * (MOBILE.matches ? 22 : 36);
          fx.hero.style.clipPath = k2 > 0.001 ? "inset(0 " + inset.toFixed(1) + "px " + (k2 * 18).toFixed(1) + "px round 0 0 " + rr.toFixed(1) + "px " + rr.toFixed(1) + "px)" : "";
        }
      }
      updateStacks();
      updateGrow();
      // headings fill
      for (var hI = 0; hI < fx.fill.length; hI++) {
        var hr = fx.fill[hI].getBoundingClientRect();
        if (!inView(hr, 60)) continue;
        fx.fill[hI].style.setProperty("--f", clamp((vh * 0.9 - hr.top) / (vh * 0.42), 0, 1).toFixed(3));
      }
      // depth columns
      if (!MOBILE.matches) fx.depth.forEach(function (g) {
        var gr = g.getBoundingClientRect();
        if (!inView(gr, 100)) return;
        var tt = clamp((gr.top + gr.height / 2 - vh / 2) / (vh / 2 + gr.height / 2), -1, 1);
        Array.prototype.forEach.call(g.children, function (c, ci) {
          c.style.translate = "0 " + (tt * (ci % 3) * 34).toFixed(1) + "px";
        });
      });
      // horizontal showcase
      if (hs) {
        var sr = hs.sec.getBoundingClientRect(), span2 = hs.sec.offsetHeight - vh;
        if (inView(sr, 50)) {
          var hp = clamp(-sr.top / Math.max(span2, 1), 0, 1), ep = hp;
          var dir = root.dir === "rtl" ? 1 : -1;
          hs.track.style.transform = "translate3d(" + (dir * ep * hs.dist).toFixed(1) + "px,0,0)";
          hs.sec.style.setProperty("--hp", hp.toFixed(4));
          var cx = W.innerWidth / 2;
          hs.cards.forEach(function (c) {
            var cr = c.getBoundingClientRect(), dd = clamp(Math.abs(cr.left + cr.width / 2 - cx) / W.innerWidth, 0, 1);
            c.style.scale = (1 - dd * 0.1).toFixed(4);
            if (c.classList.contains("is-in")) c.style.opacity = (1 - dd * 0.35).toFixed(3);
          });
          var ctxt = String(Math.min(hs.cards.length, 1 + Math.floor(hp * hs.cards.length * 0.999))).padStart(2, "0") + " / " + String(hs.cards.length).padStart(2, "0");
          if (hs.count && hs.count.textContent !== ctxt) hs.count.textContent = ctxt;
          if (false) hs.count.textContent = String(Math.min(hs.cards.length, 1 + Math.floor(hp * hs.cards.length * 0.999))).padStart(2, "0") + " / " + String(hs.cards.length).padStart(2, "0");
        }
      }
      // footer wordmark rises
      if (fx.foot) {
        var fr = fx.foot.getBoundingClientRect();
        if (inView(fr, 0)) fx.foot.style.setProperty("--fp", clamp((vh - fr.top) / fr.height, 0, 1).toFixed(4));
      }
      // marquee speeds up with scroll velocity
      if (marquee) marquee.playbackRate = 1 + Math.min(Math.abs(smoothVel) * 0.12, 5);
    }

    if (pb) pb.style.transform = "scaleX(" + prog + ")";
    lastY = y;
    if (Math.abs(smoothVel) > 0.3) requestTick();
  }
  function requestTick() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

  // reveal anything the user jumped past (e.g. fast flicks)
  function sweep() {
    if (!motion) return;
    $$("[data-r]:not(.is-in)").forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < 0) reveal(el, 0, true);
    });
  }

  /* ------------------------------------------------------------------
     Kinetic band (home page, decorative, built from existing service names)
     ------------------------------------------------------------------ */
  function buildBand() {
    var hero = $(".hero");
    if (!hero || $(".kband") || typeof S === "undefined") return;
    var sec = $("#app > section");
    if (!sec) return;
    var names = S.map(function (s) { return s[1]; });
    var row = function (list) {
      var out = "";
      for (var k = 0; k < 2; k++) list.forEach(function (n) { out += "<span>" + n + "</span><i></i>"; });
      return out;
    };
    var el = d.createElement("div");
    el.className = "kband";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = '<div class="kband-row">' + row(names.slice(0, 5)) + '</div><div class="kband-row r2">' + row(names.slice(5)) + "</div>";
    sec.after(el);
  }

  /* ------------------------------------------------------------------
     Chrome: back-to-top, scrim, magnetic buttons, menu stagger
     ------------------------------------------------------------------ */
  function chrome() {
    hd = $("#hd"); pb = $("#pb"); menu = $("#menu");
    gtop = d.createElement("button");
    gtop.className = "gtop";
    gtop.type = "button";
    gtop.setAttribute("aria-label", "Back to top");
    gtop.innerHTML = '<svg viewBox="0 0 52 52" aria-hidden="true"><defs><linearGradient id="gtopg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1f5cff"/><stop offset="1" stop-color="#12b5ff"/></linearGradient></defs><circle class="trk" cx="26" cy="26" r="22"/><circle class="prg" cx="26" cy="26" r="22"/></svg><b aria-hidden="true">&#8593;</b>';
    gtop.onclick = function () { toTop(true); };
    d.body.appendChild(gtop);

    var scrim = d.createElement("div");
    scrim.className = "gm-scrim";
    d.body.appendChild(scrim);
    scrim.onclick = function () { var b = $("#bg"); if (b && menu && menu.classList.contains("o")) b.click(); };
    if (menu) {
      menu.setAttribute("data-lenis-prevent", "");
      var sync = function () {
        var open = menu.classList.contains("o");
        root.classList.toggle("gm-menu", open);
        if (lenis) open ? lenis.stop() : lenis.start();
        $$(":scope > li", menu).forEach(function (li, i) { li.style.setProperty("--li", i); });
      };
      new MutationObserver(sync).observe(menu, { attributes: true, attributeFilter: ["class"] });
      sync();
    }
    var lm = $(".language-menu");
    if (lm) lm.setAttribute("data-lenis-prevent", "");

    if (FINE && motion) {
      d.addEventListener("mousemove", function (e) {
        var b = e.target.closest && e.target.closest(".btn, .social-mark, .gtop");
        if (!b) return;
        var r = b.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        b.style.translate = (dx * 0.22).toFixed(1) + "px " + (dy * 0.32).toFixed(1) + "px";
      }, { passive: true });
      d.addEventListener("mouseout", function (e) {
        var b = e.target.closest && e.target.closest(".btn, .social-mark, .gtop");
        if (b && !b.contains(e.relatedTarget)) b.style.translate = "";
      }, { passive: true });
    }
  }

  /* ------------------------------------------------------------------
     Public API (called by the router)
     ------------------------------------------------------------------ */
  var hs = null;
  function teardownShowcase() {
    if (!hs) return;
    hs.sec.classList.remove("hs"); hs.sec.style.height = ""; hs.wrap.style.height = ""; hs.track.style.transform = "";
    hs.cards.forEach(function (c) { c.style.scale = ""; c.style.opacity = ""; });
    if (hs.bar) hs.bar.remove();
    if (hs.count) hs.count.remove();
    hs = null;
  }
  function setupShowcase() {
    teardownShowcase();
    if (!motion || !$(".hero") || vh < 560 || W.innerWidth < 340) return;
    var track = $$("#app section .g.g2").filter(function (g) { return g.querySelector(":scope > .pc"); })[0];
    if (!track) return;
    var sec = track.closest("section"), wrap = track.parentElement;
    sec.classList.add("hs");
    var need = track.getBoundingClientRect().bottom - wrap.firstElementChild.getBoundingClientRect().top + (MOBILE.matches ? 110 : 150);
    if (need > vh) { sec.classList.remove("hs"); return; }
    var dist = track.scrollWidth - wrap.clientWidth + 48;
    if (dist < 60) { sec.classList.remove("hs"); return; }
    var bar = d.createElement("div"); bar.className = "hs-bar"; bar.setAttribute("aria-hidden", "true");
    var count = d.createElement("div"); count.className = "hs-count"; count.setAttribute("aria-hidden", "true");
    wrap.appendChild(bar); wrap.appendChild(count);
    sec.style.height = (vh + dist * 1.15) + "px";
    wrap.style.height = vh + "px";
    hs = { sec: sec, track: track, wrap: wrap, dist: dist, cards: $$(":scope > .pc", track), bar: bar, count: count };
  }
  /* ---- cinematic hero pin: globe zooms, next section slides over like a sheet ---- */
  var pin = null, pinBase = null;
  function setupPin() {
    var old = $(".hero-spacer"); if (old) old.remove();
    root.classList.remove("gm-pinhero"); pin = null;
    var hero = $(".hero");
    if (!motion || !hero) return;
    root.classList.add("gm-pinhero");
    var sp = d.createElement("div"); sp.className = "hero-spacer"; sp.setAttribute("aria-hidden", "true");
    sp.style.height = Math.round(vh * (MOBILE.matches ? 0.75 : 0.95)) + "px";
    hero.after(sp);
    hero.style.top = Math.min(0, vh - hero.offsetHeight) + "px";
    pin = sp;
    // base geometry (untransformed)
    var g = $(".gv", hero);
    var chips = g ? $$(".chip", g) : [];
    [g].concat(chips).forEach(function (e) { if (e) { e.style.translate = ""; e.style.scale = ""; e.style.rotate = ""; } });
    var hr = hero.getBoundingClientRect(), gr = g ? g.getBoundingClientRect() : null;
    pinBase = { gx: gr ? gr.left + gr.width / 2 - hr.left : 0, gy: gr ? gr.top + gr.height / 2 - hr.top : 0, chips: chips.map(function (c) { var r = c.getBoundingClientRect(); return { el: c, dx: r.left + r.width / 2 - (gr.left + gr.width / 2), dy: r.top + r.height / 2 - (gr.top + gr.height / 2) }; }) };
  }
  function heroPin() {
    var h = fx.hero.offsetHeight, start = Math.max(0, h - vh) + (MOBILE.matches ? 0 : 0);
    var q = clamp((y - start) / pin.offsetHeight, 0, 1), e = q * q * (3 - 2 * q);
    var mob = MOBILE.matches;
    // pre-pin (mobile: scrolling through tall hero) — gentle parallax on text
    if (fx.heroText) {
      fx.heroText.style.translate = (mob ? 0 : -e * 160).toFixed(1) + "px " + (mob ? clamp(y, 0, start) * 0.15 : 0).toFixed(1) + "px";
      fx.heroText.style.opacity = (1 - e * 1.6).toFixed(3);
      fx.heroText.style.filter = e > 0.01 ? "blur(" + (e * 6).toFixed(1) + "px)" : "";
    }
    if (fx.globe && pinBase) {
      var hr = fx.hero.getBoundingClientRect();
      var tx = (W.innerWidth / 2 - (hr.left + pinBase.gx)) * e, ty = ((vh / 2) - (hr.top + pinBase.gy)) * e;
      if (hr.top + pinBase.gy > vh * 0.5 && !mob) ty = ty; // keep centered
      fx.globe.style.translate = tx.toFixed(1) + "px " + (mob ? ty * 0.6 : ty).toFixed(1) + "px";
      fx.globe.style.scale = (1 + e * (mob ? 0.38 : 1.15)).toFixed(4);
      var gi = fx.globe.querySelector(".gi");
      if (gi) gi.style.rotate = (e * -14).toFixed(2) + "deg";
      pinBase.chips.forEach(function (c, i) {
        var f = 1.6 * e;
        c.el.style.translate = (c.dx * f).toFixed(1) + "px " + (c.dy * f).toFixed(1) + "px";
        c.el.style.opacity = (1 - e * 1.3).toFixed(3);
      });
    }
    if (fx.tag && e > 0.001) fx.tag.style.animation = "none";
    if (fx.tag) { fx.tag.style.opacity = (1 - e * 2).toFixed(3); fx.tag.style.translate = "0 " + (e * 60).toFixed(1) + "px"; }
    fx.hero.style.setProperty("--hq", e.toFixed(4));
    if (fx.cv) fx.cv.style.opacity = (1 - e * 0.6).toFixed(3);
    // the sheet that rises over the hero
    var sheet = pin.nextElementSibling;
    if (sheet) {
      var sr = sheet.getBoundingClientRect(), t = clamp((vh - sr.top) / (vh * 0.6), 0, 1);
      sheet.style.setProperty("--sr", (1 - t).toFixed(4));
    }
  }

  /* ---- mobile stacking cards ---- */
  var stacks = [];
  function setupStacks() {
    stacks.forEach(function (st) { st.g.classList.remove("gstack"); st.cards.forEach(function (c) { c.style.scale = ""; c.style.filter = ""; c.style.top = ""; }); });
    stacks = [];
    if (!motion || W.innerWidth > 600 || !$(".hero")) return;
    $$("#app > section .g3").slice(0, 2).forEach(function (g) {
      var cards = $$(":scope > .card", g);
      if (cards.length < 3) return;
      g.classList.add("gstack");
      cards.forEach(function (c, i) { c.style.top = (78 + i * 12) + "px"; });
      stacks.push({ g: g, cards: cards });
    });
  }
  function updateStacks() {
    stacks.forEach(function (st) {
      for (var i = 0; i < st.cards.length - 1; i++) {
        var c = st.cards[i], n = st.cards[i + 1];
        var cr = c.getBoundingClientRect(), nr = n.getBoundingClientRect();
        if (cr.bottom < -50 || cr.top > vh) continue;
        var ov = clamp((cr.bottom - nr.top) / cr.height, 0, 1);
        c.style.scale = (1 - ov * 0.08).toFixed(4);
        c.style.filter = ov > 0.02 ? "brightness(" + (1 - ov * 0.12).toFixed(3) + ")" : "";
      }
    });
  }

  /* ---- about image grows as it enters ---- */
  var grow = [];
  function setupGrow() { grow = $$("#app .about-image"); }
  function updateGrow() {
    grow.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (!inView(r, 50)) return;
      var q = clamp((vh - r.top) / (vh * 0.85), 0, 1), e = 1 - Math.pow(1 - q, 3);
      el.style.scale = (0.78 + e * 0.22).toFixed(4);
      el.style.rotate = ((1 - e) * -5).toFixed(2) + "deg";
      el.style.borderRadius = (24 + (1 - e) * 40).toFixed(1) + "px";
    });
  }

  function footReveal() {
    var ft = $("#ft");
    var ok = motion && ft && !MOBILE.matches && ft.offsetHeight < vh - 60;
    root.classList.toggle("gm-footreveal", !!ok);
  }

  function afterRoute() {
    toTop(false);
    buildBand();
    if (motion) { newIO(); scan(); }
    collect();
    lastY = W.scrollY; smoothVel = 0;
    if (hd) hd.classList.remove("gh-hide");
    requestTick();
  }

  W.GNTMotion = { scan: scan, afterRoute: afterRoute, transition: transition, enabled: motion };

  chrome();
  W.addEventListener("scroll", function () { requestTick(); }, { passive: true });
  var rT, lastW = W.innerWidth;
  W.addEventListener("resize", function () {
    var wNow = W.innerWidth, widthChanged = wNow !== lastW;
    if (widthChanged || Math.abs(W.innerHeight - vh) > 140) {
      lastW = wNow; vh = W.innerHeight;
      clearTimeout(rT); rT = setTimeout(function () { setupPin(); setupShowcase(); setupStacks(); footReveal(); requestTick(); }, 200);
    }
    requestTick();
  }, { passive: true });
  setInterval(sweep, 400);
})();
