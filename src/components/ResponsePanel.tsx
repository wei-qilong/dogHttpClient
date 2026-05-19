import { useState } from 'react';
import { 
  ClockCircleOutlined, 
  DatabaseOutlined, 
  CopyOutlined, 
  DownloadOutlined
} from '@ant-design/icons';
import { Tabs, Tag, Button, Space, Empty, Table } from 'antd';
import { useAppStore } from '../store';

const { TabPane } = Tabs;

export function ResponsePanel() {
  const { currentResponse, responseTab, setResponseTab } = useAppStore();
  const [copied, setCopied] = useState(false);

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

  // 获取响应内容类型
  const getContentType = () => {
    const contentType = currentResponse.headers?.['content-type'] || 
                        currentResponse.headers?.['Content-Type'] || 
                        '';
    return contentType;
  };

  // 根据 Content-Type 获取文件扩展名和 MIME 类型
  const getFileInfo = () => {
    const contentType = getContentType().toLowerCase();
    // 去掉 charset 等参数，只保留主类型
    const mimeType = contentType.split(';')[0].trim();

    // 办公文档
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
      if (mimeType.includes('csv')) return { ext: 'csv', mime: 'text/csv' };
      if (mimeType.includes('sheet') || mimeType.includes('excel')) {
        if (mimeType.includes('openxmlformats')) return { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
        return { ext: 'xls', mime: 'application/vnd.ms-excel' };
      }
      return { ext: 'csv', mime: 'text/csv' };
    }

    // Word 文档
    if (mimeType.includes('word') || mimeType.includes('document')) {
      if (mimeType.includes('openxmlformats')) return { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
      return { ext: 'doc', mime: 'application/msword' };
    }

    // PPT 演示文稿
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || mimeType.includes('slide')) {
      if (mimeType.includes('openxmlformats')) return { ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
      return { ext: 'ppt', mime: 'application/vnd.ms-powerpoint' };
    }

    // PDF
    if (mimeType.includes('pdf')) return { ext: 'pdf', mime: 'application/pdf' };

    // 图片
    if (mimeType.includes('image/png')) return { ext: 'png', mime: 'image/png' };
    if (mimeType.includes('image/jpeg') || mimeType.includes('image/jpg')) return { ext: 'jpg', mime: 'image/jpeg' };
    if (mimeType.includes('image/gif')) return { ext: 'gif', mime: 'image/gif' };
    if (mimeType.includes('image/svg')) return { ext: 'svg', mime: 'image/svg+xml' };
    if (mimeType.includes('image/webp')) return { ext: 'webp', mime: 'image/webp' };
    if (mimeType.includes('image/')) return { ext: 'bin', mime: mimeType };

    // 压缩包
    if (mimeType.includes('zip')) return { ext: 'zip', mime: 'application/zip' };
    if (mimeType.includes('gzip')) return { ext: 'gz', mime: 'application/gzip' };
    if (mimeType.includes('rar')) return { ext: 'rar', mime: 'application/vnd.rar' };
    if (mimeType.includes('7z')) return { ext: '7z', mime: 'application/x-7z-compressed' };

    // 数据格式
    if (mimeType.includes('json')) return { ext: 'json', mime: 'application/json' };
    if (mimeType.includes('xml')) return { ext: 'xml', mime: 'application/xml' };
    if (mimeType.includes('yaml')) return { ext: 'yaml', mime: 'text/yaml' };
    if (mimeType.includes('html')) return { ext: 'html', mime: 'text/html' };
    if (mimeType.includes('css')) return { ext: 'css', mime: 'text/css' };
    if (mimeType.includes('javascript')) return { ext: 'js', mime: 'application/javascript' };

    // 音视频
    if (mimeType.includes('audio/')) return { ext: 'mp3', mime: mimeType };
    if (mimeType.includes('video/')) return { ext: 'mp4', mime: mimeType };

    // 文本
    if (mimeType.includes('text')) return { ext: 'txt', mime: 'text/plain' };

    // 默认
    return { ext: 'bin', mime: 'application/octet-stream' };
  };

  // 复制响应到剪切板
  const handleCopy = () => {
    navigator.clipboard.writeText(currentResponse.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 保存响应到文件
  const handleSave = () => {
    const { ext, mime } = getFileInfo();
    const blob = new Blob([currentResponse.body], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `response.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const headerData = Object.entries(currentResponse.headers || {}).map(([key, value]) => ({
    key,
    value,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      {/* Response Meta */}
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
            onClick={handleCopy}
            style={{ color: '#64748B', fontSize: 12 }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button 
            type="text" 
            size="small" 
            icon={<DownloadOutlined />}
            onClick={handleSave}
            style={{ color: '#64748B', fontSize: 12 }}
          >
            Save Response
          </Button>
        </Space>
      </div>

      {/* Response Tabs */}
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
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              maxHeight: 'calc(100vh - 300px)'
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
