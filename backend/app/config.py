import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory (works regardless of cwd)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

SUPABASE_URL       = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY  = os.getenv("SUPABASE_ANON_KEY")
OPENROUTER_API_KEY     = (os.getenv("OPENROUTER_API_KEY") or "").strip()
GEMINI_API_KEY         = (os.getenv("GEMINI_API_KEY") or "").strip()
OPENROUTER_CHATBOT_KEY = os.getenv("OPENROUTER_CHATBOT_KEY", "")
OPENROUTER_GUIDE_KEY   = os.getenv("OPENROUTER_GUIDE_KEY", "")