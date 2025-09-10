// Configuration Stripe
// Clés Stripe configurées

export const STRIPE_CONFIG = {
  // Clé publique Stripe (visible côté client)
  publishableKey: 'pk_live_51RohZiJAu71PPGbllP3B0WwgX1KwhVv3KAmO9qbOib1V8aZmZpRTBkJlGA7d9IHY2gRNoXNakUZsqFYAXhiKMIAT002CHeaGQP',
  
  // Clé secrète Stripe (côté serveur uniquement - NE PAS exposer ici)
  // La clé secrète doit rester côté serveur pour des raisons de sécurité
};

// Fonction pour obtenir la clé publique
export const getStripePublishableKey = () => {
  return STRIPE_CONFIG.publishableKey;
};

// Note: La clé secrète doit rester côté serveur pour des raisons de sécurité