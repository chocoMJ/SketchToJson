import {
  AppWindow,
  ChartNoAxesColumnIncreasing,
  Circle,
  DoorOpen,
  Minus,
  Square,
  Star,
  Triangle,
} from 'lucide-solid';

import type { IconType } from '@/components/ui/icon';
import type { CvShape, TileIcon } from '@/models/level';

export const TileIconMap = {
  star: Star,
  triangle: Triangle,
  line: Minus,
  door: DoorOpen,
  window: AppWindow,
  stairs: ChartNoAxesColumnIncreasing,
} as const satisfies Record<TileIcon, IconType>;

export const CvShapeIconMap = {
  triangle: Triangle,
  rectangle: Square,
  circle: Circle,
  line: Minus,
} as const satisfies Record<CvShape, IconType>;
