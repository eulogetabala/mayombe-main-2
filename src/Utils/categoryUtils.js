export const normalizeCategory = (category) => {
  if (__DEV__) {
    // Log seulement en développement et une fois par catégorie
    console.log('Normalized category name:', category.toLowerCase());
  }
  return category.toLowerCase();
}; 