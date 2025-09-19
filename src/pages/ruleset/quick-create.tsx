import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Textarea,
} from '@/components';
import { DialogTitle } from '@radix-ui/react-dialog';
import { SelectValue } from '@radix-ui/react-select';
import { FileSpreadsheet, HandFist, Sword, UserRoundPen } from 'lucide-react';
import { useEffect, useState } from 'react';

const iconset = {
  attributes: UserRoundPen,
  actions: HandFist,
  items: Sword,
  charts: FileSpreadsheet,
};

interface QuickCreateProps {
  type: 'attributes' | 'items' | 'actions' | 'charts';
  onCreate: (data: any) => void;
}

export const QuickCreate = ({ type, onCreate }: QuickCreateProps) => {
  const [activeType, setActiveType] = useState<string>(type ?? 'attributes');

  useEffect(() => {
    setActiveType(type);
  }, [type]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [defaultValue, setDefaultValue] = useState<string | number>('');
  const [defaultBoolean, setDefaultBoolean] = useState(false);

  const [typeValue, setTypeValue] = useState('string');

  const handleCreate = () => {
    onCreate({
      title,
      description,
      category,
    });
    setTitle('');
    setDescription('');
    setDefaultBoolean(false);
    setDefaultValue('');

    document.getElementById('create-title')?.focus();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className='w-[180px]'>New</Button>
      </DialogTrigger>
      <DialogContent className='min-w-[600px] max-w-[80vw] min-h-[50vh]'>
        <DialogTitle className='hidden'>Quick Create</DialogTitle>
        <div>
          <div className='flex justify-around items-center gap-2 mb-4'>
            <Button
              variant={activeType === 'attributes' ? 'default' : 'outline'}
              onClick={() => setActiveType('attributes')}>
              <iconset.attributes />
            </Button>
            <Button
              variant={activeType === 'actions' ? 'default' : 'outline'}
              onClick={() => setActiveType('actions')}>
              <iconset.actions />
            </Button>
            <Button
              variant={activeType === 'items' ? 'default' : 'outline'}
              onClick={() => setActiveType('items')}>
              <iconset.items />
            </Button>
            <Button
              variant={activeType === 'charts' ? 'default' : 'outline'}
              onClick={() => setActiveType('charts')}>
              <iconset.charts />
            </Button>
          </div>

          <div className='grid gap-4'>
            <div className='w-full flex flex-row gap-4'>
              <div className='grid gap-3 w-[50%]'>
                <Label htmlFor='create-title'>Title</Label>
                <Input
                  autoFocus
                  id='create-title'
                  name='title'
                  onChange={(e) => setTitle(e.target.value)}
                  value={title}
                />
              </div>
              <div className='grid gap-3 w-[50%]'>
                <Label htmlFor='create-category'>Category</Label>
                <Input
                  id='create-category'
                  name='category'
                  onChange={(e) => setCategory(e.target.value)}
                  value={category}
                />
              </div>
            </div>
            {activeType === 'attributes' && (
              <div className='w-full flex flex-row gap-4'>
                <div className='grid gap-3 w-[50%]'>
                  <Label htmlFor='create-type'>Type</Label>
                  <Select value={typeValue} onValueChange={setTypeValue}>
                    <SelectTrigger className='w-[100%]'>
                      <SelectValue placeholder='Type' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='string'>Text</SelectItem>
                      <SelectItem value='number'>Number</SelectItem>
                      <SelectItem value='boolean'>Boolean</SelectItem>
                      <SelectItem value='enum'>List</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='grid gap-3 w-[50%]'>
                  <Label htmlFor='create-category'>Default</Label>
                  {typeValue === 'boolean' ? (
                    <Checkbox
                      checked={defaultBoolean}
                      onCheckedChange={(checked) => setDefaultBoolean(!!checked)}
                    />
                  ) : (
                    <Input
                      id='create-default'
                      name='default'
                      type={typeValue === 'number' ? 'number' : 'text'}
                      onChange={(e) => setDefaultValue(e.target.value)}
                      value={defaultValue}
                    />
                  )}
                </div>
              </div>
            )}

            <div className='grid gap-3'>
              <Label htmlFor='create-description'>Description</Label>
              <Textarea
                id='create-description'
                name='description'
                onChange={(e) => setDescription(e.target.value)}
                value={description}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type='submit' className='w-full' onClick={handleCreate}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
