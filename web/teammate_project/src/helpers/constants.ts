import { Star, Triangle, Minus, DoorOpen, AppWindow, ChartNoAxesColumnIncreasing } from 'lucide-solid';

import type { IconType } from '@/components/ui/icon';
import type { TileIcon } from '@/models/level';

export const TileIconMap = {
  star: Star,
  triangle: Triangle,
  line: Minus,
  door: DoorOpen,
  window: AppWindow,
  stairs: ChartNoAxesColumnIncreasing,
} as const satisfies Record<TileIcon, IconType>;
