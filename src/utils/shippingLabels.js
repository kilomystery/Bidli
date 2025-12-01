// src/utils/shippingLabels.js - Sistema etichette spedizione automatiche low-cost
import { supabase } from "../lib/supabaseClient";

/**
 * Sistema etichette automatiche integrato con servizi low-cost italiani
 * Supporta SpedireWeb.com (API OpenAPI) e Spediamo.it come servizi principali
 */

// Configurazione servizi spedizione
const SHIPPING_SERVICES = {
  inpost: {
    name: "InPost",
    baseUrl: "https://api.inpost.it",
    apiType: "shipx",
    minPrice: 3.99,
    features: ["locker2locker", "pudo_points", "tracking_sms", "sandbox_available", "vinted_compatible"],
    description: "Stesso servizio di Vinted - Locker capillari in Italia"
  },
  spedireweb: {
    name: "SpedireWeb",
    baseUrl: "https://api.spedireweb.com",
    minPrice: 5.75,
    features: ["api_openapi", "confronto_automatico", "tracking_incluso"]
  },
  spediamo: {
    name: "Spediamo.it", 
    baseUrl: "https://api.spediamo.it",
    minPrice: 5.57,
    features: ["api_custom", "ricarica_prepagata", "bonus_ricarica"]
  },
  paccofacile: {
    name: "PaccoFacile",
    baseUrl: "https://api.paccofacile.it",
    minPrice: 4.17,
    features: ["wallet_system", "peso_max_70kg", "sconti_80"]
  }
};

/**
 * Crea etichetta di spedizione automatica per ordine
 * @param {string} orderId - ID dell'ordine
 * @param {Object} shippingData - Dati spedizione
 * @returns {Promise<Object>} - Risultato creazione etichetta
 */
export async function createShippingLabel(orderId, shippingData) {
  try {
    // 1. Verifica che l'ordine esista e abbia prodotti multipli dallo stesso venditore
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id, total_amount, shipping_address, buyer_id,
        order_items (
          id, product_name, quantity, price,
          live_lot:lot_id ( seller_id, live_id )
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Ordine non trovato");
    }

    // 2. Raggruppa per venditore (un'etichetta per venditore)
    const itemsBySeller = {};
    order.order_items.forEach(item => {
      const sellerId = item.live_lot?.seller_id;
      if (!itemsBySeller[sellerId]) {
        itemsBySeller[sellerId] = [];
      }
      itemsBySeller[sellerId].push(item);
    });

    const labels = [];

    // 3. Crea un'etichetta per ogni venditore
    for (const [sellerId, items] of Object.entries(itemsBySeller)) {
      // Calcola peso e dimensioni stimati
      const estimatedWeight = items.reduce((total, item) => total + (item.quantity * 0.5), 0); // 500g per item
      const packageDimensions = calculatePackageDimensions(items);
      
      // Seleziona il servizio più economico
      const selectedService = await selectBestShippingService(estimatedWeight, packageDimensions);
      
      // Carica dati venditore
      const { data: seller } = await supabase
        .from("sellers")
        .select("display_name, shipping_address, contact_info")
        .eq("id", sellerId)
        .single();

      // Crea etichetta tramite API
      const labelData = await createLabelViaAPI(selectedService, {
        from: seller?.shipping_address || "Indirizzo venditore non configurato",
        to: order.shipping_address,
        weight: estimatedWeight,
        dimensions: packageDimensions,
        value: items.reduce((total, item) => total + (item.price * item.quantity), 0),
        description: items.map(item => item.product_name).join(", "),
        sellerName: seller?.display_name || "Venditore",
        orderId: orderId,
        sellerId: sellerId
      });

      // Salva etichetta nel database
      const { data: savedLabel, error: labelError } = await supabase
        .from("shipping_labels")
        .insert({
          order_id: orderId,
          seller_id: sellerId,
          service: selectedService.name,
          tracking_number: labelData.trackingNumber,
          label_url: labelData.labelUrl,
          cost: labelData.cost,
          estimated_delivery: labelData.estimatedDelivery,
          package_details: {
            weight: estimatedWeight,
            dimensions: packageDimensions,
            items: items.map(item => ({
              name: item.product_name,
              quantity: item.quantity
            }))
          },
          status: "created"
        })
        .select()
        .single();

      if (labelError) {
        console.error("Errore salvataggio etichetta:", labelError);
        throw labelError;
      }

      labels.push(savedLabel);
    }

    return {
      success: true,
      labels: labels,
      totalCost: labels.reduce((total, label) => total + label.cost, 0)
    };

  } catch (error) {
    console.error("Errore creazione etichette:", error);
    return {
      success: false,
      error: error.message,
      labels: []
    };
  }
}

/**
 * Calcola dimensioni pacchetto basate sui prodotti
 */
function calculatePackageDimensions(items) {
  // Stima basata sul numero di items (dimensioni standard small box)
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  
  if (itemCount <= 2) {
    return { length: 20, width: 15, height: 10 }; // Small
  } else if (itemCount <= 5) {
    return { length: 30, width: 20, height: 15 }; // Medium
  } else {
    return { length: 40, width: 30, height: 20 }; // Large
  }
}

/**
 * Seleziona il servizio di spedizione più conveniente
 */
async function selectBestShippingService(weight, dimensions) {
  // Priorità: InPost (come Vinted) > altri servizi
  // InPost è ideale per piccoli oggetti vintage
  if (weight <= 10 && dimensions.length <= 40) {
    return SHIPPING_SERVICES.inpost;
  }
  
  // Fallback per pacchi più grandi
  return SHIPPING_SERVICES.spedireweb;
}

/**
 * Crea etichetta tramite API del servizio selezionato
 */
async function createLabelViaAPI(service, packageData) {
  try {
    // Simulazione chiamata API (da implementare con chiavi reali)
    // Per ora ritorniamo dati mock ma con struttura corretta
    
    const mockResponse = {
      trackingNumber: `BDL${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      labelUrl: `https://labels.example.com/label_${Date.now()}.pdf`,
      cost: Math.max(service.minPrice, packageData.weight * 2.5), // €2.50 per kg
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // +2 giorni
      service: service.name,
      carrier: "Corriere Espresso"
    };

    // TODO: Implementare chiamate API reali
    /*
    const response = await fetch(`${service.baseUrl}/v1/labels`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SHIPPING_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from_address: packageData.from,
        to_address: packageData.to,
        parcel: {
          length: packageData.dimensions.length,
          width: packageData.dimensions.width,
          height: packageData.dimensions.height,
          weight: packageData.weight
        },
        options: {
          declared_value: packageData.value,
          description: packageData.description
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    */

    return mockResponse;

  } catch (error) {
    console.error("Errore API spedizione:", error);
    throw new Error(`Impossibile creare etichetta: ${error.message}`);
  }
}

/**
 * Ottieni stato tracking di una spedizione
 */
export async function getTrackingStatus(trackingNumber, service = "spedireweb") {
  try {
    const selectedService = SHIPPING_SERVICES[service];
    
    // TODO: Implementare chiamata API tracking reale
    const mockTracking = {
      trackingNumber,
      status: "in_transit",
      statusText: "In transito",
      estimatedDelivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      currentLocation: "Centro di smistamento Milano",
      events: [
        {
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          status: "picked_up",
          description: "Pacco ritirato dal venditore",
          location: "Origine"
        },
        {
          timestamp: new Date().toISOString(),
          status: "in_transit", 
          description: "In transito verso destinazione",
          location: "Centro smistamento Milano"
        }
      ]
    };

    return {
      success: true,
      tracking: mockTracking
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Calcola costo spedizione stimato
 */
export function calculateShippingCost(weight, dimensions, destination = "italia") {
  const basePrice = 4.17; // PaccoFacile prezzo minimo
  const weightCost = weight * 2.0; // €2 per kg
  const sizeCost = (dimensions.length + dimensions.width + dimensions.height) * 0.1;
  
  return Math.max(basePrice, weightCost + sizeCost);
}

/**
 * Ottieni lista servizi disponibili con prezzi
 */
export function getAvailableServices() {
  return Object.values(SHIPPING_SERVICES).map(service => ({
    ...service,
    estimatedCost: service.minPrice
  }));
}