DON'T LIKE YOUR MOM v0.5.9 — 上榜診斷與顯示版本（只需更新檔）

已確認線上 GitHub 專案的 JavaScript 是 v0.5.8，但之前的首頁版本顯示被 CSS 隱藏，舊程式也曾錯寫 v0.5.7，無法從玩家手機判斷實際版本。

本版：
- 頂端品牌下顯示由「真正執行的遊戲 JS」設定的 v0.5.9 和 99 張照片，首頁和結果頁都看得到。
- v0.5.9 HTML、JS、CSS 用新的載入網址參數，Service Worker 同步更新並主動檢查新版本。
- 完整存活 45 秒時，送榜使用固定 45000ms（數據也保留原始計時供診斷）。
- 送榜會事先檢查 LIKE、避開媽媽數和 COMBO 的數學關係。
- 若雲端仍拒絕，失敗欄顯示 v0.5.9、LIKE、MOM DODGED、COMBO、原始與送榜毫秒數；請將截圖傳回，就能分析被 SQL 拒絕的原因。
- 沒有變動現有 Supabase SQL、排行榜、99 張照片、排行榜金鑰、好友挑戰抽牌與 45 秒規則。

GitHub 更新：
1. 解壓 ZIP，把 index.html、style.css、script.js、leaderboard.js、sw.js 五檔覆蓋到遊戲根目錄。
2. Commit changes → 等 GitHub Pages 部署。
3. 讓朋友先從 Safari 直接開遊戲網站測試新首頁上方是否出現 v0.5.9。舊主畫面 Web App 可完全關閉重開；若仍舊版，移除主畫面圖示後再從 Safari 加入（本機紀錄可能清除，請留意）。
4. 確認 v0.5.9 後重新玩滿 45 秒、提交分數。
5. 若還是 Invalid score submission，提供顯示完整診斷碼的畫面；此時最可能是已部署 Supabase 的 SQL 驗證規則與本機提供的 SQL 不同，需用 Supabase SQL Editor 查驗，不能盲目放寬反作弊。

請勿把 Supabase secret 或 service_role 密鑰發給他人或上傳 GitHub。 
