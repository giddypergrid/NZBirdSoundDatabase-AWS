from concurrent.futures import ThreadPoolExecutor

import httpx
import pytest


MIN_MEDIA_BYTES = 100
IMAGE_SIGNATURES = (b"\xff\xd8\xff", b"\x89PNG", b"RIFF")
AUDIO_SIGNATURES = (b"fLaC", b"RIFF", b"ID3", b"\xff\xfb")


def _assert_status(response, expected_status):
    assert response.status_code == expected_status, (
        f"Expected HTTP {expected_status}, got HTTP {response.status_code} for "
        f"{response.request.method} {response.request.url}. "
        f"Response body: {response.text[:1000]}"
    )


def _json(response):
    assert response.headers["content-type"].startswith("application/json")
    return response.json()


def _results(body):
    return body.get("results", body)


def _assert_bird_contract(bird):
    assert isinstance(bird["eBird"], str)
    assert bird["eBird"]
    assert isinstance(bird["common_name"], str)
    assert bird["common_name"]
    assert isinstance(bird["scientific_name"], str)
    assert bird["scientific_name"]
    assert "description" in bird
    assert "sound_description" in bird


def _assert_sound_contract(sound, expected_bird_id):
    assert isinstance(sound["id"], int)
    assert sound["eBird"] == expected_bird_id
    assert isinstance(sound["filename"], str)
    assert sound["filename"]
    assert isinstance(sound["secondary_labels"], list)
    assert "file_type" in sound


def _assert_media_response(response, expected_signatures):
    _assert_status(response, 200)
    assert len(response.content) > MIN_MEDIA_BYTES
    assert response.content.startswith(expected_signatures)


@pytest.fixture(scope="session")
def sampled_birds(api_client, sample_size):
    response = api_client.get(f"/birds/api/birds/?random=true&quantity={sample_size}")
    _assert_status(response, 200)

    birds = _results(_json(response))
    assert len(birds) == sample_size

    for bird in birds:
        _assert_bird_contract(bird)

    return birds


@pytest.fixture(scope="session")
def sampled_birds_with_sounds(api_client, sampled_birds, sample_size):
    birds_with_sounds = []
    checked = set()

    def add_if_sound_exists(bird):
        bird_id = bird["eBird"]
        if bird_id in checked:
            return
        checked.add(bird_id)

        response = api_client.get(f"/birds/api/sounds/bird-label/{bird_id}/")
        _assert_status(response, 200)
        sounds = _results(_json(response))
        if not sounds:
            return

        _assert_sound_contract(sounds[0], bird_id)
        birds_with_sounds.append({"bird": bird, "sounds": sounds})

    for bird in sampled_birds:
        add_if_sound_exists(bird)

    attempts = 0
    while len(birds_with_sounds) < sample_size and attempts < 5:
        attempts += 1
        response = api_client.get(f"/birds/api/birds/?random=true&quantity={sample_size}")
        _assert_status(response, 200)
        for bird in _results(_json(response)):
            add_if_sound_exists(bird)

    if not birds_with_sounds:
        pytest.fail("No sampled birds had sound metadata available.")

    return birds_with_sounds[:sample_size]


@pytest.mark.live
def test_health_check_reports_ready(api_client):
    response = api_client.get("/birds/api/healthz/")

    _assert_status(response, 200)
    body = _json(response)
    assert body["status"] == "ok"
    assert body["db"] == "ok"
    assert body["env"] == "production"


@pytest.mark.live
def test_bird_list_returns_seeded_data(api_client):
    response = api_client.get("/birds/api/birds/")

    _assert_status(response, 200)
    results = _results(_json(response))
    assert isinstance(results, list)
    assert len(results) > 0
    _assert_bird_contract(results[0])


@pytest.mark.live
def test_sampled_bird_details_match_list_contract(api_client, sampled_birds):
    for bird in sampled_birds:
        response = api_client.get(f"/birds/api/birds/{bird['eBird']}/")

        _assert_status(response, 200)
        body = _json(response)
        _assert_bird_contract(body)
        assert body["eBird"] == bird["eBird"]


@pytest.mark.live
def test_missing_bird_returns_404(api_client):
    response = api_client.get("/birds/api/birds/does-not-exist-999/")

    _assert_status(response, 404)


@pytest.mark.live
def test_unknown_url_returns_404_not_server_error(api_client):
    response = api_client.get("/not-a-real-api-path/")

    _assert_status(response, 404)


@pytest.mark.live
def test_audio_path_traversal_is_blocked(api_client, sampled_birds):
    bird_id = sampled_birds[0]["eBird"]
    response = api_client.get(
        f"/birds/api/audio/{bird_id}/..%2F..%2Fsecret.txt/"
    )

    assert response.status_code in {403, 404}, (
        f"Expected HTTP 403 or 404, got HTTP {response.status_code} for "
        f"{response.request.method} {response.request.url}. "
        f"Response body: {response.text[:1000]}"
    )


@pytest.mark.live
def test_sampled_bird_sound_metadata_contracts(sampled_birds_with_sounds):
    assert len(sampled_birds_with_sounds) > 0


@pytest.mark.live
def test_sampled_audio_files_stream_from_metadata(api_client, sampled_birds_with_sounds):
    for sample in sampled_birds_with_sounds:
        bird_id = sample["bird"]["eBird"]
        filename = sample["sounds"][0]["filename"]

        file_response = api_client.get(f"/birds/api/audio/{bird_id}/{filename}/")

        _assert_media_response(file_response, AUDIO_SIGNATURES)


@pytest.mark.live
def test_sampled_images_stream_from_efs(api_client, sampled_birds):
    missing = []
    for bird in sampled_birds:
        response = api_client.get(f"/birds/api/image/{bird['eBird']}/0/")
        if response.status_code == 404:
            missing.append(bird["eBird"])
            continue

        _assert_media_response(response, IMAGE_SIGNATURES)
        assert response.headers["content-type"].startswith("image/")
        return

    pytest.skip(f"No sampled birds had image 0 available. Missing: {missing}")


@pytest.mark.live
def test_search_by_description_returns_contract(api_client):
    response = api_client.get(
        "/birds/api/search-by-description/",
        params={"query": "wetland booming bird", "top_k": 3},
    )

    _assert_status(response, 200)
    body = _json(response)
    assert body["query"] == "wetland booming bird"
    assert body["count"] == len(body["results"])
    assert len(body["results"]) <= 3
    for hit in body["results"]:
        assert isinstance(hit["eBird"], str)
        assert isinstance(hit["score"], float)
        assert isinstance(hit["strong_match"], bool)


@pytest.mark.live
def test_invalid_classify_extension_returns_400(api_client):
    response = api_client.post(
        "/birds/api/classify/?ext=exe",
        content=b"not real audio",
        headers={"content-type": "application/octet-stream"},
    )

    _assert_status(response, 400)


@pytest.mark.live
def test_empty_classify_body_returns_400(api_client):
    response = api_client.post(
        "/birds/api/classify/?ext=wav",
        content=b"",
        headers={"content-type": "application/octet-stream"},
    )

    _assert_status(response, 400)


@pytest.mark.live
def test_oversized_classify_upload_is_rejected(api_client):
    six_mb = b"0" * (6 * 1024 * 1024)

    response = api_client.post(
        "/birds/api/classify/?ext=wav",
        content=six_mb,
        headers={"content-type": "application/octet-stream"},
    )

    assert response.status_code in {400, 413, 429}, (
        f"Expected HTTP 400, 413, or 429, got HTTP {response.status_code} for "
        f"{response.request.method} {response.request.url}. "
        f"Response body: {response.text[:1000]}"
    )


@pytest.mark.live
def test_invalid_query_params_return_400(api_client):
    response = api_client.get("/birds/api/birds/?quantity=not-an-integer")

    _assert_status(response, 400)


@pytest.mark.live
@pytest.mark.slow
def test_full_bird_retrieval_does_not_crash(api_client):
    response = api_client.get("/birds/api/birds/?quantity=-1")

    _assert_status(response, 200)
    body = _json(response)
    assert isinstance(body, list)
    assert len(body) > 0
    _assert_bird_contract(body[0])


@pytest.mark.live
@pytest.mark.slow
def test_health_endpoint_handles_parallel_burst(api_base_url):
    def call_health():
        with httpx.Client(base_url=api_base_url, timeout=10.0) as client:
            return client.get("/birds/api/healthz/").status_code

    with ThreadPoolExecutor(max_workers=20) as pool:
        statuses = list(pool.map(lambda _: call_health(), range(50)))

    assert all(status == 200 for status in statuses)
