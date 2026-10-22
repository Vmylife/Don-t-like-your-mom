# DON'T LIKE YOUR MOM v0.5.0 — 更新檔（只包含修改檔案）

這包不是完整遊戲。請先確保你已經安裝 v0.4.9，原本的 72 張照片都還在。

## 更新到 GitHub Pages

1. 解壓 ZIP，把其中 `index.html`、`script.js`、`style.css`、`sw.js`、`leaderboard.js`、`leaderboard-config.js`、`feedback.js`、`setup/` 按原資料夾結構複製到遊戲 GitHub 專案根目錄（覆蓋同名檔案）。
2. 在 GitHub Desktop 按 **Commit to main** → **Push origin**，或透過 GitHub 網頁上傳檔案。
3. 手機重新開啟網頁。若還是看到舊介面，關閉 PWA 後重新開啟；新版 Service Worker 快取版本會自動更新。

## 全球排行榜必須開通雲端（第一次設定）

GitHub Pages 本身無法保存所有人的成績，因此這版採用 Supabase 的雲端 PostgreSQL。**不設定也能完整遊玩、有聲音與震動，但全球排行榜會顯示「尚未啟用」，不是假的全球排行。**

1. 到 https://supabase.com 建立新 Project。
2. 進入 **SQL Editor**，將 `setup/supabase-leaderboard.sql` 的內容全部貼上並執行一次。該 SQL 建立資料表、計分檢查與提供排行榜的 RPC 函數。
3. 從 Supabase Project 取得 **Project URL** 和 **Publishable key**（`sb_publishable_...`，可以放網站前端）。
4. 打開專案根目錄的 `leaderboard-config.js`，填入：

```js
window.DLYM_LEADERBOARD_CONFIG = {
  url: 'https://你的專案ID.supabase.co',
  publishableKey: 'sb_publishable_你的公開金鑰'
};
```

5. 將更新後的 `leaderboard-config.js` Commit & Push。重整網站即可看到「今日榜（台灣時間）／歷史總榜」，45 秒成功存活後可以輸入暱稱上榜。

**安全注意**：`sb_secret_...`、`service_role` / 管理者金鑰絕對不能放進 `leaderboard-config.js`、GitHub 或網頁。只有 Publishable key 能用於前端。不要使用自己的真名當暱稱（暱稱會公開）。

## 遊戲規則／排行榜規則

- 仍然是 45 秒倒數，分數與 4 個難度、媽媽獨照機率與照片素材都不變。
- 只有**成功撐完 45 秒**才可以提交全球榜；誤滑媽媽則仍顯示失敗成績，但不上榜。
- 每局開始時由資料庫核發一次性挑戰票券；同一票券只能提交一次，且資料庫檢查約 45 秒的局長、分數上限與基本合理性；請在該局開始後 1 小時內提交。
- 排行榜顯示**前 100 名單局成績**（不是每個暱稱只留一次）。同分以成功避開的背景媽媽數、最高連擊、最早送出時間排序。
- 此為公開匿名排行，**只能抵擋最簡單的造假，無法保證完全防作弊**；如果之後要開比賽或提供獎金，需要額外的使用者驗證、IP/帳號速率限制、可信的伺服器端判定。
- 無法連網或未設定資料庫時，不會把本機分數冒充全球分數；原本本機最高紀錄仍會保存。
- 音效以 Web Audio 即時合成，預設開啟，可在頂端切換，無須額外 MP3。震動需要瀏覽器支援 `navigator.vibrate`；**iPhone Safari 通常不支援網頁震動**，這屬裝置限制，不影響遊戲與音效。

## 常見問題

- **排行榜顯示「尚未啟用」**：請確認已執行 SQL 並填寫 config 的 URL + Publishable key。
- **HTTP 404 找不到 RPC**：SQL 尚未執行，或 Supabase REST schema 快取尚未更新。
- **HTTP 401/403**：請確認填的是公開 Publishable key，而非 Secret key；確認 SQL 的 `GRANT EXECUTE` 已成功。
- **不符合上榜資格**：誤滑媽媽不計入全球榜，或雲端開局票券連線未成功。
- **音效沒聲音**：先點擊「開始滑卡」解除瀏覽器自動播放限制，再確認頂端 🔊 開啟；手機音量和靜音模式也可能影響播放。
