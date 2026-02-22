import { db } from '@/stores';
import type { Location } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export const useLocation = (locationId: string | undefined) => {
  const location = useLiveQuery(
    () =>
      locationId
        ? db.locations.get(locationId)
        : Promise.resolve(undefined),
    [locationId],
  );

  return location as Location | undefined;
};
