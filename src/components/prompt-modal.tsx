import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePromptModalStore } from '@/stores/prompt-modal-store';

export function PromptModal() {
  const { open, multiple, input, msg, choices, select, confirm, submitInput, cancel } =
    usePromptModalStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelected(new Set());
      setInputValue('');
      cancel();
    }
  };

  const toggleChoice = (choice: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(choice)) {
        next.delete(choice);
      } else {
        next.add(choice);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    confirm(Array.from(selected));
    setSelected(new Set());
  };

  const handleSubmitInput = () => {
    submitInput(inputValue);
    setInputValue('');
  };

  if (input) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent showCloseButton={false} className='z-[1100]' overlayClassName='z-[1100]'>
          <DialogHeader>
            <DialogTitle>{msg || 'Enter a value'}</DialogTitle>
          </DialogHeader>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmitInput();
            }}
            autoFocus
          />
          <div className='flex justify-end gap-2 pt-2'>
            <Button variant='ghost' onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitInput}>Submit</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!multiple) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent showCloseButton={false} className='z-[1100]' overlayClassName='z-[1100]'>
          <DialogHeader>
            <DialogTitle>{msg || 'Choose an option'}</DialogTitle>
          </DialogHeader>
          <div className='flex gap-2 flex-wrap justify-start'>
            {choices.map((choice) => (
              <Button
                key={choice}
                variant='outline'
                className='sm:w-auto'
                onClick={() => select(choice)}>
                {choice}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className='z-[1100]' overlayClassName='z-[1100]'>
        <DialogHeader>
          <DialogTitle>{msg || 'Choose options'}</DialogTitle>
        </DialogHeader>
        <div className='flex gap-2 flex-wrap justify-start'>
          {choices.map((choice) => (
            <Button
              key={choice}
              variant={selected.has(choice) ? 'default' : 'outline'}
              className='sm:w-auto'
              onClick={() => toggleChoice(choice)}>
              {choice}
            </Button>
          ))}
        </div>
        <div className='flex justify-end gap-2 pt-2'>
          <Button variant='ghost' onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
