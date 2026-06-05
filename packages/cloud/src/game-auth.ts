import { cloudClient } from './client';

export async function checkGameAuthorization(gameId: string, userId: string): Promise<boolean> {
  if (!cloudClient || !gameId || !userId) return false;
  const { data, error } = await cloudClient
    .from('user_game_purchase_authorizations')
    .select('user_id')
    .eq('game_id', gameId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export interface GameRecord {
  title: string;
  description: string;
  header: string;
  version: string;
  price: number;
  salePrice: number | null;
  coverImageUrl: string;
  carouselAssets: unknown;
  links: unknown;
  publisherName: string;
  releaseDate: string | null;
  updatedAt: string | null;
  slug: string;
  orgSlug: string | null;
}

export async function fetchGameRecord(gameId: string): Promise<GameRecord | null> {
  if (!cloudClient || !gameId) return null;
  const { data, error } = await cloudClient
    .from('games')
    .select(
      'title, description, header, version, price, sale_price, cover_image_url, carousel_assets, links, publisher_name, release_date, updated_at, slug, organizations(slug)',
    )
    .eq('id', gameId)
    .maybeSingle();
  if (error || !data) return null;
  const raw = data as unknown as {
    title: string;
    description: string;
    header: string;
    version: string;
    price: number;
    sale_price: number | null;
    cover_image_url: string;
    carousel_assets: unknown;
    links: unknown;
    publisher_name: string;
    release_date: string | null;
    updated_at: string | null;
    slug: string;
    organizations: { slug: string } | { slug: string }[] | null;
  };
  const org = Array.isArray(raw.organizations) ? raw.organizations[0] : raw.organizations;
  return {
    title: raw.title ?? '',
    description: raw.description ?? '',
    header: raw.header ?? '',
    version: raw.version ?? '',
    price: raw.price ?? 0,
    salePrice: raw.sale_price ?? null,
    coverImageUrl: raw.cover_image_url ?? '',
    carouselAssets: raw.carousel_assets,
    links: raw.links,
    publisherName: raw.publisher_name ?? '',
    releaseDate: raw.release_date ?? null,
    updatedAt: raw.updated_at ?? null,
    slug: raw.slug ?? '',
    orgSlug: org?.slug ?? null,
  };
}
