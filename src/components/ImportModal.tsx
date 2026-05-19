import { useState } from 'react';
import { Modal, Tabs, Input, Button, message, Alert } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useAppStore } from '../store';
import { parseCurl } from '../utils/curlParser';
import type { RequestConfig, HttpMethod } from '../types';

const { TextArea } = Input;

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
}

// 生成唯一ID
const genId = () => Math.random().toString(36).substring(2, 10);

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
          method: (parsed.method || 'GET') as HttpMethod,
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
                  message="Supported cURL Options"
                  description={
                    <div style={{ fontSize: 11 }}>
                      <div><b>Methods:</b> -X, --request</div>
                      <div><b>Headers:</b> -H, --header</div>
                      <div><b>Body:</b> -d, --data, --data-raw, --data-binary, --data-urlencode, -F, --form</div>
                      <div><b>Auth:</b> -u, --user, -b, --cookie</div>
                      <div><b>Other:</b> -A (user-agent), -e (referer)</div>
                      <div style={{ color: '#666', marginTop: 4 }}>Multi-line curl commands are supported.</div>
                    </div>
                  }
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
                  rows={10}
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
