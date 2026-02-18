import LogoIconSvg from '@/assets/qb-monogram.svg';

interface LogoProps {
  style?: React.CSSProperties;
}

export const LogoIcon = ({ style }: LogoProps) => {
  return (
    <img
      alt='QB monogram in the shape of an open book'
      src={LogoIconSvg}
      style={{ width: '40px', height: '40px', ...style }}
    />
  );
};
