const CLOUDINARY_UPLOAD_MARKER = "/upload/";
const OPTIMIZED_TRANSFORMATION = "c_limit,w_1600,h_1600,q_auto,f_auto";
const OPTIMIZED_TOKENS = OPTIMIZED_TRANSFORMATION.split(",");

function hasOptimizationTransformation(pathAfterUpload: string) {
  const segments = pathAfterUpload.split("/");

  for (const segment of segments) {
    if (!segment || /^v\d+$/.test(segment)) break;

    const tokens = new Set(segment.split(","));
    if (OPTIMIZED_TOKENS.every((token) => tokens.has(token))) return true;
  }

  return false;
}

export function getOptimizedImageUrl(url: string): string {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes(CLOUDINARY_UPLOAD_MARKER)) {
    return url;
  }

  const [prefix, pathAfterUpload] = url.split(CLOUDINARY_UPLOAD_MARKER);
  if (!prefix || !pathAfterUpload || hasOptimizationTransformation(pathAfterUpload)) return url;

  return `${prefix}${CLOUDINARY_UPLOAD_MARKER}${OPTIMIZED_TRANSFORMATION}/${pathAfterUpload}`;
}
