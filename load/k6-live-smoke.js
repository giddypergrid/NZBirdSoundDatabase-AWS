import http from "k6/http";
import { check, sleep } from "k6";

http.setResponseCallback(http.expectedStatuses({ min: 200, max: 399 }, 429));

export const options = {
  vus: 5,
  duration: "45s",
  thresholds: {
    http_req_failed: ["rate<0.02"],
    "http_req_failed{endpoint:health}": ["rate<0.01"],
    "http_req_failed{endpoint:birds_list}": ["rate<0.01"],
    "http_req_failed{endpoint:bird_detail}": ["rate<0.01"],
    "http_req_failed{endpoint:sound_metadata}": ["rate<0.01"],
    "http_req_failed{endpoint:image}": ["rate<0.02"],
    "http_req_failed{endpoint:audio}": ["rate<0.02"],
    "http_req_failed{endpoint:semantic_search}": ["rate<0.02"],
    "http_req_failed{endpoint:classify_audio_source}": ["rate<0.02"],
    "http_req_failed{endpoint:classify}": ["rate<0.10"],
    "http_req_duration{endpoint:health}": ["avg<200", "p(95)<500"],
    "http_req_duration{endpoint:birds_list}": ["avg<500", "p(95)<1000"],
    "http_req_duration{endpoint:bird_detail}": ["avg<500", "p(95)<1000"],
    "http_req_duration{endpoint:sound_metadata}": ["avg<750", "p(95)<1500"],
    "http_req_duration{endpoint:image}": ["avg<1500", "p(95)<3000"],
    "http_req_duration{endpoint:audio}": ["avg<2500", "p(95)<5000"],
    "http_req_duration{endpoint:semantic_search}": ["avg<6000", "p(95)<8000"],
    "http_req_duration{endpoint:classify_audio_source}": ["avg<2500", "p(95)<5000"],
    "http_req_duration{endpoint:classify}": ["avg<10000", "p(95)<15000"],
  },
};

const BASE_URL =
  __ENV.API_BASE_URL ||
  "http://nz-birdsound-alb-1901341595.ap-southeast-2.elb.amazonaws.com";

const AUDIO_CASES = [
  ["ausbit1", "Y140_BIRP_20211014_021504_000.flac"],
  ["grcgre1", "grcgre1_356921_2.flac"],
  ["ausgan1", "ausgan1_293327_2.flac"],
  ["swahar1", "swahar1_395980_2.flac"],
];

const IMAGE_BIRDS = ["pabduc1", "bluduc1", "stitch1", "houspa", "saddle3", "codpet1"];

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function get(path, endpoint, params = {}) {
  return http.get(`${BASE_URL}${path}`, {
    ...params,
    tags: { endpoint },
  });
}

export default function () {
  const [audioBird, audioFile] = pick(AUDIO_CASES);
  const imageBird = pick(IMAGE_BIRDS);

  const health = get("/birds/api/healthz/", "health");
  check(health, { "health is 200": (res) => res.status === 200 });

  const birds = get("/birds/api/birds/", "birds_list");
  check(birds, { "birds list is 200": (res) => res.status === 200 });

  const birdDetail = get(`/birds/api/birds/${audioBird}/`, "bird_detail");
  check(birdDetail, { "bird detail is 200": (res) => res.status === 200 });

  const sounds = get(
    `/birds/api/sounds/bird-label/${audioBird}/`,
    "sound_metadata"
  );
  check(sounds, { "sound metadata is 200": (res) => res.status === 200 });

  const image = get(`/birds/api/image/${imageBird}/0/`, "image");
  check(image, {
    "image is 200": (res) => res.status === 200,
    "image content type": (res) => String(res.headers["Content-Type"]).startsWith("image/"),
  });

  const audio = get(`/birds/api/audio/${audioBird}/${audioFile}/`, "audio", {
    responseType: "none",
  });
  check(audio, { "audio is 200": (res) => res.status === 200 });

  const search = get(
    "/birds/api/search-by-description/?query=wetland%20bird&top_k=3",
    "semantic_search"
  );
  check(search, { "semantic search is 200": (res) => res.status === 200 });

  if (__ITER % 5 === 0) {
    const classifyAudio = get(
      `/birds/api/audio/${audioBird}/${audioFile}/`,
      "classify_audio_source",
      { responseType: "binary" }
    );
    check(classifyAudio, {
      "classify source audio is 200": (res) => res.status === 200,
    });

    if (classifyAudio.status === 200) {
      const classify = http.post(
        `${BASE_URL}/birds/api/classify/?ext=flac`,
        classifyAudio.body,
        {
          headers: { "content-type": "application/octet-stream" },
          tags: { endpoint: "classify" },
        }
      );
      check(classify, {
        "classify is 200 or throttled": (res) =>
          res.status === 200 || res.status === 429,
      });
    }
  }

  sleep(1);
}
