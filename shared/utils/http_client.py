"""
HTTP Client - Utility for inter-service communication
"""
import httpx
from typing import Optional, Dict, Any


class ServiceHTTPError(Exception):
    def __init__(self, status_code: int, message: str, url: str = ""):
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.url = url


async def call_service(
    service_url: str,
    endpoint: str,
    method: str = "GET",
    data: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
    params: Optional[Dict[str, Any]] = None,
    timeout: int = 30
) -> Any:
    """
    Make HTTP request to another service.
    Returns:
      - dict/list if response is JSON
      - {} if 204 No Content
      - raw text if non-JSON body
    Raises:
      ServiceHTTPError for non-2xx responses (with status + detail)
    """
    url = f"{service_url.rstrip('/')}/{endpoint.lstrip('/')}"

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            resp = await client.request(
                method=method.upper(),
                url=url,
                json=data if method.upper() in ["POST", "PUT", "PATCH"] else None,
                headers=headers,
                params=params
            )
        except httpx.RequestError as e:
            raise ServiceHTTPError(status_code=0, message=f"RequestError: {str(e)}", url=url)

        # 204 No Content
        if resp.status_code == 204:
            return {}

        # error
        if resp.status_code < 200 or resp.status_code >= 300:
            # try to parse error json
            detail = None
            try:
                j = resp.json()
                # FastAPI usually returns {"detail": "..."} or {"detail": [...]}
                detail = j.get("detail", j)
            except Exception:
                detail = resp.text

            raise ServiceHTTPError(
                status_code=resp.status_code,
                message=f"{detail}",
                url=str(resp.url)
            )

        # success: parse json or return text
        try:
            return resp.json()
        except Exception:
            return resp.text
