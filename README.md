<div align="center">

# ♻️ CleanSight

### Community-Powered Waste Reporting & Cleanup Coordination

**Report Waste. Coordinate Cleanup. Transform Communities.**

[![License: MIT](https://img.shields.io/badge/License-MIT-10b981.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61dafb.svg?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47a248.svg?logo=mongodb&logoColor=white)](https://mongodb.com)

---

CleanSight empowers citizens to report garbage issues, volunteers to take action, and municipalities to efficiently manage cleanup operations — all from a single, beautiful platform.

</div>

<br/>

## ✨ Features

<table>
  <tr>
    <td align="center" width="33%">
      <h3>📸 AI-Powered Detection</h3>
      <p>Advanced AI verifies waste reports instantly, ensuring accuracy and faster response times.</p>
    </td>
    <td align="center" width="33%">
      <h3>📍 GPS Location Tracking</h3>
      <p>Precise geolocation tags every report, making it easy for cleanup crews to find exact locations.</p>
    </td>
    <td align="center" width="33%">
      <h3>👥 Community Volunteers</h3>
      <p>Connect with local volunteers who are ready to take action and make a difference.</p>
    </td>
  </tr>
  <tr>
    <td align="center" width="33%">
      <h3>⚡ Instant Notifications</h3>
      <p>Real-time alerts keep everyone informed about new reports and cleanup progress.</p>
    </td>
    <td align="center" width="33%">
      <h3>🛡️ Verified Reports</h3>
      <p>Multi-step verification ensures only legitimate reports reach cleanup teams.</p>
    </td>
    <td align="center" width="33%">
      <h3>📊 Impact Analytics</h3>
      <p>Track community progress with detailed dashboards and environmental impact metrics.</p>
    </td>
  </tr>
</table>

<br/>

## 🧑‍🤝‍🧑 User Roles

| Role | Description |
|------|-------------|
| **Citizen** | Report waste locations with photos, track submission status, view community impact |
| **Volunteer** | Claim cleanup tasks, coordinate with teams, log completed cleanups |
| **Staff** | Manage reports, assign volunteers, oversee regional operations |
| **Admin** | Full platform oversight, analytics dashboards, user management |

<br/>

## 🏗️ Architecture

```
CleanSight/
├── Frontend/          React + TypeScript SPA
│   ├── components/    Reusable UI, layout, landing, auth components
│   ├── pages/         Route-level page components
│   ├── context/       Auth state management (Firebase)
│   ├── hooks/         Custom hooks (analytics, dashboard, reports)
│   ├── services/      API service layer
│   ├── constants/     Roles, navigation, footer link configs
│   └── lib/           Utilities, API client, Firebase config
│
├── Backend/           Node.js + Express REST API
│   ├── routes/        Auth, reports, volunteers, analytics, dashboard
│   ├── models/        MongoDB schemas (User, Report, Volunteer)
│   ├── middleware/     Token verification, role auth, query validation
│   ├── services/      Analytics aggregation
│   └── config/        Database & Firebase Admin setup
│
└── docs/              API documentation & audit notes
```

<br/>

## 🛠️ Tech Stack

<table>
  <tr>
    <th align="left">Layer</th>
    <th align="left">Technologies</th>
  </tr>
  <tr>
    <td><strong>Frontend</strong></td>
    <td>React 18 &bull; TypeScript &bull; Vite &bull; Tailwind CSS &bull; shadcn/ui &bull; Framer Motion</td>
  </tr>
  <tr>
    <td><strong>State & Data</strong></td>
    <td>React Context &bull; TanStack Query &bull; React Router v6</td>
  </tr>
  <tr>
    <td><strong>Auth</strong></td>
    <td>Firebase Authentication (Google + Email/Password) &bull; Firebase Admin SDK</td>
  </tr>
  <tr>
    <td><strong>Backend</strong></td>
    <td>Node.js &bull; Express.js &bull; MongoDB &bull; Mongoose</td>
  </tr>
  <tr>
    <td><strong>Tooling</strong></td>
    <td>pnpm Workspaces &bull; ESLint &bull; Vitest &bull; PostCSS</td>
  </tr>
</table>

<br/>

## 🔐 Authentication Flow

```
┌──────────────┐     Firebase Auth     ┌──────────────┐
│   Browser     │ ◄──────────────────► │   Firebase    │
│  (React SPA)  │    ID Token          │   Console     │
└──────┬───────┘                       └──────────────┘
       │
       │  Authorization: Bearer <token>
       ▼
┌──────────────┐     Verify Token      ┌──────────────┐
│   Express     │ ◄──────────────────► │ Firebase      │
│   Backend     │                      │ Admin SDK     │
└──────┬───────┘                       └──────────────┘
       │
       ▼
┌──────────────┐
│   MongoDB     │  User profiles, reports, analytics
└──────────────┘
```

- **New users** (Google sign-in) are routed through a one-time **role onboarding** page
- **Protected routes** enforce role-based access (citizen, volunteer, staff, admin)
- **Navigation** adapts dynamically based on authentication state and assigned role

<br/>

## 📸 How It Works

1. **Report** — Snap a photo, tag the location, and submit a waste report
2. **Verify** — AI and community moderators validate the report
3. **Coordinate** — Volunteers claim tasks and organize cleanup events
4. **Track** — Monitor progress through real-time dashboards and analytics

<br/>

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

<br/>

---

<div align="center">
  <p>
    <strong>Built with 💚 for cleaner communities</strong>
  </p>
  <p>
    <sub>CleanSight &copy; 2026 Sanuka. All rights reserved.</sub>
  </p>
</div>
