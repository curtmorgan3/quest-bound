import { useApolloClient } from "@apollo/client/react";
import { Image, images, UpdateImage } from '../../gql';
import { sortTreeItemSiblings } from '../../utils/tree-helpers';

export const useCacheHelpers = () => {
  const client = useApolloClient();

  const getCachedImages = (): Image[] => {
    const cachedRes = client.readQuery({
      query: images,
    }) as any;

    if (!cachedRes || !cachedRes.images) return [];

    return cachedRes.images;
  };

  const removeImageFromCache = (imageId: string) => {
    const cachedImages = client.readQuery({
      query: images,
    }) as any;

    if (!cachedImages || !cachedImages.images) return [];

    // Move children to deleted image's parent (in the case of deleted directories)
    const imageToRemove = cachedImages.images.find((i: any) => i.id === imageId);
    const updatedImages = cachedImages.images
      .filter((i: any) => i.id !== imageId)
      .map((image: Image) => {
        if (image.parentId === imageToRemove.id) {
          return {
            ...image,
            parentId: imageToRemove.parentId,
          };
        }

        return image;
      });

    client.writeQuery({
      query: images,
      data: {
        images: updatedImages,
      },
    });

    return updatedImages;
  };

  const addImageToCache = (image: Image) => {
    const cachedImages = client.readQuery({
      query: images,
    }) as any;

    if (!cachedImages || !cachedImages.images) return [];

    const updatedImages = [...cachedImages.images, image];

    client.writeQuery({
      query: images,
      data: {
        images: updatedImages,
      },
    });

    return updatedImages;
  };

  const updateImageCacheOnly = (update: UpdateImage): UpdateImage[] => {
    const cachedImagesRes = client.readQuery({
      query: images,
    }) as any;

    const cachedImages = (cachedImagesRes?.images ?? []) as Image[];
    const updatedImageIdSet = new Set<string>([update.id]);

    // Full set of all images in cache with updated values
    const updatedImages = cachedImages.map((p) => {
      if (p.id !== update.id) {
        if (update.sortIndex !== undefined && update.sortIndex !== null) {
          // Handle resort of all siblings
          const sortedSiblings = sortTreeItemSiblings(cachedImages, update);

          sortedSiblings.forEach((p) => updatedImageIdSet.add(p.id));

          const updatedSibling = sortedSiblings.find((s) => s.id === p.id);
          return {
            ...p,
            sortIndex: updatedSibling?.sortIndex ?? p.sortIndex,
          };
        }
        return p;
      }

      return {
        ...p,
        ...update,
      };
    });

    client.writeQuery({
      query: images,
      data: {
        images: updatedImages,
      },
    }) as any;

    // Return only updated pages with updated values
    const onlyUpdatedImages: UpdateImage[] = updatedImages
      .filter((p) => updatedImageIdSet.has(p.id))
      .map((updatedImage) => {
        if (updatedImage.id === update.id) {
          return update;
        }
        return {
          id: updatedImage.id,
          sortIndex: updatedImage.sortIndex,
        };
      });

    return onlyUpdatedImages;
  };

  return {
    addImageToCache,
    getCachedImages,
    removeImageFromCache,
    updateImageCacheOnly,
  };
};
