"""
Website Link Checker

This script checks all links on a website for issues such as broken links (404),
redirects to wrong environments, and other HTTP errors.

It uses Playwright to render JavaScript-heavy pages and follows links to create
a comprehensive report of link health across the site.

Usage:
    python link_checker.py

Requirements:
    - playwright
    - asyncio
    - csv
    - datetime
    - urllib.parse
    - typing
"""

import csv
import asyncio
import logging

from enum import Enum
from datetime import datetime
from typing import List, Set, Dict, Any
from urllib.parse import urlparse
from playwright.async_api import async_playwright, Response, Page, Browser, BrowserContext
from playwright.async_api import Error

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("LinkChecker")


class Status(Enum):
    """Enum for link check status values."""
    ERROR = "ERROR"
    WARNING = "WARNING"
    BROKEN = "BROKEN"
    OK = "OK"
    REDIRECT = "REDIRECT"
    WRONG_ENVIRONMENT = "WRONG_ENVIRONMENT"


class LinkChecker:
    """
    A class to check links on a website for various issues.

    This class crawls a website starting from a given URL, checks all links
    found on each page, and reports issues such as broken links, redirects
    to wrong environments, and other HTTP errors.

    The LinkChecker class contains methods to:
    - Check for broken links (404s)
    - Check for redirect loops
    - Check for SSL/TLS certificate issues
    - Detect soft 404s (pages returning 200 but are actually error pages)
    - Track response times and flag slow responses
    - Detect redirects to wrong environments (e.g., staging, dev)
    - Detect mixed content issues
    - Detect CORS issues

    Attributes:
        base_domain (str): The domain part of the start_url.
        start_url (str): The URL to start checking from.
        output_file (str): The file to write the results to.
        check_ssl (bool): Whether to check for SSL issues.
        slow_response_threshold (int): The threshold for slow responses in ms.
        max_concurrent_checks (int): Maximum number of concurrent link checks.
        concurrency_semaphore (asyncio.Semaphore): Semaphore for concurrency control.
        to_visit (List[str]): URLs to be visited.
        visited_urls (Set[str]): URLs already visited.
        checked_urls (Set[str]): URLs already checked for broken links.
        results (List[Dict[str, Any]]): Results of the link checks.
        wrong_env_patterns (List[str]): Patterns that indicate wrong environment.
        stats (Dict[str, int]): Statistics about the checks performed.
        trusted_domains (List[str]): List of trusted domains to skip soft 404 checks.
    """

    def __init__(self, start_url: str, output_file: str,
                  check_ssl: bool = True, slow_response_threshold: int = 5000,
                  max_concurrent_checks: int = 5, check_slow_response: bool = True) -> None:
        """
        Initialize the LinkChecker.

        Args:
            start_url: The URL to start checking from.
            output_file: The file to write the results to (default: None).
            check_ssl: Whether to check for SSL issues (default: True).
            slow_response_threshold: The threshold for slow responses in ms (default: 5000).
            max_concurrent_checks: Maximum number of concurrent link checks (default: 5).
            check_slow_response: Whether to check for slow responses (default: True).
        """
        # Parse the start URL
        parsed_url = urlparse(start_url)
        self.base_domain = parsed_url.netloc
        self.start_url = start_url
        self.output_file = output_file
        self.check_ssl = check_ssl
        self.slow_response_threshold = slow_response_threshold
        self.check_slow_response = check_slow_response

        # Concurrency control
        self.max_concurrent_checks = max_concurrent_checks
        self.concurrency_semaphore = None  # Will be initialized in run()

        # Tracking
        self.to_visit: List[str] = [start_url]
        self.visited_urls: Set[str] = set()
        self.checked_urls: Set[str] = set()
        self.results: List[Dict[str, Any]] = []

        # Trusted domains to skip soft 404 checks
        self.trusted_domains: List[str] = ['googletagmanager.com', 'www.googletagmanager.com']

        # Configure what counts as a "wrong environment"
        self.wrong_env_patterns: List[str] = ['staging', 'dev', 'test', 'uat', "testing", "development", "development"]
        logger.info(f"Wrong environment patterns configured: {', '.join(self.wrong_env_patterns)}")

        # Feature toggles
        logger.info(f"SSL/TLS certificate checking: {'enabled' if check_ssl else 'disabled'}")
        logger.info(f"Slow response checking: {'enabled' if check_slow_response else 'disabled'}")

        # Performance thresholds (in milliseconds)
        if check_slow_response:
            logger.info(f"Slow response threshold set to: {self.slow_response_threshold}ms")

        # Track issues
        self.ssl_issues: Dict[str, str] = {}
        self.mixed_content_issues: Dict[str, List[str]] = {}
        self.cors_issues: Dict[str, List[str]] = {}

        # Statistics
        self.stats = {
            "pages_checked": 0,
            "links_checked": 0,
            "broken_links": 0,
            "redirects": 0,
            "wrong_env": 0,
            "ssl_issues": 0,
            "mixed_content": 0,
            "cors_issues": 0,
            "slow_responses": 0,
            "console_messages": 0,
            "special_protocol_links": 0
        }

    async def run(self, max_pages: int = 100) -> List[Dict[str, Any]]:
        """
        Run the link checker.

        This method crawls the website starting from the start URL, checks all links
        found on each page, and reports issues.

        Args:
            max_pages: Maximum number of pages to crawl.

        Returns:
            A list of dictionaries containing the results for each link checked.
        """
        logger.info(f"Starting link checking process from {self.start_url} (max pages: {max_pages})")
        logger.info(f"Maximum concurrent link checks: {self.max_concurrent_checks}")

        # Initialize the concurrency semaphore
        self.concurrency_semaphore = asyncio.Semaphore(self.max_concurrent_checks)

        async with async_playwright() as p:
            logger.info("Launching browser...")
            browser: Browser = await p.chromium.launch()

            modern_user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

            # Common browser headers that help avoid detection
            extra_headers = {
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "Connection": "keep-alive",
                "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"Windows"',
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
            }

            context: BrowserContext = await browser.new_context(
                user_agent=modern_user_agent,
                extra_http_headers=extra_headers,
                ignore_https_errors=True  # Allow visiting pages with SSL issues
            )
            page: Page = await context.new_page()
            logger.info("Browser launched successfully")

            # Set up response handling
            page.on("response", lambda response: asyncio.create_task(
                self.handle_response(response)
            ))

            # Set up console message handling for CORS and mixed content issues
            page.on("console", lambda msg: asyncio.create_task(
                self.handle_console_message(msg, page.url)
            ))

            while self.to_visit and len(self.visited_urls) < max_pages:
                current_url: str = self.to_visit.pop(0)
                if current_url in self.visited_urls:
                    continue

                logger.info(f"Checking page [{len(self.visited_urls)+1}/{max_pages}]: {current_url}")
                self.visited_urls.add(current_url)
                self.stats["pages_checked"] += 1

                try:
                    # Navigate to the page
                    await page.goto(current_url, wait_until="load")

                    # Extract all links on the page
                    links: List[Dict[str, Any]] = await page.evaluate('''() => {
                        return Array.from(document.querySelectorAll('a[href]'))
                            .map(a => {
                                // Generate CSS selector
                                function generateCssSelector(el) {
                                    if (el.id) {
                                        return `#${el.id}`;
                                    }

                                    let path = [];
                                    let parent = el;

                                    while (parent && parent.tagName !== 'HTML') {
                                        let selector = parent.tagName.toLowerCase();

                                        if (parent.className) {
                                            const classes = Array.from(parent.classList).join('.');
                                            if (classes) {
                                                selector += `.${classes}`;
                                            }
                                        }

                                        if (parent.parentNode) {
                                            const siblings = Array.from(parent.parentNode.children).filter(
                                                child => child.tagName === parent.tagName
                                            );

                                            if (siblings.length > 1) {
                                                const index = siblings.indexOf(parent) + 1;
                                                selector += `:nth-child(${index})`;
                                            }
                                        }

                                        path.unshift(selector);
                                        parent = parent.parentNode;
                                    }

                                    return path.join(' > ');
                                }

                                // Generate XPath
                                function generateXPath(el) {
                                    if (el.id) {
                                        return `//*[@id="${el.id}"]`;
                                    }

                                    let path = [];
                                    let parent = el;

                                    while (parent && parent.tagName !== 'HTML') {
                                        let tag = parent.tagName.toLowerCase();
                                        let siblings = Array.from(parent.parentNode.children).filter(
                                            child => child.tagName === parent.tagName
                                        );

                                        if (siblings.length > 1) {
                                            const index = siblings.indexOf(parent) + 1;
                                            tag += `[${index}]`;
                                        }

                                        path.unshift(tag);
                                        parent = parent.parentNode;
                                    }

                                    return '//' + path.join('/');
                                }

                                return {
                                    href: a.href,
                                    text: a.innerText.trim().substring(0, 100),
                                    location: a.getBoundingClientRect().top,
                                    cssSelector: generateCssSelector(a),
                                    xpath: generateXPath(a)
                                };
                            });
                    }''')

                    logger.info(f"Found {len(links)} links on {current_url}")

                    # Process each link
                    link_check_tasks = []
                    for link in links:
                        full_url: str = link['href']

                        # Only add internal links to the visit queue
                        if urlparse(full_url).netloc == self.base_domain and full_url not in self.visited_urls:
                            self.to_visit.append(full_url)

                        # Check this link only if it hasn't been checked before
                        if full_url not in self.checked_urls:
                            # Instead of awaiting, create a task
                            link_check_tasks.append(self.check_link(page, current_url, full_url, link['text'], link['cssSelector'], link['xpath']))
                            self.checked_urls.add(full_url)

                    # Run link checking tasks concurrently
                    if link_check_tasks:
                        await asyncio.gather(*link_check_tasks)

                except Exception as e:
                    logger.error(f"Error processing page {current_url}: {str(e)}")
                    self.results.append({
                        'source_page': current_url,
                        'link_url': current_url,
                        'link_text': 'N/A',
                        'status': Status.ERROR.value,
                        'status_code': 'N/A',
                        'issue': str(e),
                        'final_url': 'N/A',
                        'css_selector': 'N/A',
                        'xpath': 'N/A'
                    })

            logger.info(f"Finished checking {len(self.visited_urls)} pages, closing browser")
            await browser.close()
            self.save_results()
            self._log_summary()
            return self.results

    async def check_link(self, page: Page, source_page: str, link_url: str, link_text: str,
                         css_selector: str = None, xpath: str = None) -> None:
        """
        Check a specific link for issues.

        This method navigates to the link URL in a new page and checks for issues
        such as 404s, redirects to wrong environments, and other HTTP errors.
        Special cases like telephone links (tel:), mailto:, and other special protocols
        are handled without navigation.

        Args:
            page: The Playwright page object.
            source_page: The URL of the page where the link was found.
            link_url: The URL of the link to check.
            link_text: The text of the link.
            css_selector: CSS selector to locate the link in the DOM.
            xpath: XPath expression to locate the link in the DOM.
        """
        # Use the semaphore to limit concurrency
        async with self.concurrency_semaphore:
            try:
                short_link_text = link_text[:30] + ('...' if len(link_text) > 30 else '')
                logger.debug(f"Checking link: '{short_link_text}' -> {link_url}")
                self.stats["links_checked"] += 1

                # Special handling for non-navigable links (tel, mailto, sms, etc.)
                special_protocols = ['tel:', 'mailto:', 'sms:', 'whatsapp:', 'skype:', 'facetime:']
                if any(link_url.startswith(protocol) for protocol in special_protocols):
                    protocol = link_url.split(':', 1)[0] + ':'
                    logger.info(f"Special protocol link detected ({protocol}): {link_url} - skipping navigation")
                    self.stats["special_protocol_links"] += 1
                    self.results.append({
                        'source_page': source_page,
                        'link_url': link_url,
                        'link_text': link_text,
                        'status': Status.OK.value,
                        'status_code': 'N/A',
                        'issue': None,
                        'final_url': link_url,
                        'css_selector': css_selector,
                        'xpath': xpath
                    })
                    return

                # Create a new page for checking this link to avoid navigating away
                try:
                    # Ensure the context is still active before creating a new page
                    if page.context.browser.is_connected():
                        async with await page.context.new_page() as check_page:
                            # Start measuring time for performance checks
                            start_time = datetime.now()

                            try:
                                # Set the Referer header to the source page
                                await check_page.set_extra_http_headers({
                                    "Referer": source_page
                                })

                                response: Response = await check_page.goto(link_url, wait_until="load", timeout=30000)

                                # Calculate response time
                                response_time = (datetime.now() - start_time).total_seconds() * 1000  # in milliseconds

                                status_code: int = response.status
                                final_url: str = check_page.url

                                result: Dict[str, Any] = {
                                    'source_page': source_page,
                                    'link_url': link_url,
                                    'link_text': link_text,
                                    'status_code': status_code,
                                    'final_url': final_url,
                                    'css_selector': css_selector,
                                    'xpath': xpath,
                                    'issue': None
                                }

                                # Check if the page is not found (404)
                                if status_code == 404:
                                    logger.warning(f"Broken link: {link_url} -> 404 Not Found")
                                    self.stats["broken_links"] += 1
                                    result['status'] = Status.BROKEN.value
                                    result['issue'] = 'Page not found (404)'

                                # Check if final URL points to a wrong environment
                                elif self._is_wrong_environment(final_url):
                                    logger.warning(f"Wrong environment detected: {link_url} -> {final_url}")
                                    self.stats["wrong_env"] += 1
                                    result['status'] = Status.WRONG_ENVIRONMENT.value
                                    result['issue'] = f"Points to wrong environment: {final_url}"

                                # Check if there was a redirect
                                # Adding elif here to prevent overwriting wrong environment status
                                elif urlparse(link_url).netloc != urlparse(final_url).netloc:
                                    # Only log redirects to different hosts
                                    logger.info(f"Redirect to different host: {link_url} -> {final_url}")
                                    self.stats["redirects"] += 1
                                    result['status'] = Status.REDIRECT.value
                                    result['issue'] = f"Redirects to: {final_url}"

                                # Check for other HTTP errors
                                elif status_code >= 400:
                                    logger.warning(f"HTTP Error: {link_url} -> {status_code}")
                                    self.stats["broken_links"] += 1
                                    result['status'] = Status.ERROR.value
                                    result['issue'] = f"HTTP Error: {status_code}"

                                # Check if the response time is slow
                                elif self.check_slow_response and response_time > self.slow_response_threshold:
                                    logger.warning(f"Slow response: {link_url} -> {response_time:.2f}ms")
                                    self.stats["slow_responses"] += 1
                                    result['status'] = Status.WARNING.value
                                    result['issue'] = f"Slow response: {response_time:.2f}ms"

                                # If no issues, mark as OK
                                else:
                                    result['status'] = Status.OK.value

                                # Add the result to the list
                                self.results.append(result)

                            except Exception as e:
                                logger.error(f"Error checking link {link_url}: {str(e)}")
                                self.results.append({
                                    'source_page': source_page,
                                    'link_url': link_url,
                                    'link_text': link_text,
                                    'status': Status.ERROR.value,
                                    'status_code': 'N/A',
                                    'issue': str(e),
                                    'final_url': 'N/A',
                                    'css_selector': css_selector,
                                    'xpath': xpath
                                })
                    else:
                        # Browser is no longer connected
                        logger.error(f"Browser disconnected, cannot check link {link_url}")
                        self.results.append({
                            'source_page': source_page,
                            'link_url': link_url,
                            'link_text': link_text,
                            'status': Status.ERROR.value,
                            'status_code': 'N/A',
                            'issue': 'Browser disconnected',
                            'final_url': 'N/A',
                            'css_selector': css_selector,
                            'xpath': xpath
                        })
                except Exception as e:
                    # Catch exceptions related to browser or page creation
                    logger.error(f"Error creating page to check link {link_url}: {str(e)}")
                    self.results.append({
                        'source_page': source_page,
                        'link_url': link_url,
                        'link_text': link_text,
                        'status': Status.ERROR.value,
                        'status_code': 'N/A',
                        'issue': f"Browser error: {str(e)}",
                        'final_url': 'N/A',
                        'css_selector': css_selector,
                        'xpath': xpath
                    })
            except Exception as e:
                logger.error(f"Error checking link {link_url}: {str(e)}")
                self.results.append({
                    'source_page': source_page,
                    'link_url': link_url,
                    'link_text': link_text,
                    'status': Status.ERROR.value,
                    'status_code': 'N/A',
                    'issue': str(e),
                    'final_url': 'N/A',
                    'css_selector': css_selector,
                    'xpath': xpath
                })

    async def handle_response(self, response: Response) -> None:
        """
        Handle a response from the server.

        This method tracks network responses to detect various issues:
        - Status codes outside 200-399 range (errors and bad redirects)
        - Soft 404s (pages that return 200 but are actually 404 pages)
        - SSL/TLS certificate issues (if enabled)
        - Slow response times

        Trusted domains listed in self.trusted_domains will skip the soft 404 check.

        Args:
            response: The response object from Playwright.
        """
        url = response.url
        status = response.status

        # Measure response time (if available)
        if self.check_slow_response:
            timing = response.request.timing if hasattr(response.request, 'timing') else None
            if timing and timing.get('responseEnd') and timing.get('requestStart'):
                response_time = timing['responseEnd'] - timing['requestStart']
                if response_time > self.slow_response_threshold:
                    logger.warning(f"Slow response detected ({response_time}ms): {url}")
                    self.stats["slow_responses"] += 1
                    self.results.append({
                        'source_page': response.request.headers.get('referer', 'Unknown'),
                        'link_url': url,
                        'link_text': 'Slow Response',
                        'status': Status.WARNING.value,
                        'status_code': status,
                        'issue': f"Slow response time: {response_time}ms (threshold: {self.slow_response_threshold}ms)",
                        'final_url': url
                    })

        # Check for SSL/TLS issues (if enabled)
        if self.check_ssl and url.startswith('https://'):
            page = response.frame.page
            if page:
                try:
                    # Check for SSL certificate issues with simplified JavaScript
                    has_ssl_issues = await page.evaluate("""
                    () => {
                      try {
                        // Verify performance API is available
                        if (!window.performance) {
                          return false;
                        }

                        // Check if getEntriesByType method exists
                        if (typeof window.performance.getEntriesByType !== 'function') {
                          return false;
                        }

                        // Get resource entries
                        const resources = window.performance.getEntriesByType('resource');

                        // Check for SSL issues
                        for (let i = 0; i < resources.length; i++) {
                          const r = resources[i];
                          if (r.name && r.name.indexOf('https://') === 0 && r.secureConnectionStart === 0) {
                            return true;
                          }
                        }
                        return false;
                      } catch (e) {
                        return false;
                      }
                    }
                    """)

                    if has_ssl_issues and url not in self.ssl_issues:
                        logger.warning(f"SSL/TLS issue detected: {url}")
                        self.stats["ssl_issues"] += 1
                        self.ssl_issues[url] = "Potential SSL/TLS certificate issue detected"
                        self.results.append({
                            'source_page': response.request.headers.get('referer', 'Unknown'),
                            'link_url': url,
                            'link_text': 'SSL Issue',
                            'status': Status.WARNING.value,
                            'status_code': status,
                            'issue': "Potential SSL/TLS certificate issue",
                            'final_url': url
                        })
                except Exception as e:
                    logger.error(f"Error checking SSL for {url}: {str(e)}")

        # Skip non-HTML resources for content checks
        content_type = response.headers.get('content-type', '')
        if not content_type.startswith('text/html'):
            return

        # Check for error status codes
        if status >= 400:
            logger.warning(f"HTTP error response ({status}): {url}")
            self.results.append({
                'source_page': response.request.headers.get('referer', 'Unknown'),
                'link_url': url,
                'link_text': 'Resource load',
                'status': Status.ERROR.value,
                'status_code': status,
                'issue': f"HTTP error: {status}",
                'final_url': url
            })

        # Check for soft 404s (pages that return 200 but are actually 404 pages)
        elif 200 <= status < 400:
            page = response.frame.page
            if page:
                try:
                    # Skip soft 404 check for trusted domains
                    parsed_url = urlparse(url)
                    domain = parsed_url.netloc
                    if any(trusted_domain in domain for trusted_domain in self.trusted_domains):
                        return

                    # Set a timeout for the evaluation to prevent hanging if navigation occurs
                    has_404_indicators = False
                    try:
                        # Look for common indicators of 404 pages using simplified JavaScript
                        has_404_indicators = await asyncio.wait_for(
                            page.evaluate("""
                            () => {
                              try {
                                // Safely get text content
                                let pageText = "";
                                if (document.body) {
                                  pageText = document.body.textContent || "";
                                }

                                // Safely get title
                                let title = document.title || "";

                                // Convert to lowercase for case-insensitive comparison
                                pageText = pageText.toLowerCase();
                                title = title.toLowerCase();

                                // Check for 404 indicators
                                return (
                                  pageText.indexOf("page not found") >= 0 ||
                                  pageText.indexOf("404") >= 0 ||
                                  pageText.indexOf("not available") >= 0 ||
                                  pageText.indexOf("does not exist") >= 0 ||
                                  pageText.indexOf("couldn't be found") >= 0 ||
                                  pageText.indexOf("no longer available") >= 0 ||
                                  title.indexOf("page not found") >= 0 ||
                                  title.indexOf("404") >= 0 ||
                                  title.indexOf("not available") >= 0 ||
                                  title.indexOf("does not exist") >= 0 ||
                                  title.indexOf("couldn't be found") >= 0 ||
                                  title.indexOf("no longer available") >= 0
                                );
                              } catch (e) {
                                return false;
                              }
                            }
                            """),
                            timeout=3.0  # 3 second timeout for evaluation
                        )
                    except asyncio.TimeoutError:
                        logger.debug(f"Soft 404 check timed out for: {url}")
                    except Error as pw_error:
                        # Handle specific Playwright errors related to navigation or execution context
                        if "Execution context was destroyed" in str(pw_error):
                            logger.debug(f"Page navigated during soft 404 check: {url}")
                        else:
                            # Log other playwright errors but continue
                            logger.debug(f"Playwright error during soft 404 check for {url}: {str(pw_error)}")

                    if has_404_indicators:
                        logger.warning(f"Soft 404 detected: {url}")
                        self.stats["broken_links"] += 1
                        self.results.append({
                            'source_page': response.request.headers.get('referer', 'Unknown'),
                            'link_url': url,
                            'link_text': 'Resource load',
                            'status': Status.BROKEN.value,
                            'status_code': status,
                            'issue': "Soft 404 - Page appears to be a 404 page despite 200 status",
                            'final_url': url
                        })
                except Exception as e:
                    # If we encounter an error checking for soft 404s, we log but continue
                    logger.error(f"Error checking for soft 404 at {url}: {str(e)}")

    async def handle_console_message(self, msg, page_url: str) -> None:
        """
        Handle console messages from the browser.
        """
        # Log console messages above a certain level
        if msg.type in ["error", "warning"]:
            self.stats["console_messages"] += 1
            logger.warning(f"Console {msg.type} on {page_url}: {msg.text}")

        text = msg.text.lower()

        # Detect CORS issues
        if "cors" in text or "cross-origin" in text or "access-control-allow-origin" in text:
            if page_url not in self.cors_issues:
                self.cors_issues[page_url] = []
            self.cors_issues[page_url].append(msg.text)

            logger.warning(f"CORS issue on {page_url}: {msg.text[:100]}...")
            self.stats["cors_issues"] += 1

            self.results.append({
                'source_page': page_url,
                'link_url': page_url,
                'link_text': 'CORS Issue',
                'status': Status.WARNING.value,
                'status_code': 'N/A',
                'issue': f"CORS issue detected: {msg.text[:100]}...",
                'final_url': page_url
            })

        # Detect mixed content warnings
        if "mixed content" in text or "insecure content" in text:
            if page_url not in self.mixed_content_issues:
                self.mixed_content_issues[page_url] = []
            self.mixed_content_issues[page_url].append(msg.text)

            logger.warning(f"Mixed content on {page_url}: {msg.text[:100]}...")
            self.stats["mixed_content"] += 1

            self.results.append({
                'source_page': page_url,
                'link_url': page_url,
                'link_text': 'Mixed Content',
                'status': Status.WARNING.value,
                'status_code': 'N/A',
                'issue': f"Mixed content detected: {msg.text[:100]}...",
                'final_url': page_url
            })

    def _is_wrong_environment(self, url: str) -> bool:
        """
        Check if a URL points to a wrong environment (dev/staging/test)
        by checking if any of the patterns appears in the subdomain.

        Args:
            url: The URL to check

        Returns:
            bool: True if the URL points to a wrong environment, False otherwise
        """
        parsed_url = urlparse(url)
        hostname = parsed_url.netloc

        # Extract the subdomain (if any)
        hostname_parts = hostname.split('.')

        # Check if any of the subdomain parts match wrong environment patterns
        if len(hostname_parts) > 2:  # Has potential subdomains
            for part in hostname_parts[:-2]:  # Exclude domain and TLD
                if any(pattern == part for pattern in self.wrong_env_patterns):
                    return True

        return False

    def _log_summary(self) -> None:
        """
        Log a summary of the link checking results.
        """
        logger.info("=" * 80)
        logger.info("LINK CHECKING SUMMARY")
        logger.info("=" * 80)
        logger.info(f"Pages checked: {self.stats['pages_checked']}")
        logger.info(f"Unique URLs checked: {len(self.checked_urls)}")
        logger.info(f"Links found (total): {self.stats['links_checked']}")
        logger.info(f"Duplicate link checks avoided: {self.stats['links_checked'] - len(self.checked_urls)}")
        logger.info(f"Broken links: {self.stats['broken_links']}")
        logger.info(f"Redirects: {self.stats['redirects']}")
        logger.info(f"Wrong environment: {self.stats['wrong_env']}")
        logger.info(f"SSL/TLS issues: {self.stats['ssl_issues']}")
        logger.info(f"Mixed content warnings: {self.stats['mixed_content']}")
        logger.info(f"CORS issues: {self.stats['cors_issues']}")
        logger.info(f"Slow responses: {self.stats['slow_responses']}")
        logger.info(f"Console messages: {self.stats['console_messages']}")
        logger.info(f"Special protocol links: {self.stats['special_protocol_links']}")
        logger.info(f"Results saved to: {self.output_file}")
        logger.info("=" * 80)

        # Calculate percentages for a health score
        total_issues = (
            self.stats['broken_links'] +
            self.stats['wrong_env'] +
            self.stats['ssl_issues'] +
            self.stats['mixed_content'] +
            self.stats['cors_issues'] +
            self.stats['slow_responses']
        )

        if self.stats['links_checked'] > 0:
            health_score = 100 - (total_issues / self.stats['links_checked'] * 100)
            logger.info(f"Overall site health score: {health_score:.2f}%")
        logger.info("=" * 80)

    def save_results(self) -> None:
        """
        Save the results to a CSV file.

        This method saves the results of the link checking to a CSV file
        specified by the output_file attribute.
        """
        logger.info(f"Saving results to {self.output_file}")
        with open(self.output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=[
                'source_page', 'link_url', 'link_text', 'status',
                'status_code', 'final_url', 'css_selector', 'xpath', 'issue'
            ])
            writer.writeheader()
            writer.writerows(self.results)
        logger.info(f"Results saved to {self.output_file}")


async def main(
    start_url: str,
    output_file: str,
    check_ssl: bool = True,
    slow_response_threshold: int = 5000,
    max_concurrent_checks: int = 5,
    check_slow_response: bool = True
) -> None:
    """
    Main function to run the link checker.

    This function initializes the LinkChecker with a starting URL,
    runs the link checker, and prints a summary of the results.

    Args:
        start_url: The URL to start checking from.
        output_file: The file to write the results to.
        check_ssl: Whether to check for SSL issues.
        slow_response_threshold: The threshold for slow responses in ms.
        max_concurrent_checks: Maximum number of concurrent link checks.
        check_slow_response: Whether to check for slow responses.
    """

    checker = LinkChecker(
        start_url,
        output_file,
        check_ssl,
        slow_response_threshold,
        max_concurrent_checks,
        check_slow_response
    )
    results = await checker.run()

    # Print summary
    total: int = len(results)
    broken: int = sum(1 for r in results if r.get('status') == Status.BROKEN.value)
    redirects: int = sum(1 for r in results if r.get('status') == Status.REDIRECT.value)
    wrong_environment: int = sum(1 for r in results if r.get('status') == Status.WRONG_ENVIRONMENT.value)
    errors: int = sum(1 for r in results if r.get('status') == Status.ERROR.value)
    special_protocols: int = sum(1 for r in results if
                              r.get('status') == Status.OK.value and r.get('link_url', '').split(':', 1)[0] + ':'
                              in ['tel:', 'mailto:', 'sms:', 'whatsapp:', 'skype:', 'facetime:'])

    print("\nSummary:")
    print(f"Total links checked: {total}")
    print(f"Broken links: {broken}")
    print(f"Redirects: {redirects}")
    print(f"Wrong environment: {wrong_environment}")
    print(f"Errors: {errors}")
    print(f"Special protocol links (tel:, mailto:, etc.): {special_protocols}")
    if check_slow_response:
        slow_responses: int = sum(1 for r in results if r.get('issue') and 'Slow response' in r.get('issue', ''))
        print(f"Slow responses: {slow_responses}")


if __name__ == "__main__":
    """
    Entry point of the script.

    This block is executed when the script is run directly.
    It calls the main function to run the link checker.
    """

    asyncio.run(main(
        start_url="https://smith.ai/",
        output_file="output.csv",
        check_ssl=False,
        slow_response_threshold=5000,
        max_concurrent_checks=5,  # WARNING: Do not increase this number, it will lead to errors / ban / block from the site
        check_slow_response=False  # Disable slow response checking
    ))
