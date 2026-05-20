import { useState, useEffect } from 'react';
import { Layout, Space, Button, Dropdown, Input, Tooltip } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  SettingOutlined,
  DownOutlined,
  SendOutlined,
  SaveOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { useAppStore } from './store';
import { SidebarContent } from './components/Sidebar';
import { RequestPanel } from './components/RequestPanel';
import { ResponsePanel } from './components/ResponsePanel';
import { ImportModal } from './components/ImportModal';
import type { HttpMethod, KeyValuePair } from './types';

const { Header, Sider, Content } = Layout;

const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

// 解析URL中的query参数（支持渐进式解析）
const parseUrlParams = (url: string): { cleanUrl: string; params: KeyValuePair[] } => {
  try {
    const questionMarkIndex = url.indexOf('?');
    if (questionMarkIndex === -1) {
      return { cleanUrl: url, params: [] };
    }
    
    const queryString = url.substring(questionMarkIndex + 1);
    if (!queryString) {
      return { cleanUrl: url, params: [] };
    }
    
    const params: KeyValuePair[] = [];
    const pairs = queryString.split('&');
    
    for (const pair of pairs) {
      if (pair === '') continue;
      
      const equalIndex = pair.indexOf('=');
      if (equalIndex === -1) {
        params.push({
          id: Math.random().toString(36).substring(2, 10),
          key: decodeURIComponent(pair),
          value: '',
          description: '',
          enabled: true
        });
      } else {
        const key = pair.substring(0, equalIndex);
        const value = pair.substring(equalIndex + 1);
        params.push({
          id: Math.random().toString(36).substring(2, 10),
          key: decodeURIComponent(key),
          value: decodeURIComponent(value),
          description: '',
          enabled: true
        });
      }
    }
    
    return { cleanUrl: url.substring(0, questionMarkIndex), params };
  } catch {
    return { cleanUrl: url, params: [] };
  }
};

// 将params数组转为URL query字符串
const paramsToQueryString = (params: KeyValuePair[]): string => {
  const enabled = params.filter(p => p.enabled && p.key);
  if (enabled.length === 0) return '';
  return '?' + enabled.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
};

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
    isLoading, collections, currentCollectionId, initFromStorage, dirtyRequestIds 
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
    };
    useAppStore.getState().setCurrentRequest(newRequest, null);
    useAppStore.getState().markDirty(newRequest.id);
    useAppStore.setState({ currentResponse: null });
  };

  const handleSend = async () => {
    await sendRequest();
  };

  // 保存请求
  const handleSave = () => {
    const state = useAppStore.getState();
    const updatedRequest = { ...state.currentRequest };
    
    let found = false;
    const updatedCollections = state.collections.map(col => {
      const existingIndex = col.requests.findIndex(r => r.id === updatedRequest.id);
      if (existingIndex >= 0) {
        found = true;
        const newRequests = [...col.requests];
        newRequests[existingIndex] = updatedRequest;
        return { ...col, requests: newRequests };
      }
      return col;
    });
    
    let finalCollections = updatedCollections;
    let targetColId = state.currentCollectionId;
    
    if (!found) {
      finalCollections = updatedCollections.map(col => {
        if (col.name === 'default') {
          return { ...col, requests: [...col.requests, updatedRequest] };
        }
        return col;
      });
      const defaultCol = finalCollections.find(c => c.name === 'default');
      targetColId = defaultCol?.id || state.currentCollectionId;
    }
    
    useAppStore.setState(s => ({
      collections: finalCollections,
      currentCollectionId: targetColId,
      dirtyRequestIds: new Set([...s.dirtyRequestIds].filter(id => id !== updatedRequest.id)),
    }));
  };

  // 处理URL变化 - 解析query参数到params
  const handleUrlChange = (newUrl: string) => {
    const questionMarkIndex = newUrl.indexOf('?');
    
    if (questionMarkIndex === -1) {
      // 没有?，直接更新URL，清空params
      setCurrentRequest({ url: newUrl, params: [] });
      return;
    }
    
    const baseUrl = newUrl.substring(0, questionMarkIndex);
    const queryString = newUrl.substring(questionMarkIndex + 1);
    
    // 正在输入中（如 ?x，没有=），保留URL不变，不解析params
    // 只有完整的 key=value 或 key& 才解析
    const isTyping = queryString.length > 0 && 
                     !queryString.includes('=') && 
                     !queryString.endsWith('&');
    
    if (isTyping && !queryString.includes('&')) {
      // 单个key正在输入中，如 ?x
      setCurrentRequest({ url: newUrl });
      return;
    }
    
    // 解析参数
    const { params } = parseUrlParams(newUrl);
    setCurrentRequest({ url: baseUrl, params });
  };

  // 处理params变化 - 反向同步到URL
  const handleParamsChange = (newParams: KeyValuePair[]) => {
    const baseUrl = currentRequest.url.split('?')[0] || '';
    const queryString = paramsToQueryString(newParams);
    const newUrl = baseUrl + queryString;
    
    setCurrentRequest({ url: newUrl, params: newParams });
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
            icon={<SettingOutlined />}
            style={{ color: '#64748B' }}
          >
            Settings
          </Button>
        </Space>
      </Header>

      <Layout style={{ background: '#F8FAFC' }}>
        {/* Sidebar */}
        {sidebarVisible && (
          <Sider 
            width={280} 
            style={{ 
              background: '#FFFFFF',
              borderRight: '1px solid #E2E8F0',
              overflow: 'auto'
            }}
          >
            <SidebarContent />
          </Sider>
        )}

        {/* Main Content */}
        <Content style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Request Section */}
          <div style={{ 
            flex: 1, 
            overflow: 'auto',
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0'
          }}>
            {/* Breadcrumb & Actions Bar */}
            <div style={{ 
              padding: '12px 16px',
              borderBottom: '1px solid #E2E8F0',
              background: '#FFFFFF',
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

              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <Button 
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleNewRequest}
                  size="small"
                >
                  New
                </Button>
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
                value={currentRequest.url}
                onChange={(e) => handleUrlChange(e.target.value)}
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

            {/* Request Panel */}
            <RequestPanel onParamsChange={handleParamsChange} />
          </div>

          {/* Response Section */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ResponsePanel />
          </div>
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
