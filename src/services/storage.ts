import { invoke } from '@tauri-apps/api/tauri';
import type { Collection, RequestConfig, HistoryItem, Environment } from '../types';

// 检测是否在 Tauri 环境中（运行时检测，不是模块加载时）
function isTauriEnv(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__;
}

// 前端日志发送到 Rust 后端记录到文件
export async function logToFile(message: string) {
  if (isTauriEnv()) {
    try {
      await invoke('log_from_frontend', { message });
    } catch (e) {
      // 如果调用失败，回退到 console
      console.log(`[Frontend] ${message}`);
    }
  }
}

// 浏览器环境 localStorage key
const LOCAL_STORAGE_KEY = 'dogHttpClient_data';

// 存储数据结构
export interface AppData {
  version: string;
  collections: Collection[];
  current_request?: RequestConfig;
  history: HistoryItem[];
  environments: Environment[];
  currentEnvironmentId: string | null;
  settings: Settings;
}

export interface Settings {
  theme: string;
  language: string;
  timeout: number;
  max_history: number;
  auto_save: boolean;
}

// 默认设置
export const defaultSettings: Settings = {
  theme: 'light',
  language: 'zh-CN',
  timeout: 30000,
  max_history: 100,
  auto_save: true,
};

// 默认环境
const defaultEnvironments: Environment[] = [
  { id: 'dev', name: 'Development', variables: [] },
  { id: 'test', name: 'Testing', variables: [] },
  { id: 'prod', name: 'Production', variables: [] },
];

// 获取默认数据
function getDefaultData(): AppData {
  return {
    version: '1.0.0',
    collections: [{
      id: '__default__',
      name: 'default',
      requests: [],
      folders: [],
    }],
    history: [],
    environments: defaultEnvironments,
    currentEnvironmentId: 'dev',
    settings: defaultSettings,
  };
}

// 从浏览器 localStorage 加载数据
function loadFromLocalStorage(): AppData {
  try {
    const json = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (json) {
      const data = JSON.parse(json) as AppData;
      console.log('[Storage] Data loaded from localStorage');
      return {
        ...getDefaultData(),
        ...data,
        settings: { ...defaultSettings, ...data.settings },
      };
    }
  } catch (error) {
    console.error('[Storage] Failed to load from localStorage:', error);
  }
  return getDefaultData();
}

// 保存到浏览器 localStorage
function saveToLocalStorage(data: AppData): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    console.log('[Storage] Data saved to localStorage');
  } catch (error) {
    console.error('[Storage] Failed to save to localStorage:', error);
  }
}

// 加载数据
export async function loadData(): Promise<AppData> {
  const inTauri = isTauriEnv();
  console.log('[Save] loadData called, isTauriEnv:', inTauri);
  
  // Tauri 环境
  if (inTauri) {
    console.log('[Save] Loading from Tauri...');
    try {
      const data = await invoke<AppData>('cmd_load_data');
      console.log('[Save] Loaded from Tauri:', {
        collections: data.collections?.length,
        history: data.history?.length
      });
      return {
        ...data,
        settings: { ...defaultSettings, ...data.settings },
      };
    } catch (error) {
      console.error('[Save] Failed to load from Tauri:', error);
      return getDefaultData();
    }
  }

  // 浏览器环境：使用 localStorage
  console.log('[Save] Running in browser, using localStorage');
  return loadFromLocalStorage();
}

// 保存数据
export async function saveData(data: AppData): Promise<void> {
  await logToFile('=== saveData called ===');
  const inTauri = isTauriEnv();
  await logToFile(`isTauriEnv(): ${inTauri}`);
  await logToFile(`window.__TAURI__: ${typeof window !== 'undefined' ? !!(window as any).__TAURI__ : 'N/A'}`);
  
  // Tauri 环境
  if (inTauri) {
    await logToFile('Using Tauri invoke cmd_save_data...');
    try {
      await logToFile(`Invoking cmd_save_data with collections: ${data.collections.length}, history: ${data.history.length}`);
      await invoke('cmd_save_data', { data });
      await logToFile('cmd_save_data completed successfully');
      return;
    } catch (error) {
      await logToFile(`Failed to save via Tauri: ${error}`);
      throw error;
    }
  }

  // 浏览器环境：使用 localStorage
  await logToFile('Not in Tauri, using localStorage');
  saveToLocalStorage(data);
  await logToFile('localStorage save completed');
}

// 创建备份（在浏览器环境下，返回空字符串）
export async function createBackup(): Promise<string> {
  if (!isTauriEnv()) {
    console.log('[Storage] Backup not available in browser mode');
    return '';
  }
  try {
    const backupName = await invoke<string>('cmd_create_backup');
    return backupName;
  } catch (error) {
    console.error('[Storage] Failed to create backup:', error);
    throw error;
  }
}

// 列出备份
export async function listBackups(): Promise<string[]> {
  if (!isTauriEnv()) {
    return [];
  }
  try {
    const backups = await invoke<string[]>('cmd_list_backups');
    return backups;
  } catch (error) {
    console.error('[Storage] Failed to list backups:', error);
    return [];
  }
}

// 从备份恢复
export async function restoreBackup(backupName: string): Promise<void> {
  if (!isTauriEnv()) {
    throw new Error('Backup restore not available in browser mode');
  }
  try {
    await invoke('cmd_restore_backup', { backupName });
  } catch (error) {
    console.error('[Storage] Failed to restore backup:', error);
    throw error;
  }
}

// 导出数据
export async function exportData(path: string): Promise<void> {
  if (!isTauriEnv()) {
    throw new Error('Export not available in browser mode');
  }
  try {
    await invoke('cmd_export_data', { path });
  } catch (error) {
    console.error('[Storage] Failed to export data:', error);
    throw error;
  }
}

// 导入数据
export async function importData(path: string): Promise<AppData> {
  if (!isTauriEnv()) {
    throw new Error('Import not available in browser mode');
  }
  try {
    const data = await invoke<AppData>('cmd_import_data', { path });
    return data;
  } catch (error) {
    console.error('[Storage] Failed to import data:', error);
    throw error;
  }
}

// 获取数据目录
export async function getDataDirectory(): Promise<string> {
  if (!isTauriEnv()) {
    return 'Browser localStorage';
  }
  try {
    const dir = await invoke<string>('cmd_get_data_directory');
    return dir;
  } catch (error) {
    console.error('[Storage] Failed to get data directory:', error);
    return '';
  }
}

// 自动保存防抖
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export function debouncedSave(data: AppData, delay = 1000): Promise<void> {
  logToFile('=== debouncedSave called ===');
  const inTauri = isTauriEnv();
  logToFile(`delay: ${delay}, isTauriEnv: ${inTauri}`);
  logToFile(`data stats: collections=${data.collections.length}, history=${data.history.length}`);
  return new Promise((resolve, reject) => {
    if (saveTimeout) {
      logToFile('Clearing previous timeout');
      clearTimeout(saveTimeout);
    }
    
    logToFile(`Setting timeout for ${delay}ms`);
    saveTimeout = setTimeout(async () => {
      try {
        logToFile('Timeout fired, executing saveData...');
        await saveData(data);
        logToFile('saveData completed, resolving promise');
        resolve();
      } catch (error) {
        logToFile(`saveData failed: ${error}`);
        reject(error);
      }
    }, delay);
  });
}
