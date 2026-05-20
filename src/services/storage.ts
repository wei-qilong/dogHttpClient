import { invoke } from '@tauri-apps/api/tauri';
import type { Collection, RequestConfig, HistoryItem } from '../types';

// 存储数据结构
export interface AppData {
  version: string;
  collections: Collection[];
  current_request?: RequestConfig;
  history: HistoryItem[];
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

// 加载数据
export async function loadData(): Promise<AppData> {
  try {
    const data = await invoke<AppData>('cmd_load_data');
    return {
      ...data,
      settings: { ...defaultSettings, ...data.settings },
    };
  } catch (error) {
    console.error('Failed to load data:', error);
    // 返回默认数据
    return {
      version: '1.0.0',
      collections: [{
        id: 'scratch-pad',
        name: 'Scratch Pad',
        requests: [],
        folders: [],
      }],
      history: [],
      settings: defaultSettings,
    };
  }
}

// 保存数据
export async function saveData(data: AppData): Promise<void> {
  try {
    await invoke('cmd_save_data', { data });
  } catch (error) {
    console.error('Failed to save data:', error);
    throw error;
  }
}

// 创建备份
export async function createBackup(): Promise<string> {
  try {
    const backupName = await invoke<string>('cmd_create_backup');
    return backupName;
  } catch (error) {
    console.error('Failed to create backup:', error);
    throw error;
  }
}

// 列出备份
export async function listBackups(): Promise<string[]> {
  try {
    const backups = await invoke<string[]>('cmd_list_backups');
    return backups;
  } catch (error) {
    console.error('Failed to list backups:', error);
    return [];
  }
}

// 从备份恢复
export async function restoreBackup(backupName: string): Promise<void> {
  try {
    await invoke('cmd_restore_backup', { backupName });
  } catch (error) {
    console.error('Failed to restore backup:', error);
    throw error;
  }
}

// 导出数据
export async function exportData(path: string): Promise<void> {
  try {
    await invoke('cmd_export_data', { path });
  } catch (error) {
    console.error('Failed to export data:', error);
    throw error;
  }
}

// 导入数据
export async function importData(path: string): Promise<AppData> {
  try {
    const data = await invoke<AppData>('cmd_import_data', { path });
    return data;
  } catch (error) {
    console.error('Failed to import data:', error);
    throw error;
  }
}

// 获取数据目录
export async function getDataDirectory(): Promise<string> {
  try {
    const dir = await invoke<string>('cmd_get_data_directory');
    return dir;
  } catch (error) {
    console.error('Failed to get data directory:', error);
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
