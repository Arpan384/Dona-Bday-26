/* =====================================================================
   EVERYTHING YOU NEED TO EDIT LIVES IN THIS FILE.
   Anything marked  ✏️  is a placeholder for you to fill in.
   ===================================================================== */

window.BDAY = {
  herName: "Dona",            // ✏️ how the site addresses her
  fromName: "Appu",          // ✏️ your sign-off name

  // ✏️ HER BIRTHDAY (YYYY-MM-DD). All unlock times below are relative to this date,
  // in India time, no matter where she opens the site from.
  birthday: "2026-11-25",
  timezone: "+05:30",
  timezoneName: "Asia/Kolkata",

  // Secret word to test everything before the day:  yoursite/?preview=<this>
  // Also works:  ?preview=<this>&now=2026-12-01T11:05  to pretend it's a certain time.
  previewKey: "dona-test",

  parts: [
    {
      kicker: "Part I",
      title: "Midnight",
      tagline: "the very first wish of your birthday",
      poster: "assets/photos/2017-1.jpg",
      unlock: { dayOffset: -1, time: "23:55" },   // 11:55 PM, the night before
      song: "assets/music/part1.mp3",               // ✏️ drop your song here with this exact name
      songStart: "0:44"   // ✏️ where the song begins, "m:ss" (e.g. "0:45"); "0:00" = from the start
    },
    {
      kicker: "Part II",
      title: "Eight Years",
      tagline: "our story, 2017 — 2026",
      poster: "assets/photos/2023-7.jpg",
      unlock: { dayOffset: 0, time: "11:00" },     // 11:00 AM on her birthday
      song: "assets/music/part2.mpeg",               // ✏️ the ~4:25 personalised song
      songStart: "0:00"   // ✏️ the film is timed from here to the end of the song
    },
    {
      kicker: "Part III",
      title: "Goodnight",
      tagline: "one last wish, before the day ends",
      poster: "assets/photos/extra/use-1.jpeg",
      unlock: { dayOffset: 0, time: "23:30" },     // 11:30 PM on her birthday
      song: "assets/music/part3.mp3",               // ✏️
      songStart: "2:08"   // ✏️
    }
  ],

  /* ---------- PART I : the midnight message ---------- */
  part1: {
    eyebrow: "11:55 PM · five minutes early, because I couldn't wait",
    title: "Happy Birthday, Dona",                           // ✏️
    paragraphs: [                                            // ✏️ one string per paragraph
      "Happy Birthday to my favorite person. ❤️",
      "I don't think you'll ever truly know how much you've changed my life.",
      "You walked into it so quietly, but somehow became the loudest part of my happiness.",
      "We've had our share of disagreements, overthinking, distance, and moments where things felt difficult. But every challenge only reminded me of one thing-I never wanted a life that didn't have you in it.",
      "Thank you for staying. Thank you for understanding me, even when I couldn't explain myself. Thank you for making ordinary days feel special just by being there.",
      "My favorite thing about us isn't that we've had a perfect story. It's that we've continued writing it together, one day at a time.",
      "Today, I don't just wish you happiness. I wish you the kind of peace you bring into my life. I hope every dream you've kept in your heart finds its way to you, because no one deserves it more.",
      "And if life asks me again who I'd choose...",
      "It will always be you.",
      "Happy Birthday. ❤️",
      "I love you more than words will ever be able to explain."
    ],
    signoff: "— yours, always, Appu",                       // ✏️
    charsPerPage: 380,         // roughly how much text fits on one letter page; put "---" in paragraphs to force a page break
    scratchPhoto: "assets/photos/2017-1.jpg",               // the photo hidden under the gold
    scratchHint: "scratch the gold ♡",
    revealCaption: "Where it all began · 2017"
  },

  /* ---------- PART II : the 8-year film ---------- */
  part2: {
    songSeconds: 265,          // used only if the song file is missing; real length is read from the file
    titleCardSeconds: 3.2,     // how long each year's title card stays
    endCardSeconds: 9,
    endTitle: "Happy Birthday, Dona!",                       // ✏️
    endLine: "2017 → forever",                              // ✏️
    // ✏️ optional one-line subtitle under each year's title card ("" = none)
    years: {
      2017: "The Scientist Question", 2018: "When we chose each other", 2019: "Our First Little Adventures", 2020: "Together Through It All", 2021: "Growing Into Us",
      2022: "A Thousand Little Moments", 2023: "Our Little Fairytale", 2024: "More Places, More Memories", 2025: "Collecting Forever Moments", 2026: "Forever Together!"
      // Our Next Beautiful Chapter
    },
    // Photos play in this order. caption is optional. Remove a line to drop a photo.
    media: [
      { src: "2017-1.jpg", caption: "Our first pic together" },
      { src: "2018-1.jpg", caption: "A special day indeed!" },
      { src: "2018-2.jpg" }, { src: "2018-3.jpg" }, { src: "2018-4.jpg" },
      { src: "2019-1.jpg" }, { src: "2019-2.jpg" }, { src: "2019-3.jpg" }, { src: "2019-4.jpg" }, { src: "2019-5.jpg" },
      { src: "2020-1.jpg" },
      { src: "2021-1.jpg" }, { src: "2021-2.jpg" }, { src: "2021-3.jpg" }, { src: "2021-4.jpg" },
      { src: "2022-1.jpg" }, { src: "2022-2.jpg" }, { src: "2022-3.jpg" }, { src: "2022-4.jpg" }, { src: "2022-5.jpg" },
      { src: "2023-1.jpg" },
      { src: "2023-2.jpg", caption: "Our first trip ever" },
      { src: "2023-3.jpg" }, { src: "2023-4.jpg" }, { src: "2023-5.jpg" }, { src: "2023-6.jpg" },
      { src: "2023-7.jpg" }, { src: "2023-8.jpg" },
      { src: "2023-9.jpg", caption: "Mussoorie - Our first solo trip" },
      { src: "2024-1.jpg" }, { src: "2024-2.jpg" }, { src: "2024-3.jpg" }, { src: "2024-4.jpg" },
      { src: "2025-1.jpg" }, { src: "2025-2.jpg" }, { src: "2025-3.jpg" }, { src: "2025-4.jpg" }, { src: "2025-5.jpg" }, { src: "2025-6.jpg" },
      { src: "2026-1.jpg" }, { src: "2026-2.jpg" }, { src: "2026-3.png" }, { src: "2026-4.jpg" }, { src: "2026-5.jpg" }, { src: "2026-6.jpg" }
    ]
    // fix initial flickering in part 1, seems broken
    // fix mp4 pic, add other pics, incorporate vids if possible, try to add lyrics if possible, captions are approx 1-2 sec delayed while leaving, generate year subtitles
  },

  /* ---------- PART III : the goodnight reel ---------- */
  part3: {
    photo: "assets/photos/2026-e-1.jpeg",
    lineSeconds: 5,            // how long each line stays on screen
    lines: [                   // ✏️ one line per screen
      "Before Your Birthday Ends, I just want to tell you...",
      "I'm so Thankful for You.",
      "Thank you for coming into my life,",
      "for making me smile, for understanding me,",
      "for standing with me in every situation.",
      "I'm thankful that the Universe sent you and",
      "I'm thankful that I found You!!",
    ],
    finalLine: "Happy birthday..to..you, one last time this year. ✨❤️",  // ✏️ stays on screen at the end
    signoff: "— Appu"                                      // ✏️
  }
};
