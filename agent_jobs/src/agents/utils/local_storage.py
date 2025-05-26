import json

from typing import Callable

from browser_use.browser.context import BrowserContext


async def load_local_storage(
    context: BrowserContext, localStorage: dict[str, str]
) -> None:
    load_script = (
        """
    (storage => {
        Object.keys(storage).forEach(key => {
            localStorage.setItem(key, storage[key]);
        });
    })(%s)
    """.strip()
        % json.dumps(localStorage)
    )

    await context.execute_javascript(load_script)


async def get_local_storage(context: BrowserContext) -> Callable:
    return await context.execute_javascript(
        """
    (() => {
        const items = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            items[key] = localStorage.getItem(key);
        }
        return items;
    })()
    """.strip()
    )
