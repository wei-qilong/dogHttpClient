export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

// Authorization 类型
export type AuthType = 'none' | 'inherit' | 'basic' | 'bearer' | 'apikey' | 'oauth2';

export interface AuthConfig {
  type: AuthType;
  // Basic Auth
  username?: string;
  password?: string;
  // Bearer Token
  token?: string;
  // API Key
  apiKey?: string;
  apiKeyLocation?: 'header' | 'query';
  apiKeyName?: string;
  // OAuth 2.0
  oauth2Config?: {
    grantType: 'authorization_code' | 'client_credentials' | 'password';
    authUrl?: string;
    tokenUrl?: string;
    clientId?: string;
    clientSecret?: string;
    scope?: string;
  };
}

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
  // Authorization 配置
  auth?: AuthConfig;
  // Request 级别变量
  variables?: KeyValuePair[];
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
  // Collection 级别 Authorization
  auth?: AuthConfig;
  // Collection 级别 Variables
  variables?: KeyValuePair[];
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
