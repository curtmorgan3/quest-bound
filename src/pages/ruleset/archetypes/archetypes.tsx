import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Card,
  Input,
  Label,
} from '@/components';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useArchetypes } from '@/lib/compass-api';
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

export const Archetypes = () => {
  const { rulesetId } = useParams();
  const { archetypes, createArchetype, updateArchetype, deleteArchetype, reorderArchetypes } =
    useArchetypes(rulesetId);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createArchetype({ name: newName.trim(), description: newDescription.trim() });
    setNewName('');
    setNewDescription('');
    setCreateOpen(false);
  };

  const startEdit = (id: string) => {
    const a = archetypes.find((x) => x.id === id);
    if (a) {
      setEditingId(id);
      setEditName(a.name);
      setEditDescription(a.description ?? '');
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateArchetype(editingId, {
      name: editName.trim(),
      description: editDescription.trim(),
    });
    setEditingId(null);
  };

  const moveUp = async (index: number) => {
    if (index <= 0) return;
    const ids = archetypes.map((a) => a.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    await reorderArchetypes(ids);
  };

  const moveDown = async (index: number) => {
    if (index >= archetypes.length - 1) return;
    const ids = archetypes.map((a) => a.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    await reorderArchetypes(ids);
  };

  const doNotAsk = localStorage.getItem('qb.confirmOnDelete') === 'false';

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex gap-2'>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className='w-[180px]' data-testid='archetypes-new-button'>
              <Plus className='h-4 w-4' />
              New Archetype
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Archetype</DialogTitle>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='grid gap-2'>
                <Label htmlFor='archetype-name'>Name</Label>
                <Input
                  id='archetype-name'
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder='e.g. Fighter'
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='archetype-desc'>Description</Label>
                <Input
                  id='archetype-desc'
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder='Optional description'
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!newName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className='flex flex-col gap-2' data-testid='archetypes-list'>
        {archetypes.length > 0 && (
          <p className='italic text-sm text-muted-foreground'>
            Order determines default load order of archetype scripts. This is overridable during
            character creation.
          </p>
        )}
        {archetypes.map((archetype, index) => (
          <Card
            key={archetype.id}
            className='p-4 flex flex-row items-center gap-3'
            data-testid={`archetype-item-${archetype.id}`}>
            <div className='flex flex-col gap-0'>
              <Button
                variant='ghost'
                size='icon'
                className='h-6 w-6'
                onClick={() => moveUp(index)}
                disabled={index === 0}>
                <ChevronUp className='h-4 w-4' />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                className='h-6 w-6'
                onClick={() => moveDown(index)}
                disabled={index === archetypes.length - 1}>
                <ChevronDown className='h-4 w-4' />
              </Button>
            </div>
            <GripVertical className='h-4 w-4 text-muted-foreground shrink-0' />
            <div className='flex-1 min-w-0'>
              {editingId === archetype.id ? (
                <div className='flex flex-col gap-2'>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder='Name'
                  />
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder='Description'
                  />
                  <div className='flex gap-2'>
                    <Button size='sm' onClick={saveEdit}>
                      Save
                    </Button>
                    <Button size='sm' variant='outline' onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className='font-medium flex items-center gap-2'>
                    {archetype.name}
                    {archetype.isDefault && (
                      <span className='text-xs text-muted-foreground'>(default)</span>
                    )}
                  </div>
                  {archetype.description && (
                    <p className='text-sm text-muted-foreground mt-0.5'>{archetype.description}</p>
                  )}
                  {archetype.scriptId && (
                    <Link
                      to={`/rulesets/${rulesetId}/scripts/${archetype.scriptId}`}
                      className='text-sm text-primary hover:underline'>
                      View script
                    </Link>
                  )}
                </div>
              )}
            </div>
            {editingId !== archetype.id && (
              <div className='flex gap-1 shrink-0'>
                <Button variant='ghost' size='sm' onClick={() => startEdit(archetype.id)}>
                  Edit
                </Button>
                {!archetype.isDefault &&
                  (doNotAsk ? (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='text-destructive'
                      onClick={() => deleteArchetype(archetype.id)}
                      data-testid='archetype-delete-btn'
                      aria-label={`Delete ${archetype.name}`}>
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='text-destructive'
                          data-testid='archetype-delete-btn'
                          aria-label={`Delete ${archetype.name}`}>
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete archetype?</AlertDialogTitle>
                          This will delete the test character and all character associations. This
                          cannot be undone.
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className='bg-destructive text-destructive-foreground'
                            onClick={() => deleteArchetype(archetype.id)}
                            data-testid='archetype-delete-confirm'>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      {archetypes.length === 0 && (
        <p className='text-muted-foreground py-8'>No archetypes yet. Create one to get started.</p>
      )}
    </div>
  );
};
