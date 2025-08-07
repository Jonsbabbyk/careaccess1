from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import requests
import os
from groq import Groq
from dotenv import load_dotenv

# Import the WSGI to ASGI adapter
from asgiref.wsgi import WsgiToAsgi

# --- API KEY & CONFIGURATION ---
load_dotenv()

# Retrieve API keys from environment variables
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
ELEVEN_API_KEY = os.environ.get("ELEVEN_API_KEY")

# --- FLASK APP SETUP ---
app = Flask(__name__)

# Configure CORS to allow requests from your frontend's origin
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

app.config['UPLOAD_FOLDER'] = 'audio'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# --- GROQ MODEL CONFIGURATION ---
groq_client = Groq(api_key=GROQ_API_KEY)
GROQ_MODEL = "llama3-8b-8192"

# --- AI CHAT ENDPOINT ---
@app.route("/ask-ai", methods=["POST"])
def ask_ai():
    # ... (Your existing ask_ai function code) ...
    try:
        data = request.json
        question = data.get("question")
        history = data.get("history", [])

        if not question:
            return jsonify({"error": "No question provided"}), 400

        messages = [
            {"role": msg["type"], "content": msg["content"]}
            for msg in history
        ]
        
        messages.insert(0, {
            "role": "system",
            "content": """
            You are a virtual health assistant named Dr. CareEase, specializing in disability-related questions. 
            Provide helpful, empathetic, and informative responses based on general medical knowledge. 
            Do not provide a diagnosis, prescribe medication, or offer specific treatment plans.
            Always include a clear disclaimer at the end of your response, such as 'This information is for educational purposes only and is not a substitute for professional medical advice. Always consult a qualified healthcare provider for personalized medical decisions.'
            """
        })
        
        messages.append({"role": "user", "content": question})

        chat_completion = groq_client.chat.completions.create(
            messages=messages,
            model=GROQ_MODEL,
        )
        
        response_text = chat_completion.choices[0].message.content
        return jsonify({"answer": response_text})

    except Exception as e:
        print(f"Error calling Groq API: {e}")
        return jsonify({"error": "Internal server error"}), 500

# --- ELEVEN LABS TTS ENDPOINT ---
@app.route("/speak", methods=["POST"])
def speak():
    # ... (Your existing speak function code) ...
    try:
        text = request.json.get("text")
        if not text:
            return jsonify({"error": "No text provided"}), 400

        # Check if ELEVEN_API_KEY is available
        if not ELEVEN_API_KEY or ELEVEN_API_KEY == "your_elevenlabs_api_key_here":
            print("ElevenLabs API key is not configured. Falling back to text response.")
            return jsonify({"message": "TTS not available. Using browser speech."}), 200

        headers = {
            "xi-api-key": ELEVEN_API_KEY,
            "Content-Type": "application/json"
        }

        payload = {
            "text": text,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }
        tts_url = f"https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL"

        response = requests.post(tts_url, headers=headers, json=payload)

        if response.status_code == 200:
            audio_path = os.path.join(app.config['UPLOAD_FOLDER'], "speech.mp3")
            with open(audio_path, "wb") as f:
                f.write(response.content)
            return send_file(audio_path, mimetype="audio/mpeg")
        else:
            print(f"ElevenLabs TTS failed with status code {response.status_code}: {response.text}")
            return jsonify({"error": "TTS failed"}), 500
    
    except Exception as e:
        print(f"An unexpected error occurred in the speak route: {e}")
        return jsonify({"error": "Internal server error"}), 500

# Wrap the Flask app with the WSGI to ASGI adapter
asgi_app = WsgiToAsgi(app)

if __name__ == "__main__":
    # You are running uvicorn, so you don't need app.run() here.
    # Uvicorn will handle running the server.
    pass