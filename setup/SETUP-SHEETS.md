# Saving her archive answers to Google Sheets

Setup takes about 10 minutes. Once it's done:

- Each answered question or finished game adds a row to your Sheet, with the time, the video, her answer (or the game result) and her device.
- A video she has unlocked stays unlocked on any phone or laptop she opens the site on.
- When you test with `?preview=…`, the result goes to a separate **Test** tab. It never unlocks anything for her.

## 1. Create the Sheet

1. Go to sheets.google.com and create a blank spreadsheet, e.g. **Dona archive answers**.
2. Go to **File → Settings → Time zone** and choose **(GMT+05:30) India Standard Time**, so the times in the Sheet are in IST.

You don't need to add any columns. The script creates the **Answers** and **Test** tabs and their headers on its own.

## 2. Add the script

1. In the Sheet, go to **Extensions → Apps Script**.
2. Delete everything in `Code.gs`, then paste in the whole of `setup/Code.gs` from this repo.
3. On the line `const SECRET = 'change-this-word';`, pick your own word, e.g. `'clumsy-duniya-1110'`.
4. Click **Save** (the disk icon).

## 3. Deploy it as a web app

1. Click **Deploy → New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Fill it in:
   - Description: `archive`
   - Execute as: **Me**
   - Who has access: **Anyone** (she won't sign in to anything, so this has to be "Anyone")
4. Click **Deploy**.
5. Google asks for permission. Click **Authorize access**, choose your account, then **Advanced → Go to (project name) (unsafe) → Allow**. Google says "unsafe" because you wrote the script yourself and haven't published it, which is normal.
6. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/AKfy…/exec`.

## 4. Connect the site

In `config.js`, under `archive:`, set:

```js
saveUrl: "https://script.google.com/macros/s/AKfy…/exec",
saveKey: "clumsy-duniya-1110",     // the same word as SECRET in Code.gs
```

Then push to GitHub.

## 5. Test it

1. Open `yoursite/?preview=dona-test&reset=1`. `reset=1` clears your earlier test unlocks in this browser.
2. Answer one archive question.
3. Check the Sheet: a new row should appear in the **Test** tab within a few seconds.
4. To check that unlocks carry across devices, open `yoursite/?preview=dona-test` on your phone. That video should already be unlocked.
5. Before her birthday, delete the rows in the **Test** tab if you like. The **Answers** tab stays empty until she plays.

There's also a `selfTest` function in the Apps Script editor: choose it in the dropdown, press **Run**, and it adds a row to **Test**.

## If you change the script later

Go to **Deploy → Manage deployments → ✏️ (edit) → Version: New version → Deploy**. This keeps the same URL, so you don't need to change `config.js`.

## Good to know

- Her answers are **only** in your Sheet. The site only ever reads back *which* videos are unlocked, never what she wrote.
- The key word is visible in the site's code. All it lets someone do is add rows or see which videos are unlocked. Anyone without access to your Sheet can't read the answers.
- If she's offline when she answers, the answer is kept in her browser and sent the next time she opens the site.
- There's no redo. Once a video is unlocked it stays open, so each challenge appears at most once. If she ever does one again on a new device before it has synced, that attempt is saved as its own row with its own time.
