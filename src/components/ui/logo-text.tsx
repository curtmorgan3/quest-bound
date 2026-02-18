import LogoTextSvg from '@/assets/qb-text.svg';

interface LogoProps {
  style?: React.CSSProperties;
}

export const LogoText = ({ style }: LogoProps) => {
  return (
    <img
      alt='Quest Bound'
      src={LogoTextSvg}
      style={{ width: '400px', height: '200px', ...style }}
    />
  );
};
