# 💡 CareAccess – Accessible Healthcare Assistant Platform

**CareAccess** is a modern web-based assistant designed to enhance healthcare accessibility for people with disabilities and others in need.  
This interactive AI-driven interface supports voice interaction, symptom checking, and real-time accessibility enhancements to improve digital health engagement.

---

## 🚀 Features

- ✅ **Voice Assistant** for real-time Q&A  
- ✅ **Health Form Input** with microphone support  
- ✅ **Interactive AI Chatbot** (Ask Doctor) powered by **Groq**  
- ✅ **Mute/Unmute Controls** for auditory accessibility  
- ✅ **Symptom Checker Page** with speech-to-text  
- ✅ **Smart Detection of User Location** (for healthcare suggestions)  
- ✅ **Background and 3D Visuals** built with **Spline**  
- ✅ **Responsive Design** with accessibility-first UI  

---

## 🖥️ Tech Stack

### Frontend

- **Framework:** React (with Vite)  
- **Styling:** Tailwind CSS  
- **Language:** TypeScript  

### Backend

- **Framework:** Python, Flask  
- **AI Models:** Groq (for LLM), ElevenLabs (for Text-to-Speech)  

### Deployment

- **Frontend:** Render (Static Site)  
- **Backend:** Render (Web Service)  
- **Version Control:** Git + GitHub  

---

## 🛠️ Setup & Run Locally

### Prerequisites

Make sure you have the following installed:

- [Node.js & npm](https://nodejs.org/) – for frontend  
- [Python & pip](https://www.python.org/downloads/) – for backend  
- [Git](https://git-scm.com/) – for version control  

### API Keys

You will need API keys for:

- [Groq](https://groq.com/)  
- [ElevenLabs](https://www.elevenlabs.io/)

> Create a `.env` file in the root of your backend folder and add:

```env
GROQ_API_KEY="your_groq_api_key"
ELEVEN_API_KEY="your_elevenlabs_api_key"

# 🔧 Local Development

## Clone the Repository

```bash
git clone https://github.com/Jonsbabbyk/careaccess.git
cd careaccess
```

## Set Up the Frontend (React + Vite)

```bash
cd frontend
npm install          # Install frontend dependencies
npm run dev          # Start the frontend development server
```

The frontend should run on: [http://localhost:5173](http://localhost:5173)

## Set Up the Backend (Flask + Uvicorn)

Open a new terminal at the project root:

```bash
pip install -r requirements.txt   # Install backend dependencies
uvicorn app:asgi_app --reload     # Start the backend server
```

The backend should run on: [http://localhost:8000](http://localhost:8000)

> **Note:** The frontend is configured to communicate with the live Render backend.  
> For local testing, change `API_BASE_URL` in the frontend to `http://localhost:8000`.

---

# 🚀 Deployment on Render

This project is deployed using **Render** as two separate services:

- **Frontend** → Deployed as a Static Site  
- **Backend** → Deployed as a Web Service

---

# ⚙️ CORS Configuration for Backend

Ensure your `app.py` (or main backend file) includes the following to allow cross-origin requests:

```python
from flask_cors import CORS

CORS(app, resources={
  r"/*": {
    "origins": [
      "http://localhost:5173",
      "https://your-frontend-url.onrender.com"
    ]
  }
})
```

This allows communication between your frontend and backend services.

---

# 📄 License

MIT License © [Your Name or Organization]

---

# 🙌 Contributions

Contributions are welcome! If you'd like to add features, fix bugs, or improve accessibility, feel free to fork the repository and open a pull request.

---


