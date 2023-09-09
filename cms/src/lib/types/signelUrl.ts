export const validExtensions = ["jpg", "jpeg", "png", "webp", "avif", "jxl"] as const;
export type validExtensionsType = (typeof validExtensions)[number];
export type thumbnailExtensionsType = {
  [key in validExtensionsType]?: string;
};

export type signedUrlCollectionType = {
  id: string;
  raw: string;
  thumbnail?: thumbnailExtensionsType;
}[];
