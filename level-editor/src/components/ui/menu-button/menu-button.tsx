import { Box, Button, type ButtonProps, Item, Popup } from '@suis-ui/kit';
import { createSignal, For, splitProps, type ValidComponent } from 'solid-js';
import { Icon, type IconType } from '../icon';

type MenuItem = {
  label: string;
  icon?: IconType;
  onClick: () => void;
};
type MenuButtonOnlyProps = {
  items: MenuItem[];
};
export type MenuButtonProps<T extends ValidComponent = 'button'> = Omit<
  ButtonProps<T>,
  keyof MenuButtonOnlyProps
> &
  MenuButtonOnlyProps;
export const MenuButton = <T extends ValidComponent = 'button'>(
  props: MenuButtonProps<T>,
) => {
  const [local, rest] = splitProps(props, ['items']);

  const [open, setOpen] = createSignal(false);

  const handleClick = (event: MouseEvent) => {
    setOpen(!open());
    return rest.onClick?.(event);
  };

  return (
    <Popup
      open={open()}
      element={
        <Box
          as={'ul'}
          aria-label={'Menu'}
          direction={'column'}
          gap={'xs'}
          p={'xs'}
          r={'md'}
          bg={'surface.main'}
          bc={'surface.higher'}
          bd={'md'}
          shadow={'md'}
        >
          <For each={local.items}>
            {(item) => (
              <Item
                title={item.label}
                media={item.icon ? <Icon name={item.icon} /> : undefined}
                onClick={item.onClick}
              />
            )}
          </For>
        </Box>
      }
    >
      <Button {...(rest as unknown as ButtonProps<T>)} onClick={handleClick} />
    </Popup>
  );
};
