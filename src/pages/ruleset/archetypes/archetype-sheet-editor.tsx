import { useArchetypes, useRulesets } from '@/lib/compass-api';
import { CharacterPage } from '@/pages/characters';
import { useParams } from 'react-router-dom';

export const ArchetypeSheetEditor = () => {
  const { activeRuleset } = useRulesets();
  const { archetypeId } = useParams();
  const { archetypes } = useArchetypes(activeRuleset?.id ?? '');
  const archetype = archetypes.find((arch) => arch.id === archetypeId);
  const testCharacterId = archetype?.testCharacterId;

  if (!testCharacterId) return null;

  return (
    <>
      <CharacterPage id={testCharacterId} />
      <p
        className='text-sm text-muted-foreground'
        style={{
          position: 'fixed',
          bottom: '60px',
          right: '60px',
        }}>{`Editing ${archetype.name} archetype`}</p>
    </>
  );
};
