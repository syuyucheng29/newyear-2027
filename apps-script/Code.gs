/** @OnlyCurrentDoc */
// 跨年包棟調查 — Google Apps Script 後端
// 部署方式見 README.md。資料存在綁定試算表的「responses」工作表。

const SHEET_NAME = 'responses';
const HEADERS = ['name', 'count', 'choices', 'stay', 'message', 'updatedAt'];
const DEADLINE = new Date('2026-10-21T23:59:59+08:00');
const MAX_ROWS = 200; // 防灌爆：超過這個筆數就不收新名字，舊名字仍可修改

const HOUSES = ['shuwu', 'thewus', 'mingyue', 'chuying', 'mumulin', 'fangman', 'shanzhuang', 'domo'];
const RANK_MAX = 5; // 依序排 1–5 間，分別得 5、4、3、2、1 分
const STAYS = ['0103', '0104', 'any']; // 1/3 退房、1/4 退房、都可以

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
    stay: String(r[3]), // 舊版存的是時段，前端會視為需重新填寫
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
  let choices = (data.choices || []).filter((c, i, a) => (HOUSES.includes(c) || c === 'busy') && a.indexOf(c) === i);
  let stay = String(data.stay || '');
  const message = String(data.message || '').trim().slice(0, 500);

  if (!name) return json_({ ok: false, error: '請填名字' });
  if (!(count >= 1 && count <= 20)) return json_({ ok: false, error: '人數需介於 1–20' });
  if (choices.includes('busy')) { choices = ['busy']; stay = ''; }
  else if (choices.length === 0 || choices.length > RANK_MAX) return json_({ ok: false, error: `請排 1–${RANK_MAX} 間民宿，或選擇不參加` });
  else if (!STAYS.includes(stay)) return json_({ ok: false, error: '請選希望住到哪一天' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    // stay 前面加 ' 讓試算表存成文字，否則 '0103' 會被轉成數字 103
    const row = [safeText_(name), count, choices.join(','), stay && "'" + stay, safeText_(message), new Date()];
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
