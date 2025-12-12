import os

from supabase import Client, ClientOptions, create_client


def get_supabase_admin_client() -> Client:
  url = os.getenv("SUPABASE_URL")
  key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

  if not url:
    raise RuntimeError("Missing SUPABASE_URL")
  if not key:
    raise RuntimeError("Missing SUPABASE_SERVICE_ROLE_KEY")

  return create_client(url, key)


def get_supabase_user_client(access_token: str) -> Client:
  url = os.getenv("SUPABASE_URL")
  anon_key = os.getenv("SUPABASE_ANON_KEY")

  if not url:
    raise RuntimeError("Missing SUPABASE_URL")
  if not anon_key:
    raise RuntimeError("Missing SUPABASE_ANON_KEY")
  if not access_token:
    raise RuntimeError("Missing access token")

  # Note: anon key + user JWT enables RLS enforcement with auth.uid().
  return create_client(
    url,
    anon_key,
    options=ClientOptions(
      headers={
        "Authorization": f"Bearer {access_token}",
      }
    ),
  )
