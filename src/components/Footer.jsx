import React from "react";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="footer-brand">
            <div className="logo">V</div>
            <div>
              <div className="fb-name">BIDLi</div>
              <div className="fb-sub" style={{ color: "#ffffff", opacity: 0.9 }}>Social live marketplace</div>
            </div>
          </div>
          <p className="fb-text" style={{ color: "#ffffff", opacity: 0.9, marginBottom: '24px' }}>
            Live shopping di <b style={{ color: "#40e0d0" }}>Moda Vintage</b>, <b style={{ color: "#40e0d0" }}>Elettronica</b> e <b style={{ color: "#40e0d0" }}>Pre-loved</b>. 
            Offerte in tempo reale, chat e profili venditori.
          </p>
          
          <div>
            <div className="fg-title">Prodotto</div>
            <ul className="fg-links">
              <li><a href="/discover">Esplora le live</a></li>
              <li><a href="/sell">Diventa venditore</a></li>
              <li><a href="/discover#live-now">Entra in live</a></li>
            </ul>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div className="fg-title">Risorse</div>
            <ul className="fg-links">
              <li><a href="/how-it-works">Come funziona</a></li>
              <li><a href="/faq">FAQ</a></li>
              <li><a href="/support">Assistenza</a></li>
            </ul>
          </div>
          
          <div>
            <div className="fg-title">Legale</div>
            <ul className="fg-links">
              <li><a href="/privacy">Privacy Policy</a></li>
              <li><a href="/terms">Termini e Condizioni</a></li>
              <li><a href="/cookies">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="container footer-bottom">
        <div>© {new Date().getFullYear()} BIDLi</div>
        <div className="footer-mini-links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Termini</a>
          <a href="/cookies">Cookie</a>
          <a href="/contact">Contatti</a>
        </div>
      </div>
    </footer>
  );
}