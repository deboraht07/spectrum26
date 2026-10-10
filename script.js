/* ==========================================================
   script.js : behaviour for Spectrum '26 Campus Event Hub
   Sections: helpers, state, rendering, filters, registration,
   my events, countdown, theme, navigation, counters, AOS, init
   ========================================================== */

/* ---------- Helpers ---------- */
const $ = (selector, root = document) => root.querySelector(selector);
const STORAGE_KEY = "spectrum26-registrations";
const THEME_KEY = "spectrum26-theme";
const LOW_SEATS = 5; // show a warning colour at or below this many seats

// Small outline icons, reused by every card
const ICONS = {
  date: '<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/>',
  time: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  venue: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

// Stops a student's typed text from being treated as HTML
const escapeHTML = (text) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });

const debounce = (fn, wait = 200) => {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); };
};

/* ---------- State (registrations survive a page refresh) ---------- */
const state = {
  category: "All",
  query: "",
  registrations: loadRegistrations(),
};

function loadRegistrations() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return []; // corrupted or blocked storage: start fresh
  }
}
function saveRegistrations() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.registrations)); } catch { /* ignore */ }
}

const findEvent = (id) => EVENTS.find((e) => e.id === Number(id));
const registrationsFor = (eventId) => state.registrations.filter((r) => r.eventId === eventId);
const seatsLeft = (ev) => Math.max(0, ev.seats - ev.taken - registrationsFor(ev.id).length);

/* ---------- Rendering ---------- */
const grid = $("#eventGrid");

// A deliberate staggered entrance: a few built-in AOS animations cycle across
// the grid and the delay grows row by row, so no two neighbours arrive at the
// same moment. The `.card` itself is the AOS element, which lets theme.css's
// `.card.settled` restore instant hover once the entrance has finished.
const CARD_ANIMATIONS = ["fade-right", "fade-up", "fade-left", "zoom-in-up"];
let settleTimer;

/**
 * Builds one event card. `animate` is false when we only redraw because a seat
 * count changed, so the cards don't replay their entrance for no reason.
 */
function cardHTML(ev, index, animate) {
  const left = seatsLeft(ev);
  const isFull = left === 0;
  const filled = Math.round(((ev.seats - left) / ev.seats) * 100);
  const seatClass = isFull ? "full" : left <= LOW_SEATS ? "low" : "";
  const seatText = isFull ? "FULL" : `${left} seat${left === 1 ? "" : "s"} left`;
  const mine = registrationsFor(ev.id).length > 0;
  const days = Math.ceil((new Date(ev.start) - Date.now()) / 86400000);

  const aos = animate
    ? `data-aos="${CARD_ANIMATIONS[index % CARD_ANIMATIONS.length]}" data-aos-delay="${(index % 3) * 80 + Math.floor(index / 3) * 50}" data-aos-duration="650"`
    : "";

  return `
    <article class="card ${isFull ? "is-full" : ""}" data-cat="${ev.category}" ${aos}>
      <div class="card-top">
        <span class="badge">${ev.category}</span>
        <span class="seats ${seatClass}">${seatText}</span>
      </div>
      <h3>${ev.name}</h3>
      <p class="card-desc">${ev.description}</p>
      <ul class="meta">
        <li>${icon("date")}${formatDate(ev.start)}</li>
        <li>${icon("time")}${formatTime(ev.start)}</li>
        <li>${icon("venue")}${ev.venue}</li>
      </ul>
      <div class="seatbar" role="img" aria-label="${filled}% of seats booked"><span style="width:${filled}%"></span></div>
      <div class="card-foot">
        <span class="${mine ? "registered-tag" : "starts-in"}">
          ${mine ? "You're registered" : days > 0 ? `Starts in ${days} day${days === 1 ? "" : "s"}` : "Happening now"}
        </span>
        <button class="btn" type="button" data-register="${ev.id}" ${isFull ? "disabled" : ""}>
          ${isFull ? "Full" : "Register"}
        </button>
      </div>
    </article>`;
}

function renderEvents({ animate = true } = {}) {
  const query = state.query.trim().toLowerCase();
  const visible = EVENTS.filter(
    (ev) =>
      (state.category === "All" || ev.category === state.category) &&
      ev.name.toLowerCase().includes(query)
  );

  grid.innerHTML = visible.map((ev, i) => cardHTML(ev, i, animate)).join("");
  $("#emptyState").hidden = visible.length > 0;
  $("#resultsInfo").textContent = `Showing ${visible.length} of ${EVENTS.length} events`;

  renderStats();

  // Re-scan the DOM so the freshly painted cards get correct AOS positions
  // after a filter/search. Once the entrance has played we drop the slow
  // entrance timing (theme.css .card.settled) so hovering feels instant.
  clearTimeout(settleTimer);
  if (animate && hasAOS) {
    requestAnimationFrame(() => AOS.refreshHard());
    settleTimer = setTimeout(settleCards, 1000);
  } else {
    settleCards();
  }
}

function settleCards() {
  grid.querySelectorAll(".card").forEach((card) => card.classList.add("settled"));
}

/* ---------- Stats (numbers are counted up when AOS reveals the row) ---------- */
const statTargets = { statEvents: 0, statSeats: 0, statRegs: 0 };
let statsAnimated = false;

function renderStats() {
  statTargets.statEvents = EVENTS.length;
  statTargets.statSeats = EVENTS.reduce((sum, ev) => sum + seatsLeft(ev), 0);
  statTargets.statRegs = state.registrations.length;
  $("#myEventsCount").textContent = state.registrations.length;

  // Once the count-up has run, keep the numbers truthful on later redraws.
  if (statsAnimated) Object.entries(statTargets).forEach(([id, v]) => ($(`#${id}`).textContent = v));
}

function animateCount(el, target) {
  const duration = 900;
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))); // easeOutCubic
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = target;
  };
  requestAnimationFrame(tick);
}

function runCounters() {
  statsAnimated = true;
  Object.entries(statTargets).forEach(([id, v]) => animateCount($(`#${id}`), v));
}

// AOS 3 dispatches an event named after data-aos-id when the element reveals.
document.addEventListener("aos:in:stats", () => { if (!statsAnimated) runCounters(); });

/* ---------- Category filter chips (built from the data, no repeated HTML) ---------- */
function renderChips() {
  const categories = ["All", ...new Set(EVENTS.map((e) => e.category))];
  $("#filterChips").innerHTML = categories
    .map((cat) => `<button class="chip" type="button" data-category="${cat}" data-cat="${cat}" aria-pressed="${cat === state.category}">${cat}</button>`)
    .join("");
}

$("#filterChips").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  state.category = chip.dataset.category;
  document.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", c === chip));
  renderEvents();
});

$("#searchInput").addEventListener("input", debounce((e) => {
  state.query = e.target.value;
  renderEvents();
}));

$("#resetFilters").addEventListener("click", () => {
  state.category = "All";
  state.query = "";
  $("#searchInput").value = "";
  renderChips();
  renderEvents();
});

/* ---------- Gallery lightbox ---------- */
const lightbox = $("#lightbox");
const lightboxImg = $("#lightboxImg");
const gallery = $("#gallery");
if (gallery && lightbox && lightboxImg) {
  gallery.addEventListener("click", (e) => {
    const item = e.target.closest(".gallery-item");
    if (!item) return;
    const img = item.querySelector("img");
    if (!img) return;
    lightboxImg.src = img.currentSrc || img.src;
    lightboxImg.alt = img.alt;
    lightbox.showModal();
  });
}

/* ---------- Dialog helpers (one close handler for every dialog) ----------
   A dialog closes on a real backdrop click, but clicking its own padding no
   longer dismisses it (a common <dialog> annoyance). */
document.addEventListener("click", (e) => {
  const dialog = e.target.closest("dialog");
  if (!dialog) return;
  if (e.target.closest("[data-close]")) return dialog.close();
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) dialog.close(); // clicked the dimmed backdrop
  }
});

/* ---------- Registration form ---------- */
const form = $("#registerForm");
const registerDialog = $("#registerDialog");

// One rule per field. Each returns an error message, or "" when the value is fine.
const validators = {
  name: (v) => {
    v = v.trim();
    if (!v) return "Enter your full name.";
    if (v.length < 3) return "Your name needs at least 3 characters.";
    if (!/^[A-Za-z][A-Za-z .'-]*$/.test(v)) return "Use letters only. Numbers and symbols aren't allowed.";
    return "";
  },
  email: (v) => {
    v = v.trim();
    if (!v) return "Enter your email address.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Enter a valid email, like name@college.edu.";
    return "";
  },
  phone: (v) => {
    v = v.trim();
    if (!v) return "Enter your phone number.";
    if (!/^\d+$/.test(v)) return "Use digits only, with no spaces or dashes.";
    if (v.length !== 10) return "Phone number must be exactly 10 digits.";
    if (!/^[6-9]/.test(v)) return "Mobile numbers start with 6, 7, 8 or 9.";
    return "";
  },
};

function showError(input, message) {
  $(`#err-${input.dataset.field}`).textContent = message;
  input.setAttribute("aria-invalid", message ? "true" : "false");
  return !message;
}
const validateField = (input) => showError(input, validators[input.dataset.field](input.value));

// Validate when leaving a field, then keep checking as they fix it
form.querySelectorAll("[data-field]").forEach((input) => {
  input.addEventListener("blur", () => validateField(input));
  input.addEventListener("input", () => {
    if (input.getAttribute("aria-invalid") === "true") validateField(input);
  });
});

// Open the form from any Register button (event delegation: one listener for all cards)
grid.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-register]");
  if (!btn) return;
  const ev = findEvent(btn.dataset.register);

  form.reset();
  form.querySelectorAll("[data-field]").forEach((input) => showError(input, ""));
  $("#eventId").value = ev.id;
  $("#registerTitle").textContent = `Register for ${ev.name}`;
  $("#registerEventMeta").textContent = `${formatDate(ev.start)} · ${formatTime(ev.start)} · ${ev.venue} · ${seatsLeft(ev)} seats left`;
  registerDialog.showModal();
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const inputs = [...form.querySelectorAll("[data-field]")];

  // Run every check so all errors appear at once, then focus the first bad field
  const results = inputs.map((input) => ({ input, ok: validateField(input) }));
  const firstBad = results.find((r) => !r.ok);
  if (firstBad) return firstBad.input.focus();

  const ev = findEvent($("#eventId").value);
  const name = $("#name").value.trim();
  const email = $("#email").value.trim().toLowerCase();
  const phone = $("#phone").value.trim();

  if (seatsLeft(ev) === 0) {
    showError($("#email"), "Sorry, the last seat was just taken.");
    return;
  }
  if (registrationsFor(ev.id).some((r) => r.email === email)) {
    showError($("#email"), "This email is already registered for this event.");
    return $("#email").focus();
  }

  state.registrations.push({ id: Date.now(), eventId: ev.id, name, email, phone });
  saveRegistrations();

  registerDialog.close();
  showSuccess(name, ev);
  renderEvents({ animate: false });
});

function showSuccess(name, ev) {
  // textContent + <strong> built safely so the name can't inject HTML
  $("#successText").innerHTML = `Hey <strong>${escapeHTML(name)}</strong>!`;
  $("#successSub").innerHTML = `You're registered for <strong>${ev.name}</strong>. Your seat is saved — find it any time under My events.`;
  $("#successDialog").showModal();
}

$("#successViewMyEvents").addEventListener("click", () => {
  $("#successDialog").close();
  openMyEvents();
});

/* ---------- My events ---------- */
const myEventsDialog = $("#myEventsDialog");

function renderMyEvents() {
  $("#myEventsList").innerHTML = state.registrations
    .map((r) => {
      const ev = findEvent(r.eventId);
      return `
        <li class="my-item" data-cat="${ev.category}">
          <div>
            <h3>${ev.name}</h3>
            <p>${formatDate(ev.start)} · ${formatTime(ev.start)} · ${ev.venue}</p>
            <p>${escapeHTML(r.name)} · ${escapeHTML(r.email)}</p>
          </div>
          <button class="btn btn-ghost" type="button" data-cancel="${r.id}">Cancel</button>
        </li>`;
    })
    .join("");
}

function openMyEvents() {
  renderMyEvents();
  myEventsDialog.showModal();
}

$("#myEventsBtn").addEventListener("click", openMyEvents);

$("#myEventsList").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-cancel]");
  if (!btn) return;
  state.registrations = state.registrations.filter((r) => r.id !== Number(btn.dataset.cancel));
  saveRegistrations();
  renderMyEvents();
  renderEvents({ animate: false }); // the seat goes back to the card
});

/* ---------- Countdown to the first event ---------- */
const firstEventStart = Math.min(...EVENTS.map((e) => new Date(e.start).getTime()));

function updateCountdown() {
  const diff = firstEventStart - Date.now();
  if (diff <= 0) {
    ["Days", "Hours", "Mins", "Secs"].forEach((u) => ($(`#cd${u}`).textContent = "00"));
    $("#countdownNote").textContent = "The fest is live. Go and find your event!";
    return false;
  }
  const pad = (n) => String(n).padStart(2, "0");
  $("#cdDays").textContent = pad(Math.floor(diff / 86400000));
  $("#cdHours").textContent = pad(Math.floor(diff / 3600000) % 24);
  $("#cdMins").textContent = pad(Math.floor(diff / 60000) % 60);
  $("#cdSecs").textContent = pad(Math.floor(diff / 1000) % 60);
  return true;
}

function startCountdown() {
  if (!updateCountdown()) return;
  const timer = setInterval(() => { if (!updateCountdown()) clearInterval(timer); }, 1000);
}

/* ---------- Dark mode ---------- */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("#themeToggle").setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
}

$("#themeToggle").addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

/* ---------- Mobile navigation ---------- */
const nav = $("#primaryNav");
const navToggle = $("#navToggle");

function setNav(open) {
  nav.classList.toggle("is-open", open);
  navToggle.setAttribute("aria-expanded", String(open));
}
navToggle.addEventListener("click", () => setNav(!nav.classList.contains("is-open")));
nav.addEventListener("click", (e) => { if (e.target.closest("a")) setNav(false); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") setNav(false); });

/* ---------- AOS (Animate On Scroll) ----------
   Global settings live here; each element picks its own animation, delay,
   duration, easing, anchor and mirror in the HTML / cardHTML(). */
const hasAOS = typeof AOS !== "undefined"; // the page still works if AOS is missing

function initAOS() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // No AOS, or the visitor asked for less motion: skip the animations, but make
  // sure nothing the custom CSS hid (tilt-3d, mask-reveal) is left invisible.
  if (!hasAOS || reduce) {
    document.querySelectorAll("[data-aos]").forEach((el) => el.classList.add("aos-animate"));
    settleNumbers();
    return;
  }
  AOS.init({
    duration: 650,
    easing: "ease-out-cubic",
    offset: 60,
    once: true,            // animate the first time only by default
    mirror: false,         // overridden per element (see the story copy)
    anchorPlacement: "top-bottom",
    disable: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  });
}

// The count-up numbers are driven by aos-effects.js through the aos:in:count
// event. When AOS is switched off that event never fires, so fill them in here.
function settleNumbers() {
  document.querySelectorAll('[data-aos-id="count"]').forEach((el) => {
    const out = el.querySelector("strong");
    if (out) out.textContent = (el.dataset.count || "") + (el.dataset.suffix || "");
  });
}

/* ---------- Init ---------- */
function init() {
  // Theme: saved choice first, then the device setting
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch { /* ignore */ }
  applyTheme(saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

  renderChips();
  renderEvents();
  startCountdown();
  initAOS();

  // If AOS is missing or motion is reduced the reveal event never fires, so
  // settle the stats immediately. The timeout is a safety net for anything else.
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!hasAOS || reduce) { statsAnimated = true; renderStats(); }
  setTimeout(() => { if (!statsAnimated) runCounters(); }, 1400);
}

/* ---------- Boot ----------
   The splash intro flies its discs into the header logo, then announces
   itself with "splash:reveal"; we start then so the hero animates in
   underneath. With no splash (or reduced motion) we start immediately, and a
   timeout is the safety net in case the splash script never fires. */
let booted = false;
function boot() {
  if (booted) return;
  booted = true;
  init();
}

const splashEl = document.getElementById("splash");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (splashEl && !reduceMotion) {
  document.addEventListener("splash:reveal", boot, { once: true });
  setTimeout(() => {
    document.documentElement.classList.remove("splashing");
    boot();
  }, 6500);
} else {
  boot();
}
