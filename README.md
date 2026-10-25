<div align="center">

# HCM Lite

### AI-assisted Human Capital Management for Admin, HR and Employees

Built for the **Saylani Hackathon**, 24 October 2026, Zaitoon Ashraf IT Park

![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=black)
![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?logo=sqlite&logoColor=white)
![AI](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?logo=google&logoColor=white)

**[Live Demo](#live-demo)** · **[Quick Start](#quick-start)** · **[Demo Walkthrough](#demo-walkthrough)** · **[AI Assistant](#ai-assistant)** · **[API Docs](#api-documentation)**

</div>

---

## Overview

HCM Lite is a web-based Human Capital Management system for the daily work of an HR team. It has three roles (Admin, HR, Employee), each with its own menu, data scope and dashboard, plus an AI assistant that answers questions from real data.

> **No pre-loaded or dummy data.** The system starts completely empty. Admin sets up the company, HR registers employees, and every number on every dashboard comes from what people actually do in the app.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Live Demo](#live-demo)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Demo Walkthrough](#demo-walkthrough)
- [Roles and Permissions](#roles-and-permissions)
- [AI Assistant](#ai-assistant)
- [Business Rules](#business-rules)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Functionality Checklist](#functionality-checklist)
- [Known Limitations](#known-limitations)
- [Author](#author)

## Features

| Module | What it does |
|---|---|
| **M1 Auth and Access** | JWT login, bcrypt-hashed passwords, 3 roles, server-side role and data-scope checks |
| **M2 Organization Setup** | Company profile, office hours, grace time, office location and radius, departments, designations, leave types, holidays |
| **M3 Employees** | Directory with search and filters, Employee 360 profile, CSV import (with dry run) and export |
| **M4 Attendance** | Web check-in/out stamped by the server, status rules, corrections, camera and location check-in |
| **M5 Leave** | Apply and cancel, balances, working-day counting, overlap and over-balance checks, approval inbox |
| **M6 Payroll Lite** | Salary structure, monthly draft, tax slab, Admin finalize and lock, payslip PDF |
| **M7 Dashboards** | Admin, HR and Employee dashboards with KPIs, trends and filters, computed on the server |
| **M8 AI Assistant** | Chat with tools, dashboard summary, smart leave form, policy Q&A |
| **M9 Comms and Audit** | Announcements, in-app notifications, audit log |

### Bonus features

- Camera attendance with face detection and GPS geofence (Haversine distance)
- Late penalty rule: 3 lates in a month = 0.5 day deduction in payroll
- AI understands Roman Urdu
- Dark mode and light mode

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy |
| Frontend | React (Vite) |
| Database | SQLite by default |
| Auth | JWT, bcrypt |
| PDF | ReportLab |
| AI | Google Gemini API with tool calling, with a rule-engine fallback |
| Testing | pytest |

## Live Demo

| | Link |
|---|---|
| Hosted app | `ADD-YOUR-LIVE-LINK-HERE` |
| Repository | `https://github.com/ZainAliKhanZK/hcm-lite` |

The hosted app opens at first-run setup, so you can create the company yourself.

> Free hosts may sleep when idle. The first request can take up to a minute.

## Quick Start

### Prerequisites

- Python 3.10 or newer (tested on 3.13)
- Node.js 18 or newer (only needed for development mode)

### 1. Clone and install

```bash
git clone https://github.com/ZainAliKhanZK/hcm-lite.git
cd hcm-lite

python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac / Linux

pip install -r requirements.txt
```

### 2. Create your environment file

```bash
copy .env.example .env         # Windows
# cp .env.example .env         # Mac / Linux
```

Then open `.env` and set your values (see [Configuration](#configuration)).

### 3. Run

**Option A: single command (production bundle)**

```bash
python main.py
```

Open **http://localhost:8000**. The backend serves both the REST API and the React app on the same port.

**Option B: development mode (hot reload)**

```bash
# Terminal 1: backend
python main.py

# Terminal 2: frontend
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

On Windows you can also double-click `start.bat`.

## Configuration

All secrets live in a `.env` file. Only `.env.example` is committed. Never commit your real `.env`.

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Signs login tokens. Use a long random value and keep it fixed. |
| `AI_API_KEY` | Google Gemini API key. Read only by the backend, never sent to the browser. |
| `ADMIN_EMAIL` | Optional. Pre-defines the first Admin account. |
| `ADMIN_PASSWORD` | Optional. Password for the first Admin account. |

### How to create the first Admin

1. Start the app with an empty database.
2. Open it in the browser. It detects a fresh install and opens the **First-Run Setup** page.
3. Enter the company name and the Admin email and password.

Alternatively, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before the first start.

### How to set the AI key

1. Create a free key in Google AI Studio.
2. Put it in `.env` as `AI_API_KEY=your_key_here`.
3. Restart the backend.

If no key is set or the network is offline, a built-in rule engine answers the supported questions so the assistant still works.

## Demo Walkthrough

A 5-minute story that starts from a fresh install. The credentials below are examples for the demo only.

### 1. First-run setup (Admin)

1. Open the app. The First-Run Setup page appears.
2. Enter company `Saylani Tech Solutions`, Admin `admin@hcmlite.com` and a password of your choice.
3. Set office rules: start 09:00, grace 15 min, geofence radius 150 m.

### 2. Organization setup and HR login (Admin)

1. Log in as Admin and open **Company Settings**.
2. Create departments (for example Engineering, Human Resources) and designations.
3. Check the default leave quotas: annual 14, sick 8, casual 10, unpaid unlimited.
4. Open **HR and User Accounts** and create an HR login. Log out.

### 3. Register employees (HR)

1. Log in as HR and open **Employees**.
2. Click **Register Employee** (for example code `EMP-001`, name `Ali Khan`, salary `80000`).
3. The app shows a **temporary password**. This also created the employee's login.
4. Optional: test **CSV Import** with `sample_employees.csv` using the dry run. Log out.

### 4. Employee self-service

1. Log in as the employee with the temporary password.
2. The app forces a **password change** on first sign-in.
3. Click **Check In**. A second check-in the same day is rejected with HTTP 409.
4. Open **Leave** and type: `Need next Monday and Tuesday off for my sister's wedding`.
5. The AI pre-fills type, dates and reason. Review and **Submit**. Log out.

### 5. Approval, payroll and payslip

1. HR opens **Leave Management** and approves the request.
2. HR opens **Payroll**, enters the month (for example `2026-10`) and generates the draft.
3. Admin opens **Payroll** and clicks **Finalize**. The month is now locked.
4. The employee downloads the **payslip PDF**.
5. Admin opens the **Audit Log** to see every important action.

## Roles and Permissions

Access is checked **on the server for every request**. Hiding a button is not enough. The AI assistant always works with the same access as the person using it.

| Capability | Admin | HR | Employee |
|---|:---:|:---:|:---:|
| Company settings, departments, leave types, holidays | Manage | View | None |
| Create HR logins, deactivate or reset logins | Manage | None | None |
| Register and edit employees | View | Manage | Own phone and address |
| CSV import and export | None | Manage | None |
| Check in and out | None | Own | Own |
| Attendance board and corrections | View | Approve | Request |
| Apply for leave | None | Own | Own |
| Approve or reject leave | View | Approve | None |
| Salary structure and payroll draft | View | Manage | None |
| Finalize payroll | Manage | None | None |
| Payslips | All | All | Own |
| Dashboards | Company | HR | Personal |
| AI assistant data scope | All data | HR data | Own data |
| Announcements | Post | Post | Read |
| Audit log | View | None | None |

## AI Assistant

The AI explains and assists. **The database is the only source of truth.**

### How it works

1. The user sends a question to `POST /ai/chat`.
2. The model picks a **tool** (a small backend function).
3. The backend runs the tool using **the logged-in user's permissions**.
4. The model writes the answer from the tool result.

Available tools: `get_headcount`, `get_attendance_summary`, `get_late_comers`, `get_leave_summary`, `get_my_leave_balance`, `get_payroll_summary`, `search_employees`.

### AI features

| Feature | Who | Description |
|---|---|---|
| Chat assistant | All roles | Answers from real data within the user's scope |
| Dashboard summary | Admin, HR | The Summarize button sends the KPI JSON and returns 3 to 5 insight bullets |
| Smart leave | Employee | A sentence becomes a pre-filled leave form. The user confirms. |
| Policy Q&A | All roles | Answers about attendance, leave and payroll rules only from the stated rules |
| Roman Urdu | All roles | Understands Roman Urdu phrases such as "Mujhe chutti chahiye" |

### Example questions

| Role | Question | Result |
|---|---|---|
| HR | Who is on leave today? | Names and leave types from approved leaves |
| HR | Who came late most often this month? | Top late arrivals from the database |
| HR | What is this month's attendance rate? | Same number as the dashboard |
| Employee | How many sick leaves do I have left? | Own balance after approved leaves |
| Employee | What is my colleague's salary? | Politely refuses |
| Employee | I need next Monday and Tuesday off for a wedding | Pre-filled casual leave form |

### Guardrails

- The API key is read only from a backend environment variable. The browser never calls the AI provider.
- The model never queries the database directly. Tools reuse the same services and permission checks as the REST API.
- The AI never saves data on its own. Output is validated before use.
- Calls have a timeout and a friendly fallback, and answers carry an **AI-generated** label.
- Every call is recorded in the AI log.

## Business Rules

| Area | Rule |
|---|---|
| Office hours | Start 09:00, grace 15 min, weekend Saturday and Sunday |
| Attendance status | Late after 09:15. Half day under 5 hours. Absent if no record and no approved leave. Missing checkout if no check-out. |
| Check-in | Server stamps the time. One record per employee per day. A second check-in returns 409. |
| Leave quotas | Annual 14, sick 8, casual 10, unpaid unlimited |
| Leave counting | Working days only (weekends and holidays skipped). Overlap or over-balance returns 422. |
| Gross salary | 1.5 x basic (HRA 40%, medical 10%) |
| Payroll deductions | Per day = gross / working days. Deduct absent days, unpaid days and 0.5 x half days. Joiners and leavers are prorated. |
| Tax slab (on gross x 12) | 0 to 600k: 0%. To 1.2M: 5%. To 2.4M: 30k + 15%. To 3.6M: 210k + 25%. Above: 510k + 35%. |
| Payroll lock | Only Admin can finalize. Finalized runs cannot be edited. |
| Camera check-in | Rejected if no face, more than one face, outside the radius, or GPS accuracy worse than 100 m |

## Project Structure

```
hcm-lite/
├── app/
│   ├── routers/        # API endpoints, one file per module
│   ├── services/       # Business rules (attendance, leave, payroll, AI, ...)
│   ├── auth.py         # JWT and role / scope guards
│   ├── config.py       # Settings from environment variables
│   ├── database.py     # Database connection
│   ├── models.py       # Database tables
│   ├── schemas.py      # Request / response validation
│   ├── audit.py        # Audit log helper
│   └── main.py         # FastAPI application
├── frontend/           # React (Vite) app
│   └── src/            # Pages, components, auth context, API client
├── tests/              # pytest suite
├── main.py             # Entry point (python main.py)
├── requirements.txt
├── .env.example
├── sample_employees.csv
└── start.bat
```

Rules live in **services**, routers stay thin, and every request body is validated by schemas.

## Testing

```bash
venv\Scripts\activate
pytest tests/
```

The suite covers payroll formulas, tax slabs, the geofence check and AI summaries.

## API Documentation

With the backend running, interactive docs are available at **http://localhost:8000/docs**.

## Security

- Passwords are hashed with bcrypt. Temporary passwords must be changed on first sign-in.
- JWT authentication. Every endpoint checks role and data scope on the server.
- An Employee can only read rows that belong to their own employee record.
- The AI key and secrets live only in environment variables. Only `.env.example` is committed.
- Finalized payroll is locked, and audit log entries cannot be edited or deleted.
- Camera check-in stores the result, not a full photo.

## Functionality Checklist

All 25 functionalities from the challenge brief:

| # | Functionality | Status |
|---|---|:---:|
| 01 | First-run setup: company profile and Admin account | Done |
| 02 | Login, logout, change password, role-based menus | Done |
| 03 | Company settings: hours, grace, weekend, location, radius | Done |
| 04 | Departments, designations, leave types, quotas, holidays | Done |
| 05 | Create HR logins, deactivate or reset logins | Done |
| 06 | Register employee (creates login) and edit details | Done |
| 07 | Directory with search, filters and Employee 360 | Done |
| 08 | CSV import with dry-run report, CSV export | Done |
| 09 | Web check-in and check-out | Done |
| 10 | Attendance calendar and daily board | Done |
| 11 | Attendance corrections: request and approve | Done |
| 12 | Apply or cancel leave, balance and history | Done |
| 13 | Approve or reject leave with a comment | Done |
| 14 | Salary structure per employee | Done |
| 15 | Monthly payroll draft | Done |
| 16 | Finalize payroll (locks the month) | Done |
| 17 | Payslips with PDF download | Done |
| 18 | Dashboards, KPIs, trends and filters | Done |
| 19 | AI assistant chat from real data | Done |
| 20 | AI dashboard summary | Done |
| 21 | Smart leave | Done |
| 22 | Policy Q&A | Done |
| 23 | Announcements | Done |
| 24 | In-app notifications | Done |
| 25 | Audit log | Done |

> Update this table to match what you actually verified before submitting.

## Known Limitations

- `ADD-ANY-FEATURE-NOT-FULLY-WORKING-HERE`
- Camera face detection depends on browser support and camera permission.
- Free hosting may put the backend to sleep when idle.
- Face matching against an enrolled face is not implemented (detection only).

## Author

**Zain Ali Khan**
BS Artificial Intelligence, Sindh Madressatul Islam University (SMIU), Karachi

[GitHub](https://github.com/ZainAliKhanZK)

---

<div align="center">

Built for the Saylani Hackathon, 24 October 2026

</div>
