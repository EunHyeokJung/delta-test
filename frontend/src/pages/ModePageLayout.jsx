import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Wifi, WifiOff, RefreshCw, Pause, Play, Home, ArrowLeft, RotateCcw } from 'lucide-react';
import { useWebSocket, usePatientData, useMessageLogger } from '../hooks/useWebSocket';
import { PatientCard } from '../components/PatientCard';
import { PerformanceDashboard } from '../components/PerformanceDashboard';

export function ModePageLayout({ mode, modeInfo }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('patients');
  const { isConnected, connectionError, currentMode, isPaused, startConnection, reconnect, changeUpdateMode, pauseConnection, resumeConnection, resetAllData } = useWebSocket();
  const { data: patientData, lastUpdateTime, resetData } = usePatientData();
  
  // 디버깅: 상태 감지
  console.log(`📊 [${mode}] 연결: ${isConnected ? '✅' : '❌'}, 일시정지: ${isPaused ? '🔴' : '🟢'}, 데이터: ${patientData ? '✅' : '❌'}, 모드: ${currentMode}`);
  const { logs, clearLogs } = useMessageLogger();

  // 페이지 진입 시 해당 모드로 연결 및 설정
  const handleStartConnection = async () => {
    console.log(`🚀 [${mode}] 연결 시작 시도...`);
    try {
      await startConnection();
      console.log(`✅ [${mode}] WebSocket 연결 성공`);
      
      if (currentMode !== mode) {
        console.log(`🔄 [${mode}] 모드 변경: ${currentMode} → ${mode}`);
        changeUpdateMode(mode);
      } else {
        console.log(`✅ [${mode}] 모드 이미 설정됨`);
      }
    } catch (error) {
      console.error(`❌ [${mode}] 연결 실패:`, error);
    }
  };

  // 모든 데이터 초기화
  const handleReset = () => {
    const confirmMessage = isConnected 
      ? '모든 데이터를 초기화하시겠습니까?\n\n• 환자 데이터\n• 성능 메트릭\n• 메시지 히스토리\n\n새로운 초기 데이터를 받아옵니다.'
      : '모든 데이터를 초기화하시겠습니까?\n\n• 환자 데이터\n• 성능 메트릭\n• 메시지 히스토리\n\n연결되지 않은 상태에서 자동으로 연결하여 초기 데이터를 받아옵니다.';
    
    if (window.confirm(confirmMessage)) {
      console.log(`🔄 [${mode}] 전체 데이터 초기화 시작... (연결 상태: ${isConnected ? '연결됨' : '연결 안됨'})`);
      resetData();
      console.log(`✅ [${mode}] 전체 데이터 초기화 완료`);
    }
  };

  // 환자별 그리드 표시
  const renderPatients = () => {
    if (!patientData || !patientData.patients) {
      return (
        <div className="text-center py-12">
          <Stethoscope size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">환자 데이터를 로딩 중입니다...</p>
        </div>
      );
    }

    const patients = Object.entries(patientData.patients);
    
    return (
      <div className="space-y-6">
        {/* 병동 정보 헤더 */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">{patientData.ward} - 환자 모니터링</h2>
              <p className="card-subtitle">
                총 {patientData.metrics?.totalPatients || 0}명 환자 • 
                위험 {patientData.metrics?.criticalPatients || 0}명 • 
                활성 장비 {patientData.metrics?.activeEquipment || 0}개
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">마지막 업데이트</div>
              <div className="text-sm font-medium">
                {lastUpdateTime ? new Date(lastUpdateTime).toLocaleTimeString('ko-KR') : '-'}
              </div>
            </div>
          </div>
          
          {/* 빠른 통계 - 컴팩트 */}
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="text-lg font-bold text-green-700">
                {patients.filter(([_, p]) => p.status === 'stable').length}
              </div>
              <div className="text-xs text-green-600">안정</div>
            </div>
            <div className="text-center p-2 bg-red-50 rounded">
              <div className="text-lg font-bold text-red-700">
                {patients.filter(([_, p]) => p.status === 'critical').length}
              </div>
              <div className="text-xs text-red-600">위험</div>
            </div>
            <div className="text-center p-2 bg-yellow-50 rounded">
              <div className="text-lg font-bold text-yellow-700">
                {patients.filter(([_, p]) => p.status === 'recovering').length}
              </div>
              <div className="text-xs text-yellow-600">회복중</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="text-lg font-bold text-blue-700">
                {patients.filter(([_, p]) => p.status === 'observation').length}
              </div>
              <div className="text-xs text-blue-600">관찰</div>
            </div>
          </div>
        </div>

        {/* 환자 카드 그리드 - 매우 컴팩트하게 */}
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-12 2xl:grid-cols-12 gap-1">
          {patients.map(([patientId, patient]) => (
            <PatientCard
              key={patientId}
              patient={patient}
              patientId={patientId}
              equipment={patientData.equipment}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 로고 및 제목 */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={20} />
                <span className="text-sm">홈으로</span>
              </button>
              
              <div className="flex items-center space-x-3">
                <modeInfo.icon className={`text-${modeInfo.color}-600`} size={28} />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{modeInfo.title}</h1>
                  <p className="text-sm text-gray-500">{modeInfo.description}</p>
                </div>
              </div>
            </div>

            {/* 연결 상태 및 컨트롤 */}
            <div className="flex items-center space-x-4">
              {/* 연결 상태 */}
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <>
                    <Wifi className="text-green-600" size={20} />
                    <span className="text-sm text-green-600 font-medium">
                      {isPaused ? '일시정지' : '연결됨'}
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff className="text-red-600" size={20} />
                    <span className="text-sm text-red-600 font-medium">연결 끊김</span>
                  </>
                )}
              </div>

              {/* 연결 시작/재개/일시정지 버튼 */}
              {!isConnected ? (
                <button
                  onClick={handleStartConnection}
                  className={`btn btn-${modeInfo.color} btn-sm`}
                >
                  <Play size={16} className="mr-1" />
                  {modeInfo.title} 시작
                </button>
              ) : (
                <button
                  onClick={isPaused ? resumeConnection : pauseConnection}
                  className={`btn btn-sm ${isPaused ? 'btn-success' : 'btn-warning'}`}
                >
                  {isPaused ? (
                    <>
                      <Play size={16} className="mr-1" />
                      재개
                    </>
                  ) : (
                    <>
                      <Pause size={16} className="mr-1" />
                      일시정지
                    </>
                  )}
                </button>
              )}

              {/* 재연결 버튼 */}
              {connectionError && (
                <button
                  onClick={reconnect}
                  className="btn btn-primary btn-sm"
                >
                  <RefreshCw size={16} className="mr-1" />
                  재연결
                </button>
              )}

              {/* 데이터 초기화 */}
              <button
                onClick={handleReset}
                className="btn btn-secondary btn-sm"
                title={!isConnected ? "연결되지 않은 상태에서도 초기화 가능합니다" : "모든 데이터를 초기화합니다"}
              >
                <RotateCcw size={16} className="mr-1" />
                초기화
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'patients', label: '환자 모니터링', icon: Stethoscope },
              { id: 'performance', label: '성능 대시보드', icon: modeInfo.icon }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === id
                    ? `border-${modeInfo.color}-500 text-${modeInfo.color}-600`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={20} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {connectionError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <WifiOff className="text-red-600" size={20} />
              <div>
                <h3 className="text-sm font-medium text-red-800">연결 오류</h3>
                <p className="text-sm text-red-600 mt-1">
                  WebSocket 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 연결되지 않은 상태 안내 */}
        {!isConnected && !connectionError && (
          <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-center">
              <modeInfo.icon className={`text-${modeInfo.color}-600 mx-auto mb-4`} size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{modeInfo.title} 준비</h3>
              <p className="text-gray-600 mb-4">
                {modeInfo.description}
              </p>
              <button
                onClick={handleStartConnection}
                className={`btn btn-${modeInfo.color} btn-lg`}
              >
                <Play size={20} className="mr-2" />
                {modeInfo.title} 시작하기
              </button>
            </div>
          </div>
        )}

        {/* 탭 컨텐츠 */}
        {activeTab === 'patients' && renderPatients()}
        {activeTab === 'performance' && (
          <PerformanceDashboard 
            currentMode={currentMode}
            onModeChange={(newMode) => {
              if (newMode !== mode) {
                navigate(`/${newMode}`);
              }
            }}
          />
        )}
      </main>
    </div>
  );
} 