import type { KeyValuePair } from '../types';

// 从完整 URL 中提取 baseUrl 和 params
export function parseUrlToParams(fullUrl: string): {
  baseUrl: string;
  params: KeyValuePair[];
} {
  const questionMarkIndex = fullUrl.indexOf('?');

  if (questionMarkIndex === -1) {
    return { baseUrl: fullUrl, params: [] };
  }

  const baseUrl = fullUrl.substring(0, questionMarkIndex);
  const queryString = fullUrl.substring(questionMarkIndex + 1);

  if (!queryString) {
    return { baseUrl, params: [] };
  }

  const pairs = queryString.split('&');
  const params: KeyValuePair[] = [];

  for (const pair of pairs) {
    if (pair === '') continue;
    const equalIndex = pair.indexOf('=');
    let key: string;
    let value: string;

    if (equalIndex === -1) {
      key = decodeURIComponent(pair);
      value = '';
    } else if (equalIndex === pair.length - 1) {
      key = decodeURIComponent(pair.substring(0, equalIndex));
      value = '';
    } else {
      key = decodeURIComponent(pair.substring(0, equalIndex));
      value = decodeURIComponent(pair.substring(equalIndex + 1));
    }

    params.push({
      id: Math.random().toString(36).substring(2, 10),
      key,
      value,
      description: '',
      enabled: true,
    });
  }

  return { baseUrl, params };
}

// 根据 params 数组构建 query 字符串（用于显示，不编码）
export function buildDisplayQueryString(params: KeyValuePair[]): string {
  const enabled = params.filter(p => p.enabled && p.key);
  if (enabled.length === 0) return '';
  return '?' + enabled.map(p => `${p.key}=${p.value}`).join('&');
}

// 根据 params 数组构建 query 字符串（用于发送请求，需要编码）
export function buildEncodedQueryString(params: KeyValuePair[]): string {
  const enabled = params.filter(p => p.enabled && p.key);
  if (enabled.length === 0) return '';
  return '?' + enabled
    .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join('&');
}

// 合并 URL：baseUrl + params 的 query 字符串
export function buildFullUrl(baseUrl: string, params: KeyValuePair[]): string {
  return baseUrl + buildDisplayQueryString(params);
}
