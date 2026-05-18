import { create } from 'zustand';
import type { RequestConfig, ResponseData, Collection, Environment, HistoryItem } from '../types';

// Simple UUID generator for browser compatibility
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface AppState {
  // Current request
  currentRequest: RequestConfig;
  currentCollectionId: string | null; // 当前请求所属的 Collection
  currentResponse: ResponseData | null;
  isLoading: boolean;
  
  // Collections
  collections: Collection[];
  
  // Environments
  environments: Environment[];
  currentEnvironmentId: string | null;
  
  // History
  history: HistoryItem[];
  
  // UI State
  sidebarVisible: boolean;
  sidebarActiveTab: 'collections' | 'environments' | 'history';
  activeTab: 'params' | 'auth' | 'headers' | 'body' | 'scripts';
  responseTab: 'body' | 'cookies' | 'headers' | 'tests';
  bodyTab: 'pretty' | 'raw' | 'preview';
  
  // Actions
  setCurrentRequest: (request: Partial<RequestConfig>, collectionId?: string | null) => void;
  setCurrentResponse: (response: ResponseData | null) => void;
  setIsLoading: (loading: boolean) => void;
  setSidebarActiveTab: (tab: 'collections' | 'environments' | 'history') => void;
  setActiveTab: (tab: 'params' | 'auth' | 'headers' | 'body' | 'scripts') => void;
  setResponseTab: (tab: 'body' | 'cookies' | 'headers' | 'tests') => void;
  setBodyTab: (tab: 'pretty' | 'raw' | 'preview') => void;
  toggleSidebar: () => void;
  addToHistory: (item: HistoryItem) => void;
  sendRequest: () => Promise<void>;
}

const createDefaultRequest = (): RequestConfig => ({
  id: generateId(),
  name: 'New Request',
  method: 'GET',
  url: '',
  params: [],
  headers: [
    { id: generateId(), key: 'Accept', value: 'application/json', enabled: true },
    { id: generateId(), key: 'Content-Type', value: 'application/json', enabled: true },
  ],
  bodyType: 'none',
  bodyContent: '',
  bodyRawType: 'json',
  preRequestScript: '',
  testsScript: '',
});

export const useAppStore = create<AppState>((set) => ({
  currentRequest: createDefaultRequest(),
  currentResponse: null,
  isLoading: false,
  collections: [],
  environments: [
    {
      id: 'dev',
      name: 'Development',
      variables: [],
    },
    {
      id: 'test',
      name: 'Testing',
      variables: [],
    },
    {
      id: 'prod',
      name: 'Production',
      variables: [],
    },
  ],
  currentEnvironmentId: 'dev',
  history: [],
  sidebarVisible: true,
  sidebarActiveTab: 'collections',
  currentCollectionId: null,
  activeTab: 'params',
  responseTab: 'body',
  bodyTab: 'pretty',
  
  setCurrentRequest: (request, collectionId) => set((state) => ({
    currentRequest: { ...state.currentRequest, ...request },
    ...(collectionId !== undefined && { currentCollectionId: collectionId }),
  })),
  
  setCurrentResponse: (response) => set({ currentResponse: response }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setSidebarActiveTab: (tab) => set({ sidebarActiveTab: tab }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setResponseTab: (tab) => set({ responseTab: tab }),
  setBodyTab: (tab) => set({ bodyTab: tab }),
  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
  
  addToHistory: (item) => set((state) => ({
    history: [item, ...state.history.slice(0, 99)],
  })),
  
  sendRequest: async () => {
    const state = useAppStore.getState();
    const { currentRequest } = state;
    
    if (!currentRequest.url) return;
    
    set({ isLoading: true });
    
    try {
      const startTime = Date.now();
      
      // Build URL with query params
      let url = currentRequest.url;
      const enabledParams = currentRequest.params.filter(p => p.enabled && p.key);
      if (enabledParams.length > 0) {
        const separator = url.includes('?') ? '&' : '?';
        const queryString = enabledParams
          .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
          .join('&');
        url = url + separator + queryString;
      }
      
      const response = await fetch(url, {
        method: currentRequest.method,
        headers: currentRequest.headers
          .filter(h => h.enabled && h.key)
          .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {}),
        body: currentRequest.bodyType !== 'none' && currentRequest.bodyContent 
          ? currentRequest.bodyContent 
          : undefined,
      });
      
      const endTime = Date.now();
      const responseBody = await response.text();
      
      const responseData: ResponseData = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
        time: endTime - startTime,
        size: new Blob([responseBody]).size,
      };
      
      set({ 
        currentResponse: responseData,
        isLoading: false 
      });
      
      // Add to history
      const historyItem: HistoryItem = {
        id: generateId(),
        request: { ...currentRequest },
        response: responseData,
        timestamp: Date.now(),
      };
      
      set((state) => ({
        history: [historyItem, ...state.history.slice(0, 99)],
      }));
      
    } catch (error) {
      set({ isLoading: false });
      console.error('Request failed:', error);
    }
  },
}));
