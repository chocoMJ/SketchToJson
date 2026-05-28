import { Box, Button, Item } from '@suis-ui/kit';
import { Plus } from 'lucide-solid';
import { createMemo, createSignal, For } from 'solid-js';

import { Icon } from '@/components/ui/icon';
import type { LevelData, TileMapping } from '@/models/level';
import {
  addPaletteTileToLevel,
  clonePaletteTile,
  createRandomPaletteTile,
  deletePaletteTileFromLevel,
  getTileDisplayName,
  updatePaletteTileInLevel,
} from '@/stores/palette';
import { PaletteDeleteDialog } from './palette-delete-dialog';
import {
  createReplacementOptions,
  type ReplacementOption,
} from './palette-tab.utils';
import { PaletteTileDialog } from './palette-tile-dialog';
import { PaletteTileItem } from './palette-tile-item';

type PaletteTabProps = {
  level: LevelData;
  selectedBrushTileId: number;
  onApplyLevel: (level: LevelData) => void;
  onSelectBrushTile: (tileId: number) => void;
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
  const replacementOptions = createMemo<ReplacementOption[]>(() =>
    createReplacementOptions(props.level, deleteTargetId()),
  );
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
      <Box gap={'sm'}>
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
      <PaletteDeleteDialog
        open={deleteOpen() && Boolean(deleteTarget())}
        level={props.level}
        replacementOptions={replacementOptions()}
        replacementValue={replacementValue()}
        tile={deleteTile()}
        onChangeReplacement={setReplacementValue}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
      />
    </Box>
  );
};
