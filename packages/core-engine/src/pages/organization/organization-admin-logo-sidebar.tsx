import { Button, Input } from '@/components';
import { cn } from '@/lib/utils';
import { ImagePlus, X } from 'lucide-react';

export interface OrganizationAdminLogoSidebarProps {
  logoDisplayUrl: string | null;
  busy: boolean;
  onPickFile: (file: File | null) => void;
  onClear: () => void | Promise<void>;
  organizationName: string;
}

export function OrganizationAdminLogoSidebar({
  logoDisplayUrl,
  busy,
  onPickFile,
  onClear,
  organizationName,
}: OrganizationAdminLogoSidebarProps) {
  return (
    <div className='flex flex-col gap-2 border-b border-sidebar-border pb-3'>
      {logoDisplayUrl ? (
        <div className='flex items-center gap-4'>
          <div className='group relative h-12 w-12 shrink-0'>
            <img
              src={logoDisplayUrl}
              alt=''
              className='size-12 rounded-md border border-sidebar-border object-cover'
            />
            <Button
              type='button'
              variant='destructive'
              size='icon'
              className='absolute right-1 top-1 size-6 opacity-0 transition-opacity group-hover:opacity-100'
              disabled={busy}
              onClick={() => void onClear()}>
              <X className='size-3.5' />
              <span className='sr-only'>Remove logo</span>
            </Button>
          </div>
          <span className='text-xs'>{organizationName}</span>
        </div>
      ) : (
        <div className='flex items-center gap-4'>
          <label
            htmlFor='org-sidebar-logo'
            className={cn(
              'relative flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-md border border-dashed border-sidebar-border bg-sidebar-accent/30 text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
              busy && 'pointer-events-none opacity-50',
            )}
            aria-label='Upload organization logo'>
            <Input
              id='org-sidebar-logo'
              type='file'
              accept='image/*'
              disabled={busy}
              className='sr-only'
              onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
            />
            <ImagePlus className='size-5 shrink-0' aria-hidden />
          </label>
          <span className='min-w-0 truncate text-xs'>{organizationName}</span>
        </div>
      )}
    </div>
  );
}
