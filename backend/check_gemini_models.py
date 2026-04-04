import os
import sys
sys.path.append('.')

from app.services.ai_service import google_genai
from app.config import GEMINI_API_KEY

def list_available_models():
    try:
        client = google_genai.Client(api_key=os.getenv('GEMINI_API_KEY') or GEMINI_API_KEY)
        models = client.models.list()
        print("Available Gemini models:")
        for model in models:
            print(f"  - {model.name}")
    except Exception as e:
        print(f"Error listing models: {e}")

if __name__ == "__main__":
    list_available_models()
