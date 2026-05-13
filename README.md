# ClaimFlow — Insurance Claims Portal

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img alt="Mongoose" src="https://img.shields.io/badge/Mongoose-880000?style=for-the-badge&logo=mongoose&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img alt="NextAuth.js" src="https://img.shields.io/badge/NextAuth.js_v5-7C3AED?style=for-the-badge&logo=authelia&logoColor=white" />
  <img alt="Zod" src="https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white" />
  <img alt="Zustand" src="https://img.shields.io/badge/Zustand-433E38?style=for-the-badge&logo=react&logoColor=white" />
  <img alt="Framer Motion" src="https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white" />
  <img alt="React Hook Form" src="https://img.shields.io/badge/React_Hook_Form-EC5990?style=for-the-badge&logo=reacthookform&logoColor=white" />
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img alt="Nodemailer" src="https://img.shields.io/badge/Nodemailer-22B573?style=for-the-badge&logo=minutemailer&logoColor=white" />
  <img alt="bcrypt" src="https://img.shields.io/badge/bcrypt.js-F05032?style=for-the-badge&logo=letsencrypt&logoColor=white" />
  <img alt="Recharts" src="https://img.shields.io/badge/Recharts-22B5BF?style=for-the-badge&logo=chartdotjs&logoColor=white" />
</p>

<br/>

A full-stack insurance claims management portal built with Next.js 14 App Router, MongoDB, and NextAuth.js v5.

## Screenshot

![ClaimFlow Dashboard](public/screenshot.svg)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: MongoDB with Mongoose
- **Auth**: NextAuth.js v5 (JWT strategy)
- **File Uploads**: Native FormData API (stored on disk)
- **Email**: Nodemailer (console transport for dev)
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **State**: Zustand
- **Animations**: Framer Motion
- **Charts**: Recharts — interactive donut ring chart with animated segments and hover tooltips on the Statistics page

## Setup

### 1. Clone and install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

```env
MONGODB_URI=mongodb://localhost:27017/claimflow
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
AUTH_SECRET=<same value as NEXTAUTH_SECRET>
NEXTAUTH_URL=http://localhost:3000
UPLOAD_DIR=./uploads
```

### 3. Seed the database

```bash
npm run seed
```

### 4. Run development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Demo Credentials

| Role      | Email                  | Password       |
|-----------|------------------------|----------------|
| Claimant  | claimant@demo.com      | Claimant123!   |
| Adjuster  | adjuster@demo.com      | Adjuster123!   |
| Manager   | manager@demo.com       | Manager123!    |

## Project Structure

```
/app
  /api              ← API Routes (backend)
    /auth           ← Registration + NextAuth handler
    /claims         ← CRUD for claims
    /documents      ← File upload/download/delete
    /admin          ← Queue, assign, stats
  /(auth)           ← Login, Register (no sidebar)
  /(portal)         ← Claimant interface (sidebar)
    /dashboard      ← Summary cards + recent claims
    /claims         ← Claims list + new claim form
    /documents      ← Document library
  /(admin)          ← Adjuster/Manager interface
    /adjuster/queue ← Filterable claim queue
    /adjuster/[id]  ← Claim review + status update
/components
  /ui               ← Badge, Button, Card, Input, Skeleton, Spinner, Modal
  /claims           ← ClaimStatusBadge, ClaimTypeIcon, StatusTimeline, ClaimsTable
  /forms            ← FileUploadZone, StepIndicator
  /layout           ← PortalSidebar, AdminSidebar, Header, ErrorBoundary
  /charts           ← StatusDonutChart (Recharts, client component)
/lib
  db.ts             ← MongoDB connection
  auth.ts           ← NextAuth config
  validations.ts    ← Zod schemas
  mailer.ts         ← Nodemailer
  auditLog.ts       ← Audit log helper
/models             ← Mongoose schemas
/hooks              ← useClaims, useFileUpload
/types              ← TypeScript interfaces
/scripts
  seed.ts           ← Database seeder
```

## Architecture

- **Auth flow**: Credentials-based with JWT. Session attached to every request via NextAuth v5 `auth()`.
- **Role-based access**: Middleware redirects unauthenticated users to `/login` and wrong-role users to their home.
- **File uploads**: Files are stored in `./uploads/` on disk. The API route streams files back with correct MIME types.
- **Audit logging**: Every mutating API call creates an `AuditLog` entry with action, user, and metadata.
- **Email**: Console transport in dev (logs to terminal). Set SMTP vars for production.

## Dataset Credit

Seed data structure inspired by the [Kaggle Auto Insurance Claims Dataset](https://www.kaggle.com/datasets/buntyshah/auto-insurance-claims-data) by Bunty Shah.
