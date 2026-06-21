# LuxeCut — Vercel Deployment Package

## ✅ This version is fixed for Vercel (no FUNCTION_INVOCATION_FAILED)

---

## 📁 Structure

```
luxecut-vercel/
├── vercel.json              ← Vercel routing config
├── package.json             ← Project config
├── api/
│   ├── services.js          ← Serverless function: /api/services
│   ├── barbers.js           ← Serverless function: /api/barbers
│   └── bookings.js          ← Serverless function: /api/bookings
└── public/
    ├── index.html           ← Main website
    ├── admin.html           ← Admin dashboard
    ├── styles.css           ← Styles
    ├── app.js               ← Frontend JS
    └── data/
        ├── services.json    ← Seed services data
        └── barbers.json     ← Seed barbers data
```

---

## 🚀 Deploy to Vercel (3 Steps)

### Step 1 — Push to GitHub
1. Create a free GitHub account at https://github.com
2. Create a new repository (e.g. "luxecut-salon")
3. Upload all files from this ZIP to the repository

### Step 2 — Connect to Vercel
1. Go to https://vercel.com → Sign up free (use GitHub login)
2. Click **"Add New Project"**
3. Select your **luxecut-salon** GitHub repository
4. Click **Deploy** — that's it!

### Step 3 — Done!
Vercel gives you a live URL like:
- `https://luxecut-salon.vercel.app`
- `https://luxecut-salon.vercel.app/admin.html`

---

## 🔐 Admin Login
- **Username:** admin
- **Password:** luxecut2024

---

## ❓ Why the old version crashed on Vercel

The old `server.js` used `fs.writeFileSync()` to save data to JSON files.
Vercel's serverless environment **does not allow writing to the file system**.
This caused `FUNCTION_INVOCATION_FAILED`.

This version uses **in-memory storage** inside global variables — no file writes,
so Vercel works perfectly.

> **Note:** Because Vercel is serverless, data added via Admin (new services,
> barbers, bookings) resets when Vercel spins down the function after inactivity
> (~15 min). The 3 seed services and 3 seed barbers always reload automatically.
> For permanent storage, connect a free MongoDB Atlas database.

---

## 🛠 No npm install needed
Zero external dependencies — pure Node.js built-ins only.
