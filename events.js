/* ==========================================================
   events.js : dummy data for Spectrum '26
   - `seats` is the total capacity of each event
   - `taken` is how many seats were already booked before this
     browser registered (so we can show some "Full" / "low" cards)
   - `start` is local date-time in ISO format
   ========================================================== */
const EVENTS = [
  {
    id: 1,
    name: "HackSprint 24",
    category: "Tech",
    start: "2026-11-20T09:00:00",
    venue: "Computer Lab Block",
    description: "A 24-hour build marathon. Team up, pick a problem and ship a working prototype.",
    seats: 60,
    taken: 41,
  },
  {
    id: 2,
    name: "Battle of Bands",
    category: "Music",
    start: "2026-11-20T18:00:00",
    venue: "Open Air Theatre",
    description: "Campus bands go head to head. Bring your loudest cheer for the finale set.",
    seats: 40,
    taken: 29,
  },
  {
    id: 3,
    name: "Pixel & Brush",
    category: "Art",
    start: "2026-11-21T11:00:00",
    venue: "Design Studio",
    description: "A live digital and canvas art challenge on a surprise theme revealed at the start.",
    seats: 25,
    taken: 12,
  },
  {
    id: 4,
    name: "Rhythm Rumble",
    category: "Dance",
    start: "2026-11-21T17:00:00",
    venue: "Main Auditorium",
    description: "Group dance showdown with three rounds: classical, folk and freestyle.",
    seats: 30,
    taken: 24,
  },
  {
    id: 5,
    name: "Campus Quiz League",
    category: "Quiz",
    start: "2026-11-21T14:00:00",
    venue: "Seminar Hall 2",
    description: "Teams of three face rapid-fire rounds on pop culture, science and campus trivia.",
    seats: 50,
    taken: 18,
  },
  {
    id: 6,
    name: "Futsal Frenzy",
    category: "Sports",
    start: "2026-11-22T08:00:00",
    venue: "Sports Ground",
    description: "Five-a-side knockout futsal. Fast, loud and over in under an hour per match.",
    seats: 24,
    taken: 21,
  },
  {
    id: 7,
    name: "Robo Soccer",
    category: "Tech",
    start: "2026-11-22T10:00:00",
    venue: "Workshop Block",
    description: "Build a remote-controlled bot and score more goals than the other teams.",
    seats: 20,
    taken: 9,
  },
  {
    id: 8,
    name: "Open Mic Night",
    category: "Music",
    start: "2026-11-22T19:00:00",
    venue: "Amphitheatre",
    description: "Poetry, stand-up, songs: three minutes on stage to do whatever you like.",
    seats: 35,
    taken: 35, // already full, so the "Full" state is visible straight away
  },
];
