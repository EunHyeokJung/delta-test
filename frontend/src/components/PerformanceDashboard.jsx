import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Activity, Database, Wifi, Clock, TrendingUp, MessageSquare, Zap, Code, Copy, ChevronDown, ChevronRight, Pause, Play } from 'lucide-react';
import { usePerformanceMetrics } from '../hooks/useWebSocket';
import { wsService } from '../services/websocketService';

const MetricCard = ({ icon: Icon, title, value, unit, subtitle, color = 'primary' }) => (
  <div className="card">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center space-x-2">
        <Icon className={`text-${color}-600`} size={20} />
        <span className="text-sm font-medium text-gray-700">{title}</span>
      </div>
    </div>
    <div className="performance-metric">
      <div className="performance-metric-value">
        {typeof value === 'number' ? 
          (value < 1000 ? value.toFixed(1) : (value / 1000).toFixed(1) + 'K') 
          : value
        }
        <span className="text-sm text-gray-500 ml-1">{unit}</span>
      </div>
      {subtitle && (
        <div className="performance-metric-label">{subtitle}</div>
      )}
    </div>
  </div>
);

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDuration = (ms) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

// Raw 메시지를 표시하는 컴포넌트
const RawMessageItem = ({ message }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // 디버깅용 로그
  console.log('📋 RawMessageItem received message:', message);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  return (
    <div className="border-l-4 border-blue-200 bg-gray-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span>{message.type}</span>
          </button>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
            {formatBytes(message.size)}
          </span>
          {message.data.cached && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
              캐시
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            {formatTimestamp(message.timestamp)}
          </span>
          <button
            onClick={() => copyToClipboard(message.prettyJson)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="JSON 복사"
          >
            <Copy size={14} />
          </button>
          {copied && (
            <span className="text-xs text-green-600">복사됨!</span>
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-3">
          <div className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono overflow-x-auto">
            <pre>{message.prettyJson}</pre>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Raw Size: {message.rawMessage.length} bytes
          </div>
        </div>
      )}


    </div>
  );
};

export function PerformanceDashboard({ currentMode, onModeChange }) {
  const { clientMetrics, serverMetrics, messageHistory } = usePerformanceMetrics();
  const isConnected = clientMetrics?.isConnected;
  const [selectedTab, setSelectedTab] = useState('overview');
  
  // Raw 메시지용으로 모든 메시지 히스토리 가져오기 (performance_metrics 포함)
  const [allMessageHistory, setAllMessageHistory] = useState([]);
  
  useEffect(() => {
    const updateRawMessages = () => {
      setAllMessageHistory(wsService.getMessageHistory(50, false)); // 모든 메시지
    };
    
    const interval = setInterval(updateRawMessages, 5000); // 5초마다 업데이트
    updateRawMessages(); // 초기 로드
    
    return () => clearInterval(interval);
  }, []);

  // 디버깅용 로그
  console.log('🔍 PerformanceDashboard - messageHistory:', messageHistory);

  // 모드별 색상 및 레이블
  const getModeInfo = (mode) => {
    switch (mode) {
      case 'full':
        return { label: '전체 데이터', color: 'bg-blue-100 text-blue-800', description: '5초마다 전체 JSON 전송' };
      case 'delta':
        return { label: 'Delta Update', color: 'bg-green-100 text-green-800', description: '변경된 데이터만 전송' };
      case 'hybrid':
        return { label: 'Hybrid', color: 'bg-yellow-100 text-yellow-800', description: 'heartRate, spo2는 항상, 나머지는 격번 전송' };
      default:
        return { label: mode, color: 'bg-gray-100 text-gray-800', description: '' };
    }
  };

  // 메시지 타입별 차트 데이터
  const messageTypeData = messageHistory?.reduce((acc, msg) => {
    const type = msg.type;
    const existing = acc.find(item => item.name === type);
    if (existing) {
      existing.count++;
      existing.totalSize += msg.size;
    } else {
      acc.push({ name: type, count: 1, totalSize: msg.size });
    }
    return acc;
  }, []) || [];

  const pieColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">실시간 성능 모니터링</h2>
            <p className="card-subtitle">WebSocket 통신 성능 및 데이터 전송 효율성 측정</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">현재 모드:</span>
            <span className={`status-indicator ${getModeInfo(currentMode).color}`}>
              {getModeInfo(currentMode).label}
            </span>
          </div>
        </div>

        {/* 연결 안내 메시지 */}
        {!isConnected && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Wifi className="text-yellow-600" size={20} />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">WebSocket 연결이 필요합니다</h3>
                <p className="text-sm text-yellow-600 mt-1">
                  상단의 "연결 시작" 버튼을 클릭하여 서버에 연결한 후 모드를 선택하세요.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 현재 모드 정보 */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">현재 사용 중인 모드</div>
            <div className="text-lg font-medium text-gray-900">{getModeInfo(currentMode).label}</div>
            <div className="text-sm text-gray-600">{getModeInfo(currentMode).description}</div>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'overview', label: '개요' },
          { id: 'network', label: '네트워크' },
          { id: 'messages', label: '메시지' },
          { id: 'performance', label: '성능 비교' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              selectedTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      {selectedTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
            icon={Wifi}
            title="연결 상태"
            value={clientMetrics?.isConnected ? (clientMetrics?.isPaused ? '일시정지' : '연결됨') : '연결 안됨'}
            unit=""
            subtitle={`업타임: ${clientMetrics?.uptime ? formatDuration(clientMetrics.uptime) : '0ms'} | 런타임: ${clientMetrics?.runtime ? formatDuration(clientMetrics.runtime) : '0ms'}`}
            color={clientMetrics?.isConnected ? (clientMetrics?.isPaused ? 'yellow' : 'green') : 'red'}
          />
          <MetricCard
            icon={Database}
            title="수신 데이터"
            value={clientMetrics?.dataReceived || 0}
            unit="bytes"
            subtitle={`평균: ${formatBytes(clientMetrics?.averageMessageSize || 0)}/msg`}
          />
          <MetricCard
            icon={MessageSquare}
            title="메시지 수"
            value={clientMetrics?.messagesReceived || 0}
            unit="개"
            subtitle={`빈도: ${(clientMetrics?.updateFrequency || 0).toFixed(1)}/s`}
          />
          <MetricCard
            icon={Zap}
            title="전송률"
            value={clientMetrics?.averageDataPerSecond || 0}
            unit="B/s"
            subtitle={`총량: ${formatBytes(clientMetrics?.dataReceived || 0)}`}
          />
        </div>
      )}

      {selectedTab === 'network' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 클라이언트 메트릭 */}
          <div className="card">
            <h3 className="card-title mb-4">클라이언트 메트릭</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">수신 데이터량</span>
                <span className="font-medium">{formatBytes(clientMetrics?.dataReceived || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">메시지 수</span>
                <span className="font-medium">{clientMetrics?.messagesReceived || 0}개</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">평균 메시지 크기</span>
                <span className="font-medium">{formatBytes(clientMetrics?.averageMessageSize || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">업데이트 빈도</span>
                <span className="font-medium">{(clientMetrics?.updateFrequency || 0).toFixed(2)}/초</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">업타임 (총 연결 시간)</span>
                <span className="font-medium">{clientMetrics?.uptime ? formatDuration(clientMetrics.uptime) : '0ms'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">런타임 (실제 수신 시간)</span>
                <span className="font-medium">{clientMetrics?.runtime ? formatDuration(clientMetrics.runtime) : '0ms'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">평균 전송률 (런타임 기준)</span>
                <span className="font-medium">{formatBytes(clientMetrics?.averageDataPerSecond || 0)}/초</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">평균 전송률 (업타임 기준)</span>
                <span className="font-medium">{formatBytes(clientMetrics?.averageDataPerSecondUptime || 0)}/초</span>
              </div>
            </div>
          </div>

          {/* 서버 메트릭 */}
          <div className="card">
            <h3 className="card-title mb-4">서버 메트릭</h3>
            {serverMetrics ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">활성 연결</span>
                  <span className="font-medium">{serverMetrics.server?.activeConnections || 0}개</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">총 연결 수</span>
                  <span className="font-medium">{serverMetrics.server?.totalConnections || 0}개</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">총 전송량</span>
                  <span className="font-medium">{formatBytes(serverMetrics.server?.totalDataSent || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">총 메시지 수</span>
                  <span className="font-medium">{serverMetrics.server?.totalMessagesSent || 0}개</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">서버 업타임</span>
                  <span className="font-medium">{formatDuration(serverMetrics.server?.uptime || 0)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                서버 메트릭 로딩 중...
              </div>
            )}
          </div>
        </div>
      )}

      {selectedTab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 메시지 타입별 분포 */}
          <div className="card">
            <h3 className="card-title mb-4">메시지 타입별 분포</h3>
            {messageTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={messageTypeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {messageTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, '개수']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-500 py-12">메시지 데이터 없음</div>
            )}
          </div>

          {/* 최근 메시지 로그 */}
          <div className="card">
            <h3 className="card-title mb-4">최근 메시지 (최대 10개)</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {messageHistory?.slice(0, 10).map((msg, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{msg.type}</span>
                    {msg.cached && (
                                             <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">캐시</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-gray-500">
                    <span>{formatBytes(msg.size)}</span>
                    <span>•</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
              {(!messageHistory || messageHistory.length === 0) && (
                <div className="text-center text-gray-500 py-4">메시지 없음</div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'performance' && (
        <div className="card">
          <h3 className="card-title mb-4">모드별 성능 비교</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className="text-center p-4 bg-blue-50 rounded-lg">
               <h4 className="font-medium text-blue-900 mb-2">Full Data Mode</h4>
               <div className="text-sm text-blue-700 space-y-1">
                <div>• 전송 주기: 5초</div>
                <div>• 데이터 크기: ~60-120KB</div>
                <div>• 장점: 구현 단순, 일관성 보장</div>
                <div>• 단점: 대역폭 과다 사용</div>
              </div>
            </div>
                         <div className="text-center p-4 bg-green-50 rounded-lg">
               <h4 className="font-medium text-green-900 mb-2">Delta Mode</h4>
               <div className="text-sm text-green-700 space-y-1">
                <div>• 전송 주기: 2초 (생체신호)</div>
                <div>• 데이터 크기: ~1-5KB</div>
                <div>• 장점: 효율적 대역폭 사용</div>
                <div>• 단점: 동기화 복잡성</div>
              </div>
            </div>
                         <div className="text-center p-4 bg-yellow-50 rounded-lg">
               <h4 className="font-medium text-yellow-900 mb-2">Hybrid Mode</h4>
               <div className="text-sm text-yellow-700 space-y-1">
                <div>• 전송 주기: 1초 (중요)</div>
                <div>• 데이터 크기: 가변적</div>
                <div>• 장점: 우선순위 기반 최적화</div>
                <div>• 단점: 구현 복잡도 증가</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Raw 메시지 섹션 - 별도 섹션으로 항상 표시 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Code size={20} className="text-blue-600" />
            <h3 className="card-title">실시간 Raw 메시지</h3>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              총 {allMessageHistory?.length || 0}개 메시지 (전체) | {messageHistory?.length || 0}개 데이터 메시지
            </span>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-secondary btn-sm"
            >
              새로고침
            </button>
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg mb-4">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-200 rounded"></div>
              <span>메시지 타입별로 그룹화</span>
            </div>
            <div className="flex items-center space-x-1">
              <Copy size={14} />
              <span>클릭하여 JSON 복사</span>
            </div>
            <div className="flex items-center space-x-1">
              <ChevronRight size={14} />
              <span>클릭하여 상세 내용 보기</span>
            </div>
          </div>
        </div>

                  <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
          {allMessageHistory && allMessageHistory.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {allMessageHistory.slice(0, 30).map((msg, index) => {
                console.log(`🔄 Rendering message ${index}:`, msg);
                return (
                  <RawMessageItem 
                    key={`msg-${index}`} 
                    message={msg}
                    index={index}
                  />
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Code size={48} className="mx-auto mb-4 text-gray-300" />
              <h4 className="text-lg font-medium mb-2">메시지가 없습니다</h4>
              <p className="text-sm">
                WebSocket이 연결되면 실시간 메시지가 여기에 표시됩니다.
                <br />
                <span className="text-xs mt-2 block">
                  디버깅: allMessageHistory = {allMessageHistory ? `배열(길이: ${allMessageHistory.length})` : 'null/undefined'}
                </span>
              </p>
            </div>
          )}
        </div>

        {allMessageHistory && allMessageHistory.length > 30 && (
          <div className="mt-4 text-center">
            <span className="text-sm text-gray-500">
              최신 30개 메시지만 표시됩니다. 전체 {allMessageHistory.length}개 중 표시됨.
            </span>
          </div>
        )}
      </div>
    </div>
  );
} 