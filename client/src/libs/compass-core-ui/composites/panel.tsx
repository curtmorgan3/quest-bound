import CloseIcon from '@mui/icons-material/Close';
import { CSSProperties, forwardRef, ReactNode, type JSX } from 'react';
import { Drawer, IconButton, Stack } from '../components';
import { useDeviceSize } from '../hooks';

interface PanelProps {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  size?: 'small' | 'medium' | 'large';
  anchor?: 'left' | 'right';
  variant?: 'persistent' | 'temporary' | 'permanent';
  style?: CSSProperties;
  id?: string;
  keepMounted?: boolean;
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  (
    {
      children,
      open,
      id,
      onClose,
      anchor = 'right',
      size = 'small',
      variant = 'temporary',
      style,
      title,
      keepMounted = true,
    },
    ref,
  ): JSX.Element => {
    const { mobile } = useDeviceSize();

    const drawerSizes = {
      small: {
        width: mobile ? '90vw' : '25vw',
        minWidth: mobile ? '300px' : '500px',
      },
      medium: {
        width: mobile ? '90vw' : '50vw',
        minWidth: mobile ? '300px' : '800px',
      },
      large: {
        width: '90vw',
      },
    };

    return (
      <Drawer
        open={open}
        anchor={anchor}
        variant={variant}
        onClose={onClose}
        ModalProps={{
          keepMounted,
        }}>
        <Stack
          id={id}
          ref={ref}
          sx={{ ...drawerSizes[size as keyof typeof drawerSizes], height: '100%', ...style }}
          spacing={4}
          paddingTop={4}
          alignItems='center'>
          <Stack
            direction='row'
            justifyContent='space-between'
            alignItems='center'
            width='100%'
            padding={2}
            sx={{
              bgcolor: style?.backgroundColor ?? 'background.default',
              position: 'absolute',
              top: 0,
            }}>
            {!!title && anchor === 'left' && title}
            <IconButton aria-label='Close' onClick={onClose} sx={{ bgcolor: 'background.default' }}>
              <CloseIcon />
            </IconButton>
            {!!title && anchor === 'right' && title}
          </Stack>
          {children}
        </Stack>
      </Drawer>
    );
  },
);
