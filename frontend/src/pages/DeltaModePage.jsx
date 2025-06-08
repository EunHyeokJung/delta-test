import { TrendingUp } from 'lucide-react';
import { ModePageLayout } from './ModePageLayout';

const modeInfo = {
  title: 'Delta Update 모드',
  description: '변경된 데이터만 Key-Value 형태로 효율적 전송',
  icon: TrendingUp,
  color: 'green'
};

export function DeltaModePage() {
  return <ModePageLayout mode="delta" modeInfo={modeInfo} />;
} 