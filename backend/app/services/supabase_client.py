from supabase import create_client
from app.config import SUPABASE_URL, SUPABASE_ANON_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


def get_supabase_client():
    """Return the supabase client instance for dependency injection."""
    return supabase