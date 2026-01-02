"""
API Gateway - Single entry point for all services
"""
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import httpx
import os
from typing import Optional
import sys
from pathlib import Path

# Add parent directory to path to import shared modules
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from shared.utils.jwt_handler import verify_token

app = FastAPI(
    title="API Gateway",
    description="API Gateway for Hotel Management System",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (CSS, JS, images, etc.)
# Frontend files are copied to /app/frontend in Dockerfile
# Try multiple paths: first check if frontend is in same directory, then check parent
FRONTEND_DIR = None
possible_paths = [
    Path(__file__).parent / "frontend",  # services/api-gateway/frontend
    Path(__file__).parent.parent.parent / "frontend",  # root/frontend
    Path("/app/frontend")  # Docker container path
]

for path in possible_paths:
    if path.exists() and (path / "index.html").exists():
        FRONTEND_DIR = path
        break

if FRONTEND_DIR and FRONTEND_DIR.exists():
    # Mount static assets (CSS, JS)
    css_dir = FRONTEND_DIR / "css"
    js_dir = FRONTEND_DIR / "js"
    if css_dir.exists():
        app.mount("/css", StaticFiles(directory=str(css_dir)), name="css")
    if js_dir.exists():
        app.mount("/js", StaticFiles(directory=str(js_dir)), name="js")

# Service URLs
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8000")
CUSTOMER_SERVICE_URL = os.getenv("CUSTOMER_SERVICE_URL", "http://customer-service:8000")
ROOM_SERVICE_URL = os.getenv("ROOM_SERVICE_URL", "http://room-service:8000")
BOOKING_SERVICE_URL = os.getenv("BOOKING_SERVICE_URL", "http://booking-service:8000")
PAYMENT_SERVICE_URL = os.getenv("PAYMENT_SERVICE_URL", "http://payment-service:8000")
REPORT_SERVICE_URL = os.getenv("REPORT_SERVICE_URL", "http://report-service:8000")

# Service routing map
SERVICE_ROUTES = {
    "/auth": AUTH_SERVICE_URL,
    "/customers": CUSTOMER_SERVICE_URL,
    "/rooms": ROOM_SERVICE_URL,
    "/bookings": BOOKING_SERVICE_URL,
    "/payments": PAYMENT_SERVICE_URL,
    "/reports": REPORT_SERVICE_URL,
}


async def proxy_request(
    service_url: str,
    path: str,
    method: str,
    request: Request,
    headers: Optional[dict] = None
):
    """Proxy request to backend service"""
    try:
        # Get request body if exists
        body = None
        if method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.json()
            except:
                body = await request.body()
        
        # Prepare headers
        forward_headers = {}
        if headers:
            forward_headers.update(headers)
        
        # Forward authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header:
            forward_headers["Authorization"] = auth_header
        
        # Forward other important headers
        for header_name in ["Content-Type", "Accept"]:
            header_value = request.headers.get(header_name)
            if header_value:
                forward_headers[header_name] = header_value
        
        # Make request to backend service
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{service_url.rstrip('/')}/{path.lstrip('/')}"
            
            if method == "GET":
                response = await client.get(url, headers=forward_headers, params=request.query_params)
            elif method == "POST":
                response = await client.post(url, json=body, headers=forward_headers, params=request.query_params)
            elif method == "PUT":
                response = await client.put(url, json=body, headers=forward_headers, params=request.query_params)
            elif method == "PATCH":
                response = await client.patch(url, json=body, headers=forward_headers, params=request.query_params)
            elif method == "DELETE":
                response = await client.delete(url, headers=forward_headers, params=request.query_params)
            else:
                raise HTTPException(status_code=405, detail=f"Method {method} not allowed")
            
            # Return response
            try:
                return JSONResponse(
                    content=response.json(),
                    status_code=response.status_code,
                    headers=dict(response.headers)
                )
            except:
                return JSONResponse(
                    content={"detail": response.text},
                    status_code=response.status_code
                )
    
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Gateway timeout - Service did not respond in time"
        )
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Service unavailable - Cannot connect to backend service"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gateway error: {str(e)}"
        )


def get_service_url(path: str) -> Optional[tuple]:
    """Determine which service to route to based on path
    Returns: (service_url, stripped_path) or None
    """
    for route_prefix, service_url in SERVICE_ROUTES.items():
        if path.startswith(route_prefix):
            # Strip the prefix from path when forwarding to service
            stripped_path = path[len(route_prefix):].lstrip('/')
            return (service_url, stripped_path)
    return None


@app.get("/health")
async def health_check():
    """Gateway health check"""
    return {
        "status": "healthy",
        "service": "api-gateway",
        "routes": list(SERVICE_ROUTES.keys())
    }


@app.get("/")
async def root(request: Request):
    """
    API Gateway root - Serve index.html hoặc redirect đến user.html
    """
    # Serve index.html nếu có, nếu không thì serve user.html
    if FRONTEND_DIR:
        index_path = FRONTEND_DIR / "index.html"
        if index_path.exists():
            return FileResponse(str(index_path))
        user_path = FRONTEND_DIR / "user.html"
        if user_path.exists():
            return FileResponse(str(user_path))
    
    # Fallback: redirect HTML
    return HTMLResponse(content="""
    <!DOCTYPE html>
    <html>
    <head>
        <meta http-equiv="refresh" content="0; url=/user.html#login">
        <script>window.location.href = '/user.html#login';</script>
    </head>
    <body>
        <p>Redirecting... <a href="/user.html#login">Click here</a></p>
    </body>
    </html>
    """, status_code=200)


@app.get("/redirect")
async def redirect_endpoint(request: Request):
    """
    Endpoint để kiểm tra authentication và trả về redirect URL
    Sử dụng cho frontend để biết nên redirect đến đâu
    """
    auth_header = request.headers.get("Authorization", "")
    token = None
    
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    else:
        token = request.query_params.get("token")
    
    if not token:
        return JSONResponse(
            content={
                "redirect": "login",
                "url": "/user.html#login"
            },
            status_code=200
        )
    
    try:
        payload = verify_token(token)
        if not payload:
            return JSONResponse(
                content={
                    "redirect": "login",
                    "url": "/user.html#login"
                },
                status_code=200
            )
        
        roles = payload.get("roles", [])
        is_admin = any(role in roles for role in ["admin", "manager", "receptionist"])
        
        if is_admin:
            return JSONResponse(
                content={
                    "redirect": "admin",
                    "url": "/admin.html#dashboard",
                    "roles": roles
                },
                status_code=200
            )
        else:
            return JSONResponse(
                content={
                    "redirect": "user",
                    "url": "/user.html#home",
                    "roles": roles
                },
                status_code=200
            )
            
    except Exception as e:
        return JSONResponse(
            content={
                "redirect": "login",
                "url": "/user.html#login",
                "error": str(e)
            },
            status_code=200
        )


# Serve frontend HTML files
@app.get("/index.html")
async def serve_index():
    """Serve index.html"""
    if not FRONTEND_DIR:
        raise HTTPException(status_code=404, detail="Frontend directory not found")
    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    raise HTTPException(status_code=404, detail="index.html not found")

@app.get("/user.html")
async def serve_user():
    """Serve user.html"""
    if not FRONTEND_DIR:
        raise HTTPException(status_code=404, detail="Frontend directory not found")
    user_path = FRONTEND_DIR / "user.html"
    if user_path.exists():
        return FileResponse(str(user_path))
    raise HTTPException(status_code=404, detail="user.html not found")

@app.get("/admin.html")
async def serve_admin():
    """Serve admin.html"""
    if not FRONTEND_DIR:
        raise HTTPException(status_code=404, detail="Frontend directory not found")
    admin_path = FRONTEND_DIR / "admin.html"
    if admin_path.exists():
        return FileResponse(str(admin_path))
    raise HTTPException(status_code=404, detail="admin.html not found")

# Catch-all route for proxying API requests
@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def gateway_proxy(path: str, request: Request):
    """Proxy API requests to appropriate backend service or serve static files"""
    # Skip static file paths that are already mounted
    if path.startswith(("css/", "js/")):
        raise HTTPException(status_code=404, detail=f"Static file not found: {path}")
    
    # Skip HTML files that are already handled by specific routes
    if path in ["index.html", "user.html", "admin.html", ""]:
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    
    # For GET requests, check if it's a static file in frontend directory
    if request.method == "GET" and FRONTEND_DIR:
        static_file_path = FRONTEND_DIR / path
        if static_file_path.exists() and static_file_path.is_file():
            return FileResponse(str(static_file_path))
    
    # Check if this is an API route (starts with known service prefixes)
    result = get_service_url(f"/{path}")
    
    if result:
        # This is an API request, proxy to backend service
        service_url, stripped_path = result
        return await proxy_request(
            service_url=service_url,
            path=stripped_path,
            method=request.method,
            request=request
        )
    
    # Not an API route and not a static file - 404
    raise HTTPException(
        status_code=404,
        detail=f"Resource not found: /{path}"
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

