import { useWindows } from '@/lib/compass-api';

interface SheetViewerProps {
  windowIds: string[];
}

export const SheetViewer = ({ windowIds }: SheetViewerProps) => {
  const { windows: allWindows } = useWindows();
  const windows = allWindows.filter((w) => windowIds.includes(w.id));

  return <div></div>;
};
