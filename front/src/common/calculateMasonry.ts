import type { photoSchemaType } from "common/schema";

export const calculateMasonry = (photos: photoSchemaType[], columnNumber: number): photoSchemaType[][] => {
  const columns: photoSchemaType[][] = [...Array(columnNumber)].map(() => Array());
  const columnHeights: number[] = new Array(columnNumber).fill(0);

  photos.forEach((photo) => {
    const column = columnHeights.indexOf(Math.min.apply(null, columnHeights));
    columnHeights[column] += photo.aspectRatio;
    columns[column].push(photo);
  });

  return columns;
};
