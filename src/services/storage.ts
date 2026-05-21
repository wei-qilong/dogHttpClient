import { invoke } from '@tauri-apps/api/tauri';
import type { Collection, RequestConfig, HistoryItem, Environment } from '../types';

// 检测是否在 Tauri 环境中
const isTauri = typeof window !== 'undefined' && window.__TAURI__;

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
  // Tauri 环境
  if (isTauri) {
    try {
      const data = await invoke<AppData>('cmd_load_data');
      return {
        ...data,
        settings: { ...defaultSettings, ...data.settings },
      };
    } catch (error) {
      console.error('[Storage] Failed to load from Tauri:', error);
      return getDefaultData();
    }
  }

  // 浏览器环境：使用 localStorage
  console.log('[Storage] Running in browser, using localStorage');
  return loadFromLocalStorage();
}

// 保存数据
export async function saveData(data: AppData): Promise<void> {
  // Tauri 环境
  if (isTauri) {
    try {
      await invoke('cmd_save_data', { data });
      console.log('[Storage] Data saved via Tauri');
      return;
    } catch (error) {
      console.error('[Storage] Failed to save via Tauri:', error);
      throw error;
    }
  }

  // 浏览器环境：使用 localStorage
  console.log('[Storage] Saving in browser, using localStorage');
  saveToLocalStorage(data);
}

// 创建备份（在浏览器环境下，返回空字符串）
export async function createBackup(): Promise<string> {
  if (!isTauri) {
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
  if (!isTauri) {
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
  if (!isTauri) {
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
  if (!isTauri) {
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
  if (!isTauri) {
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
  if (!isTauri) {
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
  return new Promise((resolve, reject) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    saveTimeout = setTimeout(async () => {
      try {
        await saveData(data);
        resolve();
      } catch (error) {
        reject(error);
      }
    }, delay);
  });
}
