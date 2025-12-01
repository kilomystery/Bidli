import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { UserPlus, UserMinus, Star } from 'lucide-react';
import { supabase } from "../lib/supabaseClient";
import StoryViewer from "../components/StoryViewer";
import BackButton from '../components/BackButton';
import { CompactStarRating } from '../components/StarRating';
import ReviewsSection from '../components/ReviewsSection';
import TagInput from "../components/TagInput";
import VisibilitySelector from "../components/VisibilitySelector";
import MediaUploader from "../components/MediaUploader";

function Chip({ children }) {
  return <span className="chip">{children}</span>;
}

function SectionTitle({ children }) {
  return <h2 className="seller-sec-title">{children}</h2>;
}

export default function Seller() {
  const { handle } = useParams();
  const navigate = useNavigate();

  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]); // [{id,title,cover}]
  const [lives, setLives] = useState({ liveNow: [], upcoming: [] });
  const [tab, setTab] = useState("lives"); // "lives" | "posts" | "reviews"
  const [isFollowing, setIsFollowing] = useState(false);
  const [socialStats, setSocialStats] = useState({ followers_count: 0, following_count: 0 });
  const [session, setSession] = useState(null);
  
  // Story viewer state
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyViewerIndex, setStoryViewerIndex] = useState(0);
  const [fullStories, setFullStories] = useState([]); // Stories complete per viewer
  
  // Creation modals state
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  
  // Form states for quick creation
  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [newStoryContent, setNewStoryContent] = useState("");
  const [newStoryFiles, setNewStoryFiles] = useState([]);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostBody, setNewPostBody] = useState("");
  const [newPostFile, setNewPostFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Advanced post features
  const [postVisibility, setPostVisibility] = useState('public');
  const [storyVisibility, setStoryVisibility] = useState('public');

  const placeholderAvatar = useMemo(
    () =>
      "https://api.dicebear.com/7.x/initials/svg?radius=50&backgroundColor=b6a6ff&seed=" +
      (handle || "V"),
    [handle]
  );

  // Funzione per verificare ownership del profilo
  const checkOwnership = async (sellerData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔍 Seller.jsx: Controllo ownership - user:', user?.id, 'handle:', handle);
      
      if (user && sellerData) {
        // Controlla se l'utente è autenticato e ha lo stesso handle che sta visualizzando
        console.log('🔗 Seller.jsx: Chiamata API per seller user:', user.id);
        const sellerResponse = await fetch(`/api/sellers/user/${user.id}`);
        console.log('📡 Seller.jsx: Response status:', sellerResponse.status);
        
        if (sellerResponse.ok) {
          const currentSeller = await sellerResponse.json();
          console.log('👤 Seller.jsx: Current seller trovato:', currentSeller);
          console.log('🔍 Seller.jsx: Confronto handles - current:', currentSeller?.handle, 'viewing:', handle);
          
          const isOwnerProfile = currentSeller && currentSeller.handle === handle;
          setIsOwner(isOwnerProfile);
          if (isOwnerProfile) {
            console.log('✅ Seller.jsx: Utente è proprietario del profilo - mostrando controlli owner');
          } else {
            console.log('👤 Seller.jsx: Utente non è proprietario - modalità visitatore');
          }
        } else {
          setIsOwner(false);
          console.log('👤 Seller.jsx: Utente non è seller - modalità visitatore');
        }
      } else {
        setIsOwner(false);
        console.log('👤 Seller.jsx: Utente non autenticato - modalità visitatore');
      }
    } catch (error) {
      console.error('Errore controllo ownership:', error);
      console.error('Errore dettagliato ownership:', error.message || error.toString());
      setIsOwner(false);
    }
  };

  // Carica sessione utente e listener eventi
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session || null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s || null);
    });

    // Listener per eventi create da MobileBottomBar  
    const handleCreatePost = () => {
      console.log('🎯 Event seller:create-post ricevuto');
      console.log('🔍 Debug state:', { isOwner, seller: !!seller, session: !!session, handle });
      // Forza apertura se siamo nella pagina del proprio profilo
      if (isOwner || (seller && session?.user?.id && seller.user_id === session.user.id)) {
        setShowCreatePost(true);
        console.log('✅ Modal post FORZATO ad aprirsi');
      } else {
        console.log('❌ Modal post NON aperto - controlli falliti');
      }
    };
    const handleCreateStory = () => {
      console.log('🎯 Event seller:create-story ricevuto');
      console.log('🔍 Debug state:', { isOwner, seller: !!seller, session: !!session, handle });
      // Forza apertura se siamo nella pagina del proprio profilo
      if (isOwner || (seller && session?.user?.id && seller.user_id === session.user.id)) {
        setShowCreateStory(true);
        console.log('✅ Modal story FORZATO ad aprirsi');
      } else {
        console.log('❌ Modal story NON aperto - controlli falliti');
      }
    };

    window.addEventListener('seller:create-post', handleCreatePost);
    window.addEventListener('seller:create-story', handleCreateStory);

    return () => {
      sub?.subscription?.unsubscribe?.();
      window.removeEventListener('seller:create-post', handleCreatePost);
      window.removeEventListener('seller:create-story', handleCreateStory);
    };
  }, [isOwner, seller, session]);

  // Carica statistiche social quando il seller è caricato
  useEffect(() => {
    if (seller?.id) {
      loadSocialStats();
      if (session?.user?.id) {
        checkFollowStatus();
      }
    }
  }, [seller?.id, session?.user?.id]);

  const loadSocialStats = async () => {
    if (!seller?.id) return;
    
    try {
      const response = await fetch(`/api/social/stats/${seller.id}`);
      if (response.ok) {
        const stats = await response.json();
        setSocialStats(stats);
      }
    } catch (error) {
      console.error('Errore caricamento statistiche social:', error);
    }
  };

  const checkFollowStatus = async () => {
    if (!session?.user?.id || !seller?.id) return;
    
    try {
      const response = await fetch(`/api/social/following/${session.user.id}/${seller.id}`);
      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.isFollowing);
      }
    } catch (error) {
      console.error('Errore controllo follow:', error);
    }
  };

  const handleFollowToggle = async () => {
    if (!session?.user?.id) {
      // Apri modal auth
      window.dispatchEvent(new CustomEvent('auth:open'));
      return;
    }
    
    if (!seller?.id) return;
    
    try {
      const response = await fetch('/api/social/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          followerId: session.user.id,
          followingId: seller.id
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setIsFollowing(result.action === 'followed');
          // Ricarica statistiche
          loadSocialStats();
        }
      }
    } catch (error) {
      console.error('Errore toggle follow:', error);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);

      // 🏢 CERCA SELLER NEL DATABASE LOCALE - FONTE DI VERITÀ UNICA
      try {
        const response = await fetch(`/api/sellers/handle/${handle}`);
        
        let s = null;
        if (response.ok) {
          s = await response.json();
        }

        if (!s) {
          console.log('❌ Seller.jsx: Venditore non trovato per handle:', handle);
          setSeller(null);
          setLoading(false);
          return;
        }
        if (!mounted) return;
        
        console.log('✅ Seller.jsx: Venditore trovato:', s.display_name);
        setSeller(s);
        
        // Check if current user is owner of this profile - DOPO aver settato seller
        await checkOwnership(s);
        
      } catch (error) {
        console.error('Errore caricamento seller:', error);
        setSeller(null);
        setLoading(false);
        return;
      }

      // 2) Posts by seller_id via local API
      try {
        const postsResponse = await fetch(`/api/posts/seller/${s.id}`);
        const p = postsResponse.ok ? await postsResponse.json() : [];
        if (!mounted) return;
        setPosts(p || []);
      } catch (error) {
        console.error('Errore caricamento posts:', error);
        setPosts([]);
      }

      // 3) Stories (parent + items) via local API
      const enrichedStories = [];
      const fullStoriesForViewer = [];
      
      try {
        const storiesResponse = await fetch(`/api/stories/seller/${s.id}`);
        const st = storiesResponse.ok ? await storiesResponse.json() : [];
        
        if (st?.length) {
          for (const parent of st) {
            // Get all items for this story via local API
            try {
              const itemsResponse = await fetch(`/api/story-items/${parent.id}`);
              const items = itemsResponse.ok ? await itemsResponse.json() : [];
              
              // For the stories list (preview)
              enrichedStories.push({
                id: parent.id,
                title: parent.title || "Story",
                cover: items?.[0]?.media_url || null,
              });
              
              // For the story viewer - add each item as a separate story entry
              if (items?.length) {
                items.forEach(item => {
                  fullStoriesForViewer.push({
                    id: item.id,
                    seller_handle: s.handle,
                    seller_display_name: s.display_name,
                    avatar: s.avatar_url,
                    media: item.media_url,
                    type: item.media_type === 'video' ? 'video' : 'image',
                    title: parent.title || "Story"
                  });
                });
              }
            } catch (error) {
              console.error('Errore caricamento story items:', error);
            }
          }
        }
      } catch (error) {
        console.error('Errore caricamento stories:', error);
      }
      
      if (!mounted) return;
      setStories(enrichedStories);
      setFullStories(fullStoriesForViewer);

      // 4) Lives del seller via local API
      try {
        const livesResponse = await fetch(`/api/lives/seller/${s.id}`);
        const l = livesResponse.ok ? await livesResponse.json() : [];

        const liveNow = (l || []).filter((x) => x.status === "live");
        const upcoming = (l || []).filter((x) => x.status === "scheduled");

        if (!mounted) return;
        setLives({ liveNow, upcoming });
      } catch (error) {
        console.error('Errore caricamento lives:', error);
        setLives({ liveNow: [], upcoming: [] });
      }

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [handle]);

  // Story viewer functions
  const openStoryViewer = (storyIndex) => {
    setStoryViewerIndex(storyIndex);
    setStoryViewerOpen(true);
  };

  const closeStoryViewer = () => {
    setStoryViewerOpen(false);
  };

  const nextStory = () => {
    setStoryViewerIndex((prev) => 
      prev < fullStories.length - 1 ? prev + 1 : prev
    );
  };

  const prevStory = () => {
    setStoryViewerIndex((prev) => 
      prev > 0 ? prev - 1 : prev
    );
  };

  // Quick creation functions
  const createStoryQuick = async () => {
    if (!newStoryContent.trim() || newStoryFiles.length === 0 || !seller) return;
    
    setUploading(true);
    
    try {
      // Upload all files first
      const uploadedMedia = [];
      
      for (const file of newStoryFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `stories/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, file);
        
        if (uploadError) {
          console.error("Errore upload:", uploadError);
          alert(`Errore durante l'upload di ${file.name}. Riprova.`);
          continue;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(filePath);
        
        uploadedMedia.push({
          url: publicUrl,
          type: file.type.startsWith('video/') ? 'video' : 'image'
        });
      }

      if (uploadedMedia.length === 0) {
        alert("Nessun file è stato caricato correttamente.");
        setUploading(false);
        return;
      }

      // Parse tags and mentions from content
      const { tags, mentions } = parseTagsAndMentions(newStoryContent);
      
      // Create story - DIRECT API CALL (bypassa Supabase cache)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now
      
      const response = await fetch('/api/social/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: seller.user_id,
          content: newStoryContent.trim(),
          images: uploadedMedia,
          visibility: storyVisibility,
          tags,
          mentions,
          type: 'story',
          expires_at: expiresAt.toISOString(),
          status: 'published'
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        console.error("Errore creazione story:", result.error);
        alert("Errore durante la pubblicazione della storia. Riprova.");
      } else {
        // Update trending hashtags
        for (const tag of tags) {
          await updateHashtagUsage(tag);
        }
        
        // Reset form and refresh
        setNewStoryContent("");
        setNewStoryFiles([]);
        setStoryVisibility('public');
        setShowCreateStory(false);
        
        // Show success message
        alert("Storia pubblicata con successo! 🎉 Sarà visibile per 24 ore.");
        
        // Refresh stories instead of whole page for better UX
        await loadSocialContent();
      }
    } catch (error) {
      console.error("Errore generale:", error);
      alert("Si è verificato un errore. Riprova.");
    } finally {
      setUploading(false);
    }
  };

  const createPostQuick = async () => {
    if (!newPostTitle.trim() || !seller) return;
    
    setUploading(true);
    
    try {
      let mediaUrl = null;
      let mediaType = null;
      
      if (newPostFile) {
        const fileExt = newPostFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `posts/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, newPostFile);
        
        if (uploadError) {
          console.error("Errore upload:", uploadError);
          alert("Errore durante l'upload del file. Riprova.");
          setUploading(false);
          return;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(filePath);
        
        mediaUrl = publicUrl;
        mediaType = newPostFile.type.startsWith('video/') ? 'video' : 'image';
      }

      // Parse tags and mentions from content
      const { tags, mentions } = parseTagsAndMentions(newPostBody);
      
      // Create post - DIRECT API CALL (bypassa Supabase cache)
      const response = await fetch('/api/social/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: seller.user_id,
          content: `${newPostTitle.trim()}\n\n${newPostBody.trim()}`.trim(),
          images: mediaUrl ? [{ url: mediaUrl, type: mediaType }] : [],
          visibility: postVisibility,
          tags,
          mentions,
          status: 'published'
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        console.error("Errore creazione post:", result.error);
        alert("Errore durante la pubblicazione. Riprova.");
      } else {
        // Update trending hashtags
        for (const tag of tags) {
          await updateHashtagUsage(tag);
        }
        
        // Reset form and refresh
        setNewPostTitle("");
        setNewPostBody("");
        setNewPostFile(null);
        setPostVisibility('public');
        setShowCreatePost(false);
        
        // Show success message
        alert("Post pubblicato con successo! 🎉");
        
        // Refresh posts instead of whole page for better UX
        await loadSocialContent();
      }
    } catch (error) {
      console.error("Errore generale:", error);
      alert("Si è verificato un errore. Riprova.");
    } finally {
      setUploading(false);
    }
  };

  // Parse tags and mentions from text
  const parseTagsAndMentions = (text) => {
    const tags = [];
    const mentions = [];
    
    if (!text) return { tags, mentions };
    
    // Extract hashtags
    const hashtagMatches = text.match(/#[a-zA-Z0-9_]+/g);
    if (hashtagMatches) {
      hashtagMatches.forEach(tag => {
        const cleanTag = tag.slice(1); // Remove #
        if (!tags.includes(cleanTag)) {
          tags.push(cleanTag);
        }
      });
    }
    
    // Extract mentions  
    const mentionMatches = text.match(/@[a-zA-Z0-9_]+/g);
    if (mentionMatches) {
      mentionMatches.forEach(mention => {
        const handle = mention.slice(1); // Remove @
        if (!mentions.includes(handle)) {
          mentions.push(handle);
        }
      });
    }
    
    return { tags, mentions };
  };

  // Update hashtag usage count
  const updateHashtagUsage = async (tag) => {
    try {
      const { data: existing } = await supabase
        .from('trending_hashtags')
        .select('usage_count')
        .eq('tag', tag)
        .single();

      if (existing) {
        await supabase
          .from('trending_hashtags')
          .update({ 
            usage_count: existing.usage_count + 1,
            last_used_at: new Date().toISOString()
          })
          .eq('tag', tag);
      } else {
        await supabase
          .from('trending_hashtags')
          .insert({ tag, usage_count: 1 });
      }
    } catch (error) {
      console.error('Error updating hashtag usage:', error);
    }
  };

  return (
    <main className="seller-page">
        {loading ? (
          <div className="container section" style={{ textAlign: "center" }}>
            Caricamento profilo…
          </div>
        ) : !seller ? (
          <div className="container section">
            <h1>Profilo non trovato</h1>
            <p>
              Il venditore <b>@{handle}</b> non esiste.{" "}
              <Link to="/discover">Torna alla home</Link>.
            </p>
          </div>
        ) : (
          <>
            {/* Header profilo */}
            <section className="container seller-header">
              <div className="seller-avatar-lg" style={{ position: "relative" }}>
                <img
                  src={seller.avatar_url || placeholderAvatar}
                  alt={seller.display_name || seller.handle}
                />
              </div>

              <div className="seller-head-main">
                <div className="seller-names">
                  <h1 className="seller-name">
                    {seller.display_name || seller.handle}
                  </h1>
                  <div className="seller-handle">@{seller.handle}</div>
                </div>

                <div className="seller-actions">
                  {/* Pulsante Follow/Unfollow - Solo per visitatori */}
                  {session?.user?.id && !isOwner && (
                    <button
                      onClick={handleFollowToggle}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        borderRadius: '24px',
                        border: isFollowing ? '2px solid #40e0d0' : '2px solid #40e0d0',
                        background: isFollowing ? 'transparent' : '#40e0d0',
                        color: isFollowing ? '#40e0d0' : '#0f172a',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        marginBottom: '12px'
                      }}
                      onMouseEnter={(e) => {
                        if (isFollowing) {
                          e.target.style.background = '#ef4444';
                          e.target.style.borderColor = '#ef4444';
                          e.target.style.color = '#ffffff';
                          e.target.querySelector('.follow-text').textContent = 'Non seguire';
                        } else {
                          e.target.style.background = '#0891b2';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = isFollowing ? 'transparent' : '#40e0d0';
                        e.target.style.borderColor = '#40e0d0';
                        e.target.style.color = isFollowing ? '#40e0d0' : '#0f172a';
                        if (isFollowing) {
                          e.target.querySelector('.follow-text').textContent = 'Segui già';
                        }
                      }}
                    >
                      {isFollowing ? (
                        <UserMinus size={16} />
                      ) : (
                        <UserPlus size={16} />
                      )}
                      <span className="follow-text">
                        {isFollowing ? 'Segui già' : 'Segui'}
                      </span>
                    </button>
                  )}
                  {isOwner ? (
                    // PULSANTI PER IL PROPRIETARIO
                    <>
                      <button 
                        className="btn btn-primary"
                        onClick={() => navigate(`/dashboard/settings`)}
                        style={{
                          background: "#000",
                          border: "2px solid #40e0d0",
                          color: "#40e0d0"
                        }}
                      >
                        ⚙️ Modifica Profilo
                      </button>
                    </>
                  ) : (
                    // PULSANTI PER VISITATORI
                    <>
                      <button className="btn btn-primary">Segui</button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => navigate(`/seller/${seller.handle}/reviews`)}
                      >
                        Recensioni
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => navigate(`/dm/${seller.handle}`)}
                      >
                        Messaggio
                      </button>
                    </>
                  )}
                </div>

                <div className="seller-stats">
                  <Chip>
                    ⭐ {Number(seller.rating || 0).toFixed(1)}
                  </Chip>
                  <Chip>👥 {socialStats.followers_count} follower</Chip>
                  <Chip>👁️ {socialStats.following_count} seguiti</Chip>
                  <Chip>🔴 {lives.liveNow.length + lives.upcoming.length} live</Chip>
                </div>

                {seller.bio && <p className="seller-bio">{seller.bio}</p>}
              </div>
            </section>

            {/* Highlights / Stories */}
            <section className="container seller-stories">
              <div className="stories-row">
                {stories.map((st, index) => (
                  <button
                    key={st.id}
                    className="story-bubble"
                    title={st.title}
                    onClick={() => openStoryViewer(index * 3)} // Rough estimation of story start
                  >
                    <div className="ring">
                      <img
                        src={
                          st.cover ||
                          "https://api.dicebear.com/7.x/initials/svg?seed=S"
                        }
                        alt={st.title}
                      />
                    </div>
                    <span className="story-title">
                      {st.title.slice(0, 18)}
                    </span>
                  </button>
                ))}
              </div>
              
              {!isOwner && stories.length === 0 && (
                <div className="stories-empty">Nessuna storia pubblicata.</div>
              )}
            </section>

            {/* Tabs */}
            <div className="container seller-tabs">
              <button
                className={`tab ${tab === "lives" ? "active" : ""}`}
                onClick={() => setTab("lives")}
              >
                🎥 Live & Programmate
              </button>
              <button
                className={`tab ${tab === "posts" ? "active" : ""}`}
                onClick={() => setTab("posts")}
              >
                🗂️ Post
              </button>
              <button
                className={`tab ${tab === "reviews" ? "active" : ""}`}
                onClick={() => setTab("reviews")}
              >
                ⭐ Recensioni
              </button>
            </div>

            {/* Pannelli */}
            {tab === "lives" ? (
              <section className="container section">
                {/* live ora */}
                <SectionTitle>🔴 In diretta ora</SectionTitle>
                {lives.liveNow.length ? (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px'
                  }}>
                    {lives.liveNow.map((lv) => (
                      <a
                        key={lv.id}
                        href={`/live/${lv.id}`}
                        style={{
                          textDecoration: 'none',
                          color: 'inherit',
                          display: 'block',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          background: '#0f172a',
                          border: '2px solid rgba(64, 224, 208, 0.3)',
                          transition: 'all 0.3s ease',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.borderColor = '#40e0d0';
                          e.target.style.transform = 'translateY(-4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.borderColor = 'rgba(64, 224, 208, 0.3)';
                          e.target.style.transform = 'translateY(0)';
                        }}
                      >
                        {/* Thumbnail Live */}
                        <div style={{
                          position: 'relative',
                          aspectRatio: '16/9',
                          background: 'linear-gradient(135deg, #40e0d0, #0891b2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}>
                          {/* Live Badge */}
                          <div style={{
                            position: 'absolute',
                            top: '12px',
                            left: '12px',
                            background: '#ef4444',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            zIndex: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: 'white',
                              animation: 'pulse 1.5s infinite'
                            }} />
                            LIVE
                          </div>
                          
                          {/* Viewer Count */}
                          <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            👁️ {lv.viewers ?? 0}
                          </div>
                          
                          {/* Play Button */}
                          <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.9)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            color: '#0f172a',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                          }}>
                            ▶️
                          </div>
                        </div>
                        
                        {/* Info Live */}
                        <div style={{ padding: '16px' }}>
                          <h3 style={{
                            margin: '0 0 8px 0',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#ffffff',
                            lineHeight: '1.3'
                          }}>
                            {lv.title}
                          </h3>
                          <div style={{
                            fontSize: '14px',
                            color: '#40e0d0',
                            marginBottom: '8px'
                          }}>
                            {lv.category?.label || "Categoria"}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#a0a0a0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span>🎯 Live Shopping</span>
                            <span>•</span>
                            <span>Iniziata {new Date(lv.started_at || lv.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '48px 24px',
                    color: '#a0a0a0',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    marginBottom: '24px'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📺</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                      Nessuna live attiva
                    </div>
                    <div style={{ fontSize: '14px' }}>
                      Le live attive di {seller.display_name || seller.handle} appariranno qui
                    </div>
                  </div>
                )}

                {/* programmate */}
                <SectionTitle>Prossime</SectionTitle>
                {lives.upcoming.length ? (
                  <div className="cards">
                    {lives.upcoming.map((lv) => (
                      <a
                        key={lv.id}
                        className="live-mini upcoming"
                        href={`/live/${lv.id}`}
                      >
                        <div className="live-mini-title">{lv.title}</div>
                        <div className="live-mini-meta">
                          {lv.category?.label || "Categoria"} ·{" "}
                          {new Date(lv.scheduled_at).toLocaleString("it-IT")}
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="meta">Nessuna live programmata.</div>
                )}
              </section>
            ) : tab === "posts" ? (
              <section className="container section">
                <SectionTitle>Post</SectionTitle>
                {posts.length ? (
                  <div className="post-grid">
                    {posts.map((p) => (
                      <div key={p.id} className="post-card">
                        <div className="post-media">
                          {p.media_url ? (
                            p.media_type === 'video' ? (
                              <video
                                src={p.media_url}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                muted
                                loop
                                onMouseEnter={e => e.target.play()}
                                onMouseLeave={e => e.target.pause()}
                              />
                            ) : (
                              <img
                                src={p.media_url}
                                alt={p.title || "post"}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            )
                          ) : (
                            <div style={{
                              width: "100%", 
                              height: "100%", 
                              background: "#f3f4f6",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#9ca3af",
                              fontSize: 14
                            }}>
                              📝 Solo testo
                            </div>
                          )}
                        </div>
                        <div className="post-overlay">
                          <div style={{ padding: 8 }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                              {p.title}
                            </div>
                            {p.body && (
                              <div style={{ 
                                fontSize: 12, 
                                opacity: 0.9,
                                lineHeight: 1.3,
                                maxHeight: 36,
                                overflow: "hidden"
                              }}>
                                {p.body.slice(0, 100)}
                                {p.body.length > 100 && "..."}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="meta">Ancora nessun post.</div>
                )}
                
                {/* Create Content Cards - Dashboard Style */}
                {isOwner && (
                  <div style={{ 
                    marginTop: 32,
                    paddingTop: 24,
                    borderTop: "1px solid #f0f0f0"
                  }}>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: 16,
                      maxWidth: 600,
                      margin: "0 auto"
                    }}>
                      {/* Stories Card */}
                      <div
                        onClick={() => setShowCreateStory(true)}
                        style={{
                          background: "#000",
                          border: "2px solid #40e0d0",
                          borderRadius: 16,
                          padding: 20,
                          color: "#40e0d0",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          boxShadow: "0 6px 20px rgba(64, 224, 208, 0.3)"
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = "translateY(-4px)";
                          e.target.style.boxShadow = "0 12px 32px rgba(102, 126, 234, 0.4)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = "translateY(0)";
                          e.target.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.3)";
                        }}
                      >
                        <h3 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 600 }}>
                          Stories
                        </h3>
                        <p style={{ margin: "0 0 12px 0", fontSize: 14, opacity: 0.9 }}>
                          Condividi momenti speciali
                        </p>
                        <div style={{
                          display: "inline-block",
                          background: "rgba(255,255,255,0.2)",
                          color: "white",
                          padding: "6px 12px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 500
                        }}>
                          Crea Storia →
                        </div>
                      </div>

                      {/* Posts Card */}
                      <div
                        onClick={() => setShowCreatePost(true)}
                        style={{
                          background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                          borderRadius: 16,
                          padding: 20,
                          color: "white",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          boxShadow: "0 6px 20px rgba(240, 147, 251, 0.3)",
                          border: "none"
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = "translateY(-4px)";
                          e.target.style.boxShadow = "0 12px 32px rgba(240, 147, 251, 0.4)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = "translateY(0)";
                          e.target.style.boxShadow = "0 6px 20px rgba(240, 147, 251, 0.3)";
                        }}
                      >
                        <h3 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 600 }}>
                          Posts
                        </h3>
                        <p style={{ margin: "0 0 12px 0", fontSize: 14, opacity: 0.9 }}>
                          Pubblica contenuti per i follower
                        </p>
                        <div style={{
                          display: "inline-block",
                          background: "rgba(255,255,255,0.2)",
                          color: "white",
                          padding: "6px 12px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 500
                        }}>
                          Crea Post →
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            ) : tab === "reviews" ? (
              <section className="container section">
                <SectionTitle>⭐ Recensioni</SectionTitle>
                <ReviewsSection sellerId={seller.id} />
              </section>
            ) : null}
          </>
        )}

        {/* Story Viewer */}
        <StoryViewer
          stories={fullStories}
          index={storyViewerIndex}
          open={storyViewerOpen}
          onClose={closeStoryViewer}
          onNext={nextStory}
          onPrev={prevStory}
        />

        {/* Create Story Modal - Instagram Style */}
        {showCreateStory && (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.9)",
            zIndex: 1000,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center"
          }}>
            {/* Mobile-first design that slides up from bottom */}
            <div style={{
              background: "#fff",
              borderRadius: "20px 20px 0 0",
              width: "100%",
              maxWidth: 400,
              height: "90vh",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              animation: "slideUp 0.3s ease-out",
              boxShadow: "0 -4px 20px rgba(0,0,0,0.2)"
            }}>
              
              {/* Header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid #efefef",
                position: "sticky",
                top: 0,
                background: "#fff",
                borderRadius: "20px 20px 0 0"
              }}>
                <button
                  onClick={() => setShowCreateStory(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 22,
                    cursor: "pointer",
                    color: "#262626",
                    padding: 8
                  }}
                >
                  ×
                </button>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: 16, 
                  fontWeight: 600, 
                  color: "#262626" 
                }}>
                  Nuova storia
                </h3>
                <button
                  onClick={createStoryQuick}
                  disabled={!newStoryContent.trim() || newStoryFiles.length === 0 || uploading}
                  style={{
                    background: (!newStoryContent.trim() || newStoryFiles.length === 0 || uploading) ? "#c7c7c7" : "#0095f6",
                    color: "white",
                    border: "none",
                    borderRadius: 20,
                    padding: "8px 16px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: (!newStoryContent.trim() || newStoryFiles.length === 0 || uploading) ? "not-allowed" : "pointer"
                  }}
                >
                  {uploading ? "Caricamento..." : "Condividi"}
                </button>
              </div>

              {/* Scrollable Content */}
              <div style={{
                flex: 1,
                overflow: "auto",
                display: "flex",
                flexDirection: "column"
              }}>
                
                {/* Preview Area */}
                <div style={{
                  minHeight: 200,
                  background: "#fafafa",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "16px 20px",
                  borderRadius: 12,
                  border: "1px solid #e0e0e0",
                  position: "relative"
                }}>
                  {newStoryFiles.length > 0 ? (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
                      gap: 8,
                      padding: 16,
                      width: "100%"
                    }}>
                      {newStoryFiles.slice(0, 4).map((file, index) => (
                        <div key={index} style={{
                          aspectRatio: "1",
                          borderRadius: 8,
                          overflow: "hidden",
                          position: "relative"
                        }}>
                          {file.type.startsWith('image/') ? (
                            <img 
                              src={URL.createObjectURL(file)}
                              alt="Preview"
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover"
                              }}
                            />
                          ) : (
                            <div style={{
                              width: "100%",
                              height: "100%",
                              background: "#000",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontSize: 24
                            }}>
                              ▶️
                            </div>
                          )}
                        </div>
                      ))}
                      {newStoryFiles.length > 4 && (
                        <div style={{
                          aspectRatio: "1",
                          borderRadius: 8,
                          background: "rgba(0,0,0,0.7)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: 12,
                          fontWeight: 600
                        }}>
                          +{newStoryFiles.length - 4}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      textAlign: "center",
                      color: "#8e8e8e",
                      padding: 40
                    }}>
                      <div style={{ fontSize: 48, marginBottom: 8 }}>📷</div>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Aggiungi foto o video</p>
                      <p style={{ margin: "4px 0 0 0", fontSize: 14 }}>Tocca per selezionare</p>
                    </div>
                  )}
                </div>

                {/* Add Media Button */}
                <div style={{ padding: "0 20px 16px" }}>
                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "12px 20px",
                    border: "1px solid #0095f6",
                    borderRadius: 25,
                    cursor: "pointer",
                    color: "#0095f6",
                    fontSize: 14,
                    fontWeight: 600,
                    background: "rgba(0, 149, 246, 0.05)"
                  }}>
                    <span style={{ fontSize: 18 }}>📎</span>
                    Aggiungi media
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      style={{ display: "none" }}
                      onChange={(e) => setNewStoryFiles(Array.from(e.target.files))}
                    />
                  </label>
                </div>

                {/* Content Input with Tags */}
                <div style={{ padding: "0 20px 16px" }}>
                  <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 600, color: "#262626" }}>
                    Cosa stai condividendo?
                  </div>
                  <TagInput
                    value={newStoryContent}
                    onChange={setNewStoryContent}
                    placeholder="Racconta cosa succede nella tua storia... Usa @nomeutente e #hashtag"
                  />
                  <div style={{ fontSize: 12, color: "#8e8e8e", textAlign: "right", marginTop: 8 }}>
                    {newStoryContent.length}/500
                  </div>
                </div>

                {/* Visibility Selector */}
                <div style={{ padding: "0 20px 16px" }}>
                  <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 600, color: "#262626" }}>
                    Chi può vedere questa storia?
                  </div>
                  <VisibilitySelector
                    value={storyVisibility}
                    onChange={setStoryVisibility}
                  />
                </div>


              </div>
            </div>
          </div>
        )}

        {/* Create Post Modal - Instagram Style */}
        {showCreatePost && (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.9)",
            zIndex: 1000,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center"
          }}>
            {/* Mobile-first design that slides up from bottom */}
            <div style={{
              background: "#fff",
              borderRadius: "20px 20px 0 0",
              width: "100%",
              maxWidth: 400,
              height: "90vh",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              animation: "slideUp 0.3s ease-out",
              boxShadow: "0 -4px 20px rgba(0,0,0,0.2)"
            }}>
              
              {/* Header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid #efefef",
                position: "sticky",
                top: 0,
                background: "#fff",
                borderRadius: "20px 20px 0 0"
              }}>
                <button
                  onClick={() => setShowCreatePost(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 22,
                    cursor: "pointer",
                    color: "#262626",
                    padding: 8
                  }}
                >
                  ×
                </button>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: 16, 
                  fontWeight: 600, 
                  color: "#262626" 
                }}>
                  Nuovo post
                </h3>
                <button
                  onClick={createPostQuick}
                  disabled={!newPostTitle.trim() || uploading}
                  style={{
                    background: (!newPostTitle.trim() || uploading) ? "#c7c7c7" : "#0095f6",
                    color: "white",
                    border: "none",
                    borderRadius: 20,
                    padding: "8px 16px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: (!newPostTitle.trim() || uploading) ? "not-allowed" : "pointer"
                  }}
                >
                  {uploading ? "..." : "Condividi"}
                </button>
              </div>

              {/* Scrollable Content */}
              <div style={{
                flex: 1,
                overflow: "auto",
                display: "flex",
                flexDirection: "column"
              }}>
                
                {/* User Info */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 20px",
                  borderBottom: "1px solid #efefef"
                }}>
                  <img
                    src={seller.avatar_url || placeholderAvatar}
                    alt="Your avatar"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      objectFit: "cover"
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#262626" }}>
                      {seller.display_name || seller.handle}
                    </div>
                    <div style={{ fontSize: 12, color: "#8e8e8e" }}>
                      {seller.handle && `@${seller.handle}`}
                    </div>
                  </div>
                </div>

                {/* Title Input */}
                <div style={{ padding: "16px 20px 0" }}>
                  <input
                    type="text"
                    placeholder="Scrivi un titolo coinvolgente..."
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    style={{
                      width: "100%",
                      border: "none",
                      outline: "none",
                      fontSize: 18,
                      fontWeight: 600,
                      fontFamily: "inherit",
                      color: "#262626",
                      background: "transparent",
                      marginBottom: 8
                    }}
                    maxLength={200}
                  />
                  <div style={{ fontSize: 12, color: "#8e8e8e", marginBottom: 16 }}>
                    {newPostTitle.length}/200
                  </div>
                </div>

                {/* Content Input with Tags */}
                <div style={{ padding: "0 20px", flex: 1 }}>
                  <TagInput
                    value={newPostBody}
                    onChange={setNewPostBody}
                    placeholder="Cosa vuoi condividere? Usa @nomeutente per menzionare e #tag per categorizzare..."
                  />
                  <div style={{ fontSize: 12, color: "#8e8e8e", textAlign: "right", marginTop: 8 }}>
                    {newPostBody.length}/1000
                  </div>
                </div>

                {/* Visibility Selector */}
                <div style={{ padding: "0 20px 16px" }}>
                  <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 600, color: "#262626" }}>
                    Chi può vedere questo post?
                  </div>
                  <VisibilitySelector
                    value={postVisibility}
                    onChange={setPostVisibility}
                  />
                </div>

                {/* Modern Media Upload */}
                <div style={{ padding: "0 20px 16px" }}>
                  <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 600, color: "#262626" }}>
                    Media (opzionale)
                  </div>
                  <MediaUploader
                    file={newPostFile}
                    onFileSelect={setNewPostFile}
                    placeholder="Aggiungi foto o video al tuo post"
                  />
                </div>


              </div>
            </div>
          </div>
        )}
    </main>
  );
}
