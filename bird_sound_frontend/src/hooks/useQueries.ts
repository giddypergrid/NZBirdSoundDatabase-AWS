import { useQuery, useQueries } from '@tanstack/react-query';
import axios from 'axios';
import apiClient, { birdApi, soundApi, imageApi } from 'services/api';
import { Bird, BirdSound, BirdSoundFilterParams } from 'types/bird';

// ==================== Bird Queries ====================

export const useBirdList = (quantity: number = -1) => {
  return useQuery({
    queryKey: ['birds', 'list', quantity],
    queryFn: async () => {
      const response = await birdApi.list({ quantity });
      return Array.isArray(response.data) ? response.data : [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useBird = (eBird: string) => {
  return useQuery({
    queryKey: ['birds', eBird],
    queryFn: async () => {
      const response = await birdApi.getByEBird(eBird);
      return response.data;
    },
    enabled: !!eBird,
    staleTime: 5 * 60 * 1000,
  });
};

// ==================== Audio Queries ====================

export const useBirdSoundList = (bird: Bird, filters?: BirdSoundFilterParams) => {
  return useQuery({
    queryKey: ['sounds', bird.eBird, filters],
    queryFn: async () => {
      const response = await soundApi.listByLabel(bird.eBird, filters);
      // Backend uses DRF pagination → {count, next, previous, results: [...]}.
      // Tolerate both paginated and bare-array shapes for robustness.
      const data = response.data as unknown;
      if (Array.isArray(data)) return data as BirdSound[];
      if (data && Array.isArray((data as { results?: unknown }).results)) {
        const allSounds: BirdSound[] = [];
        let page = data as { results: BirdSound[]; next: string | null };
        allSounds.push(...page.results);
        while (page.next) {
          const nextResponse = await apiClient.get(page.next.replace(/^http:/, 'https:'));
          page = nextResponse.data as { results: BirdSound[]; next: string | null };
          allSounds.push(...page.results);
        }
        return allSounds;
      }
      return [];
    },
    enabled: !!bird.eBird,
    staleTime: 5 * 60 * 1000,
  });
};

export const useAudioUrl = (birdSound: BirdSound) => {
  return useQuery({
    queryKey: ['audio', birdSound.filename],
    queryFn: async () => {
      const response = await soundApi.getBirdAudio(birdSound.eBird, birdSound.filename);
      const contentType = response.headers['content-type'] || 'audio/mpeg';
      const blob = new Blob([response.data], { type: contentType });
      return URL.createObjectURL(blob);
    },
    enabled: !!birdSound.filename,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
  });
};


// ==================== Image Queries ====================

// Fetches up to maxImages in parallel; returns only the URLs that succeeded.
export const useBirdImages = (bird: Bird | null, maxImages: number = 5): string[] => {
  const results = useQueries({
    queries: bird
      ? Array.from({ length: maxImages }, (_, i) => ({
          queryKey: ['image', bird.eBird, i],
          queryFn: async () => {
            const response = await imageApi.getBirdImage(bird.eBird, i);
            return URL.createObjectURL(response.data);
          },
          staleTime: Infinity,
          gcTime: 10 * 60 * 1000,
          retry: (failureCount: number, error: unknown) => {
            if (axios.isAxiosError(error) && error.response?.status === 404) return false;
            return failureCount < 2;
          },
        }))
      : [],
  });
  return results.filter(r => r.isSuccess).map(r => r.data as string);
};

export const useBirdImage = (bird: Bird, index: number = 0) => {
  return useQuery({
    queryKey: ['image', bird.eBird, index],
    queryFn: async () => {
      const response = await imageApi.getBirdImage(bird.eBird, index);
      return URL.createObjectURL(response.data);
    },
    enabled: !!bird.eBird,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    // 404 = no image for this bird, don't retry. Retry up to 2x on network/5xx.
    retry: (failureCount, error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 404) return false;
      return failureCount < 2;
    },
  });
};
