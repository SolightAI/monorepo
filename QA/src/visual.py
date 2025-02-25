import os
import asyncio

from pydantic import SecretStr
from langchain_openai import AzureChatOpenAI
from browser_use.browser.context import BrowserContextConfig, BrowserContext
from browser_use import Agent, Browser, BrowserConfig, Controller

from dotenv import load_dotenv

load_dotenv("../.env")


HEADLESS = False

AGENT_LLM = AzureChatOpenAI(
    model="gpt-4o",
    api_version='2024-10-21',
    azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT', ''),
    api_key=SecretStr(os.getenv('AZURE_OPENAI_KEY', '')),
    temperature=0.00000001,
)

config = BrowserContextConfig(
    # cookies_file="/tmp/cookies2.json",
    wait_for_network_idle_page_load_time=1.5,
    browser_window_size={'width': 1920, 'height': 1080},
    locale='en-US',
    user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15',
    highlight_elements=True,
    # viewport_expansion=500,
)

WEBSITES = [
    'https://laneo.io/',
    # 'https://linear.app/'
    # 'https://linear.app/signup'
    # 'https://qacrmdemo.netlify.app/dashboard'
    # 'https://www.predictiveindex.com/',
    # "https://platform.phospho.ai/"
    # "https://suno.com/",
    # "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    # "https://x.com/home",
    # "https://www.airbnb.com/"
]


section_detector_prompt = """
# Navigate through the given website and identify the following sections:
# 1. Landing page
# 2. Pricing page
# 3. Forms and inputs
# 4. Checkout page
# 5. Billing page
# 6. Other pages

# Return the sections in a markdown-formatted list. Use the following structure:

# # Sections

# *Landing page:* [url]
# *Pricing page* [url]
# *Forms and inputs* [urls]
# *Checkout page* [url]
# """

# old_overall_prompt = """\
# # You are a UI/UX expert tasked with reviewing a webpage and identifying potential issues along with actionable fixes. 
# # Your goal is to provide a comprehensive list of UI/UX problems and their solutions in a clear, easy-to-implement format.

# # Conduct a thorough review of the webpage, paying attention to the following aspects, but not limited to:
# # 1. Layout and design
# # 2. Navigation and menu structure
# # 3. Color scheme and visual hierarchy
# # 4. Typography and readability
# # 5. Responsiveness and mobile compatibility
# # 6. Loading speed and performance
# # 7. Accessibility features
# # 8. User flow and intuitive design
# # 9. Consistency across different sections
# # 10. Call-to-action buttons and their placement

# # As you review each aspect, document any issues you encounter. 
# # For each issue:
# # 1. Clearly describe the problem
# # 2. Categorize the issue as either objective or subjective
# # 3. Explain why it's a UI/UX issue
# # 4. Provide a clear, actionable and easy-to-implement fix

# # Remember that you may need to click on the "Login" button to access certain parts of the page. 
# # However, do not test the billing pages. 
# # You can still mention potential issues related to billing pages based on visible elements, but do not attempt to interact with them.

# # After completing your review, compile your findings into a markdown-formatted list. Use the following structure:

# # # UI/UX Issues and Fixes

# # ## 1. [Issue Name]
# # *Problem:* [Describe the issue]
# # *Why it's a problem:* [Explain the impact on user experience]
# # *Category:* [Objective, Subjective]
# # *Fix:* [Provide an actionable solution]
# # *Severity:* [Very Low, Low, Medium, High, Very High. Based on user imapct, frequency and context]

# # ## 2. [Issue Name]
# # ...

# # Continue this format for all identified issues. Ensure that your fixes are specific, actionable, and easy to implement.
# # """

# overall_prompt_login = """\
# # You are a UI/UX expert tasked with reviewing a website and identifying potential issues along with actionable fixes. 
# # Your goal is to provide a comprehensive list of UI/UX problems and their solutions in a clear, easy-to-implement format.

# # Conduct a thorough review of the overall website, paying attention to the following aspects, but not limited to:
# # 1. Navigation
# # 2. Layout and design

# # As you review each aspect, document any issues you encounter. 
# # For each issue:
# # 1. Categorise the issue within Navigation or Layout and Design
# # 2. Clearly describe the problem
# # 3. Define the issue as either objective or subjective
# # 4. Explain why it's a UI/UX issue
# # 5. Provide a clear, actionable and easy-to-implement fix

# # Remember that you may need to click on the "Login" button to access certain parts of the page. 
# # However, do not test the billing pages. 
# # You can still mention potential issues related to billing pages based on visible elements, but do not attempt to interact with them.

# # After completing your review, compile your findings into a markdown-formatted list. Use the following structure:

# # # UI/UX Issues and Fixes

# # ## 1. [Issue Name]
# # *Category:* [Navigation, Layout]
# # *Problem:* [Describe the issue]
# # *Why it's a problem:* [Explain the impact on user experience]
# # *Objective/Subjective:* [Objective, Subjective]
# # *Fix:* [Provide an actionable solution]
# # *Severity:* [Very Low, Low, Medium, High, Very High. Based on user imapct, frequency and context]

# # ## 2. [Issue Name]
# # ...

# # Continue this format for all identified issues. Ensure that your fixes are specific, actionable, and easy to implement.
# # """

##  For the Landing page, checkout page, pricing page and forms or inputs only consider them as part of the whole website and do not focus on them specifically.

overall_prompt_no_login = """
# You are a UI/UX expert tasked with reviewing a website and identifying potential issues along with actionable fixes. 
# Your goal is to provide a comprehensive list of UI/UX problems and their solutions in a clear, easy-to-implement format.

# Conduct a thorough review of the overall website, paying attention to the following aspects, but not limited to:
# 1. Navigation - Check if the navigation is clear and easy to use and if there is any deep paths (>3 clicks)
# 2. Layout and design - Check if the layout is consistent and if the design is cohesive
# 3. Copywright - Check if the content is clear, cohesive and engaging

##  For the Landing page, checkout page, pricing page and forms or inputs only consider them as part of the whole website and do not focus on them specifically.

# As you review each aspect, document any issues you encounter. 
# For each issue:
# 1. Categorise the issue within Navigation or Layout and Design
# 2. Clearly describe the problem
# 3. If the issue is on a page, provide the URL. If its on a path define the path.
# 3. Define the issue as either objective or subjective
# 4. Explain why it's a UI/UX issue
# 5. Provide a clear, actionable and easy-to-implement fix

# Do not signin or signup, just explore the website and the different available pages.

# After completing your review, compile your findings into a markdown-formatted list. Use the following structure:

# # UI/UX Overall Issues and Fixes

# ## 1. [Issue Name]
# *Category:* [Navigation, Layout and Design, Copywright]
# *Problem:* [Describe the issue]
# *URL/path:* [If the issue is on a page, provide the URL. If its on a path define the path.]
# *Why it's a problem:* [Explain the impact on user experience]
# *Objective/Subjective:* [Objective, Subjective]
# *Fix:* [Provide an actionable solution]
# *Severity:* [Very Low, Low, Medium, High, Very High. Based on user imapct, frequency and context]

# ## 2. [Issue Name]
# ...

# Continue this format for all identified issues. Ensure that your fixes are specific, actionable, and easy to implement.
# """

landing_page_prompt = """
# You are a UI/UX/CRO expert tasked with reviewing a Landing page and identifying potential issues along with actionable fixes. 
# Your goal is to provide a comprehensive list of UI/UX/CRO problems and their solutions in a clear, easy-to-implement format.

# Conduct a thorough review of the Landing page, paying attention to the following aspects, but not limited to:
# 1. Copywright - Check if the content is clear, cohesive and engaging
# 2. Layout and design - Check if the layout is consistent and if the design is cohesive


# As you review each aspect, document any issues you encounter. 
# For each issue:
# 1. Categorise the issue within Copywright or Layout and Design
# 2. Clearly describe the problem
# 3. Define the issue as either objective or subjective
# 4. Explain why it's an issue
# 5. Provide a clear, actionable and easy-to-implement fix or alternative


# After completing your review, compile your findings into a markdown-formatted list. Use the following structure:

# # UI/UX/CRO Landing Page Issues and Fixes

# ## 1. [Issue Name]
# *Category:* [Copywright, Layout and Design]
# *Problem:* [Describe the issue]
# *URL/path:* [If the issue is on a page, provide the URL. If its on a path define the path.]
# *Why it's a problem:* [Explain the impact on user experience]
# *Objective/Subjective:* [Objective, Subjective]
# *Fix/Alternative:* [Provide an actionable solution or alternative]
# *Severity:* [Very Low, Low, Medium, High, Very High. Based on user imapct, frequency and context]

# ## 2. [Issue Name]
# ...

# Continue this format for all identified issues. Ensure that your fixes are specific, actionable, and easy to implement.
# """

pricing_page_prompt = """
# You are a UI/UX/CRO expert tasked with reviewing a website's pricing page and identifying potential issues along with actionable fixes. 
# Your goal is to provide a comprehensive list of UI/UX/CRO problems and their solutions in a clear, easy-to-implement format.

# Conduct a thorough review of the pricing page, paying attention to the following aspects, but not limited to:
# 1. Copywright - Check if the content is clear, cohesive and engaging
# 2. Layout and design - Check if the layout is consistent and if the design is cohesive


# As you review each aspect, document any issues you encounter. 
# For each issue:
# 1. Categorise the issue within Copywright or Layout and Design
# 2. Clearly describe the problem
# 3. Define the issue as either objective or subjective
# 4. Explain why it's an issue
# 5. Provide a clear, actionable and easy-to-implement fix or alternative

# After completing your review, compile your findings into a markdown-formatted list. Use the following structure:

# # UI/UX/CRO Pricing Page Issues and Fixes

# ## 1. [Issue Name]
# *Category:* [Copywright, Layout and Design]
# *Problem:* [Describe the issue]
# *URL/path:* [If the issue is on a page, provide the URL. If its on a path define the path.]
# *Why it's a problem:* [Explain the impact on user experience]
# *Objective/Subjective:* [Objective, Subjective]
# *Fix/Alternative:* [Provide an actionable solution or alternative]
# *Severity:* [Very Low, Low, Medium, High, Very High. Based on user imapct, frequency and context]

# ## 2. [Issue Name]
# ...

# Continue this format for all identified issues. Ensure that your fixes are specific, actionable, and easy to implement.
# """


forms_and_inputs_prompt = """

# You are a UI/UX/CRO expert tasked with reviewing a website's forms and inputs and identifying potential issues along with actionable fixes. 
# Your goal is to provide a comprehensive list of UI/UX/CRO problems and their solutions in a clear, easy-to-implement format.

# Conduct a thorough review of the form and inputs page, paying attention to the following aspects, but not limited to:

# 1. User Flow - Check if the flow is intuitive and if its not longer than it could be
# 2. Copywright - Check if the content is clear
# 3. Layout and design - Check if the layout is consistent and if the design is cohesive
# 4. Error messages - Check error message are clear and helpful
# 5. Labels - Ensure every input field has a clear label
# 6. Long Forms Without Grouping - Check if the form is too long and if the user can easily navigate through it


# As you review each aspect, document any issues you encounter. 
# For each issue:
# 1. Categorise the issue within User Flow, Copywright, Layout and Design, Error messages, Labels, Placeholders, Long Forms Without Grouping
# 2. Clearly describe the problem
# 3. Define the issue as either objective or subjective
# 4. Explain why it's an issue
# 5. Provide a clear, actionable and easy-to-implement fix or alternative

# If you are on a signup page that requires you to check your email, do not attempt to check your email.
# Stop their and provide the review up until that point
# After completing your review, compile your findings into a markdown-formatted list. Use the following structure:

# # UI/UX/CRO Forms and Inputs Page Issues and Fixes

# ## 1. [Issue Name]
# *Category:* [User Flow,Copywright, Layout and Design, Error messages, Labels, Placeholders, Long Forms Without Grouping]
# *Problem:* [Describe the issue]
# *URL/path:* [If the issue is on a page, provide the URL. If its on a path define the path.]
# *Why it's a problem:* [Explain the impact on user experience]
# *Objective/Subjective:* [Objective, Subjective]
# *Fix/Alternative:* [Provide an actionable solution or alternative]
# *Severity:* [Very Low, Low, Medium, High, Very High. Based on user imapct, frequency and context]

# ## 2. [Issue Name]
# ...

# Continue this format for all identified issues. Ensure that your fixes are specific, actionable, and easy to implement.
# """


# accessibility_prompt = """
# You are an accessibility expert tasked with reviewing a webpage and identifying potential issues along with actionable fixes. Your goal is to provide a comprehensive list of accessibility problems and their solutions in a clear, easy-to-implement format.

# Conduct a thorough review of the webpage and as you review each aspect, document any issues you encounter. 

# For each issue:
# 1. Clearly describe the problem
# 2. Categorize the issue as either objective or subjective
# 2. Explain why it's an accessibility issue
# 3. Provide a clear, actionable and easy-to-implement fix

# Remember that you may need to click on the "Login" button to access certain parts of the page. However, do not test the billing pages. You can still mention potential issues related to billing pages based on visible elements, but do not attempt to interact with them.


# After completing your review, compile your findings into a markdown-formatted list. Use the following structure:

# # UI/UX Issues and Fixes

# ## 1. [Issue Name]
# *Problem:* [Describe the issue]
# *Why it's a problem:* [Explain the impact on user experience]
# *Category:* [Objective, Subjective]
# *Fix:* [Provide an actionable solution]
# *Severity:* [Very Low, Low, Medium, High, Very High. Based on user imapct, frequency and context]

# ## 2. [Issue Name]
# ...

# Continue this format for all identified issues. Ensure that your fixes are specific, actionable, and easy to implement. Only put really import issues.
# """

# copywriting_prompt = """
# You are a Copywriting expert tasked with reviewing a webpage and identifying potential issues in messaging - along with actionable fixes. Your goal is to provide a comprehensive list of messaging problems and alternative solutions in a clear, easy-to-implement format.

# Conduct a thorough review of the webpage and as you review each aspect, document any issues you encounter. 

# For each issue:
# 1. Clearly describe the problem
# 2. Categorize the issue as either objective or subjective
# 2. Explain why it's an issue
# 3. Provide a better alternative

# Remember that you may need to click on the "Login" button to access certain parts of the page. However, do not test the billing pages. You can still mention potential issues related to billing pages based on visible elements, but do not attempt to interact with them.

# After completing your review, compile your findings into a markdown-formatted list. Use the following structure:

# # Copywriting Issues and Fixes

# ## 1. [Issue Name]
# *Problem:* [Describe the issue]
# *Why it's a problem:* [Explain the impact on user experience]
# *Category:* [Objective, Subjective]
# *Alternative:* [Provide an alternative]
# *Severity:* [Very Low, Low, Medium, High, Very High. Based on user imapct, frequency and context]

# ## 2. [Issue Name]
# ...

# Continue this format for all identified issues. Ensure that your fixes are specific, actionable, and easy to implement. Only put really import issues.
# """




async def main():

    output = {}
    for url in WEBSITES:

        print(f"======= Testing {url} =======")

        # browser = Browser(config=BrowserConfig(headless=HEADLESS))
        # browser = Browser(config=BrowserConfig(headless=False, chrome_instance_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"))
        browser = Browser(config=BrowserConfig(headless=False))
        context = BrowserContext(browser=browser, config=config)

        agent = Agent(
            task=landing_page_prompt,
            llm=AGENT_LLM,
            initial_actions=[{'go_to_url': {'url': url}}],
            # controller=Controller(output_model=GeneratedTestPlan),
            browser_context=context,
            generate_gif=f"/tmp/output_{url.replace('https://', '').replace('/', '_')}.gif",
        )

        try:
            history = await agent.run()
            # history = await agent.run(max_steps=3)
            output[url] = history.final_result()
        finally:
            await browser.close()
            await context.close()

    for url, result in output.items():
        print(f"======= {url} =======")
        print(result)
        print("\n\n")


if __name__ == "__main__":
    asyncio.run(main())