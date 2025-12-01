import React from "react";
import BackButton from '../components/BackButton';

export default function Help() {
  return (
    <div style={{ padding: 24 }}>
      <BackButton to="/discover" style={{ marginBottom: '24px' }} />
      <h1>Centro Assistenza</h1>
      <p>
        Benvenuto nella sezione Help. Qui potrai aggiungere FAQ, guide o
        contatti utili per supportare i tuoi utenti.
      </p>
    </div>
  );
}