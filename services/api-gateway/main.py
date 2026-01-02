"""
API Gateway - Single entry point for all services
"""
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import os
from typing import Optional

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


def get_service_url(path: str) -> Optional[str]:
    """Determine which service to route to based on path"""
    for route_prefix, service_url in SERVICE_ROUTES.items():
        if path.startswith(route_prefix):
            return service_url
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
async def root():
    """API Gateway root"""
    return {
        "message": "API Gateway for Hotel Management System",
        "version": "1.0.0",
        "services": {
            "auth": "/auth",
            "customers": "/customers",
            "rooms": "/rooms",
            "bookings": "/bookings",
            "payments": "/payments",
            "reports": "/reports"
        },
        "docs": "/docs"
    }


# Catch-all route for proxying
@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def gateway_proxy(path: str, request: Request):
    """Proxy all requests to appropriate backend service"""
    service_url = get_service_url(f"/{path}")
    
    if not service_url:
        raise HTTPException(
            status_code=404,
            detail=f"No service found for path: /{path}"
        )
    
    return await proxy_request(
        service_url=service_url,
        path=path,
        method=request.method,
        request=request
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

