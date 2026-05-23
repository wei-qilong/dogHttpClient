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
        minHeight: 200,
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

  // 从 Content-Disposition 解析文件名
  const getFilenameFromDisposition = () => {
    const disposition = currentResponse.headers?.['Content-Disposition'] || 
                       currentResponse.headers?.['content-disposition'] || '';
    
    // 尝试匹配 filename="xxx" 或 filename=xxx
    const match = disposition.match(/filename[^;=\n]*=(["']?)([^"'\n]*)\1/);
    if (match && match[2]) {
      return match[2];
    }
    return null;
  };

  // 根据 Content-Type 获取文件扩展名和 MIME 类型
  const getFileInfo = () => {
    // 优先从 Content-Disposition 获取文件名
    const dispositionFilename = getFilenameFromDisposition();
    if (dispositionFilename) {
      const ext = dispositionFilename.split('.').pop()?.toLowerCase() || '';
      // 根据扩展名返回对应的 mime 类型
      const mimeMap: Record<string, string> = {
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls': 'application/vnd.ms-excel',
        'csv': 'text/csv',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc': 'application/msword',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'ppt': 'application/vnd.ms-powerpoint',
        'pdf': 'application/pdf',
        'zip': 'application/zip',
        'json': 'application/json',
        'xml': 'application/xml',
        'txt': 'text/plain',
        'html': 'text/html',
        'js': 'application/javascript',
        'css': 'text/css',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'webp': 'image/webp',
        'mp4': 'video/mp4',
        'mp3': 'audio/mpeg',
      };
      if (mimeMap[ext]) {
        return { ext, mime: mimeMap[ext] };
      }
    }

    const contentType = getContentType().toLowerCase();
    // 去掉 charset 等参数，只保留主类型
    const mimeType = contentType.split(';')[0].trim();

    // ===== 办公文档 =====
    // Excel
    if (mimeType.includes('spreadsheetml.sheet')) return { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return { ext: 'xls', mime: 'application/vnd.ms-excel' };
    if (mimeType.includes('csv')) return { ext: 'csv', mime: 'text/csv' };
    // Word
    if (mimeType.includes('wordprocessingml.document')) return { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    if (mimeType.includes('word')) return { ext: 'doc', mime: 'application/msword' };
    // PPT
    if (mimeType.includes('presentationml.presentation')) return { ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return { ext: 'ppt', mime: 'application/vnd.ms-powerpoint' };
    // WPS (金山办公) - 使用更精确的匹配
    if (mimeType.includes('application/kswps') || mimeType.includes('wps')) return { ext: 'wps', mime: 'application/kswps' };
    if (mimeType.includes('application/et') || mimeType === 'et') return { ext: 'et', mime: 'application/et' };
    if (mimeType.includes('application/dps') || mimeType.includes('dps')) return { ext: 'dps', mime: 'application/dps' };
    // PDF
    if (mimeType.includes('pdf')) return { ext: 'pdf', mime: 'application/pdf' };

    // ===== 图片 =====
    if (mimeType.includes('image/png')) return { ext: 'png', mime: 'image/png' };
    if (mimeType.includes('image/jpeg') || mimeType.includes('image/jpg')) return { ext: 'jpg', mime: 'image/jpeg' };
    if (mimeType.includes('image/gif')) return { ext: 'gif', mime: 'image/gif' };
    if (mimeType.includes('image/svg')) return { ext: 'svg', mime: 'image/svg+xml' };
    if (mimeType.includes('image/webp')) return { ext: 'webp', mime: 'image/webp' };
    if (mimeType.includes('image/bmp')) return { ext: 'bmp', mime: 'image/bmp' };
    if (mimeType.includes('image/tiff') || mimeType.includes('image/tif')) return { ext: 'tiff', mime: 'image/tiff' };
    if (mimeType.includes('image/ico')) return { ext: 'ico', mime: 'image/x-icon' };
    if (mimeType.includes('image/avif')) return { ext: 'avif', mime: 'image/avif' };
    if (mimeType.includes('image/heic') || mimeType.includes('image/heif')) return { ext: 'heic', mime: 'image/heic' };
    if (mimeType.includes('image/')) return { ext: 'bin', mime: mimeType };

    // ===== 音频 =====
    if (mimeType.includes('audio/mpeg') || mimeType.includes('audio/mp3')) return { ext: 'mp3', mime: 'audio/mpeg' };
    if (mimeType.includes('audio/wav') || mimeType.includes('audio/wave')) return { ext: 'wav', mime: 'audio/wav' };
    if (mimeType.includes('audio/ogg')) return { ext: 'ogg', mime: 'audio/ogg' };
    if (mimeType.includes('audio/flac')) return { ext: 'flac', mime: 'audio/flac' };
    if (mimeType.includes('audio/aac')) return { ext: 'aac', mime: 'audio/aac' };
    if (mimeType.includes('audio/webm')) return { ext: 'weba', mime: 'audio/webm' };
    if (mimeType.includes('audio/midi') || mimeType.includes('audio/mid')) return { ext: 'mid', mime: 'audio/midi' };
    if (mimeType.includes('audio/')) return { ext: 'mp3', mime: mimeType };

    // ===== 视频 =====
    if (mimeType.includes('video/mp4')) return { ext: 'mp4', mime: 'video/mp4' };
    if (mimeType.includes('video/webm')) return { ext: 'webm', mime: 'video/webm' };
    if (mimeType.includes('video/avi')) return { ext: 'avi', mime: 'video/x-msvideo' };
    if (mimeType.includes('video/quicktime') || mimeType.includes('video/mov')) return { ext: 'mov', mime: 'video/quicktime' };
    if (mimeType.includes('video/x-matroska') || mimeType.includes('video/mkv')) return { ext: 'mkv', mime: 'video/x-matroska' };
    if (mimeType.includes('video/x-flv')) return { ext: 'flv', mime: 'video/x-flv' };
    if (mimeType.includes('video/wmv')) return { ext: 'wmv', mime: 'video/x-ms-wmv' };
    if (mimeType.includes('video/mpeg') || mimeType.includes('video/mpg')) return { ext: 'mpeg', mime: 'video/mpeg' };
    if (mimeType.includes('video/3gpp')) return { ext: '3gp', mime: 'video/3gpp' };
    if (mimeType.includes('video/')) return { ext: 'mp4', mime: mimeType };

    // ===== 压缩包 =====
    if (mimeType.includes('zip')) return { ext: 'zip', mime: 'application/zip' };
    if (mimeType.includes('gzip') || mimeType.includes('gz')) return { ext: 'gz', mime: 'application/gzip' };
    if (mimeType.includes('rar')) return { ext: 'rar', mime: 'application/vnd.rar' };
    if (mimeType.includes('7z') || mimeType.includes('x-7z')) return { ext: '7z', mime: 'application/x-7z-compressed' };
    if (mimeType.includes('tar')) return { ext: 'tar', mime: 'application/x-tar' };
    if (mimeType.includes('xz')) return { ext: 'xz', mime: 'application/x-xz' };
    if (mimeType.includes('bzip2') || mimeType.includes('bz2')) return { ext: 'bz2', mime: 'application/x-bzip2' };

    // ===== 数据格式 =====
    if (mimeType.includes('json')) return { ext: 'json', mime: 'application/json' };
    if (mimeType.includes('xml')) return { ext: 'xml', mime: 'application/xml' };
    if (mimeType.includes('yaml') || mimeType.includes('yml')) return { ext: 'yaml', mime: 'text/yaml' };
    if (mimeType.includes('toml')) return { ext: 'toml', mime: 'text/toml' };
    if (mimeType.includes('protobuf') || mimeType.includes('proto')) return { ext: 'proto', mime: 'application/protobuf' };
    if (mimeType.includes('graphql')) return { ext: 'graphql', mime: 'application/graphql' };
    if (mimeType.includes('msgpack')) return { ext: 'msgpack', mime: 'application/x-msgpack' };

    // ===== 网页/前端 =====
    if (mimeType.includes('html')) return { ext: 'html', mime: 'text/html' };
    if (mimeType.includes('css')) return { ext: 'css', mime: 'text/css' };
    if (mimeType.includes('javascript')) return { ext: 'js', mime: 'application/javascript' };
    if (mimeType.includes('typescript')) return { ext: 'ts', mime: 'application/typescript' };
    if (mimeType.includes('vue')) return { ext: 'vue', mime: 'text/x-vue' };
    if (mimeType.includes('jsx')) return { ext: 'jsx', mime: 'text/jsx' };
    if (mimeType.includes('tsx')) return { ext: 'tsx', mime: 'text/tsx' };
    if (mimeType.includes('markdown') || mimeType.includes('md')) return { ext: 'md', mime: 'text/markdown' };

    // ===== 证书/密钥 =====
    if (mimeType.includes('x-pem-file') || mimeType.includes('pem')) return { ext: 'pem', mime: 'application/x-pem-file' };
    if (mimeType.includes('pkcs12') || mimeType.includes('p12') || mimeType.includes('pfx')) return { ext: 'pfx', mime: 'application/x-pkcs12' };
    if (mimeType.includes('pkcs7') || mimeType.includes('p7b')) return { ext: 'p7b', mime: 'application/x-pkcs7-mime' };
    if (mimeType.includes('x-x509-ca-cert') || mimeType.includes('cer') || mimeType.includes('crt')) return { ext: 'crt', mime: 'application/x-x509-ca-cert' };

    // ===== 字体 =====
    if (mimeType.includes('font/woff2')) return { ext: 'woff2', mime: 'font/woff2' };
    if (mimeType.includes('font/woff')) return { ext: 'woff', mime: 'font/woff' };
    if (mimeType.includes('font/ttf') || mimeType.includes('truetype')) return { ext: 'ttf', mime: 'font/ttf' };
    if (mimeType.includes('font/otf') || mimeType.includes('opentype')) return { ext: 'otf', mime: 'font/otf' };
    if (mimeType.includes('font/eot')) return { ext: 'eot', mime: 'application/vnd.ms-fontobject' };

    // ===== 文本 =====
    if (mimeType.includes('text')) return { ext: 'txt', mime: 'text/plain' };

    // 默认
    return { ext: 'bin', mime: 'application/octet-stream' };
  };

  // 复制响应到剪切板
  const handleCopy = () => {
    const textToCopy = isBinaryContent() 
      ? '[Binary data - use Save Response to download]' 
      : base64ToString(currentResponse.body);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Base64 解码函数
  const base64ToUint8Array = (base64: string): Uint8Array => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // Base64 解码为字符串（用于显示）
  const base64ToString = (base64: string): string => {
    try {
      const bytes = base64ToUint8Array(base64);
      // 尝试 UTF-8 解码
      const decoder = new TextDecoder('utf-8', { fatal: false });
      return decoder.decode(bytes);
    } catch {
      return '[Binary data - use Save Response to download]';
    }
  };

  // 判断是否是二进制内容
  const isBinaryContent = (): boolean => {
    const contentType = (currentResponse.headers?.['Content-Type'] || '').toLowerCase();
    return contentType.includes('application/octet-stream') ||
           contentType.includes('application/pdf') ||
           contentType.includes('image/') ||
           contentType.includes('video/') ||
           contentType.includes('audio/') ||
           contentType.includes('application/vnd.') ||
           contentType.includes('application/msword') ||
           contentType.includes('application/excel') ||
           contentType.includes('application/powerpoint') ||
           contentType.includes('application/zip');
  };

  // 保存响应到文件
  const handleSave = () => {
    const { ext, mime } = getFileInfo();
    // 后端返回的是 base64 编码的数据，需要解码
    const bytes = base64ToUint8Array(currentResponse.body);
    const blob = new Blob([bytes], { type: mime });
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
              padding: '12px 16px',
              borderRadius: 6,
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
              <code>{isBinaryContent() ? '[Binary data - use Save Response to download]' : base64ToString(currentResponse.body)}</code>
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
