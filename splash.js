/* ==========================================================
   splash.js : plays the opening, then "moves" the discs and the name
   into the header logo (FLIP technique: measure start and end boxes,
   then animate the difference with transform).
   Events: "splash:reveal" fires as the splash starts to leave, which is
   when script.js starts AOS, so the hero animates in underneath.
   ========================================================== */
(() => {
  const root = document.documentElement;
  const splash = document.getElementById("splash");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!splash) return;

  const word = document.getElementById("splashWord");
  const discs = document.getElementById("splashDiscs");
  const bg = splash.querySelector(".splash-bg");
  const fadeOut = [splash.querySelector(".splash-sub"), document.getElementById("splashSkip")];
  let revealed = false, finished = false, moveTimer;

  // Build the letters
  word.innerHTML = [...word.dataset.text]
    .map((c, i) => `<span style="--i:${i}">${c === " " ? "&nbsp;" : c}</span>`).join("");

  const reveal = () => {
    if (revealed) return;
    revealed = true;
    document.dispatchEvent(new Event("splash:reveal"));
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(moveTimer);
    reveal();
    splash.remove();
    root.classList.remove("splashing"); // header logo appears exactly where the splash landed
  };

  // Travel from the splash position to the header position
  const fly = (el, target) => {
    const from = el.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    return el.animate(
      [{ transform: "none" }, { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width})` }],
      { duration: 1000, easing: "cubic-bezier(0.7, 0, 0.2, 1)", fill: "forwards" }
    );
  };

  const move = () => {
    if (finished) return;
    reveal();
    fly(word, document.querySelector(".brand-name"));
    fly(discs, document.querySelector(".logo"));
    bg.animate({ opacity: [1, 0] }, { duration: 800, fill: "forwards" });
    fadeOut.forEach((el) => el.animate({ opacity: [1, 0] }, { duration: 300, fill: "forwards" }));
    setTimeout(finish, 1050);
  };

  if (reduceMotion || !splash.animate) return finish(); // no intro for reduced motion
  moveTimer = setTimeout(move, 3000);
  document.getElementById("splashSkip").addEventListener("click", finish);
})();
