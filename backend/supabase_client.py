import os

from supabase import Client, ClientOptions, create_client


def get_supabase_admin_client() -> Client:
  url = os.getenv("SUPABASE_URL")
  key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

  if not url:
    raise RuntimeError("Missing SUPABASE_URL")
  if not key:
    raise RuntimeError("Missing SUPABASE_SERVICE_ROLE_KEY")

  try:
    return create_client(url, key)
  except Exception as e:
    raise RuntimeError(f"Failed to init Supabase admin client: {e}")


def get_supabase_user_client(access_token: str) -> Client:
  url = os.getenv("SUPABASE_URL")
  anon_key = os.getenv("SUPABASE_ANON_KEY")
  service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

  if not url:
    raise RuntimeError("Missing SUPABASE_URL")
  if not anon_key:
    raise RuntimeError("Missing SUPABASE_ANON_KEY")
  if not access_token:
    raise RuntimeError("Missing access token")

  api_key = anon_key
  if anon_key.startswith("sb_"):
    if not service_role_key:
      raise RuntimeError(
        "SUPABASE_ANON_KEY appears to be a publishable key (sb_*). "
        "The Python supabase client requires a JWT API key; set SUPABASE_SERVICE_ROLE_KEY or use a legacy anon key."
      )
    api_key = service_role_key

  # Note: anon key + user JWT enables RLS enforcement with auth.uid().
  try:
    return create_client(
      url,
      api_key,
      options=ClientOptions(
        headers={
          "Authorization": f"Bearer {access_token}",
        }
      ),
    )
  except Exception as e:
    raise RuntimeError(f"Failed to init Supabase user client: {e}")
