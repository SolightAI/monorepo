from browser_use import Browser, BrowserConfig

# These flags are required to run the agent in AWS Lambda
DEFAULT_EXTRA_BROWSER_ARGS = [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-zygote",
    "--disable-setuid-sandbox",
    "--disable-dev-tools",
    "--disable-extensions",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
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
