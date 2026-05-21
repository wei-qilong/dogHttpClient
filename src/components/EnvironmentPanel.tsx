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
  Space,
  Tooltip,
  message
} from 'antd';
import { useAppStore } from '../store';
import type { Environment } from '../types';

const genId = () => Math.random().toString(36).substring(2, 10);

// 侧边栏中的环境列表（单栏，适配220px宽度）
export function EnvironmentPanel() {
  const { environments, currentEnvironmentId, setCurrentEnvironmentId } = useAppStore();
  const [showNewEnv, setShowNewEnv] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');
  const [editingEnvId, setEditingEnvId] = useState<string | null>(null);
  const [editEnvName, setEditEnvName] = useState('');

  // 新增环境
  const handleAddEnv = () => {
    if (!newEnvName.trim()) {
      message.error('Environment name is required');
      return;
    }
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
      environments: [...state.environments, newEnv],
      currentEnvironmentId: newEnv.id
    }));
    setNewEnvName('');
    setShowNewEnv(false);
    message.success('Environment created');
  };

  // 删除环境
  const handleDeleteEnv = (id: string) => {
    useAppStore.setState(state => ({
      environments: state.environments.filter(e => e.id !== id),
      currentEnvironmentId: state.currentEnvironmentId === id ? null : state.currentEnvironmentId
    }));
    message.success('Environment deleted');
  };

  // 重命名环境
  const handleRenameEnv = (id: string) => {
    if (!editEnvName.trim()) {
      setEditingEnvId(null);
      return;
    }
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
    <div style={{ padding: '8px 0' }}>
      {/* 新增环境输入框 */}
      {showNewEnv && (
        <div style={{ padding: '8px 12px', display: 'flex', gap: 4, alignItems: 'center' }}>
          <Input
            size="small"
            placeholder="Environment name"
            value={newEnvName}
            onChange={e => setNewEnvName(e.target.value)}
            onPressEnter={handleAddEnv}
            autoFocus
            style={{ fontSize: 12 }}
          />
          <Button size="small" type="text" icon={<CheckOutlined />} style={{ color: '#10B981' }} onClick={handleAddEnv} />
          <Button size="small" type="text" icon={<CloseOutlined />} style={{ color: '#94A3B8' }} onClick={() => { setShowNewEnv(false); setNewEnvName(''); }} />
        </div>
      )}

      {environments.map(env => (
        <div
          key={env.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            cursor: 'pointer',
            background: currentEnvironmentId === env.id ? '#EEF2FF' : 'transparent',
            borderLeft: currentEnvironmentId === env.id ? '3px solid #6366F1' : '3px solid transparent'
          }}
          onClick={() => handleActivateEnv(env.id)}
        >
          <GlobalOutlined style={{
            marginRight: 8,
            color: currentEnvironmentId === env.id ? '#6366F1' : '#64748B',
            fontSize: 13
          }} />

          {editingEnvId === env.id ? (
            <Input
              size="small"
              value={editEnvName}
              onChange={e => setEditEnvName(e.target.value)}
              onPressEnter={() => handleRenameEnv(env.id)}
              onClick={e => e.stopPropagation()}
              autoFocus
              style={{ fontSize: 12, flex: 1 }}
            />
          ) : (
            <span style={{
              flex: 1,
              fontSize: 13,
              color: currentEnvironmentId === env.id ? '#6366F1' : '#475569',
              fontWeight: currentEnvironmentId === env.id ? 500 : 400,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {env.name}
              {env.variables.length > 0 && (
                <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 4 }}>
                  ({env.variables.length})
                </span>
              )}
            </span>
          )}

          <Space size={0} onClick={e => e.stopPropagation()}>
            {editingEnvId === env.id ? (
              <>
                <Button type="text" size="small" icon={<CheckOutlined />} style={{ color: '#10B981', fontSize: 11 }} onClick={() => handleRenameEnv(env.id)} />
                <Button type="text" size="small" icon={<CloseOutlined />} style={{ color: '#94A3B8', fontSize: 11 }} onClick={() => setEditingEnvId(null)} />
              </>
            ) : (
              <>
                {currentEnvironmentId === env.id && (
                  <CheckCircleFilled style={{ color: '#10B981', fontSize: 12, marginRight: 2 }} />
                )}
                <Tooltip title="Rename">
                  <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#94A3B8', fontSize: 11 }} onClick={() => { setEditingEnvId(env.id); setEditEnvName(env.name); }} />
                </Tooltip>
                <Tooltip title="Delete">
                  <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#94A3B8', fontSize: 11 }} onClick={() => handleDeleteEnv(env.id)} />
                </Tooltip>
              </>
            )}
          </Space>
        </div>
      ))}

      {/* 底部新增环境按钮 */}
      {!showNewEnv && (
        <div style={{ padding: '8px 12px' }}>
          <Button
            type="dashed"
            block
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setShowNewEnv(true)}
            style={{ fontSize: 12, color: '#64748B', borderColor: '#E2E8F0' }}
          >
            New Environment
          </Button>
        </div>
      )}
    </div>
  );
}
