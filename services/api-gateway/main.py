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
    # Check if path exists and has either index.html at root or html/index.html
    if path.exists():
        if (path / "index.html").exists() or (path / "html" / "index.html").exists():
            FRONTEND_DIR = path
            print(f"[API Gateway] ✅ Found FRONTEND_DIR: {FRONTEND_DIR}")
            break
        else:
            print(f"[API Gateway] ⚠️ Path exists but no index.html: {path}")
    else:
        print(f"[API Gateway] ⚠️ Path does not exist: {path}")

if FRONTEND_DIR and FRONTEND_DIR.exists():
    # Mount static assets (CSS, JS)
    # IMPORTANT: Mount routes must be registered BEFORE catch-all routes
    css_dir = FRONTEND_DIR / "css"
    js_dir = FRONTEND_DIR / "js"
    if css_dir.exists():
        css_files = list(css_dir.glob("*.css"))
        print(f"[API Gateway] ✅ Mounting CSS directory: {css_dir}")
        print(f"[API Gateway] ✅ CSS files found: {[f.name for f in css_files]}")
        app.mount("/css", StaticFiles(directory=str(css_dir)), name="css")
    else:
        print(f"[API Gateway] ❌ WARNING: CSS directory not found: {css_dir}")
    if js_dir.exists():
        print(f"[API Gateway] ✅ Mounting JS directory: {js_dir}")
        app.mount("/js", StaticFiles(directory=str(js_dir)), name="js")
    else:
        print(f"[API Gateway] ❌ WARNING: JS directory not found: {js_dir}")
else:
    print(f"[API Gateway] ❌ WARNING: FRONTEND_DIR not found or invalid")
    print(f"[API Gateway] Tried paths: {possible_paths}")

# Service URLs
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8000")
CUSTOMER_SERVICE_URL = os.getenv("CUSTOMER_SERVICE_URL", "http://customer-service:8000")
ROOM_SERVICE_URL = os.getenv("ROOM_SERVICE_URL", "http://room-service:8000")
BOOKING_SERVICE_URL = os.getenv("BOOKING_SERVICE_URL", "http://booking-service:8000")
PAYMENT_SERVICE_URL = os.getenv("PAYMENT_SERVICE_URL", "http://payment-service:8000")
REPORT_SERVICE_URL = os.getenv("REPORT_SERVICE_URL", "http://report-service:8000")
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8000")

# Service routing map - Map API paths to service URLs
SERVICE_ROUTES = {
    "/api/auth": AUTH_SERVICE_URL,
    "/api/users": AUTH_SERVICE_URL,  # User management routes to auth service
    "/api/customers": CUSTOMER_SERVICE_URL,
    "/api/rooms": ROOM_SERVICE_URL,
    "/api/bookings": BOOKING_SERVICE_URL,
    "/api/payments": PAYMENT_SERVICE_URL,
    "/api/reports": REPORT_SERVICE_URL,
    "/api/notify": NOTIFICATION_SERVICE_URL,  # Notification service
    # Legacy routes without /api prefix (for backward compatibility)
    "/auth": AUTH_SERVICE_URL,
    "/users": AUTH_SERVICE_URL,
    "/customers": CUSTOMER_SERVICE_URL,
    "/rooms": ROOM_SERVICE_URL,
    "/bookings": BOOKING_SERVICE_URL,
    "/payments": PAYMENT_SERVICE_URL,
    "/reports": REPORT_SERVICE_URL,
    "/notify": NOTIFICATION_SERVICE_URL,
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
    
    Examples:
    - /api/users/1 -> (AUTH_SERVICE_URL, "users/1")
    - /api/users -> (AUTH_SERVICE_URL, "users")
    - /api/auth/login -> (AUTH_SERVICE_URL, "login")
    - /api/rooms/1 -> (ROOM_SERVICE_URL, "rooms/1")
    """
    # Sort by length (longest first) to match /api/auth before /api
    sorted_routes = sorted(SERVICE_ROUTES.items(), key=lambda x: len(x[0]), reverse=True)
    
    for route_prefix, service_url in sorted_routes:
        if path.startswith(route_prefix):
            # Strip the prefix from path when forwarding to service
            stripped_path = path[len(route_prefix):].lstrip('/')
            
            # Special handling for /api/users -> forward to /users in auth service
            if route_prefix == "/api/users":
                # Forward to /users/{id} in auth service
                if stripped_path:
                    stripped_path = f"users/{stripped_path}"
                else:
                    stripped_path = "users"
            # For /api/auth, just forward the path after /api/auth (e.g., login -> /login)
            # Auth service already has routes like /login, /register, etc.
            elif route_prefix == "/api/auth":
                # Forward directly (e.g., /api/auth/login -> /login)
                # No need to add "auth/" prefix
                pass
            # For other /api/* routes, add service name prefix
            elif route_prefix.startswith("/api/"):
                # Extract service name from prefix (e.g., /api/rooms -> rooms)
                service_name = route_prefix[5:]  # Remove "/api/"
                if stripped_path:
                    stripped_path = f"{service_name}/{stripped_path}"
                else:
                    stripped_path = service_name
            
            return (service_url, stripped_path)
    return None


def extract_token_from_request(request: Request) -> Optional[str]:
    """Extract JWT token from request headers"""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


def verify_jwt_auth(request: Request) -> dict:
    """Verify JWT token from request and return payload
    Raises HTTPException if token is invalid or missing
    """
    token = extract_token_from_request(request)
    
    if not token:
        print("[API Gateway] JWT verification failed: No token provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token. Please provide Authorization: Bearer <token>"
        )
    
    # Debug: Log token preview
    print(f"[API Gateway] Verifying JWT token: {token[:30]}...")
    
    payload = verify_token(token)
    if not payload:
        print(f"[API Gateway] JWT verification failed: Invalid or expired token")
        print(f"[API Gateway] Token preview: {token[:50]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    print(f"[API Gateway] JWT verified successfully. User ID: {payload.get('sub')}, Roles: {payload.get('roles')}")
    return payload


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
    API Gateway root - Entry point: Always redirect to login.html
    Since we can't check client-side localStorage from server,
    we always redirect to login.html and let the frontend handle auth checks
    """
    # Always redirect to login page - let frontend handle authentication checks
    return RedirectResponse(url="/login.html", status_code=302)


@app.get("/redirect")
async def redirect_endpoint(request: Request):
    """
    Endpoint để kiểm tra authentication và trả về redirect URL
    Sử dụng cho frontend để biết nên redirect đến đâu
    """
    auth_header = request.headers.get("Authorization", "")
    token = None
    
    # Try to get token from Authorization header
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    else:
        # Try query parameter
        token = request.query_params.get("token")
    
    # If no token in header or query, try to get from cookie (if available)
    if not token:
        token = request.cookies.get("auth_token")
    
    if not token:
        return JSONResponse(
            content={
                "redirect": "login",
                "url": "/login.html",
                "message": "No token provided"
            },
            status_code=200
        )
    
    try:
        # Verify token
        payload = verify_token(token)
        if not payload:
            return JSONResponse(
                content={
                    "redirect": "login",
                    "url": "/login.html",
                    "message": "Invalid token"
                },
                status_code=200
            )
        
        # Extract roles from payload - JWT token stores roles as list of strings
        roles_raw = payload.get("roles", [])
        
        # Normalize roles to list of strings
        roles = []
        if roles_raw:
            if isinstance(roles_raw, list):
                # Handle both ["admin"] and [{"name": "admin"}] formats
                for role in roles_raw:
                    if isinstance(role, str):
                        roles.append(role.lower().strip())  # Normalize to lowercase
                    elif isinstance(role, dict) and "name" in role:
                        roles.append(str(role["name"]).lower().strip())
            elif isinstance(roles_raw, str):
                # Single role as string
                roles = [roles_raw.lower().strip()]
        
        # Debug logging
        print(f"[Redirect Endpoint] Token verified. roles_raw: {roles_raw}, normalized roles: {roles}")
        
        # Check if user has admin role (case-insensitive)
        admin_roles = ["admin", "manager", "receptionist"]
        is_admin = any(role.lower() in admin_roles for role in roles)
        
        print(f"[Redirect Endpoint] is_admin: {is_admin}, roles: {roles}")
        
        if is_admin:
            redirect_url = "/admin/admin.html#dashboard"
            print(f"[Redirect Endpoint] Redirecting admin to: {redirect_url}")
            return JSONResponse(
                content={
                    "redirect": "admin",
                    "url": redirect_url,
                    "roles": roles,
                    "is_admin": True,
                    "message": "Admin user detected"
                },
                status_code=200
            )
        else:
            redirect_url = "/user/user.html#home"
            print(f"[Redirect Endpoint] Redirecting user to: {redirect_url}")
            return JSONResponse(
                content={
                    "redirect": "user",
                    "url": redirect_url,
                    "roles": roles,
                    "is_admin": False,
                    "message": "Regular user detected"
                },
                status_code=200
            )
            
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[Redirect Endpoint] Error: {str(e)}")
        print(f"[Redirect Endpoint] Traceback: {error_trace}")
        return JSONResponse(
                content={
                    "redirect": "login",
                    "url": "/login.html",
                    "error": str(e),
                    "traceback": error_trace,
                    "message": "Error processing redirect"
                },
                status_code=200
            )


# Serve frontend HTML files
@app.get("/index.html")
async def serve_index():
    """Serve index.html - Entry point từ html/index.html"""
    if not FRONTEND_DIR:
        raise HTTPException(status_code=500, detail="Frontend directory not found")
    
    # Entry point: html/index.html (theo cấu trúc dự án)
    index_paths = [
        FRONTEND_DIR / "html" / "index.html",  # Ưu tiên: html/index.html
        FRONTEND_DIR / "index.html"  # Fallback: root/index.html
    ]
    
    for index_path in index_paths:
        if index_path.exists():
            return FileResponse(str(index_path))
    
    raise HTTPException(status_code=404, detail="index.html not found")


@app.get("/user.html")
async def serve_user():
    if not FRONTEND_DIR:
        raise HTTPException(status_code=500, detail="Frontend not configured")

    user_html = FRONTEND_DIR / "user.html"
    if user_html.exists():
        return FileResponse(str(user_html))

    # fallback
    html_user = FRONTEND_DIR / "html" / "user" / "user.html"
    if html_user.exists():
        return FileResponse(str(html_user))

    raise HTTPException(status_code=404, detail="user.html not found")


@app.get("/login.html")
async def serve_login():
    if not FRONTEND_DIR:
        raise HTTPException(status_code=500, detail="Frontend not configured")

    # Try direct path then html/login.html
    login_html = FRONTEND_DIR / "login.html"
    if login_html.exists():
        return FileResponse(str(login_html))

    html_login = FRONTEND_DIR / "html" / "login.html"
    if html_login.exists():
        return FileResponse(str(html_login))

    raise HTTPException(status_code=404, detail="login.html not found")


@app.get("/register.html")
async def serve_register():
    if not FRONTEND_DIR:
        raise HTTPException(status_code=500, detail="Frontend not configured")

    # Try direct path then html/register.html
    register_html = FRONTEND_DIR / "register.html"
    if register_html.exists():
        return FileResponse(str(register_html))

    html_register = FRONTEND_DIR / "html" / "register.html"
    if html_register.exists():
        return FileResponse(str(html_register))

    raise HTTPException(status_code=404, detail="register.html not found")

@app.get("/admin.html")
async def serve_admin():
    if not FRONTEND_DIR:
        raise HTTPException(status_code=500, detail="Frontend not configured")

    user_html = FRONTEND_DIR / "admin.html"
    if user_html.exists():
        return FileResponse(str(user_html))

    # fallback
    html_user = FRONTEND_DIR / "html" / "admin" / "admin.html"
    if html_user.exists():
        return FileResponse(str(html_user))

    raise HTTPException(status_code=404, detail="admin.html not found")


@app.get("/admin/admin.html")
async def serve_admin_subfolder():
    if not FRONTEND_DIR:
        raise HTTPException(status_code=500, detail="Frontend not configured")

    # Try html/admin/admin.html first
    html_admin = FRONTEND_DIR / "html" / "admin" / "admin.html"
    if html_admin.exists():
        return FileResponse(str(html_admin))

    # fallback to root admin.html
    admin_html = FRONTEND_DIR / "admin.html"
    if admin_html.exists():
        return FileResponse(str(admin_html))

    raise HTTPException(status_code=404, detail="admin/admin.html not found")


# Serve admin HTML pages
@app.get("/admin/dashboard.html")
async def serve_admin_dashboard():
    if not FRONTEND_DIR:
        raise HTTPException(status_code=500, detail="Frontend not configured")
    dashboard_html = FRONTEND_DIR / "html" / "admin" / "dashboard.html"
    if dashboard_html.exists():
        return FileResponse(str(dashboard_html))
    raise HTTPException(status_code=404, detail="admin/dashboard.html not found")


@app.get("/admin/rooms.html")
async def serve_admin_rooms():
    if not FRONTEND_DIR:
        raise HTTPException(status_code=500, detail="Frontend not configured")
    rooms_html = FRONTEND_DIR / "html" / "admin" / "rooms.html"
    if rooms_html.exists():
        return FileResponse(str(rooms_html))
    raise HTTPException(status_code=404, detail="admin/rooms.html not found")


@app.get("/admin/customers.html")
async def serve_admin_customers():
    if not FRONTEND_DIR:
        raise HTTPException(status_code=500, detail="Frontend not configured")
    customers_html = FRONTEND_DIR / "html" / "admin" / "customers.html"
    if customers_html.exists():
        return FileResponse(str(customers_html))
    raise HTTPException(status_code=404, detail="admin/customers.html not found")


@app.get("/admin/bookings.html")
async def serve_admin_bookings():
    if not FRONTEND_DIR:
        raise HTTPException(status_code=500, detail="Frontend not configured")
    bookings_html = FRONTEND_DIR / "html" / "admin" / "bookings.html"
    if bookings_html.exists():
        return FileResponse(str(bookings_html))
    raise HTTPException(status_code=404, detail="admin/bookings.html not found")


@app.get("/admin/revenue.html")
async def serve_admin_revenue():
    if not FRONTEND_DIR:
        raise HTTPException(status_code=500, detail="Frontend not configured")
    revenue_html = FRONTEND_DIR / "html" / "admin" / "revenue.html"
    if revenue_html.exists():
        return FileResponse(str(revenue_html))
    raise HTTPException(status_code=404, detail="admin/revenue.html not found")


@app.get("/user/user.html")
async def serve_user_subfolder():
    if not FRONTEND_DIR:
        raise HTTPException(status_code=500, detail="Frontend not configured")

    # Try html/user/user.html first
    html_user = FRONTEND_DIR / "html" / "user" / "user.html"
    if html_user.exists():
        return FileResponse(str(html_user))

    # fallback to root user.html
    user_html = FRONTEND_DIR / "user.html"
    if user_html.exists():
        return FileResponse(str(user_html))

    raise HTTPException(status_code=404, detail="user/user.html not found")


# API routes with /api prefix - Main entry point for all API requests
@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def api_gateway_proxy(path: str, request: Request):
    """
    API Gateway proxy for /api/* routes
    - Xác thực JWT cho tất cả routes (trừ /api/auth/login)
    - Forward request tới service tương ứng
    """
    full_path = f"/api/{path}"
    
    # Check if this is a public endpoint - skip JWT auth
    # Public endpoints: 
    # - /api/auth/login, /api/auth/register (authentication)
    # - GET /api/rooms, GET /api/rooms/{id} (public room listing)
    is_public_endpoint = (
        # Auth endpoints
        path == "auth/login" or 
        path.startswith("auth/login/") or
        path == "auth/register" or
        path.startswith("auth/register/") or
        (path == "auth" and request.method == "POST") or
        # Public room endpoints (GET only)
        (request.method == "GET" and (path == "rooms" or path.startswith("rooms/"))) or
        # Notification endpoints (can be called internally by other services)
        path.startswith("notify/")
    )
    
    # Verify JWT token for all routes except public endpoints
    # Protected endpoints: /api/auth/me, /api/auth/logout, POST/PUT/DELETE /api/rooms, and all other /api/* routes
    if not is_public_endpoint:
        try:
            payload = verify_jwt_auth(request)
            # Token is valid, continue with request
        except HTTPException:
            # Re-raise HTTPException from verify_jwt_auth
            raise
    
    # Find the service to route to
    result = get_service_url(full_path)
    
    if result:
        service_url, stripped_path = result
        return await proxy_request(
            service_url=service_url,
            path=stripped_path,
            method=request.method,
            request=request
        )
    
    # API route not found
    raise HTTPException(
        status_code=404,
        detail=f"API endpoint not found: /{full_path}"
    )


# Catch-all route for proxying API requests (legacy support and static files)
@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def gateway_proxy(path: str, request: Request):
    """Proxy API requests to appropriate backend service or serve static files"""
    # Skip static file paths that are already mounted - let StaticFiles handle them
    # FastAPI mount routes have higher priority, but we add this check as safety
    if path.startswith(("css/", "js/")):
        # These should be handled by StaticFiles mount, but if we reach here, return 404
        raise HTTPException(status_code=404, detail=f"Static file not found: {path}")
    
    # Skip HTML files that are already handled by specific routes
    handled_paths = ["index.html", "user.html", "admin.html", "login.html", "register.html", "user/user.html", "admin/admin.html", ""]
    if path in handled_paths:
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    
    # Skip /api/* paths - they are handled by api_gateway_proxy
    if path.startswith("api/"):
        raise HTTPException(status_code=404, detail=f"API route should use /api/{path}")
    
    # For GET requests, check if it's a static file in frontend directory
    if request.method == "GET" and FRONTEND_DIR:
        static_file_path = FRONTEND_DIR / path
        if static_file_path.exists() and static_file_path.is_file():
            return FileResponse(str(static_file_path))
    
    # Check if this is a legacy API route (without /api prefix)
    result = get_service_url(f"/{path}")
    
    if result:
        # This is an API request, proxy to backend service
        # Note: Legacy routes should migrate to /api/* prefix
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

