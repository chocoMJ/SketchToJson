import { Box, Button } from '@suis-ui/kit';
import { Menu } from 'lucide-solid';
import { createSignal, For, Show } from 'solid-js';

import { Icon } from '@/components/ui/icon';
import type { LevelData } from '@/models/level';
import { LayerTab } from './layer-tab';
import { PaletteTab } from './palette-tab';
import * as styles from './side-panel.css';

type SidePanelTab = 'layer' | 'palette';

type SidePanelProps = {
  activeLayerId: string;
  selectedBrushTileId: number;
  selectedLayerId: string | null;
  level: LevelData;
  onApplyLevel: (level: LevelData) => void;
  onSelectActiveLayer: (layerId: string) => void;
  onSelectBrushTile: (tileId: number) => void;
  onSelectLayerRect: (layerId: string, selected: boolean) => void;
};

export const SidePanel = (props: SidePanelProps) => {
  const [activeTab, setActiveTab] = createSignal<SidePanelTab>('layer');

  return (
    <Box
      as={'aside'}
      class={styles.panel}
      direction={'column'}
      gap={'md'}
      bg={'surface.high'}
      bc={'surface.higher'}
      bd={'thin'}
      p={'xs'}
      r={'lg'}
      shadow={'xl'}
      aria-label={'Level structure'}
    >
      <Box
        pos={'sticky'}
        direction={'row'}
        align={'center'}
        gap={'xs'}
        top={'0'}
      >
        <Button variant={'ghost'} type={'icon'} size={'sm'} r={'md'}>
          <Icon name={Menu} />
        </Button>
        <Box text={'body'}>{props.level.name}</Box>
      </Box>
      <Box
        direction={'row'}
        gap={'xs'}
        role={'tablist'}
        aria-label={'Sidebar tabs'}
      >
        <For each={['layer', 'palette'] as SidePanelTab[]}>
          {(tab) => (
            <Button
              flex
              variant={'ghost'}
              active={activeTab() === tab}
              aria-selected={activeTab() === tab}
              role={'tab'}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'layer' ? 'Layer' : 'Palette'}
            </Button>
          )}
        </For>
      </Box>
      <Show
        when={activeTab() === 'palette'}
        fallback={
          <LayerTab
            activeLayerId={props.activeLayerId}
            selectedLayerId={props.selectedLayerId}
            level={props.level}
            onSelectActiveLayer={props.onSelectActiveLayer}
            onSelectLayerRect={props.onSelectLayerRect}
          />
        }
      >
        <PaletteTab
          level={props.level}
          selectedBrushTileId={props.selectedBrushTileId}
          onApplyLevel={props.onApplyLevel}
          onSelectBrushTile={props.onSelectBrushTile}
        />
      </Show>
    </Box>
  );
};
