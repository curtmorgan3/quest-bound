import { valueIfAllAreEqual as valueIfAllAreEqualStyles } from '@/lib/compass-planes/utils';

export { valueIfAllAreEqualStyles as valueIfAllAreEqual };

export function parseValue(val: string | number) {
  let parsedVal = parseFloat(val.toString());
  if (isNaN(parsedVal)) {
    parsedVal = 0;
  }
  return parsedVal;
}
