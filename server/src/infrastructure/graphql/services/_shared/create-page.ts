import { v4 as uuidv4 } from 'uuid';
import { createSheetFromTemplate } from './create-sheet-from-template';
import { convertEntityId } from './entity-ids';
import { CreatePage, SheetType } from '../../generated-types';
import { TPrismaClient } from '@/database';

const defaultPageDetails = JSON.stringify({
  defaultFont: 'Roboto Condensed',
  colors: [],
  snapToGrid: true,
  enableLogic: false,
  renderGrid: 'dot',
});

interface CreatePageArgs {
  db: TPrismaClient;
  input: CreatePage;
  bootstrapPageNumber?: number;
}

export const createPageUtil = async ({ db, input, bootstrapPageNumber }: CreatePageArgs) => {
  const entityId = uuidv4();
  const { fromEntity } = convertEntityId(input.rulesetId);

  const page = await db.page.create({
    data: {
      id: fromEntity(entityId),
      entityId,
      title: input.title ?? 'New Page',
      details: input.details ?? defaultPageDetails,
      bootstrapped: !!bootstrapPageNumber,
      content: input.content ?? '{}',
      sortIndex: input.sortIndex ?? 0,
      rulesetId: input.rulesetId ?? undefined,
      archetypeId: input.archetypeId ?? undefined,
      characterId: input.characterId ?? undefined,
      parentId: input.parentId ? fromEntity(input.parentId) : undefined,
    },
  });

  // Used to hold page components
  if (input.templateId) {
    const sheetFromTemplate = await createSheetFromTemplate({
      db,
      rulesetId: input.rulesetId,
      templateId: fromEntity(input.templateId),
      overrides: {
        pageId: page.id,
        details: input.details,
        title: `${page.title} Sheet`,
      },
    });

    return {
      page,
      sheet: sheetFromTemplate,
    };
  } else {
    // Tabs are not editable in pages, so we just create a default one
    const inputTabs = JSON.stringify([
      {
        title: 'New Page',
        position: 0,
        tabId: uuidv4(),
      },
    ]);

    const sheetEntityId = uuidv4();

    const sheet = await db.sheet.create({
      data: {
        entityId: sheetEntityId,
        id: fromEntity(sheetEntityId),
        pageId: page.id,
        rulesetId: input.rulesetId ?? undefined,
        version: 1,
        title: page.title,
        type: SheetType.SHEET,
        details: input.details ?? defaultPageDetails,
        tabs: inputTabs,
      },
    });

    // Creating a character journal page
    if (!!input.characterId) {
      const entityId = uuidv4();
      await db.sheetComponent.create({
        data: {
          id: `${entityId}-${sheet.entityId}-${input.rulesetId}`,
          sheetId: `${sheet.entityId}-${input.rulesetId}`,
          entityId,
          type: 'notesV2',
          label: 'Notes',
          description: '',
          locked: true,
          tabId: JSON.parse(inputTabs)[0].tabId,
          layer: 1,
          style:
            '{"backgroundColor":"#2A2A2A","color":"#FAF7F2","fontSize":16,"fontWeight":"normal","fontStyle":"normal","fontFamily":"Roboto Condensed","opacity":1,"borderRadius":"0%","borderTopLeftRadius":0,"borderTopRightRadius":0,"borderBottomLeftRadius":0,"borderBottomRightRadius":0,"outlineColor":"","outlineOffset":0,"outlineWidth":0}',
          data: '{"editorLocked":true,"content":"{\\"blocks\\":[{\\"key\\":\\"55rv6\\",\\"text\\":\\"\\",\\"type\\":\\"unstyled\\",\\"depth\\":0,\\"inlineStyleRanges\\":[],\\"entityRanges\\":[],\\"data\\":{}}],\\"entityMap\\":{}}"}',
          x: 0,
          y: 0,
          width: 760,
          height: 1000,
        },
      });
    }

    // When bootstrapping a rulebook from a document
    if (!!bootstrapPageNumber) {
      const entityId = uuidv4();
      await db.sheetComponent.create({
        data: {
          id: `${entityId}-${sheet.entityId}-${input.rulesetId}`,
          sheetId: `${sheet.entityId}-${input.rulesetId}`,
          // Component IDs are made optimisitcally on the client
          entityId: entityId,
          type: 'pdf',
          label: 'PDF',
          description: '',
          locked: true,
          groupId: null,
          tabId: JSON.parse(inputTabs)[0].tabId,
          layer: 1,
          style: '{}',
          data: JSON.stringify({
            pageNumber: bootstrapPageNumber,
            autoScale: true,
          }),
          x: 0,
          y: 0,
          width: 300,
          height: 200,
          rotation: 0,
        },
      });
    }

    return {
      page,
      sheet,
    };
  }
};
