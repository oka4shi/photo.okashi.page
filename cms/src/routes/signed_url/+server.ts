import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { error, json, type RequestHandler } from "@sveltejs/kit";
import {
  validExtensions,
  type validExtensionsType,
  type signedUrlCollectionType,
  type thumbnailExtensionsType,
} from "$lib/types/signelUrl";

import { env } from "$env/dynamic/private";

const signedUrlPeriod = 15; //minutes

const ACCOUNT_ID = env.ACCOUNT_ID || "";
const ACCESS_KEY_ID = env.ACCESS_KEY_ID || "";
const SECRET_ACCESS_KEY = env.SECRET_ACCESS_KEY || "";
const BUCKET_NAME = env.BUCKET_NAME || "";
console.log(BUCKET_NAME);

const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

const isValidExtension = (target: string): target is validExtensionsType => {
  return validExtensions.some((validExtension) => validExtension === target.toLowerCase());
};
const isAllValidExtensions = (target: string[]): target is validExtensionsType[] => {
  return target.every((t) => isValidExtension(t));
};

const getSignedUrlWrapper = async (name: string): Promise<string> => {
  return await getSignedUrl(R2, new PutObjectCommand({ Bucket: BUCKET_NAME, Key: name }), {
    expiresIn: signedUrlPeriod * 60,
  });
};
export const GET = (async ({ url }) => {
  /*
  オプションはquery paramsで以下の通り指定する。
  quantity: 要求するリンクの数。デフォルト=1
  extension: 元画像ファイルの拡張子。デフォルト=jpg
  thumbnail_extensions: サムネイルの拡張子。複数ある場合はカンマで区切る。デフォルト=(なし)

  なお、 拡張子は "jpg" | "jpeg" | "png" | "webp" | "avif" | "jxl" とする。大文字小文字は区別されない(case insensitive)。
  */
  const quantity = Number(url.searchParams.get("quantity") ?? "1");
  const extension = url.searchParams.get("extension") ?? "jpg";
  const thumbnailExtensions = url.searchParams.get("thumbnail_extensions")?.split(",") ?? [];

  if (!isValidExtension(extension) || !isAllValidExtensions(thumbnailExtensions)) {
    throw error(400, "Invalid flle extension");
  }

  try {
    const signedUrls: signedUrlCollectionType = await Promise.all(
      [...Array(quantity)].map(async () => {
        const uuid = crypto.randomUUID();

        const fileName = `${uuid}.${extension}`;
        const signedUrl = await getSignedUrlWrapper(fileName);

        const thumbnailUrls: thumbnailExtensionsType = {};
        const smallThumbnailUrls: thumbnailExtensionsType = {};
        await Promise.all(
          thumbnailExtensions.map(async (extension) => {
            const thumbnailFileName = `${uuid}_thumbnail.${extension}`;
            const thumbnailSignedUrl = await getSignedUrlWrapper(thumbnailFileName);
            thumbnailUrls[extension] = thumbnailSignedUrl;

            const smallThumbnailFileName = `${uuid}_small.${extension}`;
            const smallThumbnailSignedUrl = await getSignedUrlWrapper(smallThumbnailFileName);
            smallThumbnailUrls[extension] = smallThumbnailSignedUrl;
          })
        );

        if (Object.keys(thumbnailUrls).length >= 1) {
          return { id: uuid, raw: signedUrl, thumbnail: thumbnailUrls, smallThumbnail: smallThumbnailUrls };
        } else {
          return { id: uuid, raw: signedUrl };
        }
      })
    );

    return json(signedUrls);
  } catch (e) {
    throw error(500, "Failed to generate signed URL");
  }
}) satisfies RequestHandler;
