import React from "react";
import BackButton from '../components/BackButton';

export default function Privacy() {
  return (
    <div style={{ padding: 24 }}>
      <BackButton to="/discover" style={{ marginBottom: '24px' }} />
      <h1>Privacy Policy</h1>
      <p>
        Questa è la pagina della Privacy Policy. Qui potrai inserire tutte le
        informazioni necessarie riguardo al trattamento dei dati personali.
      </p>
    </div>
  );
}