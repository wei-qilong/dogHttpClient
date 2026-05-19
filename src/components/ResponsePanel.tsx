import { useState } from 'react';
import { 
  ClockCircleOutlined, 
  DatabaseOutlined, 
  CopyOutlined, 
  DownloadOutlined,
  SearchOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { Tabs, Tag, Button, Space, Empty, Table, Tooltip, Radio } from 'antd';
import { useAppStore } from '../store';

const { TabPane } = Tabs;

export function ResponsePanel() {
  const { currentResponse, responseTab, setResponseTab } = useAppStore();
  const [viewMode, setViewMode] = useState('pretty');

  if (!currentResponse) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#FFFFFF'
      }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <p style={{ color: '#94A3B8', marginBottom: 4, fontSize: 13 }}>Send a request to see the response</p>
              <p style={{ color: '#CBD5E1', fontSize: 12 }}>Response will appear here</p>
            </div>
          }
        />
      </div>
    );
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return '#10B981';
    if (status >= 300 && status < 400) return '#3B82F6';
    if (status >= 400 && status < 500) return '#F59E0B';
    return '#EF4444';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const headerColumns = [
    {
      title: 'KEY',
      dataIndex: 'key',
      width: '40%',
      render: (text: string) => (
        <span style={{ 
          color: '#10B981', 
          fontFamily: 'monospace', 
          fontSize: 12,
          fontWeight: 500
        }}>{text}</span>
      ),
    },
    {
      title: 'VALUE',
      dataIndex: 'value',
      render: (text: string) => (
        <span style={{ 
          fontFamily: 'monospace', 
          fontSize: 12,
          color: '#475569'
        }}>{text}</span>
      ),
    },
  ];

  const headerData = Object.entries(currentResponse.headers).map(([key, value]) => ({
    key,
    value,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      {/* Response Meta - 参考图片风格 */}
      <div style={{ 
        padding: '10px 16px', 
        borderBottom: '1px solid #E2E8F0',
        background: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}>
        {/* Status */}
        <Space size={4}>
          <span style={{ 
            color: getStatusColor(currentResponse.status),
            fontWeight: 600,
            fontSize: 13
          }}>
            {currentResponse.status} {currentResponse.statusText}
          </span>
        </Space>
        
        {/* Time */}
        <Space size={4} style={{ color: '#64748B' }}>
          <ClockCircleOutlined style={{ fontSize: 12 }} />
          <span style={{ fontSize: 12 }}>{currentResponse.time}ms</span>
        </Space>
        
        {/* Size */}
        <Space size={4} style={{ color: '#64748B' }}>
          <DatabaseOutlined style={{ fontSize: 12 }} />
          <span style={{ fontSize: 12 }}>{formatSize(currentResponse.size)}</span>
        </Space>

        {/* Actions */}
        <Space style={{ marginLeft: 'auto' }} size={8}>
          <Button 
            type="text" 
            size="small" 
            icon={<CopyOutlined />}
            style={{ color: '#64748B', fontSize: 12 }}
          >
            Copy
          </Button>
          <Button 
            type="text" 
            size="small" 
            icon={<DownloadOutlined />}
            style={{ color: '#64748B', fontSize: 12 }}
          >
            Save Response
          </Button>
        </Space>
      </div>

      {/* Response Tabs - 参考图片风格 */}
      <Tabs 
        activeKey={responseTab} 
        onChange={(key) => setResponseTab(key as 'headers' | 'body')}
        size="small"
        tabBarStyle={{ 
          padding: '0 16px',
          marginBottom: 0,
          borderBottom: '1px solid #E2E8F0',
          background: '#FFFFFF'
        }}
      >
        <TabPane 
          tab={<span style={{ fontSize: 13 }}>Body</span>} 
          key="body"
        >
          <div style={{ padding: '12px 16px' }}>
            {/* Body 视图切换 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: 12
            }}>
              <Radio.Group 
                value={viewMode} 
                onChange={(e) => setViewMode(e.target.value)}
                size="small"
              >
                <Radio.Button value="pretty" style={{ fontSize: 12 }}>Pretty</Radio.Button>
                <Radio.Button value="raw" style={{ fontSize: 12 }}>Raw</Radio.Button>
                <Radio.Button value="preview" style={{ fontSize: 12 }}>Preview</Radio.Button>
                <Radio.Button value="visualize" style={{ fontSize: 12 }}>Visualize</Radio.Button>
              </Radio.Group>

              <Space size={8}>
                <span style={{ fontSize: 12, color: '#64748B' }}>JSON</span>
                <Button type="text" size="small" icon={<SearchOutlined />} style={{ color: '#64748B' }} />
                <Button type="text" size="small" icon={<EyeOutlined />} style={{ color: '#64748B' }} />
              </Space>
            </div>

            {/* Body 内容 */}
            <pre style={{ 
              background: '#F8FAFC', 
              padding: 16, 
              borderRadius: 6,
              fontFamily: 'monospace',
              fontSize: 12,
              border: '1px solid #E2E8F0',
              color: '#1E293B',
              lineHeight: 1.6,
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              <code>{currentResponse.body}</code>
            </pre>
          </div>
        </TabPane>

        <TabPane
          tab={
            <span style={{ fontSize: 13 }}>
              Headers
              <Tag style={{ marginLeft: 4, fontSize: 10, background: '#EEF2FF', color: '#6366F1', border: 'none' }}>
                {headerData.length}
              </Tag>
            </span>
          }
          key="headers"
        >
          <div style={{ padding: '12px 16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 12,
              padding: '8px 12px',
              background: '#F8FAFC',
              borderRadius: 6
            }}>
              <span style={{ fontSize: 12, color: '#64748B' }}>Headers</span>
              <Tooltip title="hidden">
                <EyeOutlined style={{ color: '#94A3B8', fontSize: 12, marginLeft: 8 }} />
              </Tooltip>
              <span style={{ marginLeft: 8, fontSize: 12, color: '#94A3B8' }}>10 hidden</span>
            </div>

            <Table
              dataSource={headerData}
              columns={headerColumns}
              rowKey="key"
              pagination={false}
              size="small"
              bordered
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: 6
              }}
            />
          </div>
        </TabPane>

      </Tabs>
    </div>
  );
}

export default ResponsePanel;
