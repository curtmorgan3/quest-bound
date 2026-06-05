import JSZip from 'jszip';

export interface RulesetBundlePreview {
  id: string;
  title: string;
  description: string;
  version: string;
  /** Direct URL for the cover image, or null if asset is binary-backed. */
  image: string | null;
  characterCtaTitle: string | null;
  characterCtaDescription: string | null;
  campaignsCtaTitle: string | null;
  campaignCtaDescription: string | null;
}

const URL_PATTERN = /^https?:\/\//i;

/**
 * Reads only `application data/metadata.json` from the bundle zip without writing
 * anything to IndexedDB. Used to populate the pre-auth landing page preview.
 */
export async function peekRulesetBundleMetadata(
  file: File,
): Promise<RulesetBundlePreview | null> {
  try {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);

    const METADATA_PATH = 'application data/metadata.json';
    let metadataFile = zipContent.file(METADATA_PATH);
    if (!metadataFile) {
      const key = Object.keys(zipContent.files).find((p) => p.endsWith(METADATA_PATH));
      if (key) metadataFile = zipContent.file(key) ?? null;
    }
    if (!metadataFile) return null;

    const raw = JSON.parse(await metadataFile.async('text'));
    const r = raw?.ruleset;
    if (!r?.id || !r?.title) return null;

    const rawImage = typeof r.image === 'string' ? r.image.trim() : null;

    return {
      id: r.id,
      title: r.title ?? '',
      description: r.description ?? '',
      version: r.version ?? '0.0.1',
      image: rawImage && URL_PATTERN.test(rawImage) ? rawImage : null,
      characterCtaTitle: r.characterCtaTitle ?? null,
      characterCtaDescription: r.characterCtaDescription ?? null,
      campaignsCtaTitle: r.campaignsCtaTitle ?? null,
      campaignCtaDescription: r.campaignCtaDescription ?? null,
    };
  } catch {
    return null;
  }
}
