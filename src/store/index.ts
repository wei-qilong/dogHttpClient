import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/tauri';
import type { RequestConfig, ResponseData, Collection, Environment, HistoryItem } from '../types';
import { loadData, debouncedSave, type AppData } from '../services/storage';

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
  currentCollectionId: string | null;
  currentResponse: ResponseData | null;
  isLoading: boolean;
  
  // Collections
  collections: Collection[];
  
  // Environments
  environments: Environment[];
  currentEnvironmentId: string | null;
  
  // History
  history: HistoryItem[];
  
  // Storage
  isInitialized: boolean;
  
  // Dirty tracking: 记录未保存的请求 ID
  dirtyRequestIds: Set<string>;
  
  // UI State
  sidebarVisible: boolean;
  sidebarActiveTab: 'collections' | 'environments' | 'history';
  activeTab: 'params' | 'auth' | 'headers' | 'body' | 'scripts';
  responseTab: 'body' | 'cookies' | 'headers' | 'tests';
  bodyTab: 'pretty' | 'raw' | 'preview';
  
  // Actions
  initFromStorage: () => Promise<void>;
  persistToStorage: () => void;
  markDirty: (requestId: string) => void;
  markClean: (requestId: string) => void;
  isRequestDirty: (requestId: string) => boolean;
  saveAllDirty: () => void;
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

// 将 store 状态转换为存储格式
const storeToAppData = (state: AppState): AppData => ({
  version: '1.0.0',
  collections: state.collections,
  history: state.history,
  settings: {
    theme: 'light',
    language: 'zh-CN',
    timeout: 30000,
    max_history: 100,
    auto_save: true,
  },
});

export const useAppStore = create<AppState>((set, get) => ({
  currentRequest: createDefaultRequest(),
  currentResponse: null,
  isLoading: false,
  collections: [],
  environments: [
    { id: 'dev', name: 'Development', variables: [] },
    { id: 'test', name: 'Testing', variables: [] },
    { id: 'prod', name: 'Production', variables: [] },
  ],
  currentEnvironmentId: 'dev',
  history: [],
  isInitialized: false,
  dirtyRequestIds: new Set<string>(),
  sidebarVisible: true,
  sidebarActiveTab: 'collections',
  currentCollectionId: null,
  activeTab: 'params',
  responseTab: 'body',
  bodyTab: 'pretty',
  
  // 从本地存储初始化数据
  initFromStorage: async () => {
    if (get().isInitialized) return;
    
    try {
      const data = await loadData();
      
      set({
        collections: data.collections || [],
        history: data.history || [],
        isInitialized: true,
      });
      
      console.log('[Storage] Data loaded from disk, collections:', data.collections?.length, 'history:', data.history?.length);
    } catch (error) {
      console.error('[Storage] Failed to load data:', error);
      set({ isInitialized: true });
    }
  },
  
  // 持久化到本地存储（防抖 1 秒）
  persistToStorage: () => {
    const state = get();
    if (!state.isInitialized) return;
    
    const data = storeToAppData(state);
    debouncedSave(data, 1000).catch(err => {
      console.error('[Storage] Auto-save failed:', err);
    });
  },
  
  // 标记请求为脏（未保存）
  markDirty: (requestId) => set((state) => {
    const next = new Set(state.dirtyRequestIds);
    next.add(requestId);
    return { dirtyRequestIds: next };
  }),
  
  // 标记请求为干净（已保存）
  markClean: (requestId) => set((state) => {
    const next = new Set(state.dirtyRequestIds);
    next.delete(requestId);
    return { dirtyRequestIds: next };
  }),
  
  // 检查请求是否脏
  isRequestDirty: (requestId) => get().dirtyRequestIds.has(requestId),
  
  // 保存所有脏请求：将当前请求写回 collection，然后持久化
  saveAllDirty: () => {
    const state = get();
    if (state.dirtyRequestIds.size === 0) return;
    
    const updatedCollections = state.collections.map(col => ({
      ...col,
      requests: col.requests.map(req => {
        if (state.dirtyRequestIds.has(req.id) && req.id === state.currentRequest.id) {
          // 当前正在编辑的脏请求，用最新数据覆盖
          return { ...state.currentRequest };
        }
        return req;
      }),
    }));
    
    // 清除所有脏标记
    set({
      collections: updatedCollections,
      dirtyRequestIds: new Set<string>(),
    });
    
    // 立即持久化（不防抖）
    const data: AppData = {
      version: '1.0.0',
      collections: updatedCollections,
      history: state.history,
      settings: { theme: 'light', language: 'zh-CN', timeout: 30000, max_history: 100, auto_save: true },
    };
    debouncedSave(data, 0).catch(err => {
      console.error('[Storage] Save failed:', err);
    });
  },
  
  setCurrentRequest: (request, collectionId) => set((state) => {
    const newRequest: RequestConfig = {
      id: request.id ?? state.currentRequest.id,
      name: request.name ?? state.currentRequest.name,
      method: request.method ?? state.currentRequest.method,
      url: request.url ?? state.currentRequest.url,
      params: request.params ?? state.currentRequest.params,
      headers: request.headers ?? state.currentRequest.headers,
      bodyType: request.bodyType ?? state.currentRequest.bodyType,
      bodyContent: request.bodyContent ?? state.currentRequest.bodyContent,
      bodyRawType: request.bodyRawType ?? state.currentRequest.bodyRawType,
      formData: request.formData ?? state.currentRequest.formData,
      urlEncoded: request.urlEncoded ?? state.currentRequest.urlEncoded,
      binaryFile: request.binaryFile ?? state.currentRequest.binaryFile,
      preRequestScript: request.preRequestScript ?? state.currentRequest.preRequestScript,
      testsScript: request.testsScript ?? state.currentRequest.testsScript,
    };
    
    // 如果是编辑现有请求（id 未变），标记为脏
    const requestId = newRequest.id;
    const isEditing = requestId === state.currentRequest.id;
    
    return {
      currentRequest: newRequest,
      ...(collectionId !== undefined && { currentCollectionId: collectionId }),
      ...(isEditing && { dirtyRequestIds: new Set([...state.dirtyRequestIds, requestId]) }),
    };
  }),
  
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
      let url = currentRequest.url;
      const enabledParams = currentRequest.params.filter(p => p.enabled && p.key);
      
      if (enabledParams.length > 0) {
        const separator = url.includes('?') ? '&' : '?';
        const queryString = enabledParams
          .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
          .join('&');
        url = url + separator + queryString;
      }

      let requestBody: string | null = null;
      let requestFormData: Array<{ key: string; value: string; file_name?: string; content_type?: string; is_file: boolean }> | null = null;
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
        const enabledData = currentRequest.formData.filter(p => p.enabled && p.key);
        if (enabledData.length > 0) {
          requestFormData = enabledData.map(item => {
            const contentType = item.fileName?.match(/\.(jpg|jpeg|png|gif)$/i) ? 'image/jpeg' : 
                               item.fileName?.match(/\.(pdf)$/i) ? 'application/pdf' :
                               item.fileName?.match(/\.(txt|text)$/i) ? 'text/plain' :
                               'application/octet-stream';
            return {
              key: item.key,
              value: item.value || '',
              file_name: item.fileName,
              content_type: item.type === 'file' ? contentType : undefined,
              is_file: item.type === 'file',
            };
          });
          delete requestHeaders['Content-Type'];
        }
      } else if (currentRequest.bodyType === 'binary' && currentRequest.binaryFile) {
        requestBody = currentRequest.binaryFile.data;
        requestHeaders['Content-Type'] = currentRequest.binaryFile.type;
      }

      const result: any = await invoke('send_http_request', {
        request: {
          method: currentRequest.method,
          url: url,
          headers: requestHeaders,
          body: requestBody,
          form_data: requestFormData,
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

// ===== 自动保存订阅 =====
// 监听 collections 和 history 变化，自动持久化
let prevCollectionsJson = '';
let prevHistoryJson = '';

useAppStore.subscribe((state) => {
  if (!state.isInitialized) return;
  
  const collectionsJson = JSON.stringify(state.collections);
  const historyJson = JSON.stringify(state.history);
  
  // 只在 collections 或 history 实际变化时保存
  if (collectionsJson !== prevCollectionsJson || historyJson !== prevHistoryJson) {
    prevCollectionsJson = collectionsJson;
    prevHistoryJson = historyJson;
    
    const data: AppData = {
      version: '1.0.0',
      collections: state.collections,
      history: state.history,
      settings: {
        theme: 'light',
        language: 'zh-CN',
        timeout: 30000,
        max_history: 100,
        auto_save: true,
      },
    };
    
    debouncedSave(data, 1000).catch(err => {
      console.error('[Storage] Auto-save failed:', err);
    });
  }
});
