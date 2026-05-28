import { Box, Popup } from '@suis-ui/kit';
import { FocusManager, type FocusManagerProps } from '@suis-ui/primitives';
import { createSignal, createUniqueId, type JSX, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { anchorStyle, backdropStyle, dialogAnimation } from './dialog.css';

type DialogProps = {
  open: boolean;
  title: JSX.Element;
  description?: JSX.Element;
  onClose: () => void;
  children: JSX.Element;
  footer?: JSX.Element;
  initialFocusRef?: () => HTMLElement | null | undefined;
  closeOnBackdrop?: boolean;
};

export const Dialog = (props: DialogProps) => {
  const [panelElement, setPanelElement] = createSignal<HTMLDivElement>();

  const titleId = createUniqueId();
  const descriptionId = createUniqueId();
  const focusTargets = () => {
    const target = props.initialFocusRef?.() ?? panelElement();

    return target ? [target] : [];
  };

  const focusMapper: NonNullable<FocusManagerProps['floatingMapper']> = (
    _move,
    _enter,
    restoreFloatingFocus,
  ) => ({
    Escape: () => {
      restoreFloatingFocus();
      props.onClose();
    },
  });
  const handleBackdropMouseDown: JSX.EventHandler<
    HTMLDivElement,
    MouseEvent
  > = (event) => {
    if (props.closeOnBackdrop === false) {
      return;
    }

    if (event.target === event.currentTarget) {
      props.onClose();
    }
  };

  return (
    <Popup
      open={props.open}
      placement={'bottom-start'}
      strategy={'fixed'}
      offset={0}
      shift={false}
      flip={false}
      animation={dialogAnimation}
      element={
        <Box
          class={backdropStyle}
          role={'presentation'}
          w={'100vw'}
          h={'100vh'}
          align={'center'}
          justify={'center'}
          onMouseDown={handleBackdropMouseDown}
        >
          <FocusManager
            enable={props.open}
            trap
            floating={focusTargets()}
            floatingMapper={focusMapper}
          >
            <Box
              ref={setPanelElement}
              role={'dialog'}
              aria-modal={true}
              aria-labelledby={titleId}
              aria-describedby={props.description ? descriptionId : undefined}
              tabIndex={-1}
              minW={'30rem'}
              bg={'surface.main'}
              bc={'surface.higher'}
              shadow={'md'}
              p={'xl'}
              r={'lg'}
              gap={'md'}
            >
              <Box id={titleId} text={'title'}>
                {props.title}
              </Box>
              <Show when={props.description}>
                {(description) => (
                  <Box id={descriptionId} text={'body'}>
                    {description()}
                  </Box>
                )}
              </Show>
              {props.children}
              <Show when={props.footer}>
                {(footer) => (
                  <Box direction={'row'} justify={'flex-end'} gap={'xs'}>
                    {footer()}
                  </Box>
                )}
              </Show>
            </Box>
          </FocusManager>
        </Box>
      }
    >
      <Portal>
        <Box
          as={'span'}
          class={anchorStyle}
          pos={'fixed'}
          top={'0'}
          left={'0'}
          w={'0'}
          h={'0'}
          aria-hidden={true}
        />
      </Portal>
    </Popup>
  );
};
