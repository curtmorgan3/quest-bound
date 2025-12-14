import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
} from '@chakra-ui/react';
import { ReactNode, type JSX } from 'react';

export interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
}

export const Confirm = ({
  open,
  onClose,
  onConfirm,
  title,
  children,
  loading,
  disabled,
}: ConfirmProps): JSX.Element => {
  const actions = [
    {
      label: 'Cancel',
      onClick: onClose,
    },
    {
      label: 'Confirm',
      onClick: onConfirm,
      disabled,
      isPrimary: true,
    },
  ];

  return (
    <Modal isOpen={open} isCentered onClose={loading ? () => {} : onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody>{children}</ModalBody>
        <ModalFooter>
          <Stack direction='row' spacing={4}>
            {actions.map((action) => (
              <Button
                key={action.label}
                onClick={action.onClick}
                isDisabled={action.disabled}
                isLoading={action.isPrimary && loading}>
                {action.label}
              </Button>
            ))}
          </Stack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
