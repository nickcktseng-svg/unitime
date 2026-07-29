# UniTime 大學生時間與打工管理

UniTime 是一個給大學生使用的課表、家教、打工與薪資管理網站原型。此階段沒有後端資料庫與登入系統，所有資料都儲存在使用者瀏覽器的 `localStorage`，重新整理後仍會保留。

## 技術

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- date-fns
- FullCalendar
- Recharts
- localStorage

## 專案類型與部署判斷

目前專案是純靜態 Next.js 網站。

檢查結果：

- 沒有 `app/api`
- 沒有 Route Handlers
- 沒有 Server Actions
- 沒有 SSR 動態資料讀取
- 沒有 cookies、headers 或伺服器端資料庫
- 資料只透過瀏覽器端 `localStorage` 儲存

因此目前優先使用 Next.js static export，部署到 Cloudflare Pages，不需要 `wrangler.jsonc`、Cloudflare Workers adapter、Pages Functions 或 Worker runtime。

Cloudflare Pages 設定：

```text
Framework preset: Next.js (Static HTML Export)
Build command: npm run build
Output directory: out
Production branch: main
Environment variables: 目前不需要
```

## 本機安裝

```bash
npm install
```

## 本機執行

```bash
npm run dev
```

開啟：

```text
http://localhost:3000
```

## Production Build

```bash
npm run lint
npm run build
```

`next.config.mjs` 已設定：

```js
output: "export"
```

因此 `npm run build` 會產生靜態部署目錄：

```text
out/
```

## 測試

```bash
npm run test
```

目前測試涵蓋薪資與工時計算邏輯。

## 專案架構

```text
app/
  dashboard/   儀表板
  calendar/    行事曆
  courses/     大學課表
  jobs/        工作與家教
  students/    學生進度
  income/      薪資統計
  settings/    設定
components/
  layout/      全站版面與導覽
  forms/       事件、課程、工作、學生表單
  ui/          Button、Card、Modal、Toast 等共用元件
hooks/
  useAppData.ts        localStorage 狀態管理
  useCalendarEvents.ts 重複事件展開
lib/
  calculations.ts      薪資與工時計算
  conflict-check.ts    時間衝突檢查
  date-utils.ts        日期時間工具
  sample-data.ts       首次開啟示範資料
  storage.ts           localStorage 存取
types/
  index.ts             TypeScript 型別
tests/
  calculations.test.ts 計算邏輯測試
```

## 已完成功能

- 儀表板：今日行程、週課堂時間、週工作時間、月薪資、下一堂課、下一份工作、學生進度提醒、時間與收入圖表。
- 行事曆：月、週、日檢視，今日、前後切換，新增、編輯、刪除、拖曳、調整長度、重複事件、薪資欄位與衝突警告。
- 大學課表：課程新增、編輯、刪除、週課表、週末切換、自動同步固定課程事件、空閒時間分析。
- 工作與家教：家教、補習班、實驗室工讀、餐飲、行政與其他工作管理；本月工時、收入、有效時薪、下一次上班。
- 學生進度：學生資料、進度條、上課紀錄、快速課後回報模板與時間軸。
- 薪資統計：月份、工作、狀態篩選，薪資明細、獎金、平均時薪、有效平均時薪、CSV 匯出。
- 設定：個人資料、排程偏好、有效時薪計算選項、深色/淺色模式、JSON 備份匯入/匯出、清除資料。
- localStorage：首次載入自動建立示範資料，重新整理後保留使用者操作。
- 響應式：桌面左側 Sidebar，手機底部導覽。

## 尚未完成

- 尚未串接真正後端資料庫或登入系統。
- 重複事件目前以本機規則展開，未做複雜例外日期管理。
- 沒有雲端同步、多人共享、通知推播或行事曆外部匯入。

## 建立 GitHub Repository

1. 到 GitHub 建立新的 repository。
2. 不要勾選自動建立 README、`.gitignore` 或 license，避免與現有專案衝突。
3. 複製 repository URL，例如：

```text
https://github.com/<YOUR_USERNAME>/<YOUR_REPOSITORY>.git
```

## 將現有專案推送到 GitHub

如果這個資料夾尚未初始化 Git：

```bash
git init
git add .
git commit -m "Initial UniTime prototype"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPOSITORY>.git
git push -u origin main
```

如果已經有 Git repository，只需要確認 remote 後推送：

```bash
git remote -v
git add .
git commit -m "Add Cloudflare Pages static deployment support"
git push
```

## Cloudflare 連接 GitHub

1. 登入 Cloudflare Dashboard。
2. 進入 Workers & Pages。
3. 選擇 Create application。
4. 選擇 Pages。
5. 選擇 Import an existing Git repository。
6. 授權並選擇 UniTime 的 GitHub repository。
7. 設定 Production branch 為 `main`。

Build settings：

```text
Framework preset: Next.js (Static HTML Export)
Build command: npm run build
Build output directory: out
Root directory: / 或留空
```

## 環境變數設定

目前不需要任何環境變數。

Cloudflare Pages 的 Environment variables 可以先留空。

若未來接 Supabase 或 Firebase：

- 只把公開、可放在瀏覽器端的變數寫成 `NEXT_PUBLIC_*`
- 真正的 secret 不要放進前端靜態網站
- 不要把 `.env.local` commit 到 GitHub
- `.env.example` 只放範例 key，不放真實值

## 自動部署流程

Cloudflare Pages 連接 GitHub 後：

1. 本機修改程式。
2. 執行：

```bash
npm run lint
npm run build
```

3. commit 並 push 到 `main`：

```bash
git add .
git commit -m "Describe your change"
git push
```

4. Cloudflare Pages 會自動拉取 GitHub 最新 commit。
5. Cloudflare 執行 `npm install` 與 `npm run build`。
6. 成功後部署 `out/` 到正式網站。

## 常見部署錯誤處理

### Build output directory 設錯

錯誤現象：Cloudflare build 成功但網站 404 或沒有檔案。

處理方式：確認 Output directory 是：

```text
out
```

### 忘記設定 static export

錯誤現象：沒有產生 `out/`。

處理方式：確認 `next.config.mjs` 有：

```js
output: "export"
```

### 使用了不支援 static export 的 Next.js 功能

錯誤現象：`npm run build` 在 export 階段失敗。

處理方式：檢查是否新增了 Server Actions、需要 SSR 的動態 route、伺服器端 cookies/headers、或需要 Node.js server 的 API。

若真的需要這些功能，改用 Cloudflare Workers 的 Next.js 部署方式，不再用純靜態輸出。

### localStorage 資料沒有跨裝置同步

這是目前原型的預期限制。`localStorage` 只存在同一台裝置、同一個瀏覽器。

若需要跨裝置同步，下一階段可接 Supabase、Firebase、Cloudflare D1 或其他資料庫。

### 環境變數讀不到

目前專案沒有必要環境變數。若未來新增 `NEXT_PUBLIC_*`，需同時設定：

- 本機 `.env.local`
- Cloudflare Pages Production environment variables
- Cloudflare Pages Preview environment variables

## 未來改接 Supabase 或 Firebase

1. 將 `types/index.ts` 對應成資料表或 collection。
2. 把 `hooks/useAppData.ts` 中的 localStorage 讀寫改成 API client。
3. `events`、`courses`、`jobs`、`students`、`settings` 可拆成獨立資料表，並用 `user_id` 綁定登入使用者。
4. 薪資仍保留在 `lib/calculations.ts` 即時計算，除非需要報表快取再新增 income summary table。
5. 匯入/匯出 JSON 可保留為備份功能。
