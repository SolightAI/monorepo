from langchain_openai import ChatOpenAI

"""
Confidence levels for login page detection.
"""
CONFIDENCE_HIGH = "high"
CONFIDENCE_MEDIUM = "medium"
CONFIDENCE_LOW = "low"

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

