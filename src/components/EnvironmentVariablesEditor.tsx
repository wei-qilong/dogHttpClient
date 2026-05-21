import { useState } from 'react';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  CheckCircleFilled
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
  Switch
} from 'antd';
import { useAppStore } from '../store';
import type { KeyValuePair } from '../types';

const genId = () => Math.random().toString(36).substring(2, 10);

// 主内容区域的环境变量编辑器
export function EnvironmentVariablesEditor() {
  const { environments, currentEnvironmentId } = useAppStore();
  const [newVar, setNewVar] = useState<{ key: string; value: string }>({ key: '', value: '' });
  const [editingVar, setEditingVar] = useState<KeyValuePair | null>(null);

  // 直接使用当前激活的环境
  const selectedEnv = currentEnvironmentId ? environments.find(e => e.id === currentEnvironmentId) : null;

  // 检查 key 是否已存在
  const isKeyExists = (key: string, excludeId?: string) => {
    if (!selectedEnv) return false;
    return selectedEnv.variables.some(v =>
      v.key.toLowerCase() === key.toLowerCase() && v.id !== excludeId
    );
  };

  // 添加变量
  const handleAddVar = () => {
    if (!selectedEnv) return;
    if (!newVar.key.trim()) {
      message.error('Variable key is required');
      return;
    }
    if (isKeyExists(newVar.key)) {
      message.error('Variable key already exists in this environment');
      return;
    }

    const newVariable: KeyValuePair = {
      id: genId(),
      key: newVar.key.trim(),
      value: newVar.value,
      enabled: true,
    };

    useAppStore.setState(state => ({
      environments: state.environments.map(e =>
        e.id === selectedEnv.id
          ? { ...e, variables: [...e.variables, newVariable] }
          : e
      )
    }));

    setNewVar({ key: '', value: '' });
    message.success('Variable added');
  };

  // 更新变量
  const handleUpdateVar = () => {
    if (!editingVar || !selectedEnv) return;
    if (!editingVar.key.trim()) {
      message.error('Variable key is required');
      return;
    }
    if (isKeyExists(editingVar.key, editingVar.id)) {
      message.error('Variable key already exists in this environment');
      return;
    }

    useAppStore.setState(state => ({
      environments: state.environments.map(e =>
        e.id === selectedEnv.id
          ? {
              ...e,
              variables: e.variables.map(v =>
                v.id === editingVar.id ? { ...editingVar, key: editingVar.key.trim() } : v
              )
            }
          : e
      )
    }));

    setEditingVar(null);
    message.success('Variable updated');
  };

  // 删除变量
  const handleDeleteVar = (varId: string) => {
    if (!selectedEnv) return;
    useAppStore.setState(state => ({
      environments: state.environments.map(e =>
        e.id === selectedEnv.id
          ? { ...e, variables: e.variables.filter(v => v.id !== varId) }
          : e
      )
    }));
    message.success('Variable deleted');
  };

  // 切换变量启用状态
  const handleToggleVar = (varId: string, enabled: boolean) => {
    if (!selectedEnv) return;
    useAppStore.setState(state => ({
      environments: state.environments.map(e =>
        e.id === selectedEnv.id
          ? {
              ...e,
              variables: e.variables.map(v =>
                v.id === varId ? { ...v, enabled } : v
              )
            }
          : e
      )
    }));
  };

  const columns = [
    {
      title: 'Variable',
      dataIndex: 'key',
      key: 'key',
      width: '35%',
      render: (text: string, record: KeyValuePair) => (
        editingVar?.id === record.id ? (
          <Input
            size="small"
            value={editingVar.key}
            onChange={e => setEditingVar({ ...editingVar, key: e.target.value })}
            onPressEnter={handleUpdateVar}
            autoFocus
            placeholder="Variable name"
          />
        ) : (
          <code style={{
            background: '#F1F5F9',
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 13,
            color: '#6366F1'
          }}>
            {text}
          </code>
        )
      ),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (text: string, record: KeyValuePair) => (
        editingVar?.id === record.id ? (
          <Input
            size="small"
            value={editingVar.value}
            onChange={e => setEditingVar({ ...editingVar, value: e.target.value })}
            onPressEnter={handleUpdateVar}
            placeholder="Variable value"
          />
        ) : (
          <span style={{ fontSize: 13, color: '#475569' }}>{text}</span>
        )
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
          onChange={checked => handleToggleVar(record.id, checked)}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: KeyValuePair) => (
        editingVar?.id === record.id ? (
          <Space size={4}>
            <Button type="text" size="small" icon={<CheckOutlined />} style={{ color: '#10B981' }} onClick={handleUpdateVar} />
            <Button type="text" size="small" icon={<CloseOutlined />} style={{ color: '#94A3B8' }} onClick={() => setEditingVar(null)} />
          </Space>
        ) : (
          <Space size={4}>
            <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#64748B' }} onClick={() => setEditingVar(record)} />
            <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#EF4444' }} onClick={() => handleDeleteVar(record.id)} />
          </Space>
        )
      ),
    },
  ];

  if (!selectedEnv) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94A3B8',
        fontSize: 14
      }}>
        <div style={{ textAlign: 'center' }}>
          <p>No environment selected</p>
          <p style={{ fontSize: 12 }}>Click an environment in the sidebar to view and edit variables</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 环境标题 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, color: '#1E293B' }}>
            {selectedEnv.name}
            <Tag color="success" icon={<CheckCircleFilled />} style={{ marginLeft: 8 }}>Active</Tag>
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748B' }}>
            {selectedEnv.variables.length} variables
          </p>
        </div>
      </div>

      {/* 添加新变量 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={12} align="middle">
          <Col span={8}>
            <Input
              placeholder="Variable name (e.g., baseUrl)"
              value={newVar.key}
              onChange={e => setNewVar({ ...newVar, key: e.target.value })}
              onPressEnter={handleAddVar}
              prefix={<code style={{ color: '#6366F1' }}>{'{{'}</code>}
              suffix={<code style={{ color: '#6366F1' }}>{'}}'}</code>}
            />
          </Col>
          <Col span={12}>
            <Input
              placeholder="Variable value"
              value={newVar.value}
              onChange={e => setNewVar({ ...newVar, value: e.target.value })}
              onPressEnter={handleAddVar}
            />
          </Col>
          <Col span={4}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddVar} block style={{ background: '#6366F1' }}>
              Add
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 变量列表 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Table
          size="small"
          columns={columns}
          dataSource={selectedEnv.variables}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: 'No variables yet. Add one above.' }}
        />
      </div>

      {/* 使用说明 */}
      <div style={{
        marginTop: 16,
        padding: 12,
        background: '#F8FAFC',
        borderRadius: 6,
        fontSize: 12,
        color: '#64748B'
      }}>
        <strong>Usage:</strong> Reference variables using {'{{variableName}}'} in URLs, headers, or body.
      </div>
    </div>
  );
}
