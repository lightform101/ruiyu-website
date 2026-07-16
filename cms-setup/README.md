# 睿嶼 CMS 設定腳本

一次性腳本：在你的 **PocketBase** 建立資料模型（collections）並灌入現有內容。
之後你就能在 PocketBase 後台改文字、換圖、切主題色、管理產品/文章、增減頁面區塊。

## 執行步驟

```bash
cd cms-setup
npm install
PB_URL=https://ruiyu-cms.zeabur.app \
PB_EMAIL=你的PocketBase管理員信箱 \
PB_PASSWORD=你的PocketBase管理員密碼 \
node setup.mjs
```

跑完會建立這些 collections（都設為「公開讀取」，前台網站才讀得到）：

| collection | 內容 |
|-----------|------|
| `settings` | 品牌名、主題色、導覽選單、頁尾（單筆）|
| `pages` | 各頁（home/about/soul/services/journal/contact）|
| `blocks` | 每頁的區塊（可排序、可增減 → 改版面結構）|
| `services` | 服務項目清單 |
| `articles` | 生活美學文章 |
| `flavor_quiz` | 風味測驗題目與結果（單筆）|

## 注意
- 腳本**可安全重複執行**：collection 已存在就略過、有資料就不覆蓋（不會蓋掉你後台的編輯）。
- 內容種子來自上一層的 `../content/content.json`。
- 要「整個清空重建」才加 `RESET=1`（會刪掉上述 collections 與其資料，慎用）。

## 灌完之後
前端 `assets/cms.js` 最上面的 `CMS_API` 已設成 `https://ruiyu-cms.zeabur.app`，
所以官網會自動改從 PocketBase 讀內容（讀不到時自動退回站內 `content.json`，不會開天窗）。
把官網 repo `git push` 重新部署即可生效。
