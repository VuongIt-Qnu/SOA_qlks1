"""
JWT Handler - Shared utility for JWT token operations
Using python-jose library (compatible with FastAPI)
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from jose import jwt
from jose.exceptions import JWTError, ExpiredSignatureError

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
)  # Default 24 hours (1440 minutes)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT access token

    Args:
        data: Data to encode in token
        expires_delta: Optional expiration time delta

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()

    # Use timezone-aware datetime (UTC) to avoid issues with naive datetime
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify and decode JWT token

    Args:
        token: JWT token string

    Returns:
        Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload

    except ExpiredSignatureError:
        print("[JWT] Token expired")
        return None

    except JWTError as e:
        # Covers: invalid signature, malformed token, wrong algorithm, etc.
        print(f"[JWT] Token verification failed: {str(e)}")
        return None

    except Exception as e:
        print(f"[JWT] Unexpected error verifying token: {str(e)}")
        return None


def get_user_id_from_token(token: str) -> Optional[int]:
    """
    Extract user ID from JWT token

    Args:
        token: JWT token string

    Returns:
        User ID or None if invalid
    """
    payload = verify_token(token)
    if not payload:
        return None

    sub = payload.get("sub")
    if sub is None:
        return None

    try:
        return int(sub) if isinstance(sub, str) else int(sub)
    except (ValueError, TypeError):
        return None
