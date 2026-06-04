import httpx
import pytest


CONTROLLED_CLIENT_ERROR_STATUSES = {400, 403, 404, 405}


def _request(api_client, method, path, **kwargs):
    try:
        return getattr(api_client, method)(path, **kwargs)
    except httpx.HTTPError as exc:
        pytest.fail(
            f"{method.upper()} {path} failed before a controlled response: {exc}",
            pytrace=False,
        )


def _assert_not_server_error(response):
    assert response.status_code < 500, (
        f"Expected a controlled response, got HTTP {response.status_code} for "
        f"{response.request.method} {response.request.url}. "
        f"Response body: {response.text[:1000]}"
    )


@pytest.mark.live
@pytest.mark.parametrize("quantity", ["0", "-999", "999999"])
def test_bird_list_quantity_boundaries_are_controlled(api_client, quantity):
    response = _request(api_client, "get", "/birds/api/birds/", params={"quantity": quantity})

    _assert_not_server_error(response)
    assert response.status_code in {200, 400}


@pytest.mark.live
@pytest.mark.parametrize(
    "params",
    [
        {"query": "not-a-real-bird 12345 !?", "top_k": 3},
        {"query": "<script>alert('x')</script>", "top_k": 3},
        {"query": "wetland bird", "top_k": 0},
        {"query": "wetland bird", "top_k": 9999},
        {"query": "wetland bird", "threshold": -1},
        {"query": "wetland bird", "threshold": 2},
        {"query": "x" * 600},
    ],
)
def test_semantic_search_weird_inputs_are_controlled(api_client, params):
    response = _request(
        api_client,
        "get",
        "/birds/api/search-by-description/",
        params=params,
    )

    _assert_not_server_error(response)
    assert response.status_code in {200, 400, 429, 503}


@pytest.mark.live
@pytest.mark.parametrize(
    "path",
    [
        "/birds/api/audio/ausbit1/..%2F..%2Fsecret.txt/",
        "/birds/api/image/..%2F..%2Fsecret/0/",
    ],
)
def test_media_path_traversal_attempts_are_controlled(api_client, path):
    response = _request(api_client, "get", path)

    _assert_not_server_error(response)
    assert response.status_code in {403, 404}


@pytest.mark.live
@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("post", "/birds/api/birds/"),
        ("delete", "/birds/api/birds/ausbit1/"),
        ("put", "/birds/api/sounds/1/"),
    ],
)
def test_read_only_endpoints_reject_write_methods(api_client, method, path):
    response = _request(api_client, method, path)

    _assert_not_server_error(response)
    assert response.status_code == 405
