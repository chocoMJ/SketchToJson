import { Box, Button, Input, Item, Select } from '@suis-ui/kit';
import {
  Grid3X3,
  Minus,
  Plus,
  RotateCcw,
  ScanSearch,
  SlidersHorizontal,
} from 'lucide-solid';
import { createSignal } from 'solid-js';

import { Icon } from '@/components/ui/icon';
import { Slider } from '@/components/ui/slider';
import {
  type RecognitionPayload,
  RecognitionPayloadSchema,
} from '@/models/level';
import * as styles from './property-panel.css';
import { recognitionDebugSamples } from './recognition-debug-samples';

type PropertyPanelProps = {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onInsertRecognitionPayload: (payload: RecognitionPayload) => string | null;
};

const ZOOM_MIN = 25;
const ZOOM_MAX = 200;
const ZOOM_STEP = 5;
const ZOOM_DEFAULT = 100;

const clampZoom = (zoom: number) =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));

type DebugStatus = {
  type: 'error' | 'success';
  message: string;
};

const sampleOptions = recognitionDebugSamples.map((sample) => ({
  value: sample.id,
  label: sample.label,
}));

const formatPayload = (payload: RecognitionPayload) =>
  JSON.stringify(payload, null, 2);

export function PropertyPanel(props: PropertyPanelProps) {
  const firstSample = recognitionDebugSamples[0];
  const [selectedSampleId, setSelectedSampleId] = createSignal<string>(
    firstSample.id,
  );
  const [payloadText, setPayloadText] = createSignal(
    formatPayload(firstSample.payload),
  );
  const [debugStatus, setDebugStatus] = createSignal<DebugStatus | null>(null);
  const handleZoomStep = (delta: number) => {
    props.onZoomChange(clampZoom(props.zoom + delta));
  };
  const handleSampleChange = (sampleId: string | null) => {
    if (!sampleId) {
      return;
    }

    const sample = recognitionDebugSamples.find(
      (candidate) => candidate.id === sampleId,
    );

    if (!sample) {
      return;
    }

    setSelectedSampleId(sample.id);
    setPayloadText(formatPayload(sample.payload));
    setDebugStatus(null);
  };
  const handleInsertLayer = () => {
    let parsedPayload: unknown;

    try {
      parsedPayload = JSON.parse(payloadText());
    } catch {
      setDebugStatus({
        type: 'error',
        message: 'JSON parse failed.',
      });
      return;
    }

    const result = RecognitionPayloadSchema.safeParse(parsedPayload);

    if (!result.success) {
      const issue = result.error.issues[0];

      setDebugStatus({
        type: 'error',
        message: issue
          ? `${issue.path.join('.') || 'payload'}: ${issue.message}`
          : 'Payload validation failed.',
      });
      return;
    }

    const layerId = props.onInsertRecognitionPayload(result.data);

    if (!layerId) {
      setDebugStatus({
        type: 'error',
        message: 'No active level snapshot.',
      });
      return;
    }

    setDebugStatus({
      type: 'success',
      message: `Inserted ${layerId}.`,
    });
  };

  return (
    <Box
      as={'aside'}
      class={styles.panel}
      direction={'column'}
      gap={'sm'}
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
          <Box class={styles.zoomValue}>{`${props.zoom}%`}</Box>
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

      <Box class={styles.section} direction={'column'} gap={'xs'}>
        <Item
          media={<Icon name={ScanSearch} />}
          size={'sm'}
          title={'CV Debug'}
          action={
            <Button variant={'primary'} size={'sm'} onClick={handleInsertLayer}>
              {'Insert Layer'}
            </Button>
          }
        />
        <Select
          value={selectedSampleId()}
          onChangeValue={handleSampleChange}
          data={sampleOptions}
          placeholder={'Sample'}
          contentProps={{ style: 'z-index: 100' }}
        />
        <Input
          as={'textarea'}
          class={styles.debugTextarea}
          value={payloadText()}
          spellcheck={false}
          onInput={(event) => setPayloadText(event.currentTarget.value)}
        />
        <Box
          classList={{
            [styles.debugStatus]: true,
            [styles.debugStatusError]: debugStatus()?.type === 'error',
            [styles.debugStatusSuccess]: debugStatus()?.type === 'success',
          }}
          text={'caption'}
        >
          {debugStatus()?.message ?? 'Paste or edit a recognition payload.'}
        </Box>
      </Box>
    </Box>
  );
}
