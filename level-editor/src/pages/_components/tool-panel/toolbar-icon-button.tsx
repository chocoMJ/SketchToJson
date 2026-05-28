import { Box, Button, Tooltip } from '@suis-ui/kit';

import { Icon, type IconType } from '@/components/ui/icon';

type ToolbarIconButtonProps = {
  active?: boolean;
  disabled?: boolean;
  icon: IconType;
  label: string;
  onClick: () => void;
};

export const ToolbarIconButton = (props: ToolbarIconButtonProps) => (
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
