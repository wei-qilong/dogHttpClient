import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/tauri';
import type { RequestConfig, ResponseData, Collection, Environment, HistoryItem } from '../types';
import { loadData, debouncedSave, type AppData } from '../services/storage';
import { processRequestVariables } from '../utils/variables';
import { getEffectiveAuth, applyAuthToRequest, applyApiKeyToUrl } from '../utils/auth';

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
  
  // Dirty tracking
  dirtyRequestIds: Set<string>;
  
  // UI State
  sidebarVisible: boolean;
  sidebarActiveTab: 'collections' | 'environments' | 'history';
  activeTab: 'params' | 'auth' | 'headers' | 'body' | 'scripts';
  responseTab: 'body' | 'cookies' | 'headers' | 'tests';
  bodyTab: 'pretty' | 'raw' | 'preview';
  
  // Actions
  initFromStorage: () => Promise<void>;
  markDirty: (requestId: string) => void;
  saveAllDirty: () => void;
  setCurrentRequest: (request: Partial<RequestConfig>, collectionId?: string | null, skipDirty?: boolean) => void;
  setCurrentResponse: (response: ResponseData | null) => void;
  setIsLoading: (loading: boolean) => void;
  setSidebarActiveTab: (tab: 'collections' | 'environments' | 'history') => void;
  setActiveTab: (tab: 'params' | 'auth' | 'headers' | 'body' | 'scripts') => void;
  setResponseTab: (tab: 'body' | 'cookies' | 'headers' | 'tests') => void;
  setBodyTab: (tab: 'pretty' | 'raw' | 'preview') => void;
  toggleSidebar: () => void;
  addToHistory: (item: HistoryItem) => void;
  sendRequest: () => Promise<void>;
  setCurrentEnvironmentId: (id: string | null) => void;
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
  auth: { type: 'inherit' }, // 默认继承 Collection 的 Auth
  variables: [],
});

export const useAppStore = create<AppState>((set, get) => ({
  currentRequest: createDefaultRequest(),
  currentResponse: null,
  isLoading: false,
  collections: [],
  environments: [], // 初始为空，等 initFromStorage 加载
  currentEnvironmentId: null,
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
      console.log('[Storage] Loaded data:', {
        collections: data.collections?.length,
        environments: data.environments?.length,
        history: data.history?.length
      });

      // 确保 default collection 存在
      let collections = data.collections || [];
      if (!collections.find(c => c.name === 'default')) {
        collections.unshift({
          id: '__default__',
          name: 'default',
          requests: [],
          folders: [],
        });
      }

      // 加载 environments，使用默认值或已保存的数据
      const environments = data.environments?.length > 0 ? data.environments : [
        { id: 'dev', name: 'Development', variables: [] },
        { id: 'test', name: 'Testing', variables: [] },
        { id: 'prod', name: 'Production', variables: [] },
      ];

      set({
        collections,
        history: data.history || [],
        environments,
        currentEnvironmentId: data.currentEnvironmentId || 'dev',
        isInitialized: true,
      });

      console.log('[Storage] Data loaded, collections:', collections.length, 'history:', data.history?.length, 'environments:', environments.length);
    } catch (error) {
      console.error('[Storage] Failed to load data:', error);
      // 即使加载失败也创建默认数据
      set({
        collections: [{
          id: '__default__',
          name: 'default',
          requests: [],
          folders: [],
        }],
        environments: [
          { id: 'dev', name: 'Development', variables: [] },
          { id: 'test', name: 'Testing', variables: [] },
          { id: 'prod', name: 'Production', variables: [] },
        ],
        currentEnvironmentId: 'dev',
        isInitialized: true,
      });
    }
  },
  
  // 标记请求为脏（未保存）
  markDirty: (requestId) => set((state) => {
    const next = new Set(state.dirtyRequestIds);
    next.add(requestId);
    return { dirtyRequestIds: next };
  }),
  
  // 保存所有脏请求：将当前请求写回 collection（如果不在任何 collection 中则添加到 default），然后持久化
  saveAllDirty: () => {
    const state = get();
    if (state.dirtyRequestIds.size === 0) return;
    
    let updatedCollections = state.collections.map(col => ({
      ...col,
      requests: col.requests.map(req => {
        if (state.dirtyRequestIds.has(req.id) && req.id === state.currentRequest.id) {
          return { ...state.currentRequest };
        }
        return req;
      }),
    }));
    
    // 如果当前脏请求不在任何 collection 中，添加到 default
    if (state.dirtyRequestIds.has(state.currentRequest.id)) {
      const existsInAny = updatedCollections.some(c => 
        c.requests.some(r => r.id === state.currentRequest.id)
      );
      if (!existsInAny) {
        updatedCollections = updatedCollections.map(col => {
          if (col.name === 'default') {
            return { ...col, requests: [...col.requests, { ...state.currentRequest }] };
          }
          return col;
        });
      }
    }
    
    // 清除所有脏标记
    set({
      collections: updatedCollections,
      dirtyRequestIds: new Set<string>(),
    });
    
    // 立即持久化
    const data: AppData = {
      version: '1.0.0',
      collections: updatedCollections,
      history: state.history,
      environments: state.environments,
      currentEnvironmentId: state.currentEnvironmentId,
      settings: { theme: 'light', language: 'zh-CN', timeout: 30000, max_history: 100, auto_save: true },
    };
    debouncedSave(data, 0).catch(err => {
      console.error('[Storage] Save failed:', err);
    });
  },
  
  // skipDirty 参数：URL/Params 双向绑定时传 true，避免循环标记脏
  setCurrentRequest: (request, collectionId, skipDirty = false) => set((state) => {
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
      auth: request.auth ?? state.currentRequest.auth,
      variables: request.variables ?? state.currentRequest.variables,
    };
    
    const requestId = newRequest.id;
    const isSameRequest = requestId === state.currentRequest.id;
    // 任何非跳过情况都标记为脏（包括切换请求时的修改）
    const shouldMarkDirty = !skipDirty;
    
    // 同步到 collections：如果是同一请求修改，或者是已存在的请求
    let updatedCollections = state.collections;
    const existsInAny = state.collections.some(c => 
      c.requests.some(r => r.id === requestId)
    );
    
    if (existsInAny) {
      // 更新已存在的请求
      updatedCollections = state.collections.map(col => ({
        ...col,
        requests: col.requests.map(req => 
          req.id === requestId ? { ...newRequest } : req
        ),
      }));
    } else if (isSameRequest || collectionId) {
      // 新请求：添加到 default collection
      updatedCollections = state.collections.map(col => {
        if (col.name === 'default') {
          return { ...col, requests: [...col.requests, { ...newRequest }] };
        }
        return col;
      });
    }
    
    return {
      currentRequest: newRequest,
      ...(collectionId !== undefined && { currentCollectionId: collectionId }),
      // 同步更新 collections，触发自动保存
      collections: updatedCollections,
      // 标记为脏（用于 saveAllDirty）
      ...(shouldMarkDirty && { dirtyRequestIds: new Set([...state.dirtyRequestIds, requestId]) }),
    };
  }),
  
  setCurrentResponse: (response) => set({ currentResponse: response }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setSidebarActiveTab: (tab) => set({ sidebarActiveTab: tab }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setResponseTab: (tab) => set({ responseTab: tab }),
  setBodyTab: (tab) => set({ bodyTab: tab }),
  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
  setCurrentEnvironmentId: (id) => set({ currentEnvironmentId: id }),

  addToHistory: (item) => set((state) => ({
    history: [item, ...state.history.slice(0, 99)],
  })),
  
  sendRequest: async () => {
    const state = useAppStore.getState();
    const { currentRequest, collections, currentCollectionId, environments, currentEnvironmentId } = state;

    if (!currentRequest.url) return;

    set({ isLoading: true });

    try {
      // 获取当前 Collection 和 Environment
      const currentCollection = collections.find(c => c.id === currentCollectionId);
      const currentEnvironment = environments.find(e => e.id === currentEnvironmentId);

      // 1. 处理变量替换
      let processedRequest = processRequestVariables(currentRequest, currentCollection, currentEnvironment);

      // 2. 获取有效的 Auth 配置（处理 inherit）
      const effectiveAuth = getEffectiveAuth(processedRequest, currentCollection);

      // 3. 应用 Auth 到请求
      processedRequest = applyAuthToRequest(processedRequest, effectiveAuth);

      // 4. 处理 API Key 的 query 参数
      let url = applyApiKeyToUrl(processedRequest.url, effectiveAuth);

      // 5. 添加 params 到 URL
      const enabledParams = processedRequest.params.filter(p => p.enabled && p.key);
      if (enabledParams.length > 0) {
        const separator = url.includes('?') ? '&' : '?';
        const queryString = enabledParams
          .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
          .join('&');
        url = url + separator + queryString;
      }

      let requestBody: string | null = null;
      let requestFormData: Array<{ key: string; value: string; file_name?: string; content_type?: string; is_file: boolean }> | null = null;
      let requestHeaders: Record<string, string> = processedRequest.headers
        .filter(h => h.enabled && h.key)
        .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {} as Record<string, string>);

      if (processedRequest.bodyType === 'raw' && processedRequest.bodyContent) {
        requestBody = processedRequest.bodyContent;
      } else if (processedRequest.bodyType === 'x-www-form-urlencoded' && processedRequest.urlEncoded) {
        const enabledData = processedRequest.urlEncoded.filter(p => p.enabled && p.key);
        if (enabledData.length > 0) {
          requestBody = enabledData.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
          requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
        }
      } else if (processedRequest.bodyType === 'form-data' && processedRequest.formData) {
        const enabledData = processedRequest.formData.filter(p => p.enabled && p.key);
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
      } else if (processedRequest.bodyType === 'binary' && processedRequest.binaryFile) {
        requestBody = processedRequest.binaryFile.data;
        requestHeaders['Content-Type'] = processedRequest.binaryFile.type;
      }

      const result: any = await invoke('send_http_request', {
        request: {
          method: processedRequest.method,
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

      console.log('[History] Adding history item:', historyItem.id, historyItem.request.name);

      set((state) => {
        const newHistory = [historyItem, ...state.history.slice(0, 99)];
        console.log('[History] New history length:', newHistory.length);
        return { history: newHistory };
      });

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
let prevCollectionsJson = '';
let prevHistoryJson = '';
let prevEnvironmentsJson = '';
let prevCurrentEnvId: string | null = null;

useAppStore.subscribe((state) => {
  if (!state.isInitialized) {
    console.log('[Storage] Subscribe skipped: not initialized');
    return;
  }

  const collectionsJson = JSON.stringify(state.collections);
  const historyJson = JSON.stringify(state.history);
  const environmentsJson = JSON.stringify(state.environments);

  const collectionsChanged = collectionsJson !== prevCollectionsJson;
  const historyChanged = historyJson !== prevHistoryJson;
  const environmentsChanged = environmentsJson !== prevEnvironmentsJson;
  const envIdChanged = state.currentEnvironmentId !== prevCurrentEnvId;

  if (collectionsChanged || historyChanged || environmentsChanged || envIdChanged) {
    console.log('[Storage] Change detected:', {
      collectionsChanged,
      historyChanged,
      environmentsChanged,
      envIdChanged,
      collectionsCount: state.collections.length,
      environmentsCount: state.environments.length,
    });

    prevCollectionsJson = collectionsJson;
    prevHistoryJson = historyJson;
    prevEnvironmentsJson = environmentsJson;
    prevCurrentEnvId = state.currentEnvironmentId;

    const data: AppData = {
      version: '1.0.0',
      collections: state.collections,
      history: state.history,
      environments: state.environments,
      currentEnvironmentId: state.currentEnvironmentId,
      settings: { theme: 'light', language: 'zh-CN', timeout: 30000, max_history: 100, auto_save: true },
    };

    console.log('[Storage] Triggering auto-save...');
    debouncedSave(data, 1000).catch(err => {
      console.error('[Storage] Auto-save failed:', err);
    });
  }
});
