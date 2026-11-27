# Applyly Go-Live Plan

Nov 26, 2026 · @Claude Excel

## Overview

You can open Applyly to the public in roughly 3 to 6 weeks. The slowest part is Google's review of the Gmail permission, which takes days to weeks and is outside your control, so start it first.

Order of work:

1. Buy a domain and set up a support email.
2. Publish the landing page, Privacy Policy and Terms (Google requires them).
3. Move the website and backend onto your domain.
4. Submit the app to Google for verification.
5. Switch Paystack to live mode.
6. Upgrade hosting and AI so the free-tier limits do not break the app.
7. Run a pilot with 10 to 20 real users.
8. Launch publicly and promote it.

Three things block a public launch: Google verification (otherwise only listed test users can connect Gmail), Paystack live mode (otherwise no real money), and a Render plan that never sleeps (otherwise daily runs can fail).

## Costs

Expect to pay about $8 a month at minimum (hosting plus domain), rising to about $36 if you also need Vercel Pro and a paid database, plus a small amount for AI letters. Prices in USD, checked 26 Nov 2026.

| Item | When you pay | Cost | Note |
| --- | --- | --- | --- |
| Domain (.com) | Yearly | About $10-15 per year (approximate, registrar page not opened) | Turn on auto-renew |
| Render backend that never sleeps | Monthly | [$7 per month](https://render.com/pricing.md) | The free service [spins down after 15 minutes idle](https://render.com/docs/free) and takes about a minute to wake |
| Gemini API, paid tier | Per letter | [gemini-2.5-flash: $0.30 per 1M input tokens, $2.50 per 1M output](https://ai.google.dev/gemini-api/docs/pricing) | My estimate: about $0.002 per letter, so about $1.20 per month for a user at 20 applications a day |
| MongoDB Atlas | Free until you outgrow it | [Flex: $8 to $30 per month](https://www.mongodb.com/docs/atlas/billing/atlas-flex-costs/) | Includes 5 GB |
| Vercel website | Free on Hobby | [Pro is $20 per user per month](https://vercel.com/docs/plans/hobby) | I could not confirm from their pages whether Hobby allows a paid commercial product. Read their Terms before launch |
| Cloudinary (CV storage) | Free to start | Not checked | Watch the storage limit as CVs pile up |
| Paystack | Per payment | [1.5% + N100, N100 waived under N2,500, capped at N2,000](https://support.paystack.com/en/articles/2130306) | A N900 weekly plan costs about N13.50 in fees; N150 costs about N2.25. This is lower than I said earlier |
| Google verification | Once | [No fee stated; gmail.send is a sensitive scope, review about 10 business days](https://support.google.com/cloud/answer/13463817) | Not guaranteed, depends on how fast you answer Google |
| Business registration, lawyer, data-protection registration | Once | Varies, not priced here | Ask a Nigerian lawyer what applies to you |

Important: Google says content sent on the [free Gemini tier may be used to improve Google's products](https://ai.google.dev/gemini-api/docs/pricing). Users' CVs are personal data, so switch to the paid tier before real users sign up. Also, `gemini-2.0-flash` (the default I put in the setup guide) was shut down on 1 June 2026. Change `GEMINI_MODEL` on Render to `gemini-2.5-flash` now.

## Phase 1: Domain, email and branding

Buy your own domain first. Google will not verify an app that runs on a `vercel.app` or `onrender.com` address, and users trust a real domain more.

1. Pick the final app name and check nobody else already sells under it. Google requires the name on the consent screen to match your website.
2. Buy a `.com` (or `.ng`) domain from a registrar such as Namecheap or a Nigerian one like Truehost. Use a card you can renew every year, and turn on auto-renew.
3. Set up a support address like `support@yourdomain.com`. Many registrars offer free email forwarding to your Gmail. You will use this address on Google, Paystack and the policy pages.
4. Make a square logo (PNG, about 120 by 120 px) for Google's consent screen.

Done when: you own the domain, can receive mail at the support address, and have a logo file.

## Phase 2: Privacy Policy, Terms and landing page

Google checks these pages by hand, and rejects apps whose policy does not match what the app really does.

1. Run the Copilot prompt for the public pages (landing page at `/`, plus `/privacy`, `/terms`, `/contact`) in your project.
2. Replace the placeholders in `frontend/src/api.js`: your domain and your support email.
3. Read the Privacy Policy against the real app. It must say that you request only the Gmail send permission, never read the inbox, and store the Google token encrypted.
4. Check it contains this sentence word for word: "Applyly's use and transfer of information received from Google APIs to any other app will adhere to the Google API Services User Data Policy, including the Limited Use requirements."
5. List Google Gemini, Cloudinary, MongoDB Atlas, Paystack, Render and Vercel as the services that handle user data, and say which Gemini tier you use.
6. Write your own refund rule in the Terms (for example: contact support within 48 hours if no applications were sent).
7. Push to GitHub and open all four pages while logged out. They must load without signing in.

Done when: `/privacy` and `/terms` load for anyone, and nothing in them is untrue. Paying a Nigerian lawyer to review both is optional but worthwhile, because you hold CVs and personal data under the Nigeria Data Protection Act.

## Phase 3: Move the app to your domain

Use `yourdomain.com` for the website and `api.yourdomain.com` for the backend. Order matters, so do these in sequence.

1. **Vercel:** Project, Settings, Domains. Add `yourdomain.com` and `www.yourdomain.com`.
2. **Render:** your service, Settings, Custom Domains. Add `api.yourdomain.com`.
3. **Registrar DNS:** add the records Vercel and Render show you. Wait 10 to 60 minutes until both show a green tick.
4. **Render, Environment:** set `BACKEND_URL` to `https://api.yourdomain.com` and `FRONTEND_URL` to `https://yourdomain.com`.
5. **Vercel, Environment Variables:** set `VITE_API_URL` to `https://api.yourdomain.com/api`, then redeploy.
6. **GitHub, Settings, Secrets, Actions:** set `BACKEND_URL` to `https://api.yourdomain.com`.
7. **Paystack:** change the webhook URL to `https://api.yourdomain.com/api/payments/webhook`.
8. **Google Cloud, your OAuth client:** add the redirect URI `https://api.yourdomain.com/api/gmail/callback` (keep the old one until everything works).
9. Test: log in, connect Gmail, pay with a test card, and trigger the GitHub workflow once.

Done when: the whole flow works on your domain and the GitHub workflow shows a green tick.

## Phase 4: Google verification

Until Google approves the app, only listed test users can connect Gmail, and their connection [expires every 7 days](https://support.google.com/cloud/answer/15549945). Google says a sensitive scope like `gmail.send` takes [about 10 business days to review](https://support.google.com/cloud/answer/13463817), and that is not guaranteed.

1. Add your domain in Google Search Console as a Domain property and verify it with the DNS record Google gives you. Use the same Google account that owns your Cloud project.
2. In Google Auth Platform, open Branding and fill in the app name, logo, support email, homepage (`https://yourdomain.com`), privacy policy (`/privacy`), terms (`/terms`), and your domain under Authorized domains.
3. Open Data Access and confirm only two scopes are listed: `gmail.send` and `userinfo.email`. Extra scopes trigger a much harder review.
4. Record the demo video from the script I gave you earlier, on your live domain, with the Google consent screen clearly visible. Upload it to YouTube as Unlisted.
5. Open the Verification Center and submit. Paste the "why we need gmail.send" text I gave you and the video link.
6. Reply to Google's emails the same day. Slow replies are the main cause of delays.

Watch the user cap: if an app shows the unverified screen to users, Google [caps it at 100 new users in total, for the life of the project, and cannot reset it](https://support.google.com/cloud/answer/15549945). Keep your pilot users on the test-user list (also up to 100) until you are approved, and only click Publish app when you are ready for the public. If the Verification Center insists you publish first, publish, but invite very few outside users until approval.

Done when: Google emails you that the app is verified, and a Gmail account that is not on your test-user list can connect without a warning screen.

## Phase 5: Paystack live mode

Start this early, because verification time depends on Paystack and your documents. Paystack's fee is [1.5% + N100 (waived under N2,500, capped at N2,000)](https://support.paystack.com/en/articles/2130306).

1. In the Paystack dashboard, complete the business verification checklist it shows you (identity, business details and a settlement bank account). What documents it asks for depends on whether you register as an individual or a company.
2. Once approved, switch the dashboard to Live mode and copy the Live Secret Key (starts with `sk_live_`).
3. On Render, replace `PAYSTACK_SECRET_KEY` with the live key. Keep the test key in your notepad.
4. In Paystack Live settings, set the Live Webhook URL to `https://api.yourdomain.com/api/payments/webhook`.
5. Make one real payment of your smallest plan with your own card. Confirm the plan activates, the payment shows in Admin, Payments, and the money reaches your bank.
6. Test a refund from Admin, Payments on that same payment.
7. Review your plan prices in Admin, Plans, and set the ceiling for applications per day in Admin, Settings.

Done when: a real payment activates a plan automatically and settles to your bank.

## Phase 6: Upgrade hosting and AI

The free tiers work for testing, but three of them will hurt real users.

1. **Render:** change the instance type from Free to the paid $7 plan, so the backend never sleeps and the daily runs always start on time.
2. **Gemini:** turn on billing for your Google Cloud project (AI Studio, Billing), set `GEMINI_MODEL` on Render to `gemini-2.5-flash` (or the cheaper `gemini-2.5-flash-lite`), and set a budget alert so a bug cannot run up a bill. This also keeps CV text off the free tier, where Google may use content to improve its products.
3. **Vercel:** read Vercel's Terms on whether the free Hobby plan allows a paid commercial service. If not, upgrade to Pro at $20 per month.
4. **MongoDB:** stay on the free cluster until it nears its storage limit, then move to Flex ($8 to $30 per month). Check usage once a month.
5. **Backups of secrets:** keep `ENCRYPTION_KEY`, `JWT_SECRET` and `MONGODB_URI` in a password manager. If you lose `ENCRYPTION_KEY`, every user must reconnect Gmail.
6. **Uptime alert:** point a free uptime monitor at `https://api.yourdomain.com/api/health` so you hear about outages before users do.
7. **Before about 150 paying users:** ask me for the small code update that processes several users at once and deletes old jobs. The runner handles one user at a time today.

Done when: the backend answers instantly after an hour of no traffic, and one test letter generates on the paid Gemini model.

## Phase 7: Pilot with 10 to 20 real users

A pilot shows you what breaks before the public sees it. Run it for 2 weeks, while Google reviews the app.

1. Pick 10 to 20 people you know, with different jobs (for example engineering, finance, IT, admin). Add each one's Gmail to the test-user list in Google Cloud.
2. Tell them the app is in testing: Google shows an "unverified" warning (they tap Advanced, then Continue), and they must tap Reconnect every 7 days.
3. Give them a free plan with Admin, Users, Grant days, or a promo code, so you can see payments separately later.
4. Each day, check Admin, Applications for failed entries and read 5 to 10 sent letters. Look for wrong job matches, invented facts in letters, and bad formatting.
5. Ask every pilot user: did the matched jobs make sense, did employers reply, and was anything confusing?
6. Fix problems and adjust the match threshold and letter style in Admin, Settings.
7. Add email-based openings under Admin, Jobs. Most listings from job feeds have no apply email, so these decide how many applications actually get sent.

Done when: for a week, almost no failed applications, letters read correctly, and users understand the dashboard without your help.

## Phase 8: Public launch and getting users

Launch only when three things are true: Google has verified the app, Paystack is in live mode, and Render is on the paid plan.

1. Click Publish app in Google Auth Platform, if you have not already, and test with a Gmail account that is not on your list.
2. Open sign-ups in waves (for example 20, then 50, then 100 users) and watch Admin, Overview after each wave. This lets you catch failures before they hit everyone.
3. Promote where job seekers already are: WhatsApp and Telegram job groups, LinkedIn and X posts, university alumni and NYSC groups, and tech or engineering communities. Show a real screenshot of the Applications page and the cover letter.
4. Create promo codes in Admin, Promos for early users or referrers, and track which code brings paying users.
5. Use only honest claims. Say "we send applications for you from your own Gmail", never "we get you a job". Ask pilot users for permission before you quote them, and never write fake reviews.
6. Answer support emails within 24 hours. Most early problems will be Gmail reconnects, missing CVs and plans that need renewing.
7. Track four numbers weekly: sign-ups, paying users, applications sent, and employer replies your users report.

Done when: strangers sign up, pay and stay active without you holding their hand.

## Owner checklist and risks

After launch, your job is mostly watching. Daily:

- [ ] Admin, Overview: sign-ups, revenue, sent today, failed today
- [ ] Admin, Applications, Failed: read the error text and act on it
- [ ] Support inbox: reply to everyone

Weekly:

- [ ] GitHub, Actions: runs are still green (GitHub pauses schedules on repos with 60 days of no activity)
- [ ] Google Cloud and Paystack emails: nothing needing your reply
- [ ] Gemini spend and database size
- [ ] Admin, Jobs: how many stored jobs have an apply email

Main risks and what to do:

- **Google review is slow or rejected.** Fix what they ask and resubmit. Keep pilot users on the test list meanwhile. Check that your policy and video match the real app.
- **Few jobs list an email address.** Users will see few sent applications. Add email-based openings in Admin, Jobs, and tell users plainly that other matches go to their Apply manually list.
- **Gmail spam flags.** Keep the daily ceiling modest and the runs spread through the day.
- **Leaked keys or data.** Never share keys, keep `.env` out of GitHub, and treat CVs as sensitive personal data.
- **Job-source rules.** Stay on official feeds, not scraping, and credit Remotive and RemoteOK as the sites ask.
