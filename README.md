# ChoreQuest

ChoreQuest is a shared household management application designed to automate chore rotations, track completion, and incentivize roommates through a gamified leaderboard.

**Tech Stack:**

- **Frontend:** Angular (v21)

- **Backend:** Django (REST API)

- **Database/Auth:** Google Firebase / Firestore

- **Internal Routing DB:** SQLite (Django default)

---

## 🚀 First-Time Local Setup

If you are cloning this repository for the first time, you must set up your local environments for both the frontend and backend.

### 1. Frontend Setup (Angular)

Navigate to the frontend folder and install the Node packages:

```bash
cd frontend
npm install --legacy-peer-deps
```

### 2. Backend Setup (Django)

Navigate to the backend folder, create your own virtual environment, and install the required Python packages.

For Windows:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
```

For Mac/Linux:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 manage.py migrate
```

### 💻 Daily Development Workflow (Running the App)

To run the application locally, you will need to open two separate terminal windows—one for the backend and one for the frontend.

Terminal 1: Start the Django Backend

```bash
cd backend
```

# Windows:

```bash
venv\Scripts\activate
```

# Mac/Linux:

```bash
source venv/bin/activate
```

# Start the server

```bash
python manage.py runserver
```

The API will be available at: https://www.google.com/search?q=http://127.0.0.1:8000/

Terminal 2: Start the Angular Frontend

```bash
cd frontend
ng serve
```

The Web App will be available at: http://localhost:4200/

🛑 Teardown (Stopping the App)
When you are done coding for the day:

1. Go to your Angular Terminal and press Ctrl + C to stop the frontend.

2. Go to your Django Terminal and press Ctrl + C to stop the backend server.

3. While still in the Django terminal, type deactivate and hit Enter to exit your Python virtual environment.
