// ============ 完整的 cURL 命令解析器 ============
// 支持的 curl 选项:
// - Method: -X, --request
// - Headers: -H, --header
// - Body: -d, --data, --data-raw, --data-binary, --data-urlencode, -F, --form
// - Auth: -u, --user, -b, --cookie
// - Other: -L, --location, -A, --user-agent, -e, --referer
// - Ignored: -v, --verbose, -s, --silent, -o, --output, etc.

interface CurlParseResult {
  method: string;
  url: string;
  headers: Array<{ id: string; key: string; value: string; enabled: boolean }>;
  params: Array<{ id: string; key: string; value: string; enabled: boolean }>;
  bodyType: 'none' | 'raw' | 'form-data' | 'x-www-form-urlencoded' | 'binary';
  bodyContent: string;
  bodyRawType: 'json' | 'xml' | 'text' | 'html';
  formData: Array<{ id: string; key: string; value: string; type: 'text' | 'file'; fileName?: string; enabled: boolean }>;
  urlEncoded: Array<{ id: string; key: string; value: string; enabled: boolean }>;
}

const genId = () => Math.random().toString(36).substring(2, 10);

// 解析 cURL 命令
export const parseCurl = (curlCommand: string): CurlParseResult | null => {
  try {
    // 预处理：合并多行，处理转义
    let cmd = curlCommand.trim();
    
    // 检查是否是 curl 命令
    if (!cmd.toLowerCase().includes('curl')) {
      return null;
    }

    // 移除行末的反斜杠，合并为单行
    cmd = cmd.replace(/\\\s*\n\s*/g, ' ').replace(/\s+/g, ' ');

    // 初始化结果
    const result: CurlParseResult = {
      method: 'GET',
      url: '',
      headers: [],
      params: [],
      bodyType: 'none',
      bodyContent: '',
      bodyRawType: 'json',
      formData: [],
      urlEncoded: [],
    };

    // ===== 1. 提取 URL (需要在处理所有选项之后) =====
    // 临时存储所有匹配到的内容
    let rawUrl = '';
    
    // ===== 2. 解析各种选项 =====
    
    // --- Method: -X, --request ---
    const methodMatch = cmd.match(/(?:-X|--request)\s+['"]?(\w+)['"]?/i);
    if (methodMatch) {
      result.method = methodMatch[1].toUpperCase();
    }

    // --- User-Agent: -A, --user-agent ---
    const userAgentMatch = cmd.match(/(?:-A|--user-agent)\s+['"]([^'"]+)['"]/i) ||
                          cmd.match(/(?:-A|--user-agent)\s+(\S+)/i);
    if (userAgentMatch && !result.headers.some(h => h.key.toLowerCase() === 'user-agent')) {
      result.headers.push({
        id: genId(),
        key: 'User-Agent',
        value: userAgentMatch[1],
        enabled: true,
      });
    }

    // --- Referer: -e, --referer ---
    const refererMatch = cmd.match(/(?:-e|--referer)\s+['"]([^'"]+)['"]/i) ||
                        cmd.match(/(?:-e|--referer)\s+(\S+)/i);
    if (refererMatch && !result.headers.some(h => h.key.toLowerCase() === 'referer')) {
      result.headers.push({
        id: genId(),
        key: 'Referer',
        value: refererMatch[1],
        enabled: true,
      });
    }

    // --- Authorization from -u, --user ---
    const userMatch = cmd.match(/(?:-u|--user)\s+['"]([^'"]+)['"]/i) ||
                     cmd.match(/(?:-u|--user)\s+(\S+)/i);
    if (userMatch && !result.headers.some(h => h.key.toLowerCase() === 'authorization')) {
      const credentials = userMatch[1];
      result.headers.push({
        id: genId(),
        key: 'Authorization',
        value: `Basic ${btoa(credentials)}`,
        enabled: true,
      });
    }

    // --- Cookies: -b, --cookie ---
    const cookieMatch = cmd.match(/(?:-b|--cookie)\s+['"]([^'"]+)['"]/i) ||
                       cmd.match(/(?:-b|--cookie)\s+(\S+)/i);
    if (cookieMatch && !result.headers.some(h => h.key.toLowerCase() === 'cookie')) {
      result.headers.push({
        id: genId(),
        key: 'Cookie',
        value: cookieMatch[1],
        enabled: true,
      });
    }

    // --- Headers: -H, --header ---
    // 匹配 -H 'Header: value' 或 -H "Header: value"
    const headerRegex = /-H\s+['"]([^'"]+)['"]/gi;
    let headerMatch;
    while ((headerMatch = headerRegex.exec(cmd)) !== null) {
      const headerStr = headerMatch[1];
      const colonIndex = headerStr.indexOf(':');
      if (colonIndex > 0) {
        const key = headerStr.substring(0, colonIndex).trim();
        const value = headerStr.substring(colonIndex + 1).trim();
        // 避免重复添加
        if (!result.headers.some(h => h.key.toLowerCase() === key.toLowerCase())) {
          result.headers.push({
            id: genId(),
            key,
            value,
            enabled: true,
          });
        }
      }
    }

    // --- Form Data: -F, --form ---
    const formRegex = /-F\s+['"]([^'"]+)['"]/gi;
    let formMatch;
    while ((formMatch = formRegex.exec(cmd)) !== null) {
      const formStr = formMatch[1];
      const equalIndex = formStr.indexOf('=');
      if (equalIndex > 0) {
        let key = formStr.substring(0, equalIndex).trim();
        let value = formStr.substring(equalIndex + 1).trim();
        
        // 移除引号
        value = value.replace(/^["']|["']$/g, '');
        
        // 检查是否是文件上传 (@file)
        const isFile = value.startsWith('@');
        
        result.formData.push({
          id: genId(),
          key,
          value: isFile ? value.substring(1) : value,
          fileName: isFile ? value.substring(1) : undefined,
          type: isFile ? 'file' : 'text',
          enabled: true,
        });
        result.bodyType = 'form-data';
      }
    }

    // --- URL-encoded Data: --data-urlencode ---
    const urlEncodedRegex = /--data-urlencode\s+['"]([^'"]+)['"]/gi;
    let urlEncodedMatch;
    while ((urlEncodedMatch = urlEncodedRegex.exec(cmd)) !== null) {
      const dataStr = urlEncodedMatch[1];
      const equalIndex = dataStr.indexOf('=');
      if (equalIndex > 0) {
        const key = dataStr.substring(0, equalIndex);
        const value = dataStr.substring(equalIndex + 1);
        result.urlEncoded.push({
          id: genId(),
          key: encodeURIComponent(key),
          value: encodeURIComponent(value),
          enabled: true,
        });
        result.bodyType = 'x-www-form-urlencoded';
      }
    }

    // --- Body Data: -d, --data, --data-raw, --data-binary ---
    // 按优先级尝试匹配
    const dataPatterns = [
      { regex: /--data-raw\s+['"]([^'"]+)['"]/gi, type: 'raw' },
      { regex: /--data-binary\s+['"]([^'"]+)['"]/gi, type: 'binary' },
      { regex: /--data\s+['"]([^'"]+)['"]/gi, type: 'data' },
      { regex: /-d\s+['"]([^'"]+)['"]/gi, type: 'data' },
    ];

    let bodyExtracted = false;
    
    for (const pattern of dataPatterns) {
      if (bodyExtracted) break;
      
      const match = cmd.match(pattern.regex);
      if (match) {
        const bodyContent = match[1];
        bodyExtracted = true;
        
        // 如果已经有 form-data，不再处理
        if (result.bodyType === 'form-data') continue;
        
        // 检查 Content-Type
        const contentType = result.headers.find(h => h.key.toLowerCase() === 'content-type')?.value || '';
        
        // 自动检测 JSON
        const isJson = contentType.includes('json') || 
                       bodyContent.trim().startsWith('{') || 
                       bodyContent.trim().startsWith('[');
        
        if (isJson) {
          result.bodyType = 'raw';
          result.bodyRawType = 'json';
          result.bodyContent = bodyContent;
        } else if (contentType.includes('x-www-form-urlencoded')) {
          result.bodyType = 'x-www-form-urlencoded';
          const pairs = bodyContent.split('&');
          result.urlEncoded = pairs.map(pair => {
            const [key, value] = pair.split('=');
            return {
              id: genId(),
              key: decodeURIComponent(key || ''),
              value: decodeURIComponent(value || ''),
              enabled: true,
            };
          });
        } else {
          result.bodyType = pattern.type === 'binary' ? 'binary' : 'raw';
          result.bodyRawType = 'text';
          result.bodyContent = bodyContent;
        }
      }
    }

    // --- 处理 @file 语法 (从文件读取数据) ---
    // 匹配 -d @filename 或 --data @filename
    const fileDataRegex = /(?:-d|--data|--data-raw)\s+@(\S+)/gi;
    const fileDataMatch = cmd.match(fileDataRegex);
    if (fileDataMatch && result.bodyType !== 'form-data') {
      // 标记为 binary，因为从文件读取
      result.bodyType = 'binary';
      result.bodyContent = fileDataMatch[0];
    }

    // ===== 3. 提取 URL =====
    // 移除所有已知选项后获取 URL
    let cleanedCmd = cmd
      // Method
      .replace(/(?:-X|--request)\s+['"]?\w+['"]?\s*/gi, '')
      // Headers
      .replace(/-H\s+['"][^'"]+['"]\s*/gi, '')
      // User-Agent
      .replace(/(?:-A|--user-agent)\s+['"]?\S+['"]?\s*/gi, '')
      // Referer
      .replace(/(?:-e|--referer)\s+['"]?\S+['"]?\s*/gi, '')
      // Auth
      .replace(/(?:-u|--user)\s+['"]?\S+['"]?\s*/gi, '')
      // Cookie
      .replace(/(?:-b|--cookie)\s+['"]?\S+['"]?\s*/gi, '')
      // Form
      .replace(/-F\s+['"][^'"]+['"]\s*/gi, '')
      // Data
      .replace(/--data-raw\s+['"][^'"]+['"]\s*/gi, '')
      .replace(/--data-binary\s+['"][^'"]+['"]\s*/gi, '')
      .replace(/--data\s+['"][^'"]+['"]\s*/gi, '')
      .replace(/-d\s+['"][^'"]+['"]\s*/gi, '')
      .replace(/--data-urlencode\s+['"][^'"]+['"]\s*/gi, '')
      // Location
      .replace(/--location\s*/gi, '')
      .replace(/-L\s*/gi, '')
      .trim();

    // 提取 curl 后面的 URL
    // 格式: curl 'url' 或 curl "url" 或 curl url
    const urlPatterns = [
      /curl\s+['"]([^'"]+)['"]/i,
      /curl\s+(\S+)/i,
    ];

    for (const urlPattern of urlPatterns) {
      const urlMatch = cleanedCmd.match(urlPattern);
      if (urlMatch) {
        rawUrl = urlMatch[1];
        break;
      }
    }

    if (!rawUrl) {
      // 最后尝试：获取命令行中最后一个看起来像 URL 的字符串
      const words = cleanedCmd.replace(/^curl\s*/i, '').trim().split(/\s+/);
      if (words.length > 0) {
        rawUrl = words[words.length - 1];
      }
    }

    // 清理 URL
    result.url = rawUrl
      .replace(/^['"]|['"]$/g, '') // 移除首尾引号
      .replace(/^curl\s+/i, '')    // 移除开头的 curl
      .trim();

    // ===== 4. 提取 URL 参数 =====
    if (result.url) {
      try {
        // 处理 ? 在 URL 中的情况
        const questionMarkIndex = result.url.indexOf('?');
        if (questionMarkIndex > -1) {
          const paramsStr = result.url.substring(questionMarkIndex + 1);
          result.url = result.url.substring(0, questionMarkIndex);
          
          // 解析参数
          const pairs = paramsStr.split('&');
          for (const pair of pairs) {
            if (pair.trim()) {
              const [key, ...valueParts] = pair.split('=');
              const value = valueParts.join('='); // 处理 value 中可能包含的 =
              result.params.push({
                id: genId(),
                key: decodeURIComponent(key || ''),
                value: decodeURIComponent(value || ''),
                enabled: true,
              });
            }
          }
        }
      } catch (e) {
        // URL 解析失败，保持原样
      }
    }

    // ===== 5. 确保有默认值 =====
    if (!result.method) result.method = 'GET';

    return result;
  } catch (error) {
    console.error('Failed to parse curl command:', error);
    return null;
  }
};

// 不支持的 curl 选项（会被忽略）
export const unsupportedCurlOptions = [
  // 输出相关
  '-o', '--output',           // 输出到文件
  '-O', '--remote-name',     // 使用远程文件名
  '-I', '--head',             // 只获取头部
  '-i', '--include',          // 输出包含头部
  '-D', '--dump-header',      // 保存头部到文件
  '-w', '--write-out',        // 写入输出
  '-s', '--silent',           // 静默模式
  '-S', '--show-error',       // 显示错误
  '-v', '--verbose',          // 详细输出
  '-q',                      // 禁用配置文件
  
  // 连接相关
  '-L', '--location',         // 跟随重定向（被忽略）
  '--max-redirs',             // 最大重定向次数
  '--max-time',               // 最大时间
  '--connect-timeout',        // 连接超时
  '-x', '--proxy',            // 使用代理
  '--noproxy',                // 不使用代理
  
  // SSL/TLS 相关
  '-k', '--insecure',         // 允许不安全连接
  '-E', '--cert',             // 客户端证书
  '--cert-type',              // 证书类型
  '--cacert',                 // CA 证书
  '--capath',                 // CA 证书目录
  '--tlsv1', '--tlsv1.1', '--tlsv1.2', '--tlsv1.3',  // TLS 版本
  '--ssl',                    // 尝试 SSL
  
  // 上传/下载相关
  '-T', '--upload-file',      // 上传文件
  '-G', '--get',              // 将数据转为 GET
  '-K', '--config',           // 从配置文件读取
  '-C', '--continue-at',      // 断点续传
  '-f', '--fail',             // 失败时无输出
  '-F', '--form',             // multipart 表单（部分支持）
  
  // 其他
  '--compressed',              // 接受压缩
  '--retry',                   // 重试次数
  '--retry-delay',            // 重试延迟
  '--retry-max-time',         // 最大重试时间
  '--proxy-user',             // 代理认证
  '--proxy-basic',            // 代理基本认证
  '--proxy-digest',           // 代理 Digest 认证
  '--ntlm',                   // NTLM 认证
  '--negotiate',              // negotiate 认证
  '--digest',                 // Digest 认证
];

export default parseCurl;
