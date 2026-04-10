import { useArchetypes, useRulesets } from '@/lib/compass-api';
import { useReadOnlyExternalGrantRedirect } from '@/lib/cloud/external-ruleset-grant-guard';
import { CharacterPage } from '@/pages/characters';
import { useParams } from 'react-router-dom';

export const ArchetypeSheetEditor = () => {
  const { activeRuleset } = useRulesets();
  const { archetypeId } = useParams();
  const { archetypes } = useArchetypes(activeRuleset?.id ?? '');
  const archetype = archetypes.find((arch) => arch.id === archetypeId);
  const testCharacterId = archetype?.testCharacterId;

  const readOnlyRedirect = useReadOnlyExternalGrantRedirect(activeRuleset?.id);
  if (readOnlyRedirect) return readOnlyRedirect;

  if (!testCharacterId) return null;

  return (
    <>
      <CharacterPage id={testCharacterId} hideGameLog showHiddenWindows />
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
