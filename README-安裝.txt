DON'T LIKE YOUR MOM v0.8.0 — 49 項認媽成就（本機版）

此 ZIP 只包含需要更新的遊戲檔案；沒有照片，沒有修改 Supabase。

【GitHub 上傳】
覆蓋根目錄：
  index.html
  script.js
  style.css
  sw.js
新增根目錄：
  achievements.js

操作順序：解壓縮 → 上傳以上五個檔案 → Commit changes → 等 GitHub Pages 部署完成。
不用上傳此 README，不要覆蓋 leaderboard-config.js。

【功能】
- 首頁新增「🏅 成就圖鑑」，49 項成就及進度條、分類切換
- 單局 LIKE 高分成就有 10／20／30／40／50／60／65／70／75／80
- 認媽、連擊、背景媽媽、長期總數、完美判斷、連續完賽等挑戰
- 結算解鎖時顯示通知，可點進圖鑑查看
- 延用同一瀏覽器的「原本個人最高 LIKE」紀錄（舊版沒有的累積次數不能補算）
- 不需要帳號、不需要 Email、不改排行榜和遊戲難度

【資料儲存提醒】
成就目前使用 localStorage 儲存於各個裝置瀏覽器，換手機、換瀏覽器或清除網站資料可能遺失。
這是單機榮譽系統，不構成經伺服器驗證的競技成果。

【GitHub 連線說明】
助理嘗試透過已連接 GitHub 直接建立更新分支，但 GitHub API 回覆 403 Resource not accessible by integration。
因此本 ZIP 尚未替您部署到 GitHub；需要先由您上傳，或日後確認 GitHub 連接器有程式碼寫入權限。
