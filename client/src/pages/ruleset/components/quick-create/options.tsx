import { Stack, Text } from '@/libs/compass-core-ui';
import { EnvContext } from '@/libs/compass-web-utils';
import {
  Backpack,
  Calculate,
  DocumentScanner,
  Feed,
  ImportContacts,
  ListAlt,
  People,
} from '@mui/icons-material';
import { useContext, type JSX } from 'react';

interface QuickCreateOptionsProps {
  page: string;
  setPage: (page: string) => void;
}

type Option = {
  label: string;
  page: string;
  icon: JSX.Element;
  env?: string;
};

export const QuickCreateOptions = ({ page, setPage }: QuickCreateOptionsProps) => {
  const { environment } = useContext(EnvContext);
  const options: Option[] = [
    {
      label: 'Attribute',
      page: 'attribute',
      icon: <Calculate />,
    },
    {
      label: 'Item',
      page: 'item',
      icon: <Backpack />,
    },
    {
      label: 'Archetype',
      page: 'archetype',
      icon: <People />,
    },
    {
      label: 'Chart',
      page: 'chart',
      icon: <ListAlt />,
    },
    {
      label: 'Document',
      page: 'document',
      icon: <DocumentScanner />,
    },
    {
      label: 'Page Template',
      page: 'page-template',
      icon: <ImportContacts />,
    },
    {
      label: 'Sheet Template',
      page: 'template',
      icon: <Feed />,
    },
  ];

  const filteredOptions = options.filter((r) => !r.env || r.env === environment);

  return (
    <Stack sx={{ minWidth: '150px' }} spacing={2} padding={2}>
      {filteredOptions.map((r) => (
        <Stack
          key={r.page}
          direction='row'
          spacing={2}
          width='100%'
          className='clickable'
          sx={{ color: page === r.page ? 'secondary.main' : 'inherit' }}
          onClick={() => setPage(r.page)}>
          {r.icon}
          <Text
            sx={{
              fontSize: '0.9rem',
              color: page === r.page ? 'secondary.main' : 'inherit',
            }}>
            {r.label}
          </Text>
        </Stack>
      ))}
    </Stack>
  );
};
