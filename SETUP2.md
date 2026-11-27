# APPLYLY SETUP GUIDE (beginner version)

Follow the steps IN ORDER. Do not skip ahead. Everything is free to start.
Plan for 2 to 3 hours the first time. You can stop after any step and continue later.

**Use a laptop or desktop computer.** Several steps (unzipping, uploading folders, running commands) are very hard on a phone.

---

## BEFORE YOU START: open a notepad

You will collect "keys" (long secret codes) one by one. Open a notepad file and write these names down as headings. Fill each in as you get it:

```
JWT_SECRET=
CRON_SECRET=
ENCRYPTION_KEY=
MONGODB_URI=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GEMINI_API_KEY=
JOOBLE_API_KEY=
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
PAYSTACK_SECRET_KEY=
BACKEND_URL=      (your Render address, from Step 7)
FRONTEND_URL=     (your Vercel address, from Step 8)
```

**Never share these keys with anyone, never post them in chat, never upload the notepad to GitHub.**

### The 3 things you need installed first
1. **Node.js**: go to **nodejs.org**, download the **LTS** version, install it (keep clicking Next). Needed for Step 2 and Step 11.
2. A web browser (Chrome is best).
3. A Gmail account for yourself.

---

## STEP 1: Put the code on GitHub

GitHub is the online storage where Render and Vercel will read your code from.

1. Go to **github.com** and sign up (free).
2. Tap the **+** at the top right, then **New repository**.
3. Repository name: `applyly`. Choose **Private**. Tap **Create repository**.
4. On your computer, find `applyly.zip`. Right-click it and choose **Extract all** (Windows) or double-click it (Mac). You get a folder called `applyly`. Open it. You should see: `backend`, `frontend`, `.github`, `README.md`, `SETUP.md`.
   - If you cannot see `.github`: turn on "Show hidden files" (Windows: File Explorer, View, Show, Hidden items. Mac: press Cmd + Shift + . in Finder).
5. On your new GitHub repository page tap **uploading an existing file**.
6. Select EVERYTHING inside the `applyly` folder (not the folder itself, the stuff inside it) and drag it into the GitHub page. Wait until all files finish uploading.
7. Scroll down and tap **Commit changes**.

**Check:** your repository page now shows the folders `backend`, `frontend` and `.github`. If `.github` is missing, upload it again as a folder.

---

## STEP 2: Make your 3 secret codes

1. Open a terminal:
   - **Windows:** press the Windows key, type `cmd`, press Enter.
   - **Mac:** press Cmd + Space, type `terminal`, press Enter.
2. Paste this line and press Enter:
   ```
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
   A long code appears. Copy it into your notepad as `JWT_SECRET`.
3. Press the same line again (up arrow, then Enter). Copy the new code as `CRON_SECRET`.
4. Now paste this different line and press Enter:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copy the result as `ENCRYPTION_KEY`.

**Important:** never lose or change `ENCRYPTION_KEY` after users connect Gmail, or their connections will stop working. Keep a backup copy somewhere safe.

---

## STEP 3: MongoDB Atlas (your database)

1. Go to **mongodb.com/atlas** and sign up.
2. Create a **free cluster** (choose the **M0 Free** option). Any region is fine; choose one near you if offered.
3. When asked to create a database user:
   - Username: `applyly`
   - Password: make one using only letters and numbers (no symbols). Write it down.
4. When asked about network access, add the IP address `0.0.0.0/0` (this means "allow from anywhere", needed so Render can connect). You can also find this later under **Network Access, Add IP Address, Allow access from anywhere**.
5. Click **Connect**, choose **Drivers**, and copy the connection string. It looks like:
   `mongodb+srv://applyly:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`
6. Edit it: replace `<password>` with your real password, and add `applyly` right after `.net/` so it looks like:
   `mongodb+srv://applyly:YOURPASSWORD@cluster0.abcde.mongodb.net/applyly?retryWrites=true&w=majority`
7. Save that as `MONGODB_URI`.

---

## STEP 4: Cloudinary (stores users' CVs)

1. Go to **cloudinary.com** and sign up (free).
2. On the dashboard, find and copy: **Cloud name**, **API Key**, **API Secret**.
3. Save them as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

---

## STEP 5: Gemini (writes the cover letters)

1. Go to **aistudio.google.com** and sign in with your Google account.
2. Open **Get API key** (left menu, **API Keys**).
3. **If "Create API key" fails with "Failed to create project":**
   - Open **console.cloud.google.com** in the same browser, accept the terms.
   - At the top, tap the project selector, then **New project**. Name it `applyly`, tap **Create**.
   - Go back to AI Studio, **API Keys** page, tap **Import projects**, pick `applyly`.
4. Tap **Create API key**, choose your `applyly` project, tap **Create key**.
5. Copy the key (starts with `AIza`) and save it as `GEMINI_API_KEY`.

**Notes:**
- The app uses the model name `gemini-2.5-flash` by default (Google shut down the older gemini-2.0 models on 1 June 2026). Google renames models over time. If letters fail later with "model not found", look at the current model names in AI Studio and change the `GEMINI_MODEL` setting on Render (Step 7).
- The free tier has limits. When you have many users you will need to turn on billing in Google; it is cheap per letter.
- Later, to switch to Claude: set `AI_PROVIDER=claude`, add `ANTHROPIC_API_KEY`, and set `ANTHROPIC_MODEL` to a current model name from docs.claude.com.

---

## STEP 6: Job sources (where jobs come from)

**Remotive** and **RemoteOK** (remote jobs worldwide) need no key. They work automatically.

**Jooble (good for Nigeria):**
1. Go to **jooble.org/api/about** and register.
2. They email you an API key. Save it as `JOOBLE_API_KEY`.

**Adzuna (UK, US, Canada, South Africa, India and others. It does NOT cover Nigeria):**
1. Go to **developer.adzuna.com** and sign up.
2. Create an application and copy the **App ID** and **App Key**.
3. Save them as `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`.

If either is slow to approve, skip it for now. The app works with whatever you have. You can turn sources on or off later in Admin, Settings.

Remotive and RemoteOK ask users of their data to credit them. Check each site's current terms before you launch publicly.

---

## STEP 7: Put the backend online (Render)

1. Go to **render.com** and sign up with your GitHub account (this connects them).
2. Tap **New**, then **Web Service**. Choose your `applyly` repository (if it is not listed, tap **Configure account** and allow Render to see it).
3. Fill in:
   - **Name:** `applyly-api` (this becomes part of your web address)
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free
4. Scroll to **Environment Variables** and add these one by one (name on the left, value on the right):

   | Name | Value |
   |---|---|
   | `MONGODB_URI` | from Step 3 |
   | `JWT_SECRET` | from Step 2 |
   | `CRON_SECRET` | from Step 2 |
   | `ENCRYPTION_KEY` | from Step 2 |
   | `CLOUDINARY_CLOUD_NAME` | from Step 4 |
   | `CLOUDINARY_API_KEY` | from Step 4 |
   | `CLOUDINARY_API_SECRET` | from Step 4 |
   | `AI_PROVIDER` | `gemini` |
   | `GEMINI_API_KEY` | from Step 5 |
   | `GEMINI_MODEL` | `gemini-2.5-flash` |
   | `JOOBLE_API_KEY` | from Step 6 (skip if none) |
   | `ADZUNA_APP_ID` | from Step 6 (skip if none) |
   | `ADZUNA_APP_KEY` | from Step 6 (skip if none) |
   | `FRONTEND_URL` | type `https://example.com` for now (we fix it in Step 8) |
   | `BACKEND_URL` | type `https://example.com` for now (we fix it right below) |

   Leave Google and Paystack variables out for now; we add them in Steps 9 and 10.
5. Tap **Create Web Service**. Wait for the deploy to finish (a few minutes).
6. At the top of the page you will see your address, like `https://applyly-api.onrender.com`. Copy it. Save as `BACKEND_URL`.
7. Go to **Environment**, edit `BACKEND_URL` to your real Render address (no slash at the end). Save. Render redeploys itself.
8. Test: open `https://YOUR-RENDER-ADDRESS/api/health` in your browser. You should see `{"ok":true}`.

**About the free plan:** Render's free plan "goes to sleep" when nobody uses it for about 15 minutes. The first visit after sleeping takes up to a minute. This is fine for testing. When you have paying users, upgrade to the paid plan (about $7 a month) so it never sleeps.

---

## STEP 8: Put the website online (Vercel)

1. Go to **vercel.com** and sign up with GitHub.
2. Tap **Add New**, then **Project**. Import your `applyly` repository.
3. Set **Root Directory** to `frontend` (tap Edit next to it). Framework should show **Vite**.
4. Open **Environment Variables** and add:
   - Name: `VITE_API_URL`
   - Value: `https://YOUR-RENDER-ADDRESS/api` (your Render address from Step 7 with `/api` on the end)
5. Tap **Deploy**. When done, Vercel shows your website address, like `https://applyly-xyz.vercel.app`. Copy it. Save it as `FRONTEND_URL` (no slash at the end).
6. Go back to **Render**, **Environment**, edit `FRONTEND_URL` to this real address. Save (Render redeploys).

Open your Vercel address. You should see the login page.

---

## STEP 9: Google sign-in so users can send from their Gmail

This part makes Gmail send the applications. You are creating a "Google app" that users give permission to. Do it carefully.

1. Open **console.cloud.google.com** (same Google account). At the top, make sure your `applyly` project is selected.
2. Use the top search bar, type **Gmail API**, open it, tap **Enable**.
3. Search **OAuth consent screen** (it may be called **Google Auth Platform**) and open it.
   - Tap **Get started**.
   - App name: `Applyly`. User support email: your email. Tap **Next**.
   - Audience: choose **External**. Tap **Next**.
   - Contact email: your email. Tick the agreement box. Tap **Create**.
4. Open **Data Access** (sometimes called **Scopes**). Tap **Add or remove scopes** and add these two:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/userinfo.email`
   Tap **Update**, then **Save**.
5. Open **Audience**. Under **Test users** tap **Add users**, and add your own Gmail plus the Gmail of each friend who will test. Only these people can connect Gmail while the app is in testing mode (maximum 100).
6. Open **Clients** (or **Credentials**, then **Create credentials**, then **OAuth client ID**).
   - Application type: **Web application**
   - Name: `Applyly web`
   - Under **Authorized redirect URIs** tap **Add URI** and enter exactly:
     `https://YOUR-RENDER-ADDRESS/api/gmail/callback`
     (use your real Render address; no spaces; no slash at the end)
   - Tap **Create**.
7. A box shows **Client ID** and **Client secret**. Copy both. Save as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
8. Go to **Render**, **Environment**, and add two variables with those names and values. Save (Render redeploys).

**Testing-mode limits (important):**
- Only the test users you added can connect.
- Their connection **expires every 7 days**. Testers must tap **Reconnect** on the dashboard weekly.
- Google may show a "Google hasn't verified this app" screen. Testers tap **Advanced**, then **Continue**. This is normal in testing mode.

**Before real public launch** you must submit for Google verification. Prepare: your own website domain, a privacy policy page, a terms page, and a short demo video showing how you use the send-email permission. Start early; review can take days or weeks. Read Google's current "OAuth app verification" help page, because the rules change.

---

## STEP 10: Paystack (payments)

1. Go to **paystack.com** and sign up. Stay in **Test mode** for now (there is a Test/Live switch at the top).
2. Open **Settings, API Keys & Webhooks**.
3. Copy the **Test Secret Key** (starts with `sk_test_`). Save as `PAYSTACK_SECRET_KEY`.
4. In the same page set **Test Webhook URL** to:
   `https://YOUR-RENDER-ADDRESS/api/payments/webhook`
   Save.
5. Go to **Render, Environment**, add `PAYSTACK_SECRET_KEY` with that value. Save.

**To take real money later:** finish Paystack's business verification, switch to Live mode, copy the **Live Secret Key** (`sk_live_`), put it in Render in place of the test key, and set the **Live Webhook URL** to the same address as above.

Paystack takes a fee on each payment. On a tiny ₦150 payment the fee is a big share, which is why weekly and monthly plans are included. Check Paystack's current fees on their website.

---

## STEP 11: Create the plans and your admin account (on your computer)

You do this once from your computer's terminal.

1. In your unzipped `applyly` folder, open the `backend` folder.
2. Inside `backend`, create a new text file named exactly `.env` (with the dot at the start, no .txt). Put ONE line in it, using your real database link from Step 3:
   ```
   MONGODB_URI=mongodb+srv://applyly:YOURPASSWORD@cluster0.abcde.mongodb.net/applyly?retryWrites=true&w=majority
   ```
3. Open a terminal inside the `backend` folder:
   - **Windows:** open the `backend` folder in File Explorer, click the address bar, type `cmd`, press Enter.
   - **Mac:** right-click the `backend` folder, choose **New Terminal at Folder**.
4. Run these three, one at a time, waiting for each to finish:
   ```
   npm install
   ```
   ```
   npm run seed
   ```
   ```
   npm run create-admin -- "Your Name" you@email.com YourStrongPassword
   ```
   (Use your real name, email and a strong password of 8 or more characters. Keep the quotation marks around your name.)
5. You should see "Starter plans created" and "Admin created".

Now open `https://YOUR-VERCEL-ADDRESS/admin/login` and log in with that email and password. This is your owner dashboard.

**To add another admin later:** run the `create-admin` command again with different details.

**To change prices:** log in as admin, open **Plans**.

---

## STEP 12: The scheduler (makes applications run by themselves)

The scheduler wakes your backend 8 times a day so it applies for paid users. You will never press a button for this.

1. On GitHub, open your `applyly` repository.
2. Tap **Settings** (top row), then **Secrets and variables**, then **Actions**.
3. Tap **New repository secret** and add two secrets:
   - Name: `BACKEND_URL`, Value: `https://YOUR-RENDER-ADDRESS` (no `/api`, no slash at the end)
   - Name: `CRON_SECRET`, Value: the same `CRON_SECRET` you used on Render
4. Open the **Actions** tab. If GitHub asks, tap the green button to enable workflows.
5. Open **Run applications** in the left list, tap **Run workflow**, and run it once as a test. A green tick means it worked.

**Notes:**
- GitHub may run scheduled jobs a few minutes late. If a repository has no activity for 60 days, GitHub pauses scheduled jobs; just re-enable it in the Actions tab.
- Free alternative: **cron-job.org**, set it to send a POST request to `https://YOUR-RENDER-ADDRESS/api/cron/run` with the header `x-cron-secret: YOUR_CRON_SECRET`.
- The "Run applications now" button in Admin, Overview is only for **testing**. You do not need it day to day.

---

## STEP 13: Test everything from start to finish

1. Open your website and **Register** a normal user account (use a different email from your admin one).
2. Go to **Profile**: upload a CV (PDF or DOCX with real text, not a scanned photo). Enter a job title (like "Data Analyst"), choose Remote, and save.
3. On **Home**, tap **Connect** for Gmail. Use a Gmail you added as a test user in Step 9.
4. Go to **Plans** and pay with a Paystack **test card** (find test card numbers on Paystack's documentation page).
5. Log in as admin. Go to **Jobs** and add a job: use your own second email address as the apply email, so you can see exactly what an employer would receive.
6. In admin, **Overview**, tap **Run applications now** (this is just for testing).
7. Wait about a minute. Check admin **Applications**, and check the user's **Applied** page. Also check the email inbox you used as the apply address.

If something fails, copy the exact error message and send it to Claude.

---

## HOW IT WORKS

- 8 times a day, for every paid user with a CV and Gmail connected, the system fetches jobs for their titles and locations, scores them against their preferences, and applies to the best matches. The daily limit is split across the runs so Gmail is never flooded.
- It only sends an email application when the job post contains a real apply email address. Jobs that only have an apply link go to the user's **Apply manually** list.
- Emails are sent from the user's own Gmail with their CV attached, so replies land in their own inbox.
- When a plan ends, applications stop, their data stays safe, and they get an alert in the app.

## HONEST LIMITS

1. **Few job posts include an email address.** This is the biggest factor in results. Big job boards mostly use apply forms. The **Jobs** page in admin (where you add email-based openings you find) is your best way to increase this. Many Nigerian employers do post email addresses.
2. **Job site rules.** The app uses job feeds, not scraping or auto-filling LinkedIn/Indeed. Keep it that way to avoid bans.
3. **Gmail limits.** Applications are spread out through the day. Do not raise the per-day limit aggressively.
4. **Never promise jobs**, only applications sent.
5. **Privacy.** You hold CVs and personal data. Add a privacy policy and terms before launch (Google also requires them). Nigeria's NDPR applies, and GDPR applies for EU users.
6. **Salary filter** only compares when the currencies match (the app does not guess exchange rates).
7. **Alerts** are inside the app. Phone push notifications can be added later.
8. This code was written without being able to run it. Expect a small bug or two. Send the exact error to Claude and it will be fixed.

## ADMIN DASHBOARD CHEAT SHEET

- **Overview:** revenue, users, sent today, test run button
- **Users:** search, suspend, give free days
- **Applications:** every letter sent, and failures
- **Payments:** history and refunds
- **Plans:** create or edit price, applications per day, and duration
- **Settings:** maximum applications per day (hard ceiling), match strictness, letter style, source on/off
- **Promos:** discount codes
- **Jobs:** add email-based job openings
- **Blacklist:** companies to never apply to
- **Announce:** message all users

## COMMON PROBLEMS

- **"Missing env vars" in Render logs:** one of the Step 7 variables is missing or misspelled.
- **Login page loads but nothing works:** `VITE_API_URL` on Vercel is wrong, or `FRONTEND_URL` on Render is wrong. After changing a Vercel variable, redeploy the site.
- **"redirect_uri_mismatch" when connecting Gmail:** the redirect address in Step 9 is not exactly your Render address plus `/api/gmail/callback`.
- **Gmail "access blocked":** the user's email is not in the test users list (Step 9, item 5).
- **No applications sent:** the user needs an active plan, a CV, Gmail connected, and at least one matching job with an apply email. Check admin **Applications** for failures and the **Jobs** page for how many jobs have emails.
- **Letters fail:** check `GEMINI_API_KEY` and the model name (Step 5 notes).
