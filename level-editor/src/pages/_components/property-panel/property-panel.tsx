import { Box, Button, Item, vars } from '@suis-ui/kit';
import {
  Grid3X3,
  Minus,
  Plus,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-solid';

import { Icon } from '@/components/ui/icon';
import { Slider } from '@/components/ui/slider';
import * as styles from './property-panel.css';

type PropertyPanelProps = {
  zoom: number;
  onZoomChange: (zoom: number) => void;
};

const ZOOM_MIN = 25;
const ZOOM_MAX = 200;
const ZOOM_STEP = 5;
const ZOOM_DEFAULT = 100;

const clampZoom = (zoom: number) =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));

export function PropertyPanel(props: PropertyPanelProps) {
  const handleZoomStep = (delta: number) => {
    props.onZoomChange(clampZoom(props.zoom + delta));
  };

  return (
    <Box
      as={'aside'}
      class={styles.panel}
      pos={'absolute'}
      z={10}
      top={vars.size.space.lg}
      right={vars.size.space.lg}
      direction={'column'}
      gap={'sm'}
      w={'22rem'}
      maxH={`calc(100vh - (${vars.size.space.lg} * 2))`}
      overflow={'auto'}
      bg={'surface.high'}
      bc={'surface.higher'}
      bd={'thin'}
      p={'sm'}
      r={'lg'}
      shadow={'xl'}
      aria-label={'Properties'}
    >
      <Item
        media={<Icon name={SlidersHorizontal} />}
        size={'sm'}
        title={'Properties'}
      />

      <Item
        media={<Icon name={Grid3X3} />}
        size={'sm'}
        title={'Grid Size'}
        action={<Box text={'caption'}>{'32px'}</Box>}
      />
      <Box>
        <Slider
          aria-label={'Zoom'}
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={ZOOM_STEP}
          value={props.zoom}
          onChange={(value: number) => props.onZoomChange(clampZoom(value))}
        />
        <Box direction={'row'} align={'center'} justify={'space-between'}>
          <Box class={styles.zoomValue} text={'body'}>
            {`${props.zoom}%`}
          </Box>
          <Box direction={'row'} gap={'xxs'}>
            <Button
              variant={'ghost'}
              type={'icon'}
              size={'sm'}
              aria-label={'Zoom out'}
              onClick={() => handleZoomStep(-ZOOM_STEP)}
            >
              <Icon name={Minus} />
            </Button>
            <Button
              variant={'ghost'}
              type={'icon'}
              size={'sm'}
              aria-label={'Reset zoom'}
              onClick={() => props.onZoomChange(ZOOM_DEFAULT)}
            >
              <Icon name={RotateCcw} />
            </Button>
            <Button
              variant={'ghost'}
              type={'icon'}
              size={'sm'}
              aria-label={'Zoom in'}
              onClick={() => handleZoomStep(ZOOM_STEP)}
            >
              <Icon name={Plus} />
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
