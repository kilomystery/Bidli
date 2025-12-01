// src/pages/CreateStory.jsx - Creazione Stories (24h) COMPLETA
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X, Camera, Type, Palette, Send } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { getCurrentSession } from "../lib/globalRole";
import "../styles/create-story.css";

export default function CreateStory() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // Form state
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [storyText, setStoryText] = useState("");
  const [visibility, setVisibility] = useState("public"); // public, following, private
  const [backgroundColor, setBackgroundColor] = useState("#667eea");
  const [textColor, setTextColor] = useState("#ffffff");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Gestione selezione media
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const validSize = file.size <= 100 * 1024 * 1024; // 100MB max per stories

    if (!(isImage || isVideo)) {
      alert("Solo immagini e video sono supportati per le stories");
      return;
    }

    if (!validSize) {
      alert("File troppo grande. Max 100MB per le stories");
      return;
    }

    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload media su Supabase Storage
  const uploadMedia = async () => {
    if (!mediaFile) return null;

    setUploading(true);

    try {
      const fileName = `stories/${Date.now()}-${Math.random().toString(36).substring(7)}-${mediaFile.name}`;
      
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(fileName, mediaFile);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName);

      return {
        url: publicUrl,
        type: mediaFile.type.startsWith('video/') ? 'video' : 'image',
        name: mediaFile.name
      };
    } catch (error) {
      console.error('Errore upload media story:', error);
      throw new Error('Errore durante il caricamento del media');
    } finally {
      setUploading(false);
    }
  };

  // Salvataggio story
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!mediaFile && !storyText.trim()) {
      alert("Aggiungi un'immagine/video o del testo per la tua story");
      return;
    }

    setSaving(true);

    try {
      const session = getCurrentSession();
      if (!session?.user?.id) {
        throw new Error("Devi essere loggato per creare una story");
      }

      // Upload media se presente
      const mediaData = await uploadMedia();

      // Salva story nel database
      const storyData = {
        user_id: session.user.id,
        content: storyText.trim() || null,
        media_url: mediaData?.url || null,
        media_type: mediaData?.type || 'text',
        visibility: visibility,
        background_color: backgroundColor,
        text_color: textColor,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
        created_at: new Date().toISOString()
      };

      // ✅ PUBBLICAZIONE AUTOMATICA STORIES
      const { error } = await supabase
        .from('stories')
        .insert([storyData]);

      if (error) throw error;

      // 📢 Notifica sistema di nuova story per StoriesBar
      console.log('📖 Story pubblicata!', {
        user_id: session.user.id,
        visibility: visibility,
        expires_at: storyData.expires_at
      });

      // 🎉 Successo!
      setSuccess(true);
      setTimeout(() => {
        navigate('/discover');
      }, 2000);

    } catch (error) {
      console.error('Errore salvataggio story:', error);
      alert(error.message || 'Errore durante la creazione della story');
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="create-story-page">
        <div className="story-success">
          <div className="success-icon">📖</div>
          <h2>Story pubblicata!</h2>
          <p>La tua story è ora visibile per 24 ore</p>
        </div>
      </div>
    );
  }

  return (
    <div className="create-story-page">
      {/* Header */}
      <div className="story-header">
        <button 
          className="back-button"
          onClick={() => navigate(-1)}
          disabled={saving}
        >
          <ArrowLeft size={24} />
        </button>
        <h1>Crea Story</h1>
        <button
          className="publish-button"
          onClick={handleSubmit}
          disabled={saving || uploading || (!mediaFile && !storyText.trim())}
        >
          {saving ? <div className="spinner"></div> : <Send size={20} />}
        </button>
      </div>

      {/* Main Content */}
      <div className="story-content">
        
        {/* Preview Area */}
        <div className="story-preview" style={{ backgroundColor }}>
          {mediaPreview ? (
            <div className="media-preview">
              {mediaFile?.type.startsWith('video/') ? (
                <video
                  src={mediaPreview}
                  className="preview-video"
                  controls
                  muted
                />
              ) : (
                <img
                  src={mediaPreview}
                  alt="Story preview"
                  className="preview-image"
                />
              )}
              
              {/* Overlay Text */}
              {storyText && (
                <div 
                  className="story-overlay-text"
                  style={{ color: textColor }}
                >
                  {storyText}
                </div>
              )}

              {/* Remove Media Button */}
              <button
                className="remove-media-btn"
                onClick={removeMedia}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <div className="empty-preview">
              {storyText ? (
                <div 
                  className="text-only-story"
                  style={{ color: textColor }}
                >
                  {storyText}
                </div>
              ) : (
                <div className="placeholder">
                  <Camera size={48} />
                  <p>Aggiungi foto/video o testo</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="story-controls">
          
          {/* Media Upload */}
          <div className="control-section">
            <h3><Camera size={18} /> Media</h3>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={saving}
            />
            <button
              className="control-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving || uploading}
            >
              <Upload size={16} />
              {uploading ? 'Caricamento...' : 'Aggiungi Media'}
            </button>
          </div>

          {/* Text Content */}
          <div className="control-section">
            <h3><Type size={18} /> Testo</h3>
            <textarea
              className="story-text-input"
              value={storyText}
              onChange={(e) => setStoryText(e.target.value)}
              placeholder="Aggiungi del testo alla tua story..."
              maxLength={500}
              disabled={saving}
            />
            <div className="char-count">{storyText.length}/500</div>
          </div>

          {/* Styling */}
          <div className="control-section">
            <h3><Palette size={18} /> Stile</h3>
            <div className="color-controls">
              <div className="color-row">
                <label>Sfondo:</label>
                <div className="color-options">
                  {['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#a8edea', '#fed6e3'].map(color => (
                    <button
                      key={color}
                      className={`color-btn ${backgroundColor === color ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setBackgroundColor(color)}
                      disabled={saving}
                    />
                  ))}
                </div>
              </div>
              
              <div className="color-row">
                <label>Testo:</label>
                <div className="color-options">
                  {['#ffffff', '#000000', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b'].map(color => (
                    <button
                      key={color}
                      className={`color-btn ${textColor === color ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setTextColor(color)}
                      disabled={saving}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Visibility */}
          <div className="control-section">
            <h3>👁️ Visibilità</h3>
            <div className="visibility-compact">
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="visibility-select"
                disabled={saving}
              >
                <option value="public">🌐 Tutti</option>
                <option value="following">👥 Solo a seguito</option>
                <option value="private">🔒 Solo a me</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}