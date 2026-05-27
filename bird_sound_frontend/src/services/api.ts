import axios, { AxiosResponse } from "axios";
import {
  Bird,
  BirdSound,
  BirdListParams,
  BirdSoundFilterParams,
  PaginatedResponse,
  ClassifyResponse,
  SearchByDescriptionResponse,
} from "types/bird";
import { API_BASE_URL } from "settings";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ==================== Bird Endpoints ====================

export const birdApi = {

  list: (params?: BirdListParams): Promise<AxiosResponse<PaginatedResponse<Bird>|Bird[]>> =>
    apiClient.get("/birds/", { params }),


  getByEBird: (eBird: string): Promise<AxiosResponse<Bird>> =>
    apiClient.get(`/birds/${encodeURIComponent(eBird)}/`),
};

// ==================== Sound Endpoints ====================

export const soundApi = {

  getBirdAudio: (eBird: string, filename: string): Promise<AxiosResponse<Blob>> =>
    apiClient.get(`/audio/${encodeURIComponent(eBird)}/${encodeURIComponent(filename)}/`, {
      responseType: "blob",
    }),

  listByLabel: (
    primaryLabel: string,
    params?: BirdSoundFilterParams
  ): Promise<AxiosResponse<BirdSound[]>> =>
    apiClient.get(`/sounds/bird-label/${encodeURIComponent(primaryLabel)}/`, { params }),
};

// ==================== File Endpoints ====================

export const imageApi = {

  getBirdImage: (eBird: string, index: number): Promise<AxiosResponse<Blob>> =>
    apiClient.get(`/image/${encodeURIComponent(eBird)}/${index}/`, {
      responseType: "blob",
    }),
};

// ==================== Semantic Search Endpoints ====================

export const searchApi = {
  byDescription: (
    query: string,
    topK: number = 4,
    threshold: number = 0.45,
  ): Promise<AxiosResponse<SearchByDescriptionResponse>> =>
    apiClient.get("/search-by-description/", {
      params: { q: query, top_k: topK, threshold },
    }),
};

// ==================== Classify Endpoints ====================
// Sends raw audio bytes (no multipart). Extension goes as ?ext=flac.
export const classifyApi = {
  classify: (audioFile: File): Promise<AxiosResponse<ClassifyResponse>> => {
    const ext = audioFile.name.split(".").pop()?.toLowerCase() || "";
    return apiClient.post("/classify/", audioFile, {
      params: { ext },
      headers: { "Content-Type": "application/octet-stream" },
    });
  },
};

export default apiClient;
