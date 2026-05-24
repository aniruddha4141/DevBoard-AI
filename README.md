# <p align="center"><img src="./public/icon.png" alt="DevBoard AI Logo" width="80" height="80"><br>DevBoard AI</p>

<p align="center">
  <strong>GitHub-Only AI-Powered Project Management System for Developer Teams</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#%EF%B8%8F-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-deployment-guide">Deployment Guide</a> •
  <a href="#-role-permissions">Permissions</a>
</p>

---

## 📸 Overview

<p align="center">
  <img src="./public/opengraph-image.png" alt="DevBoard AI OpenGraph Banner" width="100%" style="border-radius: 10px; border: 1px solid rgba(255,255,255,0.1)">
</p>

**DevBoard AI** is a developer-centric, multi-tenant project management SaaS MVP. It integrates Jira-style ticket tracking and Kanban boards, GitHub repository synchronization, an in-browser IDE powered by Monaco Editor, and AI-driven sprint diagnostics and commit summaries. All users sign in exclusively using their GitHub accounts.

---

## ✨ Features

- **🔑 GitHub-Only OAuth Authentication**: No email/passwords or magic links. Secure session state managed via `NextAuth.js`.
- **🏢 Multi-Tenant Workspaces**: Onboard by creating a new workspace (Admin role) or joining an existing one using an 8-character invite code.
- **📊 Interactive Telemetry Dashboard**: Real-time project charts powered by Recharts (ticket statuses, bug severities, weekly commit logs).
- **📋 Kanban Boards & Bug Tracker**: Drag-and-drop ticket state management (Backlog → Todo → In Progress → Review → Done → Closed) and integrated bug reports.
- **💻 In-Browser IDE**: Browse and edit connected repository file structures using Monaco Editor (`@monaco-editor/react`) with full syntax highlighting.
- **🚀 Git Database Commits**: Commit multi-file edits directly back to your GitHub repositories using the low-level GitHub Git Database API.
- **🤖 AI Sprint Diagnostics**: Automatically compile sprint reports, release notes, bug summaries, and risk logs using OpenAI/Gemini APIs (with structured mock fallbacks).
- **🔒 Role-Based Access Control (RBAC)**: Secure access enforcement for Admins, Project Managers, Developers, and Viewers across dashboard routes and backend Server Actions.

---

## 🛠️ Tech Stack

* **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS (v4), shadcn/ui custom primitives, Lucide Icons.
* **Backend**: Next.js Server Actions, Prisma ORM, PostgreSQL.
* **Authentication**: NextAuth.js (v5 beta) with GitHub Provider.
* **Telemetry Charts**: Recharts.
* **Code Editor**: Monaco Editor (`@monaco-editor/react`).
* **AI Integrations**: OpenAI API / Gemini API.

---

## 📁 Project Structure

```text
devboard-ai/
├── prisma/
│   ├── schema.prisma      # 17 DB models schema
│   └── seed.ts            # High-fidelity mock seed data loader
├── src/
│   ├── app/
│   │   ├── (dashboard)/   # Layout-wrapped protected routes
│   │   │   ├── dashboard/ # Workspace analytics panel
│   │   │   ├── projects/  # Project boards & tab panels
│   │   │   ├── team/      # Workspace team members management
│   │   │   └── settings/  # Profile details & settings
│   │   ├── login/         # Connect with GitHub OAuth page
│   │   ├── onboarding/    # Create / join workspace flows
│   │   └── invite/        # Secure invite link accept target
│   ├── components/
│   │   ├── ui/            # Custom styled inputs, buttons, dialogs
│   │   ├── layout/        # Sidebar, topbar, layouts
│   │   ├── tickets/       # Kanban boards, modal managers
│   │   └── bugs/          # Bug reports, convert-to-ticket forms
│   ├── lib/
│   │   ├── prisma.ts      # Singleton database client
│   │   ├── auth.ts        # NextAuth handlers & OAuth callbacks
│   │   ├── github.ts      # Octokit API database commits helper
│   │   ├── ai.ts          # LLM API prompts & Mock fallbacks
│   │   └── permissions.ts # RBAC security checker definitions
│   └── server/
│       └── actions/       # Backend validated Server Actions
```

---

## 🚦 Role Permissions

| Action / Permission | Admin | Project Manager | Developer | Viewer |
| :--- | :---: | :---: | :---: | :---: |
| Full Workspace Access | ✅ | ❌ | ❌ | ❌ |
| Create / Delete Projects | ✅ | Project Manager (Create only) | ❌ | ❌ |
| Invite Members | ✅ | ✅ (Dev/Viewer only) | ❌ | ❌ |
| Change Member Roles | ✅ | ❌ | ❌ | ❌ |
| Assign Tickets & Bugs | ✅ | ✅ | ❌ | ❌ |
| Edit Assigned Tickets | ✅ | ✅ | ✅ | ❌ |
| Edit & Commit Code | ✅ | ✅ | ✅ (Assigned only) | ❌ |
| Create PRs & Branches | ✅ | ✅ | ❌ | ❌ |
| Generate AI Reports | ✅ | ✅ | ✅ | ❌ |
| Read-Only Board Access | ✅ | ✅ | ✅ | ✅ |

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18.x or later)
- PostgreSQL database running locally (or via Docker Compose)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/aniruddha4141/DevBoard_AI.git
cd DevBoard_AI
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/devboard_ai"

# NextAuth
AUTH_SECRET="your-generate-32-char-auth-secret"
NEXTAUTH_URL="http://localhost:3000"

# GitHub OAuth Credentials
AUTH_GITHUB_ID="your-github-oauth-client-id"
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/devboard_ai"

# NextAuth
AUTH_SECRET="your-generate-32-char-auth-secret"
NEXTAUTH_URL="http://localhost:3000"

# GitHub OAuth Credentials
AUTH_GITHUB_ID="your-github-oauth-client-id"
AUTH_GITHUB_SECRET="your-github-oauth-client-secret"

# Encryption secret key (32 chars) for GitHub tokens
ENCRYPTION_SECRET="your-secure-32-char-encryption-key"

# AI Keys (Optional - falls back to high-fidelity mocks if empty)
OPENAI_API_KEY=""
GEMINI_API_KEY=""
```

### 3. Spin Up Local PostgreSQL Container (Optional)

If you have Docker installed, you can start a PostgreSQL server instance immediately:

```bash
docker compose up -d
```

### 4. Setup Prisma Database Schema & Seed Data

Run the migration push to sync the database schema and execute the seed loader:

```bash
npx prisma db push
npx prisma db seed
```

### 5. Run the Application

```bash
npm run dev
```

Open `http://localhost:3000` to access the application.

---

## 🌐 Deployment Guide

### ⚠️ Note on GitHub Pages
Because DevBoard AI is a full-stack Next.js web application utilizing a database (PostgreSQL), server-side OAuth authentication (`NextAuth.js`), and server-side logic (Server Actions), it **cannot** be hosted on GitHub Pages (which only supports static HTML/JS/CSS client-side files).

### 🚀 Deploy to Vercel (Recommended - Free Tier)

Vercel provides full support for server-side Next.js applications and databases.

1. **Host a Database**: Set up a free PostgreSQL database on [Supabase](https://supabase.com) or [Neon](https://neon.tech) and copy the connection string.
2. **Setup GitHub OAuth**: Create a production GitHub OAuth app in your **GitHub Settings > Developer Settings > OAuth Apps** with Callback URL set to `https://your-app.vercel.app/api/auth/callback/github`.
3. **Deploy on Vercel**:
   - Go to [Vercel](https://vercel.com) and import your `DevBoard_AI` repository.
   - Under **Environment Variables**, add all keys from your `.env` file (using the Supabase/Neon database URL and production GitHub OAuth Client ID/Secret).
   - Click **Deploy**. Vercel will build and launch your full-stack app on a public URL!

---

## 📄 License

MIT License. See `LICENSE` for details.
