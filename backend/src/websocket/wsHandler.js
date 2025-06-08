import { WebSocketServer } from 'ws';
import { PatientSimulator } from '../data/patientSimulator.js';

export class WebSocketHandler {
  constructor(server) {
    this.wss = new WebSocketServer({ server });
    this.simulator = new PatientSimulator();
    this.clients = new Map(); // 클라이언트별 설정 저장
    this.intervals = new Map(); // 클라이언트별 타이머 저장
    this.performanceMetrics = {
      connections: 0,
      totalDataSent: 0,
      messagesSent: 0,
      startTime: Date.now()
    };

    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, request) => {
      const clientId = this.generateClientId();
      console.log(`새 클라이언트 연결: ${clientId}`);
      
      // 클라이언트 초기 설정
      this.clients.set(clientId, {
        ws,
        updateMode: 'full', // 'full', 'delta', 'hybrid'
        isActive: true,
        hybridCycle: 0, // hybrid 모드용 사이클 (0: 전체, 1: 중요만)
        metrics: {
          dataSent: 0,
          messagesSent: 0,
          connectionTime: Date.now()
        }
      });

      this.performanceMetrics.connections++;

      // 초기 전체 데이터 전송
      this.sendMessage(clientId, {
        type: 'initial_data',
        data: this.simulator.getFullData(),
        timestamp: new Date().toISOString()
      });

      // 기본 모드로 업데이트 시작
      this.startUpdates(clientId);

      // 메시지 핸들러
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(clientId, data);
        } catch (error) {
          console.error('메시지 파싱 오류:', error);
        }
      });

      // 연결 해제 핸들러
      ws.on('close', () => {
        console.log(`클라이언트 연결 해제: ${clientId}`);
        this.cleanup(clientId);
      });

      // 에러 핸들러
      ws.on('error', (error) => {
        console.error(`WebSocket 에러 (${clientId}):`, error);
        this.cleanup(clientId);
      });
    });
  }

  handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'set_update_mode':
        this.setUpdateMode(clientId, message.mode);
        break;
      
      case 'request_full_data':
        this.sendMessage(clientId, {
          type: 'full_data',
          data: this.simulator.getRealTimeData(),
          timestamp: new Date().toISOString()
        });
        break;

      case 'request_initial_data':
        console.log(`클라이언트 ${clientId}에서 초기 데이터 요청`);
        // 시뮬레이터 데이터를 새로 생성하고 초기 데이터로 전송
        this.simulator.regenerateAllData();
        this.sendMessage(clientId, {
          type: 'initial_data',
          data: this.simulator.getFullData(),
          timestamp: new Date().toISOString()
        });
        break;

      case 'get_performance_metrics':
        this.sendPerformanceMetrics(clientId);
        break;

      default:
        console.log(`알 수 없는 메시지 타입: ${message.type}`);
    }
  }

  setUpdateMode(clientId, mode) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // 기존 타이머 정리
    this.stopUpdates(clientId);
    
    client.updateMode = mode;
    console.log(`클라이언트 ${clientId} 업데이트 모드 변경: ${mode}`);

    // 새로운 모드에 따른 업데이트 시작
    this.startUpdates(clientId);

    // 모드 변경 확인 메시지
    this.sendMessage(clientId, {
      type: 'mode_changed',
      mode: mode,
      timestamp: new Date().toISOString()
    });
  }

  startUpdates(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const intervals = [];

    switch (client.updateMode) {
      case 'full':
        // 5초마다 실시간 데이터 전송 (정적 데이터 제외)
        intervals.push(setInterval(() => {
          this.sendMessage(clientId, {
            type: 'full_data_update',
            data: this.simulator.getRealTimeData(),
            timestamp: new Date().toISOString()
          });
        }, 5000));
        break;

      case 'delta':
        // 5초마다 모든 데이터의 Delta 업데이트
        intervals.push(setInterval(() => {
          const vitalChanges = this.simulator.updateVitals();
          const nonCriticalChanges = this.simulator.updateNonCriticalData();
          
          const allChanges = [...vitalChanges, ...nonCriticalChanges];
          
          if (allChanges.length > 0) {
            this.sendMessage(clientId, {
              type: 'delta_update',
              updateType: 'all',
              changes: this.simulator.changesToKeyValue(allChanges),
              timestamp: new Date().toISOString()
            });
          }
        }, 5000));
        break;

      case 'hybrid':
        // 하이브리드 업데이트: heartRate, spo2는 항상, 나머지는 격번으로 전송
        intervals.push(setInterval(() => {
          const vitalChanges = this.simulator.updateVitals();
          const nonCriticalChanges = this.simulator.updateNonCriticalData();
          
          let hybridChanges;
          let updateType;
          
          if (client.hybridCycle === 0) {
            // 전체 주기: 모든 변경사항 전송
            hybridChanges = [...vitalChanges, ...nonCriticalChanges];
            updateType = 'full_cycle';
            console.log(`[${clientId}] Hybrid 전체 주기 - 모든 데이터 전송`);
          } else {
            // 중요 주기: heartRate, spo2만 전송 (생체신호 무결성 보장)
            const criticalVitalChanges = vitalChanges.filter(change => {
              const isHeartRate = change.path === 'vitals.heartRate';
              const isSpo2 = change.path === 'vitals.spo2';
              return isHeartRate || isSpo2;
            });
            
            hybridChanges = criticalVitalChanges;
            updateType = 'critical_only';
            console.log(`[${clientId}] Hybrid 중요 주기 - heartRate, spo2만 전송`);
          }
          
          // 다음 주기로 전환 (0 ↔ 1)
          client.hybridCycle = (client.hybridCycle + 1) % 2;
          
          if (hybridChanges.length > 0) {
            this.sendMessage(clientId, {
              type: 'hybrid_update',
              updateType: updateType,
              changes: this.simulator.changesToKeyValue(hybridChanges),
              timestamp: new Date().toISOString(),
              cycle: client.hybridCycle === 0 ? 'next_full' : 'next_critical', // 다음 주기 예고
              dataReduction: updateType === 'critical_only' ? true : false
            });
          }
        }, 5000));
        break;
    }

    this.intervals.set(clientId, intervals);
  }

  stopUpdates(clientId) {
    const intervals = this.intervals.get(clientId);
    if (intervals) {
      intervals.forEach(interval => clearInterval(interval));
      this.intervals.delete(clientId);
    }
  }

  sendMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client || !client.isActive) return;

    try {
      const message = JSON.stringify(data);
      const messageSize = Buffer.byteLength(message, 'utf8');
      
      client.ws.send(message);
      
      // 메타데이터 메시지들은 실제 환자 데이터가 아니므로 성능 메트릭에서 제외
      const isMetaMessage = ['performance_metrics', 'mode_changed'].includes(data.type);
      
      if (!isMetaMessage) {
        // 실제 환자 데이터 전송에 대한 성능 메트릭만 업데이트
        client.metrics.dataSent += messageSize;
        client.metrics.messagesSent++;
        this.performanceMetrics.totalDataSent += messageSize;
        this.performanceMetrics.messagesSent++;
      }

      // 상세 로깅
      const metricLabel = isMetaMessage ? '[메타]' : '[데이터]';
      console.log(`${metricLabel} [${clientId}] ${data.type} 전송 - 크기: ${(messageSize / 1024).toFixed(2)}KB`);
      
    } catch (error) {
      console.error(`메시지 전송 오류 (${clientId}):`, error);
      this.cleanup(clientId);
    }
  }

  sendPerformanceMetrics(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const uptime = Date.now() - this.performanceMetrics.startTime;
    const clientUptime = Date.now() - client.metrics.connectionTime;

    this.sendMessage(clientId, {
      type: 'performance_metrics',
      data: {
        server: {
          totalConnections: this.performanceMetrics.connections,
          activeConnections: this.clients.size,
          totalDataSent: this.performanceMetrics.totalDataSent,
          totalMessagesSent: this.performanceMetrics.messagesSent,
          uptime: uptime,
          averageDataPerSecond: this.performanceMetrics.totalDataSent / (uptime / 1000)
        },
        client: {
          dataSent: client.metrics.dataSent,
          messagesSent: client.metrics.messagesSent,
          connectionTime: clientUptime,
          averageDataPerSecond: client.metrics.dataSent / (clientUptime / 1000),
          currentMode: client.updateMode
        }
      },
      timestamp: new Date().toISOString()
    });
  }

  cleanup(clientId) {
    this.stopUpdates(clientId);
    const client = this.clients.get(clientId);
    if (client) {
      client.isActive = false;
      this.clients.delete(clientId);
    }
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  // 서버 성능 메트릭 가져오기
  getServerMetrics() {
    return {
      ...this.performanceMetrics,
      activeConnections: this.clients.size,
      uptime: Date.now() - this.performanceMetrics.startTime
    };
  }

  // 서버 종료 시 모든 리소스 정리
  shutdown() {
    console.log('WebSocket 서버 정리 중...');
    
    // 모든 클라이언트의 타이머 정리
    for (const clientId of this.clients.keys()) {
      this.stopUpdates(clientId);
    }
    
    // 모든 WebSocket 연결 정리
    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState === client.ws.OPEN) {
        client.ws.close(1000, 'Server shutdown');
      }
    });
    
    // WebSocket 서버 정리
    this.wss.close(() => {
      console.log('WebSocket 서버가 정리되었습니다.');
    });
    
    // 클라이언트 맵 정리
    this.clients.clear();
    this.intervals.clear();
  }
} 