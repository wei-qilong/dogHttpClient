import { useState } from 'react';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import {
  Button,
  Input,
  Table,
  Space,
  Tag,
  message,
  Card,
  Row,
  Col,
  Switch,
  Select,
  Radio,
  Tabs,
} from 'antd';
import { useAppStore } from '../store';
import type { KeyValuePair, AuthConfig } from '../types';
import { logToFile } from '../services/storage';

const { TextArea } = Input;

const genId = () => Math.random().toString(36).substring(2, 10);

// Collection 设置编辑器 - 全屏展示
export function CollectionSettings() {
  const {
    collections,
    currentEditingCollectionId,
    setCurrentEditingCollectionId,
  } = useAppStore();

  const collection = collections.find(
    (c) => c.id === currentEditingCollectionId
  );

  // Variables 状态
  const [newVar, setNewVar] = useState<{ key: string; value: string }>({
    key: '',
    value: '',
  });
  const [editingVar, setEditingVar] = useState<KeyValuePair | null>(null);

  // Auth 状态
  const [auth, setAuth] = useState<AuthConfig>(
    collection?.auth || { type: 'none' }
  );

  if (!collection) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94A3B8',
          fontSize: 14,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p>No collection selected</p>
        </div>
      </div>
    );
  }

  // ========== Variables 操作 ==========

  const isKeyExists = (key: string, excludeId?: string) => {
    return (collection.variables || []).some(
      (v) => v.key.toLowerCase() === key.toLowerCase() && v.id !== excludeId
    );
  };

  const handleAddVar = () => {
    if (!newVar.key.trim()) {
      message.error('Variable key is required');
      return;
    }
    if (isKeyExists(newVar.key)) {
      message.error('Variable key already exists in this collection');
      return;
    }

    const newVariable: KeyValuePair = {
      id: genId(),
      key: newVar.key.trim(),
      value: newVar.value,
      enabled: true,
    };

    logToFile(`[CollectionSettings] Adding variable: ${newVariable.key}`);
    useAppStore.setState((state) => ({
      collections: state.collections.map((c) =>
        c.id === collection.id
          ? { ...c, variables: [...(c.variables || []), newVariable] }
          : c
      ),
    }));
    logToFile('[CollectionSettings] Variable added, auto-save should trigger in 1s');

    setNewVar({ key: '', value: '' });
    message.success('Variable added');
  };

  const handleUpdateVar = () => {
    if (!editingVar) return;
    if (!editingVar.key.trim()) {
      message.error('Variable key is required');
      return;
    }
    if (isKeyExists(editingVar.key, editingVar.id)) {
      message.error('Variable key already exists in this collection');
      return;
    }

    useAppStore.setState((state) => ({
      collections: state.collections.map((c) =>
        c.id === collection.id
          ? {
              ...c,
              variables: (c.variables || []).map((v) =>
                v.id === editingVar.id
                  ? { ...editingVar, key: editingVar.key.trim() }
                  : v
              ),
            }
          : c
      ),
    }));

    setEditingVar(null);
    message.success('Variable updated');
  };

  const handleDeleteVar = (varId: string) => {
    useAppStore.setState((state) => ({
      collections: state.collections.map((c) =>
        c.id === collection.id
          ? { ...c, variables: (c.variables || []).filter((v) => v.id !== varId) }
          : c
      ),
    }));
    message.success('Variable deleted');
  };

  const handleToggleVar = (varId: string, enabled: boolean) => {
    useAppStore.setState((state) => ({
      collections: state.collections.map((c) =>
        c.id === collection.id
          ? {
              ...c,
              variables: (c.variables || []).map((v) =>
                v.id === varId ? { ...v, enabled } : v
              ),
            }
          : c
      ),
    }));
  };

  // ========== Auth 操作 ==========

  const handleAuthTypeChange = (type: string) => {
    const newAuth: AuthConfig = { ...auth, type: type as any };
    setAuth(newAuth);
    useAppStore.setState((state) => ({
      collections: state.collections.map((c) =>
        c.id === collection.id ? { ...c, auth: newAuth } : c
      ),
    }));
  };

  const handleAuthFieldChange = (field: string, value: string) => {
    const newAuth = { ...auth, [field]: value };
    setAuth(newAuth);
    useAppStore.setState((state) => ({
      collections: state.collections.map((c) =>
        c.id === collection.id ? { ...c, auth: newAuth } : c
      ),
    }));
  };

  // ========== Variables 表格列 ==========

  const varColumns = [
    {
      title: 'Variable',
      dataIndex: 'key',
      key: 'key',
      width: '35%',
      render: (text: string, record: KeyValuePair) =>
        editingVar?.id === record.id ? (
          <Input
            size="small"
            value={editingVar.key}
            onChange={(e) =>
              setEditingVar({ ...editingVar, key: e.target.value })
            }
            onPressEnter={handleUpdateVar}
            autoFocus
            placeholder="Variable name"
          />
        ) : (
          <code
            style={{
              background: '#F1F5F9',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 13,
              color: '#6366F1',
            }}
          >
            {text}
          </code>
        ),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (text: string, record: KeyValuePair) =>
        editingVar?.id === record.id ? (
          <Input
            size="small"
            value={editingVar.value}
            onChange={(e) =>
              setEditingVar({ ...editingVar, value: e.target.value })
            }
            onPressEnter={handleUpdateVar}
            placeholder="Variable value"
          />
        ) : (
          <span style={{ fontSize: 13, color: '#475569' }}>{text}</span>
        ),
    },
    {
      title: 'Enabled',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean, record: KeyValuePair) => (
        <Switch
          size="small"
          checked={enabled}
          onChange={(checked) => handleToggleVar(record.id, checked)}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: KeyValuePair) =>
        editingVar?.id === record.id ? (
          <Space size={4}>
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              style={{ color: '#10B981' }}
              onClick={handleUpdateVar}
            />
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              style={{ color: '#94A3B8' }}
              onClick={() => setEditingVar(null)}
            />
          </Space>
        ) : (
          <Space size={4}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              style={{ color: '#64748B' }}
              onClick={() => setEditingVar(record)}
            />
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              style={{ color: '#EF4444' }}
              onClick={() => handleDeleteVar(record.id)}
            />
          </Space>
        ),
    },
  ];

  // ========== Auth 配置表单 ==========

  const renderAuthForm = () => {
    switch (auth.type) {
      case 'none':
        return (
          <div
            style={{
              padding: '24px',
              background: '#F8FAFC',
              borderRadius: 8,
              textAlign: 'center',
              color: '#64748B',
            }}
          >
            <p style={{ fontSize: 13 }}>This collection does not use any authorization</p>
          </div>
        );

      case 'basic':
        return (
          <div
            style={{
              padding: '16px',
              background: '#F8FAFC',
              borderRadius: 8,
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
                Username
              </div>
              <Input
                value={auth.username || ''}
                onChange={(e) => handleAuthFieldChange('username', e.target.value)}
                placeholder="Username"
                size="small"
              />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
                Password
              </div>
              <Input.Password
                value={auth.password || ''}
                onChange={(e) => handleAuthFieldChange('password', e.target.value)}
                placeholder="Password"
                size="small"
              />
            </div>
          </div>
        );

      case 'bearer':
        return (
          <div
            style={{
              padding: '16px',
              background: '#F8FAFC',
              borderRadius: 8,
            }}
          >
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
              Token
            </div>
            <TextArea
              value={auth.token || ''}
              onChange={(e) => handleAuthFieldChange('token', e.target.value)}
              placeholder="Enter your Bearer token"
              rows={3}
              style={{ fontSize: 12, fontFamily: 'monospace' }}
            />
          </div>
        );

      case 'apikey':
        return (
          <div
            style={{
              padding: '16px',
              background: '#F8FAFC',
              borderRadius: 8,
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
                Key
              </div>
              <Input
                value={auth.apiKeyName || ''}
                onChange={(e) => handleAuthFieldChange('apiKeyName', e.target.value)}
                placeholder="Key name (e.g., X-API-Key)"
                size="small"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
                Value
              </div>
              <Input
                value={auth.apiKey || ''}
                onChange={(e) => handleAuthFieldChange('apiKey', e.target.value)}
                placeholder="API Key value"
                size="small"
              />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
                Add to
              </div>
              <Radio.Group
                value={auth.apiKeyLocation || 'header'}
                onChange={(e) =>
                  handleAuthFieldChange('apiKeyLocation', e.target.value)
                }
                size="small"
              >
                <Radio.Button value="header">Header</Radio.Button>
                <Radio.Button value="query">Query Params</Radio.Button>
              </Radio.Group>
            </div>
          </div>
        );

      case 'oauth2':
        return (
          <div
            style={{
              padding: '24px',
              background: '#F8FAFC',
              borderRadius: 8,
              textAlign: 'center',
              color: '#64748B',
            }}
          >
            <p style={{ fontSize: 13 }}>OAuth 2.0 configuration coming soon</p>
            <p style={{ fontSize: 12, color: '#94A3B8' }}>
              Please use Bearer Token as a workaround
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        padding: '16px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#FFFFFF',
      }}
    >
      {/* 头部：返回按钮 + Collection 名称 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 16,
          paddingBottom: 16,
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => setCurrentEditingCollectionId(null)}
          style={{ marginRight: 12 }}
        >
          Back
        </Button>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: '#1E293B' }}>
            {collection.name}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748B' }}>
            Collection Settings
          </p>
        </div>
      </div>

      {/* Tabs：Variables + Auth */}
      <Tabs
        defaultActiveKey="variables"
        style={{ flex: 1 }}
        items={[
          {
            key: 'variables',
            label: (
              <span>
                Variables
                {(collection.variables || []).length > 0 && (
                  <Tag
                    style={{
                      marginLeft: 8,
                      fontSize: 10,
                      background: '#EEF2FF',
                      color: '#6366F1',
                      border: 'none',
                    }}
                  >
                    {(collection.variables || []).length}
                  </Tag>
                )}
              </span>
            ),
            children: (
              <div style={{ height: '100%' }}>
                {/* 添加新变量 */}
                <Card size="small" style={{ marginBottom: 16 }}>
                  <Row gutter={12} align="middle">
                    <Col span={8}>
                      <Input
                        placeholder="Variable name (e.g., baseUrl)"
                        value={newVar.key}
                        onChange={(e) =>
                          setNewVar({ ...newVar, key: e.target.value })
                        }
                        onPressEnter={handleAddVar}
                        prefix={
                          <code style={{ color: '#6366F1' }}>{'{{'}</code>
                        }
                        suffix={
                          <code style={{ color: '#6366F1' }}>{'}}'}</code>
                        }
                      />
                    </Col>
                    <Col span={12}>
                      <Input
                        placeholder="Variable value"
                        value={newVar.value}
                        onChange={(e) =>
                          setNewVar({ ...newVar, value: e.target.value })
                        }
                        onPressEnter={handleAddVar}
                      />
                    </Col>
                    <Col span={4}>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAddVar}
                        block
                        style={{ background: '#6366F1' }}
                      >
                        Add
                      </Button>
                    </Col>
                  </Row>
                </Card>

                {/* 变量列表 */}
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <Table
                    size="small"
                    columns={varColumns}
                    dataSource={collection.variables || []}
                    rowKey="id"
                    pagination={false}
                    locale={{ emptyText: 'No variables yet. Add one above.' }}
                  />
                </div>

                {/* 使用说明 */}
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    background: '#F8FAFC',
                    borderRadius: 6,
                    fontSize: 12,
                    color: '#64748B',
                  }}
                >
                  <strong>Usage:</strong> Reference variables using{' '}
                  {'{{variableName}}'} in URLs, headers, or body. Collection
                  variables have lower priority than request variables but
                  higher than environment variables.
                </div>
              </div>
            ),
          },
          {
            key: 'auth',
            label: 'Authorization',
            children: (
              <div style={{ maxWidth: 600 }}>
                <div style={{ marginBottom: 16 }}>
                  <span
                    style={{
                      fontSize: 13,
                      color: '#1E293B',
                      marginRight: 12,
                    }}
                  >
                    Type:
                  </span>
                  <Select
                    value={auth.type || 'none'}
                    onChange={handleAuthTypeChange}
                    style={{ width: 200 }}
                    size="small"
                  >
                    <Select.Option value="none">No Auth</Select.Option>
                    <Select.Option value="basic">Basic Auth</Select.Option>
                    <Select.Option value="bearer">Bearer Token</Select.Option>
                    <Select.Option value="apikey">API Key</Select.Option>
                    <Select.Option value="oauth2">OAuth 2.0</Select.Option>
                  </Select>
                </div>

                {renderAuthForm()}

                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    background: '#F8FAFC',
                    borderRadius: 6,
                    fontSize: 12,
                    color: '#64748B',
                  }}
                >
                  <strong>Note:</strong> Requests in this collection can inherit
                  this auth configuration by setting their Authorization type to
                  &quot;Inherit auth from parent&quot;.
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
