// src/pages/DashboardStories.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Plus, Edit, Trash2, Eye, Upload } from "lucide-react";

export default function DashboardStories() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const [seller, setSeller] = useState(null);
  
  // Form states
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingItems, setUploadingItems] = useState([]);

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
    
    // 2. Get stories with items
    const { data: storiesData } = await supabase
      .from("stories")
      .select(`
        *,
        story_items (
          id, media_url, media_type, created_at
        )
      `)
      .eq("seller_id", sellerData.id)
      .order("created_at", { ascending: false });
    
    setStories(storiesData || []);
    setLoading(false);
  };

  const createStory = async () => {
    if (!title.trim() || !seller) return;
    
    setUploading(true);
    const { data, error } = await supabase
      .from("stories")
      .insert({
        seller_id: seller.id,
        title: title.trim()
      })
      .select()
      .single();
    
    if (error) {
      console.error("Errore creazione story:", error);
      setUploading(false);
      return;
    }
    
    setTitle("");
    setCreating(false);
    setUploading(false);
    loadData(); // Refresh
  };

  const deleteStory = async (storyId) => {
    if (!confirm("Eliminare questa story? L'azione non può essere annullata.")) return;
    
    // Delete story items first, then story
    await supabase.from("story_items").delete().eq("story_id", storyId);
    const { error } = await supabase.from("stories").delete().eq("id", storyId);
    
    if (!error) {
      loadData(); // Refresh
    }
  };

  const handleFileUpload = async (storyId, files) => {
    if (!files.length) return;
    
    setUploadingItems(prev => [...prev, storyId]);
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `stories/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);
      
      if (uploadError) {
        console.error("Errore upload:", uploadError);
        continue;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);
      
      // Add story item
      await supabase.from("story_items").insert({
        story_id: storyId,
        media_url: publicUrl,
        media_type: file.type.startsWith('video/') ? 'video' : 'image'
      });
    }
    
    setUploadingItems(prev => prev.filter(id => id !== storyId));
    loadData(); // Refresh
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
        <h1>Caricamento stories...</h1>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="container section">
        <h1>Accesso negato</h1>
        <p>Devi essere un venditore registrato per gestire le stories.</p>
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
        <h1 style={{ margin: 0 }}>Le mie Stories</h1>
        <button
          className="btn btn-primary"
          onClick={() => setCreating(true)}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <Plus size={18} />
          Nuova Story
        </button>
      </div>

      {/* Create Story Modal */}
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
            maxWidth: 400,
            width: "100%"
          }}>
            <h3 style={{ marginTop: 0 }}>Crea nuova Story</h3>
            <input
              type="text"
              placeholder="Titolo della story..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                border: "1px solid #ddd",
                borderRadius: 8,
                marginBottom: 16
              }}
              maxLength={100}
            />
            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setCreating(false);
                  setTitle("");
                }}
                disabled={uploading}
              >
                Annulla
              </button>
              <button
                className="btn btn-primary"
                onClick={createStory}
                disabled={!title.trim() || uploading}
              >
                {uploading ? "Creazione..." : "Crea Story"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stories List */}
      {stories.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: 48,
          background: "#f9fafb",
          borderRadius: 12,
          border: "1px solid #e5e7eb"
        }}>
          <h3 style={{ color: "#6b7280", marginBottom: 8 }}>Nessuna story creata</h3>
          <p style={{ color: "#9ca3af", marginBottom: 16 }}>
            Crea la tua prima story per condividere momenti speciali con i tuoi followers.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setCreating(true)}
          >
            Crea la prima Story
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          {stories.map(story => (
            <div
              key={story.id}
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
                <div>
                  <h3 style={{ margin: 0, marginBottom: 4 }}>{story.title}</h3>
                  <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
                    Creata il {formatDate(story.created_at)}
                  </p>
                  <p style={{ margin: "4px 0 0 0", color: "#9ca3af", fontSize: 14 }}>
                    {story.story_items?.length || 0} elementi
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: 8 }}
                    title="Visualizza"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: 8 }}
                    title="Elimina"
                    onClick={() => deleteStory(story.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Story Items Preview */}
              {story.story_items && story.story_items.length > 0 && (
                <div style={{
                  display: "flex",
                  gap: 8,
                  overflowX: "auto",
                  paddingBottom: 8,
                  marginBottom: 16
                }}>
                  {story.story_items.map(item => (
                    <div
                      key={item.id}
                      style={{
                        minWidth: 60,
                        height: 60,
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "#f3f4f6"
                      }}
                    >
                      {item.media_type === 'video' ? (
                        <video
                          src={item.media_url}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          muted
                        />
                      ) : (
                        <img
                          src={item.media_url}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          alt=""
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Media */}
              <div>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 16px",
                    background: "#f3f4f6",
                    border: "1px dashed #d1d5db",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 14,
                    color: "#374151"
                  }}
                >
                  <Upload size={16} />
                  {uploadingItems.includes(story.id) ? "Caricamento..." : "Aggiungi foto/video"}
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileUpload(story.id, Array.from(e.target.files))}
                    disabled={uploadingItems.includes(story.id)}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}