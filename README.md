# 🌱 EcoTrack – AI-Powered Carbon Footprint Tracker

<div align="center">

### **Track Today. Transform Tomorrow.**

*Empowering sustainable living through Artificial Intelligence.*
<img src="./Screenshot%202026-06-20%20105354.png" alt="EcoTrack Home Page" width="100%" /> <br>

[![React](https://img.shields.io/badge/React-19-blue)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)]()
[![Firebase](https://img.shields.io/badge/Firebase-Enabled-orange)]()
[![Gemini](https://img.shields.io/badge/Google-Gemini-green)]()
[![Cloud Run](https://img.shields.io/badge/Google-Cloud%20Run-red)]()

</div>

---

# 📖 Overview

EcoTrack is an AI-powered sustainability platform that helps individuals understand, monitor, and reduce their carbon footprint through intelligent analytics, personalized recommendations, and real-time environmental insights.

Instead of simply calculating emissions, EcoTrack guides users toward sustainable lifestyle choices using AI-powered coaching and actionable recommendations.

---

# 🚨 Problem Statement

Climate change is one of the world's biggest challenges, yet millions of people struggle to understand how their everyday habits contribute to carbon emissions.

Current carbon footprint calculators often:

* Provide generic estimates
* Lack personalized recommendations
* Offer poor user engagement
* Fail to encourage long-term sustainable habits

There is a need for an intelligent platform that not only measures carbon emissions but also educates, motivates, and empowers users to reduce their environmental impact.

---

# 💡 Solution

EcoTrack combines Artificial Intelligence with environmental analytics to deliver a personalized sustainability experience.

The platform analyzes user activities, calculates carbon emissions, generates AI-driven recommendations, tracks sustainability goals, and motivates users through gamification and real-time insights.

---

# ✨ Features

| Feature                          | Description                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 🌱 Carbon Footprint Calculator   | Calculates emissions from transport, electricity, food, shopping, and daily lifestyle activities.      |
| 🤖 AI Sustainability Coach       | Generates personalized recommendations using Google Gemini AI based on user habits.                    |
| 📄 AI Document Analyzer          | Upload electricity bills, fuel receipts, or appliance documents for automatic OCR and carbon analysis. |
| 📊 Sustainability Dashboard      | Interactive dashboard with carbon score, sustainability score, analytics, and progress charts.         |
| 🎯 Goal Tracking                 | Set sustainability goals and monitor progress with AI-powered guidance.                                |
| 🏆 Gamification System           | Earn eco badges, achievements, streaks, and rewards for sustainable actions.                           |
| 💬 AI Chat Assistant             | Intelligent chatbot providing climate education and sustainability recommendations.                    |
| 📈 Carbon Analytics              | Weekly and monthly carbon trend visualization with predictive insights.                                |
| 🌍 Environmental Impact Tracking | Measure carbon savings and visualize real-world environmental contributions.                           |
| 🔔 Smart Recommendations         | AI-generated actionable suggestions for reducing carbon emissions.                                     |

---

# 🛠️ Tech Stack

| Category       | Technology                 |
| -------------- | -------------------------- |
| Frontend       | React.js, TypeScript, Vite |
| Backend        | Node.js, Express.js        |
| AI Engine      | Google Gemini API          |
| Database       | Firebase Firestore         |
| Authentication | Firebase Authentication    |
| Charts         | Recharts                   |
| UI             | Tailwind CSS               |
| Icons          | Lucide React               |
| Animations     | Motion                     |
| Deployment     | Google Cloud Run           |

---

# 🏗️ System Architecture

```text
                User
                  │
                  ▼
        React + Vite Frontend
                  │
                  ▼
           Express API Server
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
 Firebase Auth        Gemini AI API
        │                   │
        ▼                   ▼
 Firebase Firestore   AI Recommendations
        │
        ▼
 Sustainability Dashboard
```

---

# 📂 Project Structure

```text
EcoTrack/

├── public/

├── src/
│   ├── assets/
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx

├── server.ts

├── package.json

├── vite.config.ts

├── tsconfig.json

├── Dockerfile

├── .env.example

└── README.md
```

---

# ⚙️ Installation

Clone the repository

```bash
git clone https://github.com/your-username/EcoTrack.git
```

Navigate into project

```bash
cd EcoTrack
```

Install dependencies

```bash
npm install
```

---

# 🚀 Run Locally

Development Mode

```bash
npm run dev
```

Production Build

```bash
npm run build
```

Production Server

```bash
npm start
```

---

# 📦 Available Scripts

| Command       | Description                |
| ------------- | -------------------------- |
| npm run dev   | Start development server   |
| npm run build | Build frontend and backend |
| npm start     | Run production server      |
| npm run lint  | TypeScript validation      |
| npm run clean | Remove build files         |

---

# 🔑 Environment Variables

Create a `.env` file in the project root.

```env
# Google Gemini

GEMINI_API_KEY=YOUR_GEMINI_API_KEY

# Firebase

VITE_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY

VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com

VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID

VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com

VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID

VITE_FIREBASE_APP_ID=YOUR_APP_ID

PORT=8080

NODE_ENV=production
```

---

# 🔥 Firebase Setup

1. Create a Firebase Project

2. Enable Authentication

* Google Sign-In
* Email & Password

3. Create Firestore Database

4. Enable Firebase Storage

5. Copy Firebase Configuration

6. Configure environment variables

---

# 🤖 Gemini API Setup

1. Open Google AI Studio

2. Generate an API Key

3. Add the key inside the `.env` file

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

4. Restart the application

---

# ☁️ Google Cloud Run Deployment

Build Docker Image

```bash
docker build -t ecotrack .
```

Run locally

```bash
docker run -p 8080:8080 ecotrack
```

Deploy

```bash
gcloud run deploy ecotrack \
--source . \
--allow-unauthenticated \
--region asia-south1
```

---

# 📡 API Endpoints

| Endpoint                  | Method | Description                      |
| ------------------------- | ------ | -------------------------------- |
| /api/chat                 | POST   | AI Sustainability Chat Assistant |
| /api/insights             | POST   | Personalized AI Recommendations  |
| /api/goals-advisor        | POST   | Sustainability Goal Advisor      |
| /api/gamification-advisor | POST   | Achievement Motivation System    |
| /api/analyze-document     | POST   | OCR + Carbon Analysis            |

---

# 🔒 Security

| Security Feature         | Status |
| ------------------------ | ------ |
| Firebase Authentication  | ✅      |
| Firestore Security Rules | ✅      |
| Environment Variables    | ✅      |
| HTTPS Deployment         | ✅      |
| Protected API Routes     | ✅      |
| Secure Cloud Run Hosting | ✅      |

---

# ⚡ Performance Optimizations

* Vite Fast Build
* Express Server Bundling
* Lazy Loading
* Optimized API Calls
* Automatic Cloud Run Scaling
* Efficient Component Rendering

---

# 🎯 Target Audience

* Students
* Working Professionals
* Households
* Educational Institutions
* NGOs
* Climate Enthusiasts
* Sustainability Communities

---

# 🌍 Impact

EcoTrack enables users to:

* 🌱 Understand personal carbon emissions
* 📊 Make data-driven sustainable decisions
* ♻️ Reduce environmental impact
* 🎯 Build long-term eco-friendly habits
* 🌎 Contribute towards global climate action

---

# 🔮 Future Enhancements

| Planned Feature           | Status     |
| ------------------------- | ---------- |
| IoT Device Integration    | 🚧 Planned |
| Smart Energy Monitoring   | 🚧 Planned |
| Carbon Offset Marketplace | 🚧 Planned |
| EV Charging Tracker       | 🚧 Planned |
| AI Voice Assistant        | 🚧 Planned |
| Community Challenges      | 🚧 Planned |
| QR Green Rewards          | 🚧 Planned |
| Multi-language Support    | 🚧 Planned |

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a new feature branch
3. Commit your changes
4. Push to your branch
5. Open a Pull Request

---

# 📜 License

This project is developed for educational, research, and hackathon purposes.

---

# 👨‍💻 Developed For

**Hack2Skill Prompt Wars**

Building AI-powered solutions for a sustainable future.

---

# 🌱 Vision

> **To empower every individual with AI-driven insights that transform everyday choices into measurable climate action and build a more sustainable future for generations to come.**

---

<div align="center">

## 💚 **Track Today. Transform Tomorrow.**

### **Every Small Action Creates a Bigger Impact. 🌍**

</div>
