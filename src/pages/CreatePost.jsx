// src/pages/CreatePost.jsx - Creazione post social
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X, FileText, Loader, CheckCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { getCurrentSession } from "../lib/globalRole";
import "../styles/create-post.css";

export default function CreatePost() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState("public"); // public, private, following
  const [tags, setTags] = useState([]);
  const [mentions, setMentions] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Gestione upload file
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const validSize = file.size <= 50 * 1024 * 1024; // 50MB max
      return (isImage || isVideo) && validSize;
    });

    if (validFiles.length !== files.length) {
      alert("Solo immagini e video sotto 50MB sono supportati");
    }

    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 file
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ✅ TAG E MENTIONS PARSING
  const parseTagsAndMentions = (text) => {
    // Estrai hashtags (#tag)
    const hashtags = text.match(/#[\w\u00C0-\u017F]+/g) || [];
    const cleanTags = hashtags.map(tag => tag.slice(1).toLowerCase());
    
    // Estrai mentions (@username)
    const mentions = text.match(/@[\w\u00C0-\u017F]+/g) || [];
    const cleanMentions = mentions.map(mention => mention.slice(1).toLowerCase());
    
    return {
      tags: [...new Set(cleanTags)], // Rimuove duplicati
      mentions: [...new Set(cleanMentions)]
    };
  };

  // Update tags e mentions quando cambia il contenuto
  const handleContentChange = (newContent) => {
    setContent(newContent);
    const parsed = parseTagsAndMentions(newContent);
    setTags(parsed.tags);
    setMentions(parsed.mentions);
  };

  // Rimuove tag manualmente
  const removeTag = (tagToRemove) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
    // Rimuove anche dal contenuto
    const newContent = content.replace(new RegExp(`#${tagToRemove}\\b`, 'gi'), '').trim();
    setContent(newContent);
  };

  // Rimuove mention manualmente
  const removeMention = (mentionToRemove) => {
    setMentions(prev => prev.filter(mention => mention !== mentionToRemove));
    // Rimuove anche dal contenuto
    const newContent = content.replace(new RegExp(`@${mentionToRemove}\\b`, 'gi'), '').trim();
    setContent(newContent);
  };

  // Upload file su Supabase Storage
  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return [];

    setUploading(true);
    const uploadedUrls = [];

    try {
      for (const file of selectedFiles) {
        const fileName = `posts/${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
        
        const { data, error } = await supabase.storage
          .from('uploads')
          .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('uploads')
          .getPublicUrl(fileName);

        uploadedUrls.push({
          url: publicUrl,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          name: file.name
        });
      }
    } catch (error) {
      console.error('Errore upload:', error);
      throw new Error('Errore durante il caricamento dei file');
    } finally {
      setUploading(false);
    }

    return uploadedUrls;
  };

  // Salvataggio post
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      alert("Titolo e contenuto sono obbligatori");
      return;
    }

    setSaving(true);

    try {
      const session = getCurrentSession();
      if (!session?.user?.id) {
        throw new Error("Devi essere loggato per creare un post");
      }

      // Upload file se presenti
      const mediaUrls = await uploadFiles();

      // Salva post nel database
      const postData = {
        user_id: session.user.id,
        title: title.trim(),
        content: content.trim(),
        visibility: visibility, // tutti/solo a me/solo a seguito
        tags: tags.length > 0 ? JSON.stringify(tags) : null,
        mentions: mentions.length > 0 ? JSON.stringify(mentions) : null,
        media_urls: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : null,
        status: 'published',
        created_at: new Date().toISOString()
      };

      // ✅ PUBBLICAZIONE AUTOMATICA DUAL
      // 1. Salva nella tabella SOCIAL_POSTS per /explore-post
      if (visibility === 'public') {
        const { error: socialError } = await supabase
          .from('social_posts')
          .insert([{
            ...postData,
            vitality: 0, // Vitalità iniziale
            likes: 0,
            comments: 0,
            views: 0,
            images: mediaUrls.length > 0 ? mediaUrls.map(m => m.url) : null
          }]);

        if (socialError) console.warn('Social posts error:', socialError);
      }

      // 2. Salva nella tabella POSTS per profilo utente
      const { error } = await supabase
        .from('posts')
        .insert([postData]);

      if (error) throw error;

      // 🎉 Successo! Pubblicato automaticamente
      setSuccess(true);
      setTimeout(() => {
        navigate(visibility === 'public' ? '/explorepost' : '/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Errore salvataggio post:', error);
      alert(error.message || 'Errore durante la creazione del post');
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="create-post-page">
        <div className="create-post-success">
          <CheckCircle size={64} color="#22c55e" />
          <h2>Post pubblicato con successo!</h2>
          <p>Ti stiamo reindirizzando alla community...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="create-post-page">
      <div className="create-post-header">
        <button 
          className="back-button"
          onClick={() => navigate(-1)}
          disabled={saving}
        >
          <ArrowLeft size={24} />
        </button>
        <h1>Crea Post</h1>
        <div></div>
      </div>

      <form className="create-post-form" onSubmit={handleSubmit}>
        {/* Titolo */}
        <div className="form-group">
          <label className="form-label">
            <FileText size={20} />
            Titolo del post
          </label>
          <input
            type="text"
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Inserisci il titolo del tuo post..."
            maxLength={100}
            disabled={saving}
          />
          <div className="char-count">{title.length}/100</div>
        </div>

        {/* Contenuto */}
        <div className="form-group">
          <label className="form-label">Contenuto</label>
          <textarea
            className="form-textarea"
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Condividi i tuoi pensieri, storie o aggiornamenti con la community BIDLi... 

Usa #hashtag per i tag e @username per le mention!"
            maxLength={2000}
            rows={6}
            disabled={saving}
          />
          <div className="char-count">{content.length}/2000</div>
        </div>

        {/* ✅ VISIBILITÀ POST */}
        <div className="form-group">
          <label className="form-label">🌍 Chi può vedere questo post?</label>
          <div className="visibility-options">
            <label className={`visibility-option ${visibility === 'public' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === 'public'}
                onChange={(e) => setVisibility(e.target.value)}
                disabled={saving}
              />
              <div className="option-content">
                <div className="option-icon">🌐</div>
                <div className="option-text">
                  <div className="option-title">Tutti</div>
                  <div className="option-desc">Visibile a tutti gli utenti di BIDLi</div>
                </div>
              </div>
            </label>

            <label className={`visibility-option ${visibility === 'following' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="visibility"
                value="following"
                checked={visibility === 'following'}
                onChange={(e) => setVisibility(e.target.value)}
                disabled={saving}
              />
              <div className="option-content">
                <div className="option-icon">👥</div>
                <div className="option-text">
                  <div className="option-title">Solo a seguito</div>
                  <div className="option-desc">Visibile solo ai tuoi follower</div>
                </div>
              </div>
            </label>

            <label className={`visibility-option ${visibility === 'private' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={visibility === 'private'}
                onChange={(e) => setVisibility(e.target.value)}
                disabled={saving}
              />
              <div className="option-content">
                <div className="option-icon">🔒</div>
                <div className="option-text">
                  <div className="option-title">Solo a me</div>
                  <div className="option-desc">Visibile solo a te (bozza privata)</div>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* ✅ TAG E MENTIONS PREVIEW */}
        {(tags.length > 0 || mentions.length > 0) && (
          <div className="form-group">
            <label className="form-label">🏷️ Tag e Mentions rilevati</label>
            
            {/* Tags */}
            {tags.length > 0 && (
              <div className="tags-mentions-section">
                <div className="section-title">Hashtags:</div>
                <div className="tags-grid">
                  {tags.map((tag, index) => (
                    <div key={index} className="tag-chip">
                      <span className="tag-text">#{tag}</span>
                      <button
                        type="button"
                        className="tag-remove"
                        onClick={() => removeTag(tag)}
                        disabled={saving}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mentions */}
            {mentions.length > 0 && (
              <div className="tags-mentions-section">
                <div className="section-title">Mentions:</div>
                <div className="tags-grid">
                  {mentions.map((mention, index) => (
                    <div key={index} className="mention-chip">
                      <span className="mention-text">@{mention}</span>
                      <button
                        type="button"
                        className="mention-remove"
                        onClick={() => removeMention(mention)}
                        disabled={saving}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="tags-hints">
              💡 Scrivi #tuohashtag e @username nel contenuto per aggiungerli automaticamente
            </div>
          </div>
        )}

        {/* Media Upload */}
        <div className="form-group">
          <label className="form-label">
            <Upload size={20} />
            Immagini e Video (opzionale)
          </label>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={saving}
          />

          {selectedFiles.length < 5 && (
            <button
              type="button"
              className="upload-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving || uploading}
            >
              <Upload size={20} />
              {uploading ? 'Caricamento...' : 'Aggiungi Media'}
            </button>
          )}

          {/* Preview file selezionati */}
          {selectedFiles.length > 0 && (
            <div className="file-preview-grid">
              {selectedFiles.map((file, index) => (
                <div key={index} className="file-preview">
                  {file.type.startsWith('image/') ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="preview-image"
                    />
                  ) : (
                    <video
                      src={URL.createObjectURL(file)}
                      className="preview-video"
                      controls
                    />
                  )}
                  <button
                    type="button"
                    className="remove-file"
                    onClick={() => removeFile(index)}
                    disabled={saving}
                  >
                    <X size={16} />
                  </button>
                  <div className="file-name">{file.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="submit-button"
          disabled={saving || uploading || !title.trim() || !content.trim()}
        >
          {saving ? (
            <>
              <Loader size={20} className="loading-spin" />
              Pubblicazione...
            </>
          ) : (
            'Pubblica Post'
          )}
        </button>
      </form>
    </div>
  );
}