/**
 * Size targets for pendiente photos.
 *
 * A PDF column is about half the A4 content width (~240pt) and at most ~348pt
 * tall. 1600px on that long edge is roughly 330–480 ppi at the size the photo
 * is drawn, which is already print resolution, so a larger embed mostly adds
 * bytes. Quality stays high so mortar, cracks, and labels do not go muddy.
 *
 * The copy stored in R2 is larger than the embed: the project page and the
 * annotator show the photo bigger than the PDF column.
 */

/** Longest edge embedded in the open-pendientes PDF. */
export const PDF_PHOTO_MAX_EDGE = 1600;

/** mozjpeg quality for PDF embeds. */
export const PDF_JPEG_QUALITY = 90;

/** Longest edge stored in R2 and used by the annotator canvas. */
export const STORED_FOTO_MAX_EDGE = 2400;

/**
 * Canvas JPEG qualities, highest first. The lower steps exist only so a photo
 * can still land under the 10 MB cap.
 */
export const STORED_FOTO_JPEG_QUALITIES = [0.92, 0.86, 0.8] as const;

/**
 * A JPEG already inside the stored edge and this size is kept unchanged, so
 * saving it does not add another generation of loss. The PDF still re-encodes it.
 */
export const STORED_FOTO_KEEP_MAX_BYTES = 1_500_000;
