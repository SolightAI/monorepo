import pytest
import logging
import requests

from fixtures.authentification.check_if_is_logged_in import check_is_logged_in, check_is_logged_in_using_html_diff


TICKPICK_URL = "https://tickpick_dev:tickpick.1@dev.tickpick.com/"
FARMZZ_URL = "https://www.farmzz.com/"
MEANDWHO_URL = "https://me.andwho.ai/"
TECLA_ACADEMY_URL = "https://teclaacademy.com/"

BASE_S3_BUCKET = "https://laneo-paris-public-media.s3.fr-par.scw.cloud/tests-media/check_is_logged_in"

WEBSITE_HTML_FILES = [
    pytest.param(f"{BASE_S3_BUCKET}/me_and_who/content_before_login_me.andwho.ai_.html", f"{BASE_S3_BUCKET}/me_and_who/content_after_login_me.andwho.ai_.html", id="me.andwho.ai"),
    pytest.param(f"{BASE_S3_BUCKET}/farmzz/content_before_login_www.farmzz.com_.html", f"{BASE_S3_BUCKET}/farmzz/content_after_login_www.farmzz.com_.html", id="farmzz.com"),
    pytest.param(f"{BASE_S3_BUCKET}/tecla_academy/content_before_login_teclaacademy.com_.html", f"{BASE_S3_BUCKET}/tecla_academy/content_after_login_teclaacademy.com_.html", id="teclaacademy.com"),
    pytest.param(f"{BASE_S3_BUCKET}/tickpick/content_before_login_tickpick_dev%3Atickpick.1%40dev.tickpick.com_.html", f"{BASE_S3_BUCKET}/tickpick/content_after_login_tickpick_dev%3Atickpick.1%40dev.tickpick.com_.html", id="tickpick.com"),
]


logger = logging.getLogger(__name__)


class TestCheckIsLoggedIn:

    @pytest.mark.asyncio
    @pytest.mark.parametrize('execution_number', range(10))  # high variability in the results, run 10 times
    @pytest.mark.parametrize("url", [
        "https://app.sesametime.com/",
        TICKPICK_URL,
        MEANDWHO_URL,
        FARMZZ_URL,
        TECLA_ACADEMY_URL,
        "https://app.identitymatrix.ai/",
        "https://www.typeform.com/",
        "https://www.youtube.com/"
    ])
    async def test_false_positive(
        self,
        task_id: str,
        url: str,
        execution_number: int,  # unused but keep param
    ) -> None:
        """Test authentication with valid username/password on the simple login page."""

        is_logged_in = await check_is_logged_in(
            task_id=task_id,
            url=url,
            existing_session={
                "cookies": [],
                "localStorage": {}
            },
        )

        assert is_logged_in is False

    @pytest.mark.asyncio
    @pytest.mark.parametrize('execution_number', range(3))  # Run check 3 times per website (low variability)
    @pytest.mark.parametrize('s3_before_login_html, s3_after_login_html', WEBSITE_HTML_FILES)
    async def test_false_negative(
        self,
        task_id: str,
        s3_before_login_html: str,
        s3_after_login_html: str,
        execution_number: int,  # Keep param for repeated checks
    ) -> None:
        """Test authentication check, calling the cached get_session function."""

        before_login_html = requests.get(s3_before_login_html).text
        after_login_html = requests.get(s3_after_login_html).text

        is_logged_in = await check_is_logged_in_using_html_diff(
            task_id=task_id,
            before_login_html=before_login_html,
            after_login_html=after_login_html,
        )

        assert is_logged_in is True
