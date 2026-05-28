import {
  Box,
  Button,
  Input,
  Item,
  Select,
  SelectItem,
  type SelectItemProps,
} from '@suis-ui/kit';
import { Brush, Pencil, Plus, Save, Trash2, X } from 'lucide-solid';
import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';

import { Dialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import type { CvShape, LevelData, TileIcon, TileMapping } from '@/models/level';
import { TilePreview } from '@/pages/_components/tile-preview';
import {
  addPaletteTileToLevel,
  CV_SHAPE_PRESETS,
  clonePaletteTile,
  createRandomPaletteTile,
  deletePaletteTileFromLevel,
  getTileDisplayName,
  normalizeTileName,
  TILE_ICON_PRESETS,
  updatePaletteTileInLevel,
  validatePaletteTileUpdate,
} from '@/stores/palette';
import * as styles from './side-panel.css';
import { Dynamic } from 'solid-js/web';
import { TileIconMap } from '@/helpers/constants';
import { colorInputStyle } from './palette-tab.css';

type PaletteTabProps = {
  level: LevelData;
  selectedBrushTileId: number;
  onApplyLevel: (level: LevelData) => void;
  onSelectBrushTile: (tileId: number) => void;
};

type EditStatus = {
  type: 'error' | 'success';
  message: string;
};

type ReplacementOption = {
  value: string;
  label: string;
};

type ReplacementRenderValue = string | ReplacementOption;

const iconOptions = [...TILE_ICON_PRESETS];

const shapeOptions = CV_SHAPE_PRESETS.map((shape) => ({
  value: shape,
  label: shape,
}));

const selectContentProps = { style: 'z-index: 1100' };

const getUsedTileCount = (level: LevelData, tileId: number) =>
  level.layers.reduce(
    (count, layer) =>
      count + layer.tiles.filter((tile) => tile.tileId === tileId).length,
    0,
  );

const getPaletteDescription = (level: LevelData, tile: TileMapping) => {
  const usedCount = getUsedTileCount(level, tile.tileId);
  const shapes =
    tile.cvShapes.length > 0 ? `${tile.cvShapes.join(', ')}` : 'No Mapping';

  return `${usedCount} used / ${shapes}`;
};

export const PaletteTab = (props: PaletteTabProps) => {
  const [addOpen, setAddOpen] = createSignal(false);
  const [addDraft, setAddDraft] = createSignal<TileMapping | null>(null);
  const [editOpen, setEditOpen] = createSignal(false);
  const [editTargetId, setEditTargetId] = createSignal<number | null>(null);
  const [editTargetSnapshot, setEditTargetSnapshot] =
    createSignal<TileMapping | null>(null);
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  const [deleteTargetId, setDeleteTargetId] = createSignal<number | null>(null);
  const [deleteTargetSnapshot, setDeleteTargetSnapshot] =
    createSignal<TileMapping | null>(null);
  const [replacementValue, setReplacementValue] = createSignal<string | null>(
    null,
  );
  const fallbackTile = createMemo(
    () =>
      props.level.tileTable[0] ??
      createRandomPaletteTile(props.level.tileTable),
  );
  const addTile = () => addDraft() ?? fallbackTile();
  const editTarget = createMemo(() =>
    props.level.tileTable.find((tile) => tile.tileId === editTargetId()),
  );
  const editTile = () => editTarget() ?? editTargetSnapshot() ?? fallbackTile();
  const editOriginalTileId = () => editTargetId() ?? editTile().tileId;
  const deleteTarget = createMemo(() =>
    props.level.tileTable.find((tile) => tile.tileId === deleteTargetId()),
  );
  const deleteTile = () =>
    deleteTarget() ?? deleteTargetSnapshot() ?? fallbackTile();
  const replacementOptions = createMemo(() =>
    props.level.tileTable
      .filter((tile) => tile.tileId !== deleteTargetId())
      .map((tile) => ({
        value: String(tile.tileId),
        label: getTileDisplayName(tile),
      })),
  );
  const getReplacementLabel = (value: string) =>
    replacementOptions().find((option) => option.value === value)?.label ??
    value;
  const getReplacementValue = (value: ReplacementRenderValue) =>
    typeof value === 'string' ? value : value.value;
  const isOnlyTile = () => props.level.tileTable.length <= 1;
  const handleOpenAdd = () => {
    setAddDraft(createRandomPaletteTile(props.level.tileTable));
    setAddOpen(true);
  };
  const handleCloseAdd = () => {
    setAddOpen(false);
  };
  const handleConfirmAdd = (tile: TileMapping) => {
    props.onApplyLevel(addPaletteTileToLevel(props.level, tile));
    props.onSelectBrushTile(tile.tileId);
    handleCloseAdd();
  };
  const handleOpenEdit = (tileId: number) => {
    const target = props.level.tileTable.find((tile) => tile.tileId === tileId);

    setEditTargetId(tileId);

    if (target) {
      setEditTargetSnapshot(clonePaletteTile(target));
    }

    setEditOpen(true);
  };
  const handleCloseEdit = () => {
    setEditOpen(false);
  };
  const handleConfirmEdit = (originalTileId: number, tile: TileMapping) => {
    props.onApplyLevel(
      updatePaletteTileInLevel(props.level, originalTileId, tile),
    );

    if (props.selectedBrushTileId === originalTileId) {
      props.onSelectBrushTile(tile.tileId);
    }

    handleCloseEdit();
  };
  const handleOpenDelete = (tileId: number) => {
    const target = props.level.tileTable.find((tile) => tile.tileId === tileId);

    setDeleteTargetId(tileId);
    setReplacementValue(null);

    if (target) {
      setDeleteTargetSnapshot(clonePaletteTile(target));
    }

    setDeleteOpen(true);
  };
  const handleCloseDelete = () => {
    setDeleteOpen(false);
  };
  const handleConfirmDelete = () => {
    const targetId = deleteTargetId();

    if (targetId === null) {
      return;
    }

    const replacementTileId = replacementValue()
      ? Number(replacementValue())
      : null;
    const nextLevel = deletePaletteTileFromLevel(
      props.level,
      targetId,
      replacementTileId,
    );

    props.onApplyLevel(nextLevel);

    if (props.selectedBrushTileId === targetId) {
      props.onSelectBrushTile(
        replacementTileId ?? nextLevel.tileTable[0]?.tileId ?? 0,
      );
    }

    handleCloseDelete();
  };

  return (
    <Box gap={'sm'}>
      <Item
        size={'sm'}
        title={'Palette'}
        action={
          <Button variant={'primary'} size={'sm'} onClick={handleOpenAdd}>
            <Icon name={Plus} />
            {'Add Tile'}
          </Button>
        }
      />
      <Box class={styles.paletteList}>
        <For each={props.level.tileTable}>
          {(tile) => (
            <PaletteTileItem
              tile={tile}
              level={props.level}
              disabledDelete={isOnlyTile()}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
            />
          )}
        </For>
      </Box>
      <PaletteTileDialog
        open={addOpen()}
        title={'타일 추가'}
        confirmLabel={'타일 추가'}
        level={props.level}
        tile={addTile()}
        originalTileId={null}
        onClose={handleCloseAdd}
        onSave={handleConfirmAdd}
      />
      <PaletteTileDialog
        open={editOpen() && Boolean(editTarget())}
        title={`${getTileDisplayName(editTile())} 수정`}
        confirmLabel={'저장'}
        level={props.level}
        tile={editTile()}
        originalTileId={editOriginalTileId()}
        onClose={handleCloseEdit}
        onSave={(tile) => handleConfirmEdit(editOriginalTileId(), tile)}
      />
      <Dialog
        open={deleteOpen() && Boolean(deleteTarget())}
        title={`${getTileDisplayName(deleteTile())} 삭제 확인`}
        description={`${getUsedTileCount(
          props.level,
          deleteTile().tileId,
        )}개의 타일이 사용되고 있습니다.`}
        onClose={handleCloseDelete}
        footer={
          <>
            <Button
              variant={'ghost'}
              onClick={handleCloseDelete}
            >
              {'취소'}
            </Button>
            <Button
              variant={'primary'}
              onClick={handleConfirmDelete}
            >
              {'삭제'}
            </Button>
          </>
        }
      >
        <Box gap={'sm'}>
          <Item
            size={'sm'}
            media={<TilePreview tile={deleteTile()} />}
            title={getTileDisplayName(deleteTile())}
            description={getPaletteDescription(props.level, deleteTile())}
          />
          <Box class={styles.field}>
            <Box as={'label'} text={'caption'} c={'text.caption'}>
              {'대체할 타일 선택'}
            </Box>
            <Select
              value={replacementValue()}
              onChangeValue={setReplacementValue}
              data={replacementOptions()}
              placeholder={'대체 타일'}
              contentProps={selectContentProps}
              renderValue={(value: ReplacementRenderValue) =>
                getReplacementLabel(getReplacementValue(value))
              }
            />
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

type PaletteTileItemProps = {
  level: LevelData;
  disabledDelete: boolean;
  tile: TileMapping;
  onEdit: (tileId: number) => void;
  onDelete: (tileId: number) => void;
};

const PaletteTileItem = (props: PaletteTileItemProps) => (
  <Item
    size={'sm'}
    media={<TilePreview tile={props.tile} />}
    title={getTileDisplayName(props.tile)}
    description={getPaletteDescription(props.level, props.tile)}
    action={
      <Box direction={'row'} gap={'xxs'}>
        <Button
          variant={'ghost'}
          type={'icon'}
          size={'sm'}
          aria-label={`Edit ${getTileDisplayName(props.tile)}`}
          onClick={() => props.onEdit(props.tile.tileId)}
        >
          <Icon name={Pencil} />
        </Button>
        <Button
          variant={'ghost'}
          type={'icon'}
          size={'sm'}
          aria-label={`Delete ${getTileDisplayName(props.tile)}`}
          disabled={props.disabledDelete}
          onClick={() => props.onDelete(props.tile.tileId)}
        >
          <Icon name={Trash2} />
        </Button>
      </Box>
    }
  />
);

type PaletteTileDialogProps = {
  open: boolean;
  title: string;
  confirmLabel: string;
  level: LevelData;
  tile: TileMapping;
  originalTileId: number | null;
  onClose: () => void;
  onSave: (tile: TileMapping) => void;
};

const PaletteTileDialog = (props: PaletteTileDialogProps) => {
  const [draft, setDraft] = createSignal<TileMapping>(
    clonePaletteTile(props.tile),
  );
  const [status, setStatus] = createSignal<EditStatus | null>(null);
  const nextAvailableShape = () =>
    CV_SHAPE_PRESETS.find((shape) => !draft().cvShapes.includes(shape)) ?? null;
  const iconPreviewTile = (icon: TileIcon) => ({
    backgroundColor: draft().backgroundColor,
    icon,
    iconColor: draft().iconColor,
  });
  const updateDraft = (update: Partial<TileMapping>) => {
    setDraft((current) => ({
      ...current,
      ...update,
      cvShapes: update.cvShapes ?? current.cvShapes,
    }));
    setStatus(null);
  };
  const updateShape = (index: number, shape: CvShape | null) => {
    if (!shape) {
      return;
    }

    updateDraft({
      cvShapes: draft().cvShapes.map((current, currentIndex) =>
        currentIndex === index ? shape : current,
      ),
    });
  };
  const handleAddShape = () => {
    const shape = nextAvailableShape();

    if (!shape) {
      return;
    }

    updateDraft({ cvShapes: [...draft().cvShapes, shape] });
  };
  const handleRemoveShape = (index: number) => {
    updateDraft({
      cvShapes: draft().cvShapes.filter(
        (_, currentIndex) => currentIndex !== index,
      ),
    });
  };
  const handleSave = () => {
    const nextTile = {
      ...clonePaletteTile(draft()),
      name: normalizeTileName(draft().name),
    };
    const errors = validatePaletteTileUpdate(
      props.level,
      props.originalTileId,
      nextTile,
    );

    if (errors.length > 0) {
      setStatus({
        type: 'error',
        message: errors[0],
      });
      return;
    }

    setDraft(nextTile);
    props.onSave(nextTile);
  };

  createEffect(() => {
    if (!props.open) {
      return;
    }

    setDraft(clonePaletteTile(props.tile));
    setStatus(null);
  });

  return (
    <Dialog
      open={props.open}
      title={props.title}
      onClose={props.onClose}
      footer={
        <>
          <Button variant={'ghost'} onClick={props.onClose}>
            {'취소'}
          </Button>
          <Button variant={'primary'} onClick={handleSave}>
            <Icon name={Save} />
            {props.confirmLabel}
          </Button>
        </>
      }
    >
      <Box w={'100%'} gap={'xs'}>
        <Box as={'label'} text={'caption'} c={'text.caption'}>
          {'아이디'}
        </Box>
        <Input
          type={'number'}
          min={0}
          value={String(draft().tileId)}
          onInput={(event) =>
            updateDraft({
              tileId: Number.isNaN(event.currentTarget.valueAsNumber)
                ? 0
                : event.currentTarget.valueAsNumber,
            })
          }
        />
      </Box>
      <Box w={'100%'} gap={'xs'}>
        <Box as={'label'} text={'caption'} c={'text.caption'}>
          {'이름'}
        </Box>
        <Input
          w={'100%'}
          value={draft().name}
          onInput={(event) => updateDraft({ name: event.currentTarget.value })}
        />
      </Box>
      <Box w={'100%'} gap={'xs'}>
        <Box as={'label'} text={'caption'} c={'text.caption'}>
          {'아이콘'}
        </Box>
        <Select
          value={draft().icon}
          onChangeValue={(value: string | null) =>
            value ? updateDraft({ icon: value as TileIcon }) : undefined
          }
          data={iconOptions}
          contentProps={selectContentProps}
          renderValue={(value: TileIcon) => (
            <Box direction={'row'} align={'center'} gap={'xs'}>
              <Dynamic component={TileIconMap[value]} size={16} />
              <Box as={'span'}>{value}</Box>
            </Box>
          )}
          renderItem={(itemProps: SelectItemProps) => (
            <SelectItem
              {...itemProps}
              media={<Dynamic component={TileIconMap[(itemProps as { value: TileIcon }).value]} size={16} />}
            />
          )}
        />
      </Box>
      <Box w={'100%'} gap={'xs'}>
        <Box as={'label'} text={'caption'} c={'text.caption'}>
          {'배경'}
        </Box>
        <ColorInput
          value={draft().backgroundColor}
          onInput={(value) => updateDraft({ backgroundColor: value })}
        />
      </Box>
      <Box w={'100%'} gap={'xs'}>
        <Box as={'label'} text={'caption'} c={'text.caption'}>
          {'아이콘 색상'}
        </Box>
        <ColorInput
          value={draft().iconColor}
          onInput={(value) => updateDraft({ iconColor: value })}
        />
      </Box>

      <Box w={'100%'} gap={'xs'}>
        <Box direction={'row'} justify={'space-between'} align={'center'} gap={'xs'}>
          <Box as={'label'} text={'caption'} c={'text.caption'}>
            {'매핑'}
          </Box>
          <Button
            variant={'ghost'}
            type={'icon'}
            size={'xs'}
            r={'md'}
            aria-label={'Add CV shape'}
            disabled={!nextAvailableShape()}
            onClick={handleAddShape}
          >
            <Icon name={Plus} />
          </Button>
        </Box>

        <For
          each={draft().cvShapes}
          fallback={
            <Box text={'caption'} c={'text.caption'} p={'md'} justify={'center'} align={'center'}>
              {'현재 매핑 없음'}
            </Box>}
        >
          {(shape, index) => (
            <Box direction={'row'} align={'center'} gap={'xs'}>
              <Select
                value={shape}
                onChangeValue={(value: string | null) =>
                  updateShape(index(), value as CvShape | null)
                }
                data={shapeOptions}
                contentProps={selectContentProps}
                renderValue={(value: typeof shapeOptions[number]) => (
                  <Box direction={'row'} align={'center'} gap={'xs'}>
                    <Dynamic component={TileIconMap[value as unknown as TileIcon]} size={16} />
                    <Box as={'span'}>{value}</Box>
                  </Box>
                )}
                renderItem={(itemProps: SelectItemProps) => (
                  <SelectItem
                    {...itemProps}
                    media={<Dynamic component={TileIconMap[(itemProps as { value: TileIcon }).value]} size={16} />}
                  />
                )}
              />
              <Button
                variant={'ghost'}
                type={'icon'}
                size={'sm'}
                r={'md'}
                aria-label={`Remove ${shape} shape`}
                onClick={() => handleRemoveShape(index())}
              >
                <Icon name={X} />
              </Button>
            </Box>
          )}
        </For>
      </Box>
      <Box
        class={styles.status}
        classList={{
          [styles.statusError]: status()?.type === 'error',
        }}
        text={'caption'}
        c={'text.caption'}
      >
        {status()?.message ?? ' '}
      </Box>
    </Dialog>
  );
};

type ColorInputProps = {
  value: string;
  onInput: (value: string) => void;
};

const ColorInput = (props: ColorInputProps) => (
  <Box direction={'row'} align={'center'} gap={'xs'}>
    <Box
      as={'input'}
      w={'2.4rem'}
      h={'2.4rem'}
      c={'transparent'}
      r={'xxl'}
      bc={'surface.higher'}
      bd={'md'}
      type={'color'}
      value={props.value}
      onInput={(event: InputEvent) => props.onInput((event.target as HTMLInputElement).value)}
      style={{ 'background-color': props.value }}
      class={colorInputStyle}
    />
    <Box as={'span'} class={styles.colorValue} text={'caption'}>
      {props.value.toUpperCase()}
    </Box>
  </Box>
);
