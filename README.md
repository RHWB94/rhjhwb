# 仁和國中管樂團網站

仁和國中管樂團網站是桃園市立仁和國民中學管樂團的公開資訊與成果展示平台，面向在校學生、家長、準新生及關心樂團發展的訪客。網站透過樂團特色、專業師資、課程活動與歷屆佳績，呈現室內合奏與行進管樂並行的教育方向，並提供入團資訊、常見問題與聯絡管道。

公開網站：[仁和國中管樂團](https://rhwb94.github.io/rhjhwb/)

## 網站定位

本專案以清楚的資訊架構與跨裝置閱讀體驗為核心，讓訪客能理解樂團的教學內容、師資背景與學習成果，也讓家長能快速找到招生及活動資訊。視覺以團照、明亮底色、彩色光暈與卡片呈現，兼顧樂團形象及內容可讀性。

主要網站採用靜態多頁架構，內容由專案中的 HTML、JavaScript 資料與圖片檔案維護。專案另包含獨立活動頁，以及具備外部資料服務的新生工具；各區域的用途與技術範圍分別管理。

## 主要功能

| 區域 | 提供的資訊與功能 |
| --- | --- |
| [首頁](https://rhwb94.github.io/rhjhwb/) | 樂團品牌主視覺、四項樂團特色、教練介紹與完整經歷。 |
| [師資介紹](https://rhwb94.github.io/rhjhwb/teachers.html) | 依教學領域呈現教師與助教的照片、姓名及專長。 |
| [課程內容](https://rhwb94.github.io/rhjhwb/courses.html) | 八項課程與活動介紹，透過照片卡片與全螢幕相簿呈現學習情境。 |
| [歷屆佳績](https://rhwb94.github.io/rhjhwb/achievements.html) | 按學年度整理比賽成果，支援年度篩選與年度連結。 |
| [常見 Q&A](https://rhwb94.github.io/rhjhwb/faq.html) | 入團、樂器、練習及費用等常見問題，以及家長諮詢表單。 |
| [新生專區](https://rhwb94.github.io/rhjhwb/recruit.html) | 樂團與入團介紹、成果回顧，以及依招生狀態顯示的報名資訊；目前設定為招生關閉。 |
| [成果發表會活動頁](https://rhwb94.github.io/rhjhwb/22_23concert/) | 第 22、23 屆成果發表會的活動資訊、日程、工作組時間、座位圖、節目冊及後台路線影片。 |
| 新生樂器挑選工具 | `Newbie/` 中的獨立工具，提供學生名單、關卡評分、樂器分配及 Excel 匯入／匯出，使用 Firebase 資料服務。 |

網站支援桌機、平板與手機版面。主要互動涵蓋快速導覽、鍵盤操作、對話框焦點管理、年度篩選、表單驗證及減少動態效果設定；觸控導覽使用固定於右下方的單一漢堡按鈕，以沿用桌機玻璃光暈風格的液體動畫展開及收合。

## 技術與專案組成

- **主要網站**：HTML5、CSS3、原生 JavaScript；使用 Vite 提供開發伺服器與多頁建置。
- **內容與素材**：頁面內容、JavaScript 資料、JPG／PNG 原圖及 WebP 尺寸版本，均保存在專案內。
- **外部服務**：FAQ 表單接 Google Apps Script；招生與活動頁使用 Google Forms、Google Drive、Google 地圖及影片連結；`Newbie/` 使用 Firebase 與其自身的前端依賴。
- **網站發布**：公開網址位於 GitHub Pages，資源路徑須兼容 `/rhjhwb/` 子路徑。

```text
專案根目錄/
├── index.html、teachers.html、courses.html、achievements.html、faq.html
├── recruit.html、recruit-closed.html
├── styles.css、home.css、teachers.css、courses.css、recruit.css
├── script.js、courses.js、achievements.js
├── assets/、teachers-photo/、course-photo/
├── 22_23concert/         # 成果發表會資訊頁
├── Newbie/               # 新生樂器挑選工具
├── tests/                # 局部功能回歸測試
├── vite.config.mjs       # 多頁建置與靜態資源複製設定
├── Menu.md               # 目前功能、樣式、資料與維護規範
└── CHANGELOG.md          # 重要階段的變更紀錄
```

## 本機開發

在專案根目錄執行：

```sh
npm ci
npm run dev
```

產生及預覽建置結果：

```sh
npm run build
npm run preview
```

`dist/` 是建置產物。日常維護應修改來源檔，再依發布流程處理建置與部署。新生工具及外部表單的服務設定，請依 [Menu.md](./Menu.md) 中的資料與服務說明維護。

## 專案文件

| 文件 | 用途 |
| --- | --- |
| [README.md](./README.md) | 說明網站定位、服務對象、功能與專案組成。 |
| [Menu.md](./Menu.md) | 導覽目前的功能、樣式及資料來源，定義修改時應保留的行為與驗證方式；修改前必讀。 |
| [CHANGELOG.md](./CHANGELOG.md) | 依日期與階段追蹤重要變更、影響範圍及驗證結果。 |
| [活動頁 Blueprint](./22_23concert/Blueprint.md) | 保留成果發表會頁的原始製作需求；現況與後續維護以 Menu.md 的活動頁紀錄為準。 |

網站及內容歸屬：桃園市立仁和國民中學管樂團。
