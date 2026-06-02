import os

import httpx
import pytest


DEFAULT_API_BASE_URL = (
    "http://nz-birdsound-alb-1901341595.ap-southeast-2.elb.amazonaws.com"
)
DEFAULT_SAMPLE_SIZE = 3


@pytest.fixture(scope="session")
def api_base_url():
    return os.getenv("API_BASE_URL", DEFAULT_API_BASE_URL).rstrip("/")


@pytest.fixture(scope="session")
def sample_size():
    return int(os.getenv("LIVE_TEST_SAMPLE_SIZE", DEFAULT_SAMPLE_SIZE))


@pytest.fixture(scope="session")
def api_client(api_base_url):
    with httpx.Client(base_url=api_base_url, timeout=30.0) as client:
        yield client
