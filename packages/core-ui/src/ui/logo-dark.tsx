import LogoDarkSvg from '@/assets/logo-dark.svg';

interface LogoProps {
  style?: React.CSSProperties;
}

export const LogoDark = ({ style }: LogoProps) => {
  return (
    <img
      alt='Quest Bound'
      src={LogoDarkSvg}
      style={{ maxWidth: '80vw', width: '100%', ...style }}
    />
  );
};
