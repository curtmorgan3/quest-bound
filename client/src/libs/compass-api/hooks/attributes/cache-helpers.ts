import { useApolloClient } from "@apollo/client/react";
import { useParams } from 'react-router-dom';
import {
  Attribute,
  attribute,
  attributeFragment,
  attributes,
  AttributeType,
  Image,
  sheet,
  sheetComponents,
  UpdateAttribute,
} from '../../gql';
import { useCacheHelpers as useSheetCacheHelpers } from '../sheets/cache-helpers';
import { useCacheHelpers as useImageCacheHelpers } from '../storage/cache-helpers';

export const useCacheHelpers = () => {
  const client = useApolloClient();
  const { rulesetId } = useParams();
  const { getCachedImages } = useImageCacheHelpers();

  const { bootstrapSheetComponentsFromLogic } = useSheetCacheHelpers();

  /**
   * Updates the attribute in cache.
   *
   * Updates all sheet components in cache which correspond to attribute logic operations.
   * These components are never stored in the DB.
   */
  const updateAttributeCacheOnly = (update: UpdateAttribute): Attribute => {
    // Need to read the query for attributes instead of attribute to support updating attributes before they're fetched
    const attrRes = client.readQuery({
      query: attributes,
      variables: {
        rulesetId: update.rulesetId,
      },
    }) as any;

    const itemRes = client.readQuery({
      query: attributes,
      variables: {
        rulesetId: update.rulesetId,
        type: AttributeType.ITEM,
      },
    }) as any;

    if (!attrRes || !attrRes.attributes || !itemRes || !itemRes.attributes) {
      throw Error('Attributes not found in cache');
    }

    const cachedImages = getCachedImages();

    const allAttributes = [...attrRes.attributes, ...itemRes.attributes];
    const updatedEntity = allAttributes.find((a: Attribute) => a.id === update.id);

    if (!updatedEntity) {
      throw Error('Attribute not found in cache');
    }

    const updateIsItem = updatedEntity.type === AttributeType.ITEM;

    let image: Image | null = null;

    if (update.imageId) {
      image = cachedImages.find((i) => i.id === update.imageId) ?? null;
    }

    client.writeQuery({
      query: attribute,
      variables: {
        input: {
          id: update.id,
          rulesetId: update.rulesetId,
          type: updateIsItem ? AttributeType.ITEM : undefined,
        },
      },
      data: {
        attribute: {
          ...updatedEntity,
          ...update,
          image: update.imageId !== undefined ? image : updatedEntity.image,
        },
      },
    });

    client.writeQuery({
      query: attributes,
      variables: {
        rulesetId: update.rulesetId,
        type: updateIsItem ? AttributeType.ITEM : undefined,
      },
      data: {
        attributes: (updateIsItem ? itemRes.attributes : attrRes.attributes).map((a: Attribute) => {
          if (a.id === update.id) {
            return {
              ...a,
              ...update,
              image: update.imageId !== undefined ? image : updatedEntity.image,
            };
          }

          return a;
        }),
      },
    });

    if (!update.logic) {
      return {
        ...updatedEntity,
        ...update,
      };
    }

    // Update all components representing operations in cache
    const cRes = client.readQuery({
      query: sheetComponents,
      variables: {
        input: {
          sheetId: update.id,
          rulesetId: update.rulesetId,
          tabId: 'logic-editor',
        },
      },
    }) as any;

    if (!cRes || !cRes.sheetComponents) {
      return {
        ...updatedEntity,
        ...update,
      };
    }

    const updatedLogic: any = update?.logic ? JSON.parse(update.logic) : [];

    const cSheet = client.readQuery({
      query: sheet,
      variables: {
        input: {
          id: update.id,
          rulesetId: update.rulesetId,
        },
      },
    }) as any;

    client.writeQuery({
      query: sheetComponents,
      variables: {
        input: {
          sheetId: update.id,
          rulesetId: update.rulesetId,
          tabId: 'logic-editor',
        },
      },
      data: {
        sheetComponents: bootstrapSheetComponentsFromLogic(cSheet.sheet, updatedLogic),
      },
    });

    return {
      ...updatedEntity,
      ...update,
    };
  };

  const getAttributesFromCache = (isItem = false) => {
    const res = client.readQuery({
      query: attributes,
      variables: {
        rulesetId,
        type: isItem ? AttributeType.ITEM : undefined,
      },
    }) as any;

    return res?.attributes ?? [];
  };

  const getAttributeFromCache = (id: string) => {
    const res = client.cache.readFragment({
      fragment: attributeFragment,
      id: client.cache.identify({
        id,
        rulesetId,
        __typename: 'Attribute',
      }),
    }) as Attribute;

    if (res?.id) return res;

    const attributes = getAttributesFromCache(res.type === AttributeType.ITEM);
    const attribute = attributes.find((a: Attribute) => a.id === id);

    return attribute?.id ? attribute : null;
  };

  return {
    updateAttributeCacheOnly,
    getAttributeFromCache,
  };
};
