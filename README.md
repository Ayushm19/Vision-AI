
---

## 📹 Vision-AI: Video Management System (VMS) with AI Integration

**Vision-AI** is a lightweight Video Management System that can handle 10+ video/image inputs and integrate multiple AI models for real-time or batch inference.

### 🚀 Features

* 🔄 Supports simultaneous input from multiple video streams or image folders
* 🧠 Integrates AI models like object detection, classification, fire/violence detection, and video summarization
* ⚙️ Built with **FastAPI** backend and **React** dashboard
* 📊 Dashboard displays active streams, detection stats, summaries, and alerts
* 💾 AI output is stored in a PostgreSQL database and accessible via API

### 📦 Tech Stack

* **Backend**: FastAPI, SQLAlchemy, PostgreSQL, Supabase (for video upload), Ultralytics YOLOv8, Transformers
* **Frontend**: React + Tailwind UI
* **Deployment-ready** with modular, async architecture

---
Thanks for sharing your `requirements.txt`. Based on that, here’s the **final updated and complete `README.md` setup instructions** that:

* Uses `pip install -r requirements.txt` to install backend dependencies
* Includes the `.env` file setup
* Covers both **frontend and backend**
* Is clean and copy-paste ready

---

## ⚙️ Project Setup Instructions

### 📁 Backend (FastAPI + AI)

#### 1. Navigate to the backend folder

```bash
cd backend
```

#### 2. Create and activate a virtual environment

```bash
# Create virtual environment
python -m venv venv

# Activate on Windows
.\venv\Scripts\activate

# On Mac/Linux:
# source venv/bin/activate
```

#### 3. Install all backend dependencies

copy and paste this:

```bash
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-dotenv supabase ultralytics torch torchvision torchaudio transformers decord opencv-python
```

> ⚠️ Make sure Python 3.10 or higher is installed.

#### 4. Create a `.env` file in `backend/`

```env
SUPABASE_URL=https://iskssldtddsllraqgviw.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key_here
```

#### 5. Run the backend server

```bash
uvicorn main:app --reload
```

Backend will run at: [http://localhost:8000](http://localhost:8000)

---

### 💻 Frontend (React + Next.js)

#### 1. Navigate to the frontend folder

```bash
cd frontend
```

#### 2. Install Node dependencies

```bash
npm install
```

> ✅ Ensure you have Node.js v18+ installed.

#### 3. Create a `.env.local` file in `frontend/`

```env
NEXT_PUBLIC_SUPABASE_URL=https://iskssldtddsllraqgviw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

#### 4. Run the frontend dev server

```bash
npm run dev
```

Frontend will run at: [http://localhost:3000](http://localhost:3000)

---

### ✅ Project Overview

| Component | Stack                                               | Port                    |
| --------- | --------------------------------------------------- | ----------------------- |
| Backend   | FastAPI, Supabase, AI models (YOLOv8, transformers) | `http://localhost:8000` |
| Frontend  | React, Next.js                                      | `http://localhost:3000` |

---
