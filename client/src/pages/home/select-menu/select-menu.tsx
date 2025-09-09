import { Character, Ruleset } from '@/libs/compass-api';
import { Module } from '@/types';
import { Stack } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { Characters } from './characters';
import { CustomRulesets } from './custom-rulesets';
import { SelectCategory } from './select-category';
import { SelectionPanel } from './selection-panel';

export const SelectMenu = () => {
  const [selection, setSelection] = useState<Ruleset | Module | Character | null>(null);

  const [categorySelection, setCategorySelection] = useState<string>('Rulesets');

  useEffect(() => {
    setSelection(null);
  }, [categorySelection]);

  const renderContent = () => {
    switch (categorySelection) {
      case 'Rulesets':
        return <CustomRulesets onSelect={setSelection} selection={selection as Ruleset} />;
      case 'Characters':
        return <Characters onSelect={setSelection} selection={selection as Character} />;
    }
  };

  return (
    <>
      <Stack direction='row'>
        <SelectCategory selection={categorySelection} setSelection={setCategorySelection} />
        <section style={{ padding: '16px', height: '60dvh', flexGrow: 1 }}>
          {renderContent()}
        </section>
      </Stack>
      <SelectionPanel selection={selection} onClose={() => setSelection(null)} />
    </>
  );
};
