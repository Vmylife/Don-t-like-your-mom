# DON'T LIKE YOUR MOM — v0.4 真人交友版

GitHub Pages 靜態遊戲：把此資料夾所有內容上傳到儲存庫根目錄，Settings → Pages → Deploy from a branch → main /(root)。

## 這版照片來源與規則

- **23 張純路人**：來自「純路人.zip」，選出非自拍、差異較大的第三人稱人物照片；可以右滑 LIKE +1。
- **17 張媽媽亂入**：包含原本 12 張與「亂入(1).zip」新增 5 張，右滑立即失敗，左滑可避開。
- **5 張媽媽獨照**：拿掉原本橫向灰底的 mom_08.webp；右滑立即失敗。
- **所有卡片圖片都是 WebP**，遊戲不再引用原始 PNG。
- 在 `art-data.js` 的 `spot` 用原始照片百分比標示臉部中心與圈圈直徑，失敗揭曉使用原圖長寬比例，不再拉伸造成偏移。
- 30 秒挑戰：成功右滑純路人加 1 分，右滑有媽媽的照片 GAME OVER。

## 檔案說明

- `index.html` 首頁、交友卡、結算
- `style.css` UI / 手機樣式 / 失敗提示圈
- `script.js` 30 秒計時、左右滑、照片預載、計分
- `art-data.js` 照片與媽媽位置座標
- `sw.js` 離線快取與自動更新
- `assets/profiles/` 真人照片（共 45 張）

## 更新舊 GitHub 專案

用 GitHub Desktop 將這份專案內容覆蓋原專案。刪除舊版 `assets/profiles` 目錄，拷貝這份新的 `assets/profiles`，再 Commit → Push。保留 `.git` 資料夾。

若看到舊照片，關閉網頁分頁後重新開啟或清除該站快取；本版 service worker 已提高快取版本號。
