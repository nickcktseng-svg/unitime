# UniTime 部署指南

本文件記錄 UniTime 目前的 GitHub 與 Cloudflare Pages 部署方式。

## 目前部署判斷

UniTime 目前使用：

- App Router 頁面
- Client Components
- localStorage
- 靜態示範資料

目前未使用：

- `app/api`
- Route Handlers
- Server Actions
- SSR 動態資料
- 伺服器端資料庫
- Cloudflare D1、KV、R2 或 Durable Objects

因此目前選擇：

```text
Cloudflare Pages + Next.js Static HTML Export
```

不需要：

- `wrangler.jsonc`
- Cloudflare Workers adapter
- Pages Functions
- Worker bindings
- production secrets

## 本機檢查

部署前請執行：

```bash
npm install
npm run lint
npm run build
```

成功時會產生：

```text
out/
```

## GitHub 初始化

若專案還不是 Git repository：

```bash
git init
git add .
git commit -m "Initial UniTime prototype"
git branch -M main
```

在 GitHub 建立新 repository 後：

```bash
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPOSITORY>.git
git push -u origin main
```

若專案已經有 Git repository：

```bash
git status
git remote -v
git add .
git commit -m "Add deployment support"
git push
```

## Cloudflare Pages 設定

1. 開啟 Cloudflare Dashboard。
2. 進入 Workers & Pages。
3. 選擇 Create application。
4. 選擇 Pages。
5. 選擇 Import an existing Git repository。
6. 連接 GitHub，選取 UniTime repository。

設定值：

```text
Project name: unitime-student-manager
Production branch: main
Framework preset: Next.js (Static HTML Export)
Build command: npm run build
Build output directory: out
Root directory: / 或留空
```

## 環境變數

目前不需要設定環境變數。

`.env.example` 只保留未來串接後端時可參考的範例名稱，不包含任何真實 secret。

如果未來加入 Supabase 或 Firebase：

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

只可放公開 client-safe key。真正 secret 必須放在伺服器端，不可放進靜態前端。

## 自動部署

Cloudflare Pages 連接 GitHub 後，每次 push 到 `main`：

1. Cloudflare 取得最新 commit。
2. 安裝 npm dependencies。
3. 執行 `npm run build`。
4. 部署 `out/`。
5. 成功後更新 production 網站。

Pull Request 或其他 branch 通常會產生 preview deployment，方便先檢查畫面。

## 常見錯誤

### 沒有 out 目錄

確認 `next.config.mjs`：

```js
output: "export"
```

並重新執行：

```bash
npm run build
```

### Cloudflare 顯示 404

確認 Pages 的 Build output directory：

```text
out
```

不要填 `.next`。

### build 在 Cloudflare 失敗但本機成功

處理順序：

1. 確認 `package-lock.json` 已 commit。
2. 確認 Cloudflare 使用 Node.js 版本支援目前 Next.js。
3. 在 Cloudflare build log 找第一個 TypeScript 或 ESLint error。
4. 本機重跑 `npm run lint` 與 `npm run build`。

### 新增後端功能後 static export 失敗

如果之後加入 API routes、Server Actions、SSR、cookies、headers 或伺服器資料庫，純靜態輸出可能不再適合。

改造方向：

1. 移除 `output: "export"`。
2. 改採 Cloudflare Workers 的 Next.js 部署方式。
3. 視需求加入 D1、KV、R2 或其他 bindings。
4. 再建立必要的 `wrangler.jsonc`。

目前尚未需要這些設定，因此本專案沒有建立 `wrangler.jsonc`。

## 部署前檢查清單

- `npm install` 成功
- `npm run lint` 成功
- `npm run build` 成功
- `out/` 已產生
- `.env.local` 未被 commit
- GitHub remote 指向正確 repository
- Cloudflare Output directory 設為 `out`
- Cloudflare Production branch 設為 `main`
