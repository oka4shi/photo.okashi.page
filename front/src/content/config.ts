import { defineCollection } from "astro:content";
import { eventSchema } from "common/schema";

const eventsCollection = defineCollection({
  type: "data",
  schema: eventSchema,
});

export const collections = {
  events: eventsCollection,
};
