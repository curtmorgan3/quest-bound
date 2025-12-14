import { useApolloClient } from "@apollo/client/react";
import { useParams } from 'react-router-dom';
import {
  character,
  CharacterQuery,
  CharacterQueryVariables,
  Page,
  pages as pagesQuery,
  PagesQuery,
  PagesQueryVariables,
  UpdatePage,
} from '../../gql';
import { sortTreeItemSiblings } from '../../utils/tree-helpers';

export const useCacheHelpers = () => {
  const client = useApolloClient();
  const { rulesetId, characterId } = useParams();

  /**
   * Applies update to page in cache
   *
   * If the update contains a sortIndex, updates the sortIndex of all siblings
   *
   * Returns all updated pages
   */
  const updatePageCacheOnly = ({ update }: { update: UpdatePage }): UpdatePage[] => {
    const cachedRulebookPages = client.readQuery<PagesQuery, PagesQueryVariables>({
      query: pagesQuery,
      variables: {
        rulesetId: rulesetId ?? '',
      },
    });

    const cachedCharacter = client.readQuery<CharacterQuery, CharacterQueryVariables>({
      query: character,
      variables: {
        id: characterId ?? '',
      },
    });

    const cachedJournalPages = cachedCharacter?.character?.pages ?? [];

    const cachedPages = !!characterId ? cachedJournalPages : cachedRulebookPages?.pages ?? [];

    if (!cachedRulebookPages) {
      return [];
    }

    const updatedPageIdSet = new Set<string>([update.id]);

    // Full set of all pages in cache with updated values
    const updatedPages = cachedPages.map((p) => {
      if (p.id !== update.id) {
        if (update.sortIndex !== undefined && update.sortIndex !== null) {
          // Handle resort of all siblings
          const sortedSiblings = sortTreeItemSiblings(cachedPages, update);

          sortedSiblings.forEach((p) => updatedPageIdSet.add(p.id));

          const updatedSibling = sortedSiblings.find((s) => s.id === p.id);
          return {
            ...p,
            sortIndex: updatedSibling?.sortIndex ?? p.sortIndex,
          };
        }
        return p;
      }

      const currentDetails = JSON.parse(p.details);
      const updatedDetails = update.details ? JSON.parse(update.details) : {};

      return {
        ...p,
        ...update,
        details: JSON.stringify({
          ...currentDetails,
          ...updatedDetails,
        }),
      };
    });

    if (!!characterId) {
      if (!cachedCharacter) return [];
      client.writeQuery({
        query: character,
        variables: {
          id: characterId,
        },
        data: {
          character: {
            ...cachedCharacter.character,
            pages: updatedPages as Page[],
          },
        },
      });
    } else {
      client.writeQuery<PagesQuery, PagesQueryVariables>({
        query: pagesQuery,
        variables: {
          rulesetId: rulesetId ?? '',
        },
        data: {
          ...cachedRulebookPages,
          pages: updatedPages as Page[],
        },
      });
    }

    // Return only updated pages with updated values
    const onlyUpdatedPages: UpdatePage[] = updatedPages
      .filter((p) => updatedPageIdSet.has(p.id))
      .map((updatedPage) => {
        if (updatedPage.id === update.id) {
          return {
            ...update,
            // Combines details and content from cache with details and content from update
            ...(update.details && { details: updatedPage.details }),
            ...(update.content && { content: updatedPage.content }),
          };
        }
        return {
          id: updatedPage.id,
          sortIndex: updatedPage.sortIndex,
          rulesetId: rulesetId ?? '',
        };
      });

    return onlyUpdatedPages;
  };

  return {
    updatePageCacheOnly,
  };
};
