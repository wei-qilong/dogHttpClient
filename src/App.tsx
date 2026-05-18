import { Layout, Space, Button, Divider } from 'antd';
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  PlusOutlined, 
  SettingOutlined
} from '@ant-design/icons';
import { useAppStore } from './store';
import { Sidebar, SidebarContent } from './components/Sidebar';
import { RequestPanel } from './components/RequestPanel';
import { ResponsePanel } from './components/ResponsePanel';

const { Header, Sider, Content } = Layout;

function App() {
  const { sidebarVisible, toggleSidebar } = useAppStore();
  
  // 创建新请求
  const handleNewRequest = () => {
    const genId = () => Math.random().toString(36).substring(2, 10);
    const newRequest = {
      id: genId(),
      name: '未命名请求',
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
          <Space size={8}>
            <div style={{ 
              width: 28, 
              height: 28, 
              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', 
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: 14 }}>🐕</span>
            </div>
            <span style={{ color: '#1E293B', fontWeight: 600, fontSize: 15 }}>dogHttpClient</span>
          </Space>
          
          <Divider type="vertical" style={{ height: 24, margin: '0 8px' }} />
          
          <Button 
            type="text" 
            icon={<PlusOutlined />}
            onClick={handleNewRequest}
            style={{ color: '#64748B', fontSize: 14 }}
          >
            New
          </Button>
          <Button 
            type="text" 
            style={{ color: '#64748B', fontSize: 14 }}
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
        
        {/* 主内容区 - 整体滚动 */}
        <Content style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          background: '#F8FAFC'
        }}>
          {/* 请求区域 */}
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
  );
}

export default App;
