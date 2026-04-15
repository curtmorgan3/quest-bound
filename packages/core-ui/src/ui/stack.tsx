interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  alignItems?: React.CSSProperties['alignItems'];
  justifyContent?: React.CSSProperties['justifyContent'];
  gap?: number | string;
  spacing?: number | string;
  padding?: number | string;
  width?: number | string;
  direction?: 'row' | 'column';
  mt?: number | string;
  mb?: number | string;
  ml?: number | string;
  mr?: number | string;
  "data-testid"?: string;
}

export const Stack = ({ direction = 'column', ...props }: StackProps) => {
  return (
    <div
      className={`flex ${direction === 'column' ? 'flex-col' : 'flex-row'} gap-${props.gap}`}
      data-testid={props['data-testid']}
      style={{
        alignItems: props.alignItems,
        justifyContent: props.justifyContent,
        ...props.style,
      }}>
      {props.children}
    </div>
  );
};
