import { useState } from 'react';
import { 
  EyeInvisibleOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { 
  Button, 
  Input, 
  Select,
  Tabs, 
  Table, 
  Switch, 
  Space, 
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

export function RequestPanel() {
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
            children: <ParamsTab />,
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
        ] as TabsProps['items']}
      />
    </div>
  );
}

// Params 标签页 - 绑定到 store
function ParamsTab() {
  const { currentRequest, setCurrentRequest } = useAppStore();
  const params = currentRequest.params.length > 0 
    ? currentRequest.params 
    : [{ id: '__empty__', key: '', value: '', description: '', enabled: true }];

  const updateParams = (newParams: KeyValuePair[]) => {
    const withEmptyRow = ensureEmptyRow(newParams);
    setCurrentRequest({ params: withEmptyRow });
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
            const newParams = [...params];
            newParams[index] = { ...newParams[index], enabled: checked };
            updateParams(newParams);
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
            const newParams = [...params];
            newParams[index] = { ...newParams[index], key: e.target.value };
            updateParams(newParams);
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
            const newParams = [...params];
            newParams[index] = { ...newParams[index], value: e.target.value };
            updateParams(newParams);
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
            const newParams = [...params];
            newParams[index] = { ...newParams[index], description: e.target.value };
            updateParams(newParams);
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
              if (params.length <= 1) return;
              const newParams = params.filter((_, i) => i !== index);
              updateParams(newParams);
            }}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: 8,
        padding: '6px 10px',
        background: '#F8FAFC',
        borderRadius: 6
      }}>
        <span style={{ fontSize: 11, color: '#64748B', marginRight: 8 }}>Query Params</span>
        <Tooltip title="Bulk Edit">
          <EyeInvisibleOutlined style={{ color: '#94A3B8', fontSize: 11, cursor: 'pointer' }} />
        </Tooltip>
      </div>
      
      <Table
        dataSource={params}
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
  const headers = currentRequest.headers;

  const updateHeaders = (newHeaders: KeyValuePair[]) => {
    const withEmptyRow = ensureEmptyRow(newHeaders);
    setCurrentRequest({ headers: withEmptyRow });
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
            const newHeaders = [...headers];
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
            const newHeaders = [...headers];
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
            const newHeaders = [...headers];
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
            const newHeaders = [...headers];
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
              if (headers.length <= 1) return;
              const newHeaders = headers.filter((_, i) => i !== index);
              updateHeaders(newHeaders);
            }}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: 8,
        padding: '6px 10px',
        background: '#F8FAFC',
        borderRadius: 6
      }}>
        <span style={{ fontSize: 11, color: '#64748B', marginRight: 8 }}>Headers</span>
        <Tooltip title="Bulk Edit">
          <EyeInvisibleOutlined style={{ color: '#94A3B8', fontSize: 11, cursor: 'pointer' }} />
        </Tooltip>
        
        <Space style={{ marginLeft: 'auto' }}>
          <Button type="link" size="small" style={{ fontSize: 11, padding: 0 }}>
            Bulk Edit
          </Button>
          <Button type="link" size="small" style={{ fontSize: 11, padding: 0 }}>
            Presets
          </Button>
        </Space>
      </div>
      
      <Table
        dataSource={headers}
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
          Select a file to send as binary data
        </div>
      )}
    </div>
  );
}

// form-data 编辑器
function FormDataBody() {
  const { currentRequest, setCurrentRequest } = useAppStore();
  const formData = (currentRequest.formData && currentRequest.formData.length > 0)
    ? currentRequest.formData
    : [{ id: '__empty__', key: '', value: '', description: '', enabled: true }];

  const updateFormData = (newData: KeyValuePair[]) => {
    const withEmptyRow = ensureEmptyRow(newData);
    setCurrentRequest({ formData: withEmptyRow });
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
            const newData = [...formData];
            newData[index] = { ...newData[index], enabled: checked };
            updateFormData(newData);
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
            const newData = [...formData];
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
      width: '30%',
      render: (text: string, _record: KeyValuePair, index: number) => (
        <Input
          placeholder="Value"
          value={text}
          onChange={(e) => {
            const newData = [...formData];
            newData[index] = { ...newData[index], value: e.target.value };
            updateFormData(newData);
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
            const newData = [...formData];
            newData[index] = { ...newData[index], description: e.target.value };
            updateFormData(newData);
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
              if (formData.length <= 1) return;
              const newData = formData.filter((_, i) => i !== index);
              updateFormData(newData);
            }}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <Table
      dataSource={formData}
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
  return (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#1E293B', marginRight: 12 }}>Type:</span>
        <Select defaultValue="inherit" style={{ width: 200 }} size="small">
          <Select.Option value="inherit">Inherit auth from parent</Select.Option>
          <Select.Option value="none">No Auth</Select.Option>
          <Select.Option value="basic">Basic Auth</Select.Option>
          <Select.Option value="bearer">Bearer Token</Select.Option>
          <Select.Option value="oauth2">OAuth 2.0</Select.Option>
        </Select>
      </div>
      
      <div style={{ 
        padding: '24px',
        background: '#F8FAFC',
        borderRadius: 8,
        textAlign: 'center',
        color: '#64748B'
      }}>
        <p style={{ fontSize: 13, marginBottom: 8 }}>This request is using Basic Auth from collection</p>
        <p style={{ fontSize: 12, color: '#94A3B8' }}>The authorization header will be automatically generated</p>
      </div>
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

export default RequestPanel;
