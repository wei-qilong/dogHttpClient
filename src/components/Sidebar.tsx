import { useState } from 'react';
import { 
  FolderOutlined, 
  GlobalOutlined, 
  HistoryOutlined,
  PlusOutlined,
  DownOutlined,
  RightOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { 
  Button, 
  Empty, 
  Tag,
  Space,
  Tooltip,
  Input,
  message
} from 'antd';
import { useAppStore } from '../store';
import type { Collection, RequestConfig } from '../types';

const methodColors: Record<string, string> = {
  GET: '#10B981',
  POST: '#F59E0B',
  PUT: '#3B82F6',
  DELETE: '#EF4444',
  PATCH: '#8B5CF6',
  HEAD: '#6B7280',
  OPTIONS: '#6B7280',
};

// 简单 ID 生成
const genId = () => Math.random().toString(36).substring(2, 10);

// 图标导航栏组件 - 图标+文字纵向排列
export function Sidebar() {
  const { sidebarActiveTab, setSidebarActiveTab, toggleSidebar } = useAppStore();

  const navItems = [
    { key: 'collections', icon: <FolderOutlined />, label: 'Collections' },
    { key: 'environments', icon: <GlobalOutlined />, label: 'Envs' },
    { key: 'history', icon: <HistoryOutlined />, label: 'History' },
  ];

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      padding: '4px 0',
      gap: 2
    }}>
      {navItems.map(item => (
        <Tooltip key={item.key} title={item.label} placement="right">
          <div
            onClick={() => {
              setSidebarActiveTab(item.key as 'collections' | 'environments' | 'history');
              if (!useAppStore.getState().sidebarVisible) {
                toggleSidebar();
              }
            }}
            style={{
              width: 52,
              height: 52,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              color: sidebarActiveTab === item.key ? '#6366F1' : '#64748B',
              background: sidebarActiveTab === item.key ? '#EEF2FF' : 'transparent',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: 18
            }}
          >
            {item.icon}
            <span style={{ fontSize: 9, fontWeight: sidebarActiveTab === item.key ? 600 : 400 }}>
              {item.label}
            </span>
          </div>
        </Tooltip>
      ))}
    </div>
  );
}

// 侧边栏详细内容
export function SidebarContent() {
  const { sidebarActiveTab } = useAppStore();
  const [showNewCollection, setShowNewCollection] = useState(false);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 标题栏 */}
      <div style={{ 
        padding: '12px 16px',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>
          {sidebarActiveTab === 'collections' && 'Collections'}
          {sidebarActiveTab === 'environments' && 'Environments'}
          {sidebarActiveTab === 'history' && 'History'}
        </span>
        <Space size={4}>
          {sidebarActiveTab === 'collections' && (
            <Button type="text" size="small" icon={<PlusOutlined />} style={{ color: '#6366F1' }} onClick={() => setShowNewCollection(true)} />
          )}
          {sidebarActiveTab === 'environments' && (
            <Button type="text" size="small" icon={<PlusOutlined />} style={{ color: '#6366F1' }} />
          )}
        </Space>
      </div>

      {/* 面板内容 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {sidebarActiveTab === 'collections' && <CollectionsPanel showNewCollection={showNewCollection} setShowNewCollection={setShowNewCollection} />}
        {sidebarActiveTab === 'environments' && <EnvironmentsPanel />}
        {sidebarActiveTab === 'history' && <HistoryPanel />}
      </div>
    </div>
  );
}

// ==================== Collections 面板 ====================
const SCRATCH_PAD_ID = '__scratch_pad__';

function CollectionsPanel({ showNewCollection: showNewCollectionProp, setShowNewCollection: setShowNewCollectionProp }: { showNewCollection: boolean; setShowNewCollection: (v: boolean) => void }) {
  const { collections } = useAppStore();
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newRequestColId, setNewRequestColId] = useState<string | null>(null);
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editColName, setEditColName] = useState('');
  const [editingReqId, setEditingReqId] = useState<string | null>(null);
  const [editReqName, setEditReqName] = useState('');

  // 合并外部和内部的 showNewCollection 状态
  const isShowingNew = showNewCollection || showNewCollectionProp;
  const hideNewCollection = () => {
    setShowNewCollection(false);
    setShowNewCollectionProp(false);
  };

  const isDefaultCollection = (id: string) => id === SCRATCH_PAD_ID;

  // 生成 request 名称：New Request [1,2,3...]
  const generateRequestName = (colId: string) => {
    const col = collections.find(c => c.id === colId);
    if (!col) return 'New Request 1';
    const existingNames = col.requests.map(r => r.name);
    let counter = 1;
    while (existingNames.includes(`New Request ${counter}`)) {
      counter++;
    }
    return `New Request ${counter}`;
  };

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleAddCollection = () => {
    if (!newCollectionName.trim()) return;
    const newCol: Collection = {
      id: genId(),
      name: newCollectionName.trim(),
      requests: [],
      folders: [],
    };
    useAppStore.setState(state => ({
      collections: [...state.collections, newCol]
    }));
    setNewCollectionName('');
    hideNewCollection();
    message.success('Collection created');
  };

  const handleDeleteCollection = (id: string) => {
    if (isDefaultCollection(id)) return;
    useAppStore.setState(state => ({
      collections: state.collections.filter(c => c.id !== id)
    }));
    message.success('Collection deleted');
  };

  const handleRenameCollection = (id: string) => {
    if (isDefaultCollection(id)) { setEditingColId(null); return; }
    if (!editColName.trim()) { setEditingColId(null); return; }
    useAppStore.setState(state => ({
      collections: state.collections.map(c => 
        c.id === id ? { ...c, name: editColName.trim() } : c
      )
    }));
    setEditingColId(null);
    message.success('Collection renamed');
  };

  const handleAddRequest = (colId: string) => {
    const reqName = generateRequestName(colId);
    const newReq: RequestConfig = {
      id: genId(),
      name: reqName,
      method: 'GET',
      url: '',
      params: [],
      headers: [],
      bodyType: 'none',
      bodyContent: '',
      bodyRawType: 'json',
      preRequestScript: '',
      testsScript: '',
    };
    useAppStore.setState(state => ({
      collections: state.collections.map(c => 
        c.id === colId ? { ...c, requests: [...c.requests, newReq] } : c
      )
    }));
    setNewRequestColId(null);
    useAppStore.getState().setCurrentRequest(newReq, colId);
    message.success('Request added');
  };

  const handleDeleteRequest = (colId: string, reqId: string) => {
    useAppStore.setState(state => ({
      collections: state.collections.map(c => 
        c.id === colId 
          ? { ...c, requests: c.requests.filter(r => r.id !== reqId) } 
          : c
      )
    }));
    message.success('Request deleted');
  };

  const handleRenameRequest = (colId: string, reqId: string) => {
    if (!editReqName.trim()) { setEditingReqId(null); return; }
    useAppStore.setState(state => ({
      collections: state.collections.map(c => {
        if (c.id === colId) {
          return { ...c, requests: c.requests.map(r => r.id === reqId ? { ...r, name: editReqName.trim() } : r) };
        }
        return c;
      })
    }));
    setEditingReqId(null);
    message.success('Request renamed');
  };

  const handleSelectRequest = (req: RequestConfig, colId: string) => {
    if (editingReqId) return;
    useAppStore.getState().setCurrentRequest(req, colId);
  };

  return (
    <div style={{ padding: '8px 0' }}>
      {isShowingNew && (
        <div style={{ padding: '8px 12px', display: 'flex', gap: 4, alignItems: 'center' }}>
          <Input size="small" placeholder="Collection name" value={newCollectionName}
            onChange={e => setNewCollectionName(e.target.value)} onPressEnter={handleAddCollection}
            autoFocus style={{ fontSize: 12 }} />
          <Button size="small" type="text" icon={<CheckOutlined />} style={{ color: '#10B981' }} onClick={handleAddCollection} />
          <Button size="small" type="text" icon={<CloseOutlined />} style={{ color: '#94A3B8' }} onClick={() => { hideNewCollection(); setNewCollectionName(''); }} />
        </div>
      )}

      {collections.length === 0 && !isShowingNew ? (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span style={{ fontSize: 12, color: '#94A3B8' }}>No collections yet. Click + to create one.</span>}
          style={{ marginTop: 40 }}
        />
      ) : (
        <div>
          {collections.map(collection => {
            const isDefault = isDefaultCollection(collection.id);
            return (
              <div key={collection.id}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: '#1E293B', fontWeight: 500 }}
                  onClick={() => toggleExpand(collection.id)}>
                  {expandedKeys.includes(collection.id) || newRequestColId === collection.id ? 
                    <DownOutlined style={{ fontSize: 10, marginRight: 6, color: '#94A3B8' }} /> :
                    <RightOutlined style={{ fontSize: 10, marginRight: 6, color: '#94A3B8' }} />}
                  <FolderOutlined style={{ marginRight: 6, color: '#F59E0B', fontSize: 13 }} />
                  {editingColId === collection.id ? (
                    <Input size="small" value={editColName} onChange={e => setEditColName(e.target.value)}
                      onPressEnter={() => handleRenameCollection(collection.id)} onClick={e => e.stopPropagation()}
                      autoFocus style={{ fontSize: 12, flex: 1 }} />
                  ) : (
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{collection.name}</span>
                  )}
                  <Space size={0} onClick={e => e.stopPropagation()}>
                    {editingColId === collection.id ? (
                      <>
                        <Button type="text" size="small" icon={<CheckOutlined />} style={{ color: '#10B981', fontSize: 11 }} onClick={() => handleRenameCollection(collection.id)} />
                        <Button type="text" size="small" icon={<CloseOutlined />} style={{ color: '#94A3B8', fontSize: 11 }} onClick={() => setEditingColId(null)} />
                      </>
                    ) : (
                      <>
                        <Tooltip title="Add Request">
                          <Button type="text" size="small" icon={<PlusOutlined />} style={{ color: '#94A3B8', fontSize: 11 }}
                            onClick={() => { setNewRequestColId(collection.id); setExpandedKeys(prev => prev.includes(collection.id) ? prev : [...prev, collection.id]); }} />
                        </Tooltip>
                        {!isDefault && (
                          <>
                            <Tooltip title="Rename">
                              <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#94A3B8', fontSize: 11 }}
                                onClick={() => { setEditingColId(collection.id); setEditColName(collection.name); }} />
                            </Tooltip>
                            <Tooltip title="Delete">
                              <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#94A3B8', fontSize: 11 }}
                                onClick={() => handleDeleteCollection(collection.id)} />
                            </Tooltip>
                          </>
                        )}
                      </>
                    )}
                  </Space>
                </div>
                
                {(expandedKeys.includes(collection.id) || newRequestColId === collection.id) && (
                  <div>
                    {collection.requests.map(req => (
                      <div key={req.id}
                        style={{ display: 'flex', alignItems: 'center', padding: '5px 12px 5px 32px', cursor: 'pointer', fontSize: 12, color: '#475569', borderRadius: 4, transition: 'background 0.15s' }}
                        onClick={() => handleSelectRequest(req, collection.id)}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <span style={{ color: methodColors[req.method] || '#6B7280', fontWeight: 600, minWidth: 42, fontSize: 10 }}>{req.method}</span>
                        {editingReqId === req.id ? (
                          <Input size="small" value={editReqName} onChange={e => setEditReqName(e.target.value)}
                            onPressEnter={() => handleRenameRequest(collection.id, req.id)} onClick={e => e.stopPropagation()}
                            autoFocus style={{ fontSize: 11, flex: 1 }} />
                        ) : (
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.name}</span>
                        )}
                        <Space size={0} onClick={e => e.stopPropagation()}>
                          {editingReqId === req.id ? (
                            <>
                              <Button type="text" size="small" icon={<CheckOutlined />} style={{ color: '#10B981', fontSize: 11 }} onClick={() => handleRenameRequest(collection.id, req.id)} />
                              <Button type="text" size="small" icon={<CloseOutlined />} style={{ color: '#94A3B8', fontSize: 11 }} onClick={() => setEditingReqId(null)} />
                            </>
                          ) : (
                            <>
                              <Tooltip title="Rename">
                                <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#94A3B8', fontSize: 11 }}
                                  onClick={() => { setEditingReqId(req.id); setEditReqName(req.name); }} />
                              </Tooltip>
                              <Tooltip title="Delete">
                                <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#94A3B8', fontSize: 11 }}
                                  onClick={() => handleDeleteRequest(collection.id, req.id)} />
                              </Tooltip>
                            </>
                          )}
                        </Space>
                      </div>
                    ))}
                    {newRequestColId === collection.id && (
                      <div style={{ padding: '4px 12px 4px 32px' }}>
                        <Button type="dashed" block size="small" icon={<PlusOutlined />}
                          onClick={() => handleAddRequest(collection.id)}
                          style={{ fontSize: 11, color: '#64748B', borderColor: '#E2E8F0' }}>
                          Add Request
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================== Environments 面板 ====================
function EnvironmentsPanel() {
  const { environments, currentEnvironmentId } = useAppStore();
  const [showNewEnv, setShowNewEnv] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');
  const [expandedEnvId, setExpandedEnvId] = useState<string | null>(null);
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarValue, setNewVarValue] = useState('');
  const [editingEnvId, setEditingEnvId] = useState<string | null>(null);
  const [editEnvName, setEditEnvName] = useState('');

  // 新增环境
  const handleAddEnv = () => {
    if (!newEnvName.trim()) return;
    const newEnv = {
      id: genId(),
      name: newEnvName.trim(),
      variables: [],
    };
    useAppStore.setState(state => ({
      environments: [...state.environments, newEnv]
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
    if (!editEnvName.trim()) { setEditingEnvId(null); return; }
    useAppStore.setState(state => ({
      environments: state.environments.map(e => 
        e.id === id ? { ...e, name: editEnvName.trim() } : e
      )
    }));
    setEditingEnvId(null);
    message.success('Environment renamed');
  };

  // 切换环境
  const handleSelectEnv = (id: string) => {
    useAppStore.setState({ currentEnvironmentId: id });
  };

  // 新增变量
  const handleAddVar = (envId: string) => {
    if (!newVarKey.trim()) return;
    useAppStore.setState(state => ({
      environments: state.environments.map(e => 
        e.id === envId 
          ? { ...e, variables: [...e.variables, { id: genId(), key: newVarKey.trim(), value: newVarValue, enabled: true }] }
          : e
      )
    }));
    setNewVarKey('');
    setNewVarValue('');
  };

  // 删除变量
  const handleDeleteVar = (envId: string, varId: string) => {
    useAppStore.setState(state => ({
      environments: state.environments.map(e => 
        e.id === envId 
          ? { ...e, variables: e.variables.filter(v => v.id !== varId) }
          : e
      )
    }));
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

      {environments.length === 0 && !showNewEnv ? (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span style={{ fontSize: 12, color: '#94A3B8' }}>No environments yet</span>}
          style={{ marginTop: 40 }}
        >
          <Button 
            type="primary" 
            size="small" 
            onClick={() => setShowNewEnv(true)}
            style={{ background: '#6366F1', borderColor: '#6366F1' }}
          >
            <PlusOutlined /> Create Environment
          </Button>
        </Empty>
      ) : (
        <div>
          {environments.map(env => (
            <div key={env.id}>
              {/* 环境标题行 */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  background: currentEnvironmentId === env.id ? '#EEF2FF' : 'transparent',
                  borderLeft: currentEnvironmentId === env.id ? '3px solid #6366F1' : '3px solid transparent'
                }}
                onClick={() => handleSelectEnv(env.id)}
              >
                <GlobalOutlined style={{ marginRight: 8, color: '#64748B', fontSize: 13 }} />
                
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
                    fontWeight: currentEnvironmentId === env.id ? 500 : 400
                  }}>
                    {env.name}
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
                        <Tag style={{ fontSize: 9, background: '#6366F1', color: 'white', border: 'none', marginRight: 2 }}>Active</Tag>
                      )}
                      <Tooltip title="Add Variable">
                        <Button type="text" size="small" icon={<PlusOutlined />} style={{ color: '#94A3B8', fontSize: 11 }} onClick={() => setExpandedEnvId(expandedEnvId === env.id ? null : env.id)} />
                      </Tooltip>
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

              {/* 展开的变量列表 */}
              {expandedEnvId === env.id && (
                <div style={{ padding: '4px 12px 4px 32px' }}>
                  {env.variables.map(v => (
                    <div key={v.id} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 4, 
                      padding: '3px 0',
                      fontSize: 11
                    }}>
                      <span style={{ color: '#6366F1', fontWeight: 500, minWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.key}</span>
                      <span style={{ color: '#94A3B8' }}>=</span>
                      <span style={{ flex: 1, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.value}</span>
                      <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#CBD5E1', fontSize: 10, padding: 0 }} onClick={() => handleDeleteVar(env.id, v.id)} />
                    </div>
                  ))}
                  {/* 新增变量 */}
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 4 }}>
                    <Input size="small" placeholder="Key" value={newVarKey} onChange={e => setNewVarKey(e.target.value)} style={{ fontSize: 11, flex: 1 }} />
                    <Input size="small" placeholder="Value" value={newVarValue} onChange={e => setNewVarValue(e.target.value)} onPressEnter={() => handleAddVar(env.id)} style={{ fontSize: 11, flex: 1 }} />
                    <Button size="small" type="text" icon={<CheckOutlined />} style={{ color: '#10B981', fontSize: 11 }} onClick={() => handleAddVar(env.id)} />
                  </div>
                </div>
              )}
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
      )}
    </div>
  );
}

// ==================== History 面板 ====================
function HistoryPanel() {
  const { history } = useAppStore();

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div style={{ padding: '8px 0' }}>
      {history.length === 0 ? (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span style={{ fontSize: 12, color: '#94A3B8' }}>No history yet</span>}
          style={{ marginTop: 40 }}
        />
      ) : (
        <div>
          {history.map((item) => (
            <div 
              key={item.id} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: 12,
                borderRadius: 4,
                transition: 'background 0.15s'
              }}
              onClick={() => useAppStore.getState().setCurrentRequest(item.request)}
              onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span 
                style={{ 
                  color: methodColors[item.request.method] || '#6B7280',
                  fontWeight: 600,
                  minWidth: 42,
                  fontSize: 10
                }}
              >
                {item.request.method}
              </span>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  color: '#475569'
                }}>
                  {item.request.url || item.request.name}
                </div>
                <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>
                  {formatTime(item.timestamp)}
                  {item.response && (
                    <span style={{ marginLeft: 8, color: item.response.status < 300 ? '#10B981' : '#F59E0B' }}>
                      {item.response.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Sidebar;
