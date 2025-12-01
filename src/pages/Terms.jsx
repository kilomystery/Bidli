import React from "react";
import BackButton from '../components/BackButton';

export default function Terms() {
  return (
    <div style={{ padding: 24 }}>
      <BackButton to="/discover" style={{ marginBottom: '24px' }} />
      <h1>Termini e Condizioni</h1>
      <p>
        Questa è la pagina dei Termini e Condizioni. Qui potrai inserire i
        dettagli sulle regole d’uso della piattaforma, diritti e doveri degli
        utenti.
      </p>
    </div>
  );
}