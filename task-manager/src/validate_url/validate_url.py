import os
import uuid
import asyncio
import traceback
import functools
import logging
import re
import json
from typing import Dict, Any, Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field
from utils.task_status import task_status_manager
from browser_use import Agent, Browser, BrowserConfig
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from langchain_openai import AzureChatOpenAI
from pydantic import SecretStr
from urllib.parse import urlparse
from utils.session_manager import get_redis

# Setup logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/validate-url", tags=["validate_url"])

# Redis key prefix for login pages
LOGIN_PAGE_REDIS_PREFIX = "login_page:"
# Key expiration time in seconds (30 days)
LOGIN_PAGE_EXPIRY = 60 * 60 * 24 * 30

CONFIDENCE_HIGH = "high"
CONFIDENCE_MEDIUM = "medium"
CONFIDENCE_LOW = "low"

ERROR_TIMEOUT = "timeout"
ERROR_OTHER = "error"


AGENT_CLIENT = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-02-01',
    azure_endpoint=azure_openai_endpoint,
    api_key=SecretStr(azure_openai_key),
    temperature=0.0,
)

# Prompt for login page detection
PROMPT = """
You are an AI assistant tasked with examining a website to find its login page. 

Your task is to:
1. Look for login links, buttons, or forms on the current page
2. If you find a login link or button, click on it to navigate to the login page
3. If you're already on the login page, confirm that login elements (username/email field, password field) are present
4. Report your findings

Your goal is to determine if this website has a login page and if it can be found.

After examining the site, provide a conclusion in the following format:
<login_page_detection>
<found>true/false</found>
<login_url>URL of the login page if found</login_url>
<confidence>'{CONFIDENCE_HIGH}'/'{CONFIDENCE_MEDIUM}'/'{CONFIDENCE_LOW}'</confidence>
</login_page_detection>
""".strip().format(CONFIDENCE_HIGH=CONFIDENCE_HIGH, CONFIDENCE_MEDIUM=CONFIDENCE_MEDIUM, CONFIDENCE_LOW=CONFIDENCE_LOW)

# Define models
class URLValidationRequest(BaseModel):
    url: str = Field(..., description="The URL to validate")

class URLValidationResponse(BaseModel):
    task_id: str = Field(..., description="ID to track the validation task")
    status: str = Field("pending", description="Status of the validation task")

class LoginPageCacheRequest(BaseModel):
    domain: str = Field(..., description="Domain to get the cached login page for")

class LoginPageCacheResponse(BaseModel):
    found: bool = Field(..., description="Whether a login page was found")
    login_url: Optional[str] = Field(None, description="URL of the login page if found")
    confidence: str = Field(CONFIDENCE_LOW, description="Confidence level of the result")
    source: str = Field("cache", description="Source of the login page info")

# Extract domain from a URL 
def extract_domain(url: str) -> str:
    """
    Extract the domain from a URL.
    
    Args:
        url: The URL to extract the domain from
        
    Returns:
        The domain name
    """
    parsed_url = urlparse(url)
    domain = parsed_url.netloc
    
    # If no netloc (domain) was found, try the path - might be a domain without scheme
    if not domain and parsed_url.path:
        domain = parsed_url.path.split('/')[0]
    
    # Remove port if present
    domain = domain.split(':')[0]
    
    # Remove www. prefix if present
    if domain.startswith('www.'):
        domain = domain[4:]
    
    return domain.lower()

# Save login page to cache
async def save_login_page_to_cache(url: str, login_url: str, confidence: str) -> None:
    """
    Save a discovered login page to Redis cache.
    
    Args:
        url: The original URL that was validated
        login_url: The URL of the discovered login page
        confidence: Confidence level of the discovery (high, medium, low)
    """
    domain = extract_domain(url)
    if not domain:
        logger.warning(f"Could not extract domain from URL: {url}")
        return
    
    logger.info(f"Saving login page for domain {domain}: {login_url} (confidence: {confidence})")
    
    cache_key = f"{LOGIN_PAGE_REDIS_PREFIX}{domain}"
    
    data = {
        "login_url": login_url,
        "original_url": url,
        "confidence": confidence,
        "found": "true"
    }
    
    try:
        # Get Redis client
        redis_client = await get_redis()
        
        # Store as a hash in Redis
        await redis_client.setex(cache_key, LOGIN_PAGE_EXPIRY, json.dumps(data))
        logger.info(f"Login page for domain {domain} cached successfully")
    except Exception as e:
        logger.error(f"Error caching login page for domain {domain}: {str(e)}")

# Get login page from cache
async def get_login_page_from_cache(url: str) -> Dict[str, Any]:
    """
    Get a login page from Redis cache based on domain.
    
    Args:
        url: The URL to get the login page for
        
    Returns:
        Dictionary with login page data if found, None otherwise
    """
    domain = extract_domain(url)
    if not domain:
        logger.warning(f"Could not extract domain from URL: {url}")
        return None
    
    logger.info(f"Checking cache for login page for domain: {domain}")
    
    cache_key = f"{LOGIN_PAGE_REDIS_PREFIX}{domain}"
    
    try:
        # Get Redis client
        redis_client = await get_redis()
        
        # Get data from Redis
        data = await redis_client.get(cache_key)
        if data:
            # Redis returns bytes, decode and parse JSON
            cached_data = json.loads(data.decode('utf-8') if isinstance(data, bytes) else data)
            if cached_data.get("found") == "true":
                logger.info(f"Login page for domain {domain} found in cache: {cached_data.get('login_url')}")
                return {
                    "valid": True,
                    "login_url": cached_data.get("login_url"),
                    "confidence": cached_data.get("confidence", CONFIDENCE_MEDIUM),
                    "message": "Login page found successfully (from cache)",
                    "original_url": cached_data.get("original_url", url),
                    "source": "cache"
                }
    except Exception as e:
        logger.error(f"Error retrieving login page from cache for domain {domain}: {str(e)}")
    
    logger.info(f"No login page found in cache for domain {domain}")
    return None

# Setup Azure OpenAI client
if (azure_openai_key := os.getenv('AZURE_OPENAI_KEY')) is None:
    raise ValueError('AZURE_OPENAI_KEY is not set')

if (azure_openai_endpoint := os.getenv('AZURE_OPENAI_ENDPOINT')) is None:
    raise ValueError('AZURE_OPENAI_ENDPOINT is not set')

# Background task error handling decorator
def handle_background_task_errors(func):
    """Decorator to handle background task errors."""
    @functools.wraps(func)
    async def wrapper(task_id: str, *args, **kwargs):
        try:
            task_status_manager.set_status(task_id, "pending")
            results = await func(task_id, *args, **kwargs)
            task_status_manager.set_status(task_id, "completed", results=results)
            return results
        except Exception as e:
            error_message = str(e)
            stack_trace = traceback.format_exc()
            logger.error(f"[{task_id}] Error in background task: {error_message}\n{stack_trace}")
            
            # Check if this was a timeout error
            if "timeout" in error_message.lower() or "timed out" in error_message.lower():
                error_result = {
                    "valid": False,
                    "login_url": None,
                    "confidence": CONFIDENCE_LOW,
                    "message": "Login page not found - page load timeout",
                    "original_url": args[0] if args else None,  # First arg should be URL
                    "error_type": ERROR_TIMEOUT
                }
                # For timeouts, we'll mark as completed but with a negative result
                task_status_manager.set_status(task_id, "completed", results=error_result)
                return error_result
                
            # For other errors, mark as error
            task_status_manager.set_status(task_id, "error", error=error_message)
            raise e

    return wrapper

@handle_background_task_errors
async def validate_url_task(task_id: str, url: str) -> Dict[str, Any]:
    """
    Background task to validate a URL by checking if a login page exists.
    
    Args:
        task_id: Task identifier
        url: URL to validate
        
    Returns:
        Dict with validation results
    """
    logger.info(f"[{task_id}] Starting URL validation for: {url}")
    
    # First, check the cache
    cached_result = await get_login_page_from_cache(url)
    if cached_result:
        logger.info(f"[{task_id}] Login page found in cache for {url}: {cached_result.get('login_url')}")
        return cached_result
    
    # If not in cache, proceed with validation
    logger.info(f"[{task_id}] No cached login page found for {url}, running validation")
    
    # Initialize browser
    browser = Browser(
        config=BrowserConfig(
            headless=os.getenv("HEADLESS", "true").lower() == "true",
        )
    )
    
    context = BrowserContext(browser=browser, config=BrowserContextConfig(
        minimum_wait_page_load_time=1,
        viewport_expansion=0,
        wait_between_actions=0,
    ))
    
    try:
        # Setup and run the agent
        agent = Agent(
            task=PROMPT,
            llm=AGENT_CLIENT,
            initial_actions=[{'go_to_url': {'url': url}}],
            browser_context=context,
            enable_memory=False,
            use_vision=True,
        )
        
        # Run with a timeout to avoid hanging
        try:
            history = await agent.run(max_steps=10)
            
            # Extract the result
            result = history.validate_agent_history()
            
            # Parse the result to determine if a login page was found
            found = "true" in result.lower() and "<found>true</found>" in result.lower()
            login_url = ""
            
            # Extract login URL if available
            login_url_match = re.search(r"<login_url>(.*?)</login_url>", result, re.DOTALL)
            if login_url_match:
                login_url = login_url_match.group(1).strip()
                
            # Extract confidence
            confidence = CONFIDENCE_LOW
            confidence_match = re.search(r"<confidence>(.*?)</confidence>", result, re.DOTALL)
            if confidence_match:
                confidence = confidence_match.group(1).strip().lower()
            
            # Add detailed debug logging when a login page is found    
            if found:
                logger.debug(f"[{task_id}] LOGIN PAGE FOUND for {url}")
                logger.debug(f"[{task_id}] Original URL: {url}")
                logger.debug(f"[{task_id}] Login URL: {login_url}")
                logger.debug(f"[{task_id}] Confidence: {confidence}")
                logger.debug(f"[{task_id}] Raw result: {result}")
                
                # Save the login page to cache if found
                if login_url:
                    await save_login_page_to_cache(url, login_url, confidence)
                
            # Prepare the response
            response = {
                "valid": found,
                "login_url": login_url if found else None,
                "confidence": confidence,
                "message": "Login page found successfully" if found else "Login page could not be found",
                "original_url": url,  # Include the original URL in the response
                "source": "validation"
            }
            
            # Log the validation outcome
            if found:
                logger.info(f"[{task_id}] ✅ Login page FOUND for {url} -> {login_url} (confidence: {confidence})")
            else:
                logger.info(f"[{task_id}] ❌ Login page NOT FOUND for {url}")
            
            return response
            
        except asyncio.TimeoutError as e:
            logger.error(f"[{task_id}] ⏱️ Timeout while validating URL: {url}")
            return {
                "valid": False,
                "login_url": None,
                "confidence": CONFIDENCE_LOW,
                "message": "Login page not found - page load timeout",
                "original_url": url,
                "error_type": ERROR_TIMEOUT,
                "source": "validation"
            }
        except Exception as e:
            if "timeout" in str(e).lower() or "timed out" in str(e).lower():
                logger.error(f"[{task_id}] ⏱️ Timeout error while validating URL: {url} - {str(e)}")
                return {
                    "valid": False,
                    "login_url": None,
                    "confidence": CONFIDENCE_LOW,
                    "message": "Login page not found - page load timeout",
                    "original_url": url,
                    "error_type": ERROR_TIMEOUT,
                    "source": "validation"
                }
            else:
                # Re-raise other exceptions to be caught by the outer try/except
                raise
        
    except Exception as e:
        logger.error(f"[{task_id}] Error validating URL: {url} - {str(e)}")
        # Check if this was a timeout error
        error_message = str(e)
        if "timeout" in error_message.lower() or "timed out" in error_message.lower():
            return {
                "valid": False,
                "login_url": None,
                "confidence": CONFIDENCE_LOW,
                "message": "Login page not found - page load timeout",
                "original_url": url,
                "error_type": ERROR_TIMEOUT,
                "source": "validation"
            }
        # Return detailed error information
        return {
            "valid": False,
            "login_url": None,
            "confidence": CONFIDENCE_LOW,
            "message": "Failed to validate login page",
            "original_url": url,
            "error_type": ERROR_OTHER,
            "source": "validation"
        }
    finally:
        # Clean up resources
        await context.close()
        await browser.close()


@router.post("/")
async def validate_url_endpoint(
    request: URLValidationRequest,
    background_tasks: BackgroundTasks
) -> URLValidationResponse:
    """
    Endpoint to validate a URL by checking if a login page exists.
    
    Args:
        request: URL validation request
        background_tasks: FastAPI background tasks
        
    Returns:
        Task ID for tracking the validation status
    """
    # Generate a unique task ID
    task_id = str(uuid.uuid4())
    
    # Start the validation in the background
    background_tasks.add_task(validate_url_task, task_id, request.url)
    
    return URLValidationResponse(task_id=task_id)


@router.get("/cache/{domain}")
async def get_cached_login_page(
    domain: str,
) -> LoginPageCacheResponse:
    """
    Get a cached login page for a domain.
    
    Args:
        domain: Domain to get the login page for
        
    Returns:
        Dictionary with login page data if found
    """
    cache_key = f"{LOGIN_PAGE_REDIS_PREFIX}{domain.lower()}"
    
    try:
        # Get Redis client
        redis_client = await get_redis()
        
        # Get data from Redis
        data = await redis_client.get(cache_key)
        if data:
            # Redis returns bytes, decode and parse JSON
            cached_data = json.loads(data.decode('utf-8') if isinstance(data, bytes) else data)
            if cached_data.get("found") == "true":
                return LoginPageCacheResponse(
                    found=True,
                    login_url=cached_data.get("login_url"),
                    confidence=cached_data.get("confidence", CONFIDENCE_MEDIUM ),
                    source="cache"
                )
        
        return LoginPageCacheResponse(
            found=False,
            login_url=None,
            confidence=CONFIDENCE_LOW,
            source="cache"
        )
    except Exception as e:
        logger.error(f"Error retrieving login page from cache for domain {domain}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving login page from cache: {str(e)}"
        )


@router.get("/status/{task_id}")
async def get_url_validation_status(
    task_id: str,
) -> Dict[str, Any]:
    """
    Get the status of a URL validation task.
    
    Args:
        task_id: Task ID to check
        
    Returns:
        Dictionary with task status information
    """
    status = task_status_manager.get_status(task_id)
    return status 