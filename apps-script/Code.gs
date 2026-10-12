/** @OnlyCurrentDoc */
// 跨年包棟調查 — Google Apps Script 後端
// 部署方式見 README.md。資料存在綁定試算表的「responses」工作表。

const SHEET_NAME = 'responses';
const HEADERS = ['name', 'count', 'choices', 'slots', 'message', 'updatedAt'];
const DEADLINE = new Date('2026-10-31T23:59:59+08:00');
const MAX_ROWS = 200; // 防灌爆：超過這個筆數就不收新名字，舊名字仍可修改

const HOUSES = ['haiyang', 'longpan', 'shuwu'];
const OTHER_CHOICES = ['nobook', 'busy'];
const SLOTS = ['1231-n',
  '0101-m', '0101-a', '0101-n',
  '0102-m', '0102-a', '0102-n',
  '0103-m', '0103-a', '0103-n',
  '0104-m', '0104-a', '0104-n'];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readAll_() {
  const values = getSheet_().getDataRange().getValues();
  return values.slice(1).filter(r => r[0] !== '').map(r => ({
    name: String(r[0]),
    count: Number(r[1]) || 1,
    choices: String(r[2]).split(',').filter(Boolean),
    slots: String(r[3]).split(',').filter(Boolean),
    message: String(r[4]),
    updatedAt: r[5] instanceof Date ? r[5].toISOString() : String(r[5]),
  }));
}

// 避免使用者輸入被試算表當成公式執行
function safeText_(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return json_({ ok: true, responses: readAll_() });
}

function doPost(e) {
  if (new Date() > DEADLINE) return json_({ ok: false, error: '已超過填寫截止日' });

  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: '資料格式錯誤' });
  }

  const name = String(data.name || '').trim().slice(0, 30);
  const count = Math.round(Number(data.count));
  let choices = (data.choices || []).filter(c => HOUSES.includes(c) || OTHER_CHOICES.includes(c));
  let slots = (data.slots || []).filter(s => SLOTS.includes(s));
  const message = String(data.message || '').trim().slice(0, 500);

  if (!name) return json_({ ok: false, error: '請填名字' });
  if (!(count >= 1 && count <= 20)) return json_({ ok: false, error: '人數需介於 1–20' });
  if (choices.length === 0) return json_({ ok: false, error: '請選擇住宿意願' });
  if (choices.includes('busy')) { choices = ['busy']; slots = []; }
  else if (choices.includes('nobook')) choices = ['nobook'];
  else if (choices.length > 2) return json_({ ok: false, error: '最多選兩間' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    const row = [safeText_(name), count, choices.join(','), slots.join(','), safeText_(message), new Date()];
    const names = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues().map(r => String(r[0]).trim().toLowerCase());
    const idx = names.indexOf(name.toLowerCase());
    if (idx > 0) sheet.getRange(idx + 1, 1, 1, row.length).setValues([row]);
    else if (sheet.getLastRow() - 1 >= MAX_ROWS) return json_({ ok: false, error: '回覆數已達上限，請聯絡主辦人' });
    else sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true, responses: readAll_() });
}
