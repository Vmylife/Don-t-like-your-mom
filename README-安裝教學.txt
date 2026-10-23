DON'T LIKE YOUR MOM — v0.8.4 私人營運統計後台
===============================================

【先做：Supabase SQL】（此步驟必要）
1. 用你原本的 Supabase 帳號登入 https://supabase.com/dashboard
2. 進入同一個排行榜與照片投稿的專案 → SQL Editor → New query
3. 開啟隨附的 setup-private-analytics-v084-iphone.txt，將全部內容貼上並按 Run。
4. 執行成功後，再繼續更新 GitHub。不要重新執行舊版投稿／排行榜 SQL。

【再做：GitHub 更新】
只需將下面 8 個檔案按同名與路徑上傳到原本 repository 根目錄，Commit。

覆蓋：
  index.html
  script.js
  sw.js
  admin.html

新增：
  game-metrics.js
  analytics.html
  analytics.css
  analytics-ui.js

不要上傳/覆蓋 leaderboard-config.js，不必重新上傳照片。
這次不必更動全球排行榜 SQL，也不必增加管理員帳號。

【開啟私人後台】
https://vmylife.github.io/Don-t-like-your-mom/analytics.html

可用現有「投稿審核後台」的管理員 Email + 密碼登入。
登入 admin.html 後也有「📊 私人營運統計」入口。
非管理員就算知道網址，也無法讀取統計資料。

【後台提供】
- 進站訪次（匿名分頁工作階段；非精準真人數）
- 開局次數、成功完賽、誤滑媽媽、完賽率
- 區間送榜次數、歷史成功送榜數、歷史不同暱稱、歷史最高 LIKE
- 7／14／30 天趨勢長條圖、逐日明細

【重要限制】
- 進站／開局／完賽／誤滑媽媽：從本次 SQL + 網站兩者上線後才開始記錄。
  舊版本未蒐集過的事件無法補回。
- 歷史成功送榜紀錄直接讀取原本的 dlym_leaderboard_scores，因此能顯示舊戰績。
- 不強迫玩家登入。這是匿名工作階段統計，不等同實際玩家人數。
- 若玩家突然關閉網頁、斷線或關閉瀏覽器，可能出現「開局卻沒有結束事件」，
  因此完賽率只是估算，不是無法作弊的競賽數據。
- 未記錄姓名、Email、IP、GPS 或照片到新的遊戲事件表；平台底層的連線日誌仍依 Supabase 規定管理。
- 匿名事件可被惡意模擬；若流量暴增，應增加伺服端濫用防護及資料清理策略。
- SQL 已開啟 RLS、撤銷對匿名及一般登入使用者的事件表讀取權限。
  報表 RPC 還會檢查 dlym_photo_admins 白名單；只登入 Supabase 匿名身份無法查看。

【測試】
1. GitHub Pages 完成新版本部署後，在首頁應看到 v0.8.4。
2. 用另一支手機/瀏覽器開啟網站，打一局（勝利或失敗皆可）。
3. 開啟 analytics.html，用你的管理員帳號登入，選擇 7 天，按更新。
4. 進站／開局／結果的數字應增加；全球排行榜原有紀錄不變。
5. 若出現 "Could not find function"，檢查 SQL 是否 Run 成功、同一個 Supabase 專案。

【安全】
任何 SQL、管理員密碼、Supabase secret / service_role key 都不要直接放進 GitHub 網頁檔案。
本更新包不包含 leaderboard-config.js 或任何私人金鑰。
