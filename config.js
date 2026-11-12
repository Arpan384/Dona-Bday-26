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

  // Music on the home screen. It fades out when she opens a part and resumes where it left off when she comes back.
  bgMusic: { src: "assets/music/bg.mp3", volume: 0.7 },   // set src: "" to turn it off

  // Opening screen: false = the simple, elegant fade (current). true = velvet drapes + 3·2·1 film countdown.
  theatreIntro: false,

  // The home screen title, styled like a film poster
  marquee: {
    studio: "Appu Pictures presents",
    title: "Dona",
    tagline: "a love story in three acts",
    sub: "based on a true story · 2017 → forever",
    billing: ["starring Dona", "with Appu", "music by a song written for her"],
    rating: "U/A · Unconditional Affection"
  },

  parts: [
    {
      kicker: "Act I",
      title: "Pehli Mulakaat",
      tagline: "where it all began, five minutes early",
      review: "Couldn't stop smiling.",               // ✏️ the little ★★★★★ quote on the poster
      poster: "assets/photos/2017-1.jpg",
      unlock: { dayOffset: -1, time: "23:55" },   // 11:55 PM, the night before
      song: "assets/music/part1.mp3",               // ✏️ drop your song here with this exact name
      songStart: "0:44"   // ✏️ where the song begins, "m:ss" (e.g. "0:45"); "0:00" = from the start
    },
    {
      kicker: "Act II",
      title: "Waqt Ke Saath, Tere Saath",
      tagline: "eight years, one song, and every reason to choose you again",
      review: "Not one boring scene in eight years.",  // ✏️
      runtime: "4:25",
      poster: "assets/photos/2023-7.jpg",
      unlock: { dayOffset: 0, time: "11:00" },     // 11:00 AM on her birthday
      song: "assets/music/part2.mpeg",               // ✏️ the ~4:25 personalised song
      songStart: "0:00"   // ✏️ the film is timed from here to the end of the song
    },
    {
      kicker: "Act III",
      title: "Tu Hi Mera Jahan",
      tagline: "one last wish, before the day ends",
      review: "Keep the tissues close.",              // ✏️
      poster: "assets/photos/new/unk-n15.jpg",
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
    revealCaption: "Where it all began · 2017",
    // after the gold is scratched off, these fan out from behind the photo (tap one to bring it forward)
    extraPhotos: [
      { src: "assets/photos/new/2017-n2.jpg", caption: "2017" },
      { src: "assets/photos/new/2018-n3.jpg", caption: "2018" },
      { src: "assets/photos/new/2019-n1.jpg", caption: "2019" }
    ]
  },

  /* ---------- PART II : the 8-year film ---------- */
  part2: {
    // the opening card inside Part II
    introKicker: "Part II",
    introTitle: "Eight Years",
    introLine: "our story, 2017 — 2026",
    songSeconds: 265,          // used only if the song file is missing; real length is read from the file
    titleCardSeconds: 3.2,     // how long each year's title card stays
    endCardSeconds: 9,
    endTitle: "Happy Birthday, Dona!",                       // ✏️
    endLine: "2017 → forever",                              // ✏️
    // ✏️ optional one-line subtitle under each year's title card ("" = none)
    years: {
      2017: "The Scientist Question?", 2018: "The Beginning of Us", 2019: "Our First Little Adventures", 2020: "Together Through It All", 2021: "Growing Into Us",
      2022: "A Thousand Little Moments", 2023: "Our Little Fairytale", 2024: "More Places, More Memories", 2025: "Little Things, Big Memories", 2026: "And I'd Still Choose You..."      // Our Next Beautiful Chapter
    },
    // Lyrics shown as subtitles (timed file). Set to "" to turn them off.
    lyrics: true,
    // The film plays these in order. Photos live in assets/photos, clips in assets/clips.
    //   photo:  { src: "2018-1.jpg", caption: "optional" }
    //   clip:   { video: "2018-v1.mp4", from: 1, to: 5 }   ← plays only seconds 1→5 (muted); the slide lasts exactly that long
    //   off:    add  off: true  to skip an item without deleting it
    // Photos share whatever time is left after the clips, so more clips = quicker photos.
    media: [
      // 2017
      { src: "2017-1.jpg", caption: "Our first pic together" },
      { video: "2017o-v1.mp4", from: 0.5, to: 4.5, orig: "1–5s" },
      { video: "2017o-v2.mp4", from: 0.5, to: 4.5, orig: "1–5s" },
      { src: "new/2017-n1.jpg", off: true }, { src: "new/2017-n2.jpg", off: true }, // use n2 in p1
      { video: "2017-v1.mp4", from: 0.5, to: 4, orig: "1.5–5s" },
      { video: "2017-v2.mp4", from: 0.5, to: 5, orig: "0.5–5s" },
      // 2018
      { src: "2018-1.jpg", caption: "A special day indeed!" },
      { video: "2018-v1.mp4", from: 0.5, to: 4.5, orig: "1–5s" },
      { src: "2018-2.jpg", off: true }, { src: "2018-3.jpg", off: true }, // intentional off
      { src: "new/2018-n1.jpg"}, { src: "new/2018-n4.jpg"},
      { video: "2018-v2.mp4", from: 0, to: 3, orig: "0–3s" },
      { src: "2018-4.jpg" },
      { src: "new/2018-n2.jpg", off: true }, { src: "new/2018-n3.jpg", off: true }, // use n3 in p1
      { video: "2018-v3.mp4", from: 0.5, to: 4.5, orig: "3–7s" },
      { video: "2018-v4.mp4", from: 0.5, to: 4.5, orig: "10–14s" }, // 10->14, 3-7, 55-59X, 90-94, 92-98
      // 2019
      { src: "2019-1.jpg" },
      { video: "2019-v1.mp4", from: 0, to: 3.8, caption: "Will you marry me?", orig: "0–3.8s" },
      { src: "2019-2.jpg", off: true }, // intentional
      { src: "new/2019-n2.jpg"},
      { src: "2019-3.jpg" },
      { video: "2019-v2.mp4", from: 0.5, to: 4.5, orig: "1–5s" },
      { src: "2019-4.jpg" },
      { video: "2019-v3.mp4", from: 0.5, to: 4.5, orig: "1–5s" },
      { src: "2019-5.jpg", off: true }, // intentional
      { src: "new/2019-n1.jpg", off: true }, // use in p1
      { src: "new/2019-n3.jpg"},
      // { video: "2019-v4.mp4", from: 3, to: 7 }, // can remove if needed
      { src: "new/unk-n6.jpg", year: "2019" }, // added
      // 2020
      { src: "2020-1.jpg" },
      { src: "new/2020-n1.jpg"}, //added
      { src: "new/unk-n5.jpg", year: "2020" }, //added
      { src: "new/2020-n2.jpg", off: true },
      { video: "2020-v1.mp4", from: 0.5, to: 5.5, orig: "2–7s" },
      { src: "new/unk-n4.jpg", year: "2020" }, //added
      // 2021
      { src: "2021-1.jpg" },
      { src: "2021-2.jpg" }, // can remove if needed
      { src: "new/2021-n1.jpg"},
      { src: "2021-3.jpg" }, { src: "2021-4.jpg" },
      { src: "new/unk-n3.jpg", year: "2021" }, //added
      // 2022
      { src: "2022-2.jpg" }, { src: "2022-1.jpg" }, { src: "2022-3.jpg" }, { src: "2022-4.jpg" }, { src: "2022-5.jpg" },
      { src: "new/unk-n2.jpg", year: "2022" }, //added
      // 2023
      { src: "2023-1.jpg" },
      { src: "2023-2.jpg", caption: "Our first trip ever" },
      { src: "2023-3.jpg" }, { src: "2023-4.jpg" }, { src: "2023-5.jpg", off: true },
      { src: "2023-7.jpg", off: true },
      { src: "2023-8.jpg",},
      { src: "2023-6.jpg" },
      { src: "2023-9.jpg", caption: "Mussoorie - Our first solo trip" },
      { src: "new/2023-n1.jpg", off: true }, { src: "new/2023-n2.jpg", off: true }, // can use
      // 2024
      { src: "2024-1.jpg" },
      { video: "2024-v1.mp4", from: 0.5, to: 4.5, orig: "1–5s" },
      { src: "2024-2.jpg" },
      { video: "2024-v2.mp4", from: 0, to: 1.9, off: true, orig: "0–1.9s" },
      { src: "2024-3.jpg" },
      { video: "2024-v3.mp4", from: 0.5, to: 3.5, orig: "2–5s" },
      { src: "2024-4.jpg" },
      { src: "new/2024-n1.jpg" }, { src: "new/2024-n3.jpg", off: true },
      // 2025
      { src: "2025-1.jpg" },
      { video: "2025-v1.mp4", from: 0.5, to: 4.5, off: true, orig: "3–7s" }, // can use this in last section
      { src: "2025-2.jpg" },
      { src: "2025-3.jpg", off: true},
      { video: "2025-v2.mp4", from: 0, to: 4, orig: "0–4s" },
      { src: "2025-4.jpg" }, { src: "2025-5.jpg" }, { src: "2025-6.jpg" },
      { src: "new/unk-n10.jpg", year: "2025", off: true }, // can use this in last section

      { src: "new/2025-n5.jpg"},
      { src: "new/2025-n6.jpg" }, { src: "new/2025-n7.jpg" }, { src: "new/2025-n8.jpg", off: true }, { src: "new/2025-n10.jpg" },
      { src: "new/2025-n1.jpg", off: true }, { src: "new/2025-n2.jpg", off: true }, { src: "new/2025-n3.jpg", off: true }, { src: "new/2025-n4.jpg", off: true }, { src: "new/2025-n9.jpg", off: true },
      // 2026
      { src: "2026-1.jpg" },
      { video: "2026-v1.mp4", from: 0.5, to: 4.5, orig: "6–10s" },
      { src: "2026-2.jpg" }, { src: "2026-3.jpg" }, { src: "2026-4.jpg", off: true },
      { video: "2026-v2.mp4", from: 0.5, to: 4.5, orig: "10–14s" },
      { src: "2026-5.jpg" }, { src: "2026-6.jpg" },
      { src: "new/2026-n1.jpg", off: true }, { src: "new/2026-n2.jpg" }, { src: "new/2026-n3.jpg", off: true }, { src: "new/2026-n4.jpg", off: true },

      // ✏️ Year unknown — give each a year (e.g. year: "2022"), move it into that year above, and remove off: true
      { src: "new/unk-n7.jpg", off: true }, { src: "new/unk-n8.jpg", off: true },
      { src: "new/unk-n9.jpg", off: true }, { src: "new/unk-n11.jpg", off: true }, { src: "new/unk-n12.jpg", off: true },
      { src: "new/unk-n13.jpg", off: true }, { src: "new/unk-n14.jpg", off: true }, { src: "new/unk-n15.jpg", off: true }
    ]
  },

  /* ---------- ARCHIVE : birthday videos from past years (on the home screen) ----------
     Each video is locked behind a little question or game. Once she finishes it, it stays
     unlocked for good — on any phone or laptop — and her answers are saved to your Google Sheet. */
  archive: {
    title: "From the archives",
    subtitle: "birthdays gone by, kept forever",
    unlock: { dayOffset: 0, time: "00:00" },   // before this the cards say "coming soon"

    // ✏️ Google Sheet saving — see SETUP-SHEETS.md. Leave saveUrl "" to keep everything in this browser only.
    saveUrl: "https://script.google.com/macros/s/AKfycbwtTCWa6e7iXkPw-Jm6LhfyhtNIZ9KYPoSxabUopPbo7m36FX_sV5Y4zkOKHijsIu-dWA/exec",               // the Apps Script "Web app" URL (ends in /exec)
    saveKey: "donatar", // must match SECRET in the Apps Script

    // Once every video is unlocked, the home screen background changes to this — and stays that way.
    allUnlockedBackground: "assets/photos/bonus-poster.jpg",

    // secretTitle = what the card says until she unlocks it; then it shows the real title
    items: [
      {
        id: "bday-2018", secretTitle: "A Little Something", title: "Birthday 2018",
        src: "assets/archive/bday-2018.mp4", poster: "assets/archive/bday-2018.jpg",
        lock: {
          type: "question", hint: "a question",
          kicker: "A little surprise",
          prompt: "What's one thing I've done for you that made you feel unexpectedly, ridiculously happy?",
          after: "I wish I could see that smile all over again. Actually, I hope I get to give you a million more reasons to smile. ❤️"
        }
      },
      {
        id: "bday-2019-a", secretTitle: "The Next Chapter", title: "Birthday 2019", note: "take one",
        src: "assets/archive/bday-2019-a.mp4", poster: "assets/archive/bday-2019-a.jpg",
        lock: {
          type: "unscramble", hint: "a little tune",
          kicker: "A familiar little tune",
          prompt: "Complete this little line",
          line: "Tu meri ___ si ___",
          words: ["CLUMSY", "DUNIYA"],
          scrambled: ["YMSUCL", "YADUNI"],
          seconds: 30, hintAt: 15,
          footnote: "Two words, one very familiar song. ❤️",
          after: "Hehe, of course you'd know this one. Some songs are just meant for their favourite person. ❤️"
        }
      },
      {
        id: "bday-2019-b", secretTitle: "One More Take", title: "Birthday 2019", note: "take two",
        src: "assets/archive/bday-2019-b.mp4", poster: "assets/archive/bday-2019-b.jpg",
        lock: {
          type: "hearts", hint: "a little game",
          kicker: "Catch 11 hearts!",
          prompt: "Tap the hearts as they float by. No rush, you can't miss.",
          count: 11, seconds: 20,
          after: "Well, some feelings just can't fit into one video, can they? Hehe. ❤️"
        }
      },
      {
        id: "bday-2023", secretTitle: "A Special Screening", title: "Birthday 2023",
        src: "assets/archive/bday-2023.mp4", poster: "assets/archive/bday-2023.jpg",
        lock: {
          type: "question", hint: "a question",
          kicker: "If we could pause time…",
          prompt: "If you could freeze one ordinary moment from our time together and live in it for a little longer, which moment would you choose?",
          after: "I hope we never run out of little moments like those. Because with you, even the ordinary feels special. ❤️"
        }
      },
      {
        id: "little-moments", secretTitle: "Just Because...", title: "Little moments",
        src: "assets/archive/little-moments.mp4", poster: "assets/archive/little-moments.jpg",
        lock: {
          type: "memory", hint: "a little game",
          kicker: "Memory match",
          prompt: "Flip two cards at a time and find every pair.",
          // ✏️ 8 photos = 16 cards. Use fewer photos for a quicker game (3 photos = 6 cards).
          photos: ["2018-2.jpg", "2018-3.jpg", "2019-2.jpg", "2019-5.jpg"],
          after: "It's funny how the smallest moments become the biggest memories. Here's a little collection of the moments that make me love us. ❤️"
        }
      }
    ]
  },

  /* ---------- PART III : the goodnight reel ---------- */
  part3: {
    firstPhoto: "assets/photos/new/unk-n10.jpg",   // shown first; at the final line the main photo drops on top of it
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
