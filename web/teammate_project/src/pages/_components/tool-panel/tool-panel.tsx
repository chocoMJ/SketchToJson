import { Box, Button, Tooltip } from '@suis-ui/kit';
import {
  Eraser,
  Hand,
  ImagePlus,
  MousePointer2,
  Paintbrush,
  Redo2,
  Undo2,
} from 'lucide-solid';
import { createSignal, For } from 'solid-js';

import { Icon, type IconType } from '@/components/ui/icon';
import type { TileMapping } from '@/models/level';
import { TilePreview } from '@/pages/_components/tile-preview';
import type { EditorTool } from '@/stores/editor';
import { getTileDisplayName } from '@/stores/palette';
import * as styles from './tool-panel.css';

const tools = [
  { id: 'select', label: 'Select', icon: MousePointer2 },
  { id: 'brush', label: 'Brush', icon: Paintbrush },
  { id: 'erase', label: 'Erase', icon: Eraser },
  { id: 'pan', label: 'Pan', icon: Hand },
] as const satisfies ReadonlyArray<{
  id: EditorTool;
  label: string;
  icon: IconType;
}>;

type ToolPanelProps = {
  canRedo: boolean;
  canUndo: boolean;
  selectedBrushTileId: number;
  onRedo: () => void;
  selectedTool: EditorTool;
  tileTable: TileMapping[];
  onImportPng: (file: File) => Promise<string | null>;
  onUndo: () => void;
  onSelectBrushTile: (tileId: number) => void;
  onSelectTool: (selectedTool: EditorTool) => void;
};

type ToolbarIconButtonProps = {
  active?: boolean;
  disabled?: boolean;
  icon: IconType;
  label: string;
  onClick: () => void;
};

const ToolbarIconButton = (props: ToolbarIconButtonProps) => (
  <Tooltip
    content={<Box text={'caption'}>{props.label}</Box>}
    placement={'top'}
    withArrow
    offset={12}
  >
    <Box as={'span'} direction={'row'}>
      <Button
        variant={'ghost'}
        size={'md'}
        p={'sm'}
        type={'icon'}
        active={props.active}
        disabled={props.disabled}
        aria-label={props.label}
        onClick={props.onClick}
      >
        <Icon name={props.icon} />
      </Button>
    </Box>
  </Tooltip>
);

export function ToolPanel(props: ToolPanelProps) {
  const [fileInput, setFileInput] = createSignal<HTMLInputElement>();
  const [uploading, setUploading] = createSignal(false);
  const [uploadStatus, setUploadStatus] = createSignal('Import PNG');
  const handleImportClick = () => {
    fileInput()?.click();
  };
  const handleFileChange = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];

    input.value = '';

    if (!file) {
      return;
    }

    if (file.type !== 'image/png') {
      setUploadStatus('Only PNG images are supported.');
      return;
    }

    setUploading(true);
    setUploadStatus('Importing PNG...');

    try {
      const layerId = await props.onImportPng(file);

      setUploadStatus(layerId ? `Inserted ${layerId}` : 'PNG import skipped.');
    } catch (error) {
      setUploadStatus(
        error instanceof Error ? error.message : 'PNG import failed.',
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box as={'aside'} class={styles.containerStyle}>
      <Box
        class={styles.groupStyle}
        direction={'row'}
        p={'xs'}
        gap={'sm'}
        r={'md'}
        bg={'surface.high'}
        bc={'surface.higher'}
        bd={'thin'}
        shadow={'md'}
        aria-label={'Editor toolbar'}
      >
        <Box direction={'row'} aria-label={'History actions'}>
          <ToolbarIconButton
            icon={Undo2}
            label={'Undo'}
            disabled={!props.canUndo}
            onClick={props.onUndo}
          />
          <ToolbarIconButton
            icon={Redo2}
            label={'Redo'}
            disabled={!props.canRedo}
            onClick={props.onRedo}
          />
        </Box>
      </Box>

      <Box
        class={styles.groupStyle}
        direction={'row'}
        p={'xs'}
        gap={'sm'}
        r={'md'}
        bg={'surface.high'}
        bc={'surface.higher'}
        bd={'thin'}
        shadow={'md'}
        aria-label={'Editor toolbar'}
      >
        <Box direction={'row'} aria-label={'Editor modes'}>
          <For each={tools}>
            {(tool) => (
              <ToolbarIconButton
                icon={tool.icon}
                label={tool.label}
                active={props.selectedTool === tool.id}
                onClick={() => props.onSelectTool(tool.id)}
              />
            )}
          </For>
          <Tooltip
            content={<Box text={'caption'}>{uploadStatus()}</Box>}
            placement={'top'}
            withArrow
            offset={12}
          >
            <Box as={'span'} direction={'row'}>
              <Button
                variant={'ghost'}
                size={'md'}
                p={'sm'}
                type={'icon'}
                disabled={uploading()}
                aria-label={'Import PNG'}
                onClick={handleImportClick}
              >
                <Icon name={ImagePlus} />
              </Button>
            </Box>
          </Tooltip>
          <input
            ref={setFileInput}
            type="file"
            accept="image/png"
            hidden
            onChange={handleFileChange}
          />
        </Box>
      </Box>

      <Box
        class={styles.groupStyle}
        direction={'row'}
        p={'xs'}
        gap={'sm'}
        r={'md'}
        bg={'surface.high'}
        bc={'surface.higher'}
        bd={'thin'}
        shadow={'md'}
        aria-label={'Brush tile picker'}
      >
        <Box direction={'row'} aria-label={'Brush tiles'}>
          <For each={props.tileTable}>
            {(tile) => (
              <Tooltip
                content={<Box text={'caption'}>{getTileDisplayName(tile)}</Box>}
                placement={'top'}
                withArrow
                offset={12}
              >
                <Box as={'span'} direction={'row'}>
                  <Button
                    variant={'ghost'}
                    size={'md'}
                    p={'sm'}
                    type={'icon'}
                    active={props.selectedBrushTileId === tile.tileId}
                    aria-label={`Use ${getTileDisplayName(tile)} brush`}
                    onClick={() => props.onSelectBrushTile(tile.tileId)}
                  >
                    <TilePreview tile={tile} size={18} />
                  </Button>
                </Box>
              </Tooltip>
            )}
          </For>
        </Box>
      </Box>
    </Box>
  );
}
