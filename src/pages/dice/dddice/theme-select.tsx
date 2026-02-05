import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { colorWhite } from '@/palette';
import { DiceContext } from '@/stores';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useContext, useState } from 'react';
import type { DiceTheme } from '../types';

export const DiceThemes = () => {
  const { setTheme, getThemes } = useContext(DiceContext);

  const [themes, setThemes] = useState<DiceTheme[]>([]);
  const [page, setPage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [themesOpen, setThemesOpen] = useState<boolean>(false);

  const themesThisPage = themes.slice(page * 6, page * 6 + 6);
  const finalPage = page === Math.floor(themes.length / 6);

  const handleGetThemes = async () => {
    setLoading(true);
    const res = await getThemes();
    setThemes(
      (res.data ?? []).map((theme: any) => ({
        label: theme.name,
        previews: theme.preview,
        id: theme.id,
        availableDice: theme.available_dice ?? [],
        bannerPreview:
          theme.preview.preview ?? theme.preview.d20 ?? Object.values(theme.preview)[0] ?? '',
      })),
    );
    setLoading(false);
  };

  return (
    <div className='flex w-full flex-col items-start gap-2'>
      <Button
        variant='link'
        style={{ color: colorWhite }}
        className='h-auto p-0 font-normal underline'
        onClick={() => {
          setThemesOpen((prev) => !prev);
          handleGetThemes();
        }}>
        {themesOpen ? 'Close Themes' : 'Select Theme'}
      </Button>

      {themesOpen && (
        <div className='flex w-full max-w-md flex-row items-center justify-between gap-2 overflow-hidden'>
          <Button
            variant='ghost'
            size='icon'
            disabled={page === 0}
            onClick={() => setPage((prev) => Math.max(0, prev - 1))}>
            <ArrowLeft className='h-4 w-4' />
          </Button>

          {loading && (
            <div className='flex h-2 w-full items-center'>
              <Progress value={50} />
            </div>
          )}

          {!loading &&
            themesThisPage.map((theme) => (
              <Tooltip key={theme.id}>
                <TooltipTrigger asChild>
                  <button
                    type='button'
                    className='flex size-10 items-center justify-center rounded-md border bg-background hover:bg-accent'
                    onClick={() => {
                      setTheme(theme);
                      setThemesOpen(false);
                    }}>
                    <img
                      src={theme.bannerPreview}
                      alt={theme.label}
                      className='h-8 w-8 rounded object-cover'
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <Text>{theme.label}</Text>
                </TooltipContent>
              </Tooltip>
            ))}

          <Button
            variant='ghost'
            size='icon'
            disabled={finalPage}
            onClick={() => setPage((prev) => Math.min(themes.length / 6, prev + 1))}>
            <ArrowRight className='h-4 w-4' />
          </Button>
        </div>
      )}
    </div>
  );
};
