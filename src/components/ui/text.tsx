interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Text = ({ variant = 'p', style, children }: TextProps) => {
  switch (variant) {
    case 'h1':
      return <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', ...style }}>{children}</h1>;
    case 'h2':
      return <h2 style={{ fontSize: '2rem', fontWeight: 'bold', ...style }}>{children}</h2>;
    case 'h3':
      return <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', ...style }}>{children}</h3>;
    case 'h4':
      return <h4 style={{ fontSize: '1.5rem', fontWeight: 'bold', ...style }}>{children}</h4>;
    case 'h5':
      return <h5 style={{ fontSize: '1.25rem', fontWeight: 'bold', ...style }}>{children}</h5>;
    case 'h6':
      return <h6 style={{ fontSize: '1rem', fontWeight: 'bold', ...style }}>{children}</h6>;
    default:
      return <p style={{ fontSize: '1rem', ...style }}>{children}</p>;
  }
};
