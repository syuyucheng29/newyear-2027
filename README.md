# 2027 跨年包棟調查

- `index.html`：網頁本體（民宿介紹、填寫表單、結果）
- `images/`：民宿照片
- `apps-script/Code.gs`：Google Apps Script 後端，資料存在 Google 試算表

## 1. 建立 Google 試算表後端

1. 新增一個 Google 試算表（名稱隨意，例如「跨年包棟回覆」）。
2. 選單「擴充功能 → Apps Script」，把預設的程式碼全部刪掉，貼上 `apps-script/Code.gs` 的內容，按儲存。
3. 右上「部署 → 新增部署作業」：
   - 類型：齒輪 → **網頁應用程式**
   - 執行身分：**我**
   - 誰可以存取：**所有人**
4. 按「部署」，第一次要授權：選自己的帳號 → 「進階」→「前往（不安全）」→ 允許。
5. 複製「網頁應用程式網址」（結尾是 `/exec`）。

資料會自動寫進試算表的 `responses` 工作表，第一筆送出時會自動建立。

> 之後如果改了 Code.gs，要用「部署 → 管理部署作業 → 編輯（鉛筆）→ 版本選『新版本』→ 部署」，這樣網址才不會變。

## 2. 把網址填進網頁

打開 `index.html`，找到這一行，把網址貼進引號裡：

```js
const API_URL = '';
```

## 3. 部署到 GitHub Pages

1. 在 GitHub 建立一個 **public** repo（例如 `newyear-2027`）。
2. 上傳這個資料夾的內容（`index.html`、`images/`，`apps-script/` 和 README 可放可不放）。
3. repo 的「Settings → Pages」：Source 選 **Deploy from a branch**，Branch 選 `main`、`/ (root)`，按 Save。
4. 約一分鐘後，網址會是 `https://<你的帳號>.github.io/newyear-2027/`。

## 其他

- 填寫截止日是 2026/10/21 23:59（台灣時間），網頁和後端都會檢查。要延長的話，`index.html` 和 `Code.gs` 裡的 `DEADLINE` 都要改，Code.gs 改完記得部署新版本。
- 同名（不分大小寫）送出會覆蓋之前的回覆。要刪掉某筆回覆，直接到試算表刪除那一列。
