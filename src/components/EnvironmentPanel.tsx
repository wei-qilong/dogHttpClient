import { useState } from 'react';
import {
  GlobalOutlined,
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
import type { Environment, KeyValuePair } from '../types';

const genId = () => Math.random().toString(36).substring(2, 10);

export function EnvironmentPanel() {
  const { environments, currentEnvironmentId, setCurrentEnvironmentId } = useAppStore();
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(currentEnvironmentId);
  const [showNewEnv, setShowNewEnv] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');
  const [editingEnvId, setEditingEnvId] = useState<string | null>(null);
  const [editEnvName, setEditEnvName] = useState('');

  const selectedEnv = environments.find(e => e.id === selectedEnvId);

  // 新增环境
  const handleAddEnv = () => {
    if (!newEnvName.trim()) {
      message.error('Environment name is required');
      return;
    }
    // 检查名称是否已存在
    if (environments.some(e => e.name.toLowerCase() === newEnvName.trim().toLowerCase())) {
      message.error('Environment name already exists');
      return;
    }
    const newEnv: Environment = {
      id: genId(),
      name: newEnvName.trim(),
      variables: [],
    };
    useAppStore.setState(state => ({
      environments: [...state.environments, newEnv]
    }));
    setNewEnvName('');
    setShowNewEnv(false);
    setSelectedEnvId(newEnv.id);
    message.success('Environment created');
  };

  // 删除环境
  const handleDeleteEnv = (id: string) => {
    useAppStore.setState(state => ({
      environments: state.environments.filter(e => e.id !== id),
      currentEnvironmentId: state.currentEnvironmentId === id ? null : state.currentEnvironmentId
    }));
    if (selectedEnvId === id) {
      setSelectedEnvId(null);
    }
    message.success('Environment deleted');
  };

  // 重命名环境
  const handleRenameEnv = (id: string) => {
    if (!editEnvName.trim()) {
      setEditingEnvId(null);
      return;
    }
    // 检查名称是否已存在
    if (environments.some(e => e.id !== id && e.name.toLowerCase() === editEnvName.trim().toLowerCase())) {
      message.error('Environment name already exists');
      return;
    }
    useAppStore.setState(state => ({
      environments: state.environments.map(e =>
        e.id === id ? { ...e, name: editEnvName.trim() } : e
      )
    }));
    setEditingEnvId(null);
    message.success('Environment renamed');
  };

  // 激活环境
  const handleActivateEnv = (id: string) => {
    setCurrentEnvironmentId(id);
    message.success('Environment activated');
  };

  return (
    <div style={{ height: '100%', display: 'flex' }}>
      {/* 左侧环境列表 */}
      <div style={{
        width: 220,
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        background: '#F8FAFC'
      }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'white'
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>Environments</span>
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            style={{ color: '#6366F1' }}
            onClick={() => setShowNewEnv(true)}
          />
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {/* 新增环境输入框 */}
          {showNewEnv && (
            <div style={{
              padding: '8px',
              background: 'white',
              borderRadius: 6,
              marginBottom: 8,
              border: '1px solid #E2E8F0'
            }}>
              <Input
                size="small"
                placeholder="Environment name"
                value={newEnvName}
                onChange={e => setNewEnvName(e.target.value)}
                onPressEnter={handleAddEnv}
                autoFocus
                style={{ fontSize: 12, marginBottom: 8 }}
              />
              <Space size={4}>
                <Button size="small" type="primary" style={{ background: '#6366F1' }} onClick={handleAddEnv}>Create</Button>
                <Button size="small" onClick={() => { setShowNewEnv(false); setNewEnvName(''); }}>Cancel</Button>
              </Space>
            </div>
          )}

          {/* 环境列表 */}
          {environments.map(env => (
            <div
              key={env.id}
              onClick={() => setSelectedEnvId(env.id)}
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 4,
                background: selectedEnvId === env.id ? '#EEF2FF' : 'white',
                border: selectedEnvId === env.id ? '1px solid #6366F1' : '1px solid transparent',
              }}
            >
              <GlobalOutlined style={{
                color: currentEnvironmentId === env.id ? '#6366F1' : '#94A3B8',
                fontSize: 14
              }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                {editingEnvId === env.id ? (
                  <Input
                    size="small"
                    value={editEnvName}
                    onChange={e => setEditEnvName(e.target.value)}
                    onPressEnter={() => handleRenameEnv(env.id)}
                    onClick={e => e.stopPropagation()}
                    autoFocus
                    style={{ fontSize: 12 }}
                  />
                ) : (
                  <div style={{
                    fontSize: 13,
                    color: selectedEnvId === env.id ? '#6366F1' : '#475569',
                    fontWeight: selectedEnvId === env.id ? 500 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {env.name}
                  </div>
                )}
              </div>

              {currentEnvironmentId === env.id && (
                <CheckCircleFilled style={{ color: '#10B981', fontSize: 12 }} />
              )}

              <Space size={0} onClick={e => e.stopPropagation()}>
                {editingEnvId === env.id ? (
                  <>
                    <Button type="text" size="small" icon={<CheckOutlined />} style={{ color: '#10B981' }} onClick={() => handleRenameEnv(env.id)} />
                    <Button type="text" size="small" icon={<CloseOutlined />} style={{ color: '#94A3B8' }} onClick={() => setEditingEnvId(null)} />
                  </>
                ) : (
                  <>
                    <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#94A3B8' }} onClick={() => { setEditingEnvId(env.id); setEditEnvName(env.name); }} />
                    <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#94A3B8' }} onClick={() => handleDeleteEnv(env.id)} />
                  </>
                )}
              </Space>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧变量编辑区 */}
      <div style={{ flex: 1, padding: '16px', overflow: 'auto', background: 'white' }}>
        {selectedEnv ? (
          <EnvironmentVariablesEditor
            environment={selectedEnv}
            isActive={currentEnvironmentId === selectedEnv.id}
            onActivate={() => handleActivateEnv(selectedEnv.id)}
          />
        ) : (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94A3B8',
            fontSize: 14
          }}>
            Select an environment to edit variables
          </div>
        )}
      </div>
    </div>
  );
}

// 环境变量编辑器
function EnvironmentVariablesEditor({
  environment,
  isActive,
  onActivate
}: {
  environment: Environment;
  isActive: boolean;
  onActivate: () => void;
}) {
  const [newVar, setNewVar] = useState<{ key: string; value: string }>({ key: '', value: '' });
  const [editingVar, setEditingVar] = useState<KeyValuePair | null>(null);

  // 检查 key 是否已存在
  const isKeyExists = (key: string, excludeId?: string) => {
    return environment.variables.some(v =>
      v.key.toLowerCase() === key.toLowerCase() && v.id !== excludeId
    );
  };

  // 添加变量
  const handleAddVar = () => {
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
        e.id === environment.id
          ? { ...e, variables: [...e.variables, newVariable] }
          : e
      )
    }));

    setNewVar({ key: '', value: '' });
    message.success('Variable added');
  };

  // 更新变量
  const handleUpdateVar = () => {
    if (!editingVar) return;
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
        e.id === environment.id
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
    useAppStore.setState(state => ({
      environments: state.environments.map(e =>
        e.id === environment.id
          ? { ...e, variables: e.variables.filter(v => v.id !== varId) }
          : e
      )
    }));
    message.success('Variable deleted');
  };

  // 切换变量启用状态
  const handleToggleVar = (varId: string, enabled: boolean) => {
    useAppStore.setState(state => ({
      environments: state.environments.map(e =>
        e.id === environment.id
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

  return (
    <div>
      {/* 环境标题 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: '#1E293B' }}>{environment.name}</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748B' }}>
            {environment.variables.length} variables
          </p>
        </div>
        <Space>
          {isActive ? (
            <Tag color="success" icon={<CheckCircleFilled />}>Active</Tag>
          ) : (
            <Button type="primary" onClick={onActivate} style={{ background: '#6366F1' }}>
              Activate
            </Button>
          )}
        </Space>
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
      <Table
        size="small"
        columns={columns}
        dataSource={environment.variables}
        rowKey="id"
        pagination={false}
        locale={{ emptyText: 'No variables yet. Add one above.' }}
      />

      {/* 使用说明 */}
      <div style={{
        marginTop: 24,
        padding: 12,
        background: '#F8FAFC',
        borderRadius: 6,
        fontSize: 12,
        color: '#64748B'
      }}>
        <strong>How to use:</strong> Reference variables using {'{{variableName}}'} in URLs, headers, or body.
        {isActive && ' This environment is currently active and its variables will be used in requests.'}
      </div>
    </div>
  );
}
