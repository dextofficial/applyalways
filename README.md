# Applyly

Automatic job applications. Users upload a CV and preferences, pay per day/week/month, and the platform finds matching jobs, writes a tailored cover letter with AI, and applies from the user's own Gmail. Replies go straight to the user's inbox.

- `backend/`  Node + Express + MongoDB API, daily job runner, Paystack, Gmail, Gemini
- `frontend/` React PWA for users and the owner/admin dashboard (`/admin`)
- `.github/workflows/cron.yml`  free scheduler that triggers the daily runs
- `SETUP.md`  **start here**: step-by-step launch guide

To rename the platform: edit `APP_NAME` in `frontend/src/api.js`, the `<title>` in `frontend/index.html`, and `name` in `frontend/public/manifest.webmanifest`.


Do these in order after you buy the domain. I'll use `applyly.com` as the example, so swap in yours.

**A. Connect the domain**
1. **Website:** in Vercel, open your project → **Settings → Domains** → add `applyly.com` and `www.applyly.com`. Vercel shows the DNS records to add.
2. **Backend:** in Render, open your service → **Settings → Custom Domains** → add `api.applyly.com`. Render shows a CNAME record.
3. At the place you bought the domain (Namecheap, GoDaddy, etc.), open **DNS settings** and add the records Vercel and Render gave you. Wait 10 to 60 minutes until both show a green tick.

**B. Update your app to use the new addresses**
4. **Render → Environment:**
   - `BACKEND_URL` = `https://api.applyly.com`
   - `FRONTEND_URL` = `https://applyly.com`
5. **Vercel → Environment Variables:** `VITE_API_URL` = `https://api.applyly.com/api`. Then **Redeploy**.
6. **GitHub → Settings → Secrets → Actions:** change `BACKEND_URL` to `https://api.applyly.com`.
7. **Paystack:** change the webhook URL to `https://api.applyly.com/api/payments/webhook`.

**C. Tell Google about the new domain**
8. **Google Cloud → Credentials → your OAuth client:** add the redirect URI `https://api.applyly.com/api/gmail/callback`. Keep the old one for now.
9. **Search Console** (search.google.com/search-console): add `applyly.com` as a **Domain** property, and verify it by adding the DNS record Google gives you. Use the same Google account that owns the Cloud project.
10. **Google Auth Platform → Branding:** fill in:
    - App name, logo, support email
    - Homepage: `https://applyly.com`
    - Privacy policy: `https://applyly.com/privacy`
    - Terms: `https://applyly.com/terms`
    - **Authorized domains:** `applyly.com`

**D. Go live and submit**
11. Test once with a test user that connecting Gmail still works on the new addresses.
12. **Audience → Publish app** (switch from Testing to **In production**).
13. Record the **demo video**, upload it to YouTube as unlisted, then open **Verification Center → Prepare for verification**. Paste the video link and write why you need `gmail.send`.
14. Submit, then watch your email for Google's replies.

**What changes when:**
- **After step 12:** anyone can connect without being a test user, but they see an "unverified app" warning, and you're capped at **100 users** until Google approves.
- **After approval:** the warning disappears and the cap is lifted. Also, connections no longer expire every 7 days.

Do you want me to write the demo video script and the "why we need gmail.send" text for step 13?















Here are both.

## 1. Text for "Why do you need gmail.send?"

Paste this into the Verification form:

```
Applyly is a job-application automation service. A user uploads their CV and job preferences, then connects their own Gmail account. Applyly sends the job applications the user requested (a tailored cover letter plus the user's CV attached) from the user's own email address to employers, so that employer replies arrive directly in the user's own inbox.

We request ONLY the scope https://www.googleapis.com/auth/gmail.send, plus the user's email address (userinfo.email) to show which account is connected. This is the narrowest scope that can send email on the user's behalf. We do not request any scope that reads, lists, modifies or deletes email.

We do not read, store, search or analyse any content from the user's Gmail. We only call the Gmail API "messages.send" method to send applications the user asked us to send. The refresh token is stored encrypted (AES-256-GCM). Users can disconnect Gmail at any time inside the app or revoke access at myaccount.google.com/permissions.

Our use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements. Privacy policy: https://applyly.com/privacy
```

Replace `applyly.com` with your domain.

## 2. Demo video script (about 2 to 3 minutes)

**Before recording:**
- Use a **screen recorder** (OBS, or Win+G on Windows).
- Use a **browser window where the address bar is visible**.
- Speak in **English**, and show the real live site, not localhost.
- Record with a Gmail that is allowed to connect.
- Upload to **YouTube as Unlisted**.

**Scene by scene:**

1. **(0:00) Intro.** Show the landing page. Say: *"This is Applyly, at applyly.com. It helps job seekers send job applications automatically from their own Gmail."*
2. **(0:15) Account and data.** Log in as a user. Show the Profile page with the CV uploaded and job preferences. Say: *"The user uploads their CV and sets the jobs they want."*
3. **(0:35) Start the connection.** Go to Home and tap **Connect** next to Gmail. Say: *"To send applications, the user connects their Gmail."*
4. **(0:45) Google consent screen. This is the most important part.** Slow down. Show the **full Google screen** with the app name, the account chosen, and the permission being requested ("Send email on your behalf"). Keep the browser address bar visible. Say: *"Google asks permission to send email on the user's behalf. This is the only Gmail permission we request. We cannot read the user's inbox."* Tick the permission and continue.
5. **(1:15) Connected.** Show the dashboard saying Gmail is connected, with the email address. Say: *"The connected account is shown here, and the user can disconnect at any time."*
6. **(1:30) Sending.** Open the **Applied** page and open one sent application letter. Say: *"Applyly sends the cover letter and CV from the user's own address. We only use the send function to send applications the user requested."*
7. **(1:50) Proof in Gmail.** Open the user's Gmail **Sent** folder and show the application email with the CV attached. Say: *"Here is the email in the user's Sent folder. Replies from employers arrive in this inbox."*
8. **(2:10) Control.** Go back to Home. Tap **Disconnect**. Say: *"The user can disconnect at any moment, and can also revoke access in their Google Account settings."* Show `myaccount.google.com/permissions`.
9. **(2:30) Close.** Show the Privacy Policy page at `/privacy` and say: *"Our privacy policy explains this, and our use of Google data follows the Google API Services User Data Policy, including Limited Use."*

**Common reasons for rejection:**
- The consent screen isn't clearly shown.
- The video uses localhost or a different app name than in your Google settings.
- The privacy policy doesn't mention the Google data and the Limited Use sentence.
- You ask for extra scopes you don't use.

When you're ready, tell me what Google says after you submit and I'll help with any reply.
