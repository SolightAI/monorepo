"""
Example Usage of JavaScript Console Logger

This example demonstrates how to use the js_logger and history_tracker modules
to collect JavaScript console logs and uncaught exceptions.
"""

import asyncio
from pprint import pprint

# Import browser_use components
from browser_use import Agent, Browser, BrowserConfig
from langchain_openai import ChatOpenAI

# Import our logger modules with fully qualified paths
from run_tests.tracing.js_logger import initialize
from run_tests.tracing.history_tracker import extend_agent_history


async def main():
    # Set up browser logging - only needs to be done once at the start of your program
    collector = initialize()
    extend_agent_history()
    
    # Your normal browser-use code here
    browser = Browser(config=BrowserConfig(headless=False))
    context = await browser.new_context()
    
    # Get a session - our logger should automatically attach to any pages
    session = await context.get_session()
    
    # If you need to create a page manually (depends on browser_use API)
    # This should work with our patched methods
    try:
        # Try different methods that might exist to create a page
        page = None
        
        # First try to get the active page if it exists
        if hasattr(context, 'get_page'):
            page = await context.get_page()
        
        # If there's no page yet, try to get one from the session
        if page is None and hasattr(session, 'page'):
            page = session.page
            
        # If still no page, use the first page from the context if available
        if page is None and hasattr(session.context, 'pages') and session.context.pages:
            page = session.context.pages[0]
        
        # If we have a page, navigate and inject some console logs
        if page:
            await page.goto("about:blank")
            
            # Execute JavaScript that generates console logs and errors
            await page.evaluate("""() => {
                console.log('This is a log message');
                console.info('This is an info message');
                console.warn('This is a warning message');
                console.error('This is an error message');
                
                // Create an uncaught exception
                setTimeout(() => {
                    throw new Error('This is an uncaught exception');
                }, 100);
            }""")
            
            # Wait for the exception to be thrown
            await asyncio.sleep(0.5)
        else:
            print("Could not get a page to test with. The logger will still work with actual usage.")
    except Exception as e:
        print(f"Error creating test page: {e}")
        print("This is just for the example - the logger will still work with actual usage")
    
    # Create an agent that uses this browser context
    llm = ChatOpenAI(temperature=0, model="gpt-3.5-turbo")
    agent = Agent(
        task="Test task",
        llm=llm,
        browser=browser,
        browser_context=context
    )
    
    # Run the agent (in a real scenario) - Here we just simulate it
    # history = await agent.run()
    
    # Since we're not actually running the agent, we'll just create a sample result
    # In practice, you'd access logs from the real agent.run() result
    
    # Access logs directly from the collector
    print("\n=== All logs from collector ===")
    pprint(collector.get_all_as_dict())
    
    print("\n=== Console logs by type ===")
    error_logs = collector.get_console_logs(type_filter="error")
    for log in error_logs:
        print(f"ERROR: {log.text}")
    
    print("\n=== JS Exceptions ===")
    for exc in collector.get_js_exceptions():
        print(f"EXCEPTION: {exc.message}")
        if exc.stack:
            print(f"STACK: {exc.stack}")
    
    # In a real agent run, you can also get logs directly from the agent
    print("\n=== Logs from agent ===")
    pprint(agent.get_browser_logs())
    
    # In a real agent run with history, you'd access the logs like this:
    # print("\n=== Logs from agent history ===")
    # pprint(history.logs)
    # print("\n=== Console errors from agent history ===")
    # pprint(history.get_console_logs(type_filter="error"))
    # print("\n=== JS exceptions from agent history ===")
    # pprint(history.js_exceptions)
    
    # Close the browser
    await browser.close()


if __name__ == "__main__":
    asyncio.run(main()) 