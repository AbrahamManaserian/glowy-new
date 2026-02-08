export const safeTranslate = (key, t) => {
  if (!key) return '';
  const lowerKey = String(key).toLowerCase();

  // Check if translation exists using generic lookup if 'has' is not available
  const hasTranslation = t.has ? t.has(lowerKey) : true;

  if (hasTranslation) {
    const translation = t(lowerKey);
    // Fallback if translation equals key (common behavior when missing in some frameworks)
    // providing the key wasn't the intended translation.
    if (translation === lowerKey && key !== lowerKey) return key;
    return translation;
  }

  return key;
};
