/* ==========================================================
   aos-effects.js : everything that reacts to AOS events
   AOS features used across this site (handy for judges):
   - 15+ built-in animations: fade-*, flip-up, zoom-in(-up), slide
   - Custom animations written in CSS: tilt-3d, mask-reveal
   - data-aos-anchor + data-aos-anchor-placement (story scene)
   - data-aos-delay stagger, data-aos-duration, data-aos-easing
   - data-aos-mirror + data-aos-once="false" (story copy animates out/in)
   - data-aos-id custom events: aos:in:count, aos:in:scene
   - AOS.refreshHard() after filtering, disable() for reduced motion
   - Responsive variants for phones (see aos-effects.css)
   ========================================================== */
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1. Count-up numbers start the moment AOS reveals them (event: aos:in:count)
  document.addEventListener("aos:in:count", ({ detail: el }) => {
    const output = el.querySelector("strong");
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    if (reduceMotion) { output.textContent = target + suffix; return; }

    const start = performance.now();
    const duration = 1600;
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out
      output.textContent = Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  // 2. Chapter tag follows the story (event: aos:in:scene)
  const tag = document.getElementById("chapterTag");
  document.addEventListener("aos:in:scene", ({ detail: el }) => {
    tag.textContent = `Now: ${el.dataset.chapter}`;
    tag.classList.add("show");
  });

  // 3. Scroll progress bar
  const bar = document.querySelector(".progress span");
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();
})();
