import type { AuthConfig, RequestConfig, Collection } from '../types';

/**
 * 获取请求实际使用的 Auth 配置
 * 如果 request.auth.type === 'inherit'，则使用 collection.auth
 */
export function getEffectiveAuth(
  request: RequestConfig,
  collection?: Collection
): AuthConfig | undefined {
  // 如果请求没有 auth 配置，尝试使用 collection 的
  if (!request.auth) {
    return collection?.auth;
  }

  // 如果请求设置了继承，使用 collection 的 auth
  if (request.auth.type === 'inherit') {
    return collection?.auth;
  }

  // 使用请求自己的 auth
  return request.auth;
}

/**
 * 应用 Auth 到请求头
 */
export function applyAuthToRequest(
  request: RequestConfig,
  auth?: AuthConfig
): RequestConfig {
  if (!auth || auth.type === 'none') {
    return request;
  }

  const headers = [...request.headers];

  switch (auth.type) {
    case 'basic':
      if (auth.username && auth.password) {
        const credentials = btoa(`${auth.username}:${auth.password}`);
        // 检查是否已存在 Authorization 头
        const existingIndex = headers.findIndex(h => h.key.toLowerCase() === 'authorization');
        const authHeader = {
          id: `auth-${Date.now()}`,
          key: 'Authorization',
          value: `Basic ${credentials}`,
          enabled: true,
        };
        if (existingIndex >= 0) {
          headers[existingIndex] = authHeader;
        } else {
          headers.push(authHeader);
        }
      }
      break;

    case 'bearer':
      if (auth.token) {
        const existingIndex = headers.findIndex(h => h.key.toLowerCase() === 'authorization');
        const authHeader = {
          id: `auth-${Date.now()}`,
          key: 'Authorization',
          value: `Bearer ${auth.token}`,
          enabled: true,
        };
        if (existingIndex >= 0) {
          headers[existingIndex] = authHeader;
        } else {
          headers.push(authHeader);
        }
      }
      break;

    case 'apikey':
      if (auth.apiKey && auth.apiKeyName) {
        if (auth.apiKeyLocation === 'header') {
          const existingIndex = headers.findIndex(h => h.key === auth.apiKeyName);
          const apiKeyHeader = {
            id: `auth-${Date.now()}`,
            key: auth.apiKeyName,
            value: auth.apiKey,
            enabled: true,
          };
          if (existingIndex >= 0) {
            headers[existingIndex] = apiKeyHeader;
          } else {
            headers.push(apiKeyHeader);
          }
        }
        // 如果 apiKeyLocation === 'query'，需要在 URL 中添加参数
        // 这个逻辑在发送请求时处理
      }
      break;

    case 'oauth2':
      // OAuth 2.0 需要获取 token，这里简化处理
      // 实际应该在 pre-request script 中获取 token
      if (auth.oauth2Config) {
        // 这里可以添加获取 token 的逻辑
      }
      break;
  }

  return {
    ...request,
    headers,
  };
}

/**
 * 处理 API Key 的 query 参数
 */
export function applyApiKeyToUrl(
  url: string,
  auth?: AuthConfig
): string {
  if (!auth || auth.type !== 'apikey' || auth.apiKeyLocation !== 'query') {
    return url;
  }

  if (!auth.apiKey || !auth.apiKeyName) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${encodeURIComponent(auth.apiKeyName)}=${encodeURIComponent(auth.apiKey)}`;
}
