# 仁和國中管樂團網站

- 線上網址：[https://rhwb94.github.io/rhjhwb/](https://rhwb94.github.io/rhjhwb/)
- 目標：提供仁和國中管樂團的最新資訊、師資介紹、成績展示，並確保在電腦、平板與手機上都有良好瀏覽體驗。

---

## 📁 專案結構

```
/ (repo root)
├─ index.html          # 首頁
├─ teachers.html       # 師資介紹
├─ achievements.html   # 成績展示
├─ faq.html            # 常見問題
├─ assets/
│  ├─ css/             # 樣式檔
│  ├─ js/              # JavaScript
│  └─ img/             # 圖片素材
├─ course-photo/       # 課程照片
├─ favicon.ico
├─ favicon.png         # 建議 512x512
└─ sitemap.xml         # 站點地圖
```

---

## 🎨 頁面設計規格 (Design Specs)

### 首頁 (index.html)
- **Hero 區**：標題置中，背景保持簡潔。  
- **白框**：垂直置中，四角圓角 `12px`，陰影柔和。  
- **色彩**：主色 `#1A3D8F` (深藍)，輔色 `#C62828` (紅)。  
- **字體**：中文使用系統字體，英文標題用 `sans-serif`。  

### 師資介紹 (teachers.html)
- **卡片排列**：桌機 4 欄；平板直式 2 欄、橫式自動等分；手機 1 欄。  
- **間距**：左右邊距 20px；卡片間距 15px。  
- **卡片樣式**：白底、圓角 `16px`、陰影柔和；hover 微縮放。  
- **文字**：姓名加粗；職稱字色 `#555`。  

### 成績展示 (achievements.html)
- **排版**：電腦橫排；手機上下排。  
- **標題字級**：「桃園市學生音樂比賽 / 全國賽」放大加粗。  
- **項目字級**：縮小一級，顏色淺灰。  
- **留白**：左右最大不超過 15%，避免白邊過寬。  

### FAQ (faq.html)
- **問題列表**：白卡折疊樣式，每題獨立一塊。  
- **漢堡選單**：手機、平板必須顯示；點擊後滑出選單。  
- **間距**：段落上下 12px，左右 20px。  

### Footer (全站共用)
- **排列**：左側校網、YouTube 連結（不可換行）；右側版權字樣。  
- **對齊**：兩側文字水平中線對齊。  
- **顏色**：背景深灰 `#222`，文字白色 `#fff`；hover 淡藍 `#90CAF9`。  

---

## 🛠️ 開發與部署

### 本機預覽
1. 直接用瀏覽器開啟 `index.html`。
2. 或使用簡單伺服器：
   ```bash
   # Python
   python3 -m http.server 8080
   # Node
   npx http-server .
   ```
   然後開啟 `http://localhost:8080`

### 部署
- 推送到 GitHub main 分支，GitHub Pages 會自動更新。
- 網址：`https://rhwb94.github.io/rhjhwb/`

---

## 🔄 更新流程

1. 先拉取最新檔案。
2. 修改順序：HTML → CSS → JS。
3. 測試裝置：手機 (直/橫)、平板 (直/橫)、桌機 (1440px / 1920px)。
4. 檢查清單：
   - 白框置中、間距正確。
   - 漢堡選單在 FAQ 頁可正常顯示。
   - footer 連結與版權字體對齊。
   - 連結是否有效（校網、YouTube、Google Sheet）。
   - 圖片大小是否最佳化。
5. 提交訊息格式：
   - `feat(teachers): 平板橫式卡片等分`
   - `fix(achievements): 手機白卡左右間距修正`
   - `chore(seo): 新增 og:image 與 favicon.png`

---

## 🔎 SEO 與追蹤設定

- **Meta / Open Graph**
  ```html
  <meta name="description" content="仁和國中管樂團．全桃園唯一行進管樂與室內合奏並行的優秀樂團！">
  <meta property="og:title" content="仁和國中管樂團">
  <meta property="og:description" content="優良師資與豐富活動，學生比賽屢獲佳績！">
  <meta property="og:image" content="https://rhwb94.github.io/rhjhwb/assets/img/og-cover.jpg">
  <meta property="og:url" content="https://rhwb94.github.io/rhjhwb/">
  <meta name="twitter:card" content="summary_large_image">
  ```

- **Favicon**
  ```html
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" href="/favicon.png">
  ```

- **Google Analytics (GA4)**：已安裝。  
- **Sitemap**：`/sitemap.xml` 已提交至 Search Console。

---

## 🧾 變更紀錄

👉 詳細變更請參考 [CHANGELOG.md](./CHANGELOG.md)

---

## 🐛 已知問題 / 待辦

- Google 搜尋結果尚未顯示自訂 favicon  
  - [ ] 等待 Google 抓取，必要時加上 512x512 PNG。
- 圖片最佳化  
  - [ ] 大圖壓縮與 lazyload。

---

## 🪪 授權與致謝
- 版權：仁和國中管樂團
- 團照/比賽照片：已獲得相關人員同意使用
