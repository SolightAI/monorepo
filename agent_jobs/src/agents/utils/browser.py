from browser_use import Browser, BrowserConfig

# These flags are required to run the agent in AWS Lambda
DEFAULT_EXTRA_BROWSER_ARGS = [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--single-process",
    "--no-zygote",
    "--disable-setuid-sandbox",
]


def create_browser(
    headless: bool = True,
    extra_browser_args: list[str] = [],
) -> Browser:
    extra_browser_args.extend(DEFAULT_EXTRA_BROWSER_ARGS)

    return Browser(
        config=BrowserConfig(
            headless=headless,
            extra_browser_args=extra_browser_args,
        )
    )
