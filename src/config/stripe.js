// src/config/stripe.js
// Configurazione Stripe per BIDLi.live

// IMPORTANTE: Per utilizzare Stripe avrai bisogno di:
// 1. Account Stripe (gratuito): https://stripe.com
// 2. API Keys da inserire nelle environment variables

export const STRIPE_CONFIG = {
  // Queste verranno caricate dalle environment variables
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  secretKey: import.meta.env.STRIPE_SECRET_KEY, // Solo per backend
  
  // Configurazione prodotti
  products: {
    // Commissioni piattaforma (personalizzabili)
    commission_rate: 0.10, // 10% commissione BIDLi dal venditore
    
    // Fee fisse
    listing_fee: 0, // Gratuito listare prodotti
    success_fee: 0.029, // 2.9% fee Stripe standard (da acquirente)
    
    // Spedizioni
    shipping_cost: 5.90, // Costo spedizione base a carico acquirente
    
    // Limiti
    min_price: 1.00, // Minimo €1
    max_price: 10000.00, // Massimo €10,000
  },
  
  // Configurazione pagamenti
  payment_methods: [
    'card', // Carte di credito/debito
    'sepa_debit', // SEPA (Europa)
    'ideal', // iDEAL (Olanda)
    'giropay', // Giropay (Germania)
    'sofort', // Sofort (Europa)
    'bancontact', // Bancontact (Belgio)
  ],
  
  // Configurazione checkout
  checkout: {
    mode: 'payment', // Pagamento singolo
    currency: 'eur',
    locale: 'it',
    billing_address_collection: 'required',
    shipping_address_collection: {
      allowed_countries: ['IT', 'ES', 'FR', 'DE', 'AT', 'CH']
    }
  },
  
  // Webhook endpoints
  webhooks: {
    endpoint_secret: import.meta.env.STRIPE_WEBHOOK_SECRET,
    events: [
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'checkout.session.completed',
      'invoice.payment_succeeded',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted'
    ]
  }
};

// Utility functions per calcoli
export const calculateFees = (amount, includeShipping = true) => {
  const stripeFee = amount * STRIPE_CONFIG.products.success_fee;
  const platformFee = amount * STRIPE_CONFIG.products.commission_rate; // Commissione dal venditore
  const shipping = includeShipping ? STRIPE_CONFIG.products.shipping_cost : 0;
  const sellerAmount = amount - platformFee; // Venditore paga solo commissione BIDLi
  const buyerTotal = amount + stripeFee + shipping; // Acquirente paga prodotto + Stripe + spedizione
  
  return {
    itemPrice: amount, // Prezzo base prodotto
    stripeFee: parseFloat(stripeFee.toFixed(2)), // A carico acquirente
    platformFee: parseFloat(platformFee.toFixed(2)), // A carico venditore 
    shippingCost: parseFloat(shipping.toFixed(2)), // A carico acquirente
    sellerReceives: parseFloat(sellerAmount.toFixed(2)), // Quello che riceve il venditore
    buyerPays: parseFloat(buyerTotal.toFixed(2)) // Totale che paga l'acquirente
  };
};

export const formatPrice = (amount, currency = 'EUR') => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Validazione prezzi
export const validatePrice = (price) => {
  const numPrice = parseFloat(price);
  
  if (isNaN(numPrice)) {
    return { valid: false, error: 'Prezzo non valido' };
  }
  
  if (numPrice < STRIPE_CONFIG.products.min_price) {
    return { 
      valid: false, 
      error: `Prezzo minimo: ${formatPrice(STRIPE_CONFIG.products.min_price)}` 
    };
  }
  
  if (numPrice > STRIPE_CONFIG.products.max_price) {
    return { 
      valid: false, 
      error: `Prezzo massimo: ${formatPrice(STRIPE_CONFIG.products.max_price)}` 
    };
  }
  
  return { valid: true };
};