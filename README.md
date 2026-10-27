# HCM Lite — AI-Assisted Human Capital Management

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Open%20App-success?style=for-the-badge)](hcmlite.onrender.com)

###### The app starts empty: open it, create your company and Admin on the first-run setup page, then follow the walkthrough below. The first load may take up to a minute if the server is asleep.
---------------------------------------

### Built for the **Saylani Hackathon · 24 October 2026 · Zaitoon Ashraf IT Park**.

HCM Lite is an end-to-end, web-based Human Capital Management system for **Admin**, **HR**, and **Employees** powered by real-time database aggregations and an intelligent AI assistant.

> **Zero Pre-Loaded / Dummy Data**: As required by the challenge brief, the system starts completely empty. The Admin initializes the company, HR registers employees, and every number is calculated dynamically from real operational activity in the app.

---

## 🚀 Quickstart — Run in Under 5 Minutes

### Prerequisites

- **Python 3.10+** (Tested on Python 3.13)
- **Node.js 18+** and npm
- **Git**

---

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/hcm-lite.git
cd hcm-lite
```

### 2. Backend Setup (Python)

```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux / Mac

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup (React)

```bash
cd frontend
npm install        # installs node_modules
npm run build      # compiles React → frontend/dist/
cd ..
```

### 4. Environment Variables

```bash
# Copy the example file and edit it
copy .env.example .env     # Windows
# cp .env.example .env     # Linux/Mac
```

Open `.env` and fill in your values (see `.env.example` for guidance).  
> **AI features are optional.** The system works 100% without a Gemini API key using the built-in rule engine.

### 5. Run the Application

```bash
python main.py
```

Open **[http://localhost:8000](http://localhost:8000)** in your browser!  
The backend serves both the **FastAPI REST API** and the **React SPA** on the same port.  
API docs: **[http://localhost:8000/docs](http://localhost:8000/docs)**

---

### Option B: Development Mode (Hot-Reload)

**Terminal 1 — Backend:**
```bash
venv\Scripts\activate
python main.py
```

**Terminal 2 — Frontend (Vite):**
```bash
cd frontend
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)**


---


## 🔑 First-Run Setup & 5-Minute Live Demo Walkthrough

### 1. First-Run Setup (Empty Start)

1. Open [http://localhost:8000](http://localhost:8000) (or 5173).
2. The app detects a fresh install and opens the **First-Run Setup Page**.
3. Fill in:
   - **Company Name**: `Saylani Tech Solutions`
   - **Admin Email**: `admin@hcmlite.com`
   - **Admin Password**: `Admin@12345`
   - **Office Rules**: 09:00 start, 15m grace period, 150m geofence radius.
4. Click **Initialize HCM Lite**.

### 2. Admin Creates HR Login & Organization Setup

1. Log in as `admin@hcmlite.com` / `Admin@12345`.
2. Go to **Company Settings**:
   - Create Departments (e.g. `Engineering`, `Human Resources`).
   - Create Designations (e.g. `Senior Software Engineer`).
   - Verify Default Quotas: Annual (14), Sick (8), Casual (10), Unpaid (unlimited).
3. Under **HR & User Accounts**:
   - Create an HR account: `hr@company.com` / `Hr@12345`.
4. Log out.

### 3. HR Registers Employees & Attendance Roster

1. Log in as `hr@company.com` / `Hr@12345`.
2. Go to **Employees Directory**:
   - Click **Register Employee**: e.g., Code `EMP-001`, Name `Ali Khan`, Email `ali@company.com`, Salary `80000`.
   - The system displays the auto-generated **Temporary Password** (e.g. `vK9pL3aQ`).
   - *(Optional)* Test **CSV Import** with `sample_employees.csv` using the **Dry-Run Error Validator**.
3. Log out.

### 4. Employee Self-Service, Smart Leave, & Camera Check-in

1. Log in as `ali@company.com` with the temporary password.
2. The system prompts the **Mandatory Password Change Modal** on first sign-in. Set new password `Ali@12345`.
3. On the **Self-Service Dashboard**:
   - Click **Web Check-In** or **Camera Check-In** (detects face + checks GPS geofence).
   - Second check-in attempt will be rejected with HTTP 409 Conflict.
4. Go to **Leave & Smart Apply**:
   - In the **Smart Leave Assistant**, type: `"Need next Monday and Tuesday off for sister wedding"` or in Roman Urdu `"Mujhe aglay peer ko chutti chahiye"`.
   - The AI pre-fills the dates, Casual Leave category, and reason.
   - Click **Submit Leave Request**.
5. Log out.

### 5. HR Approval & Payroll Finalization

1. Log in as `hr@company.com`.
2. Go to **Leave Management** -> Review the pending leave request -> Click **Approve**.
3. Go to **Payroll Runs** -> Enter month `2026-10` -> Click **Generate Monthly Draft**.
   - Inspect automatic pro-rating, deductions for absences/half-days/lates, and FBR tax slabs.
4. Log out.
5. Log in as `admin@hcmlite.com` -> Go to **Payroll** -> Click **Lock & Finalize Payroll** (Month is now locked).
6. Log in as employee `ali@company.com` -> Download official **PDF Payslip** (generated dynamically using ReportLab).

---

## 🤖 AI Assistant (Module 8 & Section 4)

Click the **Ask Assistant** button anytime anywhere in the portal:

### Live Test Questions Judges Will Ask:

| As Role        | Question                                                                   | What HCM Lite Does                                  |
| -------------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| **HR**         | *"Who is on leave today?"*                                                 | Queries approved leaves, returns names & types      |
| **HR**         | *"Who came late most often this month?"*                                   | Identifies top late arrivals from DB                |
| **HR**         | *"What is this month's attendance rate?"*                                  | Computes `(present + late) / total` exactly         |
| **HR / Admin** | *"Summarize Insights"* button                                              | Sends current KPI JSON, returns 3-5 concise bullets |
| **Employee**   | *"How many sick leaves do I have left?"*                                   | Returns own remaining balance after approved leaves |
| **Employee**   | *"What is colleague's salary?"*                                            | **Politely refuses** per RBAC data guard            |
| **Employee**   | *"Need next Monday & Tuesday off for wedding"* | Extracts dates, type, reason -> pre-fills form      |
| **Any**        | Roman Urdu: *"Mujhe chutti chahiye"*                                       | Understands Roman Urdu and responds accurately      |

### Hosted AI Configuration:

To enable Google Gemini API:

1. Copy `.env.example` to `.env`:
   
   ```bash
   cp .env.example .env
   ```
2. Set your Gemini API Key:
   
   ```env
   AI_API_KEY=your_gemini_api_key_here
   ```
   
   > **Graceful Fallback**: If no API key is provided or network is offline, the integrated deterministic rule engine handles all tool calls and questions 100% reliably.

---

## 🏗️ Architecture & 25 Functionalities Checklist

| #      | Functionality                                                | Status     | Tested |
| ------ | ------------------------------------------------------------ | ---------- | ------ |
| **01** | First-run setup: company profile and Admin account           | ✅ Complete | Yes    |
| **02** | Login, logout, change password; role-based menus             | ✅ Complete | Yes    |
| **03** | Company settings: hours, grace, weekend, location + radius   | ✅ Complete | Yes    |
| **04** | Departments, designations, leave types/quotas, holidays      | ✅ Complete | Yes    |
| **05** | Create HR logins; deactivate or reset any login              | ✅ Complete | Yes    |
| **06** | Register employee (creates login) & edit details             | ✅ Complete | Yes    |
| **07** | Employee directory with search, filters & Employee 360       | ✅ Complete | Yes    |
| **08** | CSV import with dry-run error report; CSV export             | ✅ Complete | Yes    |
| **09** | Web check-in/out (server stamps time, 2nd check-in = 409)    | ✅ Complete | Yes    |
| **10** | Attendance calendar and daily attendance board               | ✅ Complete | Yes    |
| **11** | Attendance correction: request and approve with comment      | ✅ Complete | Yes    |
| **12** | Apply/cancel leave, see balance (skips weekends/holidays)    | ✅ Complete | Yes    |
| **13** | Approve or reject leave with a comment                       | ✅ Complete | Yes    |
| **14** | Salary structure (Gross = 1.5 × basic, HRA 40%, Medical 10%) | ✅ Complete | Yes    |
| **15** | Monthly payroll draft: deductions, prorating, tax slabs      | ✅ Complete | Yes    |
| **16** | Finalize payroll (locks the month; only Admin)               | ✅ Complete | Yes    |
| **17** | Payslips with dynamic ReportLab PDF download                 | ✅ Complete | Yes    |
| **18** | Dashboards, KPIs, trends and insight lists with filters      | ✅ Complete | Yes    |
| **19** | AI assistant chat answering from real data with tools        | ✅ Complete | Yes    |
| **20** | AI dashboard summary (3-5 insight bullets from KPI JSON)     | ✅ Complete | Yes    |
| **21** | Smart leave: type a sentence, get a pre-filled leave form    | ✅ Complete | Yes    |
| **22** | Policy Q&A on attendance, leave and payroll rules            | ✅ Complete | Yes    |
| **23** | Announcements on all dashboards                              | ✅ Complete | Yes    |
| **24** | In-app notifications (leave decisions, payslips)             | ✅ Complete | Yes    |
| **25** | Immutable audit log of create, update, approve & finalize    | ✅ Complete | Yes    |

### 🌟 Bonus (+10 Points) Features Shipped:

1. **Camera attendance with face detection + GPS location**: Haversine distance geofence verification.
2. **Late penalty rule**: 3 lates in a month = 0.5 day salary deduction automatically computed in payroll.
3. **Roman Urdu understanding**: AI Assistant and Smart Leave parser comprehend Roman Urdu phrases.
4. **Dark Mode / Light Mode toggle**: Sleek modern UI design with glassmorphism.

---

## 🧪 Automated Testing

Run the automated test suite verifying tax slabs, payroll formulas, geofence, and AI summaries:

```bash
venv\Scripts\activate
pytest tests/
```

All tests pass with 100% success.
