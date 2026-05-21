import { useState, useMemo, useEffect } from 'react';
import { DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { 
  Button, 
  Input, 
  Select,
  Tabs, 
  Table, 
  Switch, 
  Radio,
  Tag,
  Tooltip
} from 'antd';
import type { TabsProps } from 'antd';
import { useAppStore } from '../store';
import type { KeyValuePair } from '../types';

const { TextArea } = Input;

// Simple UUID generator
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Helper: ensure at least one empty row at the end
const ensureEmptyRow = (items: KeyValuePair[]): KeyValuePair[] => {
  if (items.length === 0) {
    return [{ id: generateId(), key: '', value: '', description: '', enabled: true }];
  }
  const last = items[items.length - 1];
  if (last.key !== '' || last.value !== '') {
    return [...items, { id: generateId(), key: '', value: '', description: '', enabled: true }];
  }
  return items;
};

interface RequestPanelProps {
  onParamsChange?: (params: KeyValuePair[]) => void;
}

export function RequestPanel({ onParamsChange }: RequestPanelProps = {}) {
  const { 
    currentRequest
  } = useAppStore();
  
  const [activeTab, setActiveTab] = useState('params');

  // 计算启用的 headers 数量（用于 tab 标签显示）
  const enabledHeadersCount = currentRequest.headers.filter(h => h.enabled && h.key).length;
  // 计算启用的 params 数量
  const enabledParamsCount = currentRequest.params.filter(p => p.enabled && p.key).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* 标签栏 */}
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        size="small"
        tabBarStyle={{ 
          padding: '0 16px',
          marginBottom: 0,
          borderBottom: '1px solid #E2E8F0',
          background: '#FFFFFF'
        }}
        destroyOnHidden
        items={[
          {
            key: 'params',
            label: (
              <span style={{ fontSize: 13 }}>
                Params
                {enabledParamsCount > 0 && (
                  <Tag style={{ marginLeft: 4, fontSize: 10, background: '#EEF2FF', color: '#6366F1', border: 'none' }}>
                    {enabledParamsCount}
                  </Tag>
                )}
              </span>
            ),
            children: <ParamsTab onParamsChange={onParamsChange} />,
          },
          {
            key: 'auth',
            label: <span style={{ fontSize: 13 }}>Authorization</span>,
            children: <AuthTab />,
          },
          {
            key: 'headers',
            label: (
              <span style={{ fontSize: 13 }}>
                Headers
                {enabledHeadersCount > 0 && (
                  <Tag style={{ marginLeft: 4, fontSize: 10, background: '#EEF2FF', color: '#6366F1', border: 'none' }}>
                    {enabledHeadersCount}
                  </Tag>
                )}
              </span>
            ),
            children: <HeadersTab />,
          },
          {
            key: 'body',
            label: <span style={{ fontSize: 13 }}>Body</span>,
            children: <BodyTab />,
          },
          {
            key: 'preScript',
            label: <span style={{ fontSize: 13 }}>Pre-request Script</span>,
            children: <PreRequestScriptTab />,
          },
          {
            key: 'tests',
            label: <span style={{ fontSize: 13 }}>Tests</span>,
            children: <TestsTab />,
          },
          {
            key: 'settings',
            label: <span style={{ fontSize: 13 }}>Settings</span>,
            children: <SettingsTab />,
          },
          {
            key: 'code',
            label: <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>&lt;/&gt;</span>,
            children: <CodeTab />,
          },
        ] as TabsProps['items']}
      />
    </div>
  );
}

// Params 标签页 - 绑定到 store
function ParamsTab() {
  const { currentRequest, setCurrentRequest } = useAppStore();
  
  // 确保 params 数组存在，如果不存在则初始化为空数组
  const params = currentRequest.params || [];
  
  // 使用本地 state 存储显示数据，避免每次按键都更新 store
  const [localParams, setLocalParams] = useState<KeyValuePair[]>(params);
  
  // 当 store 中的 params 变化时（如切换请求），同步本地 state
  useEffect(() => {
    setLocalParams(params);
  }, [params]);

  // 稳定的空行 ID，避免每次渲染重新生成导致输入框失焦
  const emptyRowId = useMemo(() => generateId(), []);
  
  // 显示用的数据：localParams + 一个用于输入的空行
  // 空行只用于显示，不存储在 localParams 中
  const displayParams = [...localParams, { id: emptyRowId, key: '', value: '', description: '', enabled: true }];

  // 判断是否是最后一行的空行
  const isLastRow = (index: number) => index === displayParams.length - 1;

  // 只在 blur 或 enter 时同步到 store
  const syncToStore = (newParams: KeyValuePair[]) => {
    // 过滤掉空行（key 和 value 都为空），但保留最后一行的空行用于继续输入
    const validParams = newParams
      .filter(p => p.key !== '' || p.value !== '')
      // 如果 param 的 ID 与空行 ID 相同，分配新 ID 避免冲突
      .map(p => p.id === emptyRowId ? { ...p, id: generateId() } : p);
    setLocalParams(validParams);
    setCurrentRequest({ params: validParams });
  };

  const columns = [
    {
      title: '',
      width: 32,
      render: (_text: string, record: KeyValuePair, index: number) => (
        <Switch 
          size="small" 
          checked={record.enabled}
          onChange={(checked) => {
            if (isLastRow(index)) return; // 最后一行的开关不可用
            const newParams = [...localParams];
            const actualIndex = index;
            newParams[actualIndex] = { ...newParams[actualIndex], enabled: checked };
            syncToStore(newParams);
          }}
        />
      ),
    },
    {
      title: 'KEY',
      dataIndex: 'key',
      width: '30%',
      render: (text: string, _record: KeyValuePair, index: number) => (
        <Input
          placeholder="Key"
          value={text}
          onChange={(e) => {
            if (isLastRow(index)) {
              // 最后一行的 key 输入：添加到 localParams
              const newParams = [...localParams, { id: generateId(), key: e.target.value, value: '', description: '', enabled: true }];
              setLocalParams(newParams);
            } else {
              // 更新现有行
              const newParams = [...localParams];
              newParams[index] = { ...newParams[index], key: e.target.value };
              setLocalParams(newParams);
            }
          }}
          onBlur={() => {
            syncToStore(localParams);
          }}
          onPressEnter={() => {
            syncToStore(localParams);
          }}
          bordered={false}
          style={{ background: 'transparent', fontSize: 12 }}
        />
      ),
    },
    {
      title: 'VALUE',
      dataIndex: 'value',
      width: '30%',
      render: (text: string, _record: KeyValuePair, index: number) => (
        <Input
          placeholder="Value"
          value={text}
          onChange={(e) => {
            if (isLastRow(index)) return; // 最后一行的 value 输入通过 key 的 onChange 处理
            const newParams = [...localParams];
            newParams[index] = { ...newParams[index], value: e.target.value };
            setLocalParams(newParams);
          }}
          onBlur={() => {
            syncToStore(localParams);
          }}
          onPressEnter={() => {
            syncToStore(localParams);
          }}
          bordered={false}
          style={{ background: 'transparent', fontSize: 12 }}
        />
      ),
    },
    {
      title: 'DESCRIPTION',
      dataIndex: 'description',
      render: (text: string, _record: KeyValuePair, index: number) => (
        <Input
          placeholder="Description"
          value={text || ''}
          onChange={(e) => {
            if (isLastRow(index)) return;
            const newParams = [...localParams];
            newParams[index] = { ...newParams[index], description: e.target.value };
            setLocalParams(newParams);
          }}
          onBlur={() => {
            syncToStore(localParams);
          }}
          onPressEnter={() => {
            syncToStore(localParams);
          }}
          bordered={false}
          style={{ background: 'transparent', color: '#94A3B8', fontSize: 12 }}
        />
      ),
    },
    {
      title: '',
      width: 32,
      render: (_text: string, _record: KeyValuePair, index: number) => (
        <Tooltip title="Delete">
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            style={{ color: '#94A3B8', fontSize: 12 }}
            onClick={() => {
              if (displayParams.length <= 1) return;
              const newParams = displayParams.filter((_, i) => i !== index);
              updateParams(newParams);
            }}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div style={{ padding: '12px' }}>
      <Table
        dataSource={displayParams}
        columns={columns}
        pagination={false}
        size="small"
        bordered
        rowKey="id"
        style={{ 
          border: '1px solid #E2E8F0',
          borderRadius: 6
        }}
      />
    </div>
  );
}

// Headers 标签页 - 绑定到 store
function HeadersTab() {
  const { currentRequest, setCurrentRequest } = useAppStore();
  const headers = currentRequest.headers || [];
  const emptyRowId = useMemo(() => generateId(), []);
  const displayHeaders = headers.length > 0 
    ? [...headers, { id: emptyRowId, key: '', value: '', description: '', enabled: true }]
    : [{ id: emptyRowId, key: '', value: '', description: '', enabled: true }];

  const updateHeaders = (newHeaders: KeyValuePair[]) => {
    const validHeaders = newHeaders.filter(p => p.key !== '' || p.value !== '');
    setCurrentRequest({ headers: validHeaders });
  };

  const columns = [
    {
      title: '',
      width: 32,
      render: (_text: string, record: KeyValuePair, index: number) => (
        <Switch 
          size="small" 
          checked={record.enabled}
          onChange={(checked) => {
            const newHeaders = [...displayHeaders];
            newHeaders[index] = { ...newHeaders[index], enabled: checked };
            updateHeaders(newHeaders);
          }}
        />
      ),
    },
    {
      title: 'KEY',
      dataIndex: 'key',
      width: '35%',
      render: (text: string, record: KeyValuePair, index: number) => (
        <Input
          placeholder="Key"
          value={text}
          onChange={(e) => {
            const newHeaders = [...displayHeaders];
            newHeaders[index] = { ...newHeaders[index], key: e.target.value };
            updateHeaders(newHeaders);
          }}
          bordered={false}
          style={{ 
            background: 'transparent',
            color: record.enabled ? '#10B981' : '#94A3B8',
            fontSize: 12
          }}
        />
      ),
    },
    {
      title: 'VALUE',
      dataIndex: 'value',
      width: '35%',
      render: (text: string, _record: KeyValuePair, index: number) => (
        <Input
          placeholder="Value"
          value={text}
          onChange={(e) => {
            const newHeaders = [...displayHeaders];
            newHeaders[index] = { ...newHeaders[index], value: e.target.value };
            updateHeaders(newHeaders);
          }}
          bordered={false}
          style={{ background: 'transparent', fontSize: 12 }}
        />
      ),
    },
    {
      title: 'DESCRIPTION',
      dataIndex: 'description',
      render: (text: string, _record: KeyValuePair, index: number) => (
        <Input
          placeholder="Description"
          value={text || ''}
          onChange={(e) => {
            const newHeaders = [...displayHeaders];
            newHeaders[index] = { ...newHeaders[index], description: e.target.value };
            updateHeaders(newHeaders);
          }}
          bordered={false}
          style={{ background: 'transparent', color: '#94A3B8', fontSize: 12 }}
        />
      ),
    },
    {
      title: '',
      width: 32,
      render: (_text: string, _record: KeyValuePair, index: number) => (
        <Tooltip title="Delete">
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            style={{ color: '#94A3B8', fontSize: 12 }}
            onClick={() => {
              if (displayHeaders.length <= 1) return;
              const newHeaders = displayHeaders.filter((_, i) => i !== index);
              updateHeaders(newHeaders);
            }}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div style={{ padding: '12px' }}>
      <Table
        dataSource={displayHeaders}
        columns={columns}
        pagination={false}
        size="small"
        bordered
        rowKey="id"
        style={{ 
          border: '1px solid #E2E8F0',
          borderRadius: 6
        }}
      />
    </div>
  );
}

// Body 标签页 - 绑定到 store
function BodyTab() {
  const { currentRequest, setCurrentRequest } = useAppStore();
  const bodyType = currentRequest.bodyType;
  const bodyContent = currentRequest.bodyContent;
  const bodyRawType = currentRequest.bodyRawType;

  const bodyTypes = [
    { label: 'none', value: 'none' },
    { label: 'form-data', value: 'form-data' },
    { label: 'x-www-form-urlencoded', value: 'x-www-form-urlencoded' },
    { label: 'raw', value: 'raw' },
    { label: 'binary', value: 'binary' },
  ];

  return (
    <div style={{ padding: '12px' }}>
      <Radio.Group 
        value={bodyType} 
        onChange={(e) => setCurrentRequest({ bodyType: e.target.value })}
        size="small"
        style={{ marginBottom: 12 }}
      >
        {bodyTypes.map(type => (
          <Radio.Button 
            key={type.value} 
            value={type.value}
            style={{ fontSize: 11 }}
          >
            {type.label}
          </Radio.Button>
        ))}
      </Radio.Group>

      {bodyType === 'raw' && (
        <div>
          <Select 
            value={bodyRawType} 
            size="small"
            style={{ width: 120, marginBottom: 8 }}
            onChange={(value) => setCurrentRequest({ bodyRawType: value })}
          >
            <Select.Option value="json">JSON</Select.Option>
            <Select.Option value="text">Text</Select.Option>
            <Select.Option value="xml">XML</Select.Option>
            <Select.Option value="html">HTML</Select.Option>
          </Select>
          
          <TextArea
            rows={10}
            placeholder="Enter request body"
            value={bodyContent}
            onChange={(e) => setCurrentRequest({ bodyContent: e.target.value })}
            style={{ 
              fontFamily: 'monospace',
              fontSize: 12,
              background: '#F8FAFC',
              borderColor: '#E2E8F0'
            }}
          />
        </div>
      )}

      {bodyType === 'form-data' && (
        <FormDataBody />
      )}

      {bodyType === 'x-www-form-urlencoded' && (
        <UrlEncodedBody />
      )}

      {bodyType === 'none' && (
        <div style={{ 
          padding: '30px', 
          textAlign: 'center',
          color: '#94A3B8',
          fontSize: 12
        }}>
          This request does not have a body
        </div>
      )}

      {bodyType === 'binary' && (
        <div style={{ 
          padding: '30px', 
          textAlign: 'center',
          color: '#94A3B8',
          fontSize: 12
        }}>
          {currentRequest.binaryFile ? (
            <div>
              <div style={{ marginBottom: 8 }}>
                📄 {currentRequest.binaryFile.name}
                <span style={{ marginLeft: 16, color: '#64748B' }}>
                  ({currentRequest.binaryFile.type})
                </span>
              </div>
              <Button 
                size="small" 
                onClick={() => setCurrentRequest({ binaryFile: undefined })}
              >
                移除文件
              </Button>
            </div>
          ) : (
            <label style={{ cursor: 'pointer', display: 'block' }}>
              <div style={{ 
                padding: '20px',
                border: '2px dashed #E2E8F0',
                borderRadius: 8,
                marginBottom: 8
              }}>
                点击选择文件
              </div>
              <input
                type="file"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      setCurrentRequest({ 
                        binaryFile: {
                          name: file.name,
                          type: file.type || 'application/octet-stream',
                          data: reader.result as string
                        }
                      });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

// form-data 编辑器
function FormDataBody() {
  const { currentRequest, setCurrentRequest } = useAppStore();
  const formData = currentRequest.formData || [];
  const emptyRow: KeyValuePair = { id: generateId(), key: '', value: '', description: '', enabled: true, type: 'text' };
  const displayData: KeyValuePair[] = formData.length > 0 
    ? [...formData, emptyRow]
    : [emptyRow];

  const updateFormData = (newData: KeyValuePair[]) => {
    const validData = newData.filter(p => p.key !== '' || p.value !== '' || p.type === 'file');
    setCurrentRequest({ formData: validData });
  };

  const handleFileSelect = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const newData = [...displayData];
      // 存储文件内容的 base64 数据（去掉 data:xxx;base64, 前缀）
      const base64Data = (reader.result as string).split(',')[1];
      newData[index] = { 
        ...newData[index], 
        type: 'file',
        fileName: file.name,
        value: base64Data  // 存储文件内容而不是文件名
      };
      updateFormData(newData);
    };
    reader.readAsDataURL(file);
  };

  const columns = [
    {
      title: '',
      width: 32,
      render: (_text: string, _record: KeyValuePair, index: number) => (
        <Switch 
          size="small" 
          checked={displayData[index].enabled}
          onChange={(checked) => {
            const newData = [...displayData];
            newData[index] = { ...newData[index], enabled: checked };
            updateFormData(newData);
          }}
        />
      ),
    },
    {
      title: 'KEY',
      dataIndex: 'key',
      width: '25%',
      render: (text: string, _record: KeyValuePair, index: number) => (
        <Input
          placeholder="Key"
          value={text}
          onChange={(e) => {
            const newData = [...displayData];
            newData[index] = { ...newData[index], key: e.target.value };
            updateFormData(newData);
          }}
          bordered={false}
          style={{ background: 'transparent', fontSize: 12 }}
        />
      ),
    },
    {
      title: 'VALUE',
      dataIndex: 'value',
      width: '25%',
      render: (text: string, _record: KeyValuePair, index: number) => {
        const item = displayData[index];
        return item.type === 'file' ? (
          <span style={{ fontSize: 12, color: '#3B82F6' }}>
            📄 {item.fileName || text}
          </span>
        ) : (
          <Input
            placeholder="Value"
            value={text}
            onChange={(e) => {
              const newData = [...displayData];
              newData[index] = { ...newData[index], value: e.target.value };
              updateFormData(newData);
            }}
            bordered={false}
            style={{ background: 'transparent', fontSize: 12 }}
          />
        );
      },
    },
    {
      title: 'TYPE',
      width: 80,
      render: (_text: string, _record: KeyValuePair, index: number) => (
        <select
          value={displayData[index].type || 'text'}
          onChange={(e) => {
            const newData = [...displayData];
            newData[index] = { 
              ...newData[index], 
              type: e.target.value as 'text' | 'file',
              value: e.target.value === 'text' ? '' : newData[index].value,
              fileName: e.target.value === 'text' ? undefined : newData[index].fileName
            };
            updateFormData(newData);
          }}
          style={{ 
            fontSize: 11, 
            border: 'none', 
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          <option value="text">Text</option>
          <option value="file">File</option>
        </select>
      ),
    },
    {
      title: '',
      width: 80,
      render: (_text: string, _record: KeyValuePair, index: number) => {
        const item = displayData[index];
        return item.type === 'file' ? (
          <label style={{ fontSize: 11, color: '#3B82F6', cursor: 'pointer' }}>
            选择文件
            <input
              type="file"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(index, file);
              }}
            />
          </label>
        ) : null;
      },
    },
    {
      title: '',
      width: 32,
      render: (_text: string, _record: KeyValuePair, index: number) => (
        <Tooltip title="Delete">
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            style={{ color: '#94A3B8', fontSize: 12 }}
            onClick={() => {
              if (displayData.length <= 1) return;
              const newData = displayData.filter((_, i) => i !== index);
              updateFormData(newData);
            }}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <Table
      dataSource={displayData}
      columns={columns}
      pagination={false}
      size="small"
      bordered
      rowKey="id"
      style={{ 
        border: '1px solid #E2E8F0',
        borderRadius: 6
      }}
    />
  );
}

// x-www-form-urlencoded 编辑器
function UrlEncodedBody() {
  const { currentRequest, setCurrentRequest } = useAppStore();
  const urlEncoded = (currentRequest.urlEncoded && currentRequest.urlEncoded.length > 0)
    ? currentRequest.urlEncoded
    : [{ id: '__empty__', key: '', value: '', description: '', enabled: true }];

  const updateUrlEncoded = (newData: KeyValuePair[]) => {
    const withEmptyRow = ensureEmptyRow(newData);
    setCurrentRequest({ urlEncoded: withEmptyRow });
  };

  const columns = [
    {
      title: '',
      width: 32,
      render: (_text: string, record: KeyValuePair, index: number) => (
        <Switch 
          size="small" 
          checked={record.enabled}
          onChange={(checked) => {
            const newData = [...urlEncoded];
            newData[index] = { ...newData[index], enabled: checked };
            updateUrlEncoded(newData);
          }}
        />
      ),
    },
    {
      title: 'KEY',
      dataIndex: 'key',
      width: '35%',
      render: (text: string, _record: KeyValuePair, index: number) => (
        <Input
          placeholder="Key"
          value={text}
          onChange={(e) => {
            const newData = [...urlEncoded];
            newData[index] = { ...newData[index], key: e.target.value };
            updateUrlEncoded(newData);
          }}
          bordered={false}
          style={{ background: 'transparent', fontSize: 12 }}
        />
      ),
    },
    {
      title: 'VALUE',
      dataIndex: 'value',
      width: '35%',
      render: (text: string, _record: KeyValuePair, index: number) => (
        <Input
          placeholder="Value"
          value={text}
          onChange={(e) => {
            const newData = [...urlEncoded];
            newData[index] = { ...newData[index], value: e.target.value };
            updateUrlEncoded(newData);
          }}
          bordered={false}
          style={{ background: 'transparent', fontSize: 12 }}
        />
      ),
    },
    {
      title: 'DESCRIPTION',
      dataIndex: 'description',
      render: (text: string, _record: KeyValuePair, index: number) => (
        <Input
          placeholder="Description"
          value={text || ''}
          onChange={(e) => {
            const newData = [...urlEncoded];
            newData[index] = { ...newData[index], description: e.target.value };
            updateUrlEncoded(newData);
          }}
          bordered={false}
          style={{ background: 'transparent', color: '#94A3B8', fontSize: 12 }}
        />
      ),
    },
    {
      title: '',
      width: 32,
      render: (_text: string, _record: KeyValuePair, index: number) => (
        <Tooltip title="Delete">
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            style={{ color: '#94A3B8', fontSize: 12 }}
            onClick={() => {
              if (urlEncoded.length <= 1) return;
              const newData = urlEncoded.filter((_, i) => i !== index);
              updateUrlEncoded(newData);
            }}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <Table
      dataSource={urlEncoded}
      columns={columns}
      pagination={false}
      size="small"
      bordered
      rowKey="id"
      style={{ 
        border: '1px solid #E2E8F0',
        borderRadius: 6
      }}
    />
  );
}

// Authorization 标签页
function AuthTab() {
  const { currentRequest, setCurrentRequest, collections, currentCollectionId } = useAppStore();
  
  const auth = currentRequest.auth || { type: 'inherit' };
  const currentCollection = collections.find(c => c.id === currentCollectionId);
  
  const handleAuthTypeChange = (type: string) => {
    setCurrentRequest({ 
      auth: { 
        ...auth, 
        type: type as any 
      } 
    });
  };

  const handleAuthFieldChange = (field: string, value: string) => {
    setCurrentRequest({
      auth: {
        ...auth,
        [field]: value
      }
    });
  };

  // 获取实际使用的auth配置（处理inherit）
  const effectiveAuth = auth.type === 'inherit' 
    ? currentCollection?.auth 
    : auth;

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#1E293B', marginRight: 12 }}>Type:</span>
        <Select 
          value={auth.type} 
          onChange={handleAuthTypeChange}
          style={{ width: 200 }} 
          size="small"
        >
          <Select.Option value="inherit">Inherit auth from parent</Select.Option>
          <Select.Option value="none">No Auth</Select.Option>
          <Select.Option value="basic">Basic Auth</Select.Option>
          <Select.Option value="bearer">Bearer Token</Select.Option>
          <Select.Option value="apikey">API Key</Select.Option>
          <Select.Option value="oauth2">OAuth 2.0</Select.Option>
        </Select>
      </div>
      
      {/* 根据选择的类型显示不同的配置表单 */}
      {auth.type === 'inherit' && (
        <div style={{ 
          padding: '24px',
          background: '#F8FAFC',
          borderRadius: 8,
          textAlign: 'center',
          color: '#64748B'
        }}>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            {effectiveAuth?.type && effectiveAuth.type !== 'none' 
              ? `This request is using ${effectiveAuth.type} auth from collection "${currentCollection?.name}"`
              : 'This request is using no auth from collection'
            }
          </p>
          <p style={{ fontSize: 12, color: '#94A3B8' }}>
            The authorization header will be automatically generated when sending the request
          </p>
        </div>
      )}

      {auth.type === 'none' && (
        <div style={{ 
          padding: '24px',
          background: '#F8FAFC',
          borderRadius: 8,
          textAlign: 'center',
          color: '#64748B'
        }}>
          <p style={{ fontSize: 13 }}>This request does not use any authorization</p>
        </div>
      )}

      {auth.type === 'basic' && (
        <div style={{ 
          padding: '16px',
          background: '#F8FAFC',
          borderRadius: 8,
        }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Username</div>
            <Input 
              value={auth.username || ''} 
              onChange={e => handleAuthFieldChange('username', e.target.value)}
              placeholder="Username"
              size="small"
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Password</div>
            <Input.Password 
              value={auth.password || ''} 
              onChange={e => handleAuthFieldChange('password', e.target.value)}
              placeholder="Password"
              size="small"
            />
          </div>
        </div>
      )}

      {auth.type === 'bearer' && (
        <div style={{ 
          padding: '16px',
          background: '#F8FAFC',
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Token</div>
          <TextArea 
            value={auth.token || ''} 
            onChange={e => handleAuthFieldChange('token', e.target.value)}
            placeholder="Enter your Bearer token"
            rows={3}
            style={{ fontSize: 12, fontFamily: 'monospace' }}
          />
        </div>
      )}

      {auth.type === 'apikey' && (
        <div style={{ 
          padding: '16px',
          background: '#F8FAFC',
          borderRadius: 8,
        }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Key</div>
            <Input 
              value={auth.apiKeyName || ''} 
              onChange={e => handleAuthFieldChange('apiKeyName', e.target.value)}
              placeholder="Key name (e.g., X-API-Key)"
              size="small"
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Value</div>
            <Input 
              value={auth.apiKey || ''} 
              onChange={e => handleAuthFieldChange('apiKey', e.target.value)}
              placeholder="API Key value"
              size="small"
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Add to</div>
            <Radio.Group 
              value={auth.apiKeyLocation || 'header'} 
              onChange={e => handleAuthFieldChange('apiKeyLocation', e.target.value)}
              size="small"
            >
              <Radio.Button value="header">Header</Radio.Button>
              <Radio.Button value="query">Query Params</Radio.Button>
            </Radio.Group>
          </div>
        </div>
      )}

      {auth.type === 'oauth2' && (
        <div style={{ 
          padding: '24px',
          background: '#F8FAFC',
          borderRadius: 8,
          textAlign: 'center',
          color: '#64748B'
        }}>
          <p style={{ fontSize: 13 }}>OAuth 2.0 configuration coming soon</p>
          <p style={{ fontSize: 12, color: '#94A3B8' }}>Please use Bearer Token as a workaround</p>
        </div>
      )}
    </div>
  );
}

// Pre-request Script 标签页
function PreRequestScriptTab() {
  const { currentRequest, setCurrentRequest } = useAppStore();

  return (
    <div style={{ padding: '16px' }}>
      <TextArea
        rows={12}
        value={currentRequest.preRequestScript}
        onChange={(e) => setCurrentRequest({ preRequestScript: e.target.value })}
        placeholder={`// Pre-request Script
// Use JavaScript to modify the request before it is sent

// Example:
// dog.environment.set("timestamp", new Date().toISOString());`}
        style={{ 
          fontFamily: 'monospace',
          fontSize: 12,
          background: '#F8FAFC',
          borderColor: '#E2E8F0'
        }}
      />
    </div>
  );
}

// Tests 标签页
function TestsTab() {
  const { currentRequest, setCurrentRequest } = useAppStore();

  return (
    <div style={{ padding: '16px' }}>
      <TextArea
        rows={12}
        value={currentRequest.testsScript}
        onChange={(e) => setCurrentRequest({ testsScript: e.target.value })}
        placeholder={`// Tests
// Write tests to validate response data

// Example:
// dog.test("Status code is 200", function () {
//     dog.response.to.have.status(200);
// });`}
        style={{ 
          fontFamily: 'monospace',
          fontSize: 12,
          background: '#F8FAFC',
          borderColor: '#E2E8F0'
        }}
      />
    </div>
  );
}

// Settings 标签页
function SettingsTab() {
  return (
    <div style={{ padding: '16px' }}>
      <div style={{ maxWidth: 400 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#1E293B' }}>
            Request Timeout
          </div>
          <Input defaultValue="0" suffix="ms" size="small" style={{ width: 150 }} />
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
            0 means no timeout
          </div>
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#1E293B' }}>
            Follow redirects
          </div>
          <Switch defaultChecked size="small" />
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#1E293B' }}>
            SSL certificate verification
          </div>
          <Switch defaultChecked size="small" />
        </div>
      </div>
    </div>
  );
}

// Code 标签页 - 生成 curl 命令
function CodeTab() {
  const { currentRequest } = useAppStore();
  const [copied, setCopied] = useState(false);

  // 生成 curl 命令
  const generateCurl = () => {
    const { method, url, headers, bodyContent, bodyType, bodyRawType, params, formData, urlEncoded, binaryFile } = currentRequest;
    if (!url) return 'curl';

    // 构建带 params 的 URL
    let finalUrl = url;
    const enabledParams = params.filter(p => p.enabled && p.key);
    if (enabledParams.length > 0) {
      const separator = url.includes('?') ? '&' : '?';
      const queryString = enabledParams
        .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
        .join('&');
      finalUrl = url + separator + queryString;
    }

    let parts = [`curl -X ${method}`];

    // 检查用户是否已设置 Content-Type header
    const hasContentTypeHeader = headers.some(h => h.enabled && h.key.toLowerCase() === 'content-type');

    // 添加 headers
    const enabledHeaders = headers.filter(h => h.enabled && h.key);
    for (const h of enabledHeaders) {
      parts.push(`  -H '${h.key}: ${h.value}'`);
    }

    // 添加 body
    if (['POST', 'PUT', 'PATCH'].includes(method) && bodyType !== 'none') {
      if (bodyType === 'raw' && bodyContent) {
        // 根据 bodyRawType 设置 Content-Type
        const contentTypeMap: Record<string, string> = {
          'json': 'application/json',
          'xml': 'application/xml',
          'text': 'text/plain',
          'html': 'text/html'
        };
        const contentType = contentTypeMap[bodyRawType] || 'text/plain';
        if (!hasContentTypeHeader) {
          parts.push(`  -H 'Content-Type: ${contentType}'`);
        }
        // 转义单引号
        const escapedBody = bodyContent.replace(/'/g, "'\\''").replace(/\n/g, '\\n');
        parts.push(`  -d '${escapedBody}'`);
      } else if (bodyType === 'x-www-form-urlencoded' && urlEncoded) {
        const enabledData = urlEncoded.filter(p => p.enabled && p.key);
        if (enabledData.length > 0) {
          const dataStr = enabledData.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
          if (!hasContentTypeHeader) {
            parts.push(`  -H 'Content-Type: application/x-www-form-urlencoded'`);
          }
          parts.push(`  -d '${dataStr}'`);
        }
      } else if (bodyType === 'form-data' && formData) {
        const enabledData = formData.filter(p => p.enabled && p.key);
        if (enabledData.length > 0) {
          for (const item of enabledData) {
            if (item.type === 'file' && item.fileName) {
              // 文件名包含特殊字符时用引号包裹
              const needsQuotes = /[\s'"$&|;<>]/.test(item.fileName);
              const fileName = needsQuotes ? `"${item.fileName.replace(/"/g, '\\"')}"` : item.fileName;
              parts.push(`  -F '${item.key}=@${fileName}'`);
            } else {
              parts.push(`  -F '${item.key}="${item.value.replace(/"/g, '\\"')}"'`);
            }
          }
        }
      } else if (bodyType === 'binary' && binaryFile) {
        if (!hasContentTypeHeader && binaryFile.type) {
          parts.push(`  -H 'Content-Type: ${binaryFile.type}'`);
        }
        parts.push(`  --data-binary '@${binaryFile.name}'`);
      }
    }

    parts.push(`  '${finalUrl}'`);
    return parts.join(' \\\n');
  };

  const curlCommand = generateCurl();

  const handleCopy = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: '16px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
      }}>
        <span style={{ fontSize: 13, color: '#64748B' }}>cURL</span>
        <Button
          size="small"
          icon={<CopyOutlined />}
          onClick={handleCopy}
          style={{ fontSize: 12 }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <pre style={{
        background: '#1E293B',
        color: '#E2E8F0',
        padding: 16,
        borderRadius: 8,
        fontSize: 13,
        fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
        lineHeight: 1.6,
        margin: 0,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all'
      }}>
        {curlCommand}
      </pre>
    </div>
  );
}

export default RequestPanel;
