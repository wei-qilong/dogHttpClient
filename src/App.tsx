import { useState, useEffect } from 'react';
import { Layout, Space, Button, Divider, Dropdown, Input, Tooltip } from 'antd';
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
import { Sidebar, SidebarContent } from './components/Sidebar';
import { RequestPanel } from './components/RequestPanel';
import { ResponsePanel } from './components/ResponsePanel';
import { ImportModal } from './components/ImportModal';
import type { HttpMethod, KeyValuePair } from './types';

const { Header, Sider, Content } = Layout;

const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

// 解析URL中的query参数
const parseUrlParams = (url: string): { cleanUrl: string; params: KeyValuePair[] } => {
  try {
    // 处理只有 ? 或 ? 后面没有内容的情况
    const questionMarkIndex = url.indexOf('?');
    if (questionMarkIndex === -1) {
      return { cleanUrl: url, params: [] };
    }
    
    const queryString = url.substring(questionMarkIndex + 1);
    // 如果没有参数，直接返回
    if (!queryString || queryString.trim() === '') {
      return { cleanUrl: url.substring(0, questionMarkIndex), params: [] };
    }
    
    // 使用 URLSearchParams 解析参数
    const searchParams = new URLSearchParams(queryString);
    const params: KeyValuePair[] = [];
    
    searchParams.forEach((value, key) => {
      if (key) { // 只添加有key的参数
        params.push({
          id: Math.random().toString(36).substring(2, 10),
          key,
          value,
          description: '',
          enabled: true
        });
      }
    });
    
    // 返回清除query后的URL
    return { cleanUrl: url.substring(0, questionMarkIndex), params };
  } catch {
    return { cleanUrl: url, params: [] };
  }
};

const methodColors: Record<HttpMethod, string> = {
  GET: '#10B981',
  POST: '#F59E0B',
  PUT: '#3B82F6',
  DELETE: '#EF4444',
  PATCH: '#8B5CF6',
  HEAD: '#6B7280',
  OPTIONS: '#6B7280',
};

const methodItems = methods.map(m => ({
  key: m,
  label: <span style={{ color: methodColors[m], fontWeight: 600 }}>{m}</span>,
}));

function App() {
  const { sidebarVisible, toggleSidebar, currentRequest, setCurrentRequest, sendRequest, isLoading, collections, currentCollectionId } = useAppStore();

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

  // 监听 params 变化，同步更新 URL（双向绑定）
  const prevParamsRef = { current: currentRequest.params };
  useEffect(() => {
    const prevParams = prevParamsRef.current;
    const currParams = currentRequest.params;
    
    // 比较 params 是否变化
    if (prevParams !== currParams) {
      prevParamsRef.current = currParams;
      
      const enabledParams = currParams.filter(p => p.enabled && p.key);
      
      // 从当前 URL 中提取基础 URL（去掉 query 部分）
      const baseUrl = currentRequest.url.split('?')[0] || '';
      
      if (enabledParams.length > 0) {
        const queryString = enabledParams
          .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
          .join('&');
        const newUrl = `${baseUrl}?${queryString}`;
        if (newUrl !== currentRequest.url) {
          setCurrentRequest({ url: newUrl });
        }
      } else {
        // 没有参数时，URL 不应该有 ?
        if (currentRequest.url.includes('?')) {
          setCurrentRequest({ url: baseUrl });
        }
      }
    }
  }, [currentRequest.params, currentRequest.url, setCurrentRequest]);

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
      // 更新当前 request
      setCurrentRequest({ name: newName });
      // 同步更新 collections 中的 request 名称
      if (currentCollectionId) {
        useAppStore.setState(s => ({
          collections: s.collections.map(c => {
            if (c.id === currentCollectionId) {
              return {
                ...c,
                requests: c.requests.map(r => 
                  r.id === currentRequest.id ? { ...r, name: newName } : r
                )
              };
            }
            return c;
          })
        }));
      }
    }
    setEditingRequest(false);
  };

  // 点击 Collection 定位到该 Collection
  const handleCollectionClick = () => {
    // 可以在侧边栏高亮显示对应的 collection
    const element = document.querySelector(`[data-collection-id="${currentCollectionId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // 生成唯一的 Request 名称（跨所有 collections）
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
    // 清空响应
    useAppStore.setState({ currentResponse: null });
  };

  const handleSend = async () => {
    await sendRequest();
  };

  // 保存请求
  const handleSave = () => {
    const state = useAppStore.getState();
    let targetColId = currentCollectionId;

    // 如果没有归属的 Collection，创建默认的 "Scratch Pad"
    if (!targetColId) {
      const scratchPad = state.collections.find(c => c.id === '__scratch_pad__');
      if (scratchPad) {
        targetColId = scratchPad.id;
      } else {
        // 创建 Scratch Pad Collection
        const newCol = {
          id: '__scratch_pad__',
          name: 'Scratch Pad',
          requests: [],
          folders: [],
        };
        useAppStore.setState(s => ({
          collections: [...s.collections, newCol]
        }));
        targetColId = '__scratch_pad__';
      }
    }

    // 更新或添加 request
    const updatedRequest = { ...state.currentRequest };
    
    useAppStore.setState(s => ({
      collections: s.collections.map(c => {
        if (c.id === targetColId) {
          const existingIndex = c.requests.findIndex(r => r.id === updatedRequest.id);
          if (existingIndex >= 0) {
            // 更新现有 request
            const newRequests = [...c.requests];
            newRequests[existingIndex] = updatedRequest;
            return { ...c, requests: newRequests };
          } else {
            // 添加新 request
            return { ...c, requests: [...c.requests, updatedRequest] };
          }
        }
        return c;
      }),
      currentCollectionId: targetColId,
    }));
  };

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden', background: '#F8FAFC' }}>
      {/* 顶部栏 - 简洁风格 */}
      <Header
        style={{
          padding: '0 16px',
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 48,
          lineHeight: '48px',
          borderBottom: '1px solid #E2E8F0',
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.03)'
        }}
      >
        <Space size={16}>
          <Button
            type="text"
            icon={sidebarVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            onClick={toggleSidebar}
            style={{ color: '#64748B', fontSize: 16 }}
          />
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

          <Divider type="vertical" style={{ height: 24, margin: '0 8px' }} />

          <Button
            type="text"
            icon={<PlusOutlined />}
            onClick={handleNewRequest}
            style={{ color: '#64748B', fontSize: 14, display: 'flex', alignItems: 'center' }}
          >
            New
          </Button>
          <Button
            type="text"
            icon={<UploadOutlined />}
            onClick={() => setImportModalOpen(true)}
            style={{ color: '#64748B', fontSize: 14, display: 'flex', alignItems: 'center' }}
          >
            Import
          </Button>
        </Space>

        <Space size={12}>
          <Button
            type="text"
            icon={<SettingOutlined />}
            style={{ color: '#64748B', fontSize: 16 }}
          />
        </Space>
      </Header>

      <Layout style={{ background: '#F8FAFC' }}>
        {/* 左侧图标导航栏 - 图标+文字纵向排列 */}
        <Sider
          width={64}
          style={{
            background: '#FAFBFC',
            borderRight: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <Sidebar />
        </Sider>

        {/* 侧边栏内容区 */}
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

        {/* 右侧主区域 */}
        <Layout style={{ background: '#F8FAFC' }}>
          {/* URL 栏 - 固定不滚动 */}
          <div style={{
            padding: '12px 16px',
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
          }}>
            {/* 面包屑导航 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 12,
              fontSize: 12,
              color: '#64748B'
            }}>
              {/* Collection 名称 */}
              {currentCollection ? (
                <>
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
                      onClick={handleCollectionClick}
                      onDoubleClick={startEditCollection}
                      style={{ 
                        color: '#F59E0B', 
                        fontWeight: 500,
                        cursor: 'pointer',
                        padding: '2px 4px',
                        borderRadius: 4
                      }}
                    >
                      {currentCollection.name}
                    </span>
                  )}
                  <span style={{ margin: '0 8px' }}>/</span>
                </>
              ) : null}
              {/* Request 名称 */}
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
                  onDoubleClick={startEditRequest}
                  style={{ 
                    color: '#1E293B',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    borderRadius: 4
                  }}
                >
                  {currentRequest.name || 'Untitled Request'}
                </span>
              )}
            </div>

            {/* URL 输入区 */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Method 选择器 */}
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  {currentRequest.method}
                  <DownOutlined style={{ fontSize: 10 }} />
                </Button>
              </Dropdown>

              {/* URL 输入框 */}
              <Input
                value={currentRequest.url}
                onChange={(e) => {
                  const newUrl = e.target.value;
                  // 检查 URL 中是否有 query 参数
                  const questionMarkIndex = newUrl.indexOf('?');
                  if (questionMarkIndex !== -1) {
                    const baseUrl = newUrl.substring(0, questionMarkIndex);
                    const queryString = newUrl.substring(questionMarkIndex + 1);
                    
                    // 只要有 ? 就解析参数（包括空参数）
                    const { params } = parseUrlParams(newUrl);
                    // 保留已有 params 的 id，避免闪烁
                    const mergedParams = params.map(newParam => {
                      const existing = currentRequest.params.find(
                        p => p.key === newParam.key && p.enabled
                      );
                      return existing ? { ...existing, value: newParam.value } : newParam;
                    });
                    
                    if (queryString.trim()) {
                      // 有参数，解析并同步到 params，URL 去掉参数部分
                      setCurrentRequest({ url: baseUrl, params: mergedParams });
                    } else {
                      // 只有 ? 没有参数，保留 ? 让用户继续输入
                      setCurrentRequest({ url: newUrl, params: mergedParams });
                    }
                    return;
                  }
                  // 没有 ?，直接更新 URL
                  setCurrentRequest({ url: newUrl });
                }}
                placeholder="Enter request URL"
                style={{
                  flex: 1,
                  fontSize: 13,
                  borderColor: '#E2E8F0'
                }}
              />

              {/* Send 按钮 */}
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

              {/* Save 按钮 */}
              <Tooltip title="Save (Ctrl+S)">
                <Button
                  icon={<SaveOutlined />}
                  style={{ borderColor: '#E2E8F0' }}
                  onClick={handleSave}
                />
              </Tooltip>
            </div>
          </div>

          {/* 可滚动内容区 */}
          <Content style={{
            display: 'flex',
            flexDirection: 'column',
            background: '#F8FAFC',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}>
            {/* 请求区域 - 标签页 */}
            <div style={{
              background: '#FFFFFF',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <RequestPanel />
            </div>

            {/* 响应区域 */}
            <div style={{
              background: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 300
            }}>
              <ResponsePanel />
            </div>
          </Content>
        </Layout>
      </Layout>

      {/* Import Modal */}
      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
    </Layout>
  );
}

export default App;
