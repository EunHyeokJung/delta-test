import { useNavigate } from 'react-router-dom';
import { Stethoscope, Database, Zap, Activity, ArrowRight, Clock, TrendingUp, Layers } from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();

  const modes = [
    {
      id: 'full',
      title: '전체 데이터 모드',
      description: '5초마다 모든 환자의 전체 데이터를 JSON으로 전송',
      icon: Database,
      color: 'blue',
      features: [
        '완전한 데이터 일관성',
        '간단한 구현',
        '높은 대역폭 사용'
      ],
      dataSize: '약 42KB/전송',
      interval: '5초마다'
    },
    {
      id: 'delta',
      title: 'Delta Update 모드',
      description: '변경된 데이터만 Key-Value 형태로 효율적 전송',
      icon: TrendingUp,
      color: 'green',
      features: [
        '네트워크 효율성',
        '빠른 업데이트',
        '작은 데이터 크기'
      ],
      dataSize: '600-800 byte/전송',
      interval: '5초마다'
    },
    {
      id: 'hybrid',
      title: 'Hybrid 모드',
      description: '우선순위별 차등 업데이트로 최적화된 성능',
      icon: Layers,
      color: 'yellow',
      features: [
        '스마트 최적화',
        '우선순위 기반',
        '적응형 전송'
      ],
      dataSize: '300-900 byte/전송',
      interval: '5초마다'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        hover: 'hover:border-blue-300 hover:bg-blue-100',
        icon: 'text-blue-600',
        button: 'bg-blue-600 hover:bg-blue-700'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        hover: 'hover:border-green-300 hover:bg-green-100',
        icon: 'text-green-600',
        button: 'bg-green-600 hover:bg-green-700'
      },
      yellow: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        hover: 'hover:border-yellow-300 hover:bg-yellow-100',
        icon: 'text-yellow-600',
        button: 'bg-yellow-600 hover:bg-yellow-700'
      }
    };
    return colors[color];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-20">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-3 mb-2">
                <Stethoscope className="text-primary-600" size={32} />
                <h1 className="text-2xl font-bold text-gray-900">Delta Test</h1>
              </div>
              <p className="text-sm text-gray-500">병원 환자 모니터링 시스템 성능 측정</p>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 소개 섹션 */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            WebSocket 업데이트 모드 선택
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            3가지 다른 데이터 전송 방식의 성능을 측정하고 비교하세요.
            실시간 환자 데이터 업데이트에서 각 모드의 네트워크 효율성과 사용자 경험을 분석할 수 있습니다.
          </p>
        </div>

        {/* 모드 선택 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {modes.map((mode) => {
            const colors = getColorClasses(mode.color);
            const Icon = mode.icon;
            
            return (
              <div
                key={mode.id}
                className={`${colors.bg} ${colors.border} ${colors.hover} border-2 rounded-xl p-6 transition-all duration-200 cursor-pointer transform hover:scale-105`}
                onClick={() => navigate(`/${mode.id}`)}
              >
                <div className="text-center mb-6">
                  <div className={`${colors.bg} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <Icon className={colors.icon} size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{mode.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{mode.description}</p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">데이터 크기:</span>
                    <span className="text-sm font-medium text-gray-900">{mode.dataSize}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">업데이트 주기:</span>
                    <span className="text-sm font-medium text-gray-900">{mode.interval}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">주요 특징:</h4>
                  <ul className="space-y-2">
                    {mode.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  className={`w-full ${colors.button} text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/${mode.id}`);
                  }}
                >
                  <span>시작하기</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            );
          })}
        </div>

        {/* 추가 정보 */}
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
          <div className="text-center mb-6">
            <Activity className="text-gray-400 mx-auto mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">실시간 성능 모니터링</h3>
            <p className="text-gray-600">각 모드에서 다음 메트릭을 실시간으로 측정합니다</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <Clock className="text-blue-600 mx-auto mb-2" size={24} />
              <h4 className="font-medium text-gray-900">업데이트 빈도</h4>
              <p className="text-sm text-gray-500">초당 업데이트 횟수</p>
            </div>
            <div className="text-center">
              <Database className="text-green-600 mx-auto mb-2" size={24} />
              <h4 className="font-medium text-gray-900">데이터 사용량</h4>
              <p className="text-sm text-gray-500">총 전송 데이터량</p>
            </div>
            <div className="text-center">
              <TrendingUp className="text-yellow-600 mx-auto mb-2" size={24} />
              <h4 className="font-medium text-gray-900">전송 효율성</h4>
              <p className="text-sm text-gray-500">초당 평균 전송률</p>
            </div>
            <div className="text-center">
              <Zap className="text-purple-600 mx-auto mb-2" size={24} />
              <h4 className="font-medium text-gray-900">응답 시간</h4>
              <p className="text-sm text-gray-500">업데이트 지연시간</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 