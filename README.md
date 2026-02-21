# 💊 Medicine Companion – Adherence & Safety for Elderly

A production-ready web application that helps elderly users manage medicines safely with smart scheduling, adherence tracking, AI-assisted suggestions, and caregiver protection.

![License](https://img.shields.io/badge/license-MIT-green)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Node.js%20%2B%20MongoDB-blue)

---

## 🎯 Core Features

| Feature | Description |
|---------|-------------|
| **Medicine Management** | Add, edit, delete medicines with dosage, frequency, time slots |
| **Daily Schedule Dashboard** | Visual timeline of today's medicines with take/miss status |
| **Dose Tracking** | Mark doses as taken; auto-detect missed doses |
| **Weekly Adherence Report** | Bar charts showing 7-day adherence by medicine |
| **Refill Alerts** | Notifications when pills are running low |
| **AI Schedule Assistant** | Describe your conditions, get a structured schedule |
| **Caregiver Lock (PIN)** | 4-digit PIN required for edit/delete actions |
| **Browser Notifications** | Timely reminders via the Notification API |
| **Dark/Light Theme** | Toggle between themes; auto-detects system preference |
| **Offline Cache** | View schedules offline via localStorage caching |

---

## 🏗 Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  React Frontend  │────▶│  Express Backend  │────▶│   MongoDB    │
│  (Vite + TW CSS) │◀────│  (REST API + JWT) │◀────│  (Database)  │
└──────────────────┘     └──────────────────┘     └──────────────┘
        │                         │
   Notification API         node-cron
   localStorage cache       (missed dose check)
```

### Frontend
- **React 18** with Vite for fast development
- **Tailwind CSS** with custom elderly-friendly design system (large fonts, high contrast)
- **React Router** for SPA navigation
- **Recharts**-style custom bar charts for adherence visualization

### Backend
- **Node.js + Express** REST API
- **MongoDB + Mongoose** for data persistence
- **JWT** for stateless authentication
- **bcryptjs** for password and PIN hashing
- **node-cron** for scheduled missed-dose detection

---

## 🔐 Caregiver Lock (Security)

Since browsers cannot directly access biometric hardware, we implement a **Caregiver Lock** using secure PIN authentication:

### How It Works
1. During registration, user sets a 4-digit caregiver PIN
2. PIN is hashed with **bcrypt** before storage (never stored in plain text)
3. Before any sensitive action (edit medicine, delete medicine, change dosage), a PIN modal appears
4. On successful verification, server issues a short-lived JWT token (5-minute expiry)
5. Subsequent actions within 5 minutes do not re-prompt

### Security Measures
- PIN is **bcrypt-hashed** in the database
- Verification token expires in **5 minutes**
- Token stored in `localStorage` as `caregiverToken`
- Server validates token on every protected route via `X-Caregiver-Token` header

> **Future Upgrade:** On mobile deployment, this PIN layer can be replaced by device biometric authentication (fingerprint/Face ID) using the Web Authentication API (WebAuthn/FIDO2).

---

## 🤖 AI Safety Boundaries

The AI assistant is **bounded** and follows strict guidelines:

### What AI Does ✅
- Suggests structured schedules (morning/evening/before meals)
- Summarizes precautions in simple English
- Flags possible drug interactions
- Shows reasoning for recommendations
- Requires explicit user approval before saving

### What AI Does NOT ❌
- Prescribe new medicines
- Provide medical diagnosis
- Replace doctor advice
- Auto-save without user confirmation

### Every AI response includes:
> "⚕️ This is informational only. Please consult your doctor before starting, stopping, or changing any medication."

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/medicine-companion.git
cd medicine-companion
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

### 3. Install dependencies
```bash
npm install          # root (concurrently)
cd server && npm install
cd ../client && npm install
cd ..
```

### 4. Seed demo data (optional)
```bash
cd server && npm run seed
```
This creates:
- **Demo user:** `demo@medicine.com` / `demo1234`
- **Caregiver PIN:** `1234`
- **4 sample medicines** with 7 days of dose history

### 5. Run development servers
```bash
npm run dev
```
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

### 6. Build for production
```bash
npm run build
npm start
```

---

## 📁 Folder Structure

```
medicine-companion/
├── package.json              # Root scripts (concurrently)
├── .env.example              # Environment template
├── .gitignore
├── README.md
│
├── server/
│   ├── package.json
│   ├── index.js              # Express entry point
│   ├── models/
│   │   ├── User.js           # User model (bcrypt PIN)
│   │   ├── Medicine.js       # Medicine model
│   │   └── DoseLog.js        # Dose tracking model
│   ├── routes/
│   │   ├── auth.js           # Auth + PIN verification
│   │   ├── medicines.js      # CRUD + caregiver protection
│   │   ├── doseLogs.js       # Dose tracking + weekly summary
│   │   └── ai.js             # AI schedule suggestion engine
│   ├── middleware/
│   │   └── auth.js           # JWT authentication
│   └── utils/
│       ├── scheduler.js      # Cron-based missed dose detection
│       └── seed.js           # Demo data seeder
│
└── client/
    ├── package.json
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── public/
    │   └── pill.svg
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── context/
        │   ├── AuthContext.jsx    # Auth state + PIN verification
        │   └── ThemeContext.jsx   # Dark/Light theme
        ├── components/
        │   ├── Layout.jsx         # Sidebar navigation
        │   └── CaregiverPINModal.jsx  # PIN verification UI
        ├── pages/
        │   ├── LoginPage.jsx      # Login/Register
        │   ├── DashboardPage.jsx  # Today's schedule
        │   ├── MedicinesPage.jsx  # Medicine CRUD
        │   ├── WeeklySummaryPage.jsx  # Adherence charts
        │   └── AIAssistantPage.jsx    # AI schedule generator
        └── utils/
            ├── api.js             # HTTP client
            └── notifications.js   # Browser notifications + cache
```

---

## 🎬 Demo Flows

### Flow 1: Add Medicine → Schedule → Notification
1. Login → Navigate to "Medicines" → Click "Add"
2. Fill in medicine details → Save
3. Dashboard shows new entry in today's schedule
4. Browser notification fires at scheduled time

### Flow 2: Miss a Dose → Alert → Weekly Update
1. A scheduled dose passes without being marked "Taken"
2. After 30 minutes, it auto-marks as "Missed" (red badge)
3. Navigate to "Weekly Report" → Adherence % updates

### Flow 3: AI Generates Schedule → Approve → Save
1. Navigate to "AI Assistant"
2. Type: "I have BP and diabetes medicines"
3. AI returns structured schedule with reasoning
4. Click "Approve & Save to My Medicines"
5. Medicines appear on dashboard

### Caregiver Lock Demo
1. Try to edit/delete a medicine
2. PIN modal appears → Enter `1234`
3. Action proceeds → PIN session lasts 5 minutes

---

## 🔮 Future Enhancements

- **WebAuthn/FIDO2** biometric authentication for mobile
- **Service Worker** for full offline PWA support
- **Push notifications** via Web Push API
- **Real AI integration** with OpenAI/Claude for smarter suggestions
- **Caregiver multi-user** dashboard
- **Pharmacy integration** for auto-refill orders
- **Voice commands** for hands-free dose logging

---

## 📄 License

MIT License — built for hackathon demonstration purposes.
