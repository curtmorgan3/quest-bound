import { IconButton, Link, Stack } from '@/components';
import DiscordImage from './discord-icon.png';

interface JoinDiscordProps {
  align?: 'start' | 'end';
  label?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  style?: React.CSSProperties;
  iconButton?: boolean;
}

interface DiscordIconProps {
  style?: React.CSSProperties;
}

const DiscordIcon = ({ style }: DiscordIconProps) => {
  return <img alt='Discord' src={DiscordImage} style={{ height: 40, width: 40, ...style }} />;
};

export const JoinDiscord = ({
  label = 'Join the Community',
  size = 'medium',
  style,
  iconButton,
}: JoinDiscordProps) => {
  const sizes = {
    small: { height: 20, width: 20 },
    medium: { height: 25, width: 25 },
    large: { height: 30, width: 30 },
  };

  if (iconButton) {
    return (
      <a target='_blank' href='https://discord.gg/7QGV4muT39'>
        <IconButton style={style}>
          <DiscordIcon style={sizes[size]} />
        </IconButton>
      </a>
    );
  }

  return (
    <Stack direction='row' gap={2} alignItems='center'>
      <DiscordIcon style={sizes[size]} />
      <Link href='https://discord.gg/7QGV4muT39' target='_blank'>
        {label}
      </Link>
    </Stack>
  );
};
