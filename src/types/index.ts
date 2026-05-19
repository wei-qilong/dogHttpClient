export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
  // form-data 专用字段
  type?: 'text' | 'file';
  fileName?: string;
}

export interface RequestConfig {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValuePair[];
  headers: KeyValuePair[];
  bodyType: 'none' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary';
  bodyContent: string;
  bodyRawType: 'json' | 'xml' | 'text' | 'html';
  formData?: KeyValuePair[];
  urlEncoded?: KeyValuePair[];
  binaryFile?: { name: string; type: string; data: string };
  preRequestScript: string;
  testsScript: string;
}

export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  requests: RequestConfig[];
  folders: Folder[];
}

export interface Folder {
  id: string;
  name: string;
  requests: RequestConfig[];
  folders: Folder[];
}

export interface Environment {
  id: string;
  name: string;
  variables: KeyValuePair[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  request: RequestConfig;
  response?: ResponseData;
}
