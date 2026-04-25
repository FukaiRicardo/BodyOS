# BodyOS 🤖💪

> AI-powered health and fitness platform — personalized workout and nutrition protocols generated automatically based on the user's profile.

## 📱 Overview

BodyOS is a mobile app that combines body data, goals, and user history to generate complete training and diet protocols via AI. The user completes an onboarding flow, receives a personalized plan, logs daily reports, and the protocol automatically adapts over the weeks.

## 🏗️ Architecture
BodyOS/
├── apps/
│   └── mobile/              # React Native + Expo (iOS & Android)
│       ├── src/
│       │   ├── context/     # AuthContext (Supabase Auth)
│       │   ├── lib/         # Configured Supabase client
│       │   └── screens/     # App screens
│       │       ├── LoginScreen.tsx
│       │       ├── RegisterScreen.tsx
│       │       ├── OnboardingScreen.tsx
│       │       ├── HomeScreen.tsx
│       │       ├── PlanScreen.tsx
│       │       └── ReportScreen.tsx
│       └── App.tsx          # Navigation + Auth Guard
├── services/
│   ├── ai/                  # AI Engine (Node.js + TypeScript)
│   │   └── src/
│   │       ├── index.ts     # Express server (port 3001)
│   │       └── planGenerator.ts
│   └── gateway/             # API Gateway with security layers
│       └── src/
│           ├── index.ts
│           └── middleware/
│               ├── auth.ts
│               ├── security.ts
│               └── validate.ts
└── packages/                # Shared packages (monorepo)

## 🤖 AI Service — Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/nutrition/generate` | Generate complete nutrition plan |
| POST | `/workout/generate` | Generate weekly workout plan |
| POST | `/report/analyze` | Analyze daily report + score |
| POST | `/feedback/generate` | Personalized coach motivational message |
| POST | `/protocol/adapt` | Adapt protocol based on weekly history |

> AI Engine: **Gemini 2.0 Flash** with mock fallback (`MOCK_AI=true`)

## 📱 App Screens

- **LoginScreen** — Email/password authentication
- **RegisterScreen** — Sign up with strong password validation
- **OnboardingScreen** — 5-step profile setup (goal, level, body data, training days)
- **HomeScreen** — Dashboard with daily stats and protocol CTA
- **PlanScreen** — AI-generated plan (tabs: Diet + Workout)
- **ReportScreen** — Daily report with AI score analysis

## 🔐 Security

- **PKCE flow** on Supabase Auth — recommended standard for mobile apps
- **Persistent session** with automatic refresh via AsyncStorage
- **Strong password validation** (8+ chars, uppercase, number, special character)
- **Generic error messages** on login — no account enumeration
- **Auth Guard** on navigator — protected routes inaccessible without valid session
- **API Gateway** with authentication, validation and security middleware
- **Environment variables** separated by context — never exposed in the bundle

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native + Expo SDK 54 |
| Language | TypeScript |
| Navigation | React Navigation v7 (Native Stack) |
| Auth & DB | Supabase |
| AI | Gemini 2.0 Flash (Google) |
| AI Service | Node.js + Express + TypeScript |
| Monorepo | Turborepo |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Expo Go installed on your device
- Supabase account

### Setup

```bash
# Clone the repository
git clone https://github.com/FukaiRicardo/BodyOS.git
cd BodyOS

# Install root dependencies
npm install

# Configure environment variables
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

# Start the mobile app
cd apps/mobile
npm install
npx expo start
```

### AI Service

```bash
cd services/ai
npm install
npm run dev
```

## ⚙️ Environment Variables

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI
GEMINI_API_KEY=your_gemini_key
MOCK_AI=true  # set to false to use real AI

# App
NODE_ENV=development
API_BASE_URL=http://192.168.x.x:3001
```

## 📋 Roadmap

- [x] Monorepo structure with Turborepo
- [x] AI Service with 5 endpoints (Gemini 2.0 Flash)
- [x] Full onboarding flow (5 steps)
- [x] Dashboard (HomeScreen)
- [x] AI-generated plan (PlanScreen)
- [x] Daily report with AI score analysis (ReportScreen)
- [x] Full Supabase authentication (Login + Register)
- [ ] Persist plans and reports to database
- [ ] Progress screen with real charts
- [ ] Automatic protocol adaptation
- [ ] Push notifications
- [ ] App Store and Play Store release

## 👨‍💻 Author

**Ricardo Fukai** — [@FukaiRicardo](https://github.com/FukaiRicardo)

---

<p align="center">Built with 💚 and generative AI</p>