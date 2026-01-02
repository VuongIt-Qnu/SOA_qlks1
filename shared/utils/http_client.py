"""
HTTP Client - Utility for inter-service communication
"""
import httpx
from typing import Optional, Dict, Any
import os


async def call_service(
    service_url: str,
    endpoint: str,
    method: str = "GET",
    data: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
    timeout: int = 30
) -> Dict[str, Any]:
    """
    Make HTTP request to another service
    
    Args:
        service_url: Base URL of the target service
        endpoint: API endpoint path
        method: HTTP method (GET, POST, PUT, DELETE)
        data: Request body data
        headers: Additional headers
        timeout: Request timeout in seconds
    
    Returns:
        Response data as dictionary
    
    Raises:
        httpx.HTTPError: If request fails
    """
    url = f"{service_url.rstrip('/')}/{endpoint.lstrip('/')}"
    
    async with httpx.AsyncClient(timeout=timeout) as client:
        if method.upper() == "GET":
            response = await client.get(url, headers=headers)
        elif method.upper() == "POST":
            response = await client.post(url, json=data, headers=headers)
        elif method.upper() == "PUT":
            response = await client.put(url, json=data, headers=headers)
        elif method.upper() == "DELETE":
            response = await client.delete(url, headers=headers)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
        
        response.raise_for_status()
        return response.json()

