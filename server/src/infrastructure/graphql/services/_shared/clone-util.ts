import { convertEntityId } from './entity-ids';
import { SheetType } from '../../generated-types';
import { TPrismaClient } from '@/database';

interface CloneUtil {
  db: TPrismaClient;
  originalRulesetId: string;
  rulesetId: string;
  addingModule?: boolean;
}

export async function cloneUtil({
  db,
  originalRulesetId,
  rulesetId,
  addingModule = false,
}: CloneUtil) {
  const query = {
    where: {
      id: originalRulesetId,
    },
    include: {
      attributes: true,
      archetypes: true,
      charts: true,
      documents: true,
      pages: {
        include: {
          sheet: {
            include: {
              backgroundImage: true,
              components: {
                include: {
                  images: true,
                },
              },
            },
          },
          parent: true,
        },
      },
      sheets: {
        include: {
          backgroundImage: true,
          components: {
            include: {
              images: true,
            },
          },
        },
      },
    },
  };

  const publishedRuleset = await db.publishedRuleset.findUnique(query);
  const ruleset = await db.ruleset.findUnique(query);

  // Modules are cloned from draft tables when added to a ruleset
  // e.g. Adding a module to a ruleset vs. adding a ruleset to a shelf
  const rulesetToClone = addingModule ? ruleset : publishedRuleset;

  const { toEntity } = convertEntityId(originalRulesetId);

  async function cloneAttributes() {
    if (!rulesetToClone) {
      throw Error('Ruleset not found');
    }
    await db.attribute.createMany({
      data: rulesetToClone.attributes.map((attribute: any) => ({
        ...attribute,
        id: `${attribute.entityId}-${rulesetId}`,
        rulesetId,
        logic: attribute.logic ?? undefined,
        modifiers: attribute.modifiers ?? undefined,
        moduleId: addingModule ? rulesetToClone.id : attribute.moduleId,
        moduleTitle: addingModule ? rulesetToClone.title : attribute.moduleTitle,
      })),
      skipDuplicates: true,
    });

    return 'success';
  }

  async function cloneArchetypes() {
    if (!rulesetToClone) {
      throw Error('Ruleset not found');
    }

    await db.archetype.createMany({
      data: rulesetToClone.archetypes.map((archetype: any) => ({
        ...archetype,
        id: `${archetype.entityId}-${rulesetId}`,
        rulesetId,
        parentId: archetype.parent ? `${archetype.parent.entityId}-${rulesetId}` : undefined,
        parent: undefined,
        attributes: undefined,
        moduleId: addingModule ? rulesetToClone.id : archetype.moduleId,
        moduleTitle: addingModule ? rulesetToClone.title : archetype.moduleTitle,
      })),
      skipDuplicates: true,
    });

    return 'success';
  }

  async function cloneCharts() {
    if (!rulesetToClone) {
      throw Error('Ruleset not found');
    }
    await db.chart.createMany({
      data: rulesetToClone.charts.map((chart: any) => ({
        ...chart,
        id: `${chart.entityId}-${rulesetId}`,
        rulesetId,
        data: chart.data ?? undefined,
        moduleId: addingModule ? rulesetToClone.id : chart.moduleId,
        moduleTitle: addingModule ? rulesetToClone.title : chart.moduleTitle,
      })),
      skipDuplicates: true,
    });
  }

  async function cloneDocuments() {
    if (!rulesetToClone) {
      throw Error('Ruleset not found');
    }

    await db.document.createMany({
      data: rulesetToClone.documents.map((document: any) => ({
        ...document,
        id: `${document.entityId}-${rulesetId}`,
        rulesetId,
        moduleId: addingModule ? rulesetToClone.id : document.moduleId,
        moduleTitle: addingModule ? rulesetToClone.title : document.moduleTitle,
      })),
      skipDuplicates: true,
    });
  }

  async function clonePages() {
    if (!rulesetToClone) {
      throw Error('Ruleset not found');
    }

    // Pages
    await db.page.createMany({
      data: rulesetToClone.pages.map((page: any) => ({
        ...page,
        sheet: undefined,
        id: `${page.entityId}-${rulesetId}`,
        rulesetId,
        parentId: page.parent ? `${page.parent.entityId}-${rulesetId}` : undefined,
        parent: undefined,
        details: page.details ?? undefined,
        content: page.content ?? undefined,
        moduleId: addingModule ? rulesetToClone.id : page.moduleId,
        moduleTitle: addingModule ? rulesetToClone.title : page.moduleTitle,
      })),
      skipDuplicates: true,
    });

    // Page Sheets
    const pagesWithSheets = rulesetToClone.pages;

    await db.sheet.createMany({
      data: pagesWithSheets.map((page: any) => ({
        ...page.sheet,
        id: `${page.sheet?.entityId}-${rulesetId}`,
        title: page.sheet?.title ?? '',
        type: page.sheet?.type ?? SheetType.SHEET,
        details: page.sheet?.details ?? '',
        tabs: page.sheet?.tabs ?? '[]',
        sections: page.sheet?.sections ?? undefined,
        rulesetId,
        pageId: `${page.entityId}-${rulesetId}`,
        components: undefined,
        backgroundImage: undefined,
      })),
      skipDuplicates: true,
    });

    // Page Sheet Components
    await db.sheetComponent.createMany({
      data: pagesWithSheets.flatMap((page: any) =>
        page.sheet!.components.map((component: any) => ({
          ...component,
          id: `${component.entityId}-${rulesetId}`,
          sheetId: `${page.sheet?.entityId}-${rulesetId}`,
          data: component.data ?? undefined,
          style: component.style ?? undefined,
          images: undefined,
        })),
      ),
      skipDuplicates: true,
    });

    // Page Sheet Component Images
    const components = [];

    for (const page of pagesWithSheets) {
      for (const component of page.sheet!.components) {
        components.push(component);
      }
    }

    const images = [];

    for (const component of components) {
      for (const image of component.images) {
        images.push({
          imageId: image.imageId,
          componentId: `${component.entityId}-${rulesetId}`,
        });
      }
    }

    await db.componentImages.createMany({
      data: images.map((componentImage) => ({
        imageId: componentImage.imageId,
        componentId: componentImage.componentId,
      })),
      skipDuplicates: true,
    });
  }

  async function cloneTemplates() {
    if (!rulesetToClone) {
      throw Error('Ruleset not found');
    }

    // For archetype and creature components, make sure they're associated to
    const archetypeSheetId = JSON.parse(rulesetToClone.details as string).archetypeSheetId;
    const creatureSheetId = JSON.parse(rulesetToClone.details as string).creatureSheetId;

    const sheetTemplates = [];

    // .filter is not working on ruleset.sheets because of some type issue
    for (const sheet of rulesetToClone.sheets) {
      if (
        sheet.entityId === archetypeSheetId ||
        sheet.entityId === creatureSheetId ||
        sheet.type === SheetType.TEMPLATE
      ) {
        sheetTemplates.push(sheet);
      }
    }

    const sheetComponents = [];
    for (const sheet of sheetTemplates) {
      for (const component of sheet.components) {
        sheetComponents.push(component);
      }
    }

    await db.sheet.createMany({
      data: sheetTemplates.map((sheet) => ({
        ...sheet,
        image: undefined,
        backgroundImage: undefined,
        id: `${sheet.entityId}-${rulesetId}`,
        pageId: sheet.pageId ? `${sheet.pageId}-${rulesetId}` : undefined,
        rulesetId,
        details: sheet.details ?? undefined,
        tabs: sheet.tabs ?? '[]',
        sections: sheet.sections ?? undefined,
        components: undefined,
        moduleId: addingModule ? rulesetToClone.id : sheet.moduleId,
        moduleTitle: addingModule ? rulesetToClone.title : sheet.moduleTitle,
      })),
      skipDuplicates: true,
    });

    await db.sheetComponent.createMany({
      data: sheetComponents.map((component) => ({
        ...component,
        id: `${component.entityId}-${toEntity(component.sheetId)}-${rulesetId}`,
        sheetId: `${toEntity(component.sheetId)}-${rulesetId}`,
        data: component.data ?? undefined,
        style: component.style ?? undefined,
        images: undefined,
      })),
      skipDuplicates: true,
    });

    const images = [];

    for (const component of sheetComponents) {
      for (const image of component.images) {
        images.push({
          imageId: image.imageId,
          componentId: `${component.entityId}-${toEntity(component.sheetId)}-${rulesetId}`,
        });
      }
    }

    await db.componentImages.createMany({
      data: images.map((componentImage) => ({
        imageId: componentImage.imageId,
        componentId: componentImage.componentId,
      })),
      skipDuplicates: true,
    });
  }

  async function cloneAllEntities() {
    await Promise.all([
      cloneAttributes(),
      cloneArchetypes(),
      cloneCharts(),
      clonePages(),
      cloneTemplates(),
      cloneDocuments(),
    ]);
  }

  return {
    cloneAttributes,
    cloneArchetypes,
    cloneCharts,
    cloneTemplates,
    clonePages,
    cloneAllEntities,
  };
}
