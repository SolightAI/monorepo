import os
import uuid
import asyncio
import traceback
import functools
import logging
import re
from typing import Dict, Any, Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field
from utils.task_status import task_status_manager
from browser_use import Agent, Browser, BrowserConfig
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from langchain_openai import AzureChatOpenAI
from pydantic import SecretStr

# Setup logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/validate-url", tags=["validate_url"])

# Define models
class URLValidationRequest(BaseModel):
    url: str = Field(..., description="The URL to validate")

class URLValidationResponse(BaseModel):
    task_id: str = Field(..., description="ID to track the validation task")
    status: str = Field("pending", description="Status of the validation task")

# Setup Azure OpenAI client
if (azure_openai_key := os.getenv('AZURE_OPENAI_KEY')) is None:
    raise ValueError('AZURE_OPENAI_KEY is not set')

if (azure_openai_endpoint := os.getenv('AZURE_OPENAI_ENDPOINT')) is None:
    raise ValueError('AZURE_OPENAI_ENDPOINT is not set')

AGENT_CLIENT = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-02-01',
    azure_endpoint=azure_openai_endpoint,
    api_key=SecretStr(azure_openai_key),
    temperature=0.0,
)

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
                    "confidence": "low",
                    "explanation": f"The page took too long to respond: {error_message}",
                    "message": "Login page not found - page load timeout",
                    "original_url": args[0] if args else None,  # First arg should be URL
                    "error_type": "timeout"
                }
                # For timeouts, we'll mark as completed but with a negative result
                task_status_manager.set_status(task_id, "completed", results=error_result)
                return error_result
                
            # For other errors, mark as error
            task_status_manager.set_status(task_id, "error", error=error_message)
            raise e

    return wrapper


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
<confidence>high/medium/low</confidence>
<explanation>Brief explanation of what you found</explanation>
</login_page_detection>
""".strip()

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
            result = history.final_result()
            
            # Parse the result to determine if a login page was found
            found = "true" in result.lower() and "<found>true</found>" in result.lower()
            login_url = ""
            
            # Extract login URL if available
            login_url_match = re.search(r"<login_url>(.*?)</login_url>", result, re.DOTALL)
            if login_url_match:
                login_url = login_url_match.group(1).strip()
                
            # Extract confidence
            confidence = "low"
            confidence_match = re.search(r"<confidence>(.*?)</confidence>", result, re.DOTALL)
            if confidence_match:
                confidence = confidence_match.group(1).strip().lower()
                
            # Extract explanation
            explanation = ""
            explanation_match = re.search(r"<explanation>(.*?)</explanation>", result, re.DOTALL)
            if explanation_match:
                explanation = explanation_match.group(1).strip()
            
            # Add detailed debug logging when a login page is found    
            if found:
                logger.debug(f"[{task_id}] LOGIN PAGE FOUND for {url}")
                logger.debug(f"[{task_id}] Original URL: {url}")
                logger.debug(f"[{task_id}] Login URL: {login_url}")
                logger.debug(f"[{task_id}] Confidence: {confidence}")
                logger.debug(f"[{task_id}] Explanation: {explanation}")
                logger.debug(f"[{task_id}] Raw result: {result}")
                
            # Prepare the response
            response = {
                "valid": found,
                "login_url": login_url if found else None,
                "confidence": confidence,
                "explanation": explanation,
                "message": "Login page found successfully" if found else "Login page could not be found",
                "original_url": url,  # Include the original URL in the response
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
                "confidence": "low",
                "explanation": "The page took too long to respond. Please check that the URL is correct and accessible.",
                "message": "Login page not found - page load timeout",
                "original_url": url,
                "error_type": "timeout"
            }
        except Exception as e:
            if "timeout" in str(e).lower() or "timed out" in str(e).lower():
                logger.error(f"[{task_id}] ⏱️ Timeout error while validating URL: {url} - {str(e)}")
                return {
                    "valid": False,
                    "login_url": None,
                    "confidence": "low",
                    "explanation": f"The page took too long to respond: {str(e)}",
                    "message": "Login page not found - page load timeout",
                    "original_url": url,
                    "error_type": "timeout"
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
                "confidence": "low",
                "explanation": f"The page took too long to respond: {error_message}",
                "message": "Login page not found - page load timeout",
                "original_url": url,
                "error_type": "timeout"
            }
        # Return detailed error information
        return {
            "valid": False,
            "login_url": None,
            "confidence": "low",
            "explanation": f"Error during validation: {error_message}",
            "message": "Failed to validate login page",
            "original_url": url,
            "error_type": "error"
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