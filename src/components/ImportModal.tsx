import { useState } from 'react';
import { Modal, Tabs, Input, Button, message, Alert } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useAppStore } from '../store';
import type { RequestConfig } from '../types';

const { TextArea } = Input;

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
}

// 生成唯一ID
const genId = () => Math.random().toString(36).substring(2, 10);

// 解析 cURL 命令
const parseCurl = (curlCommand: string): Partial<RequestConfig> | null => {
  try {
    // 清理命令，处理多行格式
    let cmd = curlCommand.trim();
    
    // 检查是否是 curl 命令
    if (!cmd.includes('curl')) {
      return null;
    }

    // 移除行末的反斜杠，合并为单行
    cmd = cmd.replace(/\\\n/g, ' ').replace(/\s+/g, ' ');

    const result: Partial<RequestConfig> = {
      method: 'GET',
      url: '',
      headers: [],
      params: [],
      bodyType: 'none',
      bodyContent: '',
      formData: [],
      urlEncoded: [],
      preRequestScript: '',
      testsScript: '',
    };

    // 移除 --location 等选项，简化后续处理
    cmd = cmd.replace(/--location\s*/gi, '');
    cmd = cmd.replace(/-L\s*/gi, '');

    // 提取 Method (-X 或 --request)
    const methodMatch = cmd.match(/-X\s+['"]?(\w+)['"]?/i) || cmd.match(/--request\s+['"]?(\w+)['"]?/i);
    if (methodMatch) {
      result.method = methodMatch[1].toUpperCase() as RequestConfig['method'];
    }

    // 提取 Headers (-H 或 --header)
    const headerRegex = /-H\s+['"]([^'"]+)['"]/gi;
    let headerMatch;
    while ((headerMatch = headerRegex.exec(cmd)) !== null) {
      const header = headerMatch[1];
      const colonIndex = header.indexOf(':');
      if (colonIndex > 0) {
        const key = header.substring(0, colonIndex).trim();
        const value = header.substring(colonIndex + 1).trim();
        result.headers!.push({
          id: genId(),
          key,
          value,
          enabled: true,
        });
      }
    }

    // 提取 --form 数据 (multipart/form-data)
    const formRegex = /--form\s+['"]([^'"]+)['"]/gi;
    let formMatch;
    while ((formMatch = formRegex.exec(cmd)) !== null) {
      const formValue = formMatch[1];
      // 格式: name="value" 或 name=@filename
      const equalIndex = formValue.indexOf('=');
      if (equalIndex > 0) {
        const key = formValue.substring(0, equalIndex).trim();
        let value = formValue.substring(equalIndex + 1).trim();
        // 移除引号
        value = value.replace(/^["']|["']$/g, '');
        
        // 检查是否是文件上传
        const isFile = value.startsWith('@');
        result.formData!.push({
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

    // 提取 Body (-d, --data, --data-raw)
    const dataPatterns = [
      /--data-raw\s+['"]([^'"]+)['"]/i,
      /--data\s+['"]([^'"]+)['"]/i,
      /-d\s+['"]([^'"]+)['"]/i,
    ];
    
    let bodyExtracted = false;
    for (const pattern of dataPatterns) {
      const dataMatch = cmd.match(pattern);
      if (dataMatch && !bodyExtracted) {
        bodyExtracted = true;
        let bodyContent = dataMatch[1];
        
        // 如果有 Content-Type，检查 body 类型
        const contentType = result.headers!.find(h => h.key.toLowerCase() === 'content-type')?.value || '';
        
        if (result.bodyType !== 'form-data') {
          if (contentType.includes('application/json') || 
              (bodyContent.trim().startsWith('{') || bodyContent.trim().startsWith('['))) {
            result.bodyType = 'raw';
            result.bodyRawType = 'json';
            result.bodyContent = bodyContent;
          } else if (contentType.includes('application/x-www-form-urlencoded')) {
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
            result.bodyType = 'raw';
            result.bodyRawType = 'text';
            result.bodyContent = bodyContent;
          }
        }
      }
    }

    // 提取 URL（必须在最后处理，确保其他选项都已提取）
    // 移除已知的选项后提取 URL
    let urlCmd = cmd
      .replace(/-X\s+\w+\s*/gi, '')
      .replace(/--request\s+\w+\s*/gi, '')
      .replace(/-H\s+['"][^'"]+['"]\s*/gi, '')
      .replace(/--header\s+['"][^'"]+['"]\s*/gi, '')
      .replace(/--form\s+['"][^'"]+['"]\s*/gi, '')
      .replace(/-d\s+['"][^'"]+['"]\s*/gi, '')
      .replace(/--data\s+['"][^'"]+['"]\s*/gi, '')
      .replace(/--data-raw\s+['"][^'"]+['"]\s*/gi, '')
      .replace(/--location\s*/gi, '')
      .replace(/-L\s*/gi, '')
      .trim();

    // 提取 curl 后面的 URL
    const urlMatch = urlCmd.match(/curl\s+['"]?([^'"\s]+)['"]?\s*$/i) ||
                    urlCmd.match(/curl\s+['"]([^'"]+)['"]/i) ||
                    urlCmd.match(/curl\s+"([^"]+)"/i);
    
    if (urlMatch) {
      result.url = urlMatch[1] || '';
    } else {
      // 尝试直接获取最后一个有效 URL
      const words = urlCmd.split(/\s+/).filter(w => w && !w.startsWith('-'));
      if (words.length > 0) {
        result.url = words[words.length - 1];
      }
    }

    // 移除 URL 中的引号
    if (result.url) {
      result.url = result.url.replace(/^['"]|['"]$/g, '');
    }

    // 提取 URL 参数 (?后面的部分)
    if (result.url) {
      const urlParamsMatch = result.url.match(/\?(.+)$/);
      if (urlParamsMatch) {
        const paramsStr = urlParamsMatch[1];
        result.url = result.url.replace(/\?.*$/, '');
        const pairs = paramsStr.split('&');
        result.params = pairs.map(pair => {
          const [key, value] = pair.split('=');
          return {
            id: genId(),
            key: decodeURIComponent(key || ''),
            value: decodeURIComponent(value || ''),
            enabled: true,
          };
        });
      }
    }

    return result;
  } catch (error) {
    console.error('Failed to parse curl:', error);
    return null;
  }
};

// 导入 Modal 组件
export function ImportModal({ open, onClose }: ImportModalProps) {
  const [activeTab, setActiveTab] = useState('curl');
  const [curlInput, setCurlInput] = useState('');
  const [parsing, setParsing] = useState(false);

  const { setCurrentRequest } = useAppStore();

  const handleImportCurl = () => {
    if (!curlInput.trim()) {
      message.warning('Please enter a cURL command');
      return;
    }

    setParsing(true);
    
    setTimeout(() => {
      const parsed = parseCurl(curlInput);
      
      if (parsed && parsed.url) {
        const newRequest: RequestConfig = {
          id: genId(),
          name: 'Imported Request',
          method: parsed.method || 'GET',
          url: parsed.url || '',
          headers: parsed.headers || [],
          params: parsed.params || [],
          bodyType: parsed.bodyType || 'none',
          bodyContent: parsed.bodyContent || '',
          bodyRawType: parsed.bodyRawType || 'json',
          formData: parsed.formData || [],
          urlEncoded: parsed.urlEncoded || [],
          preRequestScript: '',
          testsScript: '',
        };

        setCurrentRequest(newRequest);
        message.success('Import successful!');
        setCurlInput('');
        onClose();
      } else {
        message.error('Failed to parse cURL command. Please check the format.');
      }
      
      setParsing(false);
    }, 100);
  };

  const handleFileImport = (type: 'postman' | 'openapi') => {
    if (type === 'postman') {
      message.info('Postman import: Feature coming soon!');
    } else if (type === 'openapi') {
      message.info('OpenAPI/Swagger import: Feature coming soon!');
    }
  };

  return (
    <Modal
      title="Import Request"
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'curl',
            label: 'cURL',
            children: (
              <div>
                <Alert
                  message="Paste your cURL command below"
                  description="Supports common cURL formats with -X, -H, -d, --data, -A options"
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                <TextArea
                  value={curlInput}
                  onChange={(e) => setCurlInput(e.target.value)}
                  placeholder={`curl -X POST 'https://api.example.com/users' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer token' \\
  -d '{"name":"John","age":30}'`}
                  rows={8}
                  style={{ 
                    fontFamily: 'monospace',
                    fontSize: 12,
                    marginBottom: 16
                  }}
                />
                <Button
                  type="primary"
                  onClick={handleImportCurl}
                  loading={parsing}
                  block
                >
                  Import from cURL
                </Button>
              </div>
            ),
          },
          {
            key: 'postman',
            label: 'Postman',
            children: (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <UploadOutlined style={{ fontSize: 48, color: '#94A3B8', marginBottom: 16 }} />
                <h3 style={{ color: '#64748B', marginBottom: 8 }}>Postman Collection</h3>
                <p style={{ color: '#94A3B8', marginBottom: 24 }}>
                  Import your Postman collections (.json)
                </p>
                <input
                  type="file"
                  accept=".json"
                  id="postman-import"
                  style={{ display: 'none' }}
                  onChange={() => handleFileImport('postman')}
                />
                <Button 
                  type="primary"
                  icon={<UploadOutlined />}
                  onClick={() => document.getElementById('postman-import')?.click()}
                >
                  Select File
                </Button>
              </div>
            ),
          },
          {
            key: 'openapi',
            label: 'OpenAPI',
            children: (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <UploadOutlined style={{ fontSize: 48, color: '#94A3B8', marginBottom: 16 }} />
                <h3 style={{ color: '#64748B', marginBottom: 8 }}>OpenAPI / Swagger</h3>
                <p style={{ color: '#94A3B8', marginBottom: 24 }}>
                  Import API specifications (.json, .yaml)
                </p>
                <input
                  type="file"
                  accept=".json,.yaml,.yml"
                  id="openapi-import"
                  style={{ display: 'none' }}
                  onChange={() => handleFileImport('openapi')}
                />
                <Button 
                  type="primary"
                  icon={<UploadOutlined />}
                  onClick={() => document.getElementById('openapi-import')?.click()}
                >
                  Select File
                </Button>
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
}

export default ImportModal;
