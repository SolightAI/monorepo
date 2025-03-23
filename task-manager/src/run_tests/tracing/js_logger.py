"""
JavaScript Console Logger for browser-use

Collects and tracks browser console logs and uncaught exceptions from browser-use sessions.
Provides a simple API to access and analyze this data with minimal setup.
"""

import logging
from typing import Dict, List, Any, Optional, Callable
import functools
import inspect
from dataclasses import dataclass
from datetime import datetime

# Setup basic logging
logger = logging.getLogger(__name__)

@dataclass
class ConsoleMessage:
    """Represents a browser console message"""
    type: str  # 'log', 'debug', 'info', 'error', 'warning', etc.
    text: str
    location: Optional[Dict[str, Any]] = None
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

@dataclass
class JSException:
    """Represents an uncaught JavaScript exception"""
    message: str
    stack: Optional[str] = None
    location: Optional[Dict[str, Any]] = None
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

class JSLogCollector:
    """Collects browser console logs and JavaScript exceptions"""
    
    def __init__(self):
        self.console_logs: List[ConsoleMessage] = []
        self.js_exceptions: List[JSException] = []
        self._enabled = True
        
    def clear(self):
        """Clear all collected logs and exceptions"""
        self.console_logs.clear()
        self.js_exceptions.clear()
        
    def disable(self):
        """Disable log collection"""
        self._enabled = False
        
    def enable(self):
        """Enable log collection"""
        self._enabled = True
        
    def add_console_message(self, msg_type: str, text: str, location: Optional[Dict[str, Any]] = None):
        """Add a console message to the collection"""
        if self._enabled:
            self.console_logs.append(ConsoleMessage(type=msg_type, text=text, location=location))
            
    def add_js_exception(self, message: str, stack: Optional[str] = None, location: Optional[Dict[str, Any]] = None):
        """Add a JavaScript exception to the collection"""
        if self._enabled:
            self.js_exceptions.append(JSException(message=message, stack=stack, location=location))
    
    def get_console_logs(self, type_filter: Optional[str] = None) -> List[ConsoleMessage]:
        """Get collected console logs, optionally filtered by type"""
        if type_filter:
            return [log for log in self.console_logs if log.type == type_filter]
        return self.console_logs
    
    def get_js_exceptions(self) -> List[JSException]:
        """Get collected JavaScript exceptions"""
        return self.js_exceptions

    def get_all_as_dict(self) -> Dict[str, List[Dict[str, Any]]]:
        """Get all logs and exceptions as a dictionary for easy serialization"""
        return {
            'console_logs': [
                {
                    'type': log.type,
                    'text': log.text,
                    'location': log.location,
                    'timestamp': log.timestamp.isoformat() if log.timestamp else None
                } for log in self.console_logs
            ],
            'js_exceptions': [
                {
                    'message': exc.message,
                    'stack': exc.stack,
                    'location': exc.location,
                    'timestamp': exc.timestamp.isoformat() if exc.timestamp else None
                } for exc in self.js_exceptions
            ]
        }
    
    def __str__(self):
        return f"JSLogCollector: {len(self.console_logs)} console logs, {len(self.js_exceptions)} JS exceptions"


# Global collector instance
collector = JSLogCollector()


def attach_listeners(page):
    """
    Set up console and error event listeners for a Playwright page
    
    Args:
        page: Playwright page object to attach listeners to
    """
    
    # Console message listener
    page.on("console", lambda msg: collector.add_console_message(
        msg_type=msg.type,
        text=msg.text,
        location={
            'url': msg.location.get('url', ''),
            'lineNumber': msg.location.get('lineNumber', 0),
            'columnNumber': msg.location.get('columnNumber', 0)
        } if hasattr(msg, 'location') and msg.location else None
    ))
    
    # Page error listener
    page.on("pageerror", lambda err: collector.add_js_exception(
        message=str(err),
        stack=err.stack if hasattr(err, 'stack') else None
    ))


def patch_context():
    """
    Patch the BrowserContext class to automatically set up log listeners
    for new pages.
    
    Returns:
        bool: True if any method was patched successfully, False otherwise
    """
    try:
        from browser_use.browser.context import BrowserContext
        
        # Get all methods in BrowserContext that might create or return pages
        patched = False
        
        # Try to patch get_session which might return a context with pages
        if hasattr(BrowserContext, 'get_session'):
            original_get_session = BrowserContext.get_session
            
            @functools.wraps(original_get_session)
            async def get_session_with_logging(self, *args, **kwargs):
                session = await original_get_session(self, *args, **kwargs)
                
                # Set up listeners for all pages in the session
                if hasattr(session, 'context') and hasattr(session.context, 'pages'):
                    for page in session.context.pages:
                        attach_listeners(page)
                
                return session
            
            BrowserContext.get_session = get_session_with_logging
            logger.info("Successfully patched BrowserContext.get_session method for log collection")
            patched = True
            
        # Try to patch get_page method
        if hasattr(BrowserContext, 'get_page'):
            original_get_page = BrowserContext.get_page
            
            @functools.wraps(original_get_page)
            async def get_page_with_logging(self, *args, **kwargs):
                page = await original_get_page(self, *args, **kwargs)
                if page:
                    attach_listeners(page)
                return page
            
            BrowserContext.get_page = get_page_with_logging
            logger.info("Successfully patched BrowserContext.get_page method for log collection")
            patched = True
        
        # Try to patch any method that might be creating new pages
        possible_page_methods = ['new_page', 'create_page', 'add_page']
        for method_name in possible_page_methods:
            if hasattr(BrowserContext, method_name):
                original_method = getattr(BrowserContext, method_name)
                
                @functools.wraps(original_method)
                async def method_with_logging(self, *args, **kwargs):
                    page = await original_method(self, *args, **kwargs)
                    if page:
                        attach_listeners(page)
                    return page
                
                setattr(BrowserContext, method_name, method_with_logging)
                logger.info(f"Successfully patched BrowserContext.{method_name} method for log collection")
                patched = True
        
        # Add a special setup method that can be called manually
        def setup_page_logging(self, page):
            """Set up logging for a specific page"""
            attach_listeners(page)
            return page
        
        BrowserContext.setup_page_logging = setup_page_logging
        
        if not patched:
            logger.warning("Could not find any suitable methods to patch in BrowserContext. "
                         "You may need to call context.setup_page_logging(page) manually for each page.")
        
        return patched
    except Exception as e:
        logger.error(f"Failed to patch BrowserContext class: {e}")
        return False


def patch_agent():
    """
    Patch the Agent class to make logs and exceptions accessible after a run.
    
    Returns:
        bool: True if the Agent class was patched successfully, False otherwise
    """
    try:
        from browser_use.agent.service import Agent
        
        # Add a property to access the collector
        Agent.log_collector = property(lambda self: collector)
        
        # Store the original run method
        original_run = Agent.run
        
        if inspect.iscoroutinefunction(original_run):
            @functools.wraps(original_run)
            async def run_with_logging(self, *args, **kwargs):
                # Clear collector before run
                collector.clear()
                
                # Run the original method
                result = await original_run(self, *args, **kwargs)
                
                # Add logs to the result object if possible
                if result is not None:
                    if hasattr(result, 'add_logs'):
                        # Use add_logs method if available
                        result.add_logs(collector.get_all_as_dict())
                    elif hasattr(result, '__dict__'):
                        # Only add attribute if needed
                        try:
                            result._js_logs = collector.get_all_as_dict()
                            # Add get_logs method for consistent access
                            if not hasattr(result, 'get_logs'):
                                result.get_logs = lambda: result._js_logs
                        except:
                            logger.debug("Could not attach logs to result object")
                
                return result
        else:
            @functools.wraps(original_run)
            def run_with_logging(self, *args, **kwargs):
                # Clear collector before run
                collector.clear()
                
                # Run the original method
                result = original_run(self, *args, **kwargs)
                
                # Add logs to the result object if possible
                if result is not None:
                    # Use only get_logs method for consistency
                    if hasattr(result, 'add_logs'):
                        # Use add_logs method if available
                        result.add_logs(collector.get_all_as_dict())
                    elif hasattr(result, '__dict__'):
                        # Only add attribute if needed
                        try:
                            result._js_logs = collector.get_all_as_dict()
                            # Add get_logs method for consistent access
                            if not hasattr(result, 'get_logs'):
                                result.get_logs = lambda: result._js_logs
                        except:
                            logger.debug("Could not attach logs to result object")
                
                return result
        
        # Replace the original method
        Agent.run = run_with_logging
        logger.info("Successfully patched Agent.run method for log collection")
        
        # Add method to get logs directly from Agent using the consistent method name
        def get_logs(self):
            """Get collected browser logs and exceptions"""
            return collector.get_all_as_dict()
        
        Agent.get_logs = get_logs
        
        return True
    except Exception as e:
        logger.error(f"Failed to patch Agent class: {e}")
        return False


def patch_playwright():
    """
    Add a global listener to patch Playwright Page objects when they're created.
    This is a fallback approach if the BrowserContext patching doesn't work.
    
    Returns:
        bool: True if Playwright Page class was patched successfully, False otherwise
    """
    try:
        from playwright.async_api import Page
        
        # Store the original constructor
        original_init = Page.__init__
        
        @functools.wraps(original_init)
        def init_with_logging(self, *args, **kwargs):
            # Call the original constructor
            original_init(self, *args, **kwargs)
            
            # Set up logging
            attach_listeners(self)
        
        # Replace the constructor
        Page.__init__ = init_with_logging
        logger.info("Successfully patched Playwright Page constructor for log collection")
        
        return True
    except Exception as e:
        logger.error(f"Failed to patch Playwright Page class: {e}")
        return False


def initialize():
    """
    Initialize JavaScript logging by patching necessary classes at runtime.
    
    This is the main function that should be called to enable logging.
    
    Returns:
        JSLogCollector: The global collector instance for accessing logs
    """
    logger.info("Setting up browser console and exception logging...")
    context_patched = patch_context()
    agent_patched = patch_agent()
    
    # Try to patch Playwright Page as a fallback
    if not context_patched:
        patch_playwright()
    
    logger.info("Browser logging setup complete")
    return collector


# Make collector easily accessible
get_collector = lambda: collector 