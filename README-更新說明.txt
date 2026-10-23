DON’T LIKE YOUR MOM｜v0.8.3 投稿上限 6 件修正

目前規則：每位匿名投稿身份每 24 小時最多 6 件（原 3 件），需站長審核才會公開。

1. GitHub 上傳：覆蓋根目錄的 submit.html、sw.js、index.html。
   不用重傳照片，不用動 49 項成就、好友對戰、排行榜。

2. Supabase：打開原本專案 → SQL Editor → New query。
   貼上 setup-six-submissions-v083.sql 全文並執行 Run。
   手機可以改用 setup-six-submissions-v083-iphone.txt 複製全文。

   重要：只有更新 GitHub 而沒執行 SQL，仍然會在第 4 筆被伺服器拒絕。
   這份 SQL 只取代兩個限額函式，舊有審核紀錄與已公開照片不變。

3. 測試：重新整理遊戲投稿頁，應看到「每 24 小時最多 6 件」。
   既有 24 小時內的投稿仍會計入 6 件額度，不會歸零。

註：這是以原本的 Supabase 匿名身份為單位；更換裝置或清除登入資料可能重建身份。
