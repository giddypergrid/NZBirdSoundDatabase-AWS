from concurrent.futures import ThreadPoolExecutor

import httpx
import pytest


HEAVY_BURST_SIZE = 8
CLASSIFY_BURST_SIZE = 4
ALLOWED_BUSY_STATUSES = {200, 503}
CLASSIFY_AUDIO_BIRD = "ausbit1"
CLASSIFY_AUDIO_FILE = "Y140_BIRP_20211014_021504_000.flac"


def _call_semantic_search(api_base_url, index):
    query = f"wetland booming bird load guard probe {index}"
    with httpx.Client(base_url=api_base_url, timeout=45.0) as client:
        return client.get(
            "/birds/api/search-by-description/",
            params={"query": query, "top_k": 3},
        )


def _call_classify(api_base_url, audio_bytes):
    with httpx.Client(base_url=api_base_url, timeout=60.0) as client:
        return client.post(
            "/birds/api/classify/",
            params={"ext": "flac"},
            content=audio_bytes,
            headers={"content-type": "application/octet-stream"},
        )


def _assert_busy_response(response):
    assert response.headers.get("Retry-After"), response.text[:1000]
    body = response.json()
    assert body["error"] == "Server busy. Try again shortly."
    assert body["reason"] in {"too_many_path_requests", "too_many_requests", "low_memory"}
    assert body["request_id"]


@pytest.mark.live
@pytest.mark.slow
def test_heavy_endpoint_returns_controlled_back_pressure(api_base_url):
    with ThreadPoolExecutor(max_workers=HEAVY_BURST_SIZE) as pool:
        responses = list(
            pool.map(
                lambda index: _call_semantic_search(api_base_url, index),
                range(HEAVY_BURST_SIZE),
            )
        )

    statuses = [response.status_code for response in responses]
    print(f"Traffic guard statuses: {statuses}")
    assert all(status in ALLOWED_BUSY_STATUSES for status in statuses), (
        f"Expected only 200 or controlled 503 responses, got {statuses}"
    )
    assert any(status == 200 for status in statuses), (
        f"Expected at least one heavy request to complete, got {statuses}"
    )
    assert any(status == 503 for status in statuses), (
        "Traffic guard did not reject any overlapping heavy requests. "
        f"Statuses: {statuses}"
    )

    for response in responses:
        if response.status_code != 503:
            continue

        _assert_busy_response(response)


@pytest.mark.live
@pytest.mark.slow
def test_classify_endpoint_returns_controlled_back_pressure(api_client, api_base_url):
    audio_response = api_client.get(
        f"/birds/api/audio/{CLASSIFY_AUDIO_BIRD}/{CLASSIFY_AUDIO_FILE}/"
    )
    assert audio_response.status_code == 200, audio_response.text[:1000]

    with ThreadPoolExecutor(max_workers=CLASSIFY_BURST_SIZE) as pool:
        responses = list(
            pool.map(
                lambda _: _call_classify(api_base_url, audio_response.content),
                range(CLASSIFY_BURST_SIZE),
            )
        )

    statuses = [response.status_code for response in responses]
    print(f"Classify guard statuses: {statuses}")
    assert all(status in ALLOWED_BUSY_STATUSES for status in statuses), (
        f"Expected only 200 or controlled 503 responses, got {statuses}"
    )
    assert any(status == 200 for status in statuses), (
        f"Expected at least one classify request to complete, got {statuses}"
    )
    assert any(status == 503 for status in statuses), (
        "Traffic guard did not reject any overlapping classify requests. "
        f"Statuses: {statuses}"
    )

    for response in responses:
        if response.status_code != 503:
            continue

        _assert_busy_response(response)
