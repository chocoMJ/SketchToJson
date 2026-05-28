import { atom } from 'nanostores';

import type { LevelData } from '../models/level';

export const levelStore = atom<LevelData | null>(null);

export const clearLevelData = () => levelStore.set(null);
export const setLevelData = (levelData: LevelData) => {
  levelStore.set(levelData);
};
