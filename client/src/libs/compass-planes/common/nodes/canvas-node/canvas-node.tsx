import { CanvasComponentData, SheetComponent } from '@/libs/compass-api';
import { useDeviceSize } from '@/libs/compass-core-ui';
import { isEventOriginator } from '@/libs/compass-web-utils';
import {
  Center,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
  useDisclosure,
} from '@chakra-ui/react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { Edit, Gesture } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNodeId } from 'reactflow';
import ResizableNodeWrapper from '../../../common/components/resizable-node-wrapper';
import { useEditorStore } from '../../editor-store';
import { useNodeSize, useSubscribeComponentChanges } from '../../hooks';
import { getBorderStyles, storedValueDataIsEqualToSheetValueData } from '../../utils';
import { CanvasToolbar, ExcalidrawTool } from './canvas-toolbar';
import './player-canvas-node.css';
import { ExcalidrawElement } from '@excalidraw/excalidraw/dist/types/excalidraw/element/types';
import { AppState, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/dist/types/excalidraw/types';

type CanvasData = {
  elements: ExcalidrawElement[];
  appState: AppState;
};

export const CanvasNode = () => {
  const getComponent = useEditorStore((state) => state.getComponent);
  const sheetId = useEditorStore((state) => state.sheetId);
  const updateComponent = useEditorStore((state) => state.updateComponent);
  const viewMode = useEditorStore((state) => state.viewMode);

  const id = useNodeId();

  const component = getComponent(id);

  const _key = useSubscribeComponentChanges(id);

  const { height, width } = useNodeSize(component?.id);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { desktop } = useDeviceSize();

  const css = JSON.parse(component?.style ?? '{}');
  const data = JSON.parse(component?.data ?? '{}') as CanvasComponentData;

  const [drawApi, setDrawApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [fontColor, setFontColor] = useState<string>('#000');
  const [focused, setFocused] = useState<boolean>(false);
  const [hovered, setHovered] = useState<boolean>(false);
  const [activeToolSelection, setActiveToolSelection] = useState<ExcalidrawTool>('hand');

  const [key, setKey] = useState<number>(0);

  useEffect(() => {
    drawApi?.updateScene({
      appState: {
        currentItemStrokeColor: fontColor,
      },
    });
  }, [fontColor]);

  const ref = useCallback((api: ExcalidrawImperativeAPI) => {
    setDrawApi(api);
  }, []);

  if (!component) return null;

  const canvasData: CanvasData = {
    appState: {
      ...(data.appState ?? {}),
      viewBackgroundColor: css.backgroundColor,
    },
    elements: data.elements ?? [],
  };

  const onExcalidrawChange = (elements: readonly ExcalidrawElement[], appState: AppState) => {
    const activeTool = appState.activeTool?.type;
    if (activeTool) {
      setActiveToolSelection(activeTool);
    }

    const appStateValuesToSave = {
      zoom: appState.zoom,
      scrollX: appState.scrollX,
      scrollY: appState.scrollY,
    };

    if (
      // Don't save unless data we intend to save has changed
      storedValueDataIsEqualToSheetValueData(JSON.stringify(data) || '', {
        elements,
        appState: appStateValuesToSave,
      })
    ) {
      return;
    }

    if (!focused) {
      setFocused(true);
    }

    updateComponent({
      sheetId,
      update: {
        id: component.id,
        data: JSON.stringify({
          elements,
          appState: appStateValuesToSave,
        }),
      },
    });
  };

  if (!viewMode) {
    return (
      <ResizableNodeWrapper component={component} key={_key}>
        <Center
          sx={{
            height,
            width,
            ...css,
            ...getBorderStyles(css),
          }}>
          <Gesture />
        </Center>
      </ResizableNodeWrapper>
    );
  }

  return (
    <>
      <ResizableNodeWrapper component={component} key={_key}>
        <div
          style={{ height, width, ...css, ...getBorderStyles(css) }}
          className='player-canvas-node'
          id={`player-canvas-node-${component.id}`}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onWheelCapture={(e) => {
            const isCanvas = isEventOriginator({
              e,
              targetId: `player-canvas-node-${component.id}`,
            });

            if (isCanvas) {
              e.stopPropagation();
            }
          }}>
          {(!desktop || hovered) && (
            <IconButton
              sx={{ position: 'absolute', top: 5, left: 5, zIndex: 1000 }}
              onClick={onOpen}>
              <Edit fontSize='small' />
            </IconButton>
          )}
          <Excalidraw
            key={key}
            name='Canvas'
            theme='dark'
            initialData={{
              ...canvasData,
              scrollToContent: true,
            }}
            viewModeEnabled
          />
        </div>
      </ResizableNodeWrapper>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          setKey((prev) => prev + 1);
          onClose();
        }}
        size='full'>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Canvas</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={1} justifyContent='center' align='center'>
              <CanvasToolbar
                activeToolSelection={activeToolSelection}
                drawApi={drawApi}
                fontColor={fontColor}
                setFontColor={setFontColor}
              />

              <div
                style={{ height: '80dvh', width: '80dvw', ...getBorderStyles(css) }}
                className='player-canvas-node'>
                <Excalidraw
                  name='Canvas'
                  excalidrawAPI={ref}
                  onChange={onExcalidrawChange}
                  theme='dark'
                  initialData={canvasData}
                />
              </div>
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export const PrimitiveCanvasNode = ({ component }: { component: SheetComponent }) => {
  const data = JSON.parse(component.data) as CanvasComponentData;
  const css = JSON.parse(component.style);

  const height = `${component.height}px`;
  const width = `${component.width}px`;

  const canvasData: CanvasData = {
    appState: {
      ...(data.appState ?? {}),
      viewBackgroundColor: css.backgroundColor,
    },
    elements: data.elements ?? [],
  };

  return (
    <div
      style={{ height, width, ...css, ...getBorderStyles(css), pointerEvents: 'none' }}
      className='player-canvas-node'>
      <Excalidraw
        name='Canvas'
        key={component.data}
        theme='dark'
        initialData={{
          ...canvasData,
          scrollToContent: true,
        }}
        viewModeEnabled
      />
    </div>
  );
};
