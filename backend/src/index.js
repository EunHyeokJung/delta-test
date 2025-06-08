import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { WebSocketHandler } from './websocket/wsHandler.js';

const app = express();
const server = createServer(app);

// CORS 설정
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json());

// WebSocket 핸들러 초기화
const wsHandler = new WebSocketHandler(server);

// REST API 라우트
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    connections: wsHandler.getServerMetrics().activeConnections
  });
});

app.get('/api/metrics', (req, res) => {
  res.json({
    status: 'success',
    data: wsHandler.getServerMetrics(),
    timestamp: new Date().toISOString()
  });
});

// 정적 파일 서빙 (필요시)
app.use('/static', express.static('public'));

// 404 핸들러
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'API 엔드포인트를 찾을 수 없습니다',
    path: req.originalUrl
  });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('서버 에러:', err);
  res.status(500).json({
    error: '내부 서버 오류가 발생했습니다',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다`);
  console.log(`📡 WebSocket 서버 준비 완료: ws://localhost:${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📊 메트릭 API: http://localhost:${PORT}/api/metrics`);
  console.log('');
  console.log('💡 지원하는 업데이트 모드:');
  console.log('  - full: 5초마다 전체 데이터 전송 (60-120KB)');
  console.log('  - delta: 2초마다 생체신호 Delta, 10초마다 기타 데이터 Delta');
  console.log('  - hybrid: 1초마다 생체신호, 15초마다 비중요 데이터, 30초마다 동기화');
});

// 우아한 종료 처리
const gracefulShutdown = (signal) => {
  console.log(`${signal} 신호를 받았습니다. 서버를 종료합니다...`);
  
  // WebSocket 정리
  wsHandler.shutdown();
  
  // HTTP 서버 정리
  server.close(() => {
    console.log('서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
  
  // 강제 종료 타임아웃 (10초)
  setTimeout(() => {
    console.log('강제 종료합니다.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT')); 