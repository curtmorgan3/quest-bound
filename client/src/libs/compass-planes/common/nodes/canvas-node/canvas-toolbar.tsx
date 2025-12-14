import { IconColorPicker } from '@/libs/compass-core-composites';
import { IconButton, Stack, Tooltip } from '@/libs/compass-core-ui';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/dist/types/excalidraw/types';
import { Create, Gradient, HighlightAlt, PanTool } from '@mui/icons-material';

export type ExcalidrawTool =
  | 'hand'
  | 'eraser'
  | 'selection'
  | 'freedraw'
  | 'text'
  | 'arrow'
  | 'line'
  | 'rectangle'
  | 'diamond'
  | 'ellipse'
  | 'image'
  | 'frame'
  | 'magicframe'
  | 'embeddable'
  | 'laser'
  | 'custom';

interface CanvasToolbarProps {
  drawApi: ExcalidrawImperativeAPI | null;
  activeToolSelection: ExcalidrawTool;
  fontColor: string;
  setFontColor: (color: string) => void;
  disabled?: boolean;
  hide?: boolean;
}

export const CanvasToolbar = ({
  drawApi,
  disabled,
  activeToolSelection,
  hide,
  fontColor,
  setFontColor,
}: CanvasToolbarProps) => {
  const selectTool = (tool: any) => {
    drawApi?.setActiveTool({
      type: tool,
      locked: true,
    });
  };

  return (
    <Stack
      direction='row'
      justifyContent='center'
      alignItems='center'
      width='100%'
      minWidth={275}
      spacing={2}
      height='50px'>
      {hide ? null : (
        <>
          <Tooltip title='Move'>
            <IconButton
              onClick={() => selectTool('hand')}
              disabled={disabled}
              sx={{
                color: activeToolSelection === 'hand' ? 'secondary.main' : 'inherit',
              }}>
              <PanTool fontSize='small' />
            </IconButton>
          </Tooltip>
          <Tooltip title='Erase'>
            <IconButton
              onClick={() => selectTool('eraser')}
              disabled={disabled}
              sx={{
                color: activeToolSelection === 'eraser' ? 'secondary.main' : 'inherit',
              }}>
              <Gradient fontSize='small' />
            </IconButton>
          </Tooltip>
          <Tooltip title='Select'>
            <IconButton
              onClick={() => selectTool('selection')}
              disabled={disabled}
              sx={{
                color: activeToolSelection === 'selection' ? 'secondary.main' : 'inherit',
              }}>
              <HighlightAlt fontSize='small' />
            </IconButton>
          </Tooltip>

          <Tooltip title='Draw'>
            <IconButton
              onClick={() => selectTool('freedraw')}
              disabled={disabled}
              sx={{
                color: activeToolSelection === 'freedraw' ? 'secondary.main' : 'inherit',
              }}>
              <Create fontSize='small' />
            </IconButton>
          </Tooltip>

          <IconColorPicker
            disabled={disabled}
            type='draw'
            color={fontColor}
            onChange={(color) => setFontColor(color)}
            onClose={() => {
              () => selectTool('freedraw');
            }}
          />
        </>
      )}
    </Stack>
  );
};
