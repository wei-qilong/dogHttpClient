import type { Collection, Environment, RequestConfig } from '../types';

/**
 * 从文本中提取所有变量引用 {{variableName}}
 */
export function extractVariables(text: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1].trim());
  }
  return [...new Set(matches)]; // 去重
}

/**
 * 替换文本中的变量
 * @param text 原始文本
 * @param variables 变量映射表
 */
export function replaceVariables(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    const key = varName.trim();
    return variables[key] !== undefined ? variables[key] : match;
  });
}

/**
 * 构建变量映射表（按优先级：request > collection > environment）
 */
export function buildVariableMap(
  request: RequestConfig,
  collection?: Collection,
  environment?: Environment
): Record<string, string> {
  const map: Record<string, string> = {};

  // 3. Environment 变量（最低优先级）
  if (environment?.variables) {
    environment.variables
      .filter(v => v.enabled)
      .forEach(v => {
        map[v.key] = v.value;
      });
  }

  // 2. Collection 变量（中优先级）
  if (collection?.variables) {
    collection.variables
      .filter(v => v.enabled)
      .forEach(v => {
        map[v.key] = v.value;
      });
  }

  // 1. Request 变量（最高优先级）
  if (request.variables) {
    request.variables
      .filter(v => v.enabled)
      .forEach(v => {
        map[v.key] = v.value;
      });
  }

  return map;
}

/**
 * 处理请求中的所有变量替换
 */
export function processRequestVariables(
  request: RequestConfig,
  collection?: Collection,
  environment?: Environment
): RequestConfig {
  const variableMap = buildVariableMap(request, collection, environment);

  // 替换 URL
  const processedUrl = replaceVariables(request.url, variableMap);

  // 替换 Headers (key, value, description)
  const processedHeaders = request.headers.map(h => ({
    ...h,
    key: replaceVariables(h.key, variableMap),
    value: replaceVariables(h.value, variableMap),
    description: replaceVariables(h.description || '', variableMap),
  }));

  // 替换 Params (key, value, description)
  const processedParams = request.params.map(p => ({
    ...p,
    key: replaceVariables(p.key, variableMap),
    value: replaceVariables(p.value, variableMap),
    description: replaceVariables(p.description || '', variableMap),
  }));

  // 替换 Body
  const processedBodyContent = replaceVariables(request.bodyContent, variableMap);

  // 替换 formData (key, value, description)
  const processedFormData = request.formData?.map(f => ({
    ...f,
    key: replaceVariables(f.key, variableMap),
    value: replaceVariables(f.value, variableMap),
    description: replaceVariables(f.description || '', variableMap),
  }));

  // 替换 urlEncoded (key, value, description)
  const processedUrlEncoded = request.urlEncoded?.map(u => ({
    ...u,
    key: replaceVariables(u.key, variableMap),
    value: replaceVariables(u.value, variableMap),
    description: replaceVariables(u.description || '', variableMap),
  }));

  return {
    ...request,
    url: processedUrl,
    headers: processedHeaders,
    params: processedParams,
    bodyContent: processedBodyContent,
    formData: processedFormData,
    urlEncoded: processedUrlEncoded,
  };
}
