import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";

const controlledThrottleResponses = new Counter("controlled_throttle_responses");
const controlledGuardResponses = new Counter("controlled_guard_responses");
const expectedThrottleStatuses = http.expectedStatuses({ min: 200, max: 399 }, 429);
const expectedGuardStatuses = http.expectedStatuses({ min: 200, max: 399 }, 503);

export const options = {
  scenarios: {
    smoke: {
      executor: "constant-arrival-rate",
      exec: "smoke",
      rate: 90,
      timeUnit: "1m",
      duration: "1m",
      preAllocatedVUs: 5,
      maxVUs: 10,
      tags: { phase: "smoke" },
    },
    throttleProtection: {
      executor: "constant-arrival-rate",
      exec: "throttleProtection",
      startTime: "65s",
      rate: 180,
      timeUnit: "1m",
      duration: "1m",
      preAllocatedVUs: 5,
      maxVUs: 10,
      tags: { phase: "throttle" },
    },
    semanticGuard: {
      executor: "per-vu-iterations",
      exec: "semanticGuard",
      startTime: "190s",
      vus: 5,
      iterations: 1,
      maxDuration: "45s",
      tags: { phase: "semantic_guard" },
    },
    classifyGuard: {
      executor: "per-vu-iterations",
      exec: "classifyGuard",
      startTime: "240s",
      vus: 4,
      iterations: 1,
      maxDuration: "1m",
      tags: { phase: "classify_guard" },
    },
  },
  thresholds: {
    "checks{phase:smoke}": ["rate==1"],
    "http_req_failed{phase:smoke}": ["rate<0.01"],
    "http_req_duration{phase:smoke,endpoint:health}": ["p(95)<500"],
    "http_req_duration{phase:smoke,endpoint:birds_list}": ["p(95)<1000"],
    "http_req_duration{phase:smoke,endpoint:bird_detail}": ["p(95)<1000"],
    "http_req_duration{phase:smoke,endpoint:sound_metadata}": ["p(95)<1500"],
    "http_req_duration{phase:smoke,endpoint:image}": ["p(95)<3000"],
    "http_req_duration{phase:smoke,endpoint:audio}": ["p(95)<5000"],
    "checks{phase:throttle}": ["rate==1"],
    "controlled_throttle_responses{phase:throttle}": ["count>0"],
    "checks{phase:semantic_guard}": ["rate==1"],
    "controlled_guard_responses{phase:semantic_guard}": ["count>0"],
    "checks{phase:classify_guard}": ["rate==1"],
    "controlled_guard_responses{phase:classify_guard}": ["count>0"],
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

const SMOKE_CASES = [
  () => get("/birds/api/healthz/", "health"),
  () => get("/birds/api/birds/", "birds_list"),
  () => {
    const [bird] = pick(AUDIO_CASES);
    return get(`/birds/api/birds/${bird}/`, "bird_detail");
  },
  () => {
    const [bird] = pick(AUDIO_CASES);
    return get(`/birds/api/sounds/bird-label/${bird}/`, "sound_metadata");
  },
  () => get(`/birds/api/image/${pick(IMAGE_BIRDS)}/0/`, "image"),
  () => {
    const [bird, file] = pick(AUDIO_CASES);
    return get(`/birds/api/audio/${bird}/${file}/`, "audio", {
      responseType: "none",
    });
  },
];

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function get(path, endpoint, params = {}) {
  return http.get(`${BASE_URL}${path}`, {
    ...params,
    tags: { ...(params.tags || {}), endpoint },
  });
}

function hasControlledGuardResponse(response) {
  if (response.status !== 503 || !response.headers["Retry-After"]) {
    return false;
  }

  try {
    const body = response.json();
    return (
      body.error === "Server busy. Try again shortly." &&
      ["too_many_path_requests", "too_many_requests", "low_memory"].includes(body.reason)
    );
  } catch {
    return false;
  }
}

export function smoke() {
  const response = pick(SMOKE_CASES)();
  check(response, {
    "smoke response is 200": (res) => res.status === 200,
  });
}

export function throttleProtection() {
  const response = get("/birds/api/birds/", "birds_list", {
    responseCallback: expectedThrottleStatuses,
  });
  const controlledThrottle = response.status === 429 && Boolean(response.headers["Retry-After"]);

  if (controlledThrottle) {
    controlledThrottleResponses.add(1);
  }

  check(response, {
    "throttle response is 200 or controlled 429": (res) =>
      res.status === 200 || controlledThrottle,
  });
}

export function semanticGuard() {
  const response = get(
    `/birds/api/search-by-description/?query=wetland%20guard%20probe%20${__VU}&top_k=3`,
    "semantic_search",
    { responseCallback: expectedGuardStatuses }
  );
  const controlledGuard = hasControlledGuardResponse(response);

  if (controlledGuard) {
    controlledGuardResponses.add(1);
  }

  check(response, {
    "semantic response is 200 or controlled 503": (res) =>
      res.status === 200 || controlledGuard,
  });
}

export function classifyGuard() {
  const [bird, file] = pick(AUDIO_CASES);
  const audio = get(`/birds/api/audio/${bird}/${file}/`, "classify_audio_source", {
    responseType: "binary",
  });

  if (!check(audio, { "classify source audio is 200": (res) => res.status === 200 })) {
    return;
  }

  const response = http.post(
    `${BASE_URL}/birds/api/classify/?ext=flac`,
    audio.body,
    {
      headers: { "content-type": "application/octet-stream" },
      tags: { endpoint: "classify" },
      responseCallback: expectedGuardStatuses,
    }
  );
  const controlledGuard = hasControlledGuardResponse(response);

  if (controlledGuard) {
    controlledGuardResponses.add(1);
  }

  check(response, {
    "classify response is 200 or controlled 503": (res) =>
      res.status === 200 || controlledGuard,
  });
}
