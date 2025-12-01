// src/pages/DashboardPosts.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Plus, Edit, Trash2, Eye, Upload, Image, Video } from "lucide-react";

export default function DashboardPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [seller, setSeller] = useState(null);
  
  // Form states
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    // 1. Get seller info
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const { data: sellerData } = await supabase
      .from("sellers")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();
    
    if (!sellerData) {
      setLoading(false);
      return;
    }
    
    setSeller(sellerData);
    
    // 2. Get posts from social_posts
    const { data: postsData } = await supabase
      .from("social_posts")
      .select("*")
      .eq("user_id", sellerData.user_id) // ✅ Usa l'ID del profilo utente
      .order("created_at", { ascending: false });
    
    
    setPosts(postsData || []);
    setLoading(false);
  };

  const resetForm = () => {
    setTitle("");
    setBody("");
    setMediaFile(null);
    setCreating(false);
    setEditingPost(null);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !seller) return;
    
    setUploading(true);
    
    let mediaUrl = null;
    let mediaType = null;
    
    // Upload media if present
    if (mediaFile) {
      const fileExt = mediaFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `posts/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, mediaFile);
      
      if (uploadError) {
        console.error("Errore upload:", uploadError);
        setUploading(false);
        return;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);
      
      mediaUrl = publicUrl;
      mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
    }
    
    // Prepara i dati del post per social_posts
    const postData = {
      user_id: seller.user_id, // ✅ Usa l'ID del profilo utente, non del seller
      content: `${title.trim()}${body ? '\n\n' + body.trim() : ''}`,
      images: mediaUrl ? [mediaUrl] : [],
      status: 'published',
      visibility: 'public', // ✅ Campo visibility obbligatorio
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
      views_count: 0,
      is_pinned: false
    };
    
    let error;
    
    if (editingPost) {
      // Update existing post in social_posts
      const { error: updateError } = await supabase
        .from("social_posts")
        .update(postData)
        .eq("id", editingPost.id);
      error = updateError;
    } else {
      // Create new post in social_posts
      const { error: insertError } = await supabase
        .from("social_posts")
        .insert(postData);
      error = insertError;
    }
    
    if (error) {
      console.error("Errore salvataggio post:", error);
    } else {
      resetForm();
      loadData(); // Refresh
    }
    
    setUploading(false);
  };

  const deletePost = async (postId) => {
    if (!confirm("Eliminare questo post? L'azione non può essere annullata.")) return;
    
    const { error } = await supabase.from("social_posts").delete().eq("id", postId);
    
    if (!error) {
      loadData(); // Refresh
    }
  };

  const startEdit = (post) => {
    setEditingPost(post);
    // Estrai titolo e corpo dal content
    const contentLines = post.content ? post.content.split('\n\n') : ['', ''];
    setTitle(contentLines[0] || '');
    setBody(contentLines[1] || '');
    setCreating(true);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container section">
        <h1>Caricamento posts...</h1>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="container section">
        <h1>Accesso negato</h1>
        <p>Devi essere un venditore registrato per gestire i posts.</p>
      </div>
    );
  }

  return (
    <div className="container section">
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: 32 
      }}>
        <h1 style={{ margin: 0 }}>I miei Posts</h1>
        <button
          className="btn btn-primary"
          onClick={() => setCreating(true)}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <Plus size={18} />
          Nuovo Post
        </button>
      </div>

      {/* QUICK BOOST LINKS */}
      <div style={{
        background: "#fff",
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        border: "1px solid #f0f0f0"
      }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 700, color: "#2d3748" }}>
          🚀 Boost BIDLi
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <a
            href="/seller/boost"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 16,
              background: "linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)",
              border: "2px solid #fed7aa",
              borderRadius: 12,
              textDecoration: "none",
              color: "#d97706",
              fontWeight: 600,
              transition: "all 0.2s ease"
            }}
          >
            <span style={{ fontSize: 20 }}>📝</span>
            Boost Post
          </a>
          
          <a
            href="/account/settings"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 16,
              background: "linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%)",
              border: "2px solid #c7d2fe",
              borderRadius: 12,
              textDecoration: "none",
              color: "#4c2bd1",
              fontWeight: 600,
              transition: "all 0.2s ease"
            }}
          >
            <span style={{ fontSize: 20 }}>👤</span>
            Boost Profilo
          </a>
          
          <a
            href="/sell"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 16,
              background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
              border: "2px solid #fca5a5",
              borderRadius: 12,
              textDecoration: "none",
              color: "#dc2626",
              fontWeight: 600,
              transition: "all 0.2s ease"
            }}
          >
            <span style={{ fontSize: 20 }}>📺</span>
            Boost Live
          </a>
        </div>
      </div>

      {/* Create/Edit Post Modal */}
      {creating && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20
        }}>
          <div style={{
            background: "white",
            borderRadius: 12,
            padding: 24,
            maxWidth: 500,
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto"
          }}>
            <h3 style={{ marginTop: 0 }}>
              {editingPost ? "Modifica Post" : "Crea nuovo Post"}
            </h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                Titolo *
              </label>
              <input
                type="text"
                placeholder="Titolo del post..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: "100%",
                  padding: 12,
                  border: "1px solid #ddd",
                  borderRadius: 8
                }}
                maxLength={200}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                Descrizione
              </label>
              <textarea
                placeholder="Scrivi qualcosa su questo post..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                style={{
                  width: "100%",
                  padding: 12,
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  resize: "vertical"
                }}
                maxLength={1000}
              />
              <div style={{ fontSize: 12, color: "#6b7280", textAlign: "right" }}>
                {body.length}/1000
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                Media (opzionale)
              </label>
              <label style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: 16,
                border: "2px dashed #d1d5db",
                borderRadius: 8,
                cursor: "pointer",
                color: "#6b7280",
                background: "#f9fafb"
              }}>
                <Upload size={20} />
                {mediaFile ? mediaFile.name : "Scegli foto o video"}
                <input
                  type="file"
                  accept="image/*,video/*"
                  style={{ display: "none" }}
                  onChange={(e) => setMediaFile(e.target.files[0] || null)}
                />
              </label>
              {mediaFile && (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  {mediaFile.type.startsWith('video/') ? (
                    <Video size={16} />
                  ) : (
                    <Image size={16} />
                  )}
                  <span style={{ fontSize: 14, color: "#374151" }}>
                    {(mediaFile.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  <button
                    onClick={() => setMediaFile(null)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      padding: 2
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            
            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn btn-ghost"
                onClick={resetForm}
                disabled={uploading}
              >
                Annulla
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!title.trim() || uploading}
              >
                {uploading ? "Salvando..." : editingPost ? "Aggiorna" : "Pubblica"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Posts List */}
      {posts.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: 48,
          background: "#f9fafb",
          borderRadius: 12,
          border: "1px solid #e5e7eb"
        }}>
          <h3 style={{ color: "#6b7280", marginBottom: 8 }}>Nessun post pubblicato</h3>
          <p style={{ color: "#9ca3af", marginBottom: 16 }}>
            Crea il tuo primo post per condividere contenuti con i tuoi followers.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setCreating(true)}
          >
            Crea il primo Post
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          {posts.map(post => (
            <div
              key={post.id}
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 20
              }}
            >
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 16
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ margin: 0, marginBottom: 8, fontWeight: 600 }}>
                    {post.content ? post.content.split('\n\n')[0] : 'Post senza titolo'}
                  </div>
                  {post.content && post.content.includes('\n\n') && (
                    <p style={{ 
                      margin: 0, 
                      color: "#374151", 
                      lineHeight: 1.5,
                      marginBottom: 8
                    }}>
                      {post.content.split('\n\n')[1]}
                    </p>
                  )}
                  <div style={{ 
                    display: 'flex', 
                    gap: '16px',
                    alignItems: 'center',
                    margin: '8px 0'
                  }}>
                    <span style={{ color: "#6b7280", fontSize: 14 }}>
                      👁 {post.views_count || 0}
                    </span>
                    <span style={{ color: "#6b7280", fontSize: 14 }}>
                      ❤️ {post.likes_count || 0}
                    </span>
                    <span style={{ color: "#6b7280", fontSize: 14 }}>
                      💬 {post.comments_count || 0}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
                    Pubblicato il {formatDate(post.created_at)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, marginLeft: 16 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: 8 }}
                    title="Modifica"
                    onClick={() => startEdit(post)}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: 8 }}
                    title="Elimina"
                    onClick={() => deletePost(post.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Media Preview */}
              {post.images && post.images.length > 0 && (
                <div style={{
                  marginTop: 12,
                  borderRadius: 8,
                  overflow: "hidden",
                  maxWidth: 300,
                  background: "#f3f4f6"
                }}>
                  <img
                    src={post.images[0]}
                    style={{ width: "100%", maxHeight: 200, objectFit: "cover" }}
                    alt="Post content"
                  />
                  {post.images.length > 1 && (
                    <div style={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      background: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: 12
                    }}>
                      +{post.images.length - 1}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}