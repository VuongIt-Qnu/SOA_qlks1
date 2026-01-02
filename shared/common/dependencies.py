"""
FastAPI Dependencies - Shared dependencies for JWT authentication
"""
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from shared.utils.jwt_handler import verify_token

security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependency to get current authenticated user from JWT token
    
    Usage:
        @app.get("/protected")
        async def protected_route(current_user: dict = Depends(get_current_user)):
            return current_user
    """
    token = credentials.credentials
    payload = verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Store token in payload for inter-service calls
    payload["token"] = token
    return payload


def require_role(required_role: str):
    """
    Dependency factory to require a specific role
    
    Usage:
        @app.get("/admin-only")
        async def admin_route(current_user: dict = Depends(require_role("admin"))):
            return {"message": "Admin access granted"}
    """
    async def role_checker(credentials: HTTPAuthorizationCredentials = Depends(security)):
        token = credentials.credentials
        payload = verify_token(token)
        
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_roles = payload.get("roles", [])
        if required_role not in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {required_role}"
            )
        
        payload["token"] = token
        return payload
    
    return role_checker


async def get_token(request: Request) -> str:
    """
    Extract JWT token from request header for inter-service communication
    
    Usage:
        token = await get_token(request)
    """
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing"
        )
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format"
        )
    
    return authorization.split(" ")[1]
