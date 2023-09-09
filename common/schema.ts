import { z } from "zod";

const exifSchema = z.object({
    make: z.string().optional(),
    model: z.string().optional(),
    exposureTime: z.string().optional(),
    fNumber: z.string().optional(),
    photographicSensitivity: z.string().optional(),
    exposureBiasValue: z.string().optional(),
    focalLength: z.string().optional(),
    focalLengthIn35mmFilm: z.string().optional(),
    lensMake: z.string().optional(),
    lensModel: z.string().optional(),

    gpsLatitude: z.number().optional(),
    gpsLongitude: z.number().optional(),
    gpsAltitude: z.number().optional(),
});

const photoSchema = z.object({
    id: z.string().uuid(),
    URL: z.string().url(),
    thumbnailURL: z.string().url(),
    description: z.string(),
    place: z.string(),
    dateTime: z.string().datetime().optional(),
    timezone: z.string().optional(),
    aspectRatio: z.number(),
    exif: exifSchema,
});

export const eventSchema = z.object({
    meta: z.object({
        title: z.string(),
        description: z.string(),
        start_at: z.string().datetime(),
        end_at: z.string().datetime().optional(),
    }),
    photos: photoSchema.array(),
});

export type eventSchemaType = z.infer<typeof eventSchema>;
export type exifSchemaType = z.infer<typeof exifSchema>;
export type photoSchemaType = z.infer<typeof photoSchema>;
