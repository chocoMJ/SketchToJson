import { Box, Button, CheckBox, Item } from '@suis-ui/kit';
import { ChevronDown, ChevronUp, Square } from 'lucide-solid';
import { createMemo, createSignal, For, Show } from 'solid-js';

import { Icon } from '@/components/ui/icon';
import type { LevelData, LevelLayer, TileMapping } from '@/models/level';
import { createDefaultTileName, getTileDisplayName } from '@/stores/palette';
import * as styles from './side-panel.css';

type LayerTabProps = {
  activeLayerId: string;
  selectedLayerId: string | null;
  level: LevelData;
  onSelectActiveLayer: (layerId: string) => void;
  onSelectLayerRect: (layerId: string, selected: boolean) => void;
};

const sortLayers = (layers: LevelLayer[]) =>
  [...layers].sort((first, second) => first.order - second.order);

export const LayerTab = (props: LayerTabProps) => {
  const layers = createMemo(() => sortLayers(props.level.layers));

  return (
    <Box gap={'xs'}>
      <Box as={'h2'} text={'caption'} c={'text.caption'} px={'xs'}>
        {'Layers'}
      </Box>
      <Box as={'ul'} aria-label={'Layer tree'}>
        <For each={layers()}>
          {(layer) => (
            <LayerItem
              layer={layer}
              tileTable={props.level.tileTable}
              activeLayerId={props.activeLayerId}
              selectedLayerId={props.selectedLayerId}
              onSelectActiveLayer={props.onSelectActiveLayer}
              onSelectLayerRect={props.onSelectLayerRect}
            />
          )}
        </For>
      </Box>
    </Box>
  );
};

type LayerItemProps = {
  layer: LevelLayer;
  tileTable: TileMapping[];
  activeLayerId?: string;
  selectedLayerId?: string | null;
  onSelectActiveLayer: (layerId: string) => void;
  onSelectLayerRect: (layerId: string, selected: boolean) => void;
};

const LayerItem = (props: LayerItemProps) => {
  const [expand, setExpand] = createSignal(false);
  const tileNameById = createMemo(
    () =>
      new Map(
        props.tileTable.map((tile) => [tile.tileId, getTileDisplayName(tile)]),
      ),
  );
  const getTileName = (tileId: number) =>
    tileNameById().get(tileId) ?? createDefaultTileName(tileId);
  const handleClick = () => {
    props.onSelectActiveLayer(props.layer.id);
    setExpand((prev) => !prev);
  };

  return (
    <Box as={'li'}>
      <Box direction={'row'} align={'center'} gap={'xxs'}>
        <Item
          as={Button}
          variant={'ghost'}
          active={props.activeLayerId === props.layer.id}
          media={
            <CheckBox
              checked={props.selectedLayerId === props.layer.id}
              onChecked={(checked) =>
                props.onSelectLayerRect(props.layer.id, checked)
              }
            />
          }
          title={
            <Box
              direction={'row'}
              justify={'flex-start'}
              align={'center'}
              gap={'xs'}
            >
              <Box as={'span'}>{props.layer.name}</Box>
              <Box as={'span'} text={'caption'} c={'text.caption'}>
                {props.layer.id}
              </Box>
            </Box>
          }
          action={<Icon name={expand() ? ChevronUp : ChevronDown} />}
          onClick={handleClick}
        />
      </Box>
      <Show when={expand()}>
        <Box as={'ul'} pl={'md'}>
          <For each={props.layer.tiles}>
            {(tile) => (
              <Item
                as={'li'}
                class={styles.tileItem}
                media={<Icon name={Square} />}
                title={
                  <Box
                    direction={'row'}
                    justify={'flex-start'}
                    align={'center'}
                    gap={'xs'}
                  >
                    <Box as={'span'}>{getTileName(tile.tileId)}</Box>
                    <Box
                      as={'span'}
                      text={'caption'}
                      c={'text.caption'}
                    >{`#${tile.tileId} / ${tile.x}, ${tile.y}`}</Box>
                  </Box>
                }
                justify={'flex-start'}
              />
            )}
          </For>
        </Box>
      </Show>
    </Box>
  );
};
