DON'T LIKE YOUR MOM v0.7.1
功能：排行榜新增「🏅 歷代日冠」，每日第一名永久留名
===================================================

一、GitHub 更新（先做這個）

1. 在 GitHub 的 Vmylife/Don-t-like-your-mom 專案開啟根目錄。
2. 把更新 ZIP 裡這 5 個檔案上傳到根目錄，直接覆蓋舊版：
   - index.html
   - style.css
   - script.js
   - leaderboard.js
   - sw.js
3. GitHub 點 Commit changes，等 GitHub Pages 部署完成。
4. 重新開遊戲，左上方確認版本 v0.7.1。

注意：
- ZIP 不包含 99 張照片，不要動 assets。
- 不要更動 leaderboard-config.js（保留原有 Supabase 設定）。
- SQL/TXT/README 只需在自己的裝置開啟，不需要上傳到 GitHub。

二、Supabase 安裝（這一步不能省略）

1. 打開 https://supabase.com/dashboard ，登入原本有排行榜的 Supabase 專案。
2. SQL Editor → New query。
3. 開啟 setup-daily-champions-iphone.txt（手機可開）或
   setup-daily-champions.sql（電腦用），全選複製全文。
4. 貼到 SQL Editor，按 Run。正常會顯示最近 10 天的冠軍資料，
   如果只有今天有成績，顯示 0 筆也是正常，因為今天還沒結算。
5. 回到遊戲，排行榜 → 🏅 歷代日冠。

三、日冠規則

- 台灣時間每日 00:00～23:59:59 算同一天。
- 只有每天「結束時」的最終第一名才會永久留名。
- 前一天的冠軍在跨日後，第一次打開「歷代日冠」時自動補存。
- 今天尚未結束，會顯示「⏳ 今日暫定第一名」，不是正式記錄。
- 名次比較：LIKE 高 > 避開媽媽多 > 最高 COMBO 高 > 上榜較早。
- SQL 一次安裝會把安裝前、資料庫裡仍保有成績的過去日期補登。
- 歷代日冠依日期由新到舊顯示，每頁 40 位，可點載入更多。
- 冠軍快照存進獨立資料表，不會被隔天第一名覆蓋。

四、測試與除錯

- 如果新分頁顯示 Could not find the function ...
  → 沒有在正確的 Supabase 專案執行 SQL，或 schema cache 還沒更新。
    再執行：NOTIFY pgrst, 'reload schema';

- 可用 SQL Editor 執行：
  SELECT champion_date, player_name, likes, hidden_avoided, best_combo
  FROM public.dlym_daily_champions
  ORDER BY champion_date DESC LIMIT 20;

- 如果今日榜有人，但歷代日冠空白：
  這是正常的。等台灣時間隔天 00:00 後再打開新分頁即可。

五、重要提醒

目前冠軍是從「全球排行榜既有成績」結算，因此如果排行榜存在
偽造成績，也可能成為日冠。原有防作弊規則保持不變。

永久保存是指紀錄獨立存在 Supabase 資料表；只要資料庫未被刪除，
冠軍不會因每日榜更新而消失。這不是在 GitHub 寫死的名單。

本 ZIP 的 SQL 使用資料庫函式讀取時補存，不依賴付費排程，
因此如果午夜沒有人打開網站，隔天有人查看時仍會補記。
