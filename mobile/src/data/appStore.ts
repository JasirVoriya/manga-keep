import { create } from 'zustand';
import type { ComicCatalog } from '../types';
import { loadCatalogStore } from './catalogStore';

interface AppState {
  catalogs: ComicCatalog[];
  isLoading: boolean;
  publicCatalogLoadFailed: boolean;
  loadCatalogs: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  catalogs: [],
  isLoading: false,
  publicCatalogLoadFailed: false,
  
  loadCatalogs: async () => {
    set({ isLoading: true });
    try {
      const result = await loadCatalogStore();
      set({ 
        catalogs: result.catalogs, 
        publicCatalogLoadFailed: result.publicCatalogLoadFailed,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to load catalogs:', error);
      set({ isLoading: false });
    }
  },
}));
