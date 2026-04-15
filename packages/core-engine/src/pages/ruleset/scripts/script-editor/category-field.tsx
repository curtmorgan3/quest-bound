import {
  CategoryField as CategoryFieldComposite,
  type CategoryFieldProps,
} from '@/components/composites/category-field';
import { useScripts } from '@/lib/compass-api';
import { useMemo } from 'react';

export type { CategoryFieldProps } from '@/components/composites/category-field';

export interface ScriptCategoryFieldProps extends Omit<CategoryFieldProps, 'existingCategories'> {
  campaignScripts?: boolean;
}

/**
 * Category field wired to script categories. Derives existing categories from
 * scripts (ruleset or campaign) and passes them to the shared CategoryField.
 */
export function CategoryField({
  campaignScripts = false,
  ...props
}: ScriptCategoryFieldProps) {
  const { scripts: allScripts } = useScripts();
  // Exclude hidden scripts when deriving categories; they are internal-only.
  const visibleScripts = allScripts.filter((s) => s.hidden !== true);
  const scripts = campaignScripts
    ? visibleScripts.filter((s) => s.campaignId)
    : visibleScripts.filter((s) => !s.campaignId);

  const existingCategories = useMemo(() => {
    const categories = new Set<string>();
    for (const script of scripts) {
      const cat = script.category?.trim();
      if (cat) categories.add(cat);
    }
    return Array.from(categories);
  }, [scripts]);

  return <CategoryFieldComposite {...props} existingCategories={existingCategories} />;
}
