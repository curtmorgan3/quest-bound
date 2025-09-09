import {
  Character,
  Ruleset,
  useAddToShelf,
  useCurrentUser,
  useDeleteCharacter,
  useDeleteRuleset,
  useRemovePlaytester,
  useRuleset,
  useRulesetPermittedUsers,
  useUpdateRuleset,
} from '@/libs/compass-api';
import { Module } from '@/types';
import {
  Button,
  Drawer,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  Editable,
  EditableInput,
  EditablePreview,
  Heading,
  Image,
  Modal,
  ModalContent,
  ModalOverlay,
  Stack,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import { Extension, FileCopy, Groups, Newspaper, Person, Verified } from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateCharacter } from './components/create-character';

interface Props {
  selection?: Ruleset | Module | Character | null;
  onClose: () => void;
}

export const SelectionPanel = ({ selection, onClose }: Props) => {
  const { currentUser } = useCurrentUser();
  const navigate = useNavigate();

  // Need to get this in the cache in order to optimistically update the title
  const rulesetId = selection?.__typename === 'Ruleset' ? selection.id : '';
  useRuleset(rulesetId);

  const { updateRuleset } = useUpdateRuleset();
  const { deleteRuleset, loading: rulesetDeleting } = useDeleteRuleset();
  const { deleteCharacter, loading: characterDeleting } = useDeleteCharacter();
  const deleting = rulesetDeleting || characterDeleting;

  const { updatePermittedUser, updatePermissionLoading } = useRulesetPermittedUsers(
    selection?.id ?? '',
  );
  const { removePlaytester, loading: removingPlayer } = useRemovePlaytester();
  const { addToShelf, loading: copying } = useAddToShelf();

  const open = Boolean(selection);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [creatingCharacter, setCreatingCharacter] = useState(false);

  const title = (selection as Ruleset)?.title ?? (selection as Character)?.name;
  const byLine = (selection as Ruleset)?.createdBy ?? (selection as Character)?.rulesetTitle;

  const isCharacter = selection?.__typename === 'Character';
  const userIsCreator = currentUser?.id === (selection as Ruleset)?.userId;
  const isRuleset = !isCharacter;
  const isModule = (selection as Ruleset)?.isModule ?? false;
  const isCustom = !isCharacter && currentUser?.id === (selection as Ruleset)?.userId;
  const isPlayer = currentUser?.playtestRulesets?.some((r) => r.id === selection?.id);
  const isPublished = isRuleset && !isPlayer && (selection as Ruleset)?.published;
  const isOfficial = isRuleset && isPublished && selection?.createdBy === 'Quest Bound';
  const isCopied = isRuleset && Boolean((selection as Ruleset)?.publishedRulesetId);

  const collaborator = false;

  const canCreateModules =
    !isModule &&
    isPublished &&
    (JSON.parse((selection as Ruleset)?.rulesetPermissions ?? '{}').canShareModules ||
      userIsCreator);

  const showIconRow = isOfficial || isPlayer || collaborator || isModule || isCopied || isPublished;

  const handleOpen = () => {
    if (isRuleset) {
      navigate(`/rulesets/${selection?.id}/attributes`);
    } else {
      navigate(`/rulesets/${selection?.rulesetId}/characters/${selection?.id}?selected=sheet`);
    }
  };

  const handleDelete = async () => {
    if (!selection) return;
    if (isRuleset) {
      await deleteRuleset(selection.id);
    } else {
      await deleteCharacter(selection.id);
    }
    setConfirmDelete(false);
    onClose();
  };

  const handleRemove = async () => {
    if (!selection || !currentUser) return;
    if (isPlayer) {
      await removePlaytester(currentUser.id, selection.id);
    } else {
      await updatePermittedUser({
        rulesetId: selection.id,
        userId: currentUser.id,
        permission: 'READ',
        shelved: false,
      });
    }
    setConfirmRemove(false);
    onClose();
  };

  const handleCopy = async (isModule: boolean) => {
    if (!selection) return;
    await addToShelf(selection.id, isModule);
    onClose();
  };

  const handleRename = (title: string) => {
    if (!selection) return;
    updateRuleset({
      id: selection.id,
      title,
    });
  };

  return (
    <>
      <Drawer isOpen={open} onClose={onClose} placement='right' size='lg'>
        <DrawerOverlay />
        <DrawerContent>
          <Stack sx={{ height: '100%' }}>
            <DrawerCloseButton />
            <Image
              style={{ height: '40%' }}
              src={selection?.image?.src ?? undefined}
              alt={title}
              objectFit='cover'
              fallback={<></>}
            />
            <Stack padding={4} spacing={8}>
              {showIconRow && (
                <Stack direction='row' spacing={4}>
                  {isOfficial && (
                    <Tooltip label='Verified'>
                      <Verified />
                    </Tooltip>
                  )}
                  {isPlayer && (
                    <Tooltip label='You have been added as a player to this ruleset'>
                      <Person />
                    </Tooltip>
                  )}
                  {collaborator && (
                    <Tooltip label='You are a collaborator'>
                      <Groups />
                    </Tooltip>
                  )}

                  {isModule && (
                    <Tooltip label='Module'>
                      <Extension />
                    </Tooltip>
                  )}

                  {isCopied && (
                    <Tooltip label='Copied from Published'>
                      <FileCopy />
                    </Tooltip>
                  )}

                  {isPublished && (
                    <Tooltip label='Published'>
                      <Newspaper />
                    </Tooltip>
                  )}
                </Stack>
              )}

              <Stack>
                {isCustom ? (
                  <Editable
                    defaultValue={title}
                    fontSize='2rem'
                    fontStyle='bold'
                    onSubmit={handleRename}>
                    <EditablePreview />
                    <EditableInput />
                  </Editable>
                ) : (
                  <Heading size='lg'>{title}</Heading>
                )}
                {!isCustom && <Text fontStyle='italic'>{byLine}</Text>}
              </Stack>
              <Stack direction='row' spacing={4} flexWrap='wrap'>
                {(isCustom || !isRuleset) && (
                  <Tooltip label={`Open ${isRuleset ? 'ruleset' : 'character'}`}>
                    <Button onClick={handleOpen}>Open</Button>
                  </Tooltip>
                )}
                {isPublished && (
                  <Tooltip label='Add a copy of this ruleset to your custom rulesets'>
                    <Button isLoading={copying} onClick={() => handleCopy(false)}>
                      Copy
                    </Button>
                  </Tooltip>
                )}
                {!isModule && isRuleset && !isPlayer && (
                  <Tooltip
                    label={
                      canCreateModules
                        ? 'Create a module for this ruleset and add it to your custom rulesets'
                        : userIsCreator
                          ? 'You must publish this ruleset before creating modules'
                          : 'Modules are not enabled for this ruleset'
                    }>
                    <Button
                      isDisabled={!canCreateModules}
                      isLoading={copying}
                      onClick={() => handleCopy(true)}>
                      Create Module
                    </Button>
                  </Tooltip>
                )}
                {isRuleset && !isModule && (
                  <Tooltip label='Create a character from this ruleset'>
                    <Button onClick={() => setCreatingCharacter(true)}>Create Character</Button>
                  </Tooltip>
                )}
                {!isOfficial &&
                  (isCustom || !isRuleset ? (
                    <Tooltip
                      label={`Permanently delete this ${isRuleset ? 'ruleset' : 'character'}`}>
                      <Button onClick={() => setConfirmDelete(true)}>Delete</Button>
                    </Tooltip>
                  ) : (
                    <Tooltip label='Remove this ruleset from your shelf'>
                      <Button onClick={() => setConfirmRemove(true)}>Remove</Button>
                    </Tooltip>
                  ))}
              </Stack>
            </Stack>
          </Stack>
        </DrawerContent>
      </Drawer>

      <CreateCharacter
        isOpen={creatingCharacter}
        onClose={() => setCreatingCharacter(false)}
        selectedRulesetId={isRuleset ? selection?.id : undefined}
      />

      <Modal
        isOpen={confirmDelete || confirmRemove}
        onClose={() => {
          setConfirmDelete(false);
          setConfirmRemove(false);
        }}
        isCentered>
        <ModalOverlay />
        <ModalContent sx={{ maxWidth: '90dvw', width: '400px' }}>
          <Stack spacing={4} padding={4}>
            <Heading size='md'>
              {confirmRemove ? 'Remove this from your shelf?' : 'Permanently delete this content?'}
            </Heading>
            {isPlayer ? (
              <Text>
                You will no longer be able to create characters from this ruleset. Any characters
                you have already created will be deleted.
              </Text>
            ) : confirmRemove ? (
              <Text>
                If this content is still published, you can add it back to your shelf later.
              </Text>
            ) : (
              <Text>
                Are you sure you want to permanently delete this{' '}
                {isRuleset ? 'ruleset' : 'character'}?
              </Text>
            )}

            <Button
              isLoading={deleting || updatePermissionLoading || removingPlayer}
              onClick={confirmRemove ? handleRemove : handleDelete}>
              {confirmRemove ? 'Remove' : 'Delete'}
            </Button>
          </Stack>
        </ModalContent>
      </Modal>
    </>
  );
};
