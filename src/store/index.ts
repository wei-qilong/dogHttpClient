import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/tauri';
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
      // Build URL with query params
      let url = currentRequest.url;
      const enabledParams = currentRequest.params.filter(p => p.enabled && p.key);
      
      console.log('[sendRequest] URL:', url);
      console.log('[sendRequest] All params:', JSON.stringify(currentRequest.params));
      console.log('[sendRequest] Enabled params:', JSON.stringify(enabledParams));
      
      if (enabledParams.length > 0) {
        const separator = url.includes('?') ? '&' : '?';
        const queryString = enabledParams
          .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
          .join('&');
        url = url + separator + queryString;
        console.log('[sendRequest] Final URL:', url);
      }

      // 构建请求体
      let requestBody: string | null = null;
      let requestHeaders: Record<string, string> = currentRequest.headers
        .filter(h => h.enabled && h.key)
        .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {} as Record<string, string>);

      if (currentRequest.bodyType === 'raw' && currentRequest.bodyContent) {
        requestBody = currentRequest.bodyContent;
      } else if (currentRequest.bodyType === 'x-www-form-urlencoded' && currentRequest.urlEncoded) {
        const enabledData = currentRequest.urlEncoded.filter(p => p.enabled && p.key);
        if (enabledData.length > 0) {
          requestBody = enabledData.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
          requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
        }
      } else if (currentRequest.bodyType === 'form-data' && currentRequest.formData) {
        // form-data 需要特殊处理，这里先用简单的 key=value 格式
        const enabledData = currentRequest.formData.filter(p => p.enabled && p.key);
        if (enabledData.length > 0) {
          const formParts: string[] = [];
          for (const item of enabledData) {
            if (item.type === 'file' && item.fileName) {
              formParts.push(`${encodeURIComponent(item.key)}=${encodeURIComponent(item.fileName)}`);
            } else {
              formParts.push(`${encodeURIComponent(item.key)}=${encodeURIComponent(item.value)}`);
            }
          }
          requestBody = formParts.join('&');
          requestHeaders['Content-Type'] = 'multipart/form-data';
        }
      } else if (currentRequest.bodyType === 'binary' && currentRequest.binaryFile) {
        requestBody = currentRequest.binaryFile.data;
        requestHeaders['Content-Type'] = currentRequest.binaryFile.type;
      }

      console.log('[sendRequest] Body type:', currentRequest.bodyType);
      console.log('[sendRequest] Request body:', requestBody);

      // 调用 Tauri 后端代理请求，绕过 CORS
      const result: any = await invoke('send_http_request', {
        request: {
          method: currentRequest.method,
          url: url,
          headers: requestHeaders,
          body: requestBody,
        }
      });

      const responseData: ResponseData = {
        status: result.status,
        statusText: result.status_text,
        headers: result.headers,
        body: result.body,
        time: result.time_ms,
        size: result.size_bytes,
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

    } catch (error: any) {
      set({
        isLoading: false,
        currentResponse: {
          status: 0,
          statusText: 'Error',
          headers: {},
          body: error.message || String(error),
          time: 0,
          size: 0,
        }
      });
      console.error('Request failed:', error);
    }
  },
}));
