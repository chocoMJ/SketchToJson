import { Box, Button, Item } from '@suis-ui/kit';
import {
  ChevronDown,
  ChevronUp,
  EllipsisVertical,
  Square,
  Trash2,
} from 'lucide-solid';
import { Flip } from 'solid-flip';
import { createMemo, For } from 'solid-js';

import { Icon } from '@/components/ui/icon';
import { MenuButton } from '@/components/ui/menu-button';
import type { LevelLayer, TileMapping } from '@/models/level';
import type { LayerMoveDirection } from '@/stores/layers';
import { createDefaultTileName, getTileDisplayName } from '@/stores/palette';
import * as styles from '../layer-tab.css';
import { getTileFlipId } from '../layer-tab.utils';

type LayerItemProps = {
  canMoveDown: boolean;
  canMoveUp: boolean;
  disabledDelete: boolean;
  expanded: boolean;
  flipTrigger: string;
  layer: LevelLayer;
  tileTable: TileMapping[];
  selectedLayerId?: string | null;
  onDeleteLayer: (layerId: string) => void;
  onMoveLayer: (layerId: string, direction: LayerMoveDirection) => void;
  onSelectActiveLayer: (layerId: string) => void;
  onSelectLayerRect: (layerId: string, selected: boolean) => void;
  onToggleExpanded: (layerId: string) => void;
};

export const LayerItem = (props: LayerItemProps) => {
  const tileNameById = createMemo(
    () =>
      new Map(
        props.tileTable.map((tile) => [tile.tileId, getTileDisplayName(tile)]),
      ),
  );
  const getTileName = (tileId: number) =>
    tileNameById().get(tileId) ?? createDefaultTileName(tileId);

  return (
    <Flip
      id={`side-panel-layer-${props.layer.id}`}
      with={props.flipTrigger}
      properties={['translate', 'opacity']}
      enter={styles.treeItemEnterStyle}
      exit={styles.treeItemExitStyle}
    >
      <Box as={'li'}>
        <Box direction={'row'} align={'center'} gap={'xxs'}>
          <Item
            as={Button}
            flex
            variant={'ghost'}
            active={props.selectedLayerId === props.layer.id}
            onClick={() =>
              props.onSelectLayerRect(
                props.layer.id,
                props.selectedLayerId !== props.layer.id,
              )
            }
            media={
              <Box direction={'row'} align={'center'} gap={'xxs'}>
                <Box>
                  <Button
                    variant={'ghost'}
                    type={'icon'}
                    size={'xs'}
                    disabled={!props.canMoveUp}
                    onClick={() => props.onMoveLayer(props.layer.id, 'up')}
                  >
                    <Icon name={ChevronUp} size={12} />
                  </Button>
                  <Button
                    variant={'ghost'}
                    type={'icon'}
                    size={'xs'}
                    disabled={!props.canMoveDown}
                    onClick={() => props.onMoveLayer(props.layer.id, 'down')}
                  >
                    <Icon name={ChevronDown} size={12} />
                  </Button>
                </Box>
              </Box>
            }
            title={
              <Box
                direction={'row'}
                justify={'flex-start'}
                align={'center'}
                gap={'xs'}
              >
                <Box as={'span'}>{props.layer.name}</Box>
              </Box>
            }
            description={props.layer.id}
            action={
              <Box direction={'row'} align={'center'} gap={'xxs'}>
                <Button
                  variant={'ghost'}
                  type={'icon'}
                  size={'xs'}
                  r={'sm'}
                  onClick={(event) => {
                    props.onSelectActiveLayer(props.layer.id);
                    props.onToggleExpanded(props.layer.id);
                    event.stopPropagation();
                  }}
                >
                  <Icon name={props.expanded ? ChevronUp : ChevronDown} />
                </Button>
                <MenuButton
                  variant={'ghost'}
                  type={'icon'}
                  size={'xs'}
                  r={'sm'}
                  items={[
                    {
                      label: '레이어 삭제',
                      icon: Trash2,
                      onClick: () => props.onDeleteLayer(props.layer.id),
                    },
                  ]}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  disabled={props.disabledDelete}
                >
                  <Icon name={EllipsisVertical} />
                </MenuButton>
              </Box>
            }
          />
        </Box>
        <Box
          aria-hidden={!props.expanded}
          class={styles.tileCollapse({ expanded: props.expanded })}
        >
          <Box class={styles.tileCollapseInner}>
            <Box as={'ul'} pl={'md'}>
              <For each={props.layer.tiles}>
                {(tile) => (
                  <Flip
                    id={getTileFlipId(props.layer.id, tile)}
                    with={props.flipTrigger}
                    properties={['translate', 'opacity']}
                  >
                    <Box as={'li'} class={styles.tileNode}>
                      <Item
                        class={styles.tileItem}
                        c={'text.caption'}
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
                    </Box>
                  </Flip>
                )}
              </For>
            </Box>
          </Box>
        </Box>
      </Box>
    </Flip>
  );
};
