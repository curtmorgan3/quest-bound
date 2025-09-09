import { Ruleset, useRulesets } from '@/libs/compass-api';
import { Loading } from '@/libs/compass-core-ui';
import { Module } from '@/types';
import { Button, Input, InputGroup, InputLeftAddon, Select, Stack, Text } from '@chakra-ui/react';
import { Search } from '@mui/icons-material';
import { useState } from 'react';
import { CreateRuleset, SelectionCard } from './components';
import { useFilterContent } from './hooks';

interface Props {
  selection: Ruleset | null;
  onSelect: (selection: Ruleset | Module | null) => void;
}

export const CustomRulesets = ({ selection, onSelect }: Props) => {
  const { rulesets, modules, loading } = useRulesets();

  console.log('rulesets', rulesets);

  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [creatingRuleset, setCreatingRuleset] = useState(false);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const content = [...modules, ...rulesets];

  const filteredContent = useFilterContent({
    content: typeFilter === 'Modules' ? modules : typeFilter === 'Rulesets' ? rulesets : content,
    searchFilter,
  });

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <Stack spacing={8}>
        <Button sx={{ width: 200 }} onClick={() => setCreatingRuleset(true)}>
          Create
        </Button>

        <Stack direction='row' sx={{ width: '100%', flexWrap: 'wrap' }}>
          <InputGroup width='200px'>
            <InputLeftAddon>
              <Search />
            </InputLeftAddon>
            <Input
              placeholder='Search'
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </InputGroup>
          <Select onChange={(e) => setTypeFilter(e.target.value)} width='200px'>
            <option value='All'>All</option>
            <option value='Rulesets'>Rulesets</option>
            <option value='Modules'>Modules</option>
          </Select>
        </Stack>
        {filteredContent.length === 0 &&
          (typeFilter === 'Modules' ? (
            <Text fontStyle='italic'>
              Create a module by selecting a custom ruleset or a ruleset on your shelf.
            </Text>
          ) : (
            <Text fontStyle='italic'>
              Create a ruleset or copy one from your shelf to customize it.
            </Text>
          ))}
        <Stack
          direction='row'
          flexWrap='wrap'
          spacing={4}
          padding={2}
          overflowY='auto'
          maxHeight='calc(100dvh - 60px)'>
          {filteredContent.map((ruleset, i) => (
            <SelectionCard
              index={i}
              onClick={() => (ruleset.id === selection?.id ? onSelect(null) : onSelect(ruleset))}
              key={ruleset.id}
              title={ruleset.title}
              selected={ruleset.id === selection?.id}
              module={typeFilter === 'Modules'}
            />
          ))}
        </Stack>
      </Stack>
      <CreateRuleset isOpen={creatingRuleset} onClose={() => setCreatingRuleset(false)} />
    </>
  );
};
