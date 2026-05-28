import { Box } from '@suis-ui/kit';

import { colorInputStyle, colorValueStyle } from './color-input.css';

type ColorInputProps = {
  value: string;
  onInput: (value: string) => void;
};

export const ColorInput = (props: ColorInputProps) => (
  <Box direction={'row'} align={'center'} gap={'xs'}>
    <Box
      as={'input'}
      w={'2.4rem'}
      h={'2.4rem'}
      minH={'2.4rem'}
      p={'none'}
      overflow={'hidden'}
      c={'transparent'}
      r={'xxl'}
      bc={'surface.higher'}
      bd={'md'}
      type={'color'}
      value={props.value}
      onInput={(event: InputEvent) =>
        props.onInput((event.target as HTMLInputElement).value)
      }
      style={{ 'background-color': props.value }}
      class={colorInputStyle}
    />
    <Box
      as={'span'}
      class={colorValueStyle}
      text={'caption'}
      c={'text.caption'}
      overflow={'hidden'}
    >
      {props.value.toUpperCase()}
    </Box>
  </Box>
);
