// NGS Auto Care — fleet site. Edite CONFIG para trocar telefone e preços.
const CONFIG = {
  whatsapp: "13213177254",
  // Preços por lavagem/veículo. Exterior $45 e Completa $85 = enviados pela NGS em 17/11/2026; Premium ATTAC $120 enviado pela NGS em 20/11/2026.
  services: [
    { key: "plan1_t", desc: "plan1_d", price: 45 },
    { key: "plan2_t", desc: "plan2_d", price: 85, popular: true },
    { key: "plan3_t", desc: "plan3_d", price: 120 }
  ],
  // Desconto por volume: [mínimo de veículos, %]
  volumeDiscounts: [[50, 20], [25, 15], [10, 10], [5, 5]],
  // Páginas extras: price null = "sob consulta" até a NGS passar o valor.
  pages: {
    personal: {
      services: [
        { key: "pc_p1_t", desc: "pc_p1_d", price: 55 },
        { key: "pc_p2_t", desc: "pc_p2_d", price: 75, popular: true },
        { key: "pc_p3_t", desc: "pc_p3_d", price: null }
      ],
      greet: { en: "Hi NGS! I'd like to book a wash for my car.", pt: "Olá NGS! Quero agendar a lavagem do meu carro.", es: "¡Hola NGS! Quiero agendar el lavado de mi carro." }
    },
    premium: {
      services: [
        { key: "pm_p1_t", desc: "pm_p1_d", price: null },
        { key: "pm_p2_t", desc: "pm_p2_d", price: null, popular: true },
        { key: "pm_p3_t", desc: "pm_p3_d", price: null }
      ],
      greet: { en: "Hi NGS! I'd like a quote for a premium detail.", pt: "Olá NGS! Quero um orçamento de detalhamento premium.", es: "¡Hola NGS! Quiero una cotización de detallado premium." }
    },
    vans: {
      services: [
        { key: "vn_p1_t", desc: "vn_p1_d", price: 65 },
        { key: "vn_p2_t", desc: "vn_p2_d", price: 85, popular: true }
      ],
      greet: { en: "Hi NGS! I'd like a quote for my pickup/van.", pt: "Olá NGS! Quero um orçamento para minha picape/van.", es: "¡Hola NGS! Quiero una cotización para mi camioneta/van." }
    }
  }
};

const PAGE = document.body.dataset.page || "fleet";
const PAGE_CFG = CONFIG.pages[PAGE] || null;
const pageServices = () => (PAGE_CFG ? PAGE_CFG.services : CONFIG.services);

const I18N = window.NGS_I18N;
// Decisão do dono (17/11/2026): o site anima mesmo com "Reduzir movimento" ligado no aparelho.
const REDUCED = false;
const BA_PAIRS = [["img/p06.jpg", "img/p19.jpg"], ["img/p29.jpg", "img/p28.jpg"]];

const state = { lang: "en", vehicles: 10, service: 1, perMonth: 4 };

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const t = (key) => (I18N[state.lang] && I18N[state.lang][key]) || I18N.en[key] || "";

function safeStorage(action, key, value) {
  try {
    return action === "get" ? localStorage.getItem(key) : localStorage.setItem(key, value);
  } catch (err) {
    return null;
  }
}

function smsLink(message) {
  return `sms:+${CONFIG.whatsapp}?&body=${encodeURIComponent(message)}`;
}

function waLink(message) {
  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
}

/* ---------- i18n ---------- */
function applyLang(lang) {
  state.lang = I18N[lang] ? lang : "en";
  document.documentElement.lang = state.lang;
  $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $$("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  $$(".lang button").forEach((b) => b.classList.toggle("on", b.dataset.lang === state.lang));
  $$(".js-wa").forEach((a) => { a.href = waLink(greeting()); });
  $$(".js-sms").forEach((a) => { a.href = smsLink(greeting()); });
  safeStorage("set", "ngs-lang", state.lang);
  renderPlans();
  renderServiceSeg();
  updateCalc();
}

function greeting() {
  if (PAGE_CFG) return PAGE_CFG.greet[state.lang];
  return { en: "Hi NGS! I'd like a quote for my fleet.", pt: "Olá NGS! Quero um orçamento para minha frota.", es: "¡Hola NGS! Quiero una cotización para mi flota." }[state.lang];
}

/* ---------- Plans & calculator ---------- */
function priceHtml(s) {
  if (s.price == null) return `<div class="price price-ask">${t("plan_ask")}</div>`;
  return `<div class="price"><span class="from">${t("plan_from")}</span> $${s.price}<small>${t("plan_unit")}</small></div>`;
}

function renderPlans() {
  const grid = $("#plansGrid");
  if (!grid) return;
  const services = pageServices();
  grid.classList.toggle("two", services.length === 2);
  grid.innerHTML = services.map((s) => `
    <article class="card plan${s.popular ? " pop" : ""}">
      ${s.popular ? `<span class="badge">${t("plan_pop")}</span>` : ""}
      <h3>${t(s.key)}</h3>
      ${priceHtml(s)}
      <p>${t(s.desc)}</p>
    </article>`).join("");
  bindCardGlow();
}

function renderServiceSeg() {
  if (!$("#svcSeg")) return;
  $("#svcSeg").innerHTML = CONFIG.services.map((s, i) =>
    `<button data-s="${i}" class="${i === state.service ? "on" : ""}">${t(s.key)}</button>`).join("");
}

function discountFor(vehicles) {
  const hit = CONFIG.volumeDiscounts.find(([min]) => vehicles >= min);
  return hit ? hit[1] : 0;
}

let shownTotal = 0;
function updateCalc() {
  if (!$("#vIn")) return;
  const base = CONFIG.services[state.service].price;
  const disc = discountFor(state.vehicles);
  const per = Math.round(base * (1 - disc / 100));
  const total = per * state.vehicles * state.perMonth;
  const range = $("#vIn");

  $("#vOut").textContent = state.vehicles;
  $("#perOut").textContent = per;
  $("#discOut").textContent = disc;
  range.style.setProperty("--fill", `${((state.vehicles - 1) / 99) * 100}%`);

  const freqLabel = { 4: t("freq_w"), 2: t("freq_b"), 1: t("freq_m") }[state.perMonth];
  const msg = `${greeting()}\n• ${t("calc_vehicles")}: ${state.vehicles}\n• ${t("calc_service")}: ${t(CONFIG.services[state.service].key)}\n• ${t("calc_freq")}: ${freqLabel}\n• ${t("calc_month")}: $${total.toLocaleString("en-US")}`;
  $("#calcWa").href = waLink(msg);

  const out = $("#tOut");
  if (window.gsap && !REDUCED) {
    const obj = { v: shownTotal };
    gsap.to(obj, { v: total, duration: 0.6, ease: "power2.out", onUpdate: () => { out.textContent = Math.round(obj.v).toLocaleString("en-US"); } });
  } else {
    out.textContent = total.toLocaleString("en-US");
  }
  shownTotal = total;
}

function bindCalc() {
  if (!$("#vIn")) return;
  $("#vIn").addEventListener("input", (e) => { state.vehicles = Number(e.target.value); updateCalc(); });
  $("#svcSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    state.service = Number(b.dataset.s); renderServiceSeg(); updateCalc();
  });
  $("#freqSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    state.perMonth = Number(b.dataset.f);
    $$("#freqSeg button").forEach((x) => x.classList.toggle("on", x === b));
    updateCalc();
  });
}

/* ---------- Before / after ---------- */
function bindBeforeAfter() {
  const box = $("#baBox");
  if (!box) return;
  let dragging = false;
  const setPos = (clientX) => {
    const r = box.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100));
    box.style.setProperty("--pos", `${pct}%`);
  };
  box.addEventListener("pointerdown", (e) => { dragging = true; box.setPointerCapture(e.pointerId); setPos(e.clientX); });
  box.addEventListener("pointermove", (e) => { if (dragging) setPos(e.clientX); });
  box.addEventListener("pointerup", () => { dragging = false; });
  box.addEventListener("pointercancel", () => { dragging = false; });

  $$("[data-ba]").forEach((btn) => btn.addEventListener("click", () => {
    const [before, after] = BA_PAIRS[Number(btn.dataset.ba)];
    $("#baBefore").src = before; $("#baAfter").src = after;
    $$("[data-ba]").forEach((x) => x.classList.toggle("on", x === btn));
    sweepBeforeAfter();
  }));
}

function sweepBeforeAfter() {
  const box = $("#baBox");
  if (!box) return;
  if (!window.gsap || REDUCED) { box.style.setProperty("--pos", "50%"); return; }
  const o = { p: 92 };
  gsap.to(o, { p: 50, duration: 1.4, ease: "expo.out", onUpdate: () => box.style.setProperty("--pos", `${o.p}%`) });
}

/* ---------- Hero bubbles ---------- */
function startBubbles() {
  const canvas = $("#bubbles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w, h, bubbles;
  const resize = () => {
    w = canvas.width = canvas.offsetWidth * devicePixelRatio;
    h = canvas.height = canvas.offsetHeight * devicePixelRatio;
    const count = Math.min(70, Math.round(canvas.offsetWidth / 18));
    bubbles = Array.from({ length: count }, () => spawn(true));
  };
  const spawn = (anywhere) => ({
    x: Math.random() * w, y: anywhere ? Math.random() * h : h + 40,
    r: (Math.random() * 10 + 3) * devicePixelRatio, s: (Math.random() * 0.6 + 0.25) * devicePixelRatio,
    d: Math.random() * Math.PI * 2, a: Math.random() * 0.35 + 0.15
  });
  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    bubbles.forEach((b, i) => {
      b.y -= b.s; b.d += 0.012; b.x += Math.sin(b.d) * 0.4;
      if (b.y < -40) bubbles[i] = spawn(false);
      const g = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.1, b.x, b.y, b.r);
      g.addColorStop(0, `rgba(255,255,255,${b.a + 0.3})`);
      g.addColorStop(0.6, `rgba(120,220,255,${b.a * 0.25})`);
      g.addColorStop(1, `rgba(63,224,255,${b.a * 0.6})`);
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    });
    requestAnimationFrame(draw);
  };
  resize(); addEventListener("resize", resize); draw();
}

/* ---------- Small interactions ---------- */
function bindCardGlow() {
  $$(".card").forEach((c) => c.addEventListener("pointermove", (e) => {
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", `${e.clientX - r.left}px`);
    c.style.setProperty("--my", `${e.clientY - r.top}px`);
  }));
}

function bindMagnetic() {
  if (REDUCED || !matchMedia("(hover: hover)").matches) return;
  $$(".magnetic").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });
}

// Monta a mensagem com todos os campos do formulário (rótulo = placeholder traduzido).
function bindLeadForm() {
  const form = $("#leadForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const lines = $$("input", form).map((input) => {
      const raw = String(input.value || "").trim();
      const value = input.type === "number"
        ? String(Math.max(1, Math.min(999, Number(raw) || 1)))
        : raw.slice(0, 80) || "-";
      return `• ${t(input.dataset.i18nPh)}: ${value}`;
    });
    window.open(waLink([greeting(), ...lines].join("\n")), "_blank", "noopener");
  });
}

/* ---------- Vídeos (Reels) ---------- */
function bindReels() {
  const videos = $$(".reel video");
  if (!videos.length) return;
  if (!("IntersectionObserver" in window)) { videos.forEach((v) => { v.preload = "auto"; v.play().catch(() => {}); }); return; }
  const io = new IntersectionObserver((entries) => entries.forEach(({ target, isIntersecting }) => {
    if (isIntersecting) { target.preload = "auto"; target.play().catch(() => {}); } else { target.pause(); }
  }), { threshold: 0.35 });
  videos.forEach((v) => io.observe(v));
}

/* ---------- GSAP motion ---------- */
function startMotion() {
  if (!window.gsap || !window.ScrollTrigger) {
    $$(".reveal").forEach((el) => { el.style.opacity = 1; el.style.transform = "none"; });
    $$(".count").forEach((el) => { el.textContent = el.dataset.to; });
    return;
  }
  gsap.registerPlugin(ScrollTrigger);


  if (window.Lenis) {
    const lenis = new Lenis({ lerp: 0.1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length > 1 && $(id)) { e.preventDefault(); lenis.scrollTo(id, { offset: -60 }); }
    }));
  }

  // Hero intro
  gsap.timeline({ defaults: { ease: "expo.out" } })
    .from("#heroBg", { scale: 1.25, duration: 2.4 })
    .from(".hero h1 .line span", { yPercent: 110, duration: 1.3, stagger: 0.12 }, 0.2)
    .from(".hero-in", { opacity: 0, y: 30, duration: 1, stagger: 0.1 }, 0.6);

  gsap.to(".hero .wrap", { opacity: 0, y: -60, ease: "none", scrollTrigger: { trigger: ".hero", start: "40% top", end: "bottom top", scrub: true } });

  $$(".count").forEach((el) => {
    const o = { v: 0 };
    gsap.to(o, { v: Number(el.dataset.to), duration: 2, delay: 1.2, ease: "power3.out", onUpdate: () => { el.textContent = Math.round(o.v); } });
  });

  // Generic reveals
  ScrollTrigger.batch(".reveal", {
    start: "top 88%",
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1, stagger: 0.1, ease: "expo.out" })
  });

  if ($("#baBox")) ScrollTrigger.create({ trigger: "#baBox", start: "top 75%", once: true, onEnter: sweepBeforeAfter });

  // Nav background
  ScrollTrigger.create({ start: 80, onToggle: (s) => $("#nav").classList.toggle("scrolled", s.isActive) });

  // Steps progress line
  if ($("#stepsLine")) gsap.to("#stepsLine", { scaleX: 1, ease: "none", scrollTrigger: { trigger: "#steps", start: "top 75%", end: "top 30%", scrub: true } });

  // Fleet horizontal scroll (desktop). No celular o deslize é CSS (styles.css).
  const mm = gsap.matchMedia();
  if ($("#fleetTrack")) mm.add("(min-width: 761px)", () => {
    const track = $("#fleetTrack");
    const dist = () => track.scrollWidth - innerWidth + 32;
    gsap.to(track, { x: () => -dist(), ease: "none", scrollTrigger: { trigger: "#fleet", start: "top top", end: () => `+=${dist()}`, pin: ".fleet-pin", scrub: 1, invalidateOnRefresh: true } });
    gsap.to(".fleet-item img", { scale: 1, ease: "none", scrollTrigger: { trigger: "#fleet", start: "top top", end: () => `+=${dist()}`, scrub: true } });
  });
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const saved = safeStorage("get", "ngs-lang");
  const guess = (navigator.language || "en").slice(0, 2);
  $("#yr").textContent = new Date().getFullYear();

  $$(".lang button").forEach((b) => b.addEventListener("click", () => {
    applyLang(b.dataset.lang);
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }));

  bindCalc();
  bindBeforeAfter();
  bindLeadForm();
  bindReels();
  bindMagnetic();
  applyLang(saved || guess);
  // Depois dos textos: no celular, deixa a aba da página atual visível.
  const currentTab = $(".subnav [aria-current]");
  if (currentTab) currentTab.parentElement.scrollLeft = currentTab.offsetLeft - 16;
  if (!REDUCED) startBubbles();
  startMotion();
});
