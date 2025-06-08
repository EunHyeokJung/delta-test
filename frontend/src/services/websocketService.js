// WebSocket 연결 및 데이터 관리 서비스
export class WebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.isPaused = false; // 일시정지 상태
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.currentMode = 'full';
    this.performanceMetrics = {
      dataReceived: 0,
      messagesReceived: 0,
      connectionTime: null,
      lastUpdateTime: null,
      updateFrequency: 0,
      averageMessageSize: 0,
      // 런타임 추적을 위한 필드
      runtimeStart: null,
      totalRuntime: 0,
      lastPauseTime: null
    };
    this.messageHistory = [];
  }

  connect(url = 'ws://localhost:8080') {
    return new Promise((resolve, reject) => {
      try {
        console.log('WebSocket 연결 시도:', url);
        this.ws = new WebSocket(url);
        this.performanceMetrics.connectionTime = Date.now();

        this.ws.onopen = () => {
          console.log('🟢 WebSocket 연결 성공');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // 기본적으로 일시정지 상태로 시작
          this.isPaused = true;
          
          // 런타임은 일시정지 상태이므로 시작하지 않음
          // this.performanceMetrics.runtimeStart = Date.now();
          
          console.log('🔇 연결 완료 - 기본 일시정지 상태. 모드 선택 후 시작 버튼을 눌러주세요.');
          this.emit('connected');
          this.emit('paused'); // 일시정지 상태임을 알림
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket 연결 해제:', event.code, event.reason);
          this.isConnected = false;
          this.emit('disconnected', { code: event.code, reason: event.reason });
          
          // 자동 재연결 시도
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect(url);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket 에러:', error);
          this.emit('error', error);
          reject(error);
        };

      } catch (error) {
        console.error('WebSocket 연결 실패:', error);
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
      this.isConnected = false;
    }
  }

  attemptReconnect(url) {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts} (${delay}ms 후)`);
    
    setTimeout(() => {
      this.connect(url).catch(() => {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('최대 재연결 시도 횟수 초과');
          this.emit('max_reconnect_reached');
        }
      });
    }, delay);
  }

  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      const messageSize = new Blob([event.data]).size;
      
      // 일시정지 상태면 메트릭만 업데이트하고 이벤트는 발생시키지 않음
      if (this.isPaused) {
        console.log(`🔴 [WS] 일시정지 중 - ${data.type} 메시지 무시 (isPaused: ${this.isPaused})`);
        return;
      }
      
      console.log(`🟢 [WS] 활성 상태 - ${data.type} 메시지 처리`);
      
      // 메타데이터 메시지들은 실제 환자 데이터가 아니므로 성능 메트릭에서 제외
      const isMetaMessage = ['performance_metrics', 'mode_changed'].includes(data.type);
      
      if (!isMetaMessage) {
        // 실제 환자 데이터 수신에 대한 성능 메트릭만 업데이트
        this.updateMetrics(messageSize);
      }
      
      // 메시지 히스토리는 모든 메시지 저장 (디버깅용)
      this.messageHistory.unshift({
        type: data.type,
        size: messageSize,
        timestamp: Date.now(),
        data: data,
        rawMessage: event.data, // raw JSON 문자열 저장
        prettyJson: JSON.stringify(data, null, 2), // 이쁘게 포맷된 JSON
        isMetaData: isMetaMessage // 메타데이터 여부 표시
      });
      if (this.messageHistory.length > 100) {
        this.messageHistory = this.messageHistory.slice(0, 100);
      }

      // 타입별 처리
      this.emit(data.type, data);
      this.emit('message', data);

      // 상세 로깅
      const metricLabel = isMetaMessage ? '[메타]' : '[데이터]';
      console.log(`${metricLabel} [WS] ${data.type} 수신 - 크기: ${(messageSize / 1024).toFixed(2)}KB`);

    } catch (error) {
      console.error('메시지 파싱 에러:', error);
    }
  }

  updateMetrics(messageSize) {
    this.performanceMetrics.dataReceived += messageSize;
    this.performanceMetrics.messagesReceived++;
    this.performanceMetrics.lastUpdateTime = Date.now();
    this.performanceMetrics.averageMessageSize = 
      this.performanceMetrics.dataReceived / this.performanceMetrics.messagesReceived;

    // 업데이트 빈도 계산 (최근 10개 실제 데이터 메시지만 기준)
    const recentDataMessages = this.messageHistory
      .filter(msg => !msg.isMetaData) // performance_metrics 제외
      .slice(0, 10);
    
    if (recentDataMessages.length >= 2) {
      const timeDiff = recentDataMessages[0].timestamp - recentDataMessages[recentDataMessages.length - 1].timestamp;
      this.performanceMetrics.updateFrequency = 
        (recentDataMessages.length - 1) / (timeDiff / 1000);
    }
  }

  // 업데이트 모드 변경
  setUpdateMode(mode) {
    if (!this.isConnected) {
      console.warn('❌ WebSocket이 연결되지 않았습니다');
      return;
    }

    console.log(`🔄 업데이트 모드 변경 요청: ${this.currentMode} → ${mode}`);
    this.currentMode = mode;
    this.send({
      type: 'set_update_mode',
      mode: mode
    });

    console.log(`✅ 업데이트 모드 변경 완료: ${mode}`);
  }

  // 전체 데이터 요청
  requestFullData() {
    this.send({
      type: 'request_full_data'
    });
  }

  // 성능 메트릭 요청
  requestPerformanceMetrics() {
    this.send({
      type: 'get_performance_metrics'
    });
  }

  // 메시지 전송
  send(message) {
    if (!this.isConnected || !this.ws) {
      console.warn('WebSocket이 연결되지 않았습니다');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      return false;
    }
  }

  // 이벤트 리스너 등록
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // 이벤트 리스너 제거
  off(event, callback) {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // 이벤트 발생
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`이벤트 리스너 에러 (${event}):`, error);
        }
      });
    }
  }

  // 현재 성능 메트릭 반환
  getPerformanceMetrics() {
    const connectionTime = this.performanceMetrics.connectionTime;
    const uptime = connectionTime ? Date.now() - connectionTime : 0;
    
    // 런타임 계산 (실제 데이터 수신 시간)
    let runtime = this.performanceMetrics.totalRuntime;
    if (!this.isPaused && this.performanceMetrics.runtimeStart) {
      // 현재 실행 중이면 현재까지의 시간 추가
      runtime += Date.now() - this.performanceMetrics.runtimeStart;
    }

    return {
      ...this.performanceMetrics,
      uptime, // 총 연결 시간 (일시정지와 상관없이)
      runtime, // 실제 데이터 수신 시간 (일시정지 시간 제외)
      currentMode: this.currentMode,
      isConnected: this.isConnected,
      isPaused: this.isPaused,
      reconnectAttempts: this.reconnectAttempts,
      messageHistory: this.getMessageHistory(10, true), // 최근 10개 실제 데이터 메시지만
      averageDataPerSecond: runtime > 0 ? this.performanceMetrics.dataReceived / (runtime / 1000) : 0, // 런타임 기준으로 계산
      averageDataPerSecondUptime: uptime > 0 ? this.performanceMetrics.dataReceived / (uptime / 1000) : 0 // 업타임 기준으로도 계산
    };
  }

  // 메시지 히스토리 반환
  getMessageHistory(limit = 50, dataOnly = false) {
    const messages = dataOnly 
      ? this.messageHistory.filter(msg => !msg.isMetaData) // 실제 데이터 메시지만
      : this.messageHistory; // 모든 메시지
    return messages.slice(0, limit);
  }

  // 연결 상태 확인
  isWebSocketConnected() {
    return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // 연결 일시정지
  pauseConnection() {
    if (this.isPaused) return; // 이미 일시정지 상태
    
    this.isPaused = true;
    
    // 현재까지의 런타임을 누적
    if (this.performanceMetrics.runtimeStart) {
      const currentRuntime = Date.now() - this.performanceMetrics.runtimeStart;
      this.performanceMetrics.totalRuntime += currentRuntime;
      this.performanceMetrics.lastPauseTime = Date.now();
    }
    
    console.log('🔇 WebSocket 연결 일시정지 - 메시지 처리 중단');
    this.emit('paused');
  }

  // 연결 재개
  resumeConnection() {
    if (!this.isPaused) {
      console.log('⚠️ 이미 활성 상태입니다');
      return; // 이미 활성 상태
    }
    
    console.log('🔊 WebSocket 연결 재개 중...');
    this.isPaused = false;
    
    // 런타임 재시작
    this.performanceMetrics.runtimeStart = Date.now();
    
    console.log('✅ WebSocket 연결 재개 완료 - 메시지 처리 시작');
    this.emit('resumed');
  }

  // 일시정지 상태 확인
  isPausedConnection() {
    return this.isPaused;
  }

  // 모든 데이터 초기화 및 initial_data 요청
  resetAllData() {
    console.log('🔄 WebSocket 서비스 데이터 초기화 시작...');
    
    // 성능 메트릭 초기화
    const connectionTime = this.performanceMetrics.connectionTime;
    this.performanceMetrics = {
      dataReceived: 0,
      messagesReceived: 0,
      connectionTime: connectionTime, // 연결 시간은 유지
      lastUpdateTime: null,
      updateFrequency: 0,
      averageMessageSize: 0,
      // 런타임 추적을 위한 필드 초기화
      runtimeStart: this.isPaused ? null : Date.now(), // 현재 상태에 따라 설정
      totalRuntime: 0,
      lastPauseTime: null
    };
    
    // 메시지 히스토리 초기화
    this.messageHistory = [];
    
    console.log('✅ WebSocket 서비스 데이터 초기화 완료');
    
    // 초기화 이벤트 발생
    this.emit('data_reset');
    
    // 서버에 초기 데이터 요청 (진짜 처음 연결하는 것처럼)
    if (this.isConnected && !this.isPaused) {
      console.log('📡 서버에 초기 데이터 요청 중...');
      this.requestInitialData();
    }
  }

  // 초기 데이터 요청
  requestInitialData() {
    this.send({
      type: 'request_initial_data'
    });
  }
}

// 전역 WebSocket 서비스 인스턴스
export const wsService = new WebSocketService(); 