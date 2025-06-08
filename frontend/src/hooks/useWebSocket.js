import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';
import { wsService } from '../services/websocketService.js';

// WebSocket 연결 및 데이터 관리를 위한 커스텀 훅
export function useWebSocket(url = 'ws://localhost:8080') {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [currentMode, setCurrentMode] = useState('full');
  const [isPaused, setIsPaused] = useState(true); // 초기 상태는 연결 전
  
  // 수동 연결 시작
  const startConnection = useCallback(async () => {
    try {
      setConnectionError(null);
      await wsService.connect(url);
      setIsConnected(true);
      
      // 연결 후 자동으로 재개
      wsService.resumeConnection();
      setIsPaused(false);
      
      console.log('🎯 연결 및 재개 완료');
    } catch (error) {
      setConnectionError(error);
      setIsConnected(false);
    }
  }, [url]);

  // WebSocket 이벤트 리스너만 등록 (자동 연결하지 않음)
  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      setConnectionError(null);
      console.log('WebSocket 연결됨');
    };

    const handleDisconnected = (data) => {
      setIsConnected(false);
      console.log('WebSocket 연결 해제됨:', data);
    };

    const handleError = (error) => {
      setConnectionError(error);
      console.error('WebSocket 에러:', error);
    };

    const handleMaxReconnectReached = () => {
      setConnectionError(new Error('최대 재연결 시도 횟수 초과'));
    };

    const handlePaused = () => {
      console.log('🔴 일시정지 이벤트 수신');
      setIsPaused(true);
    };

    const handleResumed = () => {
      console.log('🟢 재개 이벤트 수신');
      setIsPaused(false);
    };

    wsService.on('connected', handleConnected);
    wsService.on('disconnected', handleDisconnected);
    wsService.on('error', handleError);
    wsService.on('max_reconnect_reached', handleMaxReconnectReached);
    wsService.on('paused', handlePaused);
    wsService.on('resumed', handleResumed);

    return () => {
      wsService.off('connected', handleConnected);
      wsService.off('disconnected', handleDisconnected);
      wsService.off('error', handleError);
      wsService.off('max_reconnect_reached', handleMaxReconnectReached);
      wsService.off('paused', handlePaused);
      wsService.off('resumed', handleResumed);
      wsService.disconnect();
    };
  }, [url]);

  // 수동 재연결
  const reconnect = useCallback(async () => {
    try {
      setConnectionError(null);
      await wsService.connect(url);
    } catch (error) {
      setConnectionError(error);
    }
  }, [url]);

  // 업데이트 모드 변경
  const changeUpdateMode = useCallback((mode) => {
    setCurrentMode(mode);
    wsService.setUpdateMode(mode);
  }, []);

  // 연결 일시정지/재개
  const pauseConnection = useCallback(() => {
    wsService.pauseConnection();
  }, []);

  const resumeConnection = useCallback(() => {
    wsService.resumeConnection();
  }, []);

  // 모든 데이터 초기화
  const resetAllData = useCallback(async () => {
    console.log('🔄 전체 데이터 초기화 시작...');
    wsService.resetAllData();
    
    // 연결 상태에 따른 처리
    if (!wsService.isWebSocketConnected()) {
      // 연결되지 않은 상태: 자동으로 연결 시도 후 초기 데이터 요청
      console.log('🔌 연결되지 않은 상태 - 자동 연결 시도 중...');
      try {
        await startConnection();
        console.log('✅ 자동 연결 완료 - 초기 데이터 수신됨');
      } catch (error) {
        console.error('❌ 자동 연결 실패:', error);
      }
    } else if (wsService.isPausedConnection()) {
      // 연결되어 있지만 일시정지 상태: 재개하여 초기 데이터 요청
      setTimeout(() => {
        console.log('▶️ 일시정지 상태 - 재개하여 초기 데이터 요청');
        wsService.resumeConnection();
      }, 100);
    } else {
      // 이미 활성 상태: 바로 초기 데이터 요청
      setTimeout(() => {
        console.log('🔄 활성 상태 - 초기 데이터 재요청');
        wsService.requestInitialData();
      }, 100);
    }
  }, [startConnection]);

  return {
    isConnected,
    connectionError,
    currentMode,
    isPaused,
    startConnection,
    reconnect,
    changeUpdateMode,
    pauseConnection,
    resumeConnection,
    resetAllData,
    wsService
  };
}

// 환자 데이터를 관리하는 훅
export function usePatientData() {
  const queryClient = useQueryClient();
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  // 초기 데이터 및 전체 데이터 업데이트 처리
  useEffect(() => {
    const handleInitialData = (data) => {
      console.log('📥 초기 데이터 수신:', data);
      queryClient.setQueryData(['patients'], data.data);
      setLastUpdateTime(new Date().toISOString());
      console.log('✅ 초기 환자 데이터 로드 완료');
    };

    const handleFullDataUpdate = (data) => {
      console.log('📦 전체 데이터 업데이트 수신');
      queryClient.setQueryData(['patients'], data.data);
      setLastUpdateTime(new Date().toISOString());
      console.log('✅ 전체 데이터 업데이트 적용 완료');
    };

    const handleDeltaUpdate = (data) => {
      console.log('🔄 Delta 업데이트 수신:', data.updateType, data.changes);
      const currentData = queryClient.getQueryData(['patients']);
      if (currentData) {
        const updatedData = applyDeltaUpdates(currentData, data.changes);
        queryClient.setQueryData(['patients'], updatedData);
        setLastUpdateTime(new Date().toISOString());
        console.log('✅ Delta 업데이트 적용 완료');
      }
    };

    const handleHybridUpdate = (data) => {
      console.log('🔀 Hybrid 업데이트 수신:', data.updateType, data.changes);
      const currentData = queryClient.getQueryData(['patients']);
      if (currentData) {
        const updatedData = applyDeltaUpdates(currentData, data.changes);
        queryClient.setQueryData(['patients'], updatedData);
        setLastUpdateTime(new Date().toISOString());
        console.log('✅ Hybrid 업데이트 적용 완료');
      }
    };

    wsService.on('initial_data', handleInitialData);
    wsService.on('full_data_update', handleFullDataUpdate);
    wsService.on('delta_update', handleDeltaUpdate);
    wsService.on('hybrid_update', handleHybridUpdate);

    return () => {
      wsService.off('initial_data', handleInitialData);
      wsService.off('full_data_update', handleFullDataUpdate);
      wsService.off('delta_update', handleDeltaUpdate);
      wsService.off('hybrid_update', handleHybridUpdate);
    };
  }, [queryClient]);

  // React Query로 환자 데이터 관리
  const patientsQuery = useQuery({
    queryKey: ['patients'],
    queryFn: () => {
      // WebSocket에서 데이터를 받아오므로 실제 fetch는 하지 않음
      const data = queryClient.getQueryData(['patients']);
      return data || null;
    },
    enabled: false, // WebSocket을 통해서만 데이터 업데이트
    staleTime: Infinity, // WebSocket으로 실시간 업데이트되므로 stale하지 않음
  });

  // 데이터 초기화 처리
  useEffect(() => {
    const handleDataReset = () => {
      console.log('🔄 환자 데이터 초기화 중...');
      queryClient.removeQueries(['patients']);
      setLastUpdateTime(null);
      console.log('✅ 환자 데이터 초기화 완료');
    };

    wsService.on('data_reset', handleDataReset);

    return () => {
      wsService.off('data_reset', handleDataReset);
    };
  }, [queryClient]);

  return {
    data: patientsQuery.data,
    isLoading: patientsQuery.isLoading,
    error: patientsQuery.error,
    lastUpdateTime,
    refetch: () => wsService.requestFullData(),
    resetData: () => {
      queryClient.removeQueries(['patients']);
      setLastUpdateTime(null);
      wsService.resetAllData();
    }
  };
}

// 성능 메트릭을 관리하는 훅
export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [clientMetrics, setClientMetrics] = useState(null);

  useEffect(() => {
    const updateClientMetrics = () => {
      setClientMetrics(wsService.getPerformanceMetrics());
    };

    const handlePerformanceMetrics = (data) => {
      setMetrics(data.data);
    };

    // 5초마다 클라이언트 메트릭 업데이트
    const interval = setInterval(updateClientMetrics, 5000);
    
    // 서버 메트릭 요청 (30초마다)
    const serverMetricsInterval = setInterval(() => {
      wsService.requestPerformanceMetrics();
    }, 30000);

    // 초기 메트릭 로드
    updateClientMetrics();
    wsService.requestPerformanceMetrics();

    wsService.on('performance_metrics', handlePerformanceMetrics);

    return () => {
      clearInterval(interval);
      clearInterval(serverMetricsInterval);
      wsService.off('performance_metrics', handlePerformanceMetrics);
    };
  }, []);

  return {
    clientMetrics,
    serverMetrics: metrics,
    messageHistory: wsService.getMessageHistory(20, true) // 실제 데이터 메시지만 (performance_metrics 제외)
  };
}

// Delta 업데이트를 기존 데이터에 적용하는 헬퍼 함수
function applyDeltaUpdates(currentData, changes) {
  const updatedData = JSON.parse(JSON.stringify(currentData)); // Deep clone

  Object.keys(changes).forEach(entityType => {
    if (updatedData[entityType]) {
      Object.keys(changes[entityType]).forEach(entityId => {
        if (updatedData[entityType][entityId]) {
          Object.keys(changes[entityType][entityId]).forEach(path => {
            const value = changes[entityType][entityId][path];
            setNestedValue(updatedData[entityType][entityId], path, value);
          });
        }
      });
    }
  });

  // 타임스탬프 업데이트
  updatedData.timestamp = new Date().toISOString();

  return updatedData;
}

// 중첩된 객체 경로에 값을 설정하는 헬퍼 함수
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

// 메시지 로깅을 위한 훅
export function useMessageLogger() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const handleMessage = (data) => {
      const logEntry = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        type: data.type,
        size: JSON.stringify(data).length,
        updateType: data.updateType || null,
        cached: data.cached || false
      };

      setLogs(prev => [logEntry, ...prev.slice(0, 99)]); // 최대 100개 로그
    };

    const handleDataReset = () => {
      console.log('🔄 메시지 로그 초기화 중...');
      setLogs([]);
      console.log('✅ 메시지 로그 초기화 완료');
    };

    wsService.on('message', handleMessage);
    wsService.on('data_reset', handleDataReset);

    return () => {
      wsService.off('message', handleMessage);
      wsService.off('data_reset', handleDataReset);
    };
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    logs,
    clearLogs
  };
} 