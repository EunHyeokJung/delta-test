import { Layers } from 'lucide-react';
import { ModePageLayout } from './ModePageLayout';

const modeInfo = {
  title: 'Hybrid 모드',
  description: '우선순위별 차등 업데이트로 최적화된 성능',
  icon: Layers,
  color: 'yellow'
};

export function HybridModePage() {
  return <ModePageLayout mode="hybrid" modeInfo={modeInfo} />;
} 