var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/utils/rankingAlgorithm.js
var rankingAlgorithm_exports = {};
__export(rankingAlgorithm_exports, {
  applyBoost: () => applyBoost,
  calculateBaseScore: () => calculateBaseScore,
  calculateFinalRanking: () => calculateFinalRanking,
  compareRankings: () => compareRankings,
  getRankingLeaderboard: () => getRankingLeaderboard
});
function calculateBaseScore(content, type) {
  let baseScore = 0;
  switch (type) {
    case "live_stream":
      baseScore = calculateLiveScore(content);
      break;
    case "post":
      baseScore = calculatePostScore(content);
      break;
    case "profile":
      baseScore = calculateProfileScore(content);
      break;
    default:
      baseScore = 100;
  }
  return Math.max(baseScore, 50);
}
function calculateLiveScore(live) {
  const {
    viewer_count = 0,
    total_bids = 0,
    bid_amount_total = 0,
    duration_minutes = 0,
    likes = 0,
    comments = 0,
    shares = 0
  } = live;
  let score = 500;
  score += Math.min(viewer_count * 10, 500);
  score += Math.min(total_bids * 15, 300);
  score += bid_amount_total;
  score += Math.min(duration_minutes, 120);
  score += likes * 2;
  score += comments * 3;
  score += shares * 5;
  return Math.round(score);
}
function calculatePostScore(post) {
  const {
    likes = 0,
    comments = 0,
    shares = 0,
    views = 0,
    saves = 0,
    click_throughs = 0
  } = post;
  let score = 200;
  score += Math.min(views * 0.5, 200);
  score += likes * 3;
  score += comments * 5;
  score += shares * 8;
  score += saves * 4;
  score += click_throughs * 6;
  return Math.round(score);
}
function calculateProfileScore(profile) {
  const {
    followers = 0,
    total_sales = 0,
    avg_rating = 0,
    reviews_count = 0,
    profile_views = 0,
    days_active = 0
  } = profile;
  let score = 100;
  score += Math.min(followers * 0.5, 150);
  score += Math.min(total_sales * 5, 200);
  score += avg_rating / 5 * 50;
  score += Math.min(reviews_count * 2, 100);
  score += Math.min(profile_views * 0.2, 100);
  score += Math.min(days_active, 365);
  return Math.round(score);
}
function applyBoost(baseScore, boostMultiplier = 1) {
  return Math.round(baseScore * boostMultiplier);
}
function calculateFinalRanking(content, type, boostMultiplier = 1) {
  const baseScore = calculateBaseScore(content, type);
  const boostedScore = applyBoost(baseScore, boostMultiplier);
  const timeDecay = calculateTimeDecay(content.created_at);
  const finalScore = Math.round(boostedScore * timeDecay);
  return {
    baseScore,
    boostMultiplier,
    boostedScore,
    timeDecay,
    finalScore,
    type
  };
}
function calculateTimeDecay(createdAt) {
  const now = /* @__PURE__ */ new Date();
  const created = new Date(createdAt);
  const hoursAgo = (now - created) / (1e3 * 60 * 60);
  if (hoursAgo <= 4)
    return 1;
  if (hoursAgo <= 12)
    return 0.9;
  if (hoursAgo <= 24)
    return 0.8;
  if (hoursAgo <= 48)
    return 0.7;
  if (hoursAgo <= 72)
    return 0.6;
  return 0.5;
}
function compareRankings(a, b) {
  const rankingA = calculateFinalRanking(a.content, a.type, a.boostMultiplier || 1);
  const rankingB = calculateFinalRanking(b.content, b.type, b.boostMultiplier || 1);
  return rankingB.finalScore - rankingA.finalScore;
}
function getRankingLeaderboard(contents) {
  return contents.map((item) => ({
    ...item,
    ranking: calculateFinalRanking(item.content, item.type, item.boostMultiplier || 1)
  })).sort((a, b) => b.ranking.finalScore - a.ranking.finalScore);
}
var init_rankingAlgorithm = __esm({
  "src/utils/rankingAlgorithm.js"() {
    "use strict";
  }
});

// server/viewer-tracking.js
var viewer_tracking_exports = {};
__export(viewer_tracking_exports, {
  addViewer: () => addViewer,
  cleanupLive: () => cleanupLive,
  getViewerStats: () => getViewerStats,
  removeViewer: () => removeViewer
});
import { createClient } from "file:///home/runner/workspace/node_modules/@supabase/supabase-js/dist/main/index.js";
async function addViewer(liveId, viewerId) {
  try {
    if (!viewersCache.has(liveId)) {
      viewersCache.set(liveId, /* @__PURE__ */ new Set());
    }
    const viewers = viewersCache.get(liveId);
    const wasAlreadyWatching = viewers.has(viewerId);
    if (!wasAlreadyWatching) {
      viewers.add(viewerId);
      const newCount = viewers.size;
      const { data, error } = await supabase.from("lives").update({
        viewers: newCount
      }).eq("id", liveId).select("viewers").maybeSingle();
      if (error || !data) {
        console.warn(`\u26A0\uFE0F Live ${liveId} non trovata nel DB, mantengo solo cache locale`);
        console.warn("Errore DB:", error);
        return {
          success: true,
          viewers: newCount,
          totalViewers: newCount
        };
      }
      console.log(`\u{1F4C8} Spettatore aggiunto alla live ${liveId}: ${newCount} spettatori attuali`);
      scheduleViewerCleanup(liveId, viewerId);
      return {
        success: true,
        viewers: newCount,
        totalViewers: 0
        // Semplificato per ora
      };
    }
    scheduleViewerCleanup(liveId, viewerId);
    return {
      success: true,
      viewers: viewers.size,
      totalViewers: 0
    };
  } catch (error) {
    console.warn("\u26A0\uFE0F Errore aggiunta spettatore (non critico):", error.message);
    const viewers = viewersCache.get(liveId) || /* @__PURE__ */ new Set();
    return {
      success: true,
      viewers: viewers.size,
      totalViewers: 0
    };
  }
}
async function removeViewer(liveId, viewerId) {
  try {
    const viewers = viewersCache.get(liveId);
    if (!viewers || !viewers.has(viewerId)) {
      return { success: true, viewers: viewers?.size || 0 };
    }
    viewers.delete(viewerId);
    const timerId = cleanupTimers.get(`${liveId}-${viewerId}`);
    if (timerId) {
      clearTimeout(timerId);
      cleanupTimers.delete(`${liveId}-${viewerId}`);
    }
    const newCount = viewers.size;
    const { data, error } = await supabase.from("lives").update({ viewers: newCount }).eq("id", liveId).select("viewers").single();
    if (error)
      throw error;
    console.log(`\u{1F4C9} Spettatore rimosso dalla live ${liveId}: ${newCount} spettatori rimanenti`);
    await updateLiveRanking(liveId, newCount);
    return {
      success: true,
      viewers: newCount
    };
  } catch (error) {
    console.error("\u274C Errore rimozione spettatore:", error);
    return { success: false, error: error.message };
  }
}
function scheduleViewerCleanup(liveId, viewerId) {
  const key = `${liveId}-${viewerId}`;
  const existingTimer = cleanupTimers.get(key);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  const timer = setTimeout(async () => {
    console.log(`\u{1F9F9} Cleanup automatico spettatore ${viewerId} dalla live ${liveId}`);
    await removeViewer(liveId, viewerId);
  }, 5 * 60 * 1e3);
  cleanupTimers.set(key, timer);
}
async function updateLiveRanking(liveId, viewerCount) {
  try {
    const { data: live, error } = await supabase.from("lives").select("*").eq("id", liveId).single();
    if (error)
      throw error;
    const { calculateBaseScore: calculateBaseScore2, applyBoost: applyBoost2 } = await Promise.resolve().then(() => (init_rankingAlgorithm(), rankingAlgorithm_exports));
    const liveWithViewers = {
      ...live,
      viewer_count: viewerCount
    };
    const baseScore = calculateBaseScore2(liveWithViewers, "live_stream");
    const { data: activeBoosts } = await supabase.from("boost_campaigns").select("boost_multiplier, expires_at").eq("content_type", "live").eq("content_id", liveId).eq("status", "active").gt("expires_at", (/* @__PURE__ */ new Date()).toISOString());
    let finalScore = baseScore;
    if (activeBoosts && activeBoosts.length > 0) {
      const boost = activeBoosts[0];
      finalScore = applyBoost2(baseScore, boost.boost_multiplier);
    }
    console.log(`\u{1F680} Score aggiornato per live ${liveId}: ${finalScore} (${viewerCount} spettatori)`);
    return finalScore;
  } catch (error) {
    console.error("\u274C Errore aggiornamento ranking:", error);
    return null;
  }
}
async function getViewerStats(liveId) {
  try {
    const { data, error } = await supabase.from("lives").select("viewers").eq("id", liveId).maybeSingle();
    if (error && error.code !== "PGRST116") {
      throw error;
    }
    const current = viewersCache.get(liveId)?.size || 0;
    return {
      current: Math.max(current, data?.viewers || 0),
      total: 0,
      // Simplified for now to avoid DB errors
      cached: current
    };
  } catch (error) {
    if (error.code !== "PGRST116") {
      console.error("\u274C Errore stats spettatori:", error);
    }
    return { current: 0, total: 0, cached: 0 };
  }
}
async function cleanupLive(liveId) {
  console.log(`\u{1F9F9} Cleanup completo live ${liveId}`);
  const viewers = viewersCache.get(liveId);
  if (viewers) {
    for (const viewerId of viewers) {
      const key = `${liveId}-${viewerId}`;
      const timer = cleanupTimers.get(key);
      if (timer) {
        clearTimeout(timer);
        cleanupTimers.delete(key);
      }
    }
    viewersCache.delete(liveId);
  }
  await supabase.from("lives").update({ viewers: 0 }).eq("id", liveId);
}
var supabase, viewersCache, cleanupTimers;
var init_viewer_tracking = __esm({
  "server/viewer-tracking.js"() {
    "use strict";
    supabase = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    );
    viewersCache = /* @__PURE__ */ new Map();
    cleanupTimers = /* @__PURE__ */ new Map();
  }
});

// server/supabase-server.js
import { createClient as createClient2 } from "file:///home/runner/workspace/node_modules/@supabase/supabase-js/dist/main/index.js";
var supabaseUrl, supabaseKey, supabase2;
var init_supabase_server = __esm({
  "server/supabase-server.js"() {
    "use strict";
    supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error("\u274C Missing Supabase credentials in backend");
      console.error("Available env vars:", Object.keys(process.env).filter(
        (key) => key.includes("SUPABASE") || key.includes("VITE_SUPABASE")
      ));
    }
    supabase2 = createClient2(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        // Backend non gestisce sessioni utente
        persistSession: false
      }
    });
  }
});

// server/social-api.js
var social_api_exports = {};
__export(social_api_exports, {
  checkIfFollowing: () => checkIfFollowing,
  createNotification: () => createNotification,
  createSocialPost: () => createSocialPost,
  createStory: () => createStory,
  getFollowingStories: () => getFollowingStories,
  getPostsFeed: () => getPostsFeed,
  getUnreadNotificationsCount: () => getUnreadNotificationsCount,
  getUserNotifications: () => getUserNotifications,
  getUserPosts: () => getUserPosts,
  getUserSocialStats: () => getUserSocialStats,
  getUserStories: () => getUserStories,
  markNotificationAsRead: () => markNotificationAsRead,
  toggleFollow: () => toggleFollow,
  togglePostLike: () => togglePostLike
});
async function toggleFollow(followerId, followingId) {
  try {
    if (followerId === followingId) {
      return { success: false, error: "Non puoi seguire te stesso" };
    }
    const { data: existing } = await supabase2.from("follows").select("id").eq("follower_id", followerId).eq("following_id", followingId).single();
    if (existing) {
      await supabase2.from("follows").delete().eq("follower_id", followerId).eq("following_id", followingId);
      return { success: true, action: "unfollowed" };
    } else {
      await supabase2.from("follows").insert({ follower_id: followerId, following_id: followingId });
      await createNotification({
        user_id: followingId,
        actor_id: followerId,
        type: "follow",
        title: "Nuovo follower!",
        message: "Ha iniziato a seguirti",
        action_url: `/profile/${followerId}`
      });
      return { success: true, action: "followed" };
    }
  } catch (error) {
    console.error("Toggle follow error:", error);
    return { success: false, error: error.message };
  }
}
async function getUserSocialStats(userId) {
  try {
    const [followersResult, followingResult] = await Promise.all([
      supabase2.from("follows").select("id").eq("following_id", userId),
      supabase2.from("follows").select("id").eq("follower_id", userId)
    ]);
    return {
      followers_count: followersResult.data?.length || 0,
      following_count: followingResult.data?.length || 0
    };
  } catch (error) {
    console.error("Get social stats error:", error);
    return { followers_count: 0, following_count: 0 };
  }
}
async function checkIfFollowing(followerId, followingId) {
  try {
    const { data } = await supabase2.from("follows").select("id").eq("follower_id", followerId).eq("following_id", followingId).single();
    return !!data;
  } catch (error) {
    return false;
  }
}
async function createSocialPost(postData) {
  try {
    const { data: post, error } = await supabase2.from("social_posts").insert({
      user_id: postData.user_id,
      content: postData.content,
      images: postData.images || [],
      live_id: postData.live_id || null,
      visibility: postData.visibility || "public",
      tags: postData.tags || [],
      mentions: postData.mentions || []
    }).select().single();
    if (error)
      throw error;
    await notifyFollowersOfNewPost(postData.user_id, post.id);
    return { success: true, post };
  } catch (error) {
    console.error("Create post error:", error);
    return { success: false, error: error.message };
  }
}
async function getUserPosts(userId, limit = 20, offset = 0) {
  try {
    const { data: posts, error } = await supabase2.from("social_posts").select(`
        *,
        user:user_id (
          id, username, first_name, last_name, profile_picture
        ),
        live:live_id (
          id, title, status
        )
      `).eq("user_id", userId).eq("status", "published").order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (error)
      throw error;
    return { success: true, posts: posts || [] };
  } catch (error) {
    console.error("Get user posts error:", error);
    return { success: false, posts: [] };
  }
}
async function getPostsFeed(userId, limit = 20, offset = 0) {
  try {
    let query = supabase2.from("social_posts").select(`
        *,
        user:user_id (
          id, username, first_name, last_name, profile_picture
        ),
        live:live_id (
          id, title, status
        )
      `).eq("status", "published");
    if (userId) {
      const { data: following } = await supabase2.from("follows").select("following_id").eq("follower_id", userId);
      const followingIds = following?.map((f) => f.following_id) || [];
      if (followingIds.length > 0) {
        query = query.in("user_id", followingIds);
      }
    }
    const { data: posts, error } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (error)
      throw error;
    return { success: true, posts: posts || [] };
  } catch (error) {
    console.error("Get posts feed error:", error);
    return { success: false, posts: [] };
  }
}
async function togglePostLike(postId, userId) {
  try {
    const { data: existing } = await supabase2.from("post_likes").select("id").eq("post_id", postId).eq("user_id", userId).single();
    if (existing) {
      await supabase2.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
      return { success: true, action: "unliked" };
    } else {
      await supabase2.from("post_likes").insert({ post_id: postId, user_id: userId });
      const { data: post } = await supabase2.from("social_posts").select("user_id").eq("id", postId).single();
      if (post && post.user_id !== userId) {
        await createNotification({
          user_id: post.user_id,
          actor_id: userId,
          type: "like",
          title: "Nuovo like!",
          message: "Ha messo like al tuo post",
          action_url: `/post/${postId}`
        });
      }
      return { success: true, action: "liked" };
    }
  } catch (error) {
    console.error("Toggle like error:", error);
    return { success: false, error: error.message };
  }
}
async function createStory(storyData) {
  try {
    const { data: story, error } = await supabase2.from("stories").insert({
      user_id: storyData.user_id,
      media_url: storyData.media_url,
      media_type: storyData.media_type || "image",
      text_overlay: storyData.text_overlay || null,
      background_color: storyData.background_color || "#000000"
    }).select().single();
    if (error)
      throw error;
    return { success: true, story };
  } catch (error) {
    console.error("Create story error:", error);
    return { success: false, error: error.message };
  }
}
async function getUserStories(userId) {
  try {
    const { data: stories, error } = await supabase2.from("stories").select(`
        *,
        user:user_id (
          id, username, first_name, last_name, profile_picture
        )
      `).eq("user_id", userId).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).order("created_at", { ascending: false });
    if (error)
      throw error;
    return { success: true, stories: stories || [] };
  } catch (error) {
    console.error("Get user stories error:", error);
    return { success: false, stories: [] };
  }
}
async function getFollowingStories(userId) {
  try {
    const { data: following } = await supabase2.from("follows").select("following_id").eq("follower_id", userId);
    const followingIds = following?.map((f) => f.following_id) || [];
    if (followingIds.length === 0) {
      return { success: true, stories: [] };
    }
    const { data: stories, error } = await supabase2.from("stories").select(`
        *,
        user:user_id (
          id, username, first_name, last_name, profile_picture
        )
      `).in("user_id", followingIds).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).order("created_at", { ascending: false });
    if (error)
      throw error;
    const storiesByUser = {};
    stories?.forEach((story) => {
      if (!storiesByUser[story.user_id]) {
        storiesByUser[story.user_id] = {
          user: story.user,
          stories: []
        };
      }
      storiesByUser[story.user_id].stories.push(story);
    });
    return { success: true, stories: Object.values(storiesByUser) };
  } catch (error) {
    console.error("Get following stories error:", error);
    return { success: false, stories: [] };
  }
}
async function createNotification(notificationData) {
  try {
    const { data, error } = await supabase2.from("notifications").insert(notificationData).select().single();
    if (error)
      throw error;
    return { success: true, notification: data };
  } catch (error) {
    console.error("Create notification error:", error);
    return { success: false, error: error.message };
  }
}
async function getUserNotifications(userId, limit = 50, unreadOnly = false) {
  try {
    let query = supabase2.from("notifications").select(`
        *,
        actor:actor_id (
          id, username, first_name, last_name, profile_picture
        )
      `).eq("user_id", userId);
    if (unreadOnly) {
      query = query.eq("is_read", false);
    }
    const { data: notifications, error } = await query.order("created_at", { ascending: false }).limit(limit);
    if (error)
      throw error;
    return { success: true, notifications: notifications || [] };
  } catch (error) {
    console.error("Get notifications error:", error);
    return { success: false, notifications: [] };
  }
}
async function markNotificationAsRead(notificationId, userId) {
  try {
    const { error } = await supabase2.from("notifications").update({ is_read: true }).eq("id", notificationId).eq("user_id", userId);
    if (error)
      throw error;
    return { success: true };
  } catch (error) {
    console.error("Mark notification read error:", error);
    return { success: false, error: error.message };
  }
}
async function getUnreadNotificationsCount(userId) {
  try {
    const { count, error } = await supabase2.from("notifications").select("*", { count: "exact" }).eq("user_id", userId).eq("is_read", false);
    if (error)
      throw error;
    return { success: true, count: count || 0 };
  } catch (error) {
    console.error("Get unread count error:", error);
    return { success: false, count: 0 };
  }
}
async function notifyFollowersOfNewPost(userId, postId) {
  try {
    const { data: followers } = await supabase2.from("follows").select("follower_id").eq("following_id", userId);
    if (!followers || followers.length === 0)
      return;
    const notifications = followers.map((follow) => ({
      user_id: follow.follower_id,
      actor_id: userId,
      type: "new_post",
      title: "Nuovo post!",
      message: "Ha pubblicato un nuovo post",
      action_url: `/post/${postId}`
    }));
    await supabase2.from("notifications").insert(notifications);
  } catch (error) {
    console.error("Notify followers error:", error);
  }
}
var init_social_api = __esm({
  "server/social-api.js"() {
    "use strict";
    init_supabase_server();
  }
});

// vite.config.js
import { defineConfig } from "file:///home/runner/workspace/node_modules/vite/dist/node/index.js";
import react from "file:///home/runner/workspace/node_modules/@vitejs/plugin-react/dist/index.mjs";
import express from "file:///home/runner/workspace/node_modules/express/index.js";

// server/api.js
import pg from "file:///home/runner/workspace/node_modules/pg/esm/index.mjs";
var { Pool } = pg;
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("neon.tech") ? { rejectUnauthorized: false } : false
});
function setupAPI(app) {
  app.post("/api/social/posts", async (req, res) => {
    try {
      console.log("\u{1F4DD} [DIRECT DB] Creating social post:", req.body);
      const { user_id, content, images, live_id, visibility, tags, mentions } = req.body;
      const result = await pool.query(`
        INSERT INTO social_posts (user_id, content, images, live_id, visibility, tags, mentions)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        user_id,
        content || "",
        JSON.stringify(images || []),
        live_id || null,
        visibility || "public",
        JSON.stringify(tags || []),
        JSON.stringify(mentions || [])
      ]);
      console.log("\u2705 [DIRECT DB] Post created successfully:", result.rows[0].id);
      res.json({ success: true, post: result.rows[0] });
    } catch (error) {
      console.error("\u274C [DIRECT DB] Create social post error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.get("/api/social/posts/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      const result = await pool.query(`
        SELECT sp.*, 
               p.username, p.first_name, p.last_name, p.profile_picture
        FROM social_posts sp
        LEFT JOIN profiles p ON sp.user_id = p.id
        WHERE sp.user_id = $1 AND (sp.status IS NULL OR sp.status != 'deleted')
        ORDER BY sp.created_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);
      res.json({ success: true, posts: result.rows });
    } catch (error) {
      console.error("Get user posts error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.get("/api/profiles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        "SELECT * FROM profiles WHERE id = $1",
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Profilo non trovato" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ error: "Errore recupero profilo" });
    }
  });
  app.get("/api/sellers/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await pool.query(
        "SELECT id, user_id, handle, display_name, avatar_url FROM sellers WHERE user_id = $1",
        [userId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Seller not found" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Get seller error:", error);
      res.status(500).json({ error: "Errore recupero seller" });
    }
  });
  app.get("/api/sellers/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || q.length < 1) {
        return res.json([]);
      }
      const result = await pool.query(`
        SELECT 
          s.id, 
          s.handle, 
          s.display_name, 
          s.avatar_url, 
          s.bio,
          s.followers,
          p.profile_picture,
          p.first_name,
          p.last_name
        FROM sellers s
        LEFT JOIN profiles p ON s.user_id = p.id
        WHERE 
          s.display_name ILIKE $1 OR 
          s.handle ILIKE $1 OR 
          s.bio ILIKE $1 OR
          p.first_name ILIKE $1 OR
          p.last_name ILIKE $1
        ORDER BY s.followers DESC, s.display_name ASC
        LIMIT 8
      `, [`%${q}%`]);
      res.json(result.rows);
    } catch (error) {
      console.error("Search sellers error:", error);
      res.status(500).json({ error: "Errore ricerca venditori" });
    }
  });
  app.get("/api/search/advanced", async (req, res) => {
    try {
      const {
        q = "",
        category = "",
        priceRange = "",
        location = "",
        minRating = 0,
        hasLiveActive = "false",
        onlyVerified = "false",
        sortBy = "relevance",
        page = 1,
        limit = 20
      } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const searchTerm = `%${q}%`;
      let baseQuery = `
        SELECT DISTINCT
          s.id,
          s.handle,
          s.display_name,
          s.avatar_url,
          s.bio,
          s.category,
          s.created_at,
          p.profile_picture,
          p.first_name,
          p.last_name,
          CASE WHEN l.id IS NOT NULL THEN true ELSE false END as live_active,
          COALESCE(l.viewers, 0) as current_viewers,
          0 as followers,
          false as verified,
          0 as rating
        FROM sellers s
        LEFT JOIN profiles p ON s.user_id = p.id
        LEFT JOIN lives l ON s.id = l.seller_id AND l.status = 'live'
      `;
      const conditions = [];
      const params = [];
      let paramCount = 0;
      if (q && q.trim()) {
        paramCount++;
        conditions.push(`(
          s.display_name ILIKE $${paramCount} OR 
          s.handle ILIKE $${paramCount} OR 
          s.bio ILIKE $${paramCount} OR
          p.first_name ILIKE $${paramCount} OR
          p.last_name ILIKE $${paramCount}
        )`);
        params.push(searchTerm);
      }
      if (category) {
        paramCount++;
        conditions.push(`s.category ILIKE $${paramCount}`);
        params.push(`%${category}%`);
      }
      if (hasLiveActive === "true") {
        conditions.push(`l.id IS NOT NULL`);
      }
      if (onlyVerified === "true") {
        conditions.push(`s.verified = true`);
      }
      if (priceRange) {
        if (priceRange === "0-50") {
          conditions.push(`s.avg_item_price <= 50`);
        } else if (priceRange === "50-100") {
          conditions.push(`s.avg_item_price BETWEEN 50 AND 100`);
        } else if (priceRange === "100-250") {
          conditions.push(`s.avg_item_price BETWEEN 100 AND 250`);
        } else if (priceRange === "250-500") {
          conditions.push(`s.avg_item_price BETWEEN 250 AND 500`);
        } else if (priceRange === "500+") {
          conditions.push(`s.avg_item_price > 500`);
        }
      }
      if (conditions.length > 0) {
        baseQuery += ` WHERE ${conditions.join(" AND ")}`;
      }
      let orderClause = "";
      switch (sortBy) {
        case "followers":
          orderClause = "ORDER BY s.display_name ASC";
          break;
        case "rating":
          orderClause = "ORDER BY s.display_name ASC";
          break;
        case "recent":
          orderClause = "ORDER BY s.created_at DESC";
          break;
        case "live_active":
          orderClause = "ORDER BY live_active DESC, COALESCE(l.viewers, 0) DESC, s.display_name ASC";
          break;
        default:
          orderClause = "ORDER BY s.display_name ASC";
      }
      baseQuery += ` ${orderClause}`;
      paramCount++;
      baseQuery += ` LIMIT $${paramCount}`;
      params.push(parseInt(limit));
      paramCount++;
      baseQuery += ` OFFSET $${paramCount}`;
      params.push(offset);
      console.log("Advanced search query:", baseQuery);
      console.log("Parameters:", params);
      const result = await pool.query(baseQuery, params);
      const countQuery = baseQuery.replace(/SELECT DISTINCT[\s\S]*?FROM/, "SELECT COUNT(DISTINCT s.id) FROM").replace(/ORDER BY[\s\S]*$/, "").replace(/LIMIT[\s\S]*$/, "");
      const countResult = await pool.query(countQuery, params.slice(0, -2));
      const totalCount = parseInt(countResult.rows[0].count);
      const hasMore = offset + parseInt(limit) < totalCount;
      res.json({
        results: result.rows,
        hasMore,
        totalCount,
        page: parseInt(page),
        limit: parseInt(limit)
      });
    } catch (error) {
      console.error("Advanced search error:", error);
      res.status(500).json({ error: "Errore ricerca avanzata" });
    }
  });
  app.get("/api/sellers/handle/:handle", async (req, res) => {
    try {
      const { handle } = req.params;
      const result = await pool.query(
        "SELECT id, user_id, handle, display_name, avatar_url FROM sellers WHERE handle = $1",
        [handle]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Seller not found" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Get seller by handle error:", error);
      res.status(500).json({ error: "Errore recupero seller" });
    }
  });
  app.post("/api/profiles/upgrade", async (req, res) => {
    try {
      const { userId, ...data } = req.body;
      console.log("\u{1F525} UPGRADE REQUEST API VITE:", { userId, data });
      const profileUpsertQuery = `
        INSERT INTO profiles (
          id, email, role, store_name, category, iban, phone,
          shipping_address, shipping_city, shipping_postal_code, 
          shipping_country, profile_completed
        ) VALUES (
          $1, $2, 'seller', $3, $4, $5, $6, $7, $8, $9, $10, true
        )
        ON CONFLICT (id) DO UPDATE SET
          role = 'seller',
          store_name = EXCLUDED.store_name,
          category = EXCLUDED.category,
          iban = EXCLUDED.iban,
          phone = EXCLUDED.phone,
          shipping_address = EXCLUDED.shipping_address,
          shipping_city = EXCLUDED.shipping_city,
          shipping_postal_code = EXCLUDED.shipping_postal_code,
          shipping_country = EXCLUDED.shipping_country,
          profile_completed = true
        RETURNING *
      `;
      const profileResult = await pool.query(profileUpsertQuery, [
        userId,
        data.business_email || `user-${userId}@bidli.live`,
        data.store_name || "",
        data.category || "",
        data.iban || "",
        data.phone || "",
        data.shipping_address || "",
        data.shipping_city || "",
        data.shipping_postal_code || "",
        data.shipping_country || "Italy"
      ]);
      console.log("\u2705 PROFILO AGGIORNATO A SELLER (VITE):", profileResult.rows[0]);
      const handle = (data.store_name || "seller").toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Math.random().toString(36).substr(2, 5);
      try {
        const sellerInsertQuery = `
          INSERT INTO sellers (
            user_id, handle, display_name, store_name, bio, iban,
            category, shipping_address, shipping_city, shipping_postal_code,
            shipping_country, phone, business_email, profile_completed
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
          ) 
          ON CONFLICT (user_id) DO UPDATE SET
            handle = EXCLUDED.handle,
            display_name = EXCLUDED.display_name,
            store_name = EXCLUDED.store_name,
            bio = EXCLUDED.bio,
            iban = EXCLUDED.iban,
            category = EXCLUDED.category,
            shipping_address = EXCLUDED.shipping_address,
            shipping_city = EXCLUDED.shipping_city,
            shipping_postal_code = EXCLUDED.shipping_postal_code,
            shipping_country = EXCLUDED.shipping_country,
            phone = EXCLUDED.phone,
            business_email = EXCLUDED.business_email,
            profile_completed = EXCLUDED.profile_completed
          RETURNING *
        `;
        const sellerResult = await pool.query(sellerInsertQuery, [
          userId,
          handle,
          data.store_name,
          data.store_name,
          data.store_description || "",
          data.iban,
          data.category,
          data.shipping_address,
          data.shipping_city,
          data.shipping_postal_code,
          data.shipping_country || "Italy",
          data.phone,
          data.business_email,
          true
        ]);
        console.log("\u2705 SELLER CREATO/AGGIORNATO (VITE):", sellerResult.rows[0]);
        res.json({
          success: true,
          profile: profileResult.rows[0],
          seller: sellerResult.rows[0],
          message: "Upgrade a venditore completato con successo!"
        });
      } catch (sellerError) {
        console.error("Errore creazione seller:", sellerError);
        res.json({
          success: true,
          profile: profileResult.rows[0],
          message: "Upgrade completato! Profilo venditore sar\xE0 creato automaticamente."
        });
      }
    } catch (error) {
      console.error("\u274C ERRORE UPGRADE (VITE):", error.message);
      res.status(500).json({
        success: false,
        error: "Errore durante upgrade a venditore",
        details: error.message
      });
    }
  });
  app.get("/api/lives/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        "SELECT l.*, s.user_id as seller_user_id, s.display_name as seller_display_name, s.handle as seller_handle, s.avatar_url as seller_avatar_url FROM lives l LEFT JOIN sellers s ON l.seller_id = s.id WHERE l.id = $1",
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Live not found" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Get live error:", error);
      res.status(500).json({ error: "Errore recupero live" });
    }
  });
  app.post("/api/live-lots", async (req, res) => {
    try {
      const { live_id, title, start_price, status = "queued", image_url, buy_now_price, min_bid_increment } = req.body;
      if (!live_id || !title || !start_price) {
        return res.status(400).json({ error: "live_id, title e start_price sono richiesti" });
      }
      const result = await pool.query(
        "INSERT INTO live_lots (live_id, title, start_price, status, image_url, buy_now_price, min_bid_increment) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [live_id, title, parseFloat(start_price), status, image_url || null, buy_now_price ? parseFloat(buy_now_price) : null, min_bid_increment ? parseFloat(min_bid_increment) : 1]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Create live lot error:", error);
      res.status(500).json({ error: "Errore creazione prodotto" });
    }
  });
  app.get("/api/live-lots/live/:liveId", async (req, res) => {
    try {
      const { liveId } = req.params;
      const result = await pool.query(
        "SELECT * FROM live_lots WHERE live_id = $1 ORDER BY created_at ASC",
        [liveId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Get live lots error:", error);
      res.status(500).json({ error: "Errore recupero prodotti" });
    }
  });
  app.patch("/api/live-lots/:lotId", async (req, res) => {
    try {
      const { lotId } = req.params;
      const { status, current_price, final_price, winner_user_id, buy_now_price, min_bid_increment } = req.body;
      const updates = [];
      const values = [lotId];
      let valueIndex = 2;
      if (status !== void 0) {
        updates.push(`status = $${valueIndex}`);
        values.push(status);
        valueIndex++;
      }
      if (current_price !== void 0) {
        updates.push(`current_price = $${valueIndex}`);
        values.push(parseFloat(current_price));
        valueIndex++;
      }
      if (final_price !== void 0) {
        updates.push(`final_price = $${valueIndex}`);
        values.push(final_price ? parseFloat(final_price) : null);
        valueIndex++;
      }
      if (winner_user_id !== void 0) {
        updates.push(`winner_user_id = $${valueIndex}`);
        values.push(winner_user_id);
        valueIndex++;
      }
      if (buy_now_price !== void 0) {
        updates.push(`buy_now_price = $${valueIndex}`);
        values.push(buy_now_price ? parseFloat(buy_now_price) : null);
        valueIndex++;
      }
      if (min_bid_increment !== void 0) {
        updates.push(`min_bid_increment = $${valueIndex}`);
        values.push(min_bid_increment ? parseFloat(min_bid_increment) : 1);
        valueIndex++;
      }
      if (updates.length === 0) {
        return res.status(400).json({ error: "Nessun aggiornamento specificato" });
      }
      const result = await pool.query(
        `UPDATE live_lots SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        values
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Lotto non trovato" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Update live lot error:", error);
      res.status(500).json({ error: "Errore aggiornamento lotto" });
    }
  });
  app.get("/api/posts/live/:liveId", async (req, res) => {
    try {
      const { liveId } = req.params;
      const result = await pool.query(
        "SELECT * FROM posts WHERE live_id = $1 ORDER BY created_at",
        [liveId]
      );
      res.json(result.rows || []);
    } catch (error) {
      console.error("Get posts for live error:", error);
      res.status(500).json({ error: "Errore recupero posts per live" });
    }
  });
  app.post("/api/lives", async (req, res) => {
    try {
      const { seller_id, title, category_id, start_price, scheduled_at } = req.body;
      const result = await pool.query(
        `INSERT INTO lives (seller_id, title, category_id, start_price, scheduled_at, status, viewers, created_at) 
         VALUES ($1, $2, $3, $4, $5, 'scheduled', 0, NOW()) 
         RETURNING *`,
        [seller_id, title, category_id || null, start_price || 0, scheduled_at || "NOW()"]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Create live error:", error);
      res.status(500).json({ error: "Errore creazione live" });
    }
  });
  app.put("/api/lives/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const result = await pool.query(
        "UPDATE lives SET status = $1 WHERE id = $2 RETURNING *",
        [status, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Live not found" });
      }
      if (status === "ended") {
        const { cleanupLive: cleanupLive2 } = await Promise.resolve().then(() => (init_viewer_tracking(), viewer_tracking_exports));
        await cleanupLive2(id);
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Update live status error:", error);
      res.status(500).json({ error: "Errore aggiornamento live" });
    }
  });
  app.post("/api/live/:liveId/join", async (req, res) => {
    try {
      const { liveId } = req.params;
      const { viewerId } = req.body;
      if (!viewerId) {
        return res.status(400).json({ error: "viewerId richiesto" });
      }
      const { addViewer: addViewer2 } = await Promise.resolve().then(() => (init_viewer_tracking(), viewer_tracking_exports));
      const result = await addViewer2(liveId, viewerId);
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }
      res.json({
        success: true,
        viewers: result.viewers,
        totalViewers: result.totalViewers,
        message: "Spettatore aggiunto con successo"
      });
    } catch (error) {
      console.error("Join live error:", error);
      res.status(500).json({ error: "Errore ingresso live" });
    }
  });
  app.post("/api/live/:liveId/leave", async (req, res) => {
    try {
      const { liveId } = req.params;
      const { viewerId } = req.body;
      if (!viewerId) {
        return res.status(400).json({ error: "viewerId richiesto" });
      }
      const { removeViewer: removeViewer2 } = await Promise.resolve().then(() => (init_viewer_tracking(), viewer_tracking_exports));
      const result = await removeViewer2(liveId, viewerId);
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }
      res.json({
        success: true,
        viewers: result.viewers,
        message: "Spettatore rimosso con successo"
      });
    } catch (error) {
      console.error("Leave live error:", error);
      res.status(500).json({ error: "Errore uscita live" });
    }
  });
  app.get("/api/live/:liveId/viewers", async (req, res) => {
    try {
      const { liveId } = req.params;
      const { getViewerStats: getViewerStats2 } = await Promise.resolve().then(() => (init_viewer_tracking(), viewer_tracking_exports));
      const stats = await getViewerStats2(liveId);
      res.json(stats);
    } catch (error) {
      console.error("Get viewer stats error:", error);
      res.status(500).json({ error: "Errore stats spettatori" });
    }
  });
  app.get("/api/lives/seller/:sellerId", async (req, res) => {
    try {
      const { sellerId } = req.params;
      const result = await pool.query(
        "SELECT * FROM lives WHERE seller_id = $1 ORDER BY created_at DESC",
        [sellerId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Get lives error:", error);
      res.status(500).json({ error: "Errore recupero live" });
    }
  });
  app.delete("/api/lives/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        "DELETE FROM lives WHERE id = $1 RETURNING id",
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Live not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete live error:", error);
      res.status(500).json({ error: "Errore eliminazione live" });
    }
  });
  app.get("/api/posts/seller/:sellerId", async (req, res) => {
    try {
      const { sellerId } = req.params;
      const sellerResult = await pool.query(
        "SELECT user_id FROM sellers WHERE id = $1",
        [sellerId]
      );
      if (sellerResult.rows.length === 0) {
        return res.json([]);
      }
      const userId = sellerResult.rows[0].user_id;
      const result = await pool.query(
        "SELECT * FROM social_posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 60",
        [userId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Get posts error:", error);
      res.status(500).json({ error: "Errore recupero posts" });
    }
  });
  app.get("/api/stories/seller/:sellerId", async (req, res) => {
    try {
      const { sellerId } = req.params;
      const result = await pool.query(
        "SELECT * FROM stories WHERE seller_id = $1 ORDER BY created_at DESC LIMIT 20",
        [sellerId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Get stories error:", error);
      res.status(500).json({ error: "Errore recupero stories" });
    }
  });
  app.get("/api/story-items/:storyId", async (req, res) => {
    try {
      const { storyId } = req.params;
      const result = await pool.query(
        "SELECT * FROM story_items WHERE story_id = $1 ORDER BY created_at ASC",
        [storyId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Get story items error:", error);
      res.status(500).json({ error: "Errore recupero story items" });
    }
  });
  app.post("/api/social/follow", async (req, res) => {
    try {
      const { followerId, followingId } = req.body;
      if (!followerId || !followingId) {
        return res.status(400).json({ error: "followerId e followingId richiesti" });
      }
      const { toggleFollow: toggleFollow2 } = await Promise.resolve().then(() => (init_social_api(), social_api_exports));
      const result = await toggleFollow2(followerId, followingId);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json(result);
    } catch (error) {
      console.error("Follow error:", error);
      res.status(500).json({ error: "Errore follow/unfollow" });
    }
  });
  app.get("/api/social/stats/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { getUserSocialStats: getUserSocialStats2 } = await Promise.resolve().then(() => (init_social_api(), social_api_exports));
      const stats = await getUserSocialStats2(userId);
      res.json(stats);
    } catch (error) {
      console.error("Get social stats error:", error);
      res.status(500).json({ error: "Errore recupero statistiche" });
    }
  });
  app.get("/api/social/notifications/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 50, unreadOnly = false } = req.query;
      const { getUserNotifications: getUserNotifications2 } = await Promise.resolve().then(() => (init_social_api(), social_api_exports));
      const result = await getUserNotifications2(userId, parseInt(limit), unreadOnly === "true");
      res.json(result);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Errore recupero notifiche" });
    }
  });
  app.get("/api/social/notifications/:userId/unread-count", async (req, res) => {
    try {
      const { userId } = req.params;
      const { getUnreadNotificationsCount: getUnreadNotificationsCount2 } = await Promise.resolve().then(() => (init_social_api(), social_api_exports));
      const result = await getUnreadNotificationsCount2(userId);
      res.json(result);
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({ error: "Errore conteggio notifiche" });
    }
  });
  app.post("/api/livekit/token", async (req, res) => {
    try {
      const { roomName, participantName, role = "subscriber" } = req.body;
      console.log("\u{1F3A5} LiveKit token request via Vite:", { roomName, participantName, role });
      const { AccessToken } = await import("file:///home/runner/workspace/node_modules/livekit-server-sdk/dist/index.js");
      if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_SECRET_KEY || !process.env.LIVEKIT_URL) {
        throw new Error("LiveKit credentials not configured");
      }
      const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_SECRET_KEY, {
        identity: participantName,
        name: participantName,
        ttl: "24h"
      });
      const grant = {
        roomJoin: true,
        room: roomName,
        canPublish: role === "publisher",
        canSubscribe: true,
        canPublishData: role === "publisher"
      };
      token.addGrant(grant);
      let jwtToken;
      try {
        jwtToken = await token.toJwt();
      } catch (asyncError) {
        jwtToken = token.toJwt();
      }
      if (!jwtToken || typeof jwtToken !== "string" || jwtToken.length < 10) {
        throw new Error(`Token generation failed - invalid JWT: ${typeof jwtToken}, length: ${jwtToken?.length}`);
      }
      console.log("\u2705 Token generato via Vite, lunghezza:", jwtToken.length);
      res.json({
        success: true,
        token: jwtToken,
        serverUrl: process.env.LIVEKIT_URL,
        message: "Token LiveKit generato con successo"
      });
    } catch (error) {
      console.error("\u274C LiveKit token error via Vite:", error);
      res.status(500).json({ error: "Errore generazione token LiveKit" });
    }
  });
  console.log("\u2705 API Routes configurate nel server Vite!");
}

// vite.config.js
var vite_config_default = defineConfig({
  plugins: [
    react(),
    {
      name: "api-middleware",
      configureServer(server) {
        const app = express();
        app.use(express.json());
        setupAPI(app);
        server.middlewares.use((req, res, next) => {
          if (req.url.startsWith("/api/")) {
            app(req, res, next);
          } else {
            next();
          }
        });
      }
    }
  ],
  server: {
    host: "0.0.0.0",
    port: 5e3
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL3V0aWxzL3JhbmtpbmdBbGdvcml0aG0uanMiLCAic2VydmVyL3ZpZXdlci10cmFja2luZy5qcyIsICJzZXJ2ZXIvc3VwYWJhc2Utc2VydmVyLmpzIiwgInNlcnZlci9zb2NpYWwtYXBpLmpzIiwgInZpdGUuY29uZmlnLmpzIiwgInNlcnZlci9hcGkuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9ydW5uZXIvd29ya3NwYWNlL3NyYy91dGlsc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvcnVubmVyL3dvcmtzcGFjZS9zcmMvdXRpbHMvcmFua2luZ0FsZ29yaXRobS5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9ydW5uZXIvd29ya3NwYWNlL3NyYy91dGlscy9yYW5raW5nQWxnb3JpdGhtLmpzXCI7Ly8gc3JjL3V0aWxzL3JhbmtpbmdBbGdvcml0aG0uanNcbi8vIEFsZ29yaXRtbyBkaSByYW5raW5nIGludGVsbGlnZW50ZSBwZXIgdm50Zy5saXZlXG5cbi8qKlxuICogQ2FsY29sYSBpbCBwdW50ZWdnaW8gYmFzZSBkaSB1biBjb250ZW51dG8gYmFzYXRvIHN1IG1ldHJpY2hlIHJlYWxpXG4gKiBAcGFyYW0ge09iamVjdH0gY29udGVudCAtIElsIGNvbnRlbnV0byAobGl2ZSwgcG9zdCwgcHJvZmlsbylcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gVGlwbzogJ2xpdmVfc3RyZWFtJywgJ3Bvc3QnLCAncHJvZmlsZSdcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFB1bnRlZ2dpbyBiYXNlIGNhbGNvbGF0b1xuICovXG5leHBvcnQgZnVuY3Rpb24gY2FsY3VsYXRlQmFzZVNjb3JlKGNvbnRlbnQsIHR5cGUpIHtcbiAgbGV0IGJhc2VTY29yZSA9IDA7XG4gIFxuICBzd2l0Y2ggKHR5cGUpIHtcbiAgICBjYXNlICdsaXZlX3N0cmVhbSc6XG4gICAgICBiYXNlU2NvcmUgPSBjYWxjdWxhdGVMaXZlU2NvcmUoY29udGVudCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdwb3N0JzpcbiAgICAgIGJhc2VTY29yZSA9IGNhbGN1bGF0ZVBvc3RTY29yZShjb250ZW50KTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3Byb2ZpbGUnOlxuICAgICAgYmFzZVNjb3JlID0gY2FsY3VsYXRlUHJvZmlsZVNjb3JlKGNvbnRlbnQpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGJhc2VTY29yZSA9IDEwMDtcbiAgfVxuICBcbiAgcmV0dXJuIE1hdGgubWF4KGJhc2VTY29yZSwgNTApOyAvLyBQdW50ZWdnaW8gbWluaW1vIGRpIDUwXG59XG5cbi8qKlxuICogQ2FsY29sYSBwdW50ZWdnaW8gcGVyIGxpdmUgc3RyZWFtIGJhc2F0byBzdSBlbmdhZ2VtZW50IHJlYWxlXG4gKi9cbmZ1bmN0aW9uIGNhbGN1bGF0ZUxpdmVTY29yZShsaXZlKSB7XG4gIGNvbnN0IHtcbiAgICB2aWV3ZXJfY291bnQgPSAwLFxuICAgIHRvdGFsX2JpZHMgPSAwLFxuICAgIGJpZF9hbW91bnRfdG90YWwgPSAwLFxuICAgIGR1cmF0aW9uX21pbnV0ZXMgPSAwLFxuICAgIGxpa2VzID0gMCxcbiAgICBjb21tZW50cyA9IDAsXG4gICAgc2hhcmVzID0gMFxuICB9ID0gbGl2ZTtcblxuICAvLyBQdW50ZWdnaW8gYmFzZTogNTAwIHB1bnRpICsgYm9udXMgcGVyIG1ldHJpY2hlXG4gIGxldCBzY29yZSA9IDUwMDtcbiAgXG4gIC8vIEJvbnVzIHNwZXR0YXRvcmkgKG1hc3NpbW8gNTAwIHB1bnRpKVxuICBzY29yZSArPSBNYXRoLm1pbih2aWV3ZXJfY291bnQgKiAxMCwgNTAwKTtcbiAgXG4gIC8vIEJvbnVzIG9mZmVydGUgKG1hc3NpbW8gMzAwIHB1bnRpKVxuICBzY29yZSArPSBNYXRoLm1pbih0b3RhbF9iaWRzICogMTUsIDMwMCk7XG4gIFxuICAvLyBCb251cyB2YWxvcmUgb2ZmZXJ0ZSAoMSBwdW50byBwZXIgZXVybylcbiAgc2NvcmUgKz0gYmlkX2Ftb3VudF90b3RhbDtcbiAgXG4gIC8vIEJvbnVzIGR1cmF0YSBsaXZlICgxIHB1bnRvIHBlciBtaW51dG8sIG1heCAxMjApXG4gIHNjb3JlICs9IE1hdGgubWluKGR1cmF0aW9uX21pbnV0ZXMsIDEyMCk7XG4gIFxuICAvLyBCb251cyBlbmdhZ2VtZW50XG4gIHNjb3JlICs9IGxpa2VzICogMjtcbiAgc2NvcmUgKz0gY29tbWVudHMgKiAzO1xuICBzY29yZSArPSBzaGFyZXMgKiA1O1xuICBcbiAgcmV0dXJuIE1hdGgucm91bmQoc2NvcmUpO1xufVxuXG4vKipcbiAqIENhbGNvbGEgcHVudGVnZ2lvIHBlciBwb3N0IGJhc2F0byBzdSBlbmdhZ2VtZW50XG4gKi9cbmZ1bmN0aW9uIGNhbGN1bGF0ZVBvc3RTY29yZShwb3N0KSB7XG4gIGNvbnN0IHtcbiAgICBsaWtlcyA9IDAsXG4gICAgY29tbWVudHMgPSAwLFxuICAgIHNoYXJlcyA9IDAsXG4gICAgdmlld3MgPSAwLFxuICAgIHNhdmVzID0gMCxcbiAgICBjbGlja190aHJvdWdocyA9IDBcbiAgfSA9IHBvc3Q7XG5cbiAgLy8gUHVudGVnZ2lvIGJhc2U6IDIwMCBwdW50aSArIGJvbnVzIHBlciBlbmdhZ2VtZW50XG4gIGxldCBzY29yZSA9IDIwMDtcbiAgXG4gIC8vIEJvbnVzIHZpc3VhbGl6emF6aW9uaSAoMC41IHB1bnRpIHBlciB2aWV3LCBtYXggMjAwKVxuICBzY29yZSArPSBNYXRoLm1pbih2aWV3cyAqIDAuNSwgMjAwKTtcbiAgXG4gIC8vIEJvbnVzIGludGVyYXppb25pXG4gIHNjb3JlICs9IGxpa2VzICogMztcbiAgc2NvcmUgKz0gY29tbWVudHMgKiA1O1xuICBzY29yZSArPSBzaGFyZXMgKiA4O1xuICBzY29yZSArPSBzYXZlcyAqIDQ7XG4gIHNjb3JlICs9IGNsaWNrX3Rocm91Z2hzICogNjtcbiAgXG4gIHJldHVybiBNYXRoLnJvdW5kKHNjb3JlKTtcbn1cblxuLyoqXG4gKiBDYWxjb2xhIHB1bnRlZ2dpbyBwZXIgcHJvZmlsbyBiYXNhdG8gc3UgY3JlZGliaWxpdFx1MDBFMFxuICovXG5mdW5jdGlvbiBjYWxjdWxhdGVQcm9maWxlU2NvcmUocHJvZmlsZSkge1xuICBjb25zdCB7XG4gICAgZm9sbG93ZXJzID0gMCxcbiAgICB0b3RhbF9zYWxlcyA9IDAsXG4gICAgYXZnX3JhdGluZyA9IDAsXG4gICAgcmV2aWV3c19jb3VudCA9IDAsXG4gICAgcHJvZmlsZV92aWV3cyA9IDAsXG4gICAgZGF5c19hY3RpdmUgPSAwXG4gIH0gPSBwcm9maWxlO1xuXG4gIC8vIFB1bnRlZ2dpbyBiYXNlOiAxMDAgcHVudGkgKyBib251cyBwZXIgY3JlZGliaWxpdFx1MDBFMFxuICBsZXQgc2NvcmUgPSAxMDA7XG4gIFxuICAvLyBCb251cyBmb2xsb3dlciAoMC41IHB1bnRpIHBlciBmb2xsb3dlciwgbWF4IDE1MClcbiAgc2NvcmUgKz0gTWF0aC5taW4oZm9sbG93ZXJzICogMC41LCAxNTApO1xuICBcbiAgLy8gQm9udXMgdmVuZGl0ZSAoNSBwdW50aSBwZXIgdmVuZGl0YSwgbWF4IDIwMClcbiAgc2NvcmUgKz0gTWF0aC5taW4odG90YWxfc2FsZXMgKiA1LCAyMDApO1xuICBcbiAgLy8gQm9udXMgcmF0aW5nIChmaW5vIGEgNTAgcHVudGkgcGVyIHJhdGluZyBwZXJmZXR0bylcbiAgc2NvcmUgKz0gKGF2Z19yYXRpbmcgLyA1KSAqIDUwO1xuICBcbiAgLy8gQm9udXMgcmVjZW5zaW9uaSAoMiBwdW50aSBwZXIgcmVjZW5zaW9uZSwgbWF4IDEwMClcbiAgc2NvcmUgKz0gTWF0aC5taW4ocmV2aWV3c19jb3VudCAqIDIsIDEwMCk7XG4gIFxuICAvLyBCb251cyB2aXNpdGUgcHJvZmlsbyAoMC4yIHB1bnRpIHBlciB2aXNpdGEsIG1heCAxMDApXG4gIHNjb3JlICs9IE1hdGgubWluKHByb2ZpbGVfdmlld3MgKiAwLjIsIDEwMCk7XG4gIFxuICAvLyBCb251cyBhbnppYW5pdFx1MDBFMCAoMSBwdW50byBwZXIgZ2lvcm5vIGF0dGl2bywgbWF4IDM2NSlcbiAgc2NvcmUgKz0gTWF0aC5taW4oZGF5c19hY3RpdmUsIDM2NSk7XG4gIFxuICByZXR1cm4gTWF0aC5yb3VuZChzY29yZSk7XG59XG5cbi8qKlxuICogQXBwbGljYSBpbCBtb2x0aXBsaWNhdG9yZSBib29zdCBhbCBwdW50ZWdnaW8gYmFzZVxuICogQHBhcmFtIHtudW1iZXJ9IGJhc2VTY29yZSAtIFB1bnRlZ2dpbyBiYXNlIGNhbGNvbGF0b1xuICogQHBhcmFtIHtudW1iZXJ9IGJvb3N0TXVsdGlwbGllciAtIE1vbHRpcGxpY2F0b3JlIGJvb3N0ICgyLCA1LCAxMClcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFB1bnRlZ2dpbyBmaW5hbGUgY29uIGJvb3N0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcHBseUJvb3N0KGJhc2VTY29yZSwgYm9vc3RNdWx0aXBsaWVyID0gMSkge1xuICByZXR1cm4gTWF0aC5yb3VuZChiYXNlU2NvcmUgKiBib29zdE11bHRpcGxpZXIpO1xufVxuXG4vKipcbiAqIENhbGNvbGEgcmFua2luZyBmaW5hbGUgcGVyIG9yZGluYW1lbnRvIGZlZWRcbiAqIEBwYXJhbSB7T2JqZWN0fSBjb250ZW50IC0gQ29udGVudXRvXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtIFRpcG8gY29udGVudXRvXG4gKiBAcGFyYW0ge251bWJlcn0gYm9vc3RNdWx0aXBsaWVyIC0gTW9sdGlwbGljYXRvcmUgYm9vc3QgYXR0aXZvXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBSaXN1bHRhdG8gY29uIHB1bnRlZ2dpIGRldHRhZ2xpYXRpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYWxjdWxhdGVGaW5hbFJhbmtpbmcoY29udGVudCwgdHlwZSwgYm9vc3RNdWx0aXBsaWVyID0gMSkge1xuICBjb25zdCBiYXNlU2NvcmUgPSBjYWxjdWxhdGVCYXNlU2NvcmUoY29udGVudCwgdHlwZSk7XG4gIGNvbnN0IGJvb3N0ZWRTY29yZSA9IGFwcGx5Qm9vc3QoYmFzZVNjb3JlLCBib29zdE11bHRpcGxpZXIpO1xuICBcbiAgLy8gRmF0dG9yaSBhZ2dpdW50aXZpIHRlbXBvcmFsaVxuICBjb25zdCB0aW1lRGVjYXkgPSBjYWxjdWxhdGVUaW1lRGVjYXkoY29udGVudC5jcmVhdGVkX2F0KTtcbiAgY29uc3QgZmluYWxTY29yZSA9IE1hdGgucm91bmQoYm9vc3RlZFNjb3JlICogdGltZURlY2F5KTtcbiAgXG4gIHJldHVybiB7XG4gICAgYmFzZVNjb3JlLFxuICAgIGJvb3N0TXVsdGlwbGllcixcbiAgICBib29zdGVkU2NvcmUsXG4gICAgdGltZURlY2F5LFxuICAgIGZpbmFsU2NvcmUsXG4gICAgdHlwZVxuICB9O1xufVxuXG4vKipcbiAqIENhbGNvbGEgZGVjYXkgdGVtcG9yYWxlIChjb250ZW51dG8gcGlcdTAwRjkgcmVjZW50ZSA9IHB1bnRlZ2dpbyBwaVx1MDBGOSBhbHRvKVxuICovXG5mdW5jdGlvbiBjYWxjdWxhdGVUaW1lRGVjYXkoY3JlYXRlZEF0KSB7XG4gIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IGNyZWF0ZWQgPSBuZXcgRGF0ZShjcmVhdGVkQXQpO1xuICBjb25zdCBob3Vyc0FnbyA9IChub3cgLSBjcmVhdGVkKSAvICgxMDAwICogNjAgKiA2MCk7XG4gIFxuICAvLyBEZWNheSBncmFkdWFsZTogMTAwJSBuZWxsZSBwcmltZSA0IG9yZSwgcG9pIGRlZ3JhZGFcbiAgaWYgKGhvdXJzQWdvIDw9IDQpIHJldHVybiAxLjA7XG4gIGlmIChob3Vyc0FnbyA8PSAxMikgcmV0dXJuIDAuOTtcbiAgaWYgKGhvdXJzQWdvIDw9IDI0KSByZXR1cm4gMC44O1xuICBpZiAoaG91cnNBZ28gPD0gNDgpIHJldHVybiAwLjc7XG4gIGlmIChob3Vyc0FnbyA8PSA3MikgcmV0dXJuIDAuNjtcbiAgcmV0dXJuIDAuNTsgLy8gTWluaW1vIDUwJSBhbmNoZSBwZXIgY29udGVudXRpIHZlY2NoaVxufVxuXG4vKipcbiAqIENvbmZyb250YSBkdWUgY29udGVudXRpIHBlciBvcmRpbmFtZW50byAoZGEgdXNhcmUgY29uIEFycmF5LnNvcnQpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wYXJlUmFua2luZ3MoYSwgYikge1xuICBjb25zdCByYW5raW5nQSA9IGNhbGN1bGF0ZUZpbmFsUmFua2luZyhhLmNvbnRlbnQsIGEudHlwZSwgYS5ib29zdE11bHRpcGxpZXIgfHwgMSk7XG4gIGNvbnN0IHJhbmtpbmdCID0gY2FsY3VsYXRlRmluYWxSYW5raW5nKGIuY29udGVudCwgYi50eXBlLCBiLmJvb3N0TXVsdGlwbGllciB8fCAxKTtcbiAgXG4gIHJldHVybiByYW5raW5nQi5maW5hbFNjb3JlIC0gcmFua2luZ0EuZmluYWxTY29yZTsgLy8gT3JkaW5lIGRlY3Jlc2NlbnRlXG59XG5cbi8qKlxuICogT3R0aWVuZSBjbGFzc2lmaWNhIGNvbXBsZXRhIGNvbiBkZXR0YWdsaSBkaSByYW5raW5nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRSYW5raW5nTGVhZGVyYm9hcmQoY29udGVudHMpIHtcbiAgcmV0dXJuIGNvbnRlbnRzXG4gICAgLm1hcChpdGVtID0+ICh7XG4gICAgICAuLi5pdGVtLFxuICAgICAgcmFua2luZzogY2FsY3VsYXRlRmluYWxSYW5raW5nKGl0ZW0uY29udGVudCwgaXRlbS50eXBlLCBpdGVtLmJvb3N0TXVsdGlwbGllciB8fCAxKVxuICAgIH0pKVxuICAgIC5zb3J0KChhLCBiKSA9PiBiLnJhbmtpbmcuZmluYWxTY29yZSAtIGEucmFua2luZy5maW5hbFNjb3JlKTtcbn0iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL3J1bm5lci93b3Jrc3BhY2Uvc2VydmVyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9ydW5uZXIvd29ya3NwYWNlL3NlcnZlci92aWV3ZXItdHJhY2tpbmcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvcnVubmVyL3dvcmtzcGFjZS9zZXJ2ZXIvdmlld2VyLXRyYWNraW5nLmpzXCI7LyoqXG4gKiBTaXN0ZW1hIGRpIHRyYWNraW5nIHNwZXR0YXRvcmkgaW4gdGVtcG8gcmVhbGUgcGVyIEJJRExpXG4gKiBDb2xsZWdhdG8gYWxsJ2FsZ29yaXRtbyBkaSBib29zdCBlIHJhbmtpbmdcbiAqL1xuXG5pbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tICdAc3VwYWJhc2Uvc3VwYWJhc2UtanMnO1xuXG5jb25zdCBzdXBhYmFzZSA9IGNyZWF0ZUNsaWVudChcbiAgcHJvY2Vzcy5lbnYuVklURV9TVVBBQkFTRV9VUkwgfHwgcHJvY2Vzcy5lbnYuU1VQQUJBU0VfVVJMLFxuICBwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX0FOT05fS0VZIHx8IHByb2Nlc3MuZW52LlNVUEFCQVNFX0FOT05fS0VZXG4pO1xuXG4vLyBDYWNoZSBpbiBtZW1vcmlhIHBlciB0cmFja2luZyB2ZWxvY2VcbmNvbnN0IHZpZXdlcnNDYWNoZSA9IG5ldyBNYXAoKTsgLy8gbGl2ZUlkIC0+IFNldCh2aWV3ZXJJZHMpXG5jb25zdCBjbGVhbnVwVGltZXJzID0gbmV3IE1hcCgpOyAvLyB2aWV3ZXJJZCAtPiB0aW1lb3V0SWRcblxuLyoqXG4gKiBBZ2dpdW5nZSB1bm8gc3BldHRhdG9yZSBhbGxhIGxpdmVcbiAqL1xuYXN5bmMgZnVuY3Rpb24gYWRkVmlld2VyKGxpdmVJZCwgdmlld2VySWQpIHtcbiAgdHJ5IHtcbiAgICAvLyAxLiBBZ2dpb3JuYSBjYWNoZSBsb2NhbGVcbiAgICBpZiAoIXZpZXdlcnNDYWNoZS5oYXMobGl2ZUlkKSkge1xuICAgICAgdmlld2Vyc0NhY2hlLnNldChsaXZlSWQsIG5ldyBTZXQoKSk7XG4gICAgfVxuICAgIFxuICAgIGNvbnN0IHZpZXdlcnMgPSB2aWV3ZXJzQ2FjaGUuZ2V0KGxpdmVJZCk7XG4gICAgY29uc3Qgd2FzQWxyZWFkeVdhdGNoaW5nID0gdmlld2Vycy5oYXModmlld2VySWQpO1xuICAgIFxuICAgIGlmICghd2FzQWxyZWFkeVdhdGNoaW5nKSB7XG4gICAgICB2aWV3ZXJzLmFkZCh2aWV3ZXJJZCk7XG4gICAgICBcbiAgICAgIC8vIDIuIEFnZ2lvcm5hIGNvbnRlZ2dpbyB2aWV3ZXJzIGUgdG90YWxfdmlld2Vyc1xuICAgICAgY29uc3QgbmV3Q291bnQgPSB2aWV3ZXJzLnNpemU7XG4gICAgICBcbiAgICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAgIC5mcm9tKCdsaXZlcycpXG4gICAgICAgIC51cGRhdGUoeyBcbiAgICAgICAgICB2aWV3ZXJzOiBuZXdDb3VudFxuICAgICAgICB9KVxuICAgICAgICAuZXEoJ2lkJywgbGl2ZUlkKVxuICAgICAgICAuc2VsZWN0KCd2aWV3ZXJzJylcbiAgICAgICAgLm1heWJlU2luZ2xlKCk7XG4gICAgICBcbiAgICAgIGlmIChlcnJvciB8fCAhZGF0YSkge1xuICAgICAgICBjb25zb2xlLndhcm4oYFx1MjZBMFx1RkUwRiBMaXZlICR7bGl2ZUlkfSBub24gdHJvdmF0YSBuZWwgREIsIG1hbnRlbmdvIHNvbG8gY2FjaGUgbG9jYWxlYCk7XG4gICAgICAgIGNvbnNvbGUud2FybignRXJyb3JlIERCOicsIGVycm9yKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgIHZpZXdlcnM6IG5ld0NvdW50LFxuICAgICAgICAgIHRvdGFsVmlld2VyczogbmV3Q291bnRcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgY29uc29sZS5sb2coYFx1RDgzRFx1RENDOCBTcGV0dGF0b3JlIGFnZ2l1bnRvIGFsbGEgbGl2ZSAke2xpdmVJZH06ICR7bmV3Q291bnR9IHNwZXR0YXRvcmkgYXR0dWFsaWApO1xuICAgICAgXG4gICAgICAvLyAzLiBDbGVhbnVwIGF1dG9tYXRpY28gZG9wbyA1IG1pbnV0aSBkaSBpbmF0dGl2aXRcdTAwRTBcbiAgICAgIHNjaGVkdWxlVmlld2VyQ2xlYW51cChsaXZlSWQsIHZpZXdlcklkKTtcbiAgICAgIFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgdmlld2VyczogbmV3Q291bnQsXG4gICAgICAgIHRvdGFsVmlld2VyczogMCAvLyBTZW1wbGlmaWNhdG8gcGVyIG9yYVxuICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgLy8gUmlubm92YSBjbGVhbnVwIHRpbWVyIHNlIGdpXHUwMEUwIHByZXNlbnRlXG4gICAgc2NoZWR1bGVWaWV3ZXJDbGVhbnVwKGxpdmVJZCwgdmlld2VySWQpO1xuICAgIFxuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgdmlld2Vyczogdmlld2Vycy5zaXplLFxuICAgICAgdG90YWxWaWV3ZXJzOiAwXG4gICAgfTtcbiAgICBcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLndhcm4oJ1x1MjZBMFx1RkUwRiBFcnJvcmUgYWdnaXVudGEgc3BldHRhdG9yZSAobm9uIGNyaXRpY28pOicsIGVycm9yLm1lc3NhZ2UpO1xuICAgIC8vIEZhbGxiYWNrOiBtYW50aWVuaSBzb2xvIGNhY2hlIGxvY2FsZVxuICAgIGNvbnN0IHZpZXdlcnMgPSB2aWV3ZXJzQ2FjaGUuZ2V0KGxpdmVJZCkgfHwgbmV3IFNldCgpO1xuICAgIHJldHVybiB7IFxuICAgICAgc3VjY2VzczogdHJ1ZSwgXG4gICAgICB2aWV3ZXJzOiB2aWV3ZXJzLnNpemUsXG4gICAgICB0b3RhbFZpZXdlcnM6IDBcbiAgICB9O1xuICB9XG59XG5cbi8qKlxuICogUmltdW92ZSB1bm8gc3BldHRhdG9yZSBkYWxsYSBsaXZlXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHJlbW92ZVZpZXdlcihsaXZlSWQsIHZpZXdlcklkKSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgdmlld2VycyA9IHZpZXdlcnNDYWNoZS5nZXQobGl2ZUlkKTtcbiAgICBpZiAoIXZpZXdlcnMgfHwgIXZpZXdlcnMuaGFzKHZpZXdlcklkKSkge1xuICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgdmlld2Vyczogdmlld2Vycz8uc2l6ZSB8fCAwIH07XG4gICAgfVxuICAgIFxuICAgIC8vIDEuIFJpbXVvdmkgZGEgY2FjaGVcbiAgICB2aWV3ZXJzLmRlbGV0ZSh2aWV3ZXJJZCk7XG4gICAgXG4gICAgLy8gMi4gQ2FuY2VsbGEgY2xlYW51cCB0aW1lclxuICAgIGNvbnN0IHRpbWVySWQgPSBjbGVhbnVwVGltZXJzLmdldChgJHtsaXZlSWR9LSR7dmlld2VySWR9YCk7XG4gICAgaWYgKHRpbWVySWQpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lcklkKTtcbiAgICAgIGNsZWFudXBUaW1lcnMuZGVsZXRlKGAke2xpdmVJZH0tJHt2aWV3ZXJJZH1gKTtcbiAgICB9XG4gICAgXG4gICAgLy8gMy4gQWdnaW9ybmEgZGF0YWJhc2VcbiAgICBjb25zdCBuZXdDb3VudCA9IHZpZXdlcnMuc2l6ZTtcbiAgICBcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgLmZyb20oJ2xpdmVzJylcbiAgICAgIC51cGRhdGUoeyB2aWV3ZXJzOiBuZXdDb3VudCB9KVxuICAgICAgLmVxKCdpZCcsIGxpdmVJZClcbiAgICAgIC5zZWxlY3QoJ3ZpZXdlcnMnKVxuICAgICAgLnNpbmdsZSgpO1xuICAgIFxuICAgIGlmIChlcnJvcikgdGhyb3cgZXJyb3I7XG4gICAgXG4gICAgY29uc29sZS5sb2coYFx1RDgzRFx1RENDOSBTcGV0dGF0b3JlIHJpbW9zc28gZGFsbGEgbGl2ZSAke2xpdmVJZH06ICR7bmV3Q291bnR9IHNwZXR0YXRvcmkgcmltYW5lbnRpYCk7XG4gICAgXG4gICAgLy8gNC4gUmljYWxjb2xhIHNjb3JlIHBlciBhbGdvcml0bW8gYm9vc3RcbiAgICBhd2FpdCB1cGRhdGVMaXZlUmFua2luZyhsaXZlSWQsIG5ld0NvdW50KTtcbiAgICBcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIHZpZXdlcnM6IG5ld0NvdW50XG4gICAgfTtcbiAgICBcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdcdTI3NEMgRXJyb3JlIHJpbW96aW9uZSBzcGV0dGF0b3JlOicsIGVycm9yKTtcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgfVxufVxuXG4vKipcbiAqIFByb2dyYW1tYSBsYSByaW1vemlvbmUgYXV0b21hdGljYSBkaSB1bm8gc3BldHRhdG9yZSBkb3BvIGluYXR0aXZpdFx1MDBFMFxuICovXG5mdW5jdGlvbiBzY2hlZHVsZVZpZXdlckNsZWFudXAobGl2ZUlkLCB2aWV3ZXJJZCkge1xuICBjb25zdCBrZXkgPSBgJHtsaXZlSWR9LSR7dmlld2VySWR9YDtcbiAgXG4gIC8vIENhbmNlbGxhIHRpbWVyIGVzaXN0ZW50ZVxuICBjb25zdCBleGlzdGluZ1RpbWVyID0gY2xlYW51cFRpbWVycy5nZXQoa2V5KTtcbiAgaWYgKGV4aXN0aW5nVGltZXIpIHtcbiAgICBjbGVhclRpbWVvdXQoZXhpc3RpbmdUaW1lcik7XG4gIH1cbiAgXG4gIC8vIE51b3ZvIHRpbWVyIGRpIDUgbWludXRpXG4gIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dChhc3luYyAoKSA9PiB7XG4gICAgY29uc29sZS5sb2coYFx1RDgzRVx1RERGOSBDbGVhbnVwIGF1dG9tYXRpY28gc3BldHRhdG9yZSAke3ZpZXdlcklkfSBkYWxsYSBsaXZlICR7bGl2ZUlkfWApO1xuICAgIGF3YWl0IHJlbW92ZVZpZXdlcihsaXZlSWQsIHZpZXdlcklkKTtcbiAgfSwgNSAqIDYwICogMTAwMCk7IC8vIDUgbWludXRpXG4gIFxuICBjbGVhbnVwVGltZXJzLnNldChrZXksIHRpbWVyKTtcbn1cblxuLyoqXG4gKiBBZ2dpb3JuYSBpbCByYW5raW5nIGRlbGxhIGxpdmUgbmVsbCdhbGdvcml0bW8gYm9vc3RcbiAqL1xuYXN5bmMgZnVuY3Rpb24gdXBkYXRlTGl2ZVJhbmtpbmcobGl2ZUlkLCB2aWV3ZXJDb3VudCkge1xuICB0cnkge1xuICAgIC8vIENhcmljYSBkYXRpIGxpdmUgcGVyIGNhbGNvbG8gc2NvcmVcbiAgICBjb25zdCB7IGRhdGE6IGxpdmUsIGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgLmZyb20oJ2xpdmVzJylcbiAgICAgIC5zZWxlY3QoJyonKVxuICAgICAgLmVxKCdpZCcsIGxpdmVJZClcbiAgICAgIC5zaW5nbGUoKTtcbiAgICBcbiAgICBpZiAoZXJyb3IpIHRocm93IGVycm9yO1xuICAgIFxuICAgIC8vIENhbGNvbGEgbnVvdm8gc2NvcmUgdXNhbmRvIGwnYWxnb3JpdG1vIGVzaXN0ZW50ZVxuICAgIGNvbnN0IHsgY2FsY3VsYXRlQmFzZVNjb3JlLCBhcHBseUJvb3N0IH0gPSBhd2FpdCBpbXBvcnQoJy4uL3NyYy91dGlscy9yYW5raW5nQWxnb3JpdGhtLmpzJyk7XG4gICAgXG4gICAgLy8gQWdnaXVuZ2kgdmlld2VyX2NvdW50IGFnZ2lvcm5hdG9cbiAgICBjb25zdCBsaXZlV2l0aFZpZXdlcnMgPSB7XG4gICAgICAuLi5saXZlLFxuICAgICAgdmlld2VyX2NvdW50OiB2aWV3ZXJDb3VudFxuICAgIH07XG4gICAgXG4gICAgY29uc3QgYmFzZVNjb3JlID0gY2FsY3VsYXRlQmFzZVNjb3JlKGxpdmVXaXRoVmlld2VycywgJ2xpdmVfc3RyZWFtJyk7XG4gICAgXG4gICAgLy8gQ29udHJvbGxhIHNlIGhhIGJvb3N0IGF0dGl2aVxuICAgIGNvbnN0IHsgZGF0YTogYWN0aXZlQm9vc3RzIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgLmZyb20oJ2Jvb3N0X2NhbXBhaWducycpXG4gICAgICAuc2VsZWN0KCdib29zdF9tdWx0aXBsaWVyLCBleHBpcmVzX2F0JylcbiAgICAgIC5lcSgnY29udGVudF90eXBlJywgJ2xpdmUnKVxuICAgICAgLmVxKCdjb250ZW50X2lkJywgbGl2ZUlkKVxuICAgICAgLmVxKCdzdGF0dXMnLCAnYWN0aXZlJylcbiAgICAgIC5ndCgnZXhwaXJlc19hdCcsIG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSk7XG4gICAgXG4gICAgbGV0IGZpbmFsU2NvcmUgPSBiYXNlU2NvcmU7XG4gICAgaWYgKGFjdGl2ZUJvb3N0cyAmJiBhY3RpdmVCb29zdHMubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgYm9vc3QgPSBhY3RpdmVCb29zdHNbMF07XG4gICAgICBmaW5hbFNjb3JlID0gYXBwbHlCb29zdChiYXNlU2NvcmUsIGJvb3N0LmJvb3N0X211bHRpcGxpZXIpO1xuICAgIH1cbiAgICBcbiAgICAvLyBBZ2dpb3JuYSByYW5raW5nIHNjb3JlIG5lbCBkYXRhYmFzZSAoc2UgaGFpIHVuYSB0YWJlbGxhIHJhbmtpbmdzKVxuICAgIGNvbnNvbGUubG9nKGBcdUQ4M0RcdURFODAgU2NvcmUgYWdnaW9ybmF0byBwZXIgbGl2ZSAke2xpdmVJZH06ICR7ZmluYWxTY29yZX0gKCR7dmlld2VyQ291bnR9IHNwZXR0YXRvcmkpYCk7XG4gICAgXG4gICAgcmV0dXJuIGZpbmFsU2NvcmU7XG4gICAgXG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignXHUyNzRDIEVycm9yZSBhZ2dpb3JuYW1lbnRvIHJhbmtpbmc6JywgZXJyb3IpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogT3R0aWVuaSBzdGF0aXN0aWNoZSBzcGV0dGF0b3JpIHBlciB1bmEgbGl2ZVxuICovXG5hc3luYyBmdW5jdGlvbiBnZXRWaWV3ZXJTdGF0cyhsaXZlSWQpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgLmZyb20oJ2xpdmVzJylcbiAgICAgIC5zZWxlY3QoJ3ZpZXdlcnMnKVxuICAgICAgLmVxKCdpZCcsIGxpdmVJZClcbiAgICAgIC5tYXliZVNpbmdsZSgpOyAvLyBDT1JSRVpJT05FOiB1c2EgbWF5YmVTaW5nbGUoKSBpbnZlY2UgZGkgc2luZ2xlKCkgcGVyIGV2aXRhcmUgZXJyb3JpIHN1IHJpZ2hlIHZ1b3RlXG4gICAgXG4gICAgLy8gU2Ugbm9uIGMnXHUwMEU4IGVycm9yZSBtYSBuZW1tZW5vIGRhdGksIHVzYSBzb2xvIGNhY2hlXG4gICAgaWYgKGVycm9yICYmIGVycm9yLmNvZGUgIT09ICdQR1JTVDExNicpIHtcbiAgICAgIHRocm93IGVycm9yOyAvLyBTb2xvIGVycm9yaSB2ZXJpLCBub24gXCJubyByb3dzXCJcbiAgICB9XG4gICAgXG4gICAgY29uc3QgY3VycmVudCA9IHZpZXdlcnNDYWNoZS5nZXQobGl2ZUlkKT8uc2l6ZSB8fCAwO1xuICAgIFxuICAgIHJldHVybiB7XG4gICAgICBjdXJyZW50OiBNYXRoLm1heChjdXJyZW50LCBkYXRhPy52aWV3ZXJzIHx8IDApLFxuICAgICAgdG90YWw6IDAsIC8vIFNpbXBsaWZpZWQgZm9yIG5vdyB0byBhdm9pZCBEQiBlcnJvcnNcbiAgICAgIGNhY2hlZDogY3VycmVudFxuICAgIH07XG4gICAgXG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgLy8gU29sbyBsb2dnYSBzZSBcdTAwRTggdW4gZXJyb3JlIGRpdmVyc28gZGEgXCJubyByb3dzIGZvdW5kXCJcbiAgICBpZiAoZXJyb3IuY29kZSAhPT0gJ1BHUlNUMTE2Jykge1xuICAgICAgY29uc29sZS5lcnJvcignXHUyNzRDIEVycm9yZSBzdGF0cyBzcGV0dGF0b3JpOicsIGVycm9yKTtcbiAgICB9XG4gICAgcmV0dXJuIHsgY3VycmVudDogMCwgdG90YWw6IDAsIGNhY2hlZDogMCB9O1xuICB9XG59XG5cbi8qKlxuICogQ2xlYW51cCBnbG9iYWxlIHBlciBsaXZlIHRlcm1pbmF0ZVxuICovXG5hc3luYyBmdW5jdGlvbiBjbGVhbnVwTGl2ZShsaXZlSWQpIHtcbiAgY29uc29sZS5sb2coYFx1RDgzRVx1RERGOSBDbGVhbnVwIGNvbXBsZXRvIGxpdmUgJHtsaXZlSWR9YCk7XG4gIFxuICAvLyBSaW11b3ZpIHR1dHRpIGdsaSBzcGV0dGF0b3JpIGRhbGxhIGNhY2hlXG4gIGNvbnN0IHZpZXdlcnMgPSB2aWV3ZXJzQ2FjaGUuZ2V0KGxpdmVJZCk7XG4gIGlmICh2aWV3ZXJzKSB7XG4gICAgZm9yIChjb25zdCB2aWV3ZXJJZCBvZiB2aWV3ZXJzKSB7XG4gICAgICBjb25zdCBrZXkgPSBgJHtsaXZlSWR9LSR7dmlld2VySWR9YDtcbiAgICAgIGNvbnN0IHRpbWVyID0gY2xlYW51cFRpbWVycy5nZXQoa2V5KTtcbiAgICAgIGlmICh0aW1lcikge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgICBjbGVhbnVwVGltZXJzLmRlbGV0ZShrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgICB2aWV3ZXJzQ2FjaGUuZGVsZXRlKGxpdmVJZCk7XG4gIH1cbiAgXG4gIC8vIEF6emVyYSBjb250YXRvcmkgbmVsIGRhdGFiYXNlXG4gIGF3YWl0IHN1cGFiYXNlXG4gICAgLmZyb20oJ2xpdmVzJylcbiAgICAudXBkYXRlKHsgdmlld2VyczogMCB9KVxuICAgIC5lcSgnaWQnLCBsaXZlSWQpO1xufVxuXG5leHBvcnQge1xuICBhZGRWaWV3ZXIsXG4gIHJlbW92ZVZpZXdlcixcbiAgZ2V0Vmlld2VyU3RhdHMsXG4gIGNsZWFudXBMaXZlXG59OyIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL2hvbWUvcnVubmVyL3dvcmtzcGFjZS9zZXJ2ZXJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL3J1bm5lci93b3Jrc3BhY2Uvc2VydmVyL3N1cGFiYXNlLXNlcnZlci5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9ydW5uZXIvd29ya3NwYWNlL3NlcnZlci9zdXBhYmFzZS1zZXJ2ZXIuanNcIjsvKipcbiAqIFN1cGFiYXNlIENsaWVudCBwZXIgaWwgQmFja2VuZFxuICogVXNhIHByb2Nlc3MuZW52IGludmVjZSBkaSBpbXBvcnQubWV0YS5lbnZcbiAqL1xuXG5pbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tICdAc3VwYWJhc2Uvc3VwYWJhc2UtanMnO1xuXG5jb25zdCBzdXBhYmFzZVVybCA9IHByb2Nlc3MuZW52LlZJVEVfU1VQQUJBU0VfVVJMIHx8IHByb2Nlc3MuZW52LlNVUEFCQVNFX1VSTDtcbmNvbnN0IHN1cGFiYXNlS2V5ID0gcHJvY2Vzcy5lbnYuVklURV9TVVBBQkFTRV9BTk9OX0tFWSB8fCBwcm9jZXNzLmVudi5TVVBBQkFTRV9BTk9OX0tFWTtcblxuaWYgKCFzdXBhYmFzZVVybCB8fCAhc3VwYWJhc2VLZXkpIHtcbiAgY29uc29sZS5lcnJvcignXHUyNzRDIE1pc3NpbmcgU3VwYWJhc2UgY3JlZGVudGlhbHMgaW4gYmFja2VuZCcpO1xuICBjb25zb2xlLmVycm9yKCdBdmFpbGFibGUgZW52IHZhcnM6JywgT2JqZWN0LmtleXMocHJvY2Vzcy5lbnYpLmZpbHRlcihrZXkgPT4gXG4gICAga2V5LmluY2x1ZGVzKCdTVVBBQkFTRScpIHx8IGtleS5pbmNsdWRlcygnVklURV9TVVBBQkFTRScpXG4gICkpO1xufVxuXG5leHBvcnQgY29uc3Qgc3VwYWJhc2UgPSBjcmVhdGVDbGllbnQoc3VwYWJhc2VVcmwsIHN1cGFiYXNlS2V5LCB7XG4gIGF1dGg6IHtcbiAgICBhdXRvUmVmcmVzaFRva2VuOiBmYWxzZSwgLy8gQmFja2VuZCBub24gZ2VzdGlzY2Ugc2Vzc2lvbmkgdXRlbnRlXG4gICAgcGVyc2lzdFNlc3Npb246IGZhbHNlXG4gIH1cbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBzdXBhYmFzZTsiLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL3J1bm5lci93b3Jrc3BhY2Uvc2VydmVyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9ydW5uZXIvd29ya3NwYWNlL3NlcnZlci9zb2NpYWwtYXBpLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3J1bm5lci93b3Jrc3BhY2Uvc2VydmVyL3NvY2lhbC1hcGkuanNcIjsvKipcbiAqIEFQSSBFbmRwb2ludHMgcGVyIGlsIHNpc3RlbWEgc29jaWFsIGRpIEJJRExpXG4gKiBHZXN0aXNjZSBmb2xsb3dzLCBwb3N0cywgc3Rvcmllcywgbm90aWZpY2hlXG4gKi9cblxuaW1wb3J0IHsgc3VwYWJhc2UgfSBmcm9tICcuL3N1cGFiYXNlLXNlcnZlci5qcyc7XG5cbi8qKlxuICogPT09IEZPTExPV0VSIFNZU1RFTSA9PT1cbiAqL1xuXG4vLyBGb2xsb3cvVW5mb2xsb3cgdXRlbnRlXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdG9nZ2xlRm9sbG93KGZvbGxvd2VySWQsIGZvbGxvd2luZ0lkKSB7XG4gIHRyeSB7XG4gICAgaWYgKGZvbGxvd2VySWQgPT09IGZvbGxvd2luZ0lkKSB7XG4gICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdOb24gcHVvaSBzZWd1aXJlIHRlIHN0ZXNzbycgfTtcbiAgICB9XG5cbiAgICAvLyBDb250cm9sbGEgc2UgZ2lcdTAwRTAgc2VndWVcbiAgICBjb25zdCB7IGRhdGE6IGV4aXN0aW5nIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgLmZyb20oJ2ZvbGxvd3MnKVxuICAgICAgLnNlbGVjdCgnaWQnKVxuICAgICAgLmVxKCdmb2xsb3dlcl9pZCcsIGZvbGxvd2VySWQpXG4gICAgICAuZXEoJ2ZvbGxvd2luZ19pZCcsIGZvbGxvd2luZ0lkKVxuICAgICAgLnNpbmdsZSgpO1xuXG4gICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICAvLyBVbmZvbGxvd1xuICAgICAgYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgLmZyb20oJ2ZvbGxvd3MnKVxuICAgICAgICAuZGVsZXRlKClcbiAgICAgICAgLmVxKCdmb2xsb3dlcl9pZCcsIGZvbGxvd2VySWQpXG4gICAgICAgIC5lcSgnZm9sbG93aW5nX2lkJywgZm9sbG93aW5nSWQpO1xuXG4gICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246ICd1bmZvbGxvd2VkJyB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGb2xsb3dcbiAgICAgIGF3YWl0IHN1cGFiYXNlXG4gICAgICAgIC5mcm9tKCdmb2xsb3dzJylcbiAgICAgICAgLmluc2VydCh7IGZvbGxvd2VyX2lkOiBmb2xsb3dlcklkLCBmb2xsb3dpbmdfaWQ6IGZvbGxvd2luZ0lkIH0pO1xuXG4gICAgICAvLyBDcmVhIG5vdGlmaWNhXG4gICAgICBhd2FpdCBjcmVhdGVOb3RpZmljYXRpb24oe1xuICAgICAgICB1c2VyX2lkOiBmb2xsb3dpbmdJZCxcbiAgICAgICAgYWN0b3JfaWQ6IGZvbGxvd2VySWQsXG4gICAgICAgIHR5cGU6ICdmb2xsb3cnLFxuICAgICAgICB0aXRsZTogJ051b3ZvIGZvbGxvd2VyIScsXG4gICAgICAgIG1lc3NhZ2U6ICdIYSBpbml6aWF0byBhIHNlZ3VpcnRpJyxcbiAgICAgICAgYWN0aW9uX3VybDogYC9wcm9maWxlLyR7Zm9sbG93ZXJJZH1gXG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiAnZm9sbG93ZWQnIH07XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1RvZ2dsZSBmb2xsb3cgZXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICB9XG59XG5cbi8vIE90dGllbmkgc3RhdGlzdGljaGUgZm9sbG93ZXJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRVc2VyU29jaWFsU3RhdHModXNlcklkKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgW2ZvbGxvd2Vyc1Jlc3VsdCwgZm9sbG93aW5nUmVzdWx0XSA9IGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgIHN1cGFiYXNlXG4gICAgICAgIC5mcm9tKCdmb2xsb3dzJylcbiAgICAgICAgLnNlbGVjdCgnaWQnKVxuICAgICAgICAuZXEoJ2ZvbGxvd2luZ19pZCcsIHVzZXJJZCksXG4gICAgICBzdXBhYmFzZVxuICAgICAgICAuZnJvbSgnZm9sbG93cycpXG4gICAgICAgIC5zZWxlY3QoJ2lkJylcbiAgICAgICAgLmVxKCdmb2xsb3dlcl9pZCcsIHVzZXJJZClcbiAgICBdKTtcblxuICAgIHJldHVybiB7XG4gICAgICBmb2xsb3dlcnNfY291bnQ6IGZvbGxvd2Vyc1Jlc3VsdC5kYXRhPy5sZW5ndGggfHwgMCxcbiAgICAgIGZvbGxvd2luZ19jb3VudDogZm9sbG93aW5nUmVzdWx0LmRhdGE/Lmxlbmd0aCB8fCAwXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdHZXQgc29jaWFsIHN0YXRzIGVycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4geyBmb2xsb3dlcnNfY291bnQ6IDAsIGZvbGxvd2luZ19jb3VudDogMCB9O1xuICB9XG59XG5cbi8vIENvbnRyb2xsYSBzZSB1biB1dGVudGUgc2VndWUgdW4gYWx0cm9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja0lmRm9sbG93aW5nKGZvbGxvd2VySWQsIGZvbGxvd2luZ0lkKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgLmZyb20oJ2ZvbGxvd3MnKVxuICAgICAgLnNlbGVjdCgnaWQnKVxuICAgICAgLmVxKCdmb2xsb3dlcl9pZCcsIGZvbGxvd2VySWQpXG4gICAgICAuZXEoJ2ZvbGxvd2luZ19pZCcsIGZvbGxvd2luZ0lkKVxuICAgICAgLnNpbmdsZSgpO1xuXG4gICAgcmV0dXJuICEhZGF0YTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiA9PT0gUE9TVCBTWVNURU0gPT09XG4gKi9cblxuLy8gQ3JlYSBudW92byBwb3N0IHNvY2lhbFxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVNvY2lhbFBvc3QocG9zdERhdGEpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IGRhdGE6IHBvc3QsIGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgLmZyb20oJ3NvY2lhbF9wb3N0cycpXG4gICAgICAuaW5zZXJ0KHtcbiAgICAgICAgdXNlcl9pZDogcG9zdERhdGEudXNlcl9pZCxcbiAgICAgICAgY29udGVudDogcG9zdERhdGEuY29udGVudCxcbiAgICAgICAgaW1hZ2VzOiBwb3N0RGF0YS5pbWFnZXMgfHwgW10sXG4gICAgICAgIGxpdmVfaWQ6IHBvc3REYXRhLmxpdmVfaWQgfHwgbnVsbCxcbiAgICAgICAgdmlzaWJpbGl0eTogcG9zdERhdGEudmlzaWJpbGl0eSB8fCAncHVibGljJyxcbiAgICAgICAgdGFnczogcG9zdERhdGEudGFncyB8fCBbXSxcbiAgICAgICAgbWVudGlvbnM6IHBvc3REYXRhLm1lbnRpb25zIHx8IFtdXG4gICAgICB9KVxuICAgICAgLnNlbGVjdCgpXG4gICAgICAuc2luZ2xlKCk7XG5cbiAgICBpZiAoZXJyb3IpIHRocm93IGVycm9yO1xuXG4gICAgLy8gTm90aWZpY2EgaSBmb2xsb3dlciBkZWwgbnVvdm8gcG9zdFxuICAgIGF3YWl0IG5vdGlmeUZvbGxvd2Vyc09mTmV3UG9zdChwb3N0RGF0YS51c2VyX2lkLCBwb3N0LmlkKTtcblxuICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIHBvc3QgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdDcmVhdGUgcG9zdCBlcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gIH1cbn1cblxuLy8gT3R0aWVuaSBwb3N0IGRpIHVuIHV0ZW50ZVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFVzZXJQb3N0cyh1c2VySWQsIGxpbWl0ID0gMjAsIG9mZnNldCA9IDApIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IGRhdGE6IHBvc3RzLCBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKCdzb2NpYWxfcG9zdHMnKVxuICAgICAgLnNlbGVjdChgXG4gICAgICAgICosXG4gICAgICAgIHVzZXI6dXNlcl9pZCAoXG4gICAgICAgICAgaWQsIHVzZXJuYW1lLCBmaXJzdF9uYW1lLCBsYXN0X25hbWUsIHByb2ZpbGVfcGljdHVyZVxuICAgICAgICApLFxuICAgICAgICBsaXZlOmxpdmVfaWQgKFxuICAgICAgICAgIGlkLCB0aXRsZSwgc3RhdHVzXG4gICAgICAgIClcbiAgICAgIGApXG4gICAgICAuZXEoJ3VzZXJfaWQnLCB1c2VySWQpXG4gICAgICAuZXEoJ3N0YXR1cycsICdwdWJsaXNoZWQnKVxuICAgICAgLm9yZGVyKCdjcmVhdGVkX2F0JywgeyBhc2NlbmRpbmc6IGZhbHNlIH0pXG4gICAgICAucmFuZ2Uob2Zmc2V0LCBvZmZzZXQgKyBsaW1pdCAtIDEpO1xuXG4gICAgaWYgKGVycm9yKSB0aHJvdyBlcnJvcjtcblxuICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIHBvc3RzOiBwb3N0cyB8fCBbXSB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0dldCB1c2VyIHBvc3RzIGVycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgcG9zdHM6IFtdIH07XG4gIH1cbn1cblxuLy8gT3R0aWVuaSBmZWVkIHBvc3QgcGVyIGhvbWVwYWdlXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0UG9zdHNGZWVkKHVzZXJJZCwgbGltaXQgPSAyMCwgb2Zmc2V0ID0gMCkge1xuICB0cnkge1xuICAgIC8vIFNlIGwndXRlbnRlIFx1MDBFOCBsb2dnYXRvLCBtb3N0cmEgcG9zdCBkaSBjaGkgc2VndWUgKyBwb3N0IHBvcG9sYXJpXG4gICAgLy8gU2Ugbm9uIFx1MDBFOCBsb2dnYXRvLCBtb3N0cmEgc29sbyBwb3N0IHBvcG9sYXJpXG4gICAgXG4gICAgbGV0IHF1ZXJ5ID0gc3VwYWJhc2VcbiAgICAgIC5mcm9tKCdzb2NpYWxfcG9zdHMnKVxuICAgICAgLnNlbGVjdChgXG4gICAgICAgICosXG4gICAgICAgIHVzZXI6dXNlcl9pZCAoXG4gICAgICAgICAgaWQsIHVzZXJuYW1lLCBmaXJzdF9uYW1lLCBsYXN0X25hbWUsIHByb2ZpbGVfcGljdHVyZVxuICAgICAgICApLFxuICAgICAgICBsaXZlOmxpdmVfaWQgKFxuICAgICAgICAgIGlkLCB0aXRsZSwgc3RhdHVzXG4gICAgICAgIClcbiAgICAgIGApXG4gICAgICAuZXEoJ3N0YXR1cycsICdwdWJsaXNoZWQnKTtcblxuICAgIGlmICh1c2VySWQpIHtcbiAgICAgIC8vIE90dGllbmkgSUQgZGVnbGkgdXRlbnRpIHNlZ3VpdGlcbiAgICAgIGNvbnN0IHsgZGF0YTogZm9sbG93aW5nIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgICAuZnJvbSgnZm9sbG93cycpXG4gICAgICAgIC5zZWxlY3QoJ2ZvbGxvd2luZ19pZCcpXG4gICAgICAgIC5lcSgnZm9sbG93ZXJfaWQnLCB1c2VySWQpO1xuXG4gICAgICBjb25zdCBmb2xsb3dpbmdJZHMgPSBmb2xsb3dpbmc/Lm1hcChmID0+IGYuZm9sbG93aW5nX2lkKSB8fCBbXTtcbiAgICAgIFxuICAgICAgaWYgKGZvbGxvd2luZ0lkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHF1ZXJ5ID0gcXVlcnkuaW4oJ3VzZXJfaWQnLCBmb2xsb3dpbmdJZHMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHsgZGF0YTogcG9zdHMsIGVycm9yIH0gPSBhd2FpdCBxdWVyeVxuICAgICAgLm9yZGVyKCdjcmVhdGVkX2F0JywgeyBhc2NlbmRpbmc6IGZhbHNlIH0pXG4gICAgICAucmFuZ2Uob2Zmc2V0LCBvZmZzZXQgKyBsaW1pdCAtIDEpO1xuXG4gICAgaWYgKGVycm9yKSB0aHJvdyBlcnJvcjtcblxuICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIHBvc3RzOiBwb3N0cyB8fCBbXSB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBwb3N0cyBmZWVkIGVycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgcG9zdHM6IFtdIH07XG4gIH1cbn1cblxuLy8gTGlrZS9Vbmxpa2UgcG9zdFxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRvZ2dsZVBvc3RMaWtlKHBvc3RJZCwgdXNlcklkKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgeyBkYXRhOiBleGlzdGluZyB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKCdwb3N0X2xpa2VzJylcbiAgICAgIC5zZWxlY3QoJ2lkJylcbiAgICAgIC5lcSgncG9zdF9pZCcsIHBvc3RJZClcbiAgICAgIC5lcSgndXNlcl9pZCcsIHVzZXJJZClcbiAgICAgIC5zaW5nbGUoKTtcblxuICAgIGlmIChleGlzdGluZykge1xuICAgICAgLy8gVW5saWtlXG4gICAgICBhd2FpdCBzdXBhYmFzZVxuICAgICAgICAuZnJvbSgncG9zdF9saWtlcycpXG4gICAgICAgIC5kZWxldGUoKVxuICAgICAgICAuZXEoJ3Bvc3RfaWQnLCBwb3N0SWQpXG4gICAgICAgIC5lcSgndXNlcl9pZCcsIHVzZXJJZCk7XG5cbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGFjdGlvbjogJ3VubGlrZWQnIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIExpa2VcbiAgICAgIGF3YWl0IHN1cGFiYXNlXG4gICAgICAgIC5mcm9tKCdwb3N0X2xpa2VzJylcbiAgICAgICAgLmluc2VydCh7IHBvc3RfaWQ6IHBvc3RJZCwgdXNlcl9pZDogdXNlcklkIH0pO1xuXG4gICAgICAvLyBOb3RpZmljYSBsJ2F1dG9yZSBkZWwgcG9zdFxuICAgICAgY29uc3QgeyBkYXRhOiBwb3N0IH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgICAuZnJvbSgnc29jaWFsX3Bvc3RzJylcbiAgICAgICAgLnNlbGVjdCgndXNlcl9pZCcpXG4gICAgICAgIC5lcSgnaWQnLCBwb3N0SWQpXG4gICAgICAgIC5zaW5nbGUoKTtcblxuICAgICAgaWYgKHBvc3QgJiYgcG9zdC51c2VyX2lkICE9PSB1c2VySWQpIHtcbiAgICAgICAgYXdhaXQgY3JlYXRlTm90aWZpY2F0aW9uKHtcbiAgICAgICAgICB1c2VyX2lkOiBwb3N0LnVzZXJfaWQsXG4gICAgICAgICAgYWN0b3JfaWQ6IHVzZXJJZCxcbiAgICAgICAgICB0eXBlOiAnbGlrZScsXG4gICAgICAgICAgdGl0bGU6ICdOdW92byBsaWtlIScsXG4gICAgICAgICAgbWVzc2FnZTogJ0hhIG1lc3NvIGxpa2UgYWwgdHVvIHBvc3QnLFxuICAgICAgICAgIGFjdGlvbl91cmw6IGAvcG9zdC8ke3Bvc3RJZH1gXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246ICdsaWtlZCcgfTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignVG9nZ2xlIGxpa2UgZXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICB9XG59XG5cbi8qKlxuICogPT09IFNUT1JJRVMgU1lTVEVNID09PVxuICovXG5cbi8vIENyZWEgbnVvdmEgc3RvcnlcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVTdG9yeShzdG9yeURhdGEpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IGRhdGE6IHN0b3J5LCBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKCdzdG9yaWVzJylcbiAgICAgIC5pbnNlcnQoe1xuICAgICAgICB1c2VyX2lkOiBzdG9yeURhdGEudXNlcl9pZCxcbiAgICAgICAgbWVkaWFfdXJsOiBzdG9yeURhdGEubWVkaWFfdXJsLFxuICAgICAgICBtZWRpYV90eXBlOiBzdG9yeURhdGEubWVkaWFfdHlwZSB8fCAnaW1hZ2UnLFxuICAgICAgICB0ZXh0X292ZXJsYXk6IHN0b3J5RGF0YS50ZXh0X292ZXJsYXkgfHwgbnVsbCxcbiAgICAgICAgYmFja2dyb3VuZF9jb2xvcjogc3RvcnlEYXRhLmJhY2tncm91bmRfY29sb3IgfHwgJyMwMDAwMDAnXG4gICAgICB9KVxuICAgICAgLnNlbGVjdCgpXG4gICAgICAuc2luZ2xlKCk7XG5cbiAgICBpZiAoZXJyb3IpIHRocm93IGVycm9yO1xuXG4gICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgc3RvcnkgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdDcmVhdGUgc3RvcnkgZXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICB9XG59XG5cbi8vIE90dGllbmkgc3RvcmllcyBhdHRpdmUgZGkgdW4gdXRlbnRlXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0VXNlclN0b3JpZXModXNlcklkKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgeyBkYXRhOiBzdG9yaWVzLCBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKCdzdG9yaWVzJylcbiAgICAgIC5zZWxlY3QoYFxuICAgICAgICAqLFxuICAgICAgICB1c2VyOnVzZXJfaWQgKFxuICAgICAgICAgIGlkLCB1c2VybmFtZSwgZmlyc3RfbmFtZSwgbGFzdF9uYW1lLCBwcm9maWxlX3BpY3R1cmVcbiAgICAgICAgKVxuICAgICAgYClcbiAgICAgIC5lcSgndXNlcl9pZCcsIHVzZXJJZClcbiAgICAgIC5ndCgnZXhwaXJlc19hdCcsIG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSlcbiAgICAgIC5vcmRlcignY3JlYXRlZF9hdCcsIHsgYXNjZW5kaW5nOiBmYWxzZSB9KTtcblxuICAgIGlmIChlcnJvcikgdGhyb3cgZXJyb3I7XG5cbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBzdG9yaWVzOiBzdG9yaWVzIHx8IFtdIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignR2V0IHVzZXIgc3RvcmllcyBlcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIHN0b3JpZXM6IFtdIH07XG4gIH1cbn1cblxuLy8gT3R0aWVuaSBzdG9yaWVzIGRpIHV0ZW50aSBzZWd1aXRpIHBlciBob21lcGFnZVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEZvbGxvd2luZ1N0b3JpZXModXNlcklkKSB7XG4gIHRyeSB7XG4gICAgLy8gT3R0aWVuaSBJRCBkZWdsaSB1dGVudGkgc2VndWl0aVxuICAgIGNvbnN0IHsgZGF0YTogZm9sbG93aW5nIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgLmZyb20oJ2ZvbGxvd3MnKVxuICAgICAgLnNlbGVjdCgnZm9sbG93aW5nX2lkJylcbiAgICAgIC5lcSgnZm9sbG93ZXJfaWQnLCB1c2VySWQpO1xuXG4gICAgY29uc3QgZm9sbG93aW5nSWRzID0gZm9sbG93aW5nPy5tYXAoZiA9PiBmLmZvbGxvd2luZ19pZCkgfHwgW107XG4gICAgXG4gICAgaWYgKGZvbGxvd2luZ0lkcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIHN0b3JpZXM6IFtdIH07XG4gICAgfVxuXG4gICAgY29uc3QgeyBkYXRhOiBzdG9yaWVzLCBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKCdzdG9yaWVzJylcbiAgICAgIC5zZWxlY3QoYFxuICAgICAgICAqLFxuICAgICAgICB1c2VyOnVzZXJfaWQgKFxuICAgICAgICAgIGlkLCB1c2VybmFtZSwgZmlyc3RfbmFtZSwgbGFzdF9uYW1lLCBwcm9maWxlX3BpY3R1cmVcbiAgICAgICAgKVxuICAgICAgYClcbiAgICAgIC5pbigndXNlcl9pZCcsIGZvbGxvd2luZ0lkcylcbiAgICAgIC5ndCgnZXhwaXJlc19hdCcsIG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSlcbiAgICAgIC5vcmRlcignY3JlYXRlZF9hdCcsIHsgYXNjZW5kaW5nOiBmYWxzZSB9KTtcblxuICAgIGlmIChlcnJvcikgdGhyb3cgZXJyb3I7XG5cbiAgICAvLyBSYWdncnVwcGEgcGVyIHV0ZW50ZVxuICAgIGNvbnN0IHN0b3JpZXNCeVVzZXIgPSB7fTtcbiAgICBzdG9yaWVzPy5mb3JFYWNoKHN0b3J5ID0+IHtcbiAgICAgIGlmICghc3Rvcmllc0J5VXNlcltzdG9yeS51c2VyX2lkXSkge1xuICAgICAgICBzdG9yaWVzQnlVc2VyW3N0b3J5LnVzZXJfaWRdID0ge1xuICAgICAgICAgIHVzZXI6IHN0b3J5LnVzZXIsXG4gICAgICAgICAgc3RvcmllczogW11cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHN0b3JpZXNCeVVzZXJbc3RvcnkudXNlcl9pZF0uc3Rvcmllcy5wdXNoKHN0b3J5KTtcbiAgICB9KTtcblxuICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIHN0b3JpZXM6IE9iamVjdC52YWx1ZXMoc3Rvcmllc0J5VXNlcikgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdHZXQgZm9sbG93aW5nIHN0b3JpZXMgZXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBzdG9yaWVzOiBbXSB9O1xuICB9XG59XG5cbi8qKlxuICogPT09IE5PVElGSUNBVElPTlMgU1lTVEVNID09PVxuICovXG5cbi8vIENyZWEgbm90aWZpY2FcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVOb3RpZmljYXRpb24obm90aWZpY2F0aW9uRGF0YSkge1xuICB0cnkge1xuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAuZnJvbSgnbm90aWZpY2F0aW9ucycpXG4gICAgICAuaW5zZXJ0KG5vdGlmaWNhdGlvbkRhdGEpXG4gICAgICAuc2VsZWN0KClcbiAgICAgIC5zaW5nbGUoKTtcblxuICAgIGlmIChlcnJvcikgdGhyb3cgZXJyb3I7XG5cbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBub3RpZmljYXRpb246IGRhdGEgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdDcmVhdGUgbm90aWZpY2F0aW9uIGVycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgfVxufVxuXG4vLyBPdHRpZW5pIG5vdGlmaWNoZSB1dGVudGVcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRVc2VyTm90aWZpY2F0aW9ucyh1c2VySWQsIGxpbWl0ID0gNTAsIHVucmVhZE9ubHkgPSBmYWxzZSkge1xuICB0cnkge1xuICAgIGxldCBxdWVyeSA9IHN1cGFiYXNlXG4gICAgICAuZnJvbSgnbm90aWZpY2F0aW9ucycpXG4gICAgICAuc2VsZWN0KGBcbiAgICAgICAgKixcbiAgICAgICAgYWN0b3I6YWN0b3JfaWQgKFxuICAgICAgICAgIGlkLCB1c2VybmFtZSwgZmlyc3RfbmFtZSwgbGFzdF9uYW1lLCBwcm9maWxlX3BpY3R1cmVcbiAgICAgICAgKVxuICAgICAgYClcbiAgICAgIC5lcSgndXNlcl9pZCcsIHVzZXJJZCk7XG5cbiAgICBpZiAodW5yZWFkT25seSkge1xuICAgICAgcXVlcnkgPSBxdWVyeS5lcSgnaXNfcmVhZCcsIGZhbHNlKTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGRhdGE6IG5vdGlmaWNhdGlvbnMsIGVycm9yIH0gPSBhd2FpdCBxdWVyeVxuICAgICAgLm9yZGVyKCdjcmVhdGVkX2F0JywgeyBhc2NlbmRpbmc6IGZhbHNlIH0pXG4gICAgICAubGltaXQobGltaXQpO1xuXG4gICAgaWYgKGVycm9yKSB0aHJvdyBlcnJvcjtcblxuICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG5vdGlmaWNhdGlvbnM6IG5vdGlmaWNhdGlvbnMgfHwgW10gfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdHZXQgbm90aWZpY2F0aW9ucyBlcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG5vdGlmaWNhdGlvbnM6IFtdIH07XG4gIH1cbn1cblxuLy8gTWFyY2Egbm90aWZpY2EgY29tZSBsZXR0YVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1hcmtOb3RpZmljYXRpb25Bc1JlYWQobm90aWZpY2F0aW9uSWQsIHVzZXJJZCkge1xuICB0cnkge1xuICAgIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAuZnJvbSgnbm90aWZpY2F0aW9ucycpXG4gICAgICAudXBkYXRlKHsgaXNfcmVhZDogdHJ1ZSB9KVxuICAgICAgLmVxKCdpZCcsIG5vdGlmaWNhdGlvbklkKVxuICAgICAgLmVxKCd1c2VyX2lkJywgdXNlcklkKTtcblxuICAgIGlmIChlcnJvcikgdGhyb3cgZXJyb3I7XG5cbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignTWFyayBub3RpZmljYXRpb24gcmVhZCBlcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gIH1cbn1cblxuLy8gQ29udGEgbm90aWZpY2hlIG5vbiBsZXR0ZVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFVucmVhZE5vdGlmaWNhdGlvbnNDb3VudCh1c2VySWQpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IGNvdW50LCBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKCdub3RpZmljYXRpb25zJylcbiAgICAgIC5zZWxlY3QoJyonLCB7IGNvdW50OiAnZXhhY3QnIH0pXG4gICAgICAuZXEoJ3VzZXJfaWQnLCB1c2VySWQpXG4gICAgICAuZXEoJ2lzX3JlYWQnLCBmYWxzZSk7XG5cbiAgICBpZiAoZXJyb3IpIHRocm93IGVycm9yO1xuXG4gICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgY291bnQ6IGNvdW50IHx8IDAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdHZXQgdW5yZWFkIGNvdW50IGVycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgY291bnQ6IDAgfTtcbiAgfVxufVxuXG4vKipcbiAqID09PSBVVElMSVRZIEZVTkNUSU9OUyA9PT1cbiAqL1xuXG4vLyBOb3RpZmljYSBmb2xsb3dlciBkaSBudW92byBwb3N0XG5hc3luYyBmdW5jdGlvbiBub3RpZnlGb2xsb3dlcnNPZk5ld1Bvc3QodXNlcklkLCBwb3N0SWQpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IGRhdGE6IGZvbGxvd2VycyB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKCdmb2xsb3dzJylcbiAgICAgIC5zZWxlY3QoJ2ZvbGxvd2VyX2lkJylcbiAgICAgIC5lcSgnZm9sbG93aW5nX2lkJywgdXNlcklkKTtcblxuICAgIGlmICghZm9sbG93ZXJzIHx8IGZvbGxvd2Vycy5sZW5ndGggPT09IDApIHJldHVybjtcblxuICAgIGNvbnN0IG5vdGlmaWNhdGlvbnMgPSBmb2xsb3dlcnMubWFwKGZvbGxvdyA9PiAoe1xuICAgICAgdXNlcl9pZDogZm9sbG93LmZvbGxvd2VyX2lkLFxuICAgICAgYWN0b3JfaWQ6IHVzZXJJZCxcbiAgICAgIHR5cGU6ICduZXdfcG9zdCcsXG4gICAgICB0aXRsZTogJ051b3ZvIHBvc3QhJyxcbiAgICAgIG1lc3NhZ2U6ICdIYSBwdWJibGljYXRvIHVuIG51b3ZvIHBvc3QnLFxuICAgICAgYWN0aW9uX3VybDogYC9wb3N0LyR7cG9zdElkfWBcbiAgICB9KSk7XG5cbiAgICBhd2FpdCBzdXBhYmFzZVxuICAgICAgLmZyb20oJ25vdGlmaWNhdGlvbnMnKVxuICAgICAgLmluc2VydChub3RpZmljYXRpb25zKTtcblxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ05vdGlmeSBmb2xsb3dlcnMgZXJyb3I6JywgZXJyb3IpO1xuICB9XG59IiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9ydW5uZXIvd29ya3NwYWNlXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9ydW5uZXIvd29ya3NwYWNlL3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3J1bm5lci93b3Jrc3BhY2Uvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgZXhwcmVzcyBmcm9tICdleHByZXNzJztcbmltcG9ydCB7IHNldHVwQVBJIH0gZnJvbSAnLi9zZXJ2ZXIvYXBpLmpzJztcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIHtcbiAgICAgIG5hbWU6ICdhcGktbWlkZGxld2FyZScsXG4gICAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XG4gICAgICAgIGNvbnN0IGFwcCA9IGV4cHJlc3MoKTtcbiAgICAgICAgYXBwLnVzZShleHByZXNzLmpzb24oKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmEgdHV0dGUgbGUgQVBJIHJvdXRlc1xuICAgICAgICBzZXR1cEFQSShhcHApO1xuICAgICAgICBcbiAgICAgICAgLy8gSW50ZWdyYSBuZWwgc2VydmVyIFZpdGUgY29uIGdlc3Rpb25lIGNvcnJldHRhXG4gICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICAgICAgaWYgKHJlcS51cmwuc3RhcnRzV2l0aCgnL2FwaS8nKSkge1xuICAgICAgICAgICAgYXBwKHJlcSwgcmVzLCBuZXh0KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICBdLFxuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiAnMC4wLjAuMCcsXG4gICAgcG9ydDogNTAwMCxcbiAgfVxufSlcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL2hvbWUvcnVubmVyL3dvcmtzcGFjZS9zZXJ2ZXJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL3J1bm5lci93b3Jrc3BhY2Uvc2VydmVyL2FwaS5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9ydW5uZXIvd29ya3NwYWNlL3NlcnZlci9hcGkuanNcIjtpbXBvcnQgcGcgZnJvbSAncGcnO1xuXG4vLyBEYXRhYmFzZSBjb25uZWN0aW9uXG5jb25zdCB7IFBvb2wgfSA9IHBnO1xuY29uc3QgcG9vbCA9IG5ldyBQb29sKHtcbiAgY29ubmVjdGlvblN0cmluZzogcHJvY2Vzcy5lbnYuREFUQUJBU0VfVVJMLFxuICBzc2w6IHByb2Nlc3MuZW52LkRBVEFCQVNFX1VSTC5pbmNsdWRlcygnbmVvbi50ZWNoJykgPyB7IHJlamVjdFVuYXV0aG9yaXplZDogZmFsc2UgfSA6IGZhbHNlXG59KTtcblxuLy8gQVBJIFJvdXRlcyBwZXIgaWwgc2lzdGVtYSB1cGdyYWRlIHZlbmRpdG9yZVxuZXhwb3J0IGZ1bmN0aW9uIHNldHVwQVBJKGFwcCkge1xuICBcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gU09DSUFMIFBPU1RTIEFQSSAtIERJUkVDVCBEQVRBQkFTRSAoQnlwYXNzZXMgU3VwYWJhc2UgY2FjaGUgaXNzdWVzKVxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIC8vIENyZWF0ZSBzb2NpYWwgcG9zdCAtIERJUkVDVCBQb3N0Z3JlU1FMIElOU0VSVFxuICBhcHAucG9zdCgnL2FwaS9zb2NpYWwvcG9zdHMnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc29sZS5sb2coJ1x1RDgzRFx1RENERCBbRElSRUNUIERCXSBDcmVhdGluZyBzb2NpYWwgcG9zdDonLCByZXEuYm9keSk7XG4gICAgICBcbiAgICAgIGNvbnN0IHsgdXNlcl9pZCwgY29udGVudCwgaW1hZ2VzLCBsaXZlX2lkLCB2aXNpYmlsaXR5LCB0YWdzLCBtZW50aW9ucyB9ID0gcmVxLmJvZHk7XG5cbiAgICAgIC8vIERpcmVjdCBQb3N0Z3JlU1FMIElOU0VSVCBieXBhc3NpbmcgU3VwYWJhc2Ugc2NoZW1hIGNhY2hlXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KGBcbiAgICAgICAgSU5TRVJUIElOVE8gc29jaWFsX3Bvc3RzICh1c2VyX2lkLCBjb250ZW50LCBpbWFnZXMsIGxpdmVfaWQsIHZpc2liaWxpdHksIHRhZ3MsIG1lbnRpb25zKVxuICAgICAgICBWQUxVRVMgKCQxLCAkMiwgJDMsICQ0LCAkNSwgJDYsICQ3KVxuICAgICAgICBSRVRVUk5JTkcgKlxuICAgICAgYCwgW1xuICAgICAgICB1c2VyX2lkLFxuICAgICAgICBjb250ZW50IHx8ICcnLFxuICAgICAgICBKU09OLnN0cmluZ2lmeShpbWFnZXMgfHwgW10pLFxuICAgICAgICBsaXZlX2lkIHx8IG51bGwsXG4gICAgICAgIHZpc2liaWxpdHkgfHwgJ3B1YmxpYycsXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KHRhZ3MgfHwgW10pLFxuICAgICAgICBKU09OLnN0cmluZ2lmeShtZW50aW9ucyB8fCBbXSlcbiAgICAgIF0pO1xuXG4gICAgICBjb25zb2xlLmxvZygnXHUyNzA1IFtESVJFQ1QgREJdIFBvc3QgY3JlYXRlZCBzdWNjZXNzZnVsbHk6JywgcmVzdWx0LnJvd3NbMF0uaWQpO1xuICAgICAgcmVzLmpzb24oeyBzdWNjZXNzOiB0cnVlLCBwb3N0OiByZXN1bHQucm93c1swXSB9KTtcblxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdcdTI3NEMgW0RJUkVDVCBEQl0gQ3JlYXRlIHNvY2lhbCBwb3N0IGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gR2V0IHVzZXIgc29jaWFsIHBvc3RzXG4gIGFwcC5nZXQoJy9hcGkvc29jaWFsL3Bvc3RzLzp1c2VySWQnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyB1c2VySWQgfSA9IHJlcS5wYXJhbXM7XG4gICAgICBjb25zdCBsaW1pdCA9IHBhcnNlSW50KHJlcS5xdWVyeS5saW1pdCkgfHwgMjA7XG4gICAgICBjb25zdCBvZmZzZXQgPSBwYXJzZUludChyZXEucXVlcnkub2Zmc2V0KSB8fCAwO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KGBcbiAgICAgICAgU0VMRUNUIHNwLiosIFxuICAgICAgICAgICAgICAgcC51c2VybmFtZSwgcC5maXJzdF9uYW1lLCBwLmxhc3RfbmFtZSwgcC5wcm9maWxlX3BpY3R1cmVcbiAgICAgICAgRlJPTSBzb2NpYWxfcG9zdHMgc3BcbiAgICAgICAgTEVGVCBKT0lOIHByb2ZpbGVzIHAgT04gc3AudXNlcl9pZCA9IHAuaWRcbiAgICAgICAgV0hFUkUgc3AudXNlcl9pZCA9ICQxIEFORCAoc3Auc3RhdHVzIElTIE5VTEwgT1Igc3Auc3RhdHVzICE9ICdkZWxldGVkJylcbiAgICAgICAgT1JERVIgQlkgc3AuY3JlYXRlZF9hdCBERVNDXG4gICAgICAgIExJTUlUICQyIE9GRlNFVCAkM1xuICAgICAgYCwgW3VzZXJJZCwgbGltaXQsIG9mZnNldF0pO1xuXG4gICAgICByZXMuanNvbih7IHN1Y2Nlc3M6IHRydWUsIHBvc3RzOiByZXN1bHQucm93cyB9KTtcblxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdHZXQgdXNlciBwb3N0cyBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICB9XG4gIH0pO1xuICBcbiAgLy8gR2V0IHByb2ZpbGUgYnkgSURcbiAgYXBwLmdldCgnL2FwaS9wcm9maWxlcy86aWQnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBpZCB9ID0gcmVxLnBhcmFtcztcbiAgICAgIFxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeShcbiAgICAgICAgJ1NFTEVDVCAqIEZST00gcHJvZmlsZXMgV0hFUkUgaWQgPSAkMScsXG4gICAgICAgIFtpZF1cbiAgICAgICk7XG4gICAgICBcbiAgICAgIGlmIChyZXN1bHQucm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDA0KS5qc29uKHsgZXJyb3I6ICdQcm9maWxvIG5vbiB0cm92YXRvJyB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgcmVzLmpzb24ocmVzdWx0LnJvd3NbMF0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdHZXQgcHJvZmlsZSBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIHJlY3VwZXJvIHByb2ZpbG8nIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gR2V0IHNlbGxlciBieSB1c2VyX2lkICBcbiAgYXBwLmdldCgnL2FwaS9zZWxsZXJzL3VzZXIvOnVzZXJJZCcsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IHVzZXJJZCB9ID0gcmVxLnBhcmFtcztcbiAgICAgIFxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeShcbiAgICAgICAgJ1NFTEVDVCBpZCwgdXNlcl9pZCwgaGFuZGxlLCBkaXNwbGF5X25hbWUsIGF2YXRhcl91cmwgRlJPTSBzZWxsZXJzIFdIRVJFIHVzZXJfaWQgPSAkMScsXG4gICAgICAgIFt1c2VySWRdXG4gICAgICApO1xuICAgICAgXG4gICAgICBpZiAocmVzdWx0LnJvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwNCkuanNvbih7IGVycm9yOiAnU2VsbGVyIG5vdCBmb3VuZCcgfSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHJlc3VsdC5yb3dzWzBdKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignR2V0IHNlbGxlciBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIHJlY3VwZXJvIHNlbGxlcicgfSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBTZWFyY2ggc2VsbGVycyBBUEkgZW5kcG9pbnQgZm9yIHJlYWwtdGltZSBzZWFyY2hcbiAgYXBwLmdldCgnL2FwaS9zZWxsZXJzL3NlYXJjaCcsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IHEgfSA9IHJlcS5xdWVyeTtcbiAgICAgIFxuICAgICAgaWYgKCFxIHx8IHEubGVuZ3RoIDwgMSkge1xuICAgICAgICByZXR1cm4gcmVzLmpzb24oW10pO1xuICAgICAgfVxuICAgICAgXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KGBcbiAgICAgICAgU0VMRUNUIFxuICAgICAgICAgIHMuaWQsIFxuICAgICAgICAgIHMuaGFuZGxlLCBcbiAgICAgICAgICBzLmRpc3BsYXlfbmFtZSwgXG4gICAgICAgICAgcy5hdmF0YXJfdXJsLCBcbiAgICAgICAgICBzLmJpbyxcbiAgICAgICAgICBzLmZvbGxvd2VycyxcbiAgICAgICAgICBwLnByb2ZpbGVfcGljdHVyZSxcbiAgICAgICAgICBwLmZpcnN0X25hbWUsXG4gICAgICAgICAgcC5sYXN0X25hbWVcbiAgICAgICAgRlJPTSBzZWxsZXJzIHNcbiAgICAgICAgTEVGVCBKT0lOIHByb2ZpbGVzIHAgT04gcy51c2VyX2lkID0gcC5pZFxuICAgICAgICBXSEVSRSBcbiAgICAgICAgICBzLmRpc3BsYXlfbmFtZSBJTElLRSAkMSBPUiBcbiAgICAgICAgICBzLmhhbmRsZSBJTElLRSAkMSBPUiBcbiAgICAgICAgICBzLmJpbyBJTElLRSAkMSBPUlxuICAgICAgICAgIHAuZmlyc3RfbmFtZSBJTElLRSAkMSBPUlxuICAgICAgICAgIHAubGFzdF9uYW1lIElMSUtFICQxXG4gICAgICAgIE9SREVSIEJZIHMuZm9sbG93ZXJzIERFU0MsIHMuZGlzcGxheV9uYW1lIEFTQ1xuICAgICAgICBMSU1JVCA4XG4gICAgICBgLCBbYCUke3F9JWBdKTtcbiAgICAgIFxuICAgICAgcmVzLmpzb24ocmVzdWx0LnJvd3MpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdTZWFyY2ggc2VsbGVycyBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIHJpY2VyY2EgdmVuZGl0b3JpJyB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEFkdmFuY2VkIHNlYXJjaCBBUEkgZW5kcG9pbnQgd2l0aCBmaWx0ZXJzXG4gIGFwcC5nZXQoJy9hcGkvc2VhcmNoL2FkdmFuY2VkJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgcSA9ICcnLFxuICAgICAgICBjYXRlZ29yeSA9ICcnLFxuICAgICAgICBwcmljZVJhbmdlID0gJycsXG4gICAgICAgIGxvY2F0aW9uID0gJycsXG4gICAgICAgIG1pblJhdGluZyA9IDAsXG4gICAgICAgIGhhc0xpdmVBY3RpdmUgPSAnZmFsc2UnLFxuICAgICAgICBvbmx5VmVyaWZpZWQgPSAnZmFsc2UnLFxuICAgICAgICBzb3J0QnkgPSAncmVsZXZhbmNlJyxcbiAgICAgICAgcGFnZSA9IDEsXG4gICAgICAgIGxpbWl0ID0gMjBcbiAgICAgIH0gPSByZXEucXVlcnk7XG5cbiAgICAgIGNvbnN0IG9mZnNldCA9IChwYXJzZUludChwYWdlKSAtIDEpICogcGFyc2VJbnQobGltaXQpO1xuICAgICAgY29uc3Qgc2VhcmNoVGVybSA9IGAlJHtxfSVgO1xuXG4gICAgICBsZXQgYmFzZVF1ZXJ5ID0gYFxuICAgICAgICBTRUxFQ1QgRElTVElOQ1RcbiAgICAgICAgICBzLmlkLFxuICAgICAgICAgIHMuaGFuZGxlLFxuICAgICAgICAgIHMuZGlzcGxheV9uYW1lLFxuICAgICAgICAgIHMuYXZhdGFyX3VybCxcbiAgICAgICAgICBzLmJpbyxcbiAgICAgICAgICBzLmNhdGVnb3J5LFxuICAgICAgICAgIHMuY3JlYXRlZF9hdCxcbiAgICAgICAgICBwLnByb2ZpbGVfcGljdHVyZSxcbiAgICAgICAgICBwLmZpcnN0X25hbWUsXG4gICAgICAgICAgcC5sYXN0X25hbWUsXG4gICAgICAgICAgQ0FTRSBXSEVOIGwuaWQgSVMgTk9UIE5VTEwgVEhFTiB0cnVlIEVMU0UgZmFsc2UgRU5EIGFzIGxpdmVfYWN0aXZlLFxuICAgICAgICAgIENPQUxFU0NFKGwudmlld2VycywgMCkgYXMgY3VycmVudF92aWV3ZXJzLFxuICAgICAgICAgIDAgYXMgZm9sbG93ZXJzLFxuICAgICAgICAgIGZhbHNlIGFzIHZlcmlmaWVkLFxuICAgICAgICAgIDAgYXMgcmF0aW5nXG4gICAgICAgIEZST00gc2VsbGVycyBzXG4gICAgICAgIExFRlQgSk9JTiBwcm9maWxlcyBwIE9OIHMudXNlcl9pZCA9IHAuaWRcbiAgICAgICAgTEVGVCBKT0lOIGxpdmVzIGwgT04gcy5pZCA9IGwuc2VsbGVyX2lkIEFORCBsLnN0YXR1cyA9ICdsaXZlJ1xuICAgICAgYDtcblxuICAgICAgY29uc3QgY29uZGl0aW9ucyA9IFtdO1xuICAgICAgY29uc3QgcGFyYW1zID0gW107XG4gICAgICBsZXQgcGFyYW1Db3VudCA9IDA7XG5cbiAgICAgIC8vIFRleHQgc2VhcmNoXG4gICAgICBpZiAocSAmJiBxLnRyaW0oKSkge1xuICAgICAgICBwYXJhbUNvdW50Kys7XG4gICAgICAgIGNvbmRpdGlvbnMucHVzaChgKFxuICAgICAgICAgIHMuZGlzcGxheV9uYW1lIElMSUtFICQke3BhcmFtQ291bnR9IE9SIFxuICAgICAgICAgIHMuaGFuZGxlIElMSUtFICQke3BhcmFtQ291bnR9IE9SIFxuICAgICAgICAgIHMuYmlvIElMSUtFICQke3BhcmFtQ291bnR9IE9SXG4gICAgICAgICAgcC5maXJzdF9uYW1lIElMSUtFICQke3BhcmFtQ291bnR9IE9SXG4gICAgICAgICAgcC5sYXN0X25hbWUgSUxJS0UgJCR7cGFyYW1Db3VudH1cbiAgICAgICAgKWApO1xuICAgICAgICBwYXJhbXMucHVzaChzZWFyY2hUZXJtKTtcbiAgICAgIH1cblxuICAgICAgLy8gQ2F0ZWdvcnkgZmlsdGVyXG4gICAgICBpZiAoY2F0ZWdvcnkpIHtcbiAgICAgICAgcGFyYW1Db3VudCsrO1xuICAgICAgICBjb25kaXRpb25zLnB1c2goYHMuY2F0ZWdvcnkgSUxJS0UgJCR7cGFyYW1Db3VudH1gKTtcbiAgICAgICAgcGFyYW1zLnB1c2goYCUke2NhdGVnb3J5fSVgKTtcbiAgICAgIH1cblxuICAgICAgLy8gTm90ZTogbG9jYXRpb24gYW5kIHJhdGluZyBmaWx0ZXJzIG9taXR0ZWQgc2luY2UgY29sdW1ucyBkb24ndCBleGlzdFxuICAgICAgLy8gVGhlc2UgY2FuIGJlIGFkZGVkIGxhdGVyIHdoZW4gdGhlIGRhdGFiYXNlIHNjaGVtYSBpcyBleHRlbmRlZFxuXG4gICAgICAvLyBMaXZlIGFjdGl2ZSBmaWx0ZXJcbiAgICAgIGlmIChoYXNMaXZlQWN0aXZlID09PSAndHJ1ZScpIHtcbiAgICAgICAgY29uZGl0aW9ucy5wdXNoKGBsLmlkIElTIE5PVCBOVUxMYCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFZlcmlmaWVkIGZpbHRlclxuICAgICAgaWYgKG9ubHlWZXJpZmllZCA9PT0gJ3RydWUnKSB7XG4gICAgICAgIGNvbmRpdGlvbnMucHVzaChgcy52ZXJpZmllZCA9IHRydWVgKTtcbiAgICAgIH1cblxuICAgICAgLy8gUHJpY2UgcmFuZ2UgZmlsdGVyIChiYXNlZCBvbiBhdmVyYWdlIGl0ZW0gcHJpY2VzKVxuICAgICAgaWYgKHByaWNlUmFuZ2UpIHtcbiAgICAgICAgaWYgKHByaWNlUmFuZ2UgPT09ICcwLTUwJykge1xuICAgICAgICAgIGNvbmRpdGlvbnMucHVzaChgcy5hdmdfaXRlbV9wcmljZSA8PSA1MGApO1xuICAgICAgICB9IGVsc2UgaWYgKHByaWNlUmFuZ2UgPT09ICc1MC0xMDAnKSB7XG4gICAgICAgICAgY29uZGl0aW9ucy5wdXNoKGBzLmF2Z19pdGVtX3ByaWNlIEJFVFdFRU4gNTAgQU5EIDEwMGApO1xuICAgICAgICB9IGVsc2UgaWYgKHByaWNlUmFuZ2UgPT09ICcxMDAtMjUwJykge1xuICAgICAgICAgIGNvbmRpdGlvbnMucHVzaChgcy5hdmdfaXRlbV9wcmljZSBCRVRXRUVOIDEwMCBBTkQgMjUwYCk7XG4gICAgICAgIH0gZWxzZSBpZiAocHJpY2VSYW5nZSA9PT0gJzI1MC01MDAnKSB7XG4gICAgICAgICAgY29uZGl0aW9ucy5wdXNoKGBzLmF2Z19pdGVtX3ByaWNlIEJFVFdFRU4gMjUwIEFORCA1MDBgKTtcbiAgICAgICAgfSBlbHNlIGlmIChwcmljZVJhbmdlID09PSAnNTAwKycpIHtcbiAgICAgICAgICBjb25kaXRpb25zLnB1c2goYHMuYXZnX2l0ZW1fcHJpY2UgPiA1MDBgKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBCdWlsZCBXSEVSRSBjbGF1c2VcbiAgICAgIGlmIChjb25kaXRpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgYmFzZVF1ZXJ5ICs9IGAgV0hFUkUgJHtjb25kaXRpb25zLmpvaW4oJyBBTkQgJyl9YDtcbiAgICAgIH1cblxuICAgICAgLy8gT3JkZXIgYnlcbiAgICAgIGxldCBvcmRlckNsYXVzZSA9ICcnO1xuICAgICAgc3dpdGNoIChzb3J0QnkpIHtcbiAgICAgICAgY2FzZSAnZm9sbG93ZXJzJzpcbiAgICAgICAgICBvcmRlckNsYXVzZSA9ICdPUkRFUiBCWSBzLmRpc3BsYXlfbmFtZSBBU0MnO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdyYXRpbmcnOlxuICAgICAgICAgIG9yZGVyQ2xhdXNlID0gJ09SREVSIEJZIHMuZGlzcGxheV9uYW1lIEFTQyc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3JlY2VudCc6XG4gICAgICAgICAgb3JkZXJDbGF1c2UgPSAnT1JERVIgQlkgcy5jcmVhdGVkX2F0IERFU0MnO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdsaXZlX2FjdGl2ZSc6XG4gICAgICAgICAgb3JkZXJDbGF1c2UgPSAnT1JERVIgQlkgbGl2ZV9hY3RpdmUgREVTQywgQ09BTEVTQ0UobC52aWV3ZXJzLCAwKSBERVNDLCBzLmRpc3BsYXlfbmFtZSBBU0MnO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OiAvLyByZWxldmFuY2VcbiAgICAgICAgICBvcmRlckNsYXVzZSA9ICdPUkRFUiBCWSBzLmRpc3BsYXlfbmFtZSBBU0MnO1xuICAgICAgfVxuXG4gICAgICBiYXNlUXVlcnkgKz0gYCAke29yZGVyQ2xhdXNlfWA7XG5cbiAgICAgIC8vIEFkZCBwYWdpbmF0aW9uXG4gICAgICBwYXJhbUNvdW50Kys7XG4gICAgICBiYXNlUXVlcnkgKz0gYCBMSU1JVCAkJHtwYXJhbUNvdW50fWA7XG4gICAgICBwYXJhbXMucHVzaChwYXJzZUludChsaW1pdCkpO1xuICAgICAgXG4gICAgICBwYXJhbUNvdW50Kys7XG4gICAgICBiYXNlUXVlcnkgKz0gYCBPRkZTRVQgJCR7cGFyYW1Db3VudH1gO1xuICAgICAgcGFyYW1zLnB1c2gob2Zmc2V0KTtcblxuICAgICAgY29uc29sZS5sb2coJ0FkdmFuY2VkIHNlYXJjaCBxdWVyeTonLCBiYXNlUXVlcnkpO1xuICAgICAgY29uc29sZS5sb2coJ1BhcmFtZXRlcnM6JywgcGFyYW1zKTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeShiYXNlUXVlcnksIHBhcmFtcyk7XG5cbiAgICAgIC8vIENoZWNrIGlmIHRoZXJlIGFyZSBtb3JlIHJlc3VsdHNcbiAgICAgIGNvbnN0IGNvdW50UXVlcnkgPSBiYXNlUXVlcnkucmVwbGFjZSgvU0VMRUNUIERJU1RJTkNUW1xcc1xcU10qP0ZST00vLCAnU0VMRUNUIENPVU5UKERJU1RJTkNUIHMuaWQpIEZST00nKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL09SREVSIEJZW1xcc1xcU10qJC8sICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL0xJTUlUW1xcc1xcU10qJC8sICcnKTtcbiAgICAgIFxuICAgICAgY29uc3QgY291bnRSZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KGNvdW50UXVlcnksIHBhcmFtcy5zbGljZSgwLCAtMikpOyAvLyBSZW1vdmUgTElNSVQgYW5kIE9GRlNFVCBwYXJhbXNcbiAgICAgIGNvbnN0IHRvdGFsQ291bnQgPSBwYXJzZUludChjb3VudFJlc3VsdC5yb3dzWzBdLmNvdW50KTtcbiAgICAgIGNvbnN0IGhhc01vcmUgPSBvZmZzZXQgKyBwYXJzZUludChsaW1pdCkgPCB0b3RhbENvdW50O1xuXG4gICAgICByZXMuanNvbih7XG4gICAgICAgIHJlc3VsdHM6IHJlc3VsdC5yb3dzLFxuICAgICAgICBoYXNNb3JlLFxuICAgICAgICB0b3RhbENvdW50LFxuICAgICAgICBwYWdlOiBwYXJzZUludChwYWdlKSxcbiAgICAgICAgbGltaXQ6IHBhcnNlSW50KGxpbWl0KVxuICAgICAgfSk7XG5cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignQWR2YW5jZWQgc2VhcmNoIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdFcnJvcmUgcmljZXJjYSBhdmFuemF0YScgfSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBHZXQgc2VsbGVyIGJ5IGhhbmRsZVxuICBhcHAuZ2V0KCcvYXBpL3NlbGxlcnMvaGFuZGxlLzpoYW5kbGUnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBoYW5kbGUgfSA9IHJlcS5wYXJhbXM7XG4gICAgICBcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBvb2wucXVlcnkoXG4gICAgICAgICdTRUxFQ1QgaWQsIHVzZXJfaWQsIGhhbmRsZSwgZGlzcGxheV9uYW1lLCBhdmF0YXJfdXJsIEZST00gc2VsbGVycyBXSEVSRSBoYW5kbGUgPSAkMScsXG4gICAgICAgIFtoYW5kbGVdXG4gICAgICApO1xuICAgICAgXG4gICAgICBpZiAocmVzdWx0LnJvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwNCkuanNvbih7IGVycm9yOiAnU2VsbGVyIG5vdCBmb3VuZCcgfSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHJlc3VsdC5yb3dzWzBdKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignR2V0IHNlbGxlciBieSBoYW5kbGUgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogJ0Vycm9yZSByZWN1cGVybyBzZWxsZXInIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gRU5EUE9JTlQgREVESUNBVE8gUEVSIFVQR1JBREUgQSBWRU5ESVRPUkVcbiAgYXBwLnBvc3QoJy9hcGkvcHJvZmlsZXMvdXBncmFkZScsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IHVzZXJJZCwgLi4uZGF0YSB9ID0gcmVxLmJvZHk7XG4gICAgICBcbiAgICAgIGNvbnNvbGUubG9nKCdcdUQ4M0RcdUREMjUgVVBHUkFERSBSRVFVRVNUIEFQSSBWSVRFOicsIHsgdXNlcklkLCBkYXRhIH0pO1xuICAgICAgXG4gICAgICAvLyAxLiBVUFNFUlQgU0lDVVJPIC0gRlVOWklPTkEgU0VNUFJFIChDUkVBIE8gQUdHSU9STkEpXG4gICAgICBjb25zdCBwcm9maWxlVXBzZXJ0UXVlcnkgPSBgXG4gICAgICAgIElOU0VSVCBJTlRPIHByb2ZpbGVzIChcbiAgICAgICAgICBpZCwgZW1haWwsIHJvbGUsIHN0b3JlX25hbWUsIGNhdGVnb3J5LCBpYmFuLCBwaG9uZSxcbiAgICAgICAgICBzaGlwcGluZ19hZGRyZXNzLCBzaGlwcGluZ19jaXR5LCBzaGlwcGluZ19wb3N0YWxfY29kZSwgXG4gICAgICAgICAgc2hpcHBpbmdfY291bnRyeSwgcHJvZmlsZV9jb21wbGV0ZWRcbiAgICAgICAgKSBWQUxVRVMgKFxuICAgICAgICAgICQxLCAkMiwgJ3NlbGxlcicsICQzLCAkNCwgJDUsICQ2LCAkNywgJDgsICQ5LCAkMTAsIHRydWVcbiAgICAgICAgKVxuICAgICAgICBPTiBDT05GTElDVCAoaWQpIERPIFVQREFURSBTRVRcbiAgICAgICAgICByb2xlID0gJ3NlbGxlcicsXG4gICAgICAgICAgc3RvcmVfbmFtZSA9IEVYQ0xVREVELnN0b3JlX25hbWUsXG4gICAgICAgICAgY2F0ZWdvcnkgPSBFWENMVURFRC5jYXRlZ29yeSxcbiAgICAgICAgICBpYmFuID0gRVhDTFVERUQuaWJhbixcbiAgICAgICAgICBwaG9uZSA9IEVYQ0xVREVELnBob25lLFxuICAgICAgICAgIHNoaXBwaW5nX2FkZHJlc3MgPSBFWENMVURFRC5zaGlwcGluZ19hZGRyZXNzLFxuICAgICAgICAgIHNoaXBwaW5nX2NpdHkgPSBFWENMVURFRC5zaGlwcGluZ19jaXR5LFxuICAgICAgICAgIHNoaXBwaW5nX3Bvc3RhbF9jb2RlID0gRVhDTFVERUQuc2hpcHBpbmdfcG9zdGFsX2NvZGUsXG4gICAgICAgICAgc2hpcHBpbmdfY291bnRyeSA9IEVYQ0xVREVELnNoaXBwaW5nX2NvdW50cnksXG4gICAgICAgICAgcHJvZmlsZV9jb21wbGV0ZWQgPSB0cnVlXG4gICAgICAgIFJFVFVSTklORyAqXG4gICAgICBgO1xuICAgICAgXG4gICAgICBjb25zdCBwcm9maWxlUmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeShwcm9maWxlVXBzZXJ0UXVlcnksIFtcbiAgICAgICAgdXNlcklkLFxuICAgICAgICBkYXRhLmJ1c2luZXNzX2VtYWlsIHx8IGB1c2VyLSR7dXNlcklkfUBiaWRsaS5saXZlYCxcbiAgICAgICAgZGF0YS5zdG9yZV9uYW1lIHx8ICcnLFxuICAgICAgICBkYXRhLmNhdGVnb3J5IHx8ICcnLFxuICAgICAgICBkYXRhLmliYW4gfHwgJycsXG4gICAgICAgIGRhdGEucGhvbmUgfHwgJycsXG4gICAgICAgIGRhdGEuc2hpcHBpbmdfYWRkcmVzcyB8fCAnJyxcbiAgICAgICAgZGF0YS5zaGlwcGluZ19jaXR5IHx8ICcnLFxuICAgICAgICBkYXRhLnNoaXBwaW5nX3Bvc3RhbF9jb2RlIHx8ICcnLFxuICAgICAgICBkYXRhLnNoaXBwaW5nX2NvdW50cnkgfHwgJ0l0YWx5J1xuICAgICAgXSk7XG4gICAgICBcbiAgICAgIGNvbnNvbGUubG9nKCdcdTI3MDUgUFJPRklMTyBBR0dJT1JOQVRPIEEgU0VMTEVSIChWSVRFKTonLCBwcm9maWxlUmVzdWx0LnJvd3NbMF0pO1xuICAgICAgXG4gICAgICAvLyAyLiBDcmVhIHJlY29yZCB2ZW5kaXRvcmUgc2Ugbm9uIGVzaXN0ZVxuICAgICAgY29uc3QgaGFuZGxlID0gKGRhdGEuc3RvcmVfbmFtZSB8fCAnc2VsbGVyJykudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bXmEtejAtOV0vZywgJ18nKSArICdfJyArIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA1KTtcbiAgICAgIFxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3Qgc2VsbGVySW5zZXJ0UXVlcnkgPSBgXG4gICAgICAgICAgSU5TRVJUIElOVE8gc2VsbGVycyAoXG4gICAgICAgICAgICB1c2VyX2lkLCBoYW5kbGUsIGRpc3BsYXlfbmFtZSwgc3RvcmVfbmFtZSwgYmlvLCBpYmFuLFxuICAgICAgICAgICAgY2F0ZWdvcnksIHNoaXBwaW5nX2FkZHJlc3MsIHNoaXBwaW5nX2NpdHksIHNoaXBwaW5nX3Bvc3RhbF9jb2RlLFxuICAgICAgICAgICAgc2hpcHBpbmdfY291bnRyeSwgcGhvbmUsIGJ1c2luZXNzX2VtYWlsLCBwcm9maWxlX2NvbXBsZXRlZFxuICAgICAgICAgICkgVkFMVUVTIChcbiAgICAgICAgICAgICQxLCAkMiwgJDMsICQ0LCAkNSwgJDYsICQ3LCAkOCwgJDksICQxMCwgJDExLCAkMTIsICQxMywgJDE0XG4gICAgICAgICAgKSBcbiAgICAgICAgICBPTiBDT05GTElDVCAodXNlcl9pZCkgRE8gVVBEQVRFIFNFVFxuICAgICAgICAgICAgaGFuZGxlID0gRVhDTFVERUQuaGFuZGxlLFxuICAgICAgICAgICAgZGlzcGxheV9uYW1lID0gRVhDTFVERUQuZGlzcGxheV9uYW1lLFxuICAgICAgICAgICAgc3RvcmVfbmFtZSA9IEVYQ0xVREVELnN0b3JlX25hbWUsXG4gICAgICAgICAgICBiaW8gPSBFWENMVURFRC5iaW8sXG4gICAgICAgICAgICBpYmFuID0gRVhDTFVERUQuaWJhbixcbiAgICAgICAgICAgIGNhdGVnb3J5ID0gRVhDTFVERUQuY2F0ZWdvcnksXG4gICAgICAgICAgICBzaGlwcGluZ19hZGRyZXNzID0gRVhDTFVERUQuc2hpcHBpbmdfYWRkcmVzcyxcbiAgICAgICAgICAgIHNoaXBwaW5nX2NpdHkgPSBFWENMVURFRC5zaGlwcGluZ19jaXR5LFxuICAgICAgICAgICAgc2hpcHBpbmdfcG9zdGFsX2NvZGUgPSBFWENMVURFRC5zaGlwcGluZ19wb3N0YWxfY29kZSxcbiAgICAgICAgICAgIHNoaXBwaW5nX2NvdW50cnkgPSBFWENMVURFRC5zaGlwcGluZ19jb3VudHJ5LFxuICAgICAgICAgICAgcGhvbmUgPSBFWENMVURFRC5waG9uZSxcbiAgICAgICAgICAgIGJ1c2luZXNzX2VtYWlsID0gRVhDTFVERUQuYnVzaW5lc3NfZW1haWwsXG4gICAgICAgICAgICBwcm9maWxlX2NvbXBsZXRlZCA9IEVYQ0xVREVELnByb2ZpbGVfY29tcGxldGVkXG4gICAgICAgICAgUkVUVVJOSU5HICpcbiAgICAgICAgYDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNlbGxlclJlc3VsdCA9IGF3YWl0IHBvb2wucXVlcnkoc2VsbGVySW5zZXJ0UXVlcnksIFtcbiAgICAgICAgICB1c2VySWQsXG4gICAgICAgICAgaGFuZGxlLFxuICAgICAgICAgIGRhdGEuc3RvcmVfbmFtZSxcbiAgICAgICAgICBkYXRhLnN0b3JlX25hbWUsXG4gICAgICAgICAgZGF0YS5zdG9yZV9kZXNjcmlwdGlvbiB8fCAnJyxcbiAgICAgICAgICBkYXRhLmliYW4sXG4gICAgICAgICAgZGF0YS5jYXRlZ29yeSxcbiAgICAgICAgICBkYXRhLnNoaXBwaW5nX2FkZHJlc3MsXG4gICAgICAgICAgZGF0YS5zaGlwcGluZ19jaXR5LFxuICAgICAgICAgIGRhdGEuc2hpcHBpbmdfcG9zdGFsX2NvZGUsXG4gICAgICAgICAgZGF0YS5zaGlwcGluZ19jb3VudHJ5IHx8ICdJdGFseScsXG4gICAgICAgICAgZGF0YS5waG9uZSxcbiAgICAgICAgICBkYXRhLmJ1c2luZXNzX2VtYWlsLFxuICAgICAgICAgIHRydWVcbiAgICAgICAgXSk7XG4gICAgICAgIFxuICAgICAgICBjb25zb2xlLmxvZygnXHUyNzA1IFNFTExFUiBDUkVBVE8vQUdHSU9STkFUTyAoVklURSk6Jywgc2VsbGVyUmVzdWx0LnJvd3NbMF0pO1xuICAgICAgICBcbiAgICAgICAgcmVzLmpzb24oeyBcbiAgICAgICAgICBzdWNjZXNzOiB0cnVlLCBcbiAgICAgICAgICBwcm9maWxlOiBwcm9maWxlUmVzdWx0LnJvd3NbMF0sXG4gICAgICAgICAgc2VsbGVyOiBzZWxsZXJSZXN1bHQucm93c1swXSxcbiAgICAgICAgICBtZXNzYWdlOiAnVXBncmFkZSBhIHZlbmRpdG9yZSBjb21wbGV0YXRvIGNvbiBzdWNjZXNzbyEnIFxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICB9IGNhdGNoIChzZWxsZXJFcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvcmUgY3JlYXppb25lIHNlbGxlcjonLCBzZWxsZXJFcnJvcik7XG4gICAgICAgIC8vIEFuY2hlIHNlIGlsIHNlbGxlciBmYWxsaXNjZSwgaWwgcHJvZmlsbyBcdTAwRTggc3RhdG8gYWdnaW9ybmF0b1xuICAgICAgICByZXMuanNvbih7IFxuICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsIFxuICAgICAgICAgIHByb2ZpbGU6IHByb2ZpbGVSZXN1bHQucm93c1swXSxcbiAgICAgICAgICBtZXNzYWdlOiAnVXBncmFkZSBjb21wbGV0YXRvISBQcm9maWxvIHZlbmRpdG9yZSBzYXJcdTAwRTAgY3JlYXRvIGF1dG9tYXRpY2FtZW50ZS4nIFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdcdTI3NEMgRVJST1JFIFVQR1JBREUgKFZJVEUpOicsIGVycm9yLm1lc3NhZ2UpO1xuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGVycm9yOiAnRXJyb3JlIGR1cmFudGUgdXBncmFkZSBhIHZlbmRpdG9yZScsXG4gICAgICAgIGRldGFpbHM6IGVycm9yLm1lc3NhZ2UgXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEdFVCBMSVZFIEJZIElEXG4gIGFwcC5nZXQoJy9hcGkvbGl2ZXMvOmlkJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgaWQgfSA9IHJlcS5wYXJhbXM7XG4gICAgICBcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBvb2wucXVlcnkoXG4gICAgICAgICdTRUxFQ1QgbC4qLCBzLnVzZXJfaWQgYXMgc2VsbGVyX3VzZXJfaWQsIHMuZGlzcGxheV9uYW1lIGFzIHNlbGxlcl9kaXNwbGF5X25hbWUsIHMuaGFuZGxlIGFzIHNlbGxlcl9oYW5kbGUsIHMuYXZhdGFyX3VybCBhcyBzZWxsZXJfYXZhdGFyX3VybCBGUk9NIGxpdmVzIGwgTEVGVCBKT0lOIHNlbGxlcnMgcyBPTiBsLnNlbGxlcl9pZCA9IHMuaWQgV0hFUkUgbC5pZCA9ICQxJyxcbiAgICAgICAgW2lkXVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgaWYgKHJlc3VsdC5yb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDQpLmpzb24oeyBlcnJvcjogJ0xpdmUgbm90IGZvdW5kJyB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgcmVzLmpzb24ocmVzdWx0LnJvd3NbMF0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdHZXQgbGl2ZSBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIHJlY3VwZXJvIGxpdmUnIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gQ1JFQVRFIExJVkUgTE9UIChBREQgUFJPRFVDVCBUTyBMSVZFKVxuICBhcHAucG9zdCgnL2FwaS9saXZlLWxvdHMnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBsaXZlX2lkLCB0aXRsZSwgc3RhcnRfcHJpY2UsIHN0YXR1cyA9ICdxdWV1ZWQnLCBpbWFnZV91cmwsIGJ1eV9ub3dfcHJpY2UsIG1pbl9iaWRfaW5jcmVtZW50IH0gPSByZXEuYm9keTtcbiAgICAgIFxuICAgICAgaWYgKCFsaXZlX2lkIHx8ICF0aXRsZSB8fCAhc3RhcnRfcHJpY2UpIHtcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKHsgZXJyb3I6ICdsaXZlX2lkLCB0aXRsZSBlIHN0YXJ0X3ByaWNlIHNvbm8gcmljaGllc3RpJyB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeShcbiAgICAgICAgJ0lOU0VSVCBJTlRPIGxpdmVfbG90cyAobGl2ZV9pZCwgdGl0bGUsIHN0YXJ0X3ByaWNlLCBzdGF0dXMsIGltYWdlX3VybCwgYnV5X25vd19wcmljZSwgbWluX2JpZF9pbmNyZW1lbnQpIFZBTFVFUyAoJDEsICQyLCAkMywgJDQsICQ1LCAkNiwgJDcpIFJFVFVSTklORyAqJyxcbiAgICAgICAgW2xpdmVfaWQsIHRpdGxlLCBwYXJzZUZsb2F0KHN0YXJ0X3ByaWNlKSwgc3RhdHVzLCBpbWFnZV91cmwgfHwgbnVsbCwgYnV5X25vd19wcmljZSA/IHBhcnNlRmxvYXQoYnV5X25vd19wcmljZSkgOiBudWxsLCBtaW5fYmlkX2luY3JlbWVudCA/IHBhcnNlRmxvYXQobWluX2JpZF9pbmNyZW1lbnQpIDogMS4wMF1cbiAgICAgICk7XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHJlc3VsdC5yb3dzWzBdKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignQ3JlYXRlIGxpdmUgbG90IGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdFcnJvcmUgY3JlYXppb25lIHByb2RvdHRvJyB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEdFVCBMSVZFIExPVFMgRk9SIEEgTElWRVxuICBhcHAuZ2V0KCcvYXBpL2xpdmUtbG90cy9saXZlLzpsaXZlSWQnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBsaXZlSWQgfSA9IHJlcS5wYXJhbXM7XG4gICAgICBcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBvb2wucXVlcnkoXG4gICAgICAgICdTRUxFQ1QgKiBGUk9NIGxpdmVfbG90cyBXSEVSRSBsaXZlX2lkID0gJDEgT1JERVIgQlkgY3JlYXRlZF9hdCBBU0MnLFxuICAgICAgICBbbGl2ZUlkXVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgcmVzLmpzb24ocmVzdWx0LnJvd3MpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdHZXQgbGl2ZSBsb3RzIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdFcnJvcmUgcmVjdXBlcm8gcHJvZG90dGknIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gVVBEQVRFIExJVkUgTE9UIFNUQVRVUyAgXG4gIGFwcC5wYXRjaCgnL2FwaS9saXZlLWxvdHMvOmxvdElkJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgbG90SWQgfSA9IHJlcS5wYXJhbXM7XG4gICAgICBjb25zdCB7IHN0YXR1cywgY3VycmVudF9wcmljZSwgZmluYWxfcHJpY2UsIHdpbm5lcl91c2VyX2lkLCBidXlfbm93X3ByaWNlLCBtaW5fYmlkX2luY3JlbWVudCB9ID0gcmVxLmJvZHk7XG4gICAgICBcbiAgICAgIGNvbnN0IHVwZGF0ZXMgPSBbXTtcbiAgICAgIGNvbnN0IHZhbHVlcyA9IFtsb3RJZF07XG4gICAgICBsZXQgdmFsdWVJbmRleCA9IDI7XG4gICAgICBcbiAgICAgIGlmIChzdGF0dXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB1cGRhdGVzLnB1c2goYHN0YXR1cyA9ICQke3ZhbHVlSW5kZXh9YCk7XG4gICAgICAgIHZhbHVlcy5wdXNoKHN0YXR1cyk7XG4gICAgICAgIHZhbHVlSW5kZXgrKztcbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKGN1cnJlbnRfcHJpY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB1cGRhdGVzLnB1c2goYGN1cnJlbnRfcHJpY2UgPSAkJHt2YWx1ZUluZGV4fWApO1xuICAgICAgICB2YWx1ZXMucHVzaChwYXJzZUZsb2F0KGN1cnJlbnRfcHJpY2UpKTtcbiAgICAgICAgdmFsdWVJbmRleCsrO1xuICAgICAgfVxuICAgICAgXG4gICAgICBpZiAoZmluYWxfcHJpY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB1cGRhdGVzLnB1c2goYGZpbmFsX3ByaWNlID0gJCR7dmFsdWVJbmRleH1gKTtcbiAgICAgICAgdmFsdWVzLnB1c2goZmluYWxfcHJpY2UgPyBwYXJzZUZsb2F0KGZpbmFsX3ByaWNlKSA6IG51bGwpO1xuICAgICAgICB2YWx1ZUluZGV4Kys7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmICh3aW5uZXJfdXNlcl9pZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHVwZGF0ZXMucHVzaChgd2lubmVyX3VzZXJfaWQgPSAkJHt2YWx1ZUluZGV4fWApO1xuICAgICAgICB2YWx1ZXMucHVzaCh3aW5uZXJfdXNlcl9pZCk7XG4gICAgICAgIHZhbHVlSW5kZXgrKztcbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKGJ1eV9ub3dfcHJpY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB1cGRhdGVzLnB1c2goYGJ1eV9ub3dfcHJpY2UgPSAkJHt2YWx1ZUluZGV4fWApO1xuICAgICAgICB2YWx1ZXMucHVzaChidXlfbm93X3ByaWNlID8gcGFyc2VGbG9hdChidXlfbm93X3ByaWNlKSA6IG51bGwpO1xuICAgICAgICB2YWx1ZUluZGV4Kys7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmIChtaW5fYmlkX2luY3JlbWVudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHVwZGF0ZXMucHVzaChgbWluX2JpZF9pbmNyZW1lbnQgPSAkJHt2YWx1ZUluZGV4fWApO1xuICAgICAgICB2YWx1ZXMucHVzaChtaW5fYmlkX2luY3JlbWVudCA/IHBhcnNlRmxvYXQobWluX2JpZF9pbmNyZW1lbnQpIDogMS4wMCk7XG4gICAgICAgIHZhbHVlSW5kZXgrKztcbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKHVwZGF0ZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbih7IGVycm9yOiAnTmVzc3VuIGFnZ2lvcm5hbWVudG8gc3BlY2lmaWNhdG8nIH0pO1xuICAgICAgfVxuICAgICAgXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KFxuICAgICAgICBgVVBEQVRFIGxpdmVfbG90cyBTRVQgJHt1cGRhdGVzLmpvaW4oJywgJyl9LCB1cGRhdGVkX2F0ID0gQ1VSUkVOVF9USU1FU1RBTVAgV0hFUkUgaWQgPSAkMSBSRVRVUk5JTkcgKmAsXG4gICAgICAgIHZhbHVlc1xuICAgICAgKTtcbiAgICAgIFxuICAgICAgaWYgKHJlc3VsdC5yb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDQpLmpzb24oeyBlcnJvcjogJ0xvdHRvIG5vbiB0cm92YXRvJyB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgcmVzLmpzb24ocmVzdWx0LnJvd3NbMF0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdVcGRhdGUgbGl2ZSBsb3QgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogJ0Vycm9yZSBhZ2dpb3JuYW1lbnRvIGxvdHRvJyB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEdFVCBQT1NUUyBGT1IgQSBMSVZFXG4gIGFwcC5nZXQoJy9hcGkvcG9zdHMvbGl2ZS86bGl2ZUlkJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgbGl2ZUlkIH0gPSByZXEucGFyYW1zO1xuICAgICAgXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KFxuICAgICAgICAnU0VMRUNUICogRlJPTSBwb3N0cyBXSEVSRSBsaXZlX2lkID0gJDEgT1JERVIgQlkgY3JlYXRlZF9hdCcsXG4gICAgICAgIFtsaXZlSWRdXG4gICAgICApO1xuICAgICAgXG4gICAgICByZXMuanNvbihyZXN1bHQucm93cyB8fCBbXSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBwb3N0cyBmb3IgbGl2ZSBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIHJlY3VwZXJvIHBvc3RzIHBlciBsaXZlJyB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIENSRUFURSBORVcgTElWRVxuICBhcHAucG9zdCgnL2FwaS9saXZlcycsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IHNlbGxlcl9pZCwgdGl0bGUsIGNhdGVnb3J5X2lkLCBzdGFydF9wcmljZSwgc2NoZWR1bGVkX2F0IH0gPSByZXEuYm9keTtcbiAgICAgIFxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeShcbiAgICAgICAgYElOU0VSVCBJTlRPIGxpdmVzIChzZWxsZXJfaWQsIHRpdGxlLCBjYXRlZ29yeV9pZCwgc3RhcnRfcHJpY2UsIHNjaGVkdWxlZF9hdCwgc3RhdHVzLCB2aWV3ZXJzLCBjcmVhdGVkX2F0KSBcbiAgICAgICAgIFZBTFVFUyAoJDEsICQyLCAkMywgJDQsICQ1LCAnc2NoZWR1bGVkJywgMCwgTk9XKCkpIFxuICAgICAgICAgUkVUVVJOSU5HICpgLFxuICAgICAgICBbc2VsbGVyX2lkLCB0aXRsZSwgY2F0ZWdvcnlfaWQgfHwgbnVsbCwgc3RhcnRfcHJpY2UgfHwgMCwgc2NoZWR1bGVkX2F0IHx8ICdOT1coKSddXG4gICAgICApO1xuICAgICAgXG4gICAgICByZXMuanNvbihyZXN1bHQucm93c1swXSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0NyZWF0ZSBsaXZlIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdFcnJvcmUgY3JlYXppb25lIGxpdmUnIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gVVBEQVRFIExJVkUgU1RBVFVTXG4gIGFwcC5wdXQoJy9hcGkvbGl2ZXMvOmlkL3N0YXR1cycsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IGlkIH0gPSByZXEucGFyYW1zO1xuICAgICAgY29uc3QgeyBzdGF0dXMgfSA9IHJlcS5ib2R5O1xuICAgICAgXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KFxuICAgICAgICAnVVBEQVRFIGxpdmVzIFNFVCBzdGF0dXMgPSAkMSBXSEVSRSBpZCA9ICQyIFJFVFVSTklORyAqJyxcbiAgICAgICAgW3N0YXR1cywgaWRdXG4gICAgICApO1xuICAgICAgXG4gICAgICBpZiAocmVzdWx0LnJvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwNCkuanNvbih7IGVycm9yOiAnTGl2ZSBub3QgZm91bmQnIH0pO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBTZSBsaXZlIFx1MDBFOCB0ZXJtaW5hdGEsIGNsZWFudXAgc3BldHRhdG9yaVxuICAgICAgaWYgKHN0YXR1cyA9PT0gJ2VuZGVkJykge1xuICAgICAgICBjb25zdCB7IGNsZWFudXBMaXZlIH0gPSBhd2FpdCBpbXBvcnQoJy4vdmlld2VyLXRyYWNraW5nLmpzJyk7XG4gICAgICAgIGF3YWl0IGNsZWFudXBMaXZlKGlkKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgcmVzLmpzb24ocmVzdWx0LnJvd3NbMF0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdVcGRhdGUgbGl2ZSBzdGF0dXMgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogJ0Vycm9yZSBhZ2dpb3JuYW1lbnRvIGxpdmUnIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gPT09IFZJRVdFUiBUUkFDS0lORyBFTkRQT0lOVFMgPT09XG4gIFxuICAvLyBKT0lOIExJVkUgQVMgVklFV0VSXG4gIGFwcC5wb3N0KCcvYXBpL2xpdmUvOmxpdmVJZC9qb2luJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgbGl2ZUlkIH0gPSByZXEucGFyYW1zO1xuICAgICAgY29uc3QgeyB2aWV3ZXJJZCB9ID0gcmVxLmJvZHk7XG4gICAgICBcbiAgICAgIGlmICghdmlld2VySWQpIHtcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKHsgZXJyb3I6ICd2aWV3ZXJJZCByaWNoaWVzdG8nIH0pO1xuICAgICAgfVxuICAgICAgXG4gICAgICBjb25zdCB7IGFkZFZpZXdlciB9ID0gYXdhaXQgaW1wb3J0KCcuL3ZpZXdlci10cmFja2luZy5qcycpO1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYWRkVmlld2VyKGxpdmVJZCwgdmlld2VySWQpO1xuICAgICAgXG4gICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgIHJldHVybiByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiByZXN1bHQuZXJyb3IgfSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgdmlld2VyczogcmVzdWx0LnZpZXdlcnMsXG4gICAgICAgIHRvdGFsVmlld2VyczogcmVzdWx0LnRvdGFsVmlld2VycyxcbiAgICAgICAgbWVzc2FnZTogJ1NwZXR0YXRvcmUgYWdnaXVudG8gY29uIHN1Y2Nlc3NvJ1xuICAgICAgfSk7XG4gICAgICBcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignSm9pbiBsaXZlIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdFcnJvcmUgaW5ncmVzc28gbGl2ZScgfSk7XG4gICAgfVxuICB9KTtcbiAgXG4gIC8vIExFQVZFIExJVkVcbiAgYXBwLnBvc3QoJy9hcGkvbGl2ZS86bGl2ZUlkL2xlYXZlJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgbGl2ZUlkIH0gPSByZXEucGFyYW1zO1xuICAgICAgY29uc3QgeyB2aWV3ZXJJZCB9ID0gcmVxLmJvZHk7XG4gICAgICBcbiAgICAgIGlmICghdmlld2VySWQpIHtcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKHsgZXJyb3I6ICd2aWV3ZXJJZCByaWNoaWVzdG8nIH0pO1xuICAgICAgfVxuICAgICAgXG4gICAgICBjb25zdCB7IHJlbW92ZVZpZXdlciB9ID0gYXdhaXQgaW1wb3J0KCcuL3ZpZXdlci10cmFja2luZy5qcycpO1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcmVtb3ZlVmlld2VyKGxpdmVJZCwgdmlld2VySWQpO1xuICAgICAgXG4gICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgIHJldHVybiByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiByZXN1bHQuZXJyb3IgfSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgdmlld2VyczogcmVzdWx0LnZpZXdlcnMsXG4gICAgICAgIG1lc3NhZ2U6ICdTcGV0dGF0b3JlIHJpbW9zc28gY29uIHN1Y2Nlc3NvJ1xuICAgICAgfSk7XG4gICAgICBcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignTGVhdmUgbGl2ZSBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIHVzY2l0YSBsaXZlJyB9KTtcbiAgICB9XG4gIH0pO1xuICBcbiAgLy8gR0VUIFZJRVdFUiBTVEFUU1xuICBhcHAuZ2V0KCcvYXBpL2xpdmUvOmxpdmVJZC92aWV3ZXJzJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgbGl2ZUlkIH0gPSByZXEucGFyYW1zO1xuICAgICAgXG4gICAgICBjb25zdCB7IGdldFZpZXdlclN0YXRzIH0gPSBhd2FpdCBpbXBvcnQoJy4vdmlld2VyLXRyYWNraW5nLmpzJyk7XG4gICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IGdldFZpZXdlclN0YXRzKGxpdmVJZCk7XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHN0YXRzKTtcbiAgICAgIFxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdHZXQgdmlld2VyIHN0YXRzIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdFcnJvcmUgc3RhdHMgc3BldHRhdG9yaScgfSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBHRVQgTElWRVMgQlkgU0VMTEVSXG4gIGFwcC5nZXQoJy9hcGkvbGl2ZXMvc2VsbGVyLzpzZWxsZXJJZCcsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IHNlbGxlcklkIH0gPSByZXEucGFyYW1zO1xuICAgICAgXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KFxuICAgICAgICAnU0VMRUNUICogRlJPTSBsaXZlcyBXSEVSRSBzZWxsZXJfaWQgPSAkMSBPUkRFUiBCWSBjcmVhdGVkX2F0IERFU0MnLFxuICAgICAgICBbc2VsbGVySWRdXG4gICAgICApO1xuICAgICAgXG4gICAgICByZXMuanNvbihyZXN1bHQucm93cyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBsaXZlcyBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIHJlY3VwZXJvIGxpdmUnIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gREVMRVRFIExJVkVcbiAgYXBwLmRlbGV0ZSgnL2FwaS9saXZlcy86aWQnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBpZCB9ID0gcmVxLnBhcmFtcztcbiAgICAgIFxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeShcbiAgICAgICAgJ0RFTEVURSBGUk9NIGxpdmVzIFdIRVJFIGlkID0gJDEgUkVUVVJOSU5HIGlkJyxcbiAgICAgICAgW2lkXVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgaWYgKHJlc3VsdC5yb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDQpLmpzb24oeyBlcnJvcjogJ0xpdmUgbm90IGZvdW5kJyB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgcmVzLmpzb24oeyBzdWNjZXNzOiB0cnVlIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdEZWxldGUgbGl2ZSBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIGVsaW1pbmF6aW9uZSBsaXZlJyB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEdFVCBQT1NUUyBCWSBTRUxMRVIgSURcbiAgYXBwLmdldCgnL2FwaS9wb3N0cy9zZWxsZXIvOnNlbGxlcklkJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgc2VsbGVySWQgfSA9IHJlcS5wYXJhbXM7XG4gICAgICBcbiAgICAgIC8vIFx1MjcwNSBQcmltYSBvdHRpZW5pIGwndXNlcl9pZCBkZWwgc2VsbGVyXG4gICAgICBjb25zdCBzZWxsZXJSZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KFxuICAgICAgICAnU0VMRUNUIHVzZXJfaWQgRlJPTSBzZWxsZXJzIFdIRVJFIGlkID0gJDEnLFxuICAgICAgICBbc2VsbGVySWRdXG4gICAgICApO1xuICAgICAgXG4gICAgICBpZiAoc2VsbGVyUmVzdWx0LnJvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiByZXMuanNvbihbXSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGNvbnN0IHVzZXJJZCA9IHNlbGxlclJlc3VsdC5yb3dzWzBdLnVzZXJfaWQ7XG4gICAgICBcbiAgICAgIC8vIFx1MjcwNSBPcmEgY2VyY2EgaSBwb3N0IG5lbGxhIHRhYmVsbGEgc29jaWFsX3Bvc3RzXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KFxuICAgICAgICAnU0VMRUNUICogRlJPTSBzb2NpYWxfcG9zdHMgV0hFUkUgdXNlcl9pZCA9ICQxIE9SREVSIEJZIGNyZWF0ZWRfYXQgREVTQyBMSU1JVCA2MCcsXG4gICAgICAgIFt1c2VySWRdXG4gICAgICApO1xuICAgICAgXG4gICAgICByZXMuanNvbihyZXN1bHQucm93cyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBwb3N0cyBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIHJlY3VwZXJvIHBvc3RzJyB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEdFVCBTVE9SSUVTIEJZIFNFTExFUiBJRCAgXG4gIGFwcC5nZXQoJy9hcGkvc3Rvcmllcy9zZWxsZXIvOnNlbGxlcklkJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgc2VsbGVySWQgfSA9IHJlcS5wYXJhbXM7XG4gICAgICBcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBvb2wucXVlcnkoXG4gICAgICAgICdTRUxFQ1QgKiBGUk9NIHN0b3JpZXMgV0hFUkUgc2VsbGVyX2lkID0gJDEgT1JERVIgQlkgY3JlYXRlZF9hdCBERVNDIExJTUlUIDIwJyxcbiAgICAgICAgW3NlbGxlcklkXVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgcmVzLmpzb24ocmVzdWx0LnJvd3MpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdHZXQgc3RvcmllcyBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIHJlY3VwZXJvIHN0b3JpZXMnIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gR0VUIFNUT1JZIElURU1TIEJZIFNUT1JZIElEXG4gIGFwcC5nZXQoJy9hcGkvc3RvcnktaXRlbXMvOnN0b3J5SWQnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBzdG9yeUlkIH0gPSByZXEucGFyYW1zO1xuICAgICAgXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KFxuICAgICAgICAnU0VMRUNUICogRlJPTSBzdG9yeV9pdGVtcyBXSEVSRSBzdG9yeV9pZCA9ICQxIE9SREVSIEJZIGNyZWF0ZWRfYXQgQVNDJyxcbiAgICAgICAgW3N0b3J5SWRdXG4gICAgICApO1xuICAgICAgXG4gICAgICByZXMuanNvbihyZXN1bHQucm93cyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBzdG9yeSBpdGVtcyBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIHJlY3VwZXJvIHN0b3J5IGl0ZW1zJyB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vID09PSBTT0NJQUwgQVBJIEVORFBPSU5UUyA9PT1cbiAgXG4gIC8vIEZPTExPVy9VTkZPTExPVyBVU0VSXG4gIGFwcC5wb3N0KCcvYXBpL3NvY2lhbC9mb2xsb3cnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBmb2xsb3dlcklkLCBmb2xsb3dpbmdJZCB9ID0gcmVxLmJvZHk7XG4gICAgICBcbiAgICAgIGlmICghZm9sbG93ZXJJZCB8fCAhZm9sbG93aW5nSWQpIHtcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKHsgZXJyb3I6ICdmb2xsb3dlcklkIGUgZm9sbG93aW5nSWQgcmljaGllc3RpJyB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgY29uc3QgeyB0b2dnbGVGb2xsb3cgfSA9IGF3YWl0IGltcG9ydCgnLi9zb2NpYWwtYXBpLmpzJyk7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0b2dnbGVGb2xsb3coZm9sbG93ZXJJZCwgZm9sbG93aW5nSWQpO1xuICAgICAgXG4gICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbih7IGVycm9yOiByZXN1bHQuZXJyb3IgfSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHJlc3VsdCk7XG4gICAgICBcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignRm9sbG93IGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdFcnJvcmUgZm9sbG93L3VuZm9sbG93JyB9KTtcbiAgICB9XG4gIH0pO1xuICBcbiAgLy8gR0VUIFVTRVIgU09DSUFMIFNUQVRTXG4gIGFwcC5nZXQoJy9hcGkvc29jaWFsL3N0YXRzLzp1c2VySWQnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyB1c2VySWQgfSA9IHJlcS5wYXJhbXM7XG4gICAgICBcbiAgICAgIGNvbnN0IHsgZ2V0VXNlclNvY2lhbFN0YXRzIH0gPSBhd2FpdCBpbXBvcnQoJy4vc29jaWFsLWFwaS5qcycpO1xuICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBnZXRVc2VyU29jaWFsU3RhdHModXNlcklkKTtcbiAgICAgIFxuICAgICAgcmVzLmpzb24oc3RhdHMpO1xuICAgICAgXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBzb2NpYWwgc3RhdHMgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogJ0Vycm9yZSByZWN1cGVybyBzdGF0aXN0aWNoZScgfSk7XG4gICAgfVxuICB9KTtcbiAgXG4gIC8vIEdFVCBVU0VSIE5PVElGSUNBVElPTlNcbiAgYXBwLmdldCgnL2FwaS9zb2NpYWwvbm90aWZpY2F0aW9ucy86dXNlcklkJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgdXNlcklkIH0gPSByZXEucGFyYW1zO1xuICAgICAgY29uc3QgeyBsaW1pdCA9IDUwLCB1bnJlYWRPbmx5ID0gZmFsc2UgfSA9IHJlcS5xdWVyeTtcbiAgICAgIFxuICAgICAgY29uc3QgeyBnZXRVc2VyTm90aWZpY2F0aW9ucyB9ID0gYXdhaXQgaW1wb3J0KCcuL3NvY2lhbC1hcGkuanMnKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGdldFVzZXJOb3RpZmljYXRpb25zKHVzZXJJZCwgcGFyc2VJbnQobGltaXQpLCB1bnJlYWRPbmx5ID09PSAndHJ1ZScpO1xuICAgICAgXG4gICAgICByZXMuanNvbihyZXN1bHQpO1xuICAgICAgXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBub3RpZmljYXRpb25zIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdFcnJvcmUgcmVjdXBlcm8gbm90aWZpY2hlJyB9KTtcbiAgICB9XG4gIH0pO1xuICBcbiAgLy8gR0VUIFVOUkVBRCBOT1RJRklDQVRJT05TIENPVU5UXG4gIGFwcC5nZXQoJy9hcGkvc29jaWFsL25vdGlmaWNhdGlvbnMvOnVzZXJJZC91bnJlYWQtY291bnQnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyB1c2VySWQgfSA9IHJlcS5wYXJhbXM7XG4gICAgICBcbiAgICAgIGNvbnN0IHsgZ2V0VW5yZWFkTm90aWZpY2F0aW9uc0NvdW50IH0gPSBhd2FpdCBpbXBvcnQoJy4vc29jaWFsLWFwaS5qcycpO1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2V0VW5yZWFkTm90aWZpY2F0aW9uc0NvdW50KHVzZXJJZCk7XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHJlc3VsdCk7XG4gICAgICBcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignR2V0IHVucmVhZCBjb3VudCBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIGNvbnRlZ2dpbyBub3RpZmljaGUnIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gTGl2ZUtpdCB0b2tlbiBlbmRwb2ludFxuICBhcHAucG9zdCgnL2FwaS9saXZla2l0L3Rva2VuJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgcm9vbU5hbWUsIHBhcnRpY2lwYW50TmFtZSwgcm9sZSA9ICdzdWJzY3JpYmVyJyB9ID0gcmVxLmJvZHk7XG4gICAgICBcbiAgICAgIGNvbnNvbGUubG9nKCdcdUQ4M0NcdURGQTUgTGl2ZUtpdCB0b2tlbiByZXF1ZXN0IHZpYSBWaXRlOicsIHsgcm9vbU5hbWUsIHBhcnRpY2lwYW50TmFtZSwgcm9sZSB9KTtcbiAgICAgIFxuICAgICAgLy8gSW1wb3J0YSBBY2Nlc3NUb2tlblxuICAgICAgY29uc3QgeyBBY2Nlc3NUb2tlbiB9ID0gYXdhaXQgaW1wb3J0KCdsaXZla2l0LXNlcnZlci1zZGsnKTtcbiAgICAgIFxuICAgICAgaWYgKCFwcm9jZXNzLmVudi5MSVZFS0lUX0FQSV9LRVkgfHwgIXByb2Nlc3MuZW52LkxJVkVLSVRfU0VDUkVUX0tFWSB8fCAhcHJvY2Vzcy5lbnYuTElWRUtJVF9VUkwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdMaXZlS2l0IGNyZWRlbnRpYWxzIG5vdCBjb25maWd1cmVkJyk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIENyZWF0ZSB0b2tlbiB3aXRoIHByb3BlciBvcHRpb25zXG4gICAgICBjb25zdCB0b2tlbiA9IG5ldyBBY2Nlc3NUb2tlbihwcm9jZXNzLmVudi5MSVZFS0lUX0FQSV9LRVksIHByb2Nlc3MuZW52LkxJVkVLSVRfU0VDUkVUX0tFWSwge1xuICAgICAgICBpZGVudGl0eTogcGFydGljaXBhbnROYW1lLFxuICAgICAgICBuYW1lOiBwYXJ0aWNpcGFudE5hbWUsXG4gICAgICAgIHR0bDogJzI0aCcsXG4gICAgICB9KTtcblxuICAgICAgLy8gQWRkIGdyYW50cyB3aXRoIHByb3BlciByb29tIG5hbWVcbiAgICAgIGNvbnN0IGdyYW50ID0ge1xuICAgICAgICByb29tSm9pbjogdHJ1ZSxcbiAgICAgICAgcm9vbTogcm9vbU5hbWUsXG4gICAgICAgIGNhblB1Ymxpc2g6IHJvbGUgPT09ICdwdWJsaXNoZXInLFxuICAgICAgICBjYW5TdWJzY3JpYmU6IHRydWUsXG4gICAgICAgIGNhblB1Ymxpc2hEYXRhOiByb2xlID09PSAncHVibGlzaGVyJyxcbiAgICAgIH07XG4gICAgICBcbiAgICAgIHRva2VuLmFkZEdyYW50KGdyYW50KTtcblxuICAgICAgLy8gR2VuZXJhdGUgSldUXG4gICAgICBsZXQgand0VG9rZW47XG4gICAgICB0cnkge1xuICAgICAgICBqd3RUb2tlbiA9IGF3YWl0IHRva2VuLnRvSnd0KCk7XG4gICAgICB9IGNhdGNoIChhc3luY0Vycm9yKSB7XG4gICAgICAgIGp3dFRva2VuID0gdG9rZW4udG9Kd3QoKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKCFqd3RUb2tlbiB8fCB0eXBlb2Ygand0VG9rZW4gIT09ICdzdHJpbmcnIHx8IGp3dFRva2VuLmxlbmd0aCA8IDEwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVG9rZW4gZ2VuZXJhdGlvbiBmYWlsZWQgLSBpbnZhbGlkIEpXVDogJHt0eXBlb2Ygand0VG9rZW59LCBsZW5ndGg6ICR7and0VG9rZW4/Lmxlbmd0aH1gKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgY29uc29sZS5sb2coJ1x1MjcwNSBUb2tlbiBnZW5lcmF0byB2aWEgVml0ZSwgbHVuZ2hlenphOicsIGp3dFRva2VuLmxlbmd0aCk7XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHsgXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIHRva2VuOiBqd3RUb2tlbixcbiAgICAgICAgc2VydmVyVXJsOiBwcm9jZXNzLmVudi5MSVZFS0lUX1VSTCxcbiAgICAgICAgbWVzc2FnZTogJ1Rva2VuIExpdmVLaXQgZ2VuZXJhdG8gY29uIHN1Y2Nlc3NvJ1xuICAgICAgfSk7XG4gICAgICBcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignXHUyNzRDIExpdmVLaXQgdG9rZW4gZXJyb3IgdmlhIFZpdGU6JywgZXJyb3IpO1xuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogJ0Vycm9yZSBnZW5lcmF6aW9uZSB0b2tlbiBMaXZlS2l0JyB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIE5PVEE6IEVuZHBvaW50IExpdmVLaXQgZHVwbGljYXRvIHJpbW9zc28gLSB1c2EgcXVlbGxvIHByaW5jaXBhbGUgaW4gc2VydmVyL2FwcC5qc1xuXG4gIGNvbnNvbGUubG9nKCdcdTI3MDUgQVBJIFJvdXRlcyBjb25maWd1cmF0ZSBuZWwgc2VydmVyIFZpdGUhJyk7XG59Il0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBU08sU0FBUyxtQkFBbUIsU0FBUyxNQUFNO0FBQ2hELE1BQUksWUFBWTtBQUVoQixVQUFRLE1BQU07QUFBQSxJQUNaLEtBQUs7QUFDSCxrQkFBWSxtQkFBbUIsT0FBTztBQUN0QztBQUFBLElBQ0YsS0FBSztBQUNILGtCQUFZLG1CQUFtQixPQUFPO0FBQ3RDO0FBQUEsSUFDRixLQUFLO0FBQ0gsa0JBQVksc0JBQXNCLE9BQU87QUFDekM7QUFBQSxJQUNGO0FBQ0Usa0JBQVk7QUFBQSxFQUNoQjtBQUVBLFNBQU8sS0FBSyxJQUFJLFdBQVcsRUFBRTtBQUMvQjtBQUtBLFNBQVMsbUJBQW1CLE1BQU07QUFDaEMsUUFBTTtBQUFBLElBQ0osZUFBZTtBQUFBLElBQ2YsYUFBYTtBQUFBLElBQ2IsbUJBQW1CO0FBQUEsSUFDbkIsbUJBQW1CO0FBQUEsSUFDbkIsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsU0FBUztBQUFBLEVBQ1gsSUFBSTtBQUdKLE1BQUksUUFBUTtBQUdaLFdBQVMsS0FBSyxJQUFJLGVBQWUsSUFBSSxHQUFHO0FBR3hDLFdBQVMsS0FBSyxJQUFJLGFBQWEsSUFBSSxHQUFHO0FBR3RDLFdBQVM7QUFHVCxXQUFTLEtBQUssSUFBSSxrQkFBa0IsR0FBRztBQUd2QyxXQUFTLFFBQVE7QUFDakIsV0FBUyxXQUFXO0FBQ3BCLFdBQVMsU0FBUztBQUVsQixTQUFPLEtBQUssTUFBTSxLQUFLO0FBQ3pCO0FBS0EsU0FBUyxtQkFBbUIsTUFBTTtB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SSxRQUFRLEtBQUssQ0FBQztBQUd0QixpQkFBUyxHQUFHO0FBR1osZUFBTyxZQUFZLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUztBQUN6QyxjQUFJLElBQUksSUFBSSxXQUFXLE9BQU8sR0FBRztBQUMvQixnQkFBSSxLQUFLLEtBQUssSUFBSTtBQUFBLFVBQ3BCLE9BQU87QUFDTCxpQkFBSztBQUFBLFVBQ1A7QUFBQSxRQUNGLENBQUM7QUFBQSxNQUNIO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFsiY2FsY3VsYXRlQmFzZVNjb3JlIiwgImFwcGx5Qm9vc3QiLCAiY3JlYXRlQ2xpZW50IiwgInN1cGFiYXNlIiwgInN1cGFiYXNlIiwgImNsZWFudXBMaXZlIiwgImFkZFZpZXdlciIsICJyZW1vdmVWaWV3ZXIiLCAiZ2V0Vmlld2VyU3RhdHMiLCAidG9nZ2xlRm9sbG93IiwgImdldFVzZXJTb2NpYWxTdGF0cyIsICJnZXRVc2VyTm90aWZpY2F0aW9ucyIsICJnZXRVbnJlYWROb3RpZmljYXRpb25zQ291bnQiXQp9Cg==
