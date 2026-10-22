DON'T LIKE YOUR MOM — 社群分享封面更新（v0.6.0 相容）
====================================================

這是小型更新包，只增加社群分享封面與相關標籤，不修改遊戲玩法及程式版本。

上傳到 GitHub 專案 Vmylife/Don-t-like-your-mom 根目錄，維持原始路徑：
  1. index.html                 ← 覆蓋同名檔案
  2. assets/og-share-preview.jpg ← 新增檔案（需放進 assets 資料夾）

請勿把 jpg 放在儲存庫根目錄，也不要誤覆蓋整個 assets 目錄。

更新後可在瀏覽器確認圖片是否公開：
https://vmylife.github.io/Don-t-like-your-mom/assets/og-share-preview.jpg

然後在 Threads、LINE 或其他社群重新貼上：
https://vmylife.github.io/Don-t-like-your-mom/

如果仍然顯示舊預覽，可能是社群平台已經快取；可稍候再試。
公開分享測試時，可以用 ?share=og1 之類的網址參數觸發重新抓取
（例如 https://vmylife.github.io/Don-t-like-your-mom/?share=og1）。
但不是所有平台都會立刻更新，且 PWA 或網站快取可能另外影響顯示。

注意：只保證網站提供正確的 Open Graph 標籤與圖片，無法強制
Threads/LINE 等社群平台每次都一定以大圖形式呈現。

本包保留既有雙人同步對戰 v0.6.0、99 張照片、Supabase 排行榜設定。
未包含或更動 leaderboard-config.js，亦不需要更動 Supabase。
