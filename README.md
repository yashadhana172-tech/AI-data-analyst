# InsightAI – AI Data Analyst 🚀

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![DuckDB](https://img.shields.io/badge/DuckDB-1.0+-FFF000.svg?logo=duckdb&logoColor=black)](https://duckdb.org)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com)
[![Tests](https://img.shields.io/badge/pytest-20%20passed-brightgreen.svg?logo=pytest&logoColor=white)](https://pytest.org)

An enterprise-grade, autonomous **AI Data Analytics Platform** built from scratch. Upload datasets in **CSV, Excel (XLSX/XLS), JSON, or Parquet** formats and query them in natural language. InsightAI automatically analyzes table schemas, executes safe read-only **DuckDB SQL** in vectorized memory, generates interactive **Plotly** visualizations, and delivers business takeaways without hallucinating numbers.

---

## 🌟 Key Features

### 1. 🤖 9-Stage Autonomous AI Agent Pipeline
Every inquiry travels through a dedicated multi-agent chain:
```
USER QUESTION
      ↓
[1] QUESTION UNDERSTANDING AGENT (Detects intent, rankings, time periods, metrics)
      ↓
[2] DATASET / SCHEMA ANALYZER (Fuzzy maps semantic terms to columns)
      ↓
[3] ANALYSIS PLANNER (Constructs aggregations, groupings, bounds)
      ↓
[4] SQL / PANDAS GENERATOR (OpenAI LLM + Autonomous Fallback Engine)
      ↓
[5] CODE / QUERY VALIDATOR (AST-based read-only security check, enforces limits)
      ↓
[6] EXECUTION ENGINE (Vectorized in-memory DuckDB execution with query retry)
      ↓
[7] RESULT VALIDATOR (Checks return shape, empty sets, error diagnostics)
      ↓
[8] VISUALIZATION AGENT (Selects optimal chart: Bar, Line, Scatter, Pie, KPI)
      ↓
[9] INSIGHT GENERATOR (Synthesizes factual answers, findings, and recommendations)
      ↓
STRUCTURED RESPONSE
```

### 2. 🛡️ Safe Execution Sandbox & Anti-Hallucination
- **Read-Only Enforcement**: Blocks all destructive DDL/DML statements (`DROP`, `DELETE`, `INSERT`, `UPDATE`, `ALTER`, `TRUNCATE`, `ATTACH`, `PRAGMA`, `COPY`).
- **Row Limits**: Automatically injects and caps query row limits (defaults to `LIMIT 200`, maximum `LIMIT 500`).
- **Zero Hallucination Rule**: Every number, percentage, rank, and dollar amount displayed originates strictly from executed DuckDB table queries.

### 3. 📊 Automatic Data Profiling & Hygiene Studio
- **Dataset Health Score**: Computes an automated 0–100 data quality score.
- **Statistical Distributions**: Mean, median, standard deviation, min, max, quartiles (Q1, Q3), skewness, and interquartile range (1.5x IQR) outlier detection.
- **Categorical Breakdown**: Unique values count, frequency distribution, and modal values.
- **Pearson Correlation Matrix**: Computes pairwise correlation across all numerical dimensions.
- **Data Cleaning Studio**: One-click deduplication, null imputation (Mean, Median, Mode, Zero, or Custom labels), drop columns, with live before/after diff preview and downloadable cleaned CSV.

### 4. 💬 ChatGPT-Style Analyst Chat
- Conversational memory preserving multi-turn context (e.g. *"Now show only the top 3"*).
- Structured response card:
  - 💬 **Direct Answer**: Direct answer with key figures.
  - 📊 **Interactive Plotly Chart**: Interactive tooltips, zoom, and one-click PNG download.
  - 📋 **Data Table Tab**: View exact query output rows.
  - 📌 **Key Findings**: 3–5 quantitative bullet points.
  - 💡 **Strategic Insights & Recommendations**: Actionable next steps.
  - 🔍 **View SQL**: Expandable drawer with syntax-highlighted DuckDB SQL and copy button.
  - ⏱️ **Execution Badge**: Latency metrics in milliseconds.
  - 💡 **Clickable Follow-up Questions**: Instant drill-down suggestions.

### 5. 📈 Dedicated Visualization Studio
- Visual query builder: pick dataset, chart type (Bar, Horizontal Bar, Line, Scatter, Pie, Histogram), X-axis, Y-axis, aggregation (`SUM`, `AVG`, `COUNT`, `MIN`, `MAX`), and row limit.
- Download rendered chart as PNG or export underlying query data as CSV.

### 6. 📑 Executive Report Generator
- Multi-section report generator (Executive Summary, Dataset Overview, Data Quality, Distribution Tables, Major Findings, Recommendations, Limitations).
- Export in three formats: **PDF**, **HTML**, and **Markdown**.

### 7. 🔐 Authentication & Zero-Friction Demo Mode
- JWT-based authentication with bcrypt password hashing.
- One-click **Demo Login** enabling instant evaluation without registration.

---

## 🏗️ Architecture & Tech Stack

```
ai-data-analyst/
├── backend/
│   ├── app/
│   │   ├── agents/          # 9-stage AI agent pipeline & SQL validator
│   │   ├── analytics/       # Dataset profiler and cleaning engine
│   │   ├── api/             # FastAPI REST endpoints (auth, datasets, chat, reports, viz)
│   │   ├── core/            # Config, security, logging
│   │   ├── database/        # SQLAlchemy engine, session, and DB initializer
│   │   ├── models/          # Database models (User, Dataset, Conversation, Message, Report)
│   │   ├── schemas/         # Pydantic v2 validation models
│   │   ├── services/        # Business logic and report compiler
│   │   └── main.py          # FastAPI application entrypoint
│   ├── tests/               # 20 automated pytest tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # PlotlyChart, SqlViewer, UploadModal, DataCleanerModal, Navbar, Sidebar
│   │   ├── context/         # AuthContext
│   │   ├── pages/           # Dashboard, Datasets, Chat, Visualizations, Reports, Settings
│   │   ├── services/        # Typed API service
│   │   └── types/           # TypeScript definitions
│   ├── package.json
│   └── vite.config.ts
├── data/
│   └── sample_sales.csv     # 1,250 realistic e-commerce transactions
├── reports/                 # Output directory for compiled reports
├── docker-compose.yml       # Multi-container orchestration (Frontend, Backend, PostgreSQL)
├── Dockerfile               # Production Backend container
└── .env.example             # Environment configuration template
```

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Plotly.js |
| **Backend** | Python 3.11+, FastAPI, DuckDB, pandas, NumPy, SQLAlchemy, PyJWT, bcrypt, ReportLab |
| **Database** | SQLite (default zero-dependency local) / PostgreSQL (production & Docker) |
| **AI Layer** | Configurable OpenAI API (`gpt-4o-mini`) + Built-in Autonomous Analytical Fallback Engine |

---

## ⚡ Quick Start (Running Locally)

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Clone & Configure
```bash
git clone <repo-url>
cd "AI Data Analyst"

# Copy environment template
cp .env.example .env
```

### 2. Start the Backend
```bash
# Navigate to backend and install requirements
cd backend
pip install -r requirements.txt

# Run the backend server (automatically initializes DB and seeds sample dataset)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Backend API will be accessible at: `http://127.0.0.1:8000` (Docs at `http://127.0.0.1:8000/docs`).

### 3. Start the Frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend Web UI will be live at: `http://127.0.0.1:5173`.

---

## 🐳 Docker Deployment

Run the complete production stack (Backend + Frontend + PostgreSQL) with a single command:
```bash
docker compose up --build
```
- **Web Application**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **PostgreSQL**: `localhost:5432`

---

## 🧪 Automated Testing

Run the comprehensive 20-test test suite covering SQL validation, DuckDB execution, profiling, cleaning, authentication, and chat workflows:
```bash
cd backend
pytest tests/ -v
```
To run the live integration script:
```bash
python scripts/verify_live_system.py
```

---

## 💡 Example AI Questions to Try

1. **Rankings**: *"What are the top 10 products by revenue?"*
2. **Profitability**: *"Which region generates the highest profit?"*
3. **Time Series**: *"Show monthly revenue trends."*
4. **Unit Economics**: *"What is the average order value?"*
5. **Categories**: *"Which category has the highest sales volume?"*
6. **Anomalies**: *"Find unusual sales transactions in this dataset."*
7. **Correlations**: *"Show the correlation between discount and profit."*
8. **Customers**: *"Which customers have generated the most revenue?"*
9. **Geography**: *"Compare revenue by region."*

---

## 🔑 Environment Variables Reference

| Variable | Description | Default |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key (optional; deterministic fallback if unset) | `""` |
| `OPENAI_MODEL` | OpenAI Model | `gpt-4o-mini` |
| `DATABASE_URL` | SQLAlchemy Database URL | `sqlite:///./data/insight_ai.db` |
| `SECRET_KEY` | JWT signature secret | Random secure dev key |
| `MAX_UPLOAD_SIZE_MB` | Maximum allowed file upload size | `50` |

---

## 👨‍💻 Project Evaluation & B.Tech Capstone Highlights
- **100% Offline Capability**: Even without an external OpenAI key, the built-in deterministic planning engine parses schemas, generates DuckDB SQL, executes aggregations, and plots graphs.
- **Full Security Hardening**: AST statement validation prevents SQL injections and blocks filesystem probing.
- **Production Architecture**: Decoupled clean architecture with repository/service separation, strong typing with Pydantic v2 and TypeScript.
