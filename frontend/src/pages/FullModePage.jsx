import { Database } from 'lucide-react';
import { ModePageLayout } from './ModePageLayout';

const modeInfo = {
  title: '전체 데이터 모드',
  description: '5초마다 모든 환자의 전체 데이터를 JSON으로 전송',
  icon: Database,
  color: 'blue'
};

export function FullModePage() {
  return <ModePageLayout mode="full" modeInfo={modeInfo} />;
} 