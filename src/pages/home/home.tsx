import { Button, Input, Textarea } from '@/components';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useRulesets } from '@/lib/compass-api';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const Home = () => {
  const { rulesets, createRuleset, deleteRuleset } = useRulesets();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const navigate = useNavigate();

  const handleCreate = async () => {
    await createRuleset({
      title: title || 'New Ruleset',
      description,
    });
  };
  return (
    <div className='flex h-full w-full flex-col p-4 gap-4'>
      <h1 className='text-4xl font-bold'>Rulesets</h1>
      <Dialog>
        <form>
          <DialogTrigger asChild>
            <Button className='w-[180px]' data-testid='create-ruleset-button'>
              Create New
            </Button>
          </DialogTrigger>
          <DialogContent className='sm:max-w-[425px]'>
            <DialogHeader>
              <DialogTitle>New Ruleset</DialogTitle>
            </DialogHeader>
            <div className='grid gap-4'>
              <div className='grid gap-3'>
                <Label htmlFor='ruleset-title'>Title</Label>
                <Input
                  id='ruleset-title'
                  name='title'
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className='grid gap-3'>
                <Label htmlFor='ruleset-description'>Description</Label>
                <Textarea
                  id='ruleset-description'
                  name='username'
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant='outline'>Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button data-testid='create-ruleset-submit' onClick={handleCreate}>
                  Create
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </form>
      </Dialog>

      <div className='flex flex-row gap-2 flex-wrap'>
        {rulesets?.map((r) => (
          <Card
            key={r.id}
            className='p-4 w-[350px] h-[280px] flex flex-col justify-between'
            data-testid={`ruleset-card-${r.id}`}
            style={
              r.image
                ? {
                    background: `url(${r.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }>
            <CardHeader>
              <CardTitle className='text-lg'>{r.title}</CardTitle>
            </CardHeader>
            <CardDescription className='grow-1'>{r.description}</CardDescription>
            <div className='flex gap-2 mt-2 bg-secondary rounded-md p-2 justify-between items-center'>
              <Button 
                variant='ghost' 
                onClick={() => deleteRuleset(r.id)} 
                className='text-red-500'
                data-testid={`delete-ruleset-${r.id}`}>
                Delete
              </Button>
              <CardAction>
                <Button 
                  variant='link' 
                  onClick={() => navigate(`/rulesets/${r.id}`)}
                  data-testid={`open-ruleset-${r.id}`}>
                  Open
                </Button>
              </CardAction>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
