import { Heart, Thermometer, Activity, Wind } from 'lucide-react';
import { clsx } from 'clsx';
import { useState, useEffect, useRef } from 'react';

const VitalSign = ({ icon: Icon, label, value, unit, isAbnormal, trend }) => (
  <div className={clsx(
    'p-1 border rounded text-center',
    isAbnormal ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
  )}>
    <div className="flex items-center justify-center mb-0.5">
      <Icon 
        size={8} 
        className={clsx(
          isAbnormal ? 'text-red-600' : 'text-gray-500'
        )} 
      />
      {trend && (
        <span className={clsx(
          'text-[8px] ml-0.5',
          trend === 'up' ? 'text-red-600' : trend === 'down' ? 'text-blue-600' : 'text-gray-400'
        )}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
        </span>
      )}
    </div>
    <div className="text-[9px] font-medium">{value}{unit}</div>
  </div>
);

export function PatientCard({ patient, patientId, equipment }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const prevPatientRef = useRef(patient);

  // 데이터 변경 감지 및 애니메이션 트리거
  useEffect(() => {
    const hasChanged = JSON.stringify(prevPatientRef.current) !== JSON.stringify(patient);
    if (hasChanged) {
      setIsUpdating(true);
      const timer = setTimeout(() => setIsUpdating(false), 300);
      prevPatientRef.current = patient;
      return () => clearTimeout(timer);
    }
  }, [patient]);

  // 생체신호 이상 여부 판단
  const isHeartRateAbnormal = patient.vitals.heartRate < 60 || patient.vitals.heartRate > 100;
  const isTempAbnormal = patient.vitals.temperature < 36.0 || patient.vitals.temperature > 37.5;
  const isSpO2Abnormal = patient.vitals.spo2 < 95;
  const isRespRateAbnormal = patient.vitals.respiratoryRate < 12 || patient.vitals.respiratoryRate > 20;

  // 환자 상태에 따른 스타일
  const getStatusClass = (status) => {
    switch (status) {
      case 'critical': return 'status-critical';
      case 'stable': return 'status-stable';
      case 'recovering': return 'status-recovering';
      case 'observation': return 'status-observation';
      default: return 'status-stable';
    }
  };

  // 해당 환자의 장비 찾기
  const patientEquipment = Object.values(equipment || {}).filter(eq => eq.patient === patientId);

  return (
    <div className={clsx(
      "border border-gray-200 rounded p-1.5 bg-white hover:shadow-sm transition-all text-[10px]",
      isUpdating && "border-blue-400 bg-blue-50 scale-105"
    )}>
      {/* 환자 헤더 - 매우 컴팩트 */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex-1 min-w-0">
          <h3 className="text-[11px] font-medium text-gray-900 truncate">{patient.name}</h3>
          <div className="text-[9px] text-gray-500 truncate">
            {patient.age}세 • {patient.room}호
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <span className={`${getStatusClass(patient.status)} text-[8px] px-1 py-0.5 leading-none`}>
            {patient.status.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      {/* 생체신호 그리드 - 2x2 매우 작게 */}
      <div className="grid grid-cols-2 gap-1 mb-1">
        <VitalSign
          icon={Heart}
          label="HR"
          value={patient.vitals.heartRate}
          unit=""
          isAbnormal={isHeartRateAbnormal}
        />
        <VitalSign
          icon={Activity}
          label="SpO2"
          value={patient.vitals.spo2}
          unit="%"
          isAbnormal={isSpO2Abnormal}
        />
        <VitalSign
          icon={Thermometer}
          label="T"
          value={patient.vitals.temperature}
          unit="°"
          isAbnormal={isTempAbnormal}
        />
        <VitalSign
          icon={Wind}
          label="RR"
          value={patient.vitals.respiratoryRate}
          unit=""
          isAbnormal={isRespRateAbnormal}
        />
      </div>

      {/* 혈압 - 한 줄로 */}
      <div className="text-center p-1 border border-gray-200 rounded bg-gray-50 mb-1">
        <div className="text-[9px] font-medium">
          {patient.vitals.bloodPressure.systolic}/{patient.vitals.bloodPressure.diastolic}
        </div>
      </div>

      {/* 장비 상태 - 점으로 표시 */}
      {patientEquipment.length > 0 && (
        <div className="flex justify-center space-x-1">
          {patientEquipment.slice(0, 3).map((eq, index) => (
            <div 
              key={index}
              className={clsx(
                'w-1.5 h-1.5 rounded-full',
                eq.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
              )}
              title={eq.type}
            />
          ))}
          {patientEquipment.length > 3 && (
            <div className="text-[8px] text-gray-500">+{patientEquipment.length - 3}</div>
          )}
        </div>
      )}
    </div>
  );
} 