import { Button } from '@/components';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ScriptParameterDefinition, ScriptParamType, ScriptParamValue } from '@/types';

interface GameManagerParametersProps {
  parameters: ScriptParameterDefinition[];
  onChange: (next: ScriptParameterDefinition[]) => void;
}

export function GameManagerParameters({ parameters, onChange }: GameManagerParametersProps) {
  const handleAdd = () => {
    const next: ScriptParameterDefinition = {
      id: crypto.randomUUID(),
      label: '',
      type: 'string' satisfies ScriptParamType,
    };
    onChange([...parameters, next]);
  };

  const handleUpdate = (
    id: string,
    updates: Partial<Pick<ScriptParameterDefinition, 'label' | 'type' | 'defaultValue'>>,
  ) => {
    onChange(parameters.map((param) => (param.id === id ? { ...param, ...updates } : param)));
  };

  const handleRemove = (id: string) => {
    onChange(parameters.filter((param) => param.id !== id));
  };

  const coerceDefaultValue = (raw: string, type: ScriptParamType): ScriptParamValue | undefined => {
    if (raw === '') return undefined;
    if (type === 'number') {
      const num = Number(raw);
      return Number.isFinite(num) ? num : (raw as ScriptParamValue);
    }
    if (type === 'boolean') {
      const trimmed = raw.trim().toLowerCase();
      if (!trimmed) return undefined;
      if (trimmed === 'true' || trimmed === '1' || trimmed === 'yes' || trimmed === 'y')
        return true;
      if (trimmed === 'false' || trimmed === '0' || trimmed === 'no' || trimmed === 'n')
        return false;
      return undefined;
    }
    return raw;
  };

  return (
    <div className='rounded-md border bg-muted/20 flex flex-col w-[30%] min-w-[280px] p-2 gap-3 overflow-y-auto'>
      <div className='flex items-center justify-between'>
        <Label className='text-sm'>Parameters</Label>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={handleAdd}
          className='h-7 px-2 text-xs'>
          Add parameter
        </Button>
      </div>
      {parameters.length === 0 ? (
        <p className='text-xs text-muted-foreground'>
          Add parameters to collect values before running this script and access them via
          `params.get('&lt;Label&gt;')`.
        </p>
      ) : (
        <div className='flex flex-col gap-2'>
          {parameters.map((param) => {
            const defaultValueDisplay =
              param.defaultValue === null || param.defaultValue === undefined
                ? ''
                : String(param.defaultValue);

            const booleanDefault =
              param.type === 'boolean'
                ? param.defaultValue === true
                  ? 'true'
                  : param.defaultValue === false
                    ? 'false'
                    : 'unset'
                : 'unset';

            return (
              <div key={param.id} className='flex gap-2 items-center'>
                <Input
                  className='flex-1'
                  value={param.label}
                  onChange={(e) => handleUpdate(param.id, { label: e.target.value })}
                  placeholder='Label (used with params.get)'
                />
                <Select
                  value={param.type}
                  onValueChange={(v) =>
                    handleUpdate(param.id, {
                      type: v as ScriptParamType,
                      defaultValue:
                        v === 'boolean' ? undefined : (param.defaultValue as ScriptParamValue),
                    })
                  }>
                  <SelectTrigger className='w-[110px]'>
                    <SelectValue placeholder='Type' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='string'>Text</SelectItem>
                    <SelectItem value='number'>Number</SelectItem>
                    <SelectItem value='boolean'>Boolean</SelectItem>
                  </SelectContent>
                </Select>
                {param.type === 'boolean' ? (
                  <Select
                    value={booleanDefault}
                    onValueChange={(v) =>
                      handleUpdate(param.id, {
                        defaultValue: v === 'unset' ? undefined : v === 'true',
                      })
                    }>
                    <SelectTrigger className='w-[110px]'>
                      <SelectValue placeholder='Default' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='unset'>No default</SelectItem>
                      <SelectItem value='true'>True</SelectItem>
                      <SelectItem value='false'>False</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    className='w-[120px]'
                    type={param.type === 'number' ? 'number' : 'text'}
                    value={defaultValueDisplay}
                    onChange={(e) =>
                      handleUpdate(param.id, {
                        defaultValue: coerceDefaultValue(e.target.value, param.type),
                      })
                    }
                    placeholder='Default'
                  />
                )}
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  onClick={() => handleRemove(param.id)}
                  className='h-7 w-7 text-destructive hover:text-destructive'>
                  ×
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
