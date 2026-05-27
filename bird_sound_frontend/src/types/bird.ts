// ==================== Response Types (what Django returns) ====================

export interface Bird {
  eBird: string;             // primary key
  common_name: string;
  scientific_name: string;
  extra_name: string | null;
  description: string | null;
  sound_description: string | null;
  naughty_description: string | null;
  created_at: string;        // ISO datetime
  updated_at: string;
}

export interface BirdSound {
  id: number;
  filename: string;
  eBird: string;
  secondary_labels: string[];
  station: string | null;
  recording_mode: string | null;
  recording_datetime: string | null;  // ISO datetime
  file_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface BirdSoundFilename {
  filename: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
// ==================== Request Types (what we send to Django) ====================

export interface BirdListParams {
  random?: boolean;
  quantity?: number;   // -1 = no pagination, dump all
  page?: number;
}

export interface BirdSoundFilterParams {
  station?: string;
  recording_mode?: string;
  start_time?: string;   // ISO datetime
  end_time?: string;     // ISO datetime
}

// ==================== Classify Types ====================

export interface ClassifyPrediction {
  eBird: string;
  confidence: number;
}

export interface ClassifyResponse {
  eBird: string;
  confidence: number;
  top_predictions: ClassifyPrediction[];
}

// ==================== Semantic Search Types ====================

export interface SearchByDescriptionHit {
  eBird: string;
  common_name: string;
  scientific_name: string;
  score: number;
  best_field: 'name' | 'description' | 'sound_description' | 'naughty_description' | string;
  strong_match: boolean;
}

export interface SearchByDescriptionResponse {
  query: string;
  threshold: number;
  count: number;
  results: SearchByDescriptionHit[];
}
