import { Eraser, Hand, MousePointer2, Paintbrush } from 'lucide-solid';

import type { IconType } from '@/components/ui/icon';
import type { EditorTool } from '@/stores/editor';

export const tools = [
  { id: 'select', label: '선택', icon: MousePointer2 },
  { id: 'brush', label: '브러시', icon: Paintbrush },
  { id: 'erase', label: '지우개', icon: Eraser },
  { id: 'pan', label: '팬', icon: Hand },
] as const satisfies ReadonlyArray<{
  id: EditorTool;
  label: string;
  icon: IconType;
}>;
