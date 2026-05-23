import { useState, useEffect, useRef } from 'react';
import { Layout, Space, Button, Dropdown, Input, Tooltip } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  DownOutlined,
  SendOutlined,
  SaveOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { useAppStore } from './store';
import { logToFile } from './services/storage';
import { Sidebar, SidebarContent } from './components/Sidebar';
import { RequestPanel } from './components/RequestPanel';
import { ResponsePanel } from './components/ResponsePanel';
import { ImportModal } from './components/ImportModal';
import { EnvironmentVariablesEditor } from './components/EnvironmentVariablesEditor';
import { CollectionSettings } from './components/CollectionSettings';
import type { HttpMethod } from './types';
import { parseUrlToParams, buildFullUrl } from './utils/urlHelper';

const { Header, Sider, Content } = Layout;

const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

const methodColors: Record<string, string> = {
  GET: '#10B981',
  POST: '#F59E0B',
  PUT: '#3B82F6',
  DELETE: '#EF4444',
  PATCH: '#8B5CF6',
  HEAD: '#6B7280',
  OPTIONS: '#6B7280',
};

function App() {
  const { 
    sidebarVisible, toggleSidebar, currentRequest, setCurrentRequest, sendRequest, 
    isLoading, collections, currentCollectionId, initFromStorage, dirtyRequestIds,
    sidebarActiveTab, currentEditingCollectionId
  } = useAppStore();

  // 启动时从本地存储加载数据
  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  // Ctrl+S 保存所有脏请求
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const { saveAllDirty, dirtyRequestIds } = useAppStore.getState();
        if (dirtyRequestIds.size > 0) {
          saveAllDirty();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentCollection = collections.find(c => c.id === currentCollectionId);

  // 面包屑编辑状态
  const [editingCollection, setEditingCollection] = useState(false);
  const [editingRequest, setEditingRequest] = useState(false);
  const [editCollectionName, setEditCollectionName] = useState('');
  const [editRequestName, setEditRequestName] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);

  // 开始编辑 Collection 名称
  const startEditCollection = () => {
    if (currentCollection) {
      setEditCollectionName(currentCollection.name);
      setEditingCollection(true);
    }
  };

  // 开始编辑 Request 名称
  const startEditRequest = () => {
    setEditRequestName(currentRequest.name || '');
    setEditingRequest(true);
  };

  // 保存 Collection 名称
  const saveCollectionName = () => {
    if (currentCollection && editCollectionName.trim()) {
      useAppStore.setState(s => ({
        collections: s.collections.map(c => 
          c.id === currentCollection.id ? { ...c, name: editCollectionName.trim() } : c
        )
      }));
    }
    setEditingCollection(false);
  };

  // 保存 Request 名称
  const saveRequestName = () => {
    if (editRequestName.trim()) {
      const newName = editRequestName.trim();
      setCurrentRequest({ name: newName });
      if (currentCollectionId) {
        useAppStore.setState(s => ({
          collections: s.collections.map(c => 
            c.id === currentCollectionId 
              ? { ...c, requests: c.requests.map(r => r.id === currentRequest.id ? { ...r, name: newName } : r) }
              : c
          )
        }));
      }
    }
    setEditingRequest(false);
  };

  // 生成唯一的请求名称
  const generateRequestName = () => {
    const allRequests = collections.flatMap(c => c.requests);
    const existingNames = allRequests.map(r => r.name);
    let counter = 1;
    while (existingNames.includes(`New Request ${counter}`)) {
      counter++;
    }
    return `New Request ${counter}`;
  };

  // 创建新请求
  const handleNewRequest = () => {
    const genId = () => Math.random().toString(36).substring(2, 10);
    const newRequest = {
      id: genId(),
      name: generateRequestName(),
      method: 'GET' as const,
      url: '',
      params: [],
      headers: [
        { id: genId(), key: 'Accept', value: 'application/json', enabled: true },
        { id: genId(), key: 'Content-Type', value: 'application/json', enabled: true },
      ],
      bodyType: 'none' as const,
      bodyContent: '',
      bodyRawType: 'json' as const,
      preRequestScript: '',
      testsScript: '',
      auth: { type: 'inherit' as const },
      variables: [],
    };
    useAppStore.getState().setCurrentRequest(newRequest, null);
    useAppStore.getState().markDirty(newRequest.id);
    useAppStore.setState({ currentResponse: null });
  };

  const handleSend = async () => {
    await sendRequest();
  };

  // 保存请求 - 使用 store 中的 saveAllDirty 统一处理
  const handleSave = async () => {
    await logToFile('=== Save button clicked ===');
    const { saveAllDirty, dirtyRequestIds, collections } = useAppStore.getState();
    await logToFile(`Current collections count: ${collections.length}`);
    await logToFile(`Dirty request IDs: ${Array.from(dirtyRequestIds).join(', ')}`);
    await logToFile('Calling saveAllDirty...');
    saveAllDirty();
    await logToFile('saveAllDirty returned');
  };

  // URL 输入框用本地状态管理，避免受控组件导致输入被覆盖
  const [urlInputValue, setUrlInputValue] = useState(currentRequest.url);
  const isUrlFocusedRef = useRef(false);

  // 当 currentRequest.url 或 params 变化时（非用户输入导致），同步到输入框
  const prevUrlRef = useRef(currentRequest.url);
  const prevParamsJsonRef = useRef(JSON.stringify(currentRequest.params));
  useEffect(() => {
    const urlChanged = prevUrlRef.current !== currentRequest.url;
    const paramsChanged = prevParamsJsonRef.current !== JSON.stringify(currentRequest.params);
    prevUrlRef.current = currentRequest.url;
    prevParamsJsonRef.current = JSON.stringify(currentRequest.params);

    // 只在非用户输入时更新输入框（用户输入时 isUrlFocusedRef 为 true）
    if (!isUrlFocusedRef.current && (urlChanged || paramsChanged)) {
      const newDisplayUrl = buildFullUrl(currentRequest.url, currentRequest.params);
      setUrlInputValue(newDisplayUrl);
    }
  }, [currentRequest.url, currentRequest.params]);

  // 处理URL输入 - 用户在地址栏输入时
  const handleUrlChange = (newUrl: string) => {
    setUrlInputValue(newUrl); // 先更新本地状态，保证输入流畅
    const { baseUrl, params } = parseUrlToParams(newUrl);
    setCurrentRequest({ url: baseUrl, params }, undefined, true);
  };

  // 处理URL获取/失去焦点
  const handleUrlFocus = () => {
    isUrlFocusedRef.current = true;
    // 聚焦时，显示完整URL（baseUrl + params）
    const fullUrl = buildFullUrl(currentRequest.url, currentRequest.params);
    setUrlInputValue(fullUrl);
  };
  const handleUrlBlur = () => {
    isUrlFocusedRef.current = false;
  };

  const methodItems = methods.map(m => ({
    key: m,
    label: <span style={{ color: methodColors[m], fontWeight: 600 }}>{m}</span>,
  }));

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden', background: '#F8FAFC' }}>
      {/* Header */}
      <Header style={{ 
        background: '#FFFFFF', 
        borderBottom: '1px solid #E2E8F0',
        padding: '0 16px',
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Space size={8} align="center">
          <img 
            src="/icon.png" 
            alt="dogHttpClient" 
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              objectFit: 'cover',
              display: 'block'
            }}
          />
          <span style={{ color: '#1E293B', fontWeight: 600, fontSize: 16, lineHeight: '24px' }}>dogHttpClient</span>
        </Space>

        <Space>
          <Button
            type="text"
            icon={<UploadOutlined />}
            onClick={() => setImportModalOpen(true)}
            style={{ color: '#64748B' }}
          >
            Import
          </Button>
          <Button
            type="text"
            icon={<PlusOutlined />}
            onClick={handleNewRequest}
            style={{ color: '#64748B' }}
          >
            New
          </Button>
        </Space>
      </Header>

      <Layout style={{ background: '#F8FAFC' }}>
        {/* Sidebar - 图标导航栏 + 内容面板 */}
        <Sider
          width={sidebarVisible ? 280 : 60}
          collapsed={!sidebarVisible}
          collapsedWidth={60}
          style={{
            background: '#FFFFFF',
            borderRight: '1px solid #E2E8F0',
            overflow: 'auto'
          }}
        >
          <div style={{ display: 'flex', height: '100%' }}>
            {/* 图标导航栏 - 始终显示 */}
            <div style={{ width: 60, flexShrink: 0 }}>
              <Sidebar />
            </div>
            {/* 内容面板 - 可折叠 */}
            {sidebarVisible && (
              <div style={{ width: 220, overflow: 'auto' }}>
                <SidebarContent />
              </div>
            )}
          </div>
        </Sider>

        {/* Main Content */}
        <Content style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {currentEditingCollectionId ? (
            /* Collection Settings - 全屏展示 */
            <CollectionSettings />
          ) : sidebarActiveTab === 'environments' ? (
            /* Environment Variables Editor - 全屏展示 */
            <EnvironmentVariablesEditor />
          ) : (
            <>
              {/* 固定的地址栏区域 */}
              <div style={{
                background: '#FFFFFF',
                borderBottom: '1px solid #E2E8F0',
                flexShrink: 0
              }}>
                {/* Breadcrumb & Actions Bar */}
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  {/* Sidebar Toggle */}
                  <Button
                    type="text"
                    icon={sidebarVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                    onClick={toggleSidebar}
                    style={{ color: '#64748B' }}
                  />

              {/* Collection 面包屑 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {editingCollection ? (
                  <Input 
                    size="small" 
                    value={editCollectionName}
                    onChange={e => setEditCollectionName(e.target.value)}
                    onPressEnter={saveCollectionName}
                    onBlur={saveCollectionName}
                    autoFocus
                    style={{ width: 120, fontSize: 12 }}
                  />
                ) : (
                  <span 
                    onClick={startEditCollection}
                    style={{ 
                      cursor: 'pointer',
                      color: currentCollection ? '#3B82F6' : '#94A3B8',
                      fontSize: 12,
                      fontWeight: 500,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: currentCollection ? '#EFF6FF' : 'transparent'
                    }}
                  >
                    {currentCollection?.name || 'Select Collection'}
                  </span>
                )}
                
                <span style={{ color: '#CBD5E1' }}>/</span>
                
                {editingRequest ? (
                  <Input 
                    size="small" 
                    value={editRequestName}
                    onChange={e => setEditRequestName(e.target.value)}
                    onPressEnter={saveRequestName}
                    onBlur={saveRequestName}
                    autoFocus
                    style={{ width: 150, fontSize: 12 }}
                  />
                ) : (
                  <span 
                    onClick={startEditRequest}
                    style={{ 
                      cursor: 'pointer',
                      color: '#1E293B',
                      fontSize: 12,
                      fontWeight: 500,
                      padding: '2px 6px',
                      borderRadius: 4
                    }}
                  >
                    {currentRequest.name || 'Untitled Request'}
                    {dirtyRequestIds.has(currentRequest.id) && <span style={{ color: '#F59E0B', marginLeft: 4, fontWeight: 600 }}>*</span>}
                  </span>
                )}
              </div>

            </div>

            {/* URL 输入区 */}
            <div style={{ padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <Dropdown
                menu={{
                  items: methodItems,
                  onClick: ({ key }) => setCurrentRequest({ method: key as HttpMethod }),
                  style: { minWidth: 120 }
                }}
              >
                <Button
                  style={{
                    minWidth: 90,
                    color: methodColors[currentRequest.method],
                    fontWeight: 600,
                    fontSize: 13,
                    borderColor: '#E2E8F0',
                  }}
                >
                  {currentRequest.method}
                  <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
                </Button>
              </Dropdown>

              <Input
                value={urlInputValue}
                onChange={(e) => handleUrlChange(e.target.value)}
                onFocus={handleUrlFocus}
                onBlur={handleUrlBlur}
                placeholder="Enter request URL"
                style={{
                  flex: 1,
                  fontSize: 13,
                  borderColor: '#E2E8F0'
                }}
              />

              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                loading={isLoading}
                style={{
                  background: '#3B82F6',
                  borderColor: '#3B82F6',
                  minWidth: 80
                }}
              >
                Send
              </Button>

              <Tooltip title="Save (Ctrl+S)">
                <Button
                  icon={<SaveOutlined />}
                  style={{ borderColor: '#E2E8F0' }}
                  onClick={handleSave}
                />
              </Tooltip>
            </div>
          </div>

          {/* Request Panel + Response 放在同一个滚动容器中，一起滚动 */}
          <div style={{ 
            flex: '1 1 0',
            overflow: 'auto',
            minHeight: 0
          }}>
            <RequestPanel />
            <ResponsePanel />
          </div>
        </>
          )}
        </Content>
      </Layout>

      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
    </Layout>
  );
}

export default App;
