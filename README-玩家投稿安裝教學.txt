DON'T LIKE YOUR MOM v0.7.0 — 玩家投稿系統
==========================================

【這一版新增】
- 首頁「📸 我要投稿」按鈕；玩家在 submit.html 傳生活照／暱稱／年齡／城市／個人介紹。
- 照片在手機瀏覽器重新編碼成 WebP，去除一般 EXIF 資料；最多 2 MB。
- 投稿照片先進 Supabase PRIVATE bucket，管理員登入 admin.html 逐張審核。
- 通過審核的圖片複製到 PUBLIC bucket，加入「自由模式」隨機卡片。
- 雙人同步房間 / 好友挑戰仍使用固定的原始 99 張，確保兩人順序一致。
- 具管理員權限者可以拒絕、通過、下架照片。
- 限每個匿名身份 24 小時內最多 3 張上傳與 3 件投稿；不是完整防洗版。

【步驟一：備份並更新 GitHub】
到新專案 https://github.com/Vmylife/Don-t-like-your-mom
覆蓋原本 5 個檔案：index.html、style.css、script.js、photo-preload.js、sw.js。
新增 6 個檔案：submit.html、admin.html、community.css、community-api.js、community-ui.js、community-feed.js。
把所有網站檔案放 Repository 根目錄（與舊 index.html 同一層），Commit。

請保留現有 leaderboard-config.js，不要覆蓋、不要公開 Secret / service_role key！
不需重新上傳原本 99 張照片，也不需改 leaderboard.js / live-duel.js。

【步驟二：在既有 Supabase 專案建立投稿系統】
1. 登入 https://supabase.com/dashboard 並選原來的排行榜專案（不是新建專案）。
2. SQL Editor → New query。
3. 用文字編輯器開啟 setup-community-photos.sql，將【全部內容】貼上，按 Run。
   若使用 iPhone，直接開啟 setup-community-photos-iphone.txt 全選拷貝貼上。
4. 成功後，你會得到 dlym_photo_submissions、dlym_photo_admins、
   dlym-submissions（私人）、dlym-approved（公開）等資料庫與 Storage 設定。
5. 若 API 找不到函式，再在 SQL Editor 執行：NOTIFY pgrst, 'reload schema';

【步驟三：啟用匿名投稿身份】
Supabase → Authentication → Sign In / Providers → 找到 Anonymous / Anonymous Sign-Ins → Enable。
這樣玩家不須輸入帳密就能投稿。不同 Dashboard 版面名稱可能略有差異。
匿名帳號可被使用者清除重新建立，所以 3 張限制是【每個身份】而不是跨帳號封鎖。
如果有人惡意灌圖，應在正式開放前再加入 CAPTCHA / Edge Function、防濫用封鎖與清理。

【步驟四：建立「只有你自己」的管理員】
1. Supabase → Authentication → Users → Add User。
2. 建立你專用的 Email + 強密碼（若有 Auto Confirm，可啟用）。
   ※ 這是 Supabase Auth 的「網站管理員帳號」，不是 GitHub 帳密。
3. 回到 SQL Editor → New query，執行下列 SQL，將電子郵件換成你剛建立的 Email：

INSERT INTO public.dlym_photo_admins(user_id)
SELECT id FROM auth.users WHERE email='你自己的管理員信箱@example.com'
ON CONFLICT (user_id) DO NOTHING;

4. 確認 SQL 成功，並執行：
SELECT u.email, a.user_id
FROM public.dlym_photo_admins a
JOIN auth.users u ON u.id=a.user_id;

若沒有出現管理員 Email，檢查步驟 3 是否拼錯或 Auth 帳號是否存在。

【步驟五：手機或電腦審核】
投稿入口：https://vmylife.github.io/Don-t-like-your-mom/submit.html
你的審核頁：https://vmylife.github.io/Don-t-like-your-mom/admin.html

打開 admin.html，輸入 Supabase Auth 管理員 Email / 密碼。
有權限才會載入待審核照片。
「✓ 通過」→ 照片被複製到 dlym-approved → 標為 approved → 下一次自由模式開始時載入。
「✕ 拒絕」→ 標為 rejected，並試著刪除私人原件。
「撤下照片」→ 從公開遊戲列表移除並嘗試刪除已公開的照片。
如果撤下時 Storage 刪除失敗，請到 Supabase → Storage → dlym-approved 手動確認刪除。

【實際測試流程】
A. 用 Safari/Android Chrome 開 submit.html，提交一張「本人已同意且滿 18 歲」的測試照片。
B. 再用 admin.html 登入，確認看得到 PRIVATE 原圖，按通過。
C. 用另一台手機開首頁進自由模式，等待新照片列表載入後可能隨機出現投稿卡。
D. 測試好友同步房間仍能正常使用原先 99 張圖片。
E. 測試拒絕投稿完全不會出現在自由模式；下架照片後新的一局也不應再出現。

【安全與營運提醒】
- 不要把管理員密碼、Supabase service_role/secret key 放到 GitHub！
- PRIVATE 是指待審核照片不提供公開讀取；網站無法保證用戶上傳的素材合法。
- 一般瀏覽器上傳會重新輸出以移除 EXIF，但刻意繞過前端的人仍可能提交特殊檔案；請人工審核。
- 應建立清楚的照片撤回、檢舉與刪除聯絡方式；本版提供管理員撤下功能，尚未包含玩家檢舉表單。
- 正式大量宣傳前，請先用兩個裝置實際測試 Supabase RLS、私人預覽與公開審核流程。
- 若初次開啟網頁尚未見到 v0.7.0，檢查 GitHub Pages 部署／關閉 App 重開，必要時清除站台快取。
- 每個玩家在原始照片裡可被認出；建議不要讓人以未經允許的第三人照片惡作劇投稿。
