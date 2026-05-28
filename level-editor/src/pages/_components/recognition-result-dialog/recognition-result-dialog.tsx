import { Box, Button, Input, Item, Select, vars } from '@suis-ui/kit';
import { Save, ScanSearch } from 'lucide-solid';
import { createEffect, createMemo, createSignal } from 'solid-js';

import { Dialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import type { RecognitionPayload } from '@/models/level';
import { payloadPreviewStyle } from './recognition-result-dialog.css';

type RecognitionResultDialogProps = {
  open: boolean;
  payloads: RecognitionPayload[];
  selectedIndex: number | null;
  onClose: () => void;
  onInsertPayload: (payload: RecognitionPayload) => Promise<string | null>;
  onSelectIndex: (index: number | null) => void;
};

type InsertStatus = {
  type: 'error' | 'success';
  message: string;
};

type RecognitionResultOption = {
  value: string;
  label: string;
};

type RecognitionResultRenderValue = string | RecognitionResultOption;

const selectContentProps = { style: 'z-index: 1100' };

const formatPayload = (payload: RecognitionPayload) =>
  JSON.stringify(payload, null, 2);

const getPayloadLabel = (payload: RecognitionPayload, index: number) =>
  payload.name ??
  payload.id ??
  payload.image.name ??
  `Recognition Result ${index + 1}`;

const getSelectValue = (value: RecognitionResultRenderValue) =>
  typeof value === 'string' ? value : value.value;

export const RecognitionResultDialog = (
  props: RecognitionResultDialogProps,
) => {
  const [insertPending, setInsertPending] = createSignal(false);
  const [insertStatus, setInsertStatus] = createSignal<InsertStatus | null>(
    null,
  );
  const selectedPayload = createMemo(() => {
    const selectedIndex = props.selectedIndex;

    if (selectedIndex === null) {
      return null;
    }

    return props.payloads[selectedIndex] ?? null;
  });
  const options = createMemo(() =>
    props.payloads.map((payload, index) => ({
      value: String(index),
      label: getPayloadLabel(payload, index),
    })),
  );
  const selectedValue = () =>
    props.selectedIndex === null ? null : String(props.selectedIndex);
  const getOptionLabel = (value: string) =>
    options().find((option) => option.value === value)?.label ?? value;
  const statusColor = () => {
    if (insertStatus()?.type === 'error') {
      return 'error.main';
    }

    if (insertStatus()?.type === 'success') {
      return 'success.main';
    }

    return 'text.caption';
  };
  const handleSelectValue = (value: string | null) => {
    if (value === null) {
      props.onSelectIndex(null);
      return;
    }

    props.onSelectIndex(Number(value));
    setInsertStatus(null);
  };
  const handleInsert = async () => {
    const payload = selectedPayload();

    if (!payload) {
      setInsertStatus({
        type: 'error',
        message: '인식 결과가 없습니다.',
      });
      return;
    }

    setInsertPending(true);
    setInsertStatus(null);

    try {
      const layerId = await props.onInsertPayload(payload);

      if (!layerId) {
        setInsertStatus({
          type: 'error',
          message: '활성 레벨 스냅샷이 없습니다.',
        });
        return;
      }

      setInsertStatus({
        type: 'success',
        message: `${layerId} 레이어를 추가했습니다.`,
      });
    } catch (error) {
      setInsertStatus({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : '레이어 삽입에 실패했습니다.',
      });
    } finally {
      setInsertPending(false);
    }
  };

  createEffect(() => {
    if (!props.open) {
      return;
    }

    setInsertPending(false);
    setInsertStatus(null);
  });

  return (
    <Dialog
      open={props.open}
      title={'인식 결과'}
      description={`${props.payloads.length}개의 인식 결과를 가져왔습니다.`}
      onClose={props.onClose}
      footer={
        <>
          <Button variant={'ghost'} onClick={props.onClose}>
            {'취소'}
          </Button>
          <Button
            variant={'primary'}
            disabled={!selectedPayload() || insertPending()}
            onClick={handleInsert}
          >
            <Icon name={Save} />
            {'Insert Layer'}
          </Button>
        </>
      }
    >
      <Box w={'32rem'} maxW={'calc(100vw - 4rem)'} gap={'sm'}>
        <Item
          media={<Icon name={ScanSearch} />}
          size={'sm'}
          title={'Recognition Payload'}
          description={
            selectedPayload()
              ? getPayloadLabel(
                  selectedPayload() as RecognitionPayload,
                  props.selectedIndex ?? 0,
                )
              : '인식 결과 없음'
          }
        />
        <Select
          value={selectedValue()}
          onChangeValue={handleSelectValue}
          data={options()}
          placeholder={'인식 결과 없음'}
          contentProps={selectContentProps}
          renderValue={(value: RecognitionResultRenderValue) =>
            getOptionLabel(getSelectValue(value))
          }
        />
        <Input
          as={'textarea'}
          class={payloadPreviewStyle}
          w={'100%'}
          minH={'16rem'}
          maxH={'50vh'}
          value={
            selectedPayload()
              ? formatPayload(selectedPayload() as RecognitionPayload)
              : ''
          }
          readOnly
          spellcheck={false}
        />
        <Box
          minH={vars.font.caption.lineHeight}
          text={'caption'}
          c={statusColor()}
        >
          {insertStatus()?.message ??
            (props.payloads.length > 0
              ? '삽입할 인식 결과를 선택하세요.'
              : '인식 결과 없음')}
        </Box>
      </Box>
    </Dialog>
  );
};
