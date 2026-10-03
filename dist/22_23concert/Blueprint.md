# 聲動廿二、廿三成果發表會活動頁面製作規格

## 0. 任務目標

請在現有的仁和國中管樂團網站專案中，新增一個獨立的成果發表會家長資訊頁面。

這是一個單頁式、手機優先、快速載入的靜態網站，主要提供家長查看：

1. 活動標題、日期、時間、場館與 Google 地圖
2. 當日簡易日程
3. 工作組抵達時間
4. 觀眾座位圖
5. 節目冊
6. 演出結束後前往後台的位置指示影片

網站不需要登入、資料庫、Firebase、後台管理系統或任何前端框架。

---

## 1. 網址與資料夾

請在現有網站專案根目錄新增：

```text
22_23concert/
```

預計公開網址：

```text
https://rhwb94.github.io/rhjhwb/22_23concert/
```

注意事項：

- 資料夾名稱必須維持 `22_23concert`
- 因為路徑包含 `&`，在 Terminal 指令中請以引號包住路徑
- HTML 原始碼中的網址若直接包含 `&`，請視情況寫成 `&amp;`
- 所有 CSS、JavaScript、圖片與影片均使用相對路徑
- 不可破壞或改動現有網站其他頁面
- 頁面必須能直接透過 `/22_23concert/` 開啟
- GitHub Pages 發布後重新整理頁面不可出現 404

---

## 2. 建議檔案結構

```text
22_23concert/
├── index.html
├── style.css
├── script.js
└── assets/
    ├── poster.jpg
    ├── poster.webp
    ├── seating-map.png
    ├── seating-map-preview.webp
    ├── program.jpg
    ├── program-preview.webp
    ├── backstage-route.mp4
    └── backstage-route-poster.webp
```

### 現有檔案使用方式

- 活動海報：請統一命名為 `poster.jpg`
- 觀眾座位圖：使用已改名的座位圖檔案，專案內統一命名為 `seating-map.png`
- 節目冊圖片：`program.jpg`
- 後台位置指示影片：`backstage-route.mp4`
- 後台影片縮圖：`backstage-route-poster.webp`

先前的家長日程圖片不需要顯示在頁面中，日程改用 HTML 文字排版。

若目前專案內的實際檔名不同，請只在本活動頁資料夾內統一重新命名，不要修改其他頁面正在使用的原始檔案。

---

## 3. 技術限制

請使用：

- HTML5
- CSS3
- 少量原生 JavaScript

請勿使用：

- React
- Vue
- Angular
- Tailwind
- Bootstrap
- jQuery
- npm 套件
- Firebase
- 外部字型
- 第三方動畫套件
- 第三方燈箱套件

網站必須完全靜態，可直接部署在 GitHub Pages。

---

## 4. 視覺設計方向

整體網站風格必須依照 `poster.jpg` 延伸，而不是只把海報放在最上方。

海報的主要視覺特徵：

- 淺水藍色背景
- 深藍綠色標題文字
- 橘金色作為強調色
- 米白色及淡金色作為輔助色
- 樂譜線條與管樂器元素
- 整體明亮、活潑、具有學生音樂會氣氛
- 標題帶有較強烈的中文海報感
- 內文仍需保持簡潔、易讀

### 建議色票

請先以海報實際顏色微調，但可先使用：

```css
:root {
  --color-bg: #a7dae3;
  --color-bg-soft: #e3eee7;
  --color-surface: rgba(255, 255, 255, 0.78);
  --color-surface-solid: #ffffff;
  --color-primary: #1d5266;
  --color-primary-soft: #6897a3;
  --color-accent: #dea963;
  --color-accent-light: #f1d39c;
  --color-text: #173f4e;
  --color-text-muted: #56757f;
  --color-border: rgba(29, 82, 102, 0.22);
  --shadow-card: 0 12px 32px rgba(29, 82, 102, 0.12);
}
```

### 字體

不載入 Google Fonts。

```css
font-family:
  "Noto Sans TC",
  "PingFang TC",
  "Microsoft JhengHei",
  system-ui,
  -apple-system,
  sans-serif;
```

### 版面風格

- 手機優先
- 內容最大寬度約 960px
- 卡片使用柔和圓角
- 不使用過多陰影
- 按鈕以深藍綠色與橘金色區分
- 區塊標題可加入簡化的樂譜線或音符裝飾
- 不要製作過多飄動動畫
- 不要用背景影片
- 不要讓裝飾元素影響文字閱讀
- 必須維持足夠文字對比

---

## 5. 頁面內容順序

頁面由上至下必須依照以下順序製作。

---

# 第一區：活動標題與場館資訊

## 5.1 Hero 活動主視覺

最上方顯示：

- 活動海報 `poster.webp`
- 活動名稱：聲動廿二
- 副標題：獨一無二 TwoTwo 特優
- 桃園市立仁和國民中學管樂團
- 第 22、23 屆成果發表音樂會
- 日期：2026 年 6 月 18 日（四）
- 演出時間：19:00
- 地點：桃園市中壢藝術館
- 地址：桃園市中壢區中美路 16 號
- 自由入場
- 家長最早入場時間：18:30

海報圖片在首屏必須清楚，但不要占滿整個手機高度。

建議手機上：

- 海報寬度 100%
- 最大高度限制在合理範圍
- 保持原始比例
- 下方緊接活動文字資訊與按鈕

## 5.2 Google 地圖按鈕

請在活動地點旁放置明顯按鈕：

```text
開啟 Google 地圖
```

連結：

```text
https://www.google.com/maps/search/?api=1&query=%E6%A1%83%E5%9C%92%E5%B8%82%E4%B8%AD%E5%A3%A2%E8%97%9D%E8%A1%93%E9%A4%A8
```

設定：

```html
target="_blank"
rel="noopener noreferrer"
```

## 5.3 Hero 快速按鈕

在活動資訊下方放置三個快速按鈕：

1. 查看當日行程
2. 查看座位圖
3. 查看節目冊

按鈕以頁面錨點移動至對應區塊。

建議錨點：

```text
#schedule
#seating
#program
```

---

# 第二區：當日簡易日程

## 5.4 日程呈現方式

此區使用 HTML 文字排版，不使用家長日程圖片。

標題：

```text
當日簡易日程
```

請使用直式時間軸或兩欄式卡片。

手機版建議每筆日程顯示：

```text
時間
活動內容
```

日程內容：

| 時間 | 內容 |
|---|---|
| 10:10–12:00 | 學生集合、行前準備、午餐 |
| 12:20–12:50 | 學生搭車前往中壢藝術館 |
| 13:00–18:25 | 學生抵達、進場準備及彩排 |
| 18:30–18:59 | 家長進場、前台報到及入座 |
| 19:00–21:10 | 成果發表音樂會 |
| 21:10–21:18 | 開放拍照 |
| 21:20–21:55 | 場地復原 |

### 日程重點

請將以下兩個時間使用強調樣式：

- 18:30 家長開始入場
- 19:00 演出開始

可使用橘金色時間標籤，但不可只靠顏色傳達重要性。

## 5.5 日程下方提醒

請顯示：

> 家長最早入場時間為 18:30，入場前請先至前台報到。

> 若希望避免演出結束後拍照時間不足，可於 16:30–18:00 之間提早抵達，在大廳拍照背板拍照。

> 傍晚附近停車場容易客滿，建議家長提早抵達並預留尋找車位的時間。

> 演出結束後學生不會提早解散，所有團員完成場地復原後方可離開。

以上提醒請拆成四張簡短卡片，不要全部塞在同一段文字中。

---

# 第三區：工作組抵達時間

標題：

```text
工作組抵達時間
```

說明文字：

```text
以下時間僅供協助當日工作的家長參考。
```

內容：

| 工作組 | 抵達時間 |
|---|---|
| 場佈組 | 13:00 即可進場 |
| 妝髮組 | 14:30 後抵達即可 |
| 座位名牌組 | 15:30 後抵達即可 |
| 飯捲、香蕉組 | 16:10 抵達，預計 16:30 放飯 |
| 主持人 | 16:30 前抵達 |

呈現方式：

- 桌面版可使用兩欄表格
- 手機版改為一組一張卡片
- 工作組名稱使用粗體
- 時間使用深藍綠色或橘金色標籤
- 不需要展開按鈕，直接完整顯示

---

# 第四區：觀眾座位圖

標題：

```text
觀眾座位圖
```

說明：

- 七、八管家長請依入場順序入座，不另行劃位
- 保留區座位額滿後，請改至自由入座區
- 點擊座位圖可放大查看

## 5.6 圖片載入方式

首頁先載入：

```text
assets/seating-map-preview.webp
```

使用者點擊後再載入完整圖片：

```text
assets/seating-map.png
```

座位圖必須支援：

- 點擊圖片放大
- 點擊「放大查看」按鈕
- 顯示原始高解析圖片
- 關閉按鈕
- 點擊背景關閉
- Esc 鍵關閉
- 手機可使用瀏覽器手勢放大
- 提供「在新分頁開啟完整圖片」連結

請使用原生 `<dialog>` 或簡單自製燈箱，不加入第三方套件。

圖片需加入：

```html
loading="lazy"
decoding="async"
```

圖片需設定 `width` 與 `height`，避免載入時版面跳動。

---

# 第五區：節目冊

標題：

```text
音樂會節目冊
```

首頁顯示：

```text
assets/program-preview.webp
```

點擊後開啟完整圖片：

```text
assets/program.jpg
```

必須支援：

- 點擊放大
- 新分頁開啟完整圖片
- 手機縮放
- 圖片說明文字
- PDF 按鈕

## 5.7 節目冊 PDF

按鈕文字：

```text
查看完整節目冊 PDF
```

PDF 連結：

```text
https://drive.google.com/file/d/1SnO8o6GrUzSX992wnurLEWzWgcTeDE1D/view?usp=drive_link
```

設定：

```html
target="_blank"
rel="noopener noreferrer"
```

不要把 Google Drive PDF 直接 iframe 嵌入首頁，以免拖慢載入。

---

# 第六區：演出結束後前往後台指示影片

標題：

```text
演出結束後，如何前往後台
```

說明文字：

```text
演出結束後，請依照影片中的路線前往後台接學生。
```

影片檔案：

```text
assets/backstage-route.mp4
```

影片預覽圖：

```text
assets/backstage-route-poster.webp
```

HTML 建議：

```html
<video
  controls
  playsinline
  preload="none"
  poster="assets/backstage-route-poster.webp"
>
  <source src="assets/backstage-route.mp4" type="video/mp4">
  您的瀏覽器不支援影片播放。
</video>
```

影片要求：

- 不可自動播放
- 預設靜音與否皆可，但不可強制自動播放
- 使用 `preload="none"`
- 必須顯示播放控制列
- 必須支援 iPhone Safari 內嵌播放
- 不要在頁面開啟時預先下載整段影片
- 影片容器不得超出手機畫面
- 使用 `aspect-ratio: 16 / 9`
- 影片若為直式，改用實際影片比例
- 提供「在新分頁開啟影片」或「直接開啟影片」備用連結

影片壓縮建議：

- MP4
- H.264
- 720p 即可
- 24 或 30 fps
- 影片盡量控制在 10 MB 以下
- 若影片較長，請先剪掉無關停頓
- 音訊若不重要，可降低音訊位元率

若 `backstage-route.mp4` 尚未放入，請顯示：

```text
後台位置指示影片將於活動前補上。
```

不要顯示破圖或無法播放的空白播放器。

---

## 6. 額外連結

### 場館資訊 PDF

雖然主要頁面順序不另設一大區塊，但請在 Hero 活動資訊或地圖按鈕附近放置：

```text
查看場館及交通資訊 PDF
```

連結：

```text
https://drive.google.com/file/d/1dW4hTIKwWlu7rLPG5y-zdenLOuu17KYE/view?usp=drive_link
```

設定：

```html
target="_blank"
rel="noopener noreferrer"
```

不要嵌入 iframe。

---

## 7. 頂部導覽

頁面頂部建立簡單的錨點導覽。

項目：

- 活動資訊
- 日程
- 工作組
- 座位
- 節目冊
- 後台路線

建議 ID：

```text
#top
#schedule
#staff
#seating
#program
#backstage
```

手機版：

- 使用橫向滑動導覽列
- 不需要漢堡選單
- 每個按鈕至少 44px 高
- 可使用 `position: sticky`
- sticky 導覽不可遮住區塊標題
- 所有 section 加入適當 `scroll-margin-top`

---

## 8. 頁尾

頁尾顯示：

```text
桃園市立仁和國民中學管樂團
第 22、23 屆成果發表音樂會
聲動廿二
```

另放：

- 返回仁和國中管樂團首頁
- 最後更新日期
- Google 地圖
- 節目冊 PDF
- 場館資訊 PDF

返回首頁連結：

```text
../
```

---

## 9. 圖片最佳化

### 海報

原始檔：

```text
poster.jpg
```

請另外製作：

```text
poster.webp
```

建議：

- 保持原比例
- 寬度約 900–1200px 即可
- WebP 品質約 75–82
- 首屏載入
- 不使用 `loading="lazy"`
- 使用 `fetchpriority="high"`
- 明確設定 width 與 height

### 座位圖

原始檔：

```text
seating-map.png
```

另外建立：

```text
seating-map-preview.webp
```

建議：

- 預覽圖寬度約 1000–1400px
- 確保區域名稱仍可辨識
- 完整座位號碼只要求在原圖放大後可辨識
- 預覽圖盡量控制在 300–450 KB 內

### 節目冊

原始檔：

```text
program.jpg
```

另外建立：

```text
program-preview.webp
```

建議：

- 預覽圖寬度約 900–1200px
- 文字需維持基本可讀性
- 完整細節可點擊原圖查看
- 預覽圖盡量控制在 250–400 KB 內

### 其他圖片

- 使用 WebP
- 使用 `loading="lazy"`
- 使用 `decoding="async"`
- 必須設定 width 與 height
- 不可載入超過實際顯示尺寸數倍的大圖

---

## 10. 載入速度要求

這個頁面會透過 LINE 或其他通訊軟體傳給家長，必須優先考慮快速開啟。

必要要求：

- 不載入外部字型
- 不載入第三方 JavaScript
- 不預先載入影片
- 不直接嵌入 Google Drive PDF
- 不直接嵌入 Google Maps iframe
- 座位圖與節目冊先載入壓縮預覽圖
- 原始大圖只在使用者點擊時開啟
- JavaScript 使用 `defer`
- CSS 只保留本頁需要的內容
- 不使用大型 icon 套件
- 圖示優先使用簡單 SVG 或文字
- 不使用背景影片
- 不使用大型粒子動畫
- 首頁初始下載量應盡量控制在 1.5 MB 內
- 首頁初始載入不可下載 `backstage-route.mp4`

---

## 11. 響應式設計

請至少測試：

- 375 × 667
- 390 × 844
- 430 × 932
- iPhone Safari
- Android Chrome
- iPad 直向
- iPad 橫向
- 1366 × 768 桌面瀏覽器

必須符合：

- 不出現水平捲動
- 內文字級至少 16px
- 主要按鈕高度至少 44px
- 內容左右留白至少 16px
- 日程在手機上清楚易讀
- 表格在手機上不得被壓成很窄
- 影片寬度不得超出畫面
- 圖片燈箱關閉按鈕必須容易點擊
- iPhone 安全區域需正確處理

可使用：

```css
padding-bottom: env(safe-area-inset-bottom);
```

---

## 12. 無障礙要求

- HTML 必須設定 `lang="zh-Hant"`
- 使用 `header`、`nav`、`main`、`section`、`footer`
- 每個 section 都有標題
- 所有圖片都有正確 `alt`
- 裝飾圖片使用空 `alt=""`
- 所有按鈕都可鍵盤操作
- 燈箱可使用 Esc 關閉
- 焦點樣式不可移除
- 文字與背景對比需足夠
- 不得只用顏色表達重要資訊
- 影片提供簡短文字說明
- 外部連結標示會開新分頁並非必要，但操作需一致

---

## 13. SEO 與 LINE 分享預覽

在 `<head>` 加入：

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="桃園市立仁和國民中學管樂團第 22、23 屆成果發表音樂會家長資訊頁面。">
<meta name="theme-color" content="#a7dae3">

<meta property="og:title" content="聲動廿二｜仁和國中管樂團成果發表音樂會">
<meta property="og:description" content="活動日程、工作組時間、座位圖、節目冊及後台路線資訊。">
<meta property="og:type" content="website">
<meta property="og:url" content="https://rhwb94.github.io/rhjhwb/22_23concert/">
<meta property="og:image" content="https://rhwb94.github.io/rhjhwb/22_23concert/assets/poster.jpg">

<meta name="twitter:card" content="summary_large_image">
```

注意：

- `og:image` 必須使用絕對網址
- 圖片必須能公開存取
- 海報圖片建議維持清楚，避免 LINE 預覽模糊
- 路徑中 `&` 在 HTML 屬性中必要時請正確跳脫

---

## 14. JavaScript 功能

`script.js` 僅需負責：

1. 座位圖放大與關閉
2. 節目冊放大與關閉
3. Esc 關閉燈箱
4. 點擊背景關閉燈箱
5. 若影片不存在，不顯示壞掉的播放器
6. 可選：更新頁尾最後更新日期

不要加入：

- 複雜捲動動畫
- 視差滾動
- 粒子效果
- 滑鼠跟隨效果
- 會影響手機效能的動畫

需支援：

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 15. 建議 HTML 區塊順序

```html
<body>
  <header id="top">
    <!-- sticky 導覽 -->
    <!-- 海報與活動資訊 -->
    <!-- Google 地圖、場館 PDF 快速按鈕 -->
  </header>

  <main>
    <section id="schedule">
      <!-- 當日簡易日程 -->
      <!-- 四張重要提醒卡片 -->
    </section>

    <section id="staff">
      <!-- 工作組抵達時間 -->
    </section>

    <section id="seating">
      <!-- 觀眾座位圖預覽 -->
      <!-- 放大查看 -->
    </section>

    <section id="program">
      <!-- program.jpg 預覽 -->
      <!-- 節目冊 PDF -->
    </section>

    <section id="backstage">
      <!-- 後台位置指示影片 -->
    </section>
  </main>

  <footer>
    <!-- 管樂團資訊與常用連結 -->
  </footer>

  <!-- 原生 dialog 或燈箱 -->
  <script src="script.js" defer></script>
</body>
```

---

## 16. 內容不可自行猜測

已確認內容：

- 活動日期：2026 年 6 月 18 日（四）
- 演出時間：19:00
- 場館：桃園市中壢藝術館
- 地址：桃園市中壢區中美路 16 號
- 自由入場
- 家長最早入場：18:30
- 節目冊 PDF 連結
- 場館資訊 PDF 連結
- 當日簡易日程
- 工作組抵達時間

未提供或尚未確認的內容：

- 後台位置指示影片實際檔案
- 後台影片縮圖
- `program.jpg` 最終尺寸
- 是否需要其他照片
- 是否還要放聯絡人資訊

未確認內容請使用 HTML 註解或暫時隱藏，不可自行虛構。

---

## 17. 完成後檢查清單

請完成後逐項確認：

### 網址

- [ ] `/22_23concert/` 可正常開啟
- [ ] GitHub Pages 重新整理不會 404
- [ ] 返回首頁連結正常
- [ ] 路徑中的 `&` 沒有造成資源載入錯誤

### 內容

- [ ] 活動日期、時間、地點正確
- [ ] Google 地圖按鈕正常
- [ ] 當日簡易日程完整
- [ ] 工作組抵達時間完整
- [ ] 座位圖顯示正常
- [ ] 節目冊圖片顯示正常
- [ ] 節目冊 PDF 可開啟
- [ ] 場館資訊 PDF 可開啟
- [ ] 後台路線影片可播放或顯示尚未上傳提示

### 圖片與影片

- [ ] Hero 使用 WebP
- [ ] Hero 沒有 lazy loading
- [ ] 座位圖預覽使用 WebP
- [ ] 節目冊預覽使用 WebP
- [ ] 原始大圖可放大查看
- [ ] 影片沒有 autoplay
- [ ] 影片使用 `preload="none"`
- [ ] 首頁初始載入不會下載影片
- [ ] 所有圖片都有 width、height 與 alt

### 手機

- [ ] iPhone Safari 可正常閱讀
- [ ] Android Chrome 可正常閱讀
- [ ] 沒有水平捲動
- [ ] 導覽列不遮住標題
- [ ] 按鈕容易點擊
- [ ] 燈箱容易關閉
- [ ] 影片不超出畫面
- [ ] 座位圖與節目冊可放大

### 程式品質

- [ ] 沒有 console error
- [ ] 沒有 404 資源
- [ ] 沒有第三方 UI 套件
- [ ] 沒有 Firebase
- [ ] 沒有外部字型
- [ ] 不影響既有網站其他頁面
- [ ] HTML、CSS、JavaScript 結構清楚
- [ ] 程式中有適量註解，方便日後替換圖片與影片

---

## 18. 完成後回報格式

完成後請回報：

1. 新增了哪些檔案
2. 修改了哪些既有檔案
3. 圖片最佳化後的檔案大小
4. 影片是否已加入
5. 哪些內容仍待補
6. GitHub Pages 測試網址
7. 是否有任何 404 或 console error
8. 手機版測試結果
9. 是否成功開啟：
   - Google 地圖
   - 節目冊 PDF
   - 場館資訊 PDF
   - 座位圖原圖
   - 節目冊原圖
   - 後台路線影片

---

## 19. 最終要求

請直接在現有專案中完成這個頁面，不要只提供範例。

完成後必須：

- 保留現有網站功能
- 確認 GitHub Pages 相對路徑
- 確認所有圖片與影片載入策略
- 確認手機閱讀體驗
- 確認風格與 `poster.jpg` 一致
- 確認內容順序與本文件一致
