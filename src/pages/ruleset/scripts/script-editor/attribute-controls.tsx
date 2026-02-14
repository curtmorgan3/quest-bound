import { useCharacterAttributes, useRulesets } from '@/lib/compass-api';

interface AttributeControls {
  scriptAttributeIds: string[];
}

export const AttributeControls = ({ scriptAttributeIds }: AttributeControls) => {
  const { testCharacter } = useRulesets();
  const { characterAttributes } = useCharacterAttributes(testCharacter?.id);

  const usedAttributes = characterAttributes.filter((attr) => scriptAttributeIds.includes(attr.id));

  return (
    <div className='rounded-md border bg-muted/20 flex flex-col w-[30%] min-w-[265px] p-1'>
      {usedAttributes.length === 0 ? (
        <span className='text-sm text-muted-foreground italic'>No dependent attributes</span>
      ) : (
        <div></div>
      )}
    </div>
  );
};
