/**
 * Saves her archive answers to this Google Sheet and tells the website which videos are unlocked.
 * Paste this whole file into Extensions → Apps Script (replace everything), then deploy as a Web app.
 * Full steps: SETUP-SHEETS.md
 */

// ✏️ Must be the same word as `saveKey` in config.js
const SECRET = 'change-this-word';

const SHEET_REAL = 'Answers';
const SHEET_TEST = 'Test';      // your ?preview= runs land here and never unlock anything for her
const HEADERS = ['Time', 'Video id', 'Video', 'Challenge', 'Answer', 'Details', 'Device', 'Sent from browser at'];

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: 'bad json' }); }
  if (d.key !== SECRET) return out({ ok: false, error: 'wrong key' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet(d.test ? SHEET_TEST : SHEET_REAL);
    sh.appendRow([
      new Date(),
      String(d.id || '').slice(0, 80),
      String(d.title || '').slice(0, 200),
      String(d.kind || '').slice(0, 40),
      String(d.answer || '').slice(0, 5000),
      JSON.stringify(d.details || {}).slice(0, 1000),
      String(d.device || '').slice(0, 120),
      String(d.at || '').slice(0, 40)
    ]);
  } finally {
    lock.releaseLock();
  }
  return out({ ok: true });
}

// The website asks: "which videos has she already unlocked?" — only ids and times are returned, never her answers.
function doGet(e) {
  const p = e.parameter || {};
  if (p.key !== SECRET) return out({ ok: false, error: 'wrong key' });
  const sh = sheet(p.test ? SHEET_TEST : SHEET_REAL);
  const unlocked = {};
  const last = sh.getLastRow();
  if (last > 1) {
    sh.getRange(2, 1, last - 1, 2).getValues().forEach(function (row) {
      const time = row[0], id = row[1];
      if (id && !unlocked[id]) unlocked[id] = new Date(time).toISOString();
    });
  }
  return out({ ok: true, unlocked: unlocked });
}

function sheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sh.setColumnWidth(5, 420);
  }
  return sh;
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Optional: run this once from the editor (▶ Run) to check everything is wired up — it adds a row to "Test".
function selfTest() {
  doPost({ postData: { contents: JSON.stringify({ key: SECRET, test: true, id: 'self-test', title: 'Self test', kind: 'question', answer: 'hello ♡', device: 'editor' }) } });
  Logger.log(doGet({ parameter: { key: SECRET, test: '1' } }).getContent());
}
