import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Carica Stripe con la chiave pubblica
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const StripeProvider = ({ children }) => {
  const options = {
    locale: 'it',
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#8b5cf6',
        colorBackground: '#ffffff',
        colorText: '#262626',
        colorDanger: '#df1b41',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '6px',
        borderRadius: '8px'
      }
    }
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
};

export default StripeProvider;