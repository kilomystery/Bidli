import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Visualizza un post del venditore con:
 *  - mi piace (toggle)
 *  - commenti (lista + form)
 *  - condividi (navigator.share o copia link)
 *
 * Props:
 *  - post: { id, seller_handle, title, body, media_url }
 */
export default function PostCard({ post }) {
  const [likes, setLikes] = useState(0);
  const [youLike, setYouLike] = useState(false);
  const [comments, setComments] = useState([]);
  const [cText, setCText] = useState("");

  // demo fallback
  useEffect(() => {
    (async () => {
      try {
        const { count } = await supabase
          .from("post_likes")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id);
        setLikes(count ?? 0);
      } catch {
        setLikes(3);
      }
      try {
        const { data } = await supabase
          .from("post_comments")
          .select("id,author,body,created_at")
          .eq("post_id", post.id)
          .order("created_at", { ascending: true });
        setComments(
          (data ?? [
            { id: "c1", author: "giulia", body: "Bellissimo 🔥" },
            { id: "c2", author: "luca", body: "Quando vai live?" },
          ]).slice(0, 20)
        );
      } catch {
        /* demo già messa */
      }
    })();
  }, [post.id]);

  async function toggleLike() {
    setYouLike((v) => !v);
    setLikes((n) => (youLike ? n - 1 : n + 1));
    // TODO: salvataggio su supabase
  }

  function addComment() {
    const t = cText.trim();
    if (!t) return;
    setComments((c) => [
      ...c,
      { id: Date.now(), author: "tu", body: t },
    ]);
    setCText("");
    // TODO: insert su supabase
  }

  async function share() {
    const url = `${location.origin}/seller/${post.seller_handle}?post=${post.id}`;
    if (navigator.share) {
      await navigator.share({ title: post.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copiato!");
    }
  }

  return (
    <article className="card">
      {post.media_url && (
        <img className="post-media" src={post.media_url} alt="" />
      )}
      <div className="p-16">
        <h3 className="post-title">{post.title}</h3>
        {post.body && <p className="muted">{post.body}</p>}

        <div className="row gap-8" style={{ marginTop: 10 }}>
          <button className={`chip ${youLike ? "chip-on" : ""}`} onClick={toggleLike}>
            ❤️ {likes}
          </button>
          <button className="chip" onClick={() => document.getElementById(`c-${post.id}`)?.focus()}>
            💬 {comments.length}
          </button>
          <button className="chip" onClick={share}>
            ↗︎ Condividi
          </button>
        </div>

        <div className="comments">
          {comments.map((c) => (
            <div key={c.id} className="comment">
              <b>{c.author}</b> {c.body}
            </div>
          ))}
        </div>

        <div className="input-row">
          <input
            id={`c-${post.id}`}
            className="input"
            placeholder="Aggiungi un commento…"
            value={cText}
            onChange={(e) => setCText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addComment()}
          />
          <button className="btn" onClick={addComment}>
            Pubblica
          </button>
        </div>
      </div>
    </article>
  );
}