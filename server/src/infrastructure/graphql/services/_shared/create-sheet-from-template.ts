import { v4 as uuidv4 } from 'uuid';
import { CreateSheet, SheetType } from '../../generated-types';
import { TPrismaClient } from '@/database';

interface CreateSheetFromTemplateInput {
  db: TPrismaClient;
  templateId: string;
  rulesetId?: string;
  characterId?: string;
  overrides?: CreateSheet;
  createdFromPublishedRuleset?: boolean;
}

interface CloneComponentsInput {
  db: TPrismaClient;
  originalSheetId: string;
  associatedId?: string;
  newSheetId: string;
  createdFromPublishedRuleset?: boolean;
}

export const createSheetFromTemplate = async ({
  db,
  templateId,
  rulesetId,
  characterId,
  overrides,
  createdFromPublishedRuleset = false,
}: CreateSheetFromTemplateInput) => {
  const getTemplate = async () => {
    if (createdFromPublishedRuleset) {
      return await db.publishedSheet.findUnique({
        where: {
          id: templateId,
        },
        include: {
          image: true,
          backgroundImage: true,
        },
      });
    }

    return await db.sheet.findUnique({
      where: {
        id: templateId,
      },
      include: {
        image: true,
        backgroundImage: true,
      },
    });
  };

  const template = await getTemplate();

  if (!template) {
    throw Error('Template not found');
  }

  const entityId = uuidv4();

  const sheetFromTemplate = await db.sheet.create({
    data: {
      ...template,
      id: `${entityId}-${template.rulesetId}`,
      entityId,
      imageId: template.imageId ?? null,
      image: undefined,
      templateName: template.title,
      templateId: template.id,
      templateType: null,
      type: SheetType.SHEET,
      version: template.version ?? 1,
      tabs: template.tabs ?? undefined,
      sections: template.sections ?? undefined,
      pageId: overrides?.pageId ?? null,
      characterId: overrides?.characterId ?? null,
      title: overrides?.title ?? `My ${template.title}`,
      description: overrides?.description ?? undefined,
      details: overrides?.details ?? template.details ?? '{}',
      backgroundImage: undefined,
      backgroundImageId: template.backgroundImageId ?? null,
    },
    include: {
      image: true,
    },
  });

  if (characterId) {
    await db.sheet.update({
      where: {
        id: sheetFromTemplate.id,
      },
      data: {
        characterId,
      },
    });
  }

  await createClonedComponents({
    db,
    originalSheetId: templateId,
    associatedId: rulesetId,
    newSheetId: sheetFromTemplate.id,
    createdFromPublishedRuleset,
  });

  return {
    ...sheetFromTemplate,
    username: sheetFromTemplate.createdBy ?? '',
    id: sheetFromTemplate.entityId,
  } as any; // Required for compilation within prisma layer
};

/**
 * Takes two sheet IDs and creates of the first sheet, associating them with the second sheet.
 *
 * Cloned components maintain internal relationships to sheet tabs, sections, component groups and logic.
 */
export const createClonedComponents = async ({
  db,
  originalSheetId,
  newSheetId,
  createdFromPublishedRuleset = false,
}: CloneComponentsInput) => {
  const getComponentsToClone = async () => {
    if (createdFromPublishedRuleset) {
      return await db.publishedSheetComponent.findMany({
        where: {
          sheetId: originalSheetId,
        },
        include: {
          images: {
            include: {
              image: true,
            },
          },
        },
      });
    }

    return await db.sheetComponent.findMany({
      where: {
        sheetId: originalSheetId,
      },
      include: {
        images: {
          include: {
            image: true,
          },
        },
      },
    });
  };

  const originalComponents = await getComponentsToClone();

  await db.sheetComponent.createMany({
    data: originalComponents.map((comp: any) => {
      return {
        ...comp,
        id: `${comp.entityId}-${newSheetId}`,
        entityId: comp.entityId,
        sheetId: newSheetId,
        style: comp.style as any,
        data: comp.data as any,
        images: undefined, // Can't pass images to createMany
      };
    }),
  });

  const componentsWithImages = originalComponents.filter(
    (component: any) => !!component.images && component.images.length > 0,
  );

  await db.componentImages.createMany({
    data: componentsWithImages.flatMap((component: any) =>
      component.images.map((componentImage: any) => ({
        imageId: componentImage.image.id,
        componentId: `${component.entityId}-${newSheetId}`,
      })),
    ),
    skipDuplicates: true,
  });
};
