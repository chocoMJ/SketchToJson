import { Box, Button, vars } from '@suis-ui/kit';
import { Menu } from 'lucide-solid';
import { createSignal, For } from 'solid-js';

import { Icon } from '@/components/ui/icon';
import type { LevelData } from '@/models/level';
import type { LayerMoveDirection } from '@/stores/layers';
import { LayerTab } from './layer-tab';
import { PaletteTab } from './palette-tab';
import * as styles from './side-panel.css';

type SidePanelTab = 'layer' | 'palette';

const sidePanelTabs = ['layer', 'palette'] as const satisfies SidePanelTab[];

type SidePanelProps = {
  activeLayerId: string;
  selectedBrushTileId: number;
  selectedLayerId: string | null;
  level: LevelData;
  onApplyLevel: (level: LevelData) => void;
  onAddLayer: () => void;
  onDeleteLayer: (layerId: string) => void;
  onMoveLayer: (layerId: string, direction: LayerMoveDirection) => void;
  onSelectActiveLayer: (layerId: string) => void;
  onSelectBrushTile: (tileId: number) => void;
  onSelectLayerRect: (layerId: string, selected: boolean) => void;
};

export const SidePanel = (props: SidePanelProps) => {
  const [activeTab, setActiveTab] = createSignal<SidePanelTab>('layer');
  const getTabIndex = (tab: SidePanelTab) => sidePanelTabs.indexOf(tab);
  const activeTabIndex = () => getTabIndex(activeTab());
  const selectTab = (tab: SidePanelTab) => {
    setActiveTab(tab);
  };

  return (
    <Box
      as={'aside'}
      class={styles.panel}
      pos={'absolute'}
      z={10}
      top={vars.size.space.lg}
      left={vars.size.space.lg}
      direction={'column'}
      gap={'md'}
      w={'26rem'}
      maxH={`calc(100vh - (${vars.size.space.lg} * 2))`}
      overflow={'auto'}
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
        <For each={sidePanelTabs}>
          {(tab) => (
            <Button
              flex
              variant={'ghost'}
              active={activeTab() === tab}
              aria-selected={activeTab() === tab}
              role={'tab'}
              onClick={() => selectTab(tab)}
            >
              {tab === 'layer' ? 'Layer' : 'Palette'}
            </Button>
          )}
        </For>
      </Box>
      <Box minW={'0'} overflow={'xHidden'}>
        <Box
          class={styles.pagerTrack}
          direction={'row'}
          align={'flex-start'}
          w={'200%'}
          style={{
            transform: `translateX(${activeTabIndex() * -50}%)`,
          }}
        >
          <Box
            w={'50%'}
            minW={'0'}
            flex={'0 0 50%'}
            aria-hidden={activeTab() !== 'layer'}
            style={{
              'pointer-events': activeTab() === 'layer' ? 'auto' : 'none',
            }}
          >
            <LayerTab
              activeLayerId={props.activeLayerId}
              selectedLayerId={props.selectedLayerId}
              level={props.level}
              onAddLayer={props.onAddLayer}
              onDeleteLayer={props.onDeleteLayer}
              onMoveLayer={props.onMoveLayer}
              onSelectActiveLayer={props.onSelectActiveLayer}
              onSelectLayerRect={props.onSelectLayerRect}
            />
          </Box>
          <Box
            w={'50%'}
            minW={'0'}
            flex={'0 0 50%'}
            aria-hidden={activeTab() !== 'palette'}
            style={{
              'pointer-events': activeTab() === 'palette' ? 'auto' : 'none',
            }}
          >
            <PaletteTab
              level={props.level}
              selectedBrushTileId={props.selectedBrushTileId}
              onApplyLevel={props.onApplyLevel}
              onSelectBrushTile={props.onSelectBrushTile}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
