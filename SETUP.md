# Phase 0 setup: do these once

Takes about 20 minutes. Do the parts in order.

---

## Part A: Supabase (the backend)

1. Go to **https://supabase.com**, click **Start your project** and sign in with GitHub.
2. Click **New project**:
   - **Name:** `study-tracker`
   - **Database password:** click *Generate a password* and save it in a password manager or notebook.
     You won't need it for the app. **Never put it in the code.**
   - **Region:** *Central EU (Frankfurt)*. It's the closest to Tbilisi, so the app responds faster.
   - Plan: **Free**. Click **Create new project** and wait 1–2 minutes.
3. **Create the tables.** In the left sidebar open **SQL Editor**, then **New query**.
   Open `supabase/migrations/001_init.sql` from this project, copy all of it, paste it and click **Run**.
   You should see *"Success. No rows returned"*.
   Check: **Table Editor** should list 8 tables (settings, goal_versions, study_sessions, …).
4. **Turn off public sign-ups.** Go to **Authentication** and open **Sign In / Providers** (on some dashboards it's under
   *Settings*). Switch **Allow new users to sign up** **OFF** and save. Leave the **Email** provider enabled.
   *Why:* your anon key is public, so this switch is what stops strangers from creating an account.
5. **Create your one account.** Go to **Authentication**, then **Users**, then **Add user**, then **Create new user**:
   - your email and a strong password (this is the password you'll type on your phone and laptop)
   - tick **Auto Confirm User**, then click **Create user**.
6. **Copy your keys into the app.** Go to **Project Settings** (the gear icon), then **API Keys** / **Data API**:
   - copy the **Project URL** into `SUPABASE_URL` in `src/config.js`
   - copy the **anon** key (it may be called **publishable**, starting `sb_publishable_…`) into `SUPABASE_ANON_KEY`
   - ⚠️ **Don't** copy the `service_role` / `secret` key anywhere. The app never needs it.

---

## Part B: Run it on your laptop

In PowerShell, in the project folder:

```powershell
npm install        # only needed once (already done for you)
npm run dev
```

Open **http://localhost:5173/study-tracker/**. You should see "Desk is wired up." with 4 ticks.

- 3 ticks plus "placeholder values" means you haven't filled in `src/config.js` yet.
- "tables are missing" means you need to redo step A3.

**Testing on your phone:** while `npm run dev` is running it also prints a `Network:` address like
`http://192.168.1.23:5173/study-tracker/`. Open it on your phone while it's on the **same Wi-Fi**.
If Windows Firewall asks, allow Node on **private networks**.

Press `Ctrl + C` in the terminal to stop the dev server.

---

## Part C: Put it online (GitHub Pages)

1. Go to **https://github.com/new**:
   - **Repository name:** `study-tracker`
   - **Public** (free GitHub Pages needs a public repo. That's fine, because nothing secret is in the code)
   - Don't add a README, .gitignore or license. Click **Create repository**.
2. In the new repo go to **Settings**, then **Pages**, and under *Build and deployment* set **Source** to **GitHub Actions**.
3. Back in PowerShell, in the project folder:

   ```powershell
   git add .
   git commit -m "Phase 0: project setup"
   git remote add origin https://github.com/notAbit5225/study-tracker.git
   git push -u origin main
   ```

   The first push opens a browser window to log in to GitHub. That's normal.
4. Open the repo's **Actions** tab. You'll see "Deploy to GitHub Pages" running. When it turns green (about 1 minute),
   open **https://notabit5225.github.io/study-tracker/**.
   If it failed, open the run and send me the red error text.
5. Back in Supabase, go to **Authentication**, then **URL Configuration**, and set **Site URL** to
   `https://notabit5225.github.io/study-tracker/`.

From now on, every `git push` updates the live site automatically.
