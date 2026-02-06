// Utilitaire pour gérer les chemins d'images
export const getImagePath = (imageName) => {
  try {
    // Essayer d'importer l'image depuis le dossier assets
    return new URL(`../assets/images/${imageName}`, import.meta.url).href
  } catch (error) {
    console.warn(`Image ${imageName} not found, using fallback`)
    return new URL(`../assets/images/2.jpg`, import.meta.url).href
  }
}

// Images par défaut
export const defaultImages = {
  logo: getImagePath('logo_mayombe.jpg'),
  logoMono: getImagePath('LOGO_MAYOMBE_Mono.png'),
  cover: getImagePath('mayombe_1.jpg'),
  placeholder: getImagePath('2.jpg'),
}
