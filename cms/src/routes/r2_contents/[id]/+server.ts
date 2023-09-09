import { S3Client, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

import { error, json, type RequestHandler } from "@sveltejs/kit";

import { env } from "$env/dynamic/private";

const ACCOUNT_ID = env.ACCOUNT_ID || "";
const ACCESS_KEY_ID = env.ACCESS_KEY_ID || "";
const SECRET_ACCESS_KEY = env.SECRET_ACCESS_KEY || "";
const BUCKET_NAME = env.BUCKET_NAME || "";

const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

const isUUID = (target: string) => {
  return /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$/i.test(target);
};

export const DELETE = (async ({ params }) => {
  const id = params.id ?? "";

  if (!isUUID(id)) {
    throw error(400, "Invalid id type");
  }

  try {
    const { Contents } = await R2.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: id,
      })
    );

    console.log(Contents);
    if (!(Contents && Contents.length >= 1)) {
      throw error(404, "Object is not found");
    }
    //throw error(418);

    const keys = Contents.map((d) => ({
      Key: d.Key as string,
    }));

    const res = await R2.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: { Objects: keys },
      })
    );
    if (res.Errors) {
      throw error(500, "An error has ocurred during deleting an object");
    }

    if (res.Deleted) {
      return new Response(null, { status: 204 });
    } else {
      throw error(500, "Object was not deleted");
    }
  } catch (error: any) {
    throw error(500, "Failed to delete the object");
  }
}) satisfies RequestHandler;
