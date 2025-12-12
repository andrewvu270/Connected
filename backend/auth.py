from __future__ import annotations

import os
from dataclasses import dataclass

import httpx
from fastapi import Header, HTTPException


@dataclass
class AuthenticatedUser:
  id: str
  email: str | None
  access_token: str


def _get_supabase_auth_base_url() -> str:
  url = os.getenv("SUPABASE_URL")
  if not url:
    raise HTTPException(status_code=500, detail="SUPABASE_URL not configured")
  return url.rstrip("/")


def _get_supabase_anon_key() -> str:
  key = os.getenv("SUPABASE_ANON_KEY")
  if not key:
    raise HTTPException(status_code=500, detail="SUPABASE_ANON_KEY not configured")
  return key


def _extract_bearer_token(authorization: str | None) -> str:
  if not authorization:
    raise HTTPException(status_code=401, detail="Missing Authorization header")
  parts = authorization.split(" ", 1)
  if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
    raise HTTPException(status_code=401, detail="Invalid Authorization header")
  return parts[1].strip()


def get_current_user(authorization: str | None = Header(default=None)) -> AuthenticatedUser:
  token = _extract_bearer_token(authorization)

  base = _get_supabase_auth_base_url()
  anon_key = _get_supabase_anon_key()

  # Verify token via Supabase Auth API
  with httpx.Client(timeout=15) as client:
    resp = client.get(
      f"{base}/auth/v1/user",
      headers={
        "Authorization": f"Bearer {token}",
        "apikey": anon_key,
      },
    )

  if resp.status_code != 200:
    raise HTTPException(status_code=401, detail="Invalid or expired token")

  data = resp.json()
  user_id = data.get("id")
  if not user_id:
    raise HTTPException(status_code=401, detail="Invalid token payload")

  return AuthenticatedUser(id=user_id, email=data.get("email"), access_token=token)
