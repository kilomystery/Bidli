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
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    viewersCache = /* @__PURE__ */ new Map();
    cleanupTimers = /* @__PURE__ */ new Map();
  }
});

// src/lib/supabaseClient.js
import { createClient as createClient2 } from "file:///home/runner/workspace/node_modules/@supabase/supabase-js/dist/main/index.js";
var SITE_URL, supabase2;
var init_supabaseClient = __esm({
  "src/lib/supabaseClient.js"() {
    "use strict";
    SITE_URL = "https://bidli.live";
    supabase2 = createClient2(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          // Forza l'URL del sito per le email
          siteUrl: SITE_URL,
          redirectTo: `${SITE_URL}/auth`
        },
        global: {
          headers: {
            "X-Site-URL": SITE_URL
          }
        }
      }
    );
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
      live_id: postData.live_id || null
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
    init_supabaseClient();
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
        "SELECT id, handle, display_name, avatar_url FROM sellers WHERE user_id = $1",
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
        "SELECT id, handle, display_name, avatar_url FROM sellers WHERE handle = $1",
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
      const result = await pool.query(
        "SELECT * FROM posts WHERE seller_id = $1 ORDER BY created_at DESC LIMIT 60",
        [sellerId]
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL3V0aWxzL3JhbmtpbmdBbGdvcml0aG0uanMiLCAic2VydmVyL3ZpZXdlci10cmFja2luZy5qcyIsICJzcmMvbGliL3N1cGFiYXNlQ2xpZW50LmpzIiwgInNlcnZlci9zb2NpYWwtYXBpLmpzIiwgInZpdGUuY29uZmlnLmpzIiwgInNlcnZlci9hcGkuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9ydW5uZXIvd29ya3NwYWNlL3NyYy91dGlsc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvcnVubmVyL3dvcmtzcGFjZS9zcmMvdXRpbHMvcmFua2luZ0FsZ29yaXRobS5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9ydW5uZXIvd29ya3NwYWNlL3NyYy91dGlscy9yYW5raW5nQWxnb3JpdGhtLmpzXCI7Ly8gc3JjL3V0aWxzL3JhbmtpbmdBbGdvcml0aG0uanNcbi8vIEFsZ29yaXRtbyBkaSByYW5raW5nIGludGVsbGlnZW50ZSBwZXIgdm50Zy5saXZlXG5cbi8qKlxuICogQ2FsY29sYSBpbCBwdW50ZWdnaW8gYmFzZSBkaSB1biBjb250ZW51dG8gYmFzYXRvIHN1IG1ldHJpY2hlIHJlYWxpXG4gKiBAcGFyYW0ge09iamVjdH0gY29udGVudCAtIElsIGNvbnRlbnV0byAobGl2ZSwgcG9zdCwgcHJvZmlsbylcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gVGlwbzogJ2xpdmVfc3RyZWFtJywgJ3Bvc3QnLCAncHJvZmlsZSdcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFB1bnRlZ2dpbyBiYXNlIGNhbGNvbGF0b1xuICovXG5leHBvcnQgZnVuY3Rpb24gY2FsY3VsYXRlQmFzZVNjb3JlKGNvbnRlbnQsIHR5cGUpIHtcbiAgbGV0IGJhc2VTY29yZSA9IDA7XG4gIFxuICBzd2l0Y2ggKHR5cGUpIHtcbiAgICBjYXNlICdsaXZlX3N0cmVhbSc6XG4gICAgICBiYXNlU2NvcmUgPSBjYWxjdWxhdGVMaXZlU2NvcmUoY29udGVudCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdwb3N0JzpcbiAgICAgIGJhc2VTY29yZSA9IGNhbGN1bGF0ZVBvc3RTY29yZShjb250ZW50KTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3Byb2ZpbGUnOlxuICAgICAgYmFzZVNjb3JlID0gY2FsY3VsYXRlUHJvZmlsZVNjb3JlKGNvbnRlbnQpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGJhc2VTY29yZSA9IDEwMDtcbiAgfVxuICBcbiAgcmV0dXJuIE1hdGgubWF4KGJhc2VTY29yZSwgNTApOyAvLyBQdW50ZWdnaW8gbWluaW1vIGRpIDUwXG59XG5cbi8qKlxuICogQ2FsY29sYSBwdW50ZWdnaW8gcGVyIGxpdmUgc3RyZWFtIGJhc2F0byBzdSBlbmdhZ2VtZW50IHJlYWxlXG4gKi9cbmZ1bmN0aW9uIGNhbGN1bGF0ZUxpdmVTY29yZShsaXZlKSB7XG4gIGNvbnN0IHtcbiAgICB2aWV3ZXJfY291bnQgPSAwLFxuICAgIHRvdGFsX2JpZHMgPSAwLFxuICAgIGJpZF9hbW91bnRfdG90YWwgPSAwLFxuICAgIGR1cmF0aW9uX21pbnV0ZXMgPSAwLFxuICAgIGxpa2VzID0gMCxcbiAgICBjb21tZW50cyA9IDAsXG4gICAgc2hhcmVzID0gMFxuICB9ID0gbGl2ZTtcblxuICAvLyBQdW50ZWdnaW8gYmFzZTogNTAwIHB1bnRpICsgYm9udXMgcGVyIG1ldHJpY2hlXG4gIGxldCBzY29yZSA9IDUwMDtcbiAgXG4gIC8vIEJvbnVzIHNwZXR0YXRvcmkgKG1hc3NpbW8gNTAwIHB1bnRpKVxuICBzY29yZSArPSBNYXRoLm1pbih2aWV3ZXJfY291bnQgKiAxMCwgNTAwKTtcbiAgXG4gIC8vIEJvbnVzIG9mZmVydGUgKG1hc3NpbW8gMzAwIHB1bnRpKVxuICBzY29yZSArPSBNYXRoLm1pbih0b3RhbF9iaWRzICogMTUsIDMwMCk7XG4gIFxuICAvLyBCb251cyB2YWxvcmUgb2ZmZXJ0ZSAoMSBwdW50byBwZXIgZXVybylcbiAgc2NvcmUgKz0gYmlkX2Ftb3VudF90b3RhbDtcbiAgXG4gIC8vIEJvbnVzIGR1cmF0YSBsaXZlICgxIHB1bnRvIHBlciBtaW51dG8sIG1heCAxMjApXG4gIHNjb3JlICs9IE1hdGgubWluKGR1cmF0aW9uX21pbnV0ZXMsIDEyMCk7XG4gIFxuICAvLyBCb251cyBlbmdhZ2VtZW50XG4gIHNjb3JlICs9IGxpa2VzICogMjtcbiAgc2NvcmUgKz0gY29tbWVudHMgKiAzO1xuICBzY29yZSArPSBzaGFyZXMgKiA1O1xuICBcbiAgcmV0dXJuIE1hdGgucm91bmQoc2NvcmUpO1xufVxuXG4vKipcbiAqIENhbGNvbGEgcHVudGVnZ2lvIHBlciBwb3N0IGJhc2F0byBzdSBlbmdhZ2VtZW50XG4gKi9cbmZ1bmN0aW9uIGNhbGN1bGF0ZVBvc3RTY29yZShwb3N0KSB7XG4gIGNvbnN0IHtcbiAgICBsaWtlcyA9IDAsXG4gICAgY29tbWVudHMgPSAwLFxuICAgIHNoYXJlcyA9IDAsXG4gICAgdmlld3MgPSAwLFxuICAgIHNhdmVzID0gMCxcbiAgICBjbGlja190aHJvdWdocyA9IDBcbiAgfSA9IHBvc3Q7XG5cbiAgLy8gUHVudGVnZ2lvIGJhc2U6IDIwMCBwdW50aSArIGJvbnVzIHBlciBlbmdhZ2VtZW50XG4gIGxldCBzY29yZSA9IDIwMDtcbiAgXG4gIC8vIEJvbnVzIHZpc3VhbGl6emF6aW9uaSAoMC41IHB1bnRpIHBlciB2aWV3LCBtYXggMjAwKVxuICBzY29yZSArPSBNYXRoLm1pbih2aWV3cyAqIDAuNSwgMjAwKTtcbiAgXG4gIC8vIEJvbnVzIGludGVyYXppb25pXG4gIHNjb3JlICs9IGxpa2VzICogMztcbiAgc2NvcmUgKz0gY29tbWVudHMgKiA1O1xuICBzY29yZSArPSBzaGFyZXMgKiA4O1xuICBzY29yZSArPSBzYXZlcyAqIDQ7XG4gIHNjb3JlICs9IGNsaWNrX3Rocm91Z2hzICogNjtcbiAgXG4gIHJldHVybiBNYXRoLnJvdW5kKHNjb3JlKTtcbn1cblxuLyoqXG4gKiBDYWxjb2xhIHB1bnRlZ2dpbyBwZXIgcHJvZmlsbyBiYXNhdG8gc3UgY3JlZGliaWxpdFx1MDBFMFxuICovXG5mdW5jdGlvbiBjYWxjdWxhdGVQcm9maWxlU2NvcmUocHJvZmlsZSkge1xuICBjb25zdCB7XG4gICAgZm9sbG93ZXJzID0gMCxcbiAgICB0b3RhbF9zYWxlcyA9IDAsXG4gICAgYXZnX3JhdGluZyA9IDAsXG4gICAgcmV2aWV3c19jb3VudCA9IDAsXG4gICAgcHJvZmlsZV92aWV3cyA9IDAsXG4gICAgZGF5c19hY3RpdmUgPSAwXG4gIH0gPSBwcm9maWxlO1xuXG4gIC8vIFB1bnRlZ2dpbyBiYXNlOiAxMDAgcHVudGkgKyBib251cyBwZXIgY3JlZGliaWxpdFx1MDBFMFxuICBsZXQgc2NvcmUgPSAxMDA7XG4gIFxuICAvLyBCb251cyBmb2xsb3dlciAoMC41IHB1bnRpIHBlciBmb2xsb3dlciwgbWF4IDE1MClcbiAgc2NvcmUgKz0gTWF0aC5taW4oZm9sbG93ZXJzICogMC41LCAxNTApO1xuICBcbiAgLy8gQm9udXMgdmVuZGl0ZSAoNSBwdW50aSBwZXIgdmVuZGl0YSwgbWF4IDIwMClcbiAgc2NvcmUgKz0gTWF0aC5taW4odG90YWxfc2FsZXMgKiA1LCAyMDApO1xuICBcbiAgLy8gQm9udXMgcmF0aW5nIChmaW5vIGEgNTAgcHVudGkgcGVyIHJhdGluZyBwZXJmZXR0bylcbiAgc2NvcmUgKz0gKGF2Z19yYXRpbmcgLyA1KSAqIDUwO1xuICBcbiAgLy8gQm9udXMgcmVjZW5zaW9uaSAoMiBwdW50aSBwZXIgcmVjZW5zaW9uZSwgbWF4IDEwMClcbiAgc2NvcmUgKz0gTWF0aC5taW4ocmV2aWV3c19jb3VudCAqIDIsIDEwMCk7XG4gIFxuICAvLyBCb251cyB2aXNpdGUgcHJvZmlsbyAoMC4yIHB1bnRpIHBlciB2aXNpdGEsIG1heCAxMDApXG4gIHNjb3JlICs9IE1hdGgubWluKHByb2ZpbGVfdmlld3MgKiAwLjIsIDEwMCk7XG4gIFxuICAvLyBCb251cyBhbnppYW5pdFx1MDBFMCAoMSBwdW50byBwZXIgZ2lvcm5vIGF0dGl2bywgbWF4IDM2NSlcbiAgc2NvcmUgKz0gTWF0aC5taW4oZGF5c19hY3RpdmUsIDM2NSk7XG4gIFxuICByZXR1cm4gTWF0aC5yb3VuZChzY29yZSk7XG59XG5cbi8qKlxuICogQXBwbGljYSBpbCBtb2x0aXBsaWNhdG9yZSBib29zdCBhbCBwdW50ZWdnaW8gYmFzZVxuICogQHBhcmFtIHtudW1iZXJ9IGJhc2VTY29yZSAtIFB1bnRlZ2dpbyBiYXNlIGNhbGNvbGF0b1xuICogQHBhcmFtIHtudW1iZXJ9IGJvb3N0TXVsdGlwbGllciAtIE1vbHRpcGxpY2F0b3JlIGJvb3N0ICgyLCA1LCAxMClcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFB1bnRlZ2dpbyBmaW5hbGUgY29uIGJvb3N0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcHBseUJvb3N0KGJhc2VTY29yZSwgYm9vc3RNdWx0aXBsaWVyID0gMSkge1xuICByZXR1cm4gTWF0aC5yb3VuZChiYXNlU2NvcmUgKiBib29zdE11bHRpcGxpZXIpO1xufVxuXG4vKipcbiAqIENhbGNvbGEgcmFua2luZyBmaW5hbGUgcGVyIG9yZGluYW1lbnRvIGZlZWRcbiAqIEBwYXJhbSB7T2JqZWN0fSBjb250ZW50IC0gQ29udGVudXRvXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtIFRpcG8gY29udGVudXRvXG4gKiBAcGFyYW0ge251bWJlcn0gYm9vc3RNdWx0aXBsaWVyIC0gTW9sdGlwbGljYXRvcmUgYm9vc3QgYXR0aXZvXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBSaXN1bHRhdG8gY29uIHB1bnRlZ2dpIGRldHRhZ2xpYXRpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYWxjdWxhdGVGaW5hbFJhbmtpbmcoY29udGVudCwgdHlwZSwgYm9vc3RNdWx0aXBsaWVyID0gMSkge1xuICBjb25zdCBiYXNlU2NvcmUgPSBjYWxjdWxhdGVCYXNlU2NvcmUoY29udGVudCwgdHlwZSk7XG4gIGNvbnN0IGJvb3N0ZWRTY29yZSA9IGFwcGx5Qm9vc3QoYmFzZVNjb3JlLCBib29zdE11bHRpcGxpZXIpO1xuICBcbiAgLy8gRmF0dG9yaSBhZ2dpdW50aXZpIHRlbXBvcmFsaVxuICBjb25zdCB0aW1lRGVjYXkgPSBjYWxjdWxhdGVUaW1lRGVjYXkoY29udGVudC5jcmVhdGVkX2F0KTtcbiAgY29uc3QgZmluYWxTY29yZSA9IE1hdGgucm91bmQoYm9vc3RlZFNjb3JlICogdGltZURlY2F5KTtcbiAgXG4gIHJldHVybiB7XG4gICAgYmFzZVNjb3JlLFxuICAgIGJvb3N0TXVsdGlwbGllcixcbiAgICBib29zdGVkU2NvcmUsXG4gICAgdGltZURlY2F5LFxuICAgIGZpbmFsU2NvcmUsXG4gICAgdHlwZVxuICB9O1xufVxuXG4vKipcbiAqIENhbGNvbGEgZGVjYXkgdGVtcG9yYWxlIChjb250ZW51dG8gcGlcdTAwRjkgcmVjZW50ZSA9IHB1bnRlZ2dpbyBwaVx1MDBGOSBhbHRvKVxuICovXG5mdW5jdGlvbiBjYWxjdWxhdGVUaW1lRGVjYXkoY3JlYXRlZEF0KSB7XG4gIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IGNyZWF0ZWQgPSBuZXcgRGF0ZShjcmVhdGVkQXQpO1xuICBjb25zdCBob3Vyc0FnbyA9IChub3cgLSBjcmVhdGVkKSAvICgxMDAwICogNjAgKiA2MCk7XG4gIFxuICAvLyBEZWNheSBncmFkdWFsZTogMTAwJSBuZWxsZSBwcmltZSA0IG9yZSwgcG9pIGRlZ3JhZGFcbiAgaWYgKGhvdXJzQWdvIDw9IDQpIHJldHVybiAxLjA7XG4gIGlmIChob3Vyc0FnbyA8PSAxMikgcmV0dXJuIDAuOTtcbiAgaWYgKGhvdXJzQWdvIDw9IDI0KSByZXR1cm4gMC44O1xuICBpZiAoaG91cnNBZ28gPD0gNDgpIHJldHVybiAwLjc7XG4gIGlmIChob3Vyc0FnbyA8PSA3MikgcmV0dXJuIDAuNjtcbiAgcmV0dXJuIDAuNTsgLy8gTWluaW1vIDUwJSBhbmNoZSBwZXIgY29udGVudXRpIHZlY2NoaVxufVxuXG4vKipcbiAqIENvbmZyb250YSBkdWUgY29udGVudXRpIHBlciBvcmRpbmFtZW50byAoZGEgdXNhcmUgY29uIEFycmF5LnNvcnQpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wYXJlUmFua2luZ3MoYSwgYikge1xuICBjb25zdCByYW5raW5nQSA9IGNhbGN1bGF0ZUZpbmFsUmFua2luZyhhLmNvbnRlbnQsIGEudHlwZSwgYS5ib29zdE11bHRpcGxpZXIgfHwgMSk7XG4gIGNvbnN0IHJhbmtpbmdCID0gY2FsY3VsYXRlRmluYWxSYW5raW5nKGIuY29udGVudCwgYi50eXBlLCBiLmJvb3N0TXVsdGlwbGllciB8fCAxKTtcbiAgXG4gIHJldHVybiByYW5raW5nQi5maW5hbFNjb3JlIC0gcmFua2luZ0EuZmluYWxTY29yZTsgLy8gT3JkaW5lIGRlY3Jlc2NlbnRlXG59XG5cbi8qKlxuICogT3R0aWVuZSBjbGFzc2lmaWNhIGNvbXBsZXRhIGNvbiBkZXR0YWdsaSBkaSByYW5raW5nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRSYW5raW5nTGVhZGVyYm9hcmQoY29udGVudHMpIHtcbiAgcmV0dXJuIGNvbnRlbnRzXG4gICAgLm1hcChpdGVtID0+ICh7XG4gICAgICAuLi5pdGVtLFxuICAgICAgcmFua2luZzogY2FsY3VsYXRlRmluYWxSYW5raW5nKGl0ZW0uY29udGVudCwgaXRlbS50eXBlLCBpdGVtLmJvb3N0TXVsdGlwbGllciB8fCAxKVxuICAgIH0pKVxuICAgIC5zb3J0KChhLCBiKSA9PiBiLnJhbmtpbmcuZmluYWxTY29yZSAtIGEucmFua2luZy5maW5hbFNjb3JlKTtcbn0iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL3J1bm5lci93b3Jrc3BhY2Uvc2VydmVyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9ydW5uZXIvd29ya3NwYWNlL3NlcnZlci92aWV3ZXItdHJhY2tpbmcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvcnVubmVyL3dvcmtzcGFjZS9zZXJ2ZXIvdmlld2VyLXRyYWNraW5nLmpzXCI7LyoqXG4gKiBTaXN0ZW1hIGRpIHRyYWNraW5nIHNwZXR0YXRvcmkgaW4gdGVtcG8gcmVhbGUgcGVyIEJJRExpXG4gKiBDb2xsZWdhdG8gYWxsJ2FsZ29yaXRtbyBkaSBib29zdCBlIHJhbmtpbmdcbiAqL1xuXG5pbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tICdAc3VwYWJhc2Uvc3VwYWJhc2UtanMnO1xuXG5jb25zdCBzdXBhYmFzZSA9IGNyZWF0ZUNsaWVudChcbiAgcHJvY2Vzcy5lbnYuVklURV9TVVBBQkFTRV9VUkwsXG4gIHByb2Nlc3MuZW52LlZJVEVfU1VQQUJBU0VfQU5PTl9LRVlcbik7XG5cbi8vIENhY2hlIGluIG1lbW9yaWEgcGVyIHRyYWNraW5nIHZlbG9jZVxuY29uc3Qgdmlld2Vyc0NhY2hlID0gbmV3IE1hcCgpOyAvLyBsaXZlSWQgLT4gU2V0KHZpZXdlcklkcylcbmNvbnN0IGNsZWFudXBUaW1lcnMgPSBuZXcgTWFwKCk7IC8vIHZpZXdlcklkIC0+IHRpbWVvdXRJZFxuXG4vKipcbiAqIEFnZ2l1bmdlIHVubyBzcGV0dGF0b3JlIGFsbGEgbGl2ZVxuICovXG5hc3luYyBmdW5jdGlvbiBhZGRWaWV3ZXIobGl2ZUlkLCB2aWV3ZXJJZCkge1xuICB0cnkge1xuICAgIC8vIDEuIEFnZ2lvcm5hIGNhY2hlIGxvY2FsZVxuICAgIGlmICghdmlld2Vyc0NhY2hlLmhhcyhsaXZlSWQpKSB7XG4gICAgICB2aWV3ZXJzQ2FjaGUuc2V0KGxpdmVJZCwgbmV3IFNldCgpKTtcbiAgICB9XG4gICAgXG4gICAgY29uc3Qgdmlld2VycyA9IHZpZXdlcnNDYWNoZS5nZXQobGl2ZUlkKTtcbiAgICBjb25zdCB3YXNBbHJlYWR5V2F0Y2hpbmcgPSB2aWV3ZXJzLmhhcyh2aWV3ZXJJZCk7XG4gICAgXG4gICAgaWYgKCF3YXNBbHJlYWR5V2F0Y2hpbmcpIHtcbiAgICAgIHZpZXdlcnMuYWRkKHZpZXdlcklkKTtcbiAgICAgIFxuICAgICAgLy8gMi4gQWdnaW9ybmEgY29udGVnZ2lvIHZpZXdlcnMgZSB0b3RhbF92aWV3ZXJzXG4gICAgICBjb25zdCBuZXdDb3VudCA9IHZpZXdlcnMuc2l6ZTtcbiAgICAgIFxuICAgICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgLmZyb20oJ2xpdmVzJylcbiAgICAgICAgLnVwZGF0ZSh7IFxuICAgICAgICAgIHZpZXdlcnM6IG5ld0NvdW50XG4gICAgICAgIH0pXG4gICAgICAgIC5lcSgnaWQnLCBsaXZlSWQpXG4gICAgICAgIC5zZWxlY3QoJ3ZpZXdlcnMnKVxuICAgICAgICAubWF5YmVTaW5nbGUoKTtcbiAgICAgIFxuICAgICAgaWYgKGVycm9yIHx8ICFkYXRhKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihgXHUyNkEwXHVGRTBGIExpdmUgJHtsaXZlSWR9IG5vbiB0cm92YXRhIG5lbCBEQiwgbWFudGVuZ28gc29sbyBjYWNoZSBsb2NhbGVgKTtcbiAgICAgICAgY29uc29sZS53YXJuKCdFcnJvcmUgREI6JywgZXJyb3IpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgdmlld2VyczogbmV3Q291bnQsXG4gICAgICAgICAgdG90YWxWaWV3ZXJzOiBuZXdDb3VudFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgXG4gICAgICBjb25zb2xlLmxvZyhgXHVEODNEXHVEQ0M4IFNwZXR0YXRvcmUgYWdnaXVudG8gYWxsYSBsaXZlICR7bGl2ZUlkfTogJHtuZXdDb3VudH0gc3BldHRhdG9yaSBhdHR1YWxpYCk7XG4gICAgICBcbiAgICAgIC8vIDMuIENsZWFudXAgYXV0b21hdGljbyBkb3BvIDUgbWludXRpIGRpIGluYXR0aXZpdFx1MDBFMFxuICAgICAgc2NoZWR1bGVWaWV3ZXJDbGVhbnVwKGxpdmVJZCwgdmlld2VySWQpO1xuICAgICAgXG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICB2aWV3ZXJzOiBuZXdDb3VudCxcbiAgICAgICAgdG90YWxWaWV3ZXJzOiAwIC8vIFNlbXBsaWZpY2F0byBwZXIgb3JhXG4gICAgICB9O1xuICAgIH1cbiAgICBcbiAgICAvLyBSaW5ub3ZhIGNsZWFudXAgdGltZXIgc2UgZ2lcdTAwRTAgcHJlc2VudGVcbiAgICBzY2hlZHVsZVZpZXdlckNsZWFudXAobGl2ZUlkLCB2aWV3ZXJJZCk7XG4gICAgXG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICB2aWV3ZXJzOiB2aWV3ZXJzLnNpemUsXG4gICAgICB0b3RhbFZpZXdlcnM6IDBcbiAgICB9O1xuICAgIFxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUud2FybignXHUyNkEwXHVGRTBGIEVycm9yZSBhZ2dpdW50YSBzcGV0dGF0b3JlIChub24gY3JpdGljbyk6JywgZXJyb3IubWVzc2FnZSk7XG4gICAgLy8gRmFsbGJhY2s6IG1hbnRpZW5pIHNvbG8gY2FjaGUgbG9jYWxlXG4gICAgY29uc3Qgdmlld2VycyA9IHZpZXdlcnNDYWNoZS5nZXQobGl2ZUlkKSB8fCBuZXcgU2V0KCk7XG4gICAgcmV0dXJuIHsgXG4gICAgICBzdWNjZXNzOiB0cnVlLCBcbiAgICAgIHZpZXdlcnM6IHZpZXdlcnMuc2l6ZSxcbiAgICAgIHRvdGFsVmlld2VyczogMFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBSaW11b3ZlIHVubyBzcGV0dGF0b3JlIGRhbGxhIGxpdmVcbiAqL1xuYXN5bmMgZnVuY3Rpb24gcmVtb3ZlVmlld2VyKGxpdmVJZCwgdmlld2VySWQpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB2aWV3ZXJzID0gdmlld2Vyc0NhY2hlLmdldChsaXZlSWQpO1xuICAgIGlmICghdmlld2VycyB8fCAhdmlld2Vycy5oYXModmlld2VySWQpKSB7XG4gICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCB2aWV3ZXJzOiB2aWV3ZXJzPy5zaXplIHx8IDAgfTtcbiAgICB9XG4gICAgXG4gICAgLy8gMS4gUmltdW92aSBkYSBjYWNoZVxuICAgIHZpZXdlcnMuZGVsZXRlKHZpZXdlcklkKTtcbiAgICBcbiAgICAvLyAyLiBDYW5jZWxsYSBjbGVhbnVwIHRpbWVyXG4gICAgY29uc3QgdGltZXJJZCA9IGNsZWFudXBUaW1lcnMuZ2V0KGAke2xpdmVJZH0tJHt2aWV3ZXJJZH1gKTtcbiAgICBpZiAodGltZXJJZCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVySWQpO1xuICAgICAgY2xlYW51cFRpbWVycy5kZWxldGUoYCR7bGl2ZUlkfS0ke3ZpZXdlcklkfWApO1xuICAgIH1cbiAgICBcbiAgICAvLyAzLiBBZ2dpb3JuYSBkYXRhYmFzZVxuICAgIGNvbnN0IG5ld0NvdW50ID0gdmlld2Vycy5zaXplO1xuICAgIFxuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAuZnJvbSgnbGl2ZXMnKVxuICAgICAgLnVwZGF0ZSh7IHZpZXdlcnM6IG5ld0NvdW50IH0pXG4gICAgICAuZXEoJ2lkJywgbGl2ZUlkKVxuICAgICAgLnNlbGVjdCgndmlld2VycycpXG4gICAgICAuc2luZ2xlKCk7XG4gICAgXG4gICAgaWYgKGVycm9yKSB0aHJvdyBlcnJvcjtcbiAgICBcbiAgICBjb25zb2xlLmxvZyhgXHVEODNEXHVEQ0M5IFNwZXR0YXRvcmUgcmltb3NzbyBkYWxsYSBsaXZlICR7bGl2ZUlkfTogJHtuZXdDb3VudH0gc3BldHRhdG9yaSByaW1hbmVudGlgKTtcbiAgICBcbiAgICAvLyA0LiBSaWNhbGNvbGEgc2NvcmUgcGVyIGFsZ29yaXRtbyBib29zdFxuICAgIGF3YWl0IHVwZGF0ZUxpdmVSYW5raW5nKGxpdmVJZCwgbmV3Q291bnQpO1xuICAgIFxuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgdmlld2VyczogbmV3Q291bnRcbiAgICB9O1xuICAgIFxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1x1Mjc0QyBFcnJvcmUgcmltb3ppb25lIHNwZXR0YXRvcmU6JywgZXJyb3IpO1xuICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICB9XG59XG5cbi8qKlxuICogUHJvZ3JhbW1hIGxhIHJpbW96aW9uZSBhdXRvbWF0aWNhIGRpIHVubyBzcGV0dGF0b3JlIGRvcG8gaW5hdHRpdml0XHUwMEUwXG4gKi9cbmZ1bmN0aW9uIHNjaGVkdWxlVmlld2VyQ2xlYW51cChsaXZlSWQsIHZpZXdlcklkKSB7XG4gIGNvbnN0IGtleSA9IGAke2xpdmVJZH0tJHt2aWV3ZXJJZH1gO1xuICBcbiAgLy8gQ2FuY2VsbGEgdGltZXIgZXNpc3RlbnRlXG4gIGNvbnN0IGV4aXN0aW5nVGltZXIgPSBjbGVhbnVwVGltZXJzLmdldChrZXkpO1xuICBpZiAoZXhpc3RpbmdUaW1lcikge1xuICAgIGNsZWFyVGltZW91dChleGlzdGluZ1RpbWVyKTtcbiAgfVxuICBcbiAgLy8gTnVvdm8gdGltZXIgZGkgNSBtaW51dGlcbiAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KGFzeW5jICgpID0+IHtcbiAgICBjb25zb2xlLmxvZyhgXHVEODNFXHVEREY5IENsZWFudXAgYXV0b21hdGljbyBzcGV0dGF0b3JlICR7dmlld2VySWR9IGRhbGxhIGxpdmUgJHtsaXZlSWR9YCk7XG4gICAgYXdhaXQgcmVtb3ZlVmlld2VyKGxpdmVJZCwgdmlld2VySWQpO1xuICB9LCA1ICogNjAgKiAxMDAwKTsgLy8gNSBtaW51dGlcbiAgXG4gIGNsZWFudXBUaW1lcnMuc2V0KGtleSwgdGltZXIpO1xufVxuXG4vKipcbiAqIEFnZ2lvcm5hIGlsIHJhbmtpbmcgZGVsbGEgbGl2ZSBuZWxsJ2FsZ29yaXRtbyBib29zdFxuICovXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVMaXZlUmFua2luZyhsaXZlSWQsIHZpZXdlckNvdW50KSB7XG4gIHRyeSB7XG4gICAgLy8gQ2FyaWNhIGRhdGkgbGl2ZSBwZXIgY2FsY29sbyBzY29yZVxuICAgIGNvbnN0IHsgZGF0YTogbGl2ZSwgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAuZnJvbSgnbGl2ZXMnKVxuICAgICAgLnNlbGVjdCgnKicpXG4gICAgICAuZXEoJ2lkJywgbGl2ZUlkKVxuICAgICAgLnNpbmdsZSgpO1xuICAgIFxuICAgIGlmIChlcnJvcikgdGhyb3cgZXJyb3I7XG4gICAgXG4gICAgLy8gQ2FsY29sYSBudW92byBzY29yZSB1c2FuZG8gbCdhbGdvcml0bW8gZXNpc3RlbnRlXG4gICAgY29uc3QgeyBjYWxjdWxhdGVCYXNlU2NvcmUsIGFwcGx5Qm9vc3QgfSA9IGF3YWl0IGltcG9ydCgnLi4vc3JjL3V0aWxzL3JhbmtpbmdBbGdvcml0aG0uanMnKTtcbiAgICBcbiAgICAvLyBBZ2dpdW5naSB2aWV3ZXJfY291bnQgYWdnaW9ybmF0b1xuICAgIGNvbnN0IGxpdmVXaXRoVmlld2VycyA9IHtcbiAgICAgIC4uLmxpdmUsXG4gICAgICB2aWV3ZXJfY291bnQ6IHZpZXdlckNvdW50XG4gICAgfTtcbiAgICBcbiAgICBjb25zdCBiYXNlU2NvcmUgPSBjYWxjdWxhdGVCYXNlU2NvcmUobGl2ZVdpdGhWaWV3ZXJzLCAnbGl2ZV9zdHJlYW0nKTtcbiAgICBcbiAgICAvLyBDb250cm9sbGEgc2UgaGEgYm9vc3QgYXR0aXZpXG4gICAgY29uc3QgeyBkYXRhOiBhY3RpdmVCb29zdHMgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAuZnJvbSgnYm9vc3RfY2FtcGFpZ25zJylcbiAgICAgIC5zZWxlY3QoJ2Jvb3N0X211bHRpcGxpZXIsIGV4cGlyZXNfYXQnKVxuICAgICAgLmVxKCdjb250ZW50X3R5cGUnLCAnbGl2ZScpXG4gICAgICAuZXEoJ2NvbnRlbnRfaWQnLCBsaXZlSWQpXG4gICAgICAuZXEoJ3N0YXR1cycsICdhY3RpdmUnKVxuICAgICAgLmd0KCdleHBpcmVzX2F0JywgbmV3IERhdGUoKS50b0lTT1N0cmluZygpKTtcbiAgICBcbiAgICBsZXQgZmluYWxTY29yZSA9IGJhc2VTY29yZTtcbiAgICBpZiAoYWN0aXZlQm9vc3RzICYmIGFjdGl2ZUJvb3N0cy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBib29zdCA9IGFjdGl2ZUJvb3N0c1swXTtcbiAgICAgIGZpbmFsU2NvcmUgPSBhcHBseUJvb3N0KGJhc2VTY29yZSwgYm9vc3QuYm9vc3RfbXVsdGlwbGllcik7XG4gICAgfVxuICAgIFxuICAgIC8vIEFnZ2lvcm5hIHJhbmtpbmcgc2NvcmUgbmVsIGRhdGFiYXNlIChzZSBoYWkgdW5hIHRhYmVsbGEgcmFua2luZ3MpXG4gICAgY29uc29sZS5sb2coYFx1RDgzRFx1REU4MCBTY29yZSBhZ2dpb3JuYXRvIHBlciBsaXZlICR7bGl2ZUlkfTogJHtmaW5hbFNjb3JlfSAoJHt2aWV3ZXJDb3VudH0gc3BldHRhdG9yaSlgKTtcbiAgICBcbiAgICByZXR1cm4gZmluYWxTY29yZTtcbiAgICBcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdcdTI3NEMgRXJyb3JlIGFnZ2lvcm5hbWVudG8gcmFua2luZzonLCBlcnJvcik7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBPdHRpZW5pIHN0YXRpc3RpY2hlIHNwZXR0YXRvcmkgcGVyIHVuYSBsaXZlXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGdldFZpZXdlclN0YXRzKGxpdmVJZCkge1xuICB0cnkge1xuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAuZnJvbSgnbGl2ZXMnKVxuICAgICAgLnNlbGVjdCgndmlld2VycycpXG4gICAgICAuZXEoJ2lkJywgbGl2ZUlkKVxuICAgICAgLm1heWJlU2luZ2xlKCk7IC8vIENPUlJFWklPTkU6IHVzYSBtYXliZVNpbmdsZSgpIGludmVjZSBkaSBzaW5nbGUoKSBwZXIgZXZpdGFyZSBlcnJvcmkgc3UgcmlnaGUgdnVvdGVcbiAgICBcbiAgICAvLyBTZSBub24gYydcdTAwRTggZXJyb3JlIG1hIG5lbW1lbm8gZGF0aSwgdXNhIHNvbG8gY2FjaGVcbiAgICBpZiAoZXJyb3IgJiYgZXJyb3IuY29kZSAhPT0gJ1BHUlNUMTE2Jykge1xuICAgICAgdGhyb3cgZXJyb3I7IC8vIFNvbG8gZXJyb3JpIHZlcmksIG5vbiBcIm5vIHJvd3NcIlxuICAgIH1cbiAgICBcbiAgICBjb25zdCBjdXJyZW50ID0gdmlld2Vyc0NhY2hlLmdldChsaXZlSWQpPy5zaXplIHx8IDA7XG4gICAgXG4gICAgcmV0dXJuIHtcbiAgICAgIGN1cnJlbnQ6IE1hdGgubWF4KGN1cnJlbnQsIGRhdGE/LnZpZXdlcnMgfHwgMCksXG4gICAgICB0b3RhbDogMCwgLy8gU2ltcGxpZmllZCBmb3Igbm93IHRvIGF2b2lkIERCIGVycm9yc1xuICAgICAgY2FjaGVkOiBjdXJyZW50XG4gICAgfTtcbiAgICBcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAvLyBTb2xvIGxvZ2dhIHNlIFx1MDBFOCB1biBlcnJvcmUgZGl2ZXJzbyBkYSBcIm5vIHJvd3MgZm91bmRcIlxuICAgIGlmIChlcnJvci5jb2RlICE9PSAnUEdSU1QxMTYnKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdcdTI3NEMgRXJyb3JlIHN0YXRzIHNwZXR0YXRvcmk6JywgZXJyb3IpO1xuICAgIH1cbiAgICByZXR1cm4geyBjdXJyZW50OiAwLCB0b3RhbDogMCwgY2FjaGVkOiAwIH07XG4gIH1cbn1cblxuLyoqXG4gKiBDbGVhbnVwIGdsb2JhbGUgcGVyIGxpdmUgdGVybWluYXRlXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNsZWFudXBMaXZlKGxpdmVJZCkge1xuICBjb25zb2xlLmxvZyhgXHVEODNFXHVEREY5IENsZWFudXAgY29tcGxldG8gbGl2ZSAke2xpdmVJZH1gKTtcbiAgXG4gIC8vIFJpbXVvdmkgdHV0dGkgZ2xpIHNwZXR0YXRvcmkgZGFsbGEgY2FjaGVcbiAgY29uc3Qgdmlld2VycyA9IHZpZXdlcnNDYWNoZS5nZXQobGl2ZUlkKTtcbiAgaWYgKHZpZXdlcnMpIHtcbiAgICBmb3IgKGNvbnN0IHZpZXdlcklkIG9mIHZpZXdlcnMpIHtcbiAgICAgIGNvbnN0IGtleSA9IGAke2xpdmVJZH0tJHt2aWV3ZXJJZH1gO1xuICAgICAgY29uc3QgdGltZXIgPSBjbGVhbnVwVGltZXJzLmdldChrZXkpO1xuICAgICAgaWYgKHRpbWVyKSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgIGNsZWFudXBUaW1lcnMuZGVsZXRlKGtleSk7XG4gICAgICB9XG4gICAgfVxuICAgIHZpZXdlcnNDYWNoZS5kZWxldGUobGl2ZUlkKTtcbiAgfVxuICBcbiAgLy8gQXp6ZXJhIGNvbnRhdG9yaSBuZWwgZGF0YWJhc2VcbiAgYXdhaXQgc3VwYWJhc2VcbiAgICAuZnJvbSgnbGl2ZXMnKVxuICAgIC51cGRhdGUoeyB2aWV3ZXJzOiAwIH0pXG4gICAgLmVxKCdpZCcsIGxpdmVJZCk7XG59XG5cbmV4cG9ydCB7XG4gIGFkZFZpZXdlcixcbiAgcmVtb3ZlVmlld2VyLFxuICBnZXRWaWV3ZXJTdGF0cyxcbiAgY2xlYW51cExpdmVcbn07IiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9ydW5uZXIvd29ya3NwYWNlL3NyYy9saWJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL3J1bm5lci93b3Jrc3BhY2Uvc3JjL2xpYi9zdXBhYmFzZUNsaWVudC5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9ydW5uZXIvd29ya3NwYWNlL3NyYy9saWIvc3VwYWJhc2VDbGllbnQuanNcIjtpbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tIFwiQHN1cGFiYXNlL3N1cGFiYXNlLWpzXCI7XG5cbmNvbnN0IFNJVEVfVVJMID0gXCJodHRwczovL2JpZGxpLmxpdmVcIjtcblxuZXhwb3J0IGNvbnN0IHN1cGFiYXNlID0gY3JlYXRlQ2xpZW50KFxuICBpbXBvcnQubWV0YS5lbnYuVklURV9TVVBBQkFTRV9VUkwsXG4gIGltcG9ydC5tZXRhLmVudi5WSVRFX1NVUEFCQVNFX0FOT05fS0VZLFxuICB7XG4gICAgYXV0aDoge1xuICAgICAgYXV0b1JlZnJlc2hUb2tlbjogdHJ1ZSxcbiAgICAgIHBlcnNpc3RTZXNzaW9uOiB0cnVlLFxuICAgICAgZGV0ZWN0U2Vzc2lvbkluVXJsOiB0cnVlLFxuICAgICAgLy8gRm9yemEgbCdVUkwgZGVsIHNpdG8gcGVyIGxlIGVtYWlsXG4gICAgICBzaXRlVXJsOiBTSVRFX1VSTCxcbiAgICAgIHJlZGlyZWN0VG86IGAke1NJVEVfVVJMfS9hdXRoYFxuICAgIH0sXG4gICAgZ2xvYmFsOiB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdYLVNpdGUtVVJMJzogU0lURV9VUkxcbiAgICAgIH1cbiAgICB9XG4gIH1cbik7XG5cbmV4cG9ydCB7IFNJVEVfVVJMIH07IiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9ydW5uZXIvd29ya3NwYWNlL3NlcnZlclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvcnVubmVyL3dvcmtzcGFjZS9zZXJ2ZXIvc29jaWFsLWFwaS5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9ydW5uZXIvd29ya3NwYWNlL3NlcnZlci9zb2NpYWwtYXBpLmpzXCI7LyoqXG4gKiBBUEkgRW5kcG9pbnRzIHBlciBpbCBzaXN0ZW1hIHNvY2lhbCBkaSBCSURMaVxuICogR2VzdGlzY2UgZm9sbG93cywgcG9zdHMsIHN0b3JpZXMsIG5vdGlmaWNoZVxuICovXG5cbmltcG9ydCB7IHN1cGFiYXNlIH0gZnJvbSAnLi4vc3JjL2xpYi9zdXBhYmFzZUNsaWVudC5qcyc7XG5cbi8qKlxuICogPT09IEZPTExPV0VSIFNZU1RFTSA9PT1cbiAqL1xuXG4vLyBGb2xsb3cvVW5mb2xsb3cgdXRlbnRlXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdG9nZ2xlRm9sbG93KGZvbGxvd2VySWQsIGZvbGxvd2luZ0lkKSB7XG4gIHRyeSB7XG4gICAgaWYgKGZvbGxvd2VySWQgPT09IGZvbGxvd2luZ0lkKSB7XG4gICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdOb24gcHVvaSBzZWd1aXJlIHRlIHN0ZXNzbycgfTtcbiAgICB9XG5cbiAgICAvLyBDb250cm9sbGEgc2UgZ2lcdTAwRTAgc2VndWVcbiAgICBjb25zdCB7IGRhdGE6IGV4aXN0aW5nIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgLmZyb20oJ2ZvbGxvd3MnKVxuICAgICAgLnNlbGVjdCgnaWQnKVxuICAgICAgLmVxKCdmb2xsb3dlcl9pZCcsIGZvbGxvd2VySWQpXG4gICAgICAuZXEoJ2ZvbGxvd2luZ19pZCcsIGZvbGxvd2luZ0lkKVxuICAgICAgLnNpbmdsZSgpO1xuXG4gICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICAvLyBVbmZvbGxvd1xuICAgICAgYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgLmZyb20oJ2ZvbGxvd3MnKVxuICAgICAgICAuZGVsZXRlKClcbiAgICAgICAgLmVxKCdmb2xsb3dlcl9pZCcsIGZvbGxvd2VySWQpXG4gICAgICAgIC5lcSgnZm9sbG93aW5nX2lkJywgZm9sbG93aW5nSWQpO1xuXG4gICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246ICd1bmZvbGxvd2VkJyB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGb2xsb3dcbiAgICAgIGF3YWl0IHN1cGFiYXNlXG4gICAgICAgIC5mcm9tKCdmb2xsb3dzJylcbiAgICAgICAgLmluc2VydCh7IGZvbGxvd2VyX2lkOiBmb2xsb3dlcklkLCBmb2xsb3dpbmdfaWQ6IGZvbGxvd2luZ0lkIH0pO1xuXG4gICAgICAvLyBDcmVhIG5vdGlmaWNhXG4gICAgICBhd2FpdCBjcmVhdGVOb3RpZmljYXRpb24oe1xuICAgICAgICB1c2VyX2lkOiBmb2xsb3dpbmdJZCxcbiAgICAgICAgYWN0b3JfaWQ6IGZvbGxvd2VySWQsXG4gICAgICAgIHR5cGU6ICdmb2xsb3cnLFxuICAgICAgICB0aXRsZTogJ051b3ZvIGZvbGxvd2VyIScsXG4gICAgICAgIG1lc3NhZ2U6ICdIYSBpbml6aWF0byBhIHNlZ3VpcnRpJyxcbiAgICAgICAgYWN0aW9uX3VybDogYC9wcm9maWxlLyR7Zm9sbG93ZXJJZH1gXG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiAnZm9sbG93ZWQnIH07XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1RvZ2dsZSBmb2xsb3cgZXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICB9XG59XG5cbi8vIE90dGllbmkgc3RhdGlzdGljaGUgZm9sbG93ZXJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRVc2VyU29jaWFsU3RhdHModXNlcklkKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgW2ZvbGxvd2Vyc1Jlc3VsdCwgZm9sbG93aW5nUmVzdWx0XSA9IGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgIHN1cGFiYXNlXG4gICAgICAgIC5mcm9tKCdmb2xsb3dzJylcbiAgICAgICAgLnNlbGVjdCgnaWQnKVxuICAgICAgICAuZXEoJ2ZvbGxvd2luZ19pZCcsIHVzZXJJZCksXG4gICAgICBzdXBhYmFzZVxuICAgICAgICAuZnJvbSgnZm9sbG93cycpXG4gICAgICAgIC5zZWxlY3QoJ2lkJylcbiAgICAgICAgLmVxKCdmb2xsb3dlcl9pZCcsIHVzZXJJZClcbiAgICBdKTtcblxuICAgIHJldHVybiB7XG4gICAgICBmb2xsb3dlcnNfY291bnQ6IGZvbGxvd2Vyc1Jlc3VsdC5kYXRhPy5sZW5ndGggfHwgMCxcbiAgICAgIGZvbGxvd2luZ19jb3VudDogZm9sbG93aW5nUmVzdWx0LmRhdGE/Lmxlbmd0aCB8fCAwXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdHZXQgc29jaWFsIHN0YXRzIGVycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4geyBmb2xsb3dlcnNfY291bnQ6IDAsIGZvbGxvd2luZ19jb3VudDogMCB9O1xuICB9XG59XG5cbi8vIENvbnRyb2xsYSBzZSB1biB1dGVudGUgc2VndWUgdW4gYWx0cm9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja0lmRm9sbG93aW5nKGZvbGxvd2VySWQsIGZvbGxvd2luZ0lkKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgLmZyb20oJ2ZvbGxvd3MnKVxuICAgICAgLnNlbGVjdCgnaWQnKVxuICAgICAgLmVxKCdmb2xsb3dlcl9pZCcsIGZvbGxvd2VySWQpXG4gICAgICAuZXEoJ2ZvbGxvd2luZ19pZCcsIGZvbGxvd2luZ0lkKVxuICAgICAgLnNpbmdsZSgpO1xuXG4gICAgcmV0dXJuICEhZGF0YTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiA9PT0gUE9TVCBTWVNURU0gPT09XG4gKi9cblxuLy8gQ3JlYSBudW92byBwb3N0IHNvY2lhbFxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVNvY2lhbFBvc3QocG9zdERhdGEpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IGRhdGE6IHBvc3QsIGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgLmZyb20oJ3NvY2lhbF9wb3N0cycpXG4gICAgICAuaW5zZXJ0KHtcbiAgICAgICAgdXNlcl9pZDogcG9zdERhdGEudXNlcl9pZCxcbiAgICAgICAgY29udGVudDogcG9zdERhdGEuY29udGVudCxcbiAgICAgICAgaW1hZ2VzOiBwb3N0RGF0YS5pbWFnZXMgfHwgW10sXG4gICAgICAgIGxpdmVfaWQ6IHBvc3REYXRhLmxpdmVfaWQgfHwgbnVsbFxuICAgICAgfSlcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLnNpbmdsZSgpO1xuXG4gICAgaWYgKGVycm9yKSB0aHJvdyBlcnJvcjtcblxuICAgIC8vIE5vdGlmaWNhIGkgZm9sbG93ZXIgZGVsIG51b3ZvIHBvc3RcbiAgICBhd2FpdCBub3RpZnlGb2xsb3dlcnNPZk5ld1Bvc3QocG9zdERhdGEudXNlcl9pZCwgcG9zdC5pZCk7XG5cbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBwb3N0IH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignQ3JlYXRlIHBvc3QgZXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICB9XG59XG5cbi8vIE90dGllbmkgcG9zdCBkaSB1biB1dGVudGVcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRVc2VyUG9zdHModXNlcklkLCBsaW1pdCA9IDIwLCBvZmZzZXQgPSAwKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgeyBkYXRhOiBwb3N0cywgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAuZnJvbSgnc29jaWFsX3Bvc3RzJylcbiAgICAgIC5zZWxlY3QoYFxuICAgICAgICAqLFxuICAgICAgICB1c2VyOnVzZXJfaWQgKFxuICAgICAgICAgIGlkLCB1c2VybmFtZSwgZmlyc3RfbmFtZSwgbGFzdF9uYW1lLCBwcm9maWxlX3BpY3R1cmVcbiAgICAgICAgKSxcbiAgICAgICAgbGl2ZTpsaXZlX2lkIChcbiAgICAgICAgICBpZCwgdGl0bGUsIHN0YXR1c1xuICAgICAgICApXG4gICAgICBgKVxuICAgICAgLmVxKCd1c2VyX2lkJywgdXNlcklkKVxuICAgICAgLmVxKCdzdGF0dXMnLCAncHVibGlzaGVkJylcbiAgICAgIC5vcmRlcignY3JlYXRlZF9hdCcsIHsgYXNjZW5kaW5nOiBmYWxzZSB9KVxuICAgICAgLnJhbmdlKG9mZnNldCwgb2Zmc2V0ICsgbGltaXQgLSAxKTtcblxuICAgIGlmIChlcnJvcikgdGhyb3cgZXJyb3I7XG5cbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBwb3N0czogcG9zdHMgfHwgW10gfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdHZXQgdXNlciBwb3N0cyBlcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIHBvc3RzOiBbXSB9O1xuICB9XG59XG5cbi8vIE90dGllbmkgZmVlZCBwb3N0IHBlciBob21lcGFnZVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFBvc3RzRmVlZCh1c2VySWQsIGxpbWl0ID0gMjAsIG9mZnNldCA9IDApIHtcbiAgdHJ5IHtcbiAgICAvLyBTZSBsJ3V0ZW50ZSBcdTAwRTggbG9nZ2F0bywgbW9zdHJhIHBvc3QgZGkgY2hpIHNlZ3VlICsgcG9zdCBwb3BvbGFyaVxuICAgIC8vIFNlIG5vbiBcdTAwRTggbG9nZ2F0bywgbW9zdHJhIHNvbG8gcG9zdCBwb3BvbGFyaVxuICAgIFxuICAgIGxldCBxdWVyeSA9IHN1cGFiYXNlXG4gICAgICAuZnJvbSgnc29jaWFsX3Bvc3RzJylcbiAgICAgIC5zZWxlY3QoYFxuICAgICAgICAqLFxuICAgICAgICB1c2VyOnVzZXJfaWQgKFxuICAgICAgICAgIGlkLCB1c2VybmFtZSwgZmlyc3RfbmFtZSwgbGFzdF9uYW1lLCBwcm9maWxlX3BpY3R1cmVcbiAgICAgICAgKSxcbiAgICAgICAgbGl2ZTpsaXZlX2lkIChcbiAgICAgICAgICBpZCwgdGl0bGUsIHN0YXR1c1xuICAgICAgICApXG4gICAgICBgKVxuICAgICAgLmVxKCdzdGF0dXMnLCAncHVibGlzaGVkJyk7XG5cbiAgICBpZiAodXNlcklkKSB7XG4gICAgICAvLyBPdHRpZW5pIElEIGRlZ2xpIHV0ZW50aSBzZWd1aXRpXG4gICAgICBjb25zdCB7IGRhdGE6IGZvbGxvd2luZyB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgLmZyb20oJ2ZvbGxvd3MnKVxuICAgICAgICAuc2VsZWN0KCdmb2xsb3dpbmdfaWQnKVxuICAgICAgICAuZXEoJ2ZvbGxvd2VyX2lkJywgdXNlcklkKTtcblxuICAgICAgY29uc3QgZm9sbG93aW5nSWRzID0gZm9sbG93aW5nPy5tYXAoZiA9PiBmLmZvbGxvd2luZ19pZCkgfHwgW107XG4gICAgICBcbiAgICAgIGlmIChmb2xsb3dpbmdJZHMubGVuZ3RoID4gMCkge1xuICAgICAgICBxdWVyeSA9IHF1ZXJ5LmluKCd1c2VyX2lkJywgZm9sbG93aW5nSWRzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB7IGRhdGE6IHBvc3RzLCBlcnJvciB9ID0gYXdhaXQgcXVlcnlcbiAgICAgIC5vcmRlcignY3JlYXRlZF9hdCcsIHsgYXNjZW5kaW5nOiBmYWxzZSB9KVxuICAgICAgLnJhbmdlKG9mZnNldCwgb2Zmc2V0ICsgbGltaXQgLSAxKTtcblxuICAgIGlmIChlcnJvcikgdGhyb3cgZXJyb3I7XG5cbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBwb3N0czogcG9zdHMgfHwgW10gfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdHZXQgcG9zdHMgZmVlZCBlcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIHBvc3RzOiBbXSB9O1xuICB9XG59XG5cbi8vIExpa2UvVW5saWtlIHBvc3RcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB0b2dnbGVQb3N0TGlrZShwb3N0SWQsIHVzZXJJZCkge1xuICB0cnkge1xuICAgIGNvbnN0IHsgZGF0YTogZXhpc3RpbmcgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAuZnJvbSgncG9zdF9saWtlcycpXG4gICAgICAuc2VsZWN0KCdpZCcpXG4gICAgICAuZXEoJ3Bvc3RfaWQnLCBwb3N0SWQpXG4gICAgICAuZXEoJ3VzZXJfaWQnLCB1c2VySWQpXG4gICAgICAuc2luZ2xlKCk7XG5cbiAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgIC8vIFVubGlrZVxuICAgICAgYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgLmZyb20oJ3Bvc3RfbGlrZXMnKVxuICAgICAgICAuZGVsZXRlKClcbiAgICAgICAgLmVxKCdwb3N0X2lkJywgcG9zdElkKVxuICAgICAgICAuZXEoJ3VzZXJfaWQnLCB1c2VySWQpO1xuXG4gICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBhY3Rpb246ICd1bmxpa2VkJyB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBMaWtlXG4gICAgICBhd2FpdCBzdXBhYmFzZVxuICAgICAgICAuZnJvbSgncG9zdF9saWtlcycpXG4gICAgICAgIC5pbnNlcnQoeyBwb3N0X2lkOiBwb3N0SWQsIHVzZXJfaWQ6IHVzZXJJZCB9KTtcblxuICAgICAgLy8gTm90aWZpY2EgbCdhdXRvcmUgZGVsIHBvc3RcbiAgICAgIGNvbnN0IHsgZGF0YTogcG9zdCB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgLmZyb20oJ3NvY2lhbF9wb3N0cycpXG4gICAgICAgIC5zZWxlY3QoJ3VzZXJfaWQnKVxuICAgICAgICAuZXEoJ2lkJywgcG9zdElkKVxuICAgICAgICAuc2luZ2xlKCk7XG5cbiAgICAgIGlmIChwb3N0ICYmIHBvc3QudXNlcl9pZCAhPT0gdXNlcklkKSB7XG4gICAgICAgIGF3YWl0IGNyZWF0ZU5vdGlmaWNhdGlvbih7XG4gICAgICAgICAgdXNlcl9pZDogcG9zdC51c2VyX2lkLFxuICAgICAgICAgIGFjdG9yX2lkOiB1c2VySWQsXG4gICAgICAgICAgdHlwZTogJ2xpa2UnLFxuICAgICAgICAgIHRpdGxlOiAnTnVvdm8gbGlrZSEnLFxuICAgICAgICAgIG1lc3NhZ2U6ICdIYSBtZXNzbyBsaWtlIGFsIHR1byBwb3N0JyxcbiAgICAgICAgICBhY3Rpb25fdXJsOiBgL3Bvc3QvJHtwb3N0SWR9YFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgYWN0aW9uOiAnbGlrZWQnIH07XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1RvZ2dsZSBsaWtlIGVycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgfVxufVxuXG4vKipcbiAqID09PSBTVE9SSUVTIFNZU1RFTSA9PT1cbiAqL1xuXG4vLyBDcmVhIG51b3ZhIHN0b3J5XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlU3Rvcnkoc3RvcnlEYXRhKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgeyBkYXRhOiBzdG9yeSwgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAuZnJvbSgnc3RvcmllcycpXG4gICAgICAuaW5zZXJ0KHtcbiAgICAgICAgdXNlcl9pZDogc3RvcnlEYXRhLnVzZXJfaWQsXG4gICAgICAgIG1lZGlhX3VybDogc3RvcnlEYXRhLm1lZGlhX3VybCxcbiAgICAgICAgbWVkaWFfdHlwZTogc3RvcnlEYXRhLm1lZGlhX3R5cGUgfHwgJ2ltYWdlJyxcbiAgICAgICAgdGV4dF9vdmVybGF5OiBzdG9yeURhdGEudGV4dF9vdmVybGF5IHx8IG51bGwsXG4gICAgICAgIGJhY2tncm91bmRfY29sb3I6IHN0b3J5RGF0YS5iYWNrZ3JvdW5kX2NvbG9yIHx8ICcjMDAwMDAwJ1xuICAgICAgfSlcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLnNpbmdsZSgpO1xuXG4gICAgaWYgKGVycm9yKSB0aHJvdyBlcnJvcjtcblxuICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIHN0b3J5IH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignQ3JlYXRlIHN0b3J5IGVycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgfVxufVxuXG4vLyBPdHRpZW5pIHN0b3JpZXMgYXR0aXZlIGRpIHVuIHV0ZW50ZVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFVzZXJTdG9yaWVzKHVzZXJJZCkge1xuICB0cnkge1xuICAgIGNvbnN0IHsgZGF0YTogc3RvcmllcywgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAuZnJvbSgnc3RvcmllcycpXG4gICAgICAuc2VsZWN0KGBcbiAgICAgICAgKixcbiAgICAgICAgdXNlcjp1c2VyX2lkIChcbiAgICAgICAgICBpZCwgdXNlcm5hbWUsIGZpcnN0X25hbWUsIGxhc3RfbmFtZSwgcHJvZmlsZV9waWN0dXJlXG4gICAgICAgIClcbiAgICAgIGApXG4gICAgICAuZXEoJ3VzZXJfaWQnLCB1c2VySWQpXG4gICAgICAuZ3QoJ2V4cGlyZXNfYXQnLCBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkpXG4gICAgICAub3JkZXIoJ2NyZWF0ZWRfYXQnLCB7IGFzY2VuZGluZzogZmFsc2UgfSk7XG5cbiAgICBpZiAoZXJyb3IpIHRocm93IGVycm9yO1xuXG4gICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgc3Rvcmllczogc3RvcmllcyB8fCBbXSB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0dldCB1c2VyIHN0b3JpZXMgZXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBzdG9yaWVzOiBbXSB9O1xuICB9XG59XG5cbi8vIE90dGllbmkgc3RvcmllcyBkaSB1dGVudGkgc2VndWl0aSBwZXIgaG9tZXBhZ2VcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRGb2xsb3dpbmdTdG9yaWVzKHVzZXJJZCkge1xuICB0cnkge1xuICAgIC8vIE90dGllbmkgSUQgZGVnbGkgdXRlbnRpIHNlZ3VpdGlcbiAgICBjb25zdCB7IGRhdGE6IGZvbGxvd2luZyB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKCdmb2xsb3dzJylcbiAgICAgIC5zZWxlY3QoJ2ZvbGxvd2luZ19pZCcpXG4gICAgICAuZXEoJ2ZvbGxvd2VyX2lkJywgdXNlcklkKTtcblxuICAgIGNvbnN0IGZvbGxvd2luZ0lkcyA9IGZvbGxvd2luZz8ubWFwKGYgPT4gZi5mb2xsb3dpbmdfaWQpIHx8IFtdO1xuICAgIFxuICAgIGlmIChmb2xsb3dpbmdJZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBzdG9yaWVzOiBbXSB9O1xuICAgIH1cblxuICAgIGNvbnN0IHsgZGF0YTogc3RvcmllcywgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAuZnJvbSgnc3RvcmllcycpXG4gICAgICAuc2VsZWN0KGBcbiAgICAgICAgKixcbiAgICAgICAgdXNlcjp1c2VyX2lkIChcbiAgICAgICAgICBpZCwgdXNlcm5hbWUsIGZpcnN0X25hbWUsIGxhc3RfbmFtZSwgcHJvZmlsZV9waWN0dXJlXG4gICAgICAgIClcbiAgICAgIGApXG4gICAgICAuaW4oJ3VzZXJfaWQnLCBmb2xsb3dpbmdJZHMpXG4gICAgICAuZ3QoJ2V4cGlyZXNfYXQnLCBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkpXG4gICAgICAub3JkZXIoJ2NyZWF0ZWRfYXQnLCB7IGFzY2VuZGluZzogZmFsc2UgfSk7XG5cbiAgICBpZiAoZXJyb3IpIHRocm93IGVycm9yO1xuXG4gICAgLy8gUmFnZ3J1cHBhIHBlciB1dGVudGVcbiAgICBjb25zdCBzdG9yaWVzQnlVc2VyID0ge307XG4gICAgc3Rvcmllcz8uZm9yRWFjaChzdG9yeSA9PiB7XG4gICAgICBpZiAoIXN0b3JpZXNCeVVzZXJbc3RvcnkudXNlcl9pZF0pIHtcbiAgICAgICAgc3Rvcmllc0J5VXNlcltzdG9yeS51c2VyX2lkXSA9IHtcbiAgICAgICAgICB1c2VyOiBzdG9yeS51c2VyLFxuICAgICAgICAgIHN0b3JpZXM6IFtdXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBzdG9yaWVzQnlVc2VyW3N0b3J5LnVzZXJfaWRdLnN0b3JpZXMucHVzaChzdG9yeSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBzdG9yaWVzOiBPYmplY3QudmFsdWVzKHN0b3JpZXNCeVVzZXIpIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignR2V0IGZvbGxvd2luZyBzdG9yaWVzIGVycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgc3RvcmllczogW10gfTtcbiAgfVxufVxuXG4vKipcbiAqID09PSBOT1RJRklDQVRJT05TIFNZU1RFTSA9PT1cbiAqL1xuXG4vLyBDcmVhIG5vdGlmaWNhXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlTm90aWZpY2F0aW9uKG5vdGlmaWNhdGlvbkRhdGEpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgLmZyb20oJ25vdGlmaWNhdGlvbnMnKVxuICAgICAgLmluc2VydChub3RpZmljYXRpb25EYXRhKVxuICAgICAgLnNlbGVjdCgpXG4gICAgICAuc2luZ2xlKCk7XG5cbiAgICBpZiAoZXJyb3IpIHRocm93IGVycm9yO1xuXG4gICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbm90aWZpY2F0aW9uOiBkYXRhIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignQ3JlYXRlIG5vdGlmaWNhdGlvbiBlcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gIH1cbn1cblxuLy8gT3R0aWVuaSBub3RpZmljaGUgdXRlbnRlXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0VXNlck5vdGlmaWNhdGlvbnModXNlcklkLCBsaW1pdCA9IDUwLCB1bnJlYWRPbmx5ID0gZmFsc2UpIHtcbiAgdHJ5IHtcbiAgICBsZXQgcXVlcnkgPSBzdXBhYmFzZVxuICAgICAgLmZyb20oJ25vdGlmaWNhdGlvbnMnKVxuICAgICAgLnNlbGVjdChgXG4gICAgICAgICosXG4gICAgICAgIGFjdG9yOmFjdG9yX2lkIChcbiAgICAgICAgICBpZCwgdXNlcm5hbWUsIGZpcnN0X25hbWUsIGxhc3RfbmFtZSwgcHJvZmlsZV9waWN0dXJlXG4gICAgICAgIClcbiAgICAgIGApXG4gICAgICAuZXEoJ3VzZXJfaWQnLCB1c2VySWQpO1xuXG4gICAgaWYgKHVucmVhZE9ubHkpIHtcbiAgICAgIHF1ZXJ5ID0gcXVlcnkuZXEoJ2lzX3JlYWQnLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgY29uc3QgeyBkYXRhOiBub3RpZmljYXRpb25zLCBlcnJvciB9ID0gYXdhaXQgcXVlcnlcbiAgICAgIC5vcmRlcignY3JlYXRlZF9hdCcsIHsgYXNjZW5kaW5nOiBmYWxzZSB9KVxuICAgICAgLmxpbWl0KGxpbWl0KTtcblxuICAgIGlmIChlcnJvcikgdGhyb3cgZXJyb3I7XG5cbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBub3RpZmljYXRpb25zOiBub3RpZmljYXRpb25zIHx8IFtdIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignR2V0IG5vdGlmaWNhdGlvbnMgZXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBub3RpZmljYXRpb25zOiBbXSB9O1xuICB9XG59XG5cbi8vIE1hcmNhIG5vdGlmaWNhIGNvbWUgbGV0dGFcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtYXJrTm90aWZpY2F0aW9uQXNSZWFkKG5vdGlmaWNhdGlvbklkLCB1c2VySWQpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgLmZyb20oJ25vdGlmaWNhdGlvbnMnKVxuICAgICAgLnVwZGF0ZSh7IGlzX3JlYWQ6IHRydWUgfSlcbiAgICAgIC5lcSgnaWQnLCBub3RpZmljYXRpb25JZClcbiAgICAgIC5lcSgndXNlcl9pZCcsIHVzZXJJZCk7XG5cbiAgICBpZiAoZXJyb3IpIHRocm93IGVycm9yO1xuXG4gICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ01hcmsgbm90aWZpY2F0aW9uIHJlYWQgZXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICB9XG59XG5cbi8vIENvbnRhIG5vdGlmaWNoZSBub24gbGV0dGVcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRVbnJlYWROb3RpZmljYXRpb25zQ291bnQodXNlcklkKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgeyBjb3VudCwgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAuZnJvbSgnbm90aWZpY2F0aW9ucycpXG4gICAgICAuc2VsZWN0KCcqJywgeyBjb3VudDogJ2V4YWN0JyB9KVxuICAgICAgLmVxKCd1c2VyX2lkJywgdXNlcklkKVxuICAgICAgLmVxKCdpc19yZWFkJywgZmFsc2UpO1xuXG4gICAgaWYgKGVycm9yKSB0aHJvdyBlcnJvcjtcblxuICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGNvdW50OiBjb3VudCB8fCAwIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignR2V0IHVucmVhZCBjb3VudCBlcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGNvdW50OiAwIH07XG4gIH1cbn1cblxuLyoqXG4gKiA9PT0gVVRJTElUWSBGVU5DVElPTlMgPT09XG4gKi9cblxuLy8gTm90aWZpY2EgZm9sbG93ZXIgZGkgbnVvdm8gcG9zdFxuYXN5bmMgZnVuY3Rpb24gbm90aWZ5Rm9sbG93ZXJzT2ZOZXdQb3N0KHVzZXJJZCwgcG9zdElkKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgeyBkYXRhOiBmb2xsb3dlcnMgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAuZnJvbSgnZm9sbG93cycpXG4gICAgICAuc2VsZWN0KCdmb2xsb3dlcl9pZCcpXG4gICAgICAuZXEoJ2ZvbGxvd2luZ19pZCcsIHVzZXJJZCk7XG5cbiAgICBpZiAoIWZvbGxvd2VycyB8fCBmb2xsb3dlcnMubGVuZ3RoID09PSAwKSByZXR1cm47XG5cbiAgICBjb25zdCBub3RpZmljYXRpb25zID0gZm9sbG93ZXJzLm1hcChmb2xsb3cgPT4gKHtcbiAgICAgIHVzZXJfaWQ6IGZvbGxvdy5mb2xsb3dlcl9pZCxcbiAgICAgIGFjdG9yX2lkOiB1c2VySWQsXG4gICAgICB0eXBlOiAnbmV3X3Bvc3QnLFxuICAgICAgdGl0bGU6ICdOdW92byBwb3N0IScsXG4gICAgICBtZXNzYWdlOiAnSGEgcHViYmxpY2F0byB1biBudW92byBwb3N0JyxcbiAgICAgIGFjdGlvbl91cmw6IGAvcG9zdC8ke3Bvc3RJZH1gXG4gICAgfSkpO1xuXG4gICAgYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKCdub3RpZmljYXRpb25zJylcbiAgICAgIC5pbnNlcnQobm90aWZpY2F0aW9ucyk7XG5cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdOb3RpZnkgZm9sbG93ZXJzIGVycm9yOicsIGVycm9yKTtcbiAgfVxufSIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL2hvbWUvcnVubmVyL3dvcmtzcGFjZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvcnVubmVyL3dvcmtzcGFjZS92aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9ydW5uZXIvd29ya3NwYWNlL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgeyBzZXR1cEFQSSB9IGZyb20gJy4vc2VydmVyL2FwaS5qcyc7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICB7XG4gICAgICBuYW1lOiAnYXBpLW1pZGRsZXdhcmUnLFxuICAgICAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xuICAgICAgICBjb25zdCBhcHAgPSBleHByZXNzKCk7XG4gICAgICAgIGFwcC51c2UoZXhwcmVzcy5qc29uKCkpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJhIHR1dHRlIGxlIEFQSSByb3V0ZXNcbiAgICAgICAgc2V0dXBBUEkoYXBwKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEludGVncmEgbmVsIHNlcnZlciBWaXRlIGNvbiBnZXN0aW9uZSBjb3JyZXR0YVxuICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgICAgIGlmIChyZXEudXJsLnN0YXJ0c1dpdGgoJy9hcGkvJykpIHtcbiAgICAgICAgICAgIGFwcChyZXEsIHJlcywgbmV4dCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgXSxcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogJzAuMC4wLjAnLFxuICAgIHBvcnQ6IDUwMDAsXG4gIH1cbn0pXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL3J1bm5lci93b3Jrc3BhY2Uvc2VydmVyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9ydW5uZXIvd29ya3NwYWNlL3NlcnZlci9hcGkuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvcnVubmVyL3dvcmtzcGFjZS9zZXJ2ZXIvYXBpLmpzXCI7aW1wb3J0IHBnIGZyb20gJ3BnJztcblxuLy8gRGF0YWJhc2UgY29ubmVjdGlvblxuY29uc3QgeyBQb29sIH0gPSBwZztcbmNvbnN0IHBvb2wgPSBuZXcgUG9vbCh7XG4gIGNvbm5lY3Rpb25TdHJpbmc6IHByb2Nlc3MuZW52LkRBVEFCQVNFX1VSTCxcbiAgc3NsOiBwcm9jZXNzLmVudi5EQVRBQkFTRV9VUkwuaW5jbHVkZXMoJ25lb24udGVjaCcpID8geyByZWplY3RVbmF1dGhvcml6ZWQ6IGZhbHNlIH0gOiBmYWxzZVxufSk7XG5cbi8vIEFQSSBSb3V0ZXMgcGVyIGlsIHNpc3RlbWEgdXBncmFkZSB2ZW5kaXRvcmVcbmV4cG9ydCBmdW5jdGlvbiBzZXR1cEFQSShhcHApIHtcbiAgXG4gIC8vIEdldCBwcm9maWxlIGJ5IElEXG4gIGFwcC5nZXQoJy9hcGkvcHJvZmlsZXMvOmlkJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgaWQgfSA9IHJlcS5wYXJhbXM7XG4gICAgICBcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBvb2wucXVlcnkoXG4gICAgICAgICdTRUxFQ1QgKiBGUk9NIHByb2ZpbGVzIFdIRVJFIGlkID0gJDEnLFxuICAgICAgICBbaWRdXG4gICAgICApO1xuICAgICAgXG4gICAgICBpZiAocmVzdWx0LnJvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwNCkuanNvbih7IGVycm9yOiAnUHJvZmlsbyBub24gdHJvdmF0bycgfSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHJlc3VsdC5yb3dzWzBdKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignR2V0IHByb2ZpbGUgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogJ0Vycm9yZSByZWN1cGVybyBwcm9maWxvJyB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEdldCBzZWxsZXIgYnkgdXNlcl9pZCAgXG4gIGFwcC5nZXQoJy9hcGkvc2VsbGVycy91c2VyLzp1c2VySWQnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyB1c2VySWQgfSA9IHJlcS5wYXJhbXM7XG4gICAgICBcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBvb2wucXVlcnkoXG4gICAgICAgICdTRUxFQ1QgaWQsIGhhbmRsZSwgZGlzcGxheV9uYW1lLCBhdmF0YXJfdXJsIEZST00gc2VsbGVycyBXSEVSRSB1c2VyX2lkID0gJDEnLFxuICAgICAgICBbdXNlcklkXVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgaWYgKHJlc3VsdC5yb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDQpLmpzb24oeyBlcnJvcjogJ1NlbGxlciBub3QgZm91bmQnIH0pO1xuICAgICAgfVxuICAgICAgXG4gICAgICByZXMuanNvbihyZXN1bHQucm93c1swXSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBzZWxsZXIgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogJ0Vycm9yZSByZWN1cGVybyBzZWxsZXInIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gU2VhcmNoIHNlbGxlcnMgQVBJIGVuZHBvaW50IGZvciByZWFsLXRpbWUgc2VhcmNoXG4gIGFwcC5nZXQoJy9hcGkvc2VsbGVycy9zZWFyY2gnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBxIH0gPSByZXEucXVlcnk7XG4gICAgICBcbiAgICAgIGlmICghcSB8fCBxLmxlbmd0aCA8IDEpIHtcbiAgICAgICAgcmV0dXJuIHJlcy5qc29uKFtdKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeShgXG4gICAgICAgIFNFTEVDVCBcbiAgICAgICAgICBzLmlkLCBcbiAgICAgICAgICBzLmhhbmRsZSwgXG4gICAgICAgICAgcy5kaXNwbGF5X25hbWUsIFxuICAgICAgICAgIHMuYXZhdGFyX3VybCwgXG4gICAgICAgICAgcy5iaW8sXG4gICAgICAgICAgcy5mb2xsb3dlcnMsXG4gICAgICAgICAgcC5wcm9maWxlX3BpY3R1cmUsXG4gICAgICAgICAgcC5maXJzdF9uYW1lLFxuICAgICAgICAgIHAubGFzdF9uYW1lXG4gICAgICAgIEZST00gc2VsbGVycyBzXG4gICAgICAgIExFRlQgSk9JTiBwcm9maWxlcyBwIE9OIHMudXNlcl9pZCA9IHAuaWRcbiAgICAgICAgV0hFUkUgXG4gICAgICAgICAgcy5kaXNwbGF5X25hbWUgSUxJS0UgJDEgT1IgXG4gICAgICAgICAgcy5oYW5kbGUgSUxJS0UgJDEgT1IgXG4gICAgICAgICAgcy5iaW8gSUxJS0UgJDEgT1JcbiAgICAgICAgICBwLmZpcnN0X25hbWUgSUxJS0UgJDEgT1JcbiAgICAgICAgICBwLmxhc3RfbmFtZSBJTElLRSAkMVxuICAgICAgICBPUkRFUiBCWSBzLmZvbGxvd2VycyBERVNDLCBzLmRpc3BsYXlfbmFtZSBBU0NcbiAgICAgICAgTElNSVQgOFxuICAgICAgYCwgW2AlJHtxfSVgXSk7XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHJlc3VsdC5yb3dzKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignU2VhcmNoIHNlbGxlcnMgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogJ0Vycm9yZSByaWNlcmNhIHZlbmRpdG9yaScgfSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBBZHZhbmNlZCBzZWFyY2ggQVBJIGVuZHBvaW50IHdpdGggZmlsdGVyc1xuICBhcHAuZ2V0KCcvYXBpL3NlYXJjaC9hZHZhbmNlZCcsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIHEgPSAnJyxcbiAgICAgICAgY2F0ZWdvcnkgPSAnJyxcbiAgICAgICAgcHJpY2VSYW5nZSA9ICcnLFxuICAgICAgICBsb2NhdGlvbiA9ICcnLFxuICAgICAgICBtaW5SYXRpbmcgPSAwLFxuICAgICAgICBoYXNMaXZlQWN0aXZlID0gJ2ZhbHNlJyxcbiAgICAgICAgb25seVZlcmlmaWVkID0gJ2ZhbHNlJyxcbiAgICAgICAgc29ydEJ5ID0gJ3JlbGV2YW5jZScsXG4gICAgICAgIHBhZ2UgPSAxLFxuICAgICAgICBsaW1pdCA9IDIwXG4gICAgICB9ID0gcmVxLnF1ZXJ5O1xuXG4gICAgICBjb25zdCBvZmZzZXQgPSAocGFyc2VJbnQocGFnZSkgLSAxKSAqIHBhcnNlSW50KGxpbWl0KTtcbiAgICAgIGNvbnN0IHNlYXJjaFRlcm0gPSBgJSR7cX0lYDtcblxuICAgICAgbGV0IGJhc2VRdWVyeSA9IGBcbiAgICAgICAgU0VMRUNUIERJU1RJTkNUXG4gICAgICAgICAgcy5pZCxcbiAgICAgICAgICBzLmhhbmRsZSxcbiAgICAgICAgICBzLmRpc3BsYXlfbmFtZSxcbiAgICAgICAgICBzLmF2YXRhcl91cmwsXG4gICAgICAgICAgcy5iaW8sXG4gICAgICAgICAgcy5jYXRlZ29yeSxcbiAgICAgICAgICBzLmNyZWF0ZWRfYXQsXG4gICAgICAgICAgcC5wcm9maWxlX3BpY3R1cmUsXG4gICAgICAgICAgcC5maXJzdF9uYW1lLFxuICAgICAgICAgIHAubGFzdF9uYW1lLFxuICAgICAgICAgIENBU0UgV0hFTiBsLmlkIElTIE5PVCBOVUxMIFRIRU4gdHJ1ZSBFTFNFIGZhbHNlIEVORCBhcyBsaXZlX2FjdGl2ZSxcbiAgICAgICAgICBDT0FMRVNDRShsLnZpZXdlcnMsIDApIGFzIGN1cnJlbnRfdmlld2VycyxcbiAgICAgICAgICAwIGFzIGZvbGxvd2VycyxcbiAgICAgICAgICBmYWxzZSBhcyB2ZXJpZmllZCxcbiAgICAgICAgICAwIGFzIHJhdGluZ1xuICAgICAgICBGUk9NIHNlbGxlcnMgc1xuICAgICAgICBMRUZUIEpPSU4gcHJvZmlsZXMgcCBPTiBzLnVzZXJfaWQgPSBwLmlkXG4gICAgICAgIExFRlQgSk9JTiBsaXZlcyBsIE9OIHMuaWQgPSBsLnNlbGxlcl9pZCBBTkQgbC5zdGF0dXMgPSAnbGl2ZSdcbiAgICAgIGA7XG5cbiAgICAgIGNvbnN0IGNvbmRpdGlvbnMgPSBbXTtcbiAgICAgIGNvbnN0IHBhcmFtcyA9IFtdO1xuICAgICAgbGV0IHBhcmFtQ291bnQgPSAwO1xuXG4gICAgICAvLyBUZXh0IHNlYXJjaFxuICAgICAgaWYgKHEgJiYgcS50cmltKCkpIHtcbiAgICAgICAgcGFyYW1Db3VudCsrO1xuICAgICAgICBjb25kaXRpb25zLnB1c2goYChcbiAgICAgICAgICBzLmRpc3BsYXlfbmFtZSBJTElLRSAkJHtwYXJhbUNvdW50fSBPUiBcbiAgICAgICAgICBzLmhhbmRsZSBJTElLRSAkJHtwYXJhbUNvdW50fSBPUiBcbiAgICAgICAgICBzLmJpbyBJTElLRSAkJHtwYXJhbUNvdW50fSBPUlxuICAgICAgICAgIHAuZmlyc3RfbmFtZSBJTElLRSAkJHtwYXJhbUNvdW50fSBPUlxuICAgICAgICAgIHAubGFzdF9uYW1lIElMSUtFICQke3BhcmFtQ291bnR9XG4gICAgICAgIClgKTtcbiAgICAgICAgcGFyYW1zLnB1c2goc2VhcmNoVGVybSk7XG4gICAgICB9XG5cbiAgICAgIC8vIENhdGVnb3J5IGZpbHRlclxuICAgICAgaWYgKGNhdGVnb3J5KSB7XG4gICAgICAgIHBhcmFtQ291bnQrKztcbiAgICAgICAgY29uZGl0aW9ucy5wdXNoKGBzLmNhdGVnb3J5IElMSUtFICQke3BhcmFtQ291bnR9YCk7XG4gICAgICAgIHBhcmFtcy5wdXNoKGAlJHtjYXRlZ29yeX0lYCk7XG4gICAgICB9XG5cbiAgICAgIC8vIE5vdGU6IGxvY2F0aW9uIGFuZCByYXRpbmcgZmlsdGVycyBvbWl0dGVkIHNpbmNlIGNvbHVtbnMgZG9uJ3QgZXhpc3RcbiAgICAgIC8vIFRoZXNlIGNhbiBiZSBhZGRlZCBsYXRlciB3aGVuIHRoZSBkYXRhYmFzZSBzY2hlbWEgaXMgZXh0ZW5kZWRcblxuICAgICAgLy8gTGl2ZSBhY3RpdmUgZmlsdGVyXG4gICAgICBpZiAoaGFzTGl2ZUFjdGl2ZSA9PT0gJ3RydWUnKSB7XG4gICAgICAgIGNvbmRpdGlvbnMucHVzaChgbC5pZCBJUyBOT1QgTlVMTGApO1xuICAgICAgfVxuXG4gICAgICAvLyBWZXJpZmllZCBmaWx0ZXJcbiAgICAgIGlmIChvbmx5VmVyaWZpZWQgPT09ICd0cnVlJykge1xuICAgICAgICBjb25kaXRpb25zLnB1c2goYHMudmVyaWZpZWQgPSB0cnVlYCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFByaWNlIHJhbmdlIGZpbHRlciAoYmFzZWQgb24gYXZlcmFnZSBpdGVtIHByaWNlcylcbiAgICAgIGlmIChwcmljZVJhbmdlKSB7XG4gICAgICAgIGlmIChwcmljZVJhbmdlID09PSAnMC01MCcpIHtcbiAgICAgICAgICBjb25kaXRpb25zLnB1c2goYHMuYXZnX2l0ZW1fcHJpY2UgPD0gNTBgKTtcbiAgICAgICAgfSBlbHNlIGlmIChwcmljZVJhbmdlID09PSAnNTAtMTAwJykge1xuICAgICAgICAgIGNvbmRpdGlvbnMucHVzaChgcy5hdmdfaXRlbV9wcmljZSBCRVRXRUVOIDUwIEFORCAxMDBgKTtcbiAgICAgICAgfSBlbHNlIGlmIChwcmljZVJhbmdlID09PSAnMTAwLTI1MCcpIHtcbiAgICAgICAgICBjb25kaXRpb25zLnB1c2goYHMuYXZnX2l0ZW1fcHJpY2UgQkVUV0VFTiAxMDAgQU5EIDI1MGApO1xuICAgICAgICB9IGVsc2UgaWYgKHByaWNlUmFuZ2UgPT09ICcyNTAtNTAwJykge1xuICAgICAgICAgIGNvbmRpdGlvbnMucHVzaChgcy5hdmdfaXRlbV9wcmljZSBCRVRXRUVOIDI1MCBBTkQgNTAwYCk7XG4gICAgICAgIH0gZWxzZSBpZiAocHJpY2VSYW5nZSA9PT0gJzUwMCsnKSB7XG4gICAgICAgICAgY29uZGl0aW9ucy5wdXNoKGBzLmF2Z19pdGVtX3ByaWNlID4gNTAwYCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gQnVpbGQgV0hFUkUgY2xhdXNlXG4gICAgICBpZiAoY29uZGl0aW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGJhc2VRdWVyeSArPSBgIFdIRVJFICR7Y29uZGl0aW9ucy5qb2luKCcgQU5EICcpfWA7XG4gICAgICB9XG5cbiAgICAgIC8vIE9yZGVyIGJ5XG4gICAgICBsZXQgb3JkZXJDbGF1c2UgPSAnJztcbiAgICAgIHN3aXRjaCAoc29ydEJ5KSB7XG4gICAgICAgIGNhc2UgJ2ZvbGxvd2Vycyc6XG4gICAgICAgICAgb3JkZXJDbGF1c2UgPSAnT1JERVIgQlkgcy5kaXNwbGF5X25hbWUgQVNDJztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAncmF0aW5nJzpcbiAgICAgICAgICBvcmRlckNsYXVzZSA9ICdPUkRFUiBCWSBzLmRpc3BsYXlfbmFtZSBBU0MnO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdyZWNlbnQnOlxuICAgICAgICAgIG9yZGVyQ2xhdXNlID0gJ09SREVSIEJZIHMuY3JlYXRlZF9hdCBERVNDJztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnbGl2ZV9hY3RpdmUnOlxuICAgICAgICAgIG9yZGVyQ2xhdXNlID0gJ09SREVSIEJZIGxpdmVfYWN0aXZlIERFU0MsIENPQUxFU0NFKGwudmlld2VycywgMCkgREVTQywgcy5kaXNwbGF5X25hbWUgQVNDJztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDogLy8gcmVsZXZhbmNlXG4gICAgICAgICAgb3JkZXJDbGF1c2UgPSAnT1JERVIgQlkgcy5kaXNwbGF5X25hbWUgQVNDJztcbiAgICAgIH1cblxuICAgICAgYmFzZVF1ZXJ5ICs9IGAgJHtvcmRlckNsYXVzZX1gO1xuXG4gICAgICAvLyBBZGQgcGFnaW5hdGlvblxuICAgICAgcGFyYW1Db3VudCsrO1xuICAgICAgYmFzZVF1ZXJ5ICs9IGAgTElNSVQgJCR7cGFyYW1Db3VudH1gO1xuICAgICAgcGFyYW1zLnB1c2gocGFyc2VJbnQobGltaXQpKTtcbiAgICAgIFxuICAgICAgcGFyYW1Db3VudCsrO1xuICAgICAgYmFzZVF1ZXJ5ICs9IGAgT0ZGU0VUICQke3BhcmFtQ291bnR9YDtcbiAgICAgIHBhcmFtcy5wdXNoKG9mZnNldCk7XG5cbiAgICAgIGNvbnNvbGUubG9nKCdBZHZhbmNlZCBzZWFyY2ggcXVlcnk6JywgYmFzZVF1ZXJ5KTtcbiAgICAgIGNvbnNvbGUubG9nKCdQYXJhbWV0ZXJzOicsIHBhcmFtcyk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBvb2wucXVlcnkoYmFzZVF1ZXJ5LCBwYXJhbXMpO1xuXG4gICAgICAvLyBDaGVjayBpZiB0aGVyZSBhcmUgbW9yZSByZXN1bHRzXG4gICAgICBjb25zdCBjb3VudFF1ZXJ5ID0gYmFzZVF1ZXJ5LnJlcGxhY2UoL1NFTEVDVCBESVNUSU5DVFtcXHNcXFNdKj9GUk9NLywgJ1NFTEVDVCBDT1VOVChESVNUSU5DVCBzLmlkKSBGUk9NJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9PUkRFUiBCWVtcXHNcXFNdKiQvLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9MSU1JVFtcXHNcXFNdKiQvLCAnJyk7XG4gICAgICBcbiAgICAgIGNvbnN0IGNvdW50UmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeShjb3VudFF1ZXJ5LCBwYXJhbXMuc2xpY2UoMCwgLTIpKTsgLy8gUmVtb3ZlIExJTUlUIGFuZCBPRkZTRVQgcGFyYW1zXG4gICAgICBjb25zdCB0b3RhbENvdW50ID0gcGFyc2VJbnQoY291bnRSZXN1bHQucm93c1swXS5jb3VudCk7XG4gICAgICBjb25zdCBoYXNNb3JlID0gb2Zmc2V0ICsgcGFyc2VJbnQobGltaXQpIDwgdG90YWxDb3VudDtcblxuICAgICAgcmVzLmpzb24oe1xuICAgICAgICByZXN1bHRzOiByZXN1bHQucm93cyxcbiAgICAgICAgaGFzTW9yZSxcbiAgICAgICAgdG90YWxDb3VudCxcbiAgICAgICAgcGFnZTogcGFyc2VJbnQocGFnZSksXG4gICAgICAgIGxpbWl0OiBwYXJzZUludChsaW1pdClcbiAgICAgIH0pO1xuXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0FkdmFuY2VkIHNlYXJjaCBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIHJpY2VyY2EgYXZhbnphdGEnIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gR2V0IHNlbGxlciBieSBoYW5kbGVcbiAgYXBwLmdldCgnL2FwaS9zZWxsZXJzL2hhbmRsZS86aGFuZGxlJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgaGFuZGxlIH0gPSByZXEucGFyYW1zO1xuICAgICAgXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KFxuICAgICAgICAnU0VMRUNUIGlkLCBoYW5kbGUsIGRpc3BsYXlfbmFtZSwgYXZhdGFyX3VybCBGUk9NIHNlbGxlcnMgV0hFUkUgaGFuZGxlID0gJDEnLFxuICAgICAgICBbaGFuZGxlXVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgaWYgKHJlc3VsdC5yb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDQpLmpzb24oeyBlcnJvcjogJ1NlbGxlciBub3QgZm91bmQnIH0pO1xuICAgICAgfVxuICAgICAgXG4gICAgICByZXMuanNvbihyZXN1bHQucm93c1swXSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBzZWxsZXIgYnkgaGFuZGxlIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdFcnJvcmUgcmVjdXBlcm8gc2VsbGVyJyB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEVORFBPSU5UIERFRElDQVRPIFBFUiBVUEdSQURFIEEgVkVORElUT1JFXG4gIGFwcC5wb3N0KCcvYXBpL3Byb2ZpbGVzL3VwZ3JhZGUnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyB1c2VySWQsIC4uLmRhdGEgfSA9IHJlcS5ib2R5O1xuICAgICAgXG4gICAgICBjb25zb2xlLmxvZygnXHVEODNEXHVERDI1IFVQR1JBREUgUkVRVUVTVCBBUEkgVklURTonLCB7IHVzZXJJZCwgZGF0YSB9KTtcbiAgICAgIFxuICAgICAgLy8gMS4gVVBTRVJUIFNJQ1VSTyAtIEZVTlpJT05BIFNFTVBSRSAoQ1JFQSBPIEFHR0lPUk5BKVxuICAgICAgY29uc3QgcHJvZmlsZVVwc2VydFF1ZXJ5ID0gYFxuICAgICAgICBJTlNFUlQgSU5UTyBwcm9maWxlcyAoXG4gICAgICAgICAgaWQsIGVtYWlsLCByb2xlLCBzdG9yZV9uYW1lLCBjYXRlZ29yeSwgaWJhbiwgcGhvbmUsXG4gICAgICAgICAgc2hpcHBpbmdfYWRkcmVzcywgc2hpcHBpbmdfY2l0eSwgc2hpcHBpbmdfcG9zdGFsX2NvZGUsIFxuICAgICAgICAgIHNoaXBwaW5nX2NvdW50cnksIHByb2ZpbGVfY29tcGxldGVkXG4gICAgICAgICkgVkFMVUVTIChcbiAgICAgICAgICAkMSwgJDIsICdzZWxsZXInLCAkMywgJDQsICQ1LCAkNiwgJDcsICQ4LCAkOSwgJDEwLCB0cnVlXG4gICAgICAgIClcbiAgICAgICAgT04gQ09ORkxJQ1QgKGlkKSBETyBVUERBVEUgU0VUXG4gICAgICAgICAgcm9sZSA9ICdzZWxsZXInLFxuICAgICAgICAgIHN0b3JlX25hbWUgPSBFWENMVURFRC5zdG9yZV9uYW1lLFxuICAgICAgICAgIGNhdGVnb3J5ID0gRVhDTFVERUQuY2F0ZWdvcnksXG4gICAgICAgICAgaWJhbiA9IEVYQ0xVREVELmliYW4sXG4gICAgICAgICAgcGhvbmUgPSBFWENMVURFRC5waG9uZSxcbiAgICAgICAgICBzaGlwcGluZ19hZGRyZXNzID0gRVhDTFVERUQuc2hpcHBpbmdfYWRkcmVzcyxcbiAgICAgICAgICBzaGlwcGluZ19jaXR5ID0gRVhDTFVERUQuc2hpcHBpbmdfY2l0eSxcbiAgICAgICAgICBzaGlwcGluZ19wb3N0YWxfY29kZSA9IEVYQ0xVREVELnNoaXBwaW5nX3Bvc3RhbF9jb2RlLFxuICAgICAgICAgIHNoaXBwaW5nX2NvdW50cnkgPSBFWENMVURFRC5zaGlwcGluZ19jb3VudHJ5LFxuICAgICAgICAgIHByb2ZpbGVfY29tcGxldGVkID0gdHJ1ZVxuICAgICAgICBSRVRVUk5JTkcgKlxuICAgICAgYDtcbiAgICAgIFxuICAgICAgY29uc3QgcHJvZmlsZVJlc3VsdCA9IGF3YWl0IHBvb2wucXVlcnkocHJvZmlsZVVwc2VydFF1ZXJ5LCBbXG4gICAgICAgIHVzZXJJZCxcbiAgICAgICAgZGF0YS5idXNpbmVzc19lbWFpbCB8fCBgdXNlci0ke3VzZXJJZH1AYmlkbGkubGl2ZWAsXG4gICAgICAgIGRhdGEuc3RvcmVfbmFtZSB8fCAnJyxcbiAgICAgICAgZGF0YS5jYXRlZ29yeSB8fCAnJyxcbiAgICAgICAgZGF0YS5pYmFuIHx8ICcnLFxuICAgICAgICBkYXRhLnBob25lIHx8ICcnLFxuICAgICAgICBkYXRhLnNoaXBwaW5nX2FkZHJlc3MgfHwgJycsXG4gICAgICAgIGRhdGEuc2hpcHBpbmdfY2l0eSB8fCAnJyxcbiAgICAgICAgZGF0YS5zaGlwcGluZ19wb3N0YWxfY29kZSB8fCAnJyxcbiAgICAgICAgZGF0YS5zaGlwcGluZ19jb3VudHJ5IHx8ICdJdGFseSdcbiAgICAgIF0pO1xuICAgICAgXG4gICAgICBjb25zb2xlLmxvZygnXHUyNzA1IFBST0ZJTE8gQUdHSU9STkFUTyBBIFNFTExFUiAoVklURSk6JywgcHJvZmlsZVJlc3VsdC5yb3dzWzBdKTtcbiAgICAgIFxuICAgICAgLy8gMi4gQ3JlYSByZWNvcmQgdmVuZGl0b3JlIHNlIG5vbiBlc2lzdGVcbiAgICAgIGNvbnN0IGhhbmRsZSA9IChkYXRhLnN0b3JlX25hbWUgfHwgJ3NlbGxlcicpLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvW15hLXowLTldL2csICdfJykgKyAnXycgKyBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgNSk7XG4gICAgICBcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHNlbGxlckluc2VydFF1ZXJ5ID0gYFxuICAgICAgICAgIElOU0VSVCBJTlRPIHNlbGxlcnMgKFxuICAgICAgICAgICAgdXNlcl9pZCwgaGFuZGxlLCBkaXNwbGF5X25hbWUsIHN0b3JlX25hbWUsIGJpbywgaWJhbixcbiAgICAgICAgICAgIGNhdGVnb3J5LCBzaGlwcGluZ19hZGRyZXNzLCBzaGlwcGluZ19jaXR5LCBzaGlwcGluZ19wb3N0YWxfY29kZSxcbiAgICAgICAgICAgIHNoaXBwaW5nX2NvdW50cnksIHBob25lLCBidXNpbmVzc19lbWFpbCwgcHJvZmlsZV9jb21wbGV0ZWRcbiAgICAgICAgICApIFZBTFVFUyAoXG4gICAgICAgICAgICAkMSwgJDIsICQzLCAkNCwgJDUsICQ2LCAkNywgJDgsICQ5LCAkMTAsICQxMSwgJDEyLCAkMTMsICQxNFxuICAgICAgICAgICkgXG4gICAgICAgICAgT04gQ09ORkxJQ1QgKHVzZXJfaWQpIERPIFVQREFURSBTRVRcbiAgICAgICAgICAgIGhhbmRsZSA9IEVYQ0xVREVELmhhbmRsZSxcbiAgICAgICAgICAgIGRpc3BsYXlfbmFtZSA9IEVYQ0xVREVELmRpc3BsYXlfbmFtZSxcbiAgICAgICAgICAgIHN0b3JlX25hbWUgPSBFWENMVURFRC5zdG9yZV9uYW1lLFxuICAgICAgICAgICAgYmlvID0gRVhDTFVERUQuYmlvLFxuICAgICAgICAgICAgaWJhbiA9IEVYQ0xVREVELmliYW4sXG4gICAgICAgICAgICBjYXRlZ29yeSA9IEVYQ0xVREVELmNhdGVnb3J5LFxuICAgICAgICAgICAgc2hpcHBpbmdfYWRkcmVzcyA9IEVYQ0xVREVELnNoaXBwaW5nX2FkZHJlc3MsXG4gICAgICAgICAgICBzaGlwcGluZ19jaXR5ID0gRVhDTFVERUQuc2hpcHBpbmdfY2l0eSxcbiAgICAgICAgICAgIHNoaXBwaW5nX3Bvc3RhbF9jb2RlID0gRVhDTFVERUQuc2hpcHBpbmdfcG9zdGFsX2NvZGUsXG4gICAgICAgICAgICBzaGlwcGluZ19jb3VudHJ5ID0gRVhDTFVERUQuc2hpcHBpbmdfY291bnRyeSxcbiAgICAgICAgICAgIHBob25lID0gRVhDTFVERUQucGhvbmUsXG4gICAgICAgICAgICBidXNpbmVzc19lbWFpbCA9IEVYQ0xVREVELmJ1c2luZXNzX2VtYWlsLFxuICAgICAgICAgICAgcHJvZmlsZV9jb21wbGV0ZWQgPSBFWENMVURFRC5wcm9maWxlX2NvbXBsZXRlZFxuICAgICAgICAgIFJFVFVSTklORyAqXG4gICAgICAgIGA7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBzZWxsZXJSZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KHNlbGxlckluc2VydFF1ZXJ5LCBbXG4gICAgICAgICAgdXNlcklkLFxuICAgICAgICAgIGhhbmRsZSxcbiAgICAgICAgICBkYXRhLnN0b3JlX25hbWUsXG4gICAgICAgICAgZGF0YS5zdG9yZV9uYW1lLFxuICAgICAgICAgIGRhdGEuc3RvcmVfZGVzY3JpcHRpb24gfHwgJycsXG4gICAgICAgICAgZGF0YS5pYmFuLFxuICAgICAgICAgIGRhdGEuY2F0ZWdvcnksXG4gICAgICAgICAgZGF0YS5zaGlwcGluZ19hZGRyZXNzLFxuICAgICAgICAgIGRhdGEuc2hpcHBpbmdfY2l0eSxcbiAgICAgICAgICBkYXRhLnNoaXBwaW5nX3Bvc3RhbF9jb2RlLFxuICAgICAgICAgIGRhdGEuc2hpcHBpbmdfY291bnRyeSB8fCAnSXRhbHknLFxuICAgICAgICAgIGRhdGEucGhvbmUsXG4gICAgICAgICAgZGF0YS5idXNpbmVzc19lbWFpbCxcbiAgICAgICAgICB0cnVlXG4gICAgICAgIF0pO1xuICAgICAgICBcbiAgICAgICAgY29uc29sZS5sb2coJ1x1MjcwNSBTRUxMRVIgQ1JFQVRPL0FHR0lPUk5BVE8gKFZJVEUpOicsIHNlbGxlclJlc3VsdC5yb3dzWzBdKTtcbiAgICAgICAgXG4gICAgICAgIHJlcy5qc29uKHsgXG4gICAgICAgICAgc3VjY2VzczogdHJ1ZSwgXG4gICAgICAgICAgcHJvZmlsZTogcHJvZmlsZVJlc3VsdC5yb3dzWzBdLFxuICAgICAgICAgIHNlbGxlcjogc2VsbGVyUmVzdWx0LnJvd3NbMF0sXG4gICAgICAgICAgbWVzc2FnZTogJ1VwZ3JhZGUgYSB2ZW5kaXRvcmUgY29tcGxldGF0byBjb24gc3VjY2Vzc28hJyBcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgfSBjYXRjaCAoc2VsbGVyRXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3JlIGNyZWF6aW9uZSBzZWxsZXI6Jywgc2VsbGVyRXJyb3IpO1xuICAgICAgICAvLyBBbmNoZSBzZSBpbCBzZWxsZXIgZmFsbGlzY2UsIGlsIHByb2ZpbG8gXHUwMEU4IHN0YXRvIGFnZ2lvcm5hdG9cbiAgICAgICAgcmVzLmpzb24oeyBcbiAgICAgICAgICBzdWNjZXNzOiB0cnVlLCBcbiAgICAgICAgICBwcm9maWxlOiBwcm9maWxlUmVzdWx0LnJvd3NbMF0sXG4gICAgICAgICAgbWVzc2FnZTogJ1VwZ3JhZGUgY29tcGxldGF0byEgUHJvZmlsbyB2ZW5kaXRvcmUgc2FyXHUwMEUwIGNyZWF0byBhdXRvbWF0aWNhbWVudGUuJyBcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignXHUyNzRDIEVSUk9SRSBVUEdSQURFIChWSVRFKTonLCBlcnJvci5tZXNzYWdlKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBlcnJvcjogJ0Vycm9yZSBkdXJhbnRlIHVwZ3JhZGUgYSB2ZW5kaXRvcmUnLFxuICAgICAgICBkZXRhaWxzOiBlcnJvci5tZXNzYWdlIFxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBHRVQgTElWRSBCWSBJRFxuICBhcHAuZ2V0KCcvYXBpL2xpdmVzLzppZCcsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IGlkIH0gPSByZXEucGFyYW1zO1xuICAgICAgXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KFxuICAgICAgICAnU0VMRUNUIGwuKiwgcy51c2VyX2lkIGFzIHNlbGxlcl91c2VyX2lkLCBzLmRpc3BsYXlfbmFtZSBhcyBzZWxsZXJfZGlzcGxheV9uYW1lLCBzLmhhbmRsZSBhcyBzZWxsZXJfaGFuZGxlLCBzLmF2YXRhcl91cmwgYXMgc2VsbGVyX2F2YXRhcl91cmwgRlJPTSBsaXZlcyBsIExFRlQgSk9JTiBzZWxsZXJzIHMgT04gbC5zZWxsZXJfaWQgPSBzLmlkIFdIRVJFIGwuaWQgPSAkMScsXG4gICAgICAgIFtpZF1cbiAgICAgICk7XG4gICAgICBcbiAgICAgIGlmIChyZXN1bHQucm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDA0KS5qc29uKHsgZXJyb3I6ICdMaXZlIG5vdCBmb3VuZCcgfSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHJlc3VsdC5yb3dzWzBdKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignR2V0IGxpdmUgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogJ0Vycm9yZSByZWN1cGVybyBsaXZlJyB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIENSRUFURSBMSVZFIExPVCAoQUREIFBST0RVQ1QgVE8gTElWRSlcbiAgYXBwLnBvc3QoJy9hcGkvbGl2ZS1sb3RzJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgbGl2ZV9pZCwgdGl0bGUsIHN0YXJ0X3ByaWNlLCBzdGF0dXMgPSAncXVldWVkJywgaW1hZ2VfdXJsLCBidXlfbm93X3ByaWNlLCBtaW5fYmlkX2luY3JlbWVudCB9ID0gcmVxLmJvZHk7XG4gICAgICBcbiAgICAgIGlmICghbGl2ZV9pZCB8fCAhdGl0bGUgfHwgIXN0YXJ0X3ByaWNlKSB7XG4gICAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbih7IGVycm9yOiAnbGl2ZV9pZCwgdGl0bGUgZSBzdGFydF9wcmljZSBzb25vIHJpY2hpZXN0aScgfSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBvb2wucXVlcnkoXG4gICAgICAgICdJTlNFUlQgSU5UTyBsaXZlX2xvdHMgKGxpdmVfaWQsIHRpdGxlLCBzdGFydF9wcmljZSwgc3RhdHVzLCBpbWFnZV91cmwsIGJ1eV9ub3dfcHJpY2UsIG1pbl9iaWRfaW5jcmVtZW50KSBWQUxVRVMgKCQxLCAkMiwgJDMsICQ0LCAkNSwgJDYsICQ3KSBSRVRVUk5JTkcgKicsXG4gICAgICAgIFtsaXZlX2lkLCB0aXRsZSwgcGFyc2VGbG9hdChzdGFydF9wcmljZSksIHN0YXR1cywgaW1hZ2VfdXJsIHx8IG51bGwsIGJ1eV9ub3dfcHJpY2UgPyBwYXJzZUZsb2F0KGJ1eV9ub3dfcHJpY2UpIDogbnVsbCwgbWluX2JpZF9pbmNyZW1lbnQgPyBwYXJzZUZsb2F0KG1pbl9iaWRfaW5jcmVtZW50KSA6IDEuMDBdXG4gICAgICApO1xuICAgICAgXG4gICAgICByZXMuanNvbihyZXN1bHQucm93c1swXSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0NyZWF0ZSBsaXZlIGxvdCBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIGNyZWF6aW9uZSBwcm9kb3R0bycgfSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBHRVQgTElWRSBMT1RTIEZPUiBBIExJVkVcbiAgYXBwLmdldCgnL2FwaS9saXZlLWxvdHMvbGl2ZS86bGl2ZUlkJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgbGl2ZUlkIH0gPSByZXEucGFyYW1zO1xuICAgICAgXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KFxuICAgICAgICAnU0VMRUNUICogRlJPTSBsaXZlX2xvdHMgV0hFUkUgbGl2ZV9pZCA9ICQxIE9SREVSIEJZIGNyZWF0ZWRfYXQgQVNDJyxcbiAgICAgICAgW2xpdmVJZF1cbiAgICAgICk7XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHJlc3VsdC5yb3dzKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignR2V0IGxpdmUgbG90cyBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIHJlY3VwZXJvIHByb2RvdHRpJyB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIFVQREFURSBMSVZFIExPVCBTVEFUVVMgIFxuICBhcHAucGF0Y2goJy9hcGkvbGl2ZS1sb3RzLzpsb3RJZCcsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IGxvdElkIH0gPSByZXEucGFyYW1zO1xuICAgICAgY29uc3QgeyBzdGF0dXMsIGN1cnJlbnRfcHJpY2UsIGZpbmFsX3ByaWNlLCB3aW5uZXJfdXNlcl9pZCwgYnV5X25vd19wcmljZSwgbWluX2JpZF9pbmNyZW1lbnQgfSA9IHJlcS5ib2R5O1xuICAgICAgXG4gICAgICBjb25zdCB1cGRhdGVzID0gW107XG4gICAgICBjb25zdCB2YWx1ZXMgPSBbbG90SWRdO1xuICAgICAgbGV0IHZhbHVlSW5kZXggPSAyO1xuICAgICAgXG4gICAgICBpZiAoc3RhdHVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdXBkYXRlcy5wdXNoKGBzdGF0dXMgPSAkJHt2YWx1ZUluZGV4fWApO1xuICAgICAgICB2YWx1ZXMucHVzaChzdGF0dXMpO1xuICAgICAgICB2YWx1ZUluZGV4Kys7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmIChjdXJyZW50X3ByaWNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdXBkYXRlcy5wdXNoKGBjdXJyZW50X3ByaWNlID0gJCR7dmFsdWVJbmRleH1gKTtcbiAgICAgICAgdmFsdWVzLnB1c2gocGFyc2VGbG9hdChjdXJyZW50X3ByaWNlKSk7XG4gICAgICAgIHZhbHVlSW5kZXgrKztcbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKGZpbmFsX3ByaWNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdXBkYXRlcy5wdXNoKGBmaW5hbF9wcmljZSA9ICQke3ZhbHVlSW5kZXh9YCk7XG4gICAgICAgIHZhbHVlcy5wdXNoKGZpbmFsX3ByaWNlID8gcGFyc2VGbG9hdChmaW5hbF9wcmljZSkgOiBudWxsKTtcbiAgICAgICAgdmFsdWVJbmRleCsrO1xuICAgICAgfVxuICAgICAgXG4gICAgICBpZiAod2lubmVyX3VzZXJfaWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB1cGRhdGVzLnB1c2goYHdpbm5lcl91c2VyX2lkID0gJCR7dmFsdWVJbmRleH1gKTtcbiAgICAgICAgdmFsdWVzLnB1c2god2lubmVyX3VzZXJfaWQpO1xuICAgICAgICB2YWx1ZUluZGV4Kys7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmIChidXlfbm93X3ByaWNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdXBkYXRlcy5wdXNoKGBidXlfbm93X3ByaWNlID0gJCR7dmFsdWVJbmRleH1gKTtcbiAgICAgICAgdmFsdWVzLnB1c2goYnV5X25vd19wcmljZSA/IHBhcnNlRmxvYXQoYnV5X25vd19wcmljZSkgOiBudWxsKTtcbiAgICAgICAgdmFsdWVJbmRleCsrO1xuICAgICAgfVxuICAgICAgXG4gICAgICBpZiAobWluX2JpZF9pbmNyZW1lbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB1cGRhdGVzLnB1c2goYG1pbl9iaWRfaW5jcmVtZW50ID0gJCR7dmFsdWVJbmRleH1gKTtcbiAgICAgICAgdmFsdWVzLnB1c2gobWluX2JpZF9pbmNyZW1lbnQgPyBwYXJzZUZsb2F0KG1pbl9iaWRfaW5jcmVtZW50KSA6IDEuMDApO1xuICAgICAgICB2YWx1ZUluZGV4Kys7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmICh1cGRhdGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oeyBlcnJvcjogJ05lc3N1biBhZ2dpb3JuYW1lbnRvIHNwZWNpZmljYXRvJyB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeShcbiAgICAgICAgYFVQREFURSBsaXZlX2xvdHMgU0VUICR7dXBkYXRlcy5qb2luKCcsICcpfSwgdXBkYXRlZF9hdCA9IENVUlJFTlRfVElNRVNUQU1QIFdIRVJFIGlkID0gJDEgUkVUVVJOSU5HICpgLFxuICAgICAgICB2YWx1ZXNcbiAgICAgICk7XG4gICAgICBcbiAgICAgIGlmIChyZXN1bHQucm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDA0KS5qc29uKHsgZXJyb3I6ICdMb3R0byBub24gdHJvdmF0bycgfSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHJlc3VsdC5yb3dzWzBdKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignVXBkYXRlIGxpdmUgbG90IGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdFcnJvcmUgYWdnaW9ybmFtZW50byBsb3R0bycgfSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBHRVQgUE9TVFMgRk9SIEEgTElWRVxuICBhcHAuZ2V0KCcvYXBpL3Bvc3RzL2xpdmUvOmxpdmVJZCcsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IGxpdmVJZCB9ID0gcmVxLnBhcmFtcztcbiAgICAgIFxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeShcbiAgICAgICAgJ1NFTEVDVCAqIEZST00gcG9zdHMgV0hFUkUgbGl2ZV9pZCA9ICQxIE9SREVSIEJZIGNyZWF0ZWRfYXQnLFxuICAgICAgICBbbGl2ZUlkXVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgcmVzLmpzb24ocmVzdWx0LnJvd3MgfHwgW10pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdHZXQgcG9zdHMgZm9yIGxpdmUgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogJ0Vycm9yZSByZWN1cGVybyBwb3N0cyBwZXIgbGl2ZScgfSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBDUkVBVEUgTkVXIExJVkVcbiAgYXBwLnBvc3QoJy9hcGkvbGl2ZXMnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBzZWxsZXJfaWQsIHRpdGxlLCBjYXRlZ29yeV9pZCwgc3RhcnRfcHJpY2UsIHNjaGVkdWxlZF9hdCB9ID0gcmVxLmJvZHk7XG4gICAgICBcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBvb2wucXVlcnkoXG4gICAgICAgIGBJTlNFUlQgSU5UTyBsaXZlcyAoc2VsbGVyX2lkLCB0aXRsZSwgY2F0ZWdvcnlfaWQsIHN0YXJ0X3ByaWNlLCBzY2hlZHVsZWRfYXQsIHN0YXR1cywgdmlld2VycywgY3JlYXRlZF9hdCkgXG4gICAgICAgICBWQUxVRVMgKCQxLCAkMiwgJDMsICQ0LCAkNSwgJ3NjaGVkdWxlZCcsIDAsIE5PVygpKSBcbiAgICAgICAgIFJFVFVSTklORyAqYCxcbiAgICAgICAgW3NlbGxlcl9pZCwgdGl0bGUsIGNhdGVnb3J5X2lkIHx8IG51bGwsIHN0YXJ0X3ByaWNlIHx8IDAsIHNjaGVkdWxlZF9hdCB8fCAnTk9XKCknXVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgcmVzLmpzb24ocmVzdWx0LnJvd3NbMF0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdDcmVhdGUgbGl2ZSBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIGNyZWF6aW9uZSBsaXZlJyB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIFVQREFURSBMSVZFIFNUQVRVU1xuICBhcHAucHV0KCcvYXBpL2xpdmVzLzppZC9zdGF0dXMnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBpZCB9ID0gcmVxLnBhcmFtcztcbiAgICAgIGNvbnN0IHsgc3RhdHVzIH0gPSByZXEuYm9keTtcbiAgICAgIFxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeShcbiAgICAgICAgJ1VQREFURSBsaXZlcyBTRVQgc3RhdHVzID0gJDEgV0hFUkUgaWQgPSAkMiBSRVRVUk5JTkcgKicsXG4gICAgICAgIFtzdGF0dXMsIGlkXVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgaWYgKHJlc3VsdC5yb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDQpLmpzb24oeyBlcnJvcjogJ0xpdmUgbm90IGZvdW5kJyB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gU2UgbGl2ZSBcdTAwRTggdGVybWluYXRhLCBjbGVhbnVwIHNwZXR0YXRvcmlcbiAgICAgIGlmIChzdGF0dXMgPT09ICdlbmRlZCcpIHtcbiAgICAgICAgY29uc3QgeyBjbGVhbnVwTGl2ZSB9ID0gYXdhaXQgaW1wb3J0KCcuL3ZpZXdlci10cmFja2luZy5qcycpO1xuICAgICAgICBhd2FpdCBjbGVhbnVwTGl2ZShpZCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHJlc3VsdC5yb3dzWzBdKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignVXBkYXRlIGxpdmUgc3RhdHVzIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdFcnJvcmUgYWdnaW9ybmFtZW50byBsaXZlJyB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vID09PSBWSUVXRVIgVFJBQ0tJTkcgRU5EUE9JTlRTID09PVxuICBcbiAgLy8gSk9JTiBMSVZFIEFTIFZJRVdFUlxuICBhcHAucG9zdCgnL2FwaS9saXZlLzpsaXZlSWQvam9pbicsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IGxpdmVJZCB9ID0gcmVxLnBhcmFtcztcbiAgICAgIGNvbnN0IHsgdmlld2VySWQgfSA9IHJlcS5ib2R5O1xuICAgICAgXG4gICAgICBpZiAoIXZpZXdlcklkKSB7XG4gICAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbih7IGVycm9yOiAndmlld2VySWQgcmljaGllc3RvJyB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgY29uc3QgeyBhZGRWaWV3ZXIgfSA9IGF3YWl0IGltcG9ydCgnLi92aWV3ZXItdHJhY2tpbmcuanMnKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGFkZFZpZXdlcihsaXZlSWQsIHZpZXdlcklkKTtcbiAgICAgIFxuICAgICAgaWYgKCFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogcmVzdWx0LmVycm9yIH0pO1xuICAgICAgfVxuICAgICAgXG4gICAgICByZXMuanNvbih7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIHZpZXdlcnM6IHJlc3VsdC52aWV3ZXJzLFxuICAgICAgICB0b3RhbFZpZXdlcnM6IHJlc3VsdC50b3RhbFZpZXdlcnMsXG4gICAgICAgIG1lc3NhZ2U6ICdTcGV0dGF0b3JlIGFnZ2l1bnRvIGNvbiBzdWNjZXNzbydcbiAgICAgIH0pO1xuICAgICAgXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0pvaW4gbGl2ZSBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIGluZ3Jlc3NvIGxpdmUnIH0pO1xuICAgIH1cbiAgfSk7XG4gIFxuICAvLyBMRUFWRSBMSVZFXG4gIGFwcC5wb3N0KCcvYXBpL2xpdmUvOmxpdmVJZC9sZWF2ZScsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IGxpdmVJZCB9ID0gcmVxLnBhcmFtcztcbiAgICAgIGNvbnN0IHsgdmlld2VySWQgfSA9IHJlcS5ib2R5O1xuICAgICAgXG4gICAgICBpZiAoIXZpZXdlcklkKSB7XG4gICAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbih7IGVycm9yOiAndmlld2VySWQgcmljaGllc3RvJyB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgY29uc3QgeyByZW1vdmVWaWV3ZXIgfSA9IGF3YWl0IGltcG9ydCgnLi92aWV3ZXItdHJhY2tpbmcuanMnKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHJlbW92ZVZpZXdlcihsaXZlSWQsIHZpZXdlcklkKTtcbiAgICAgIFxuICAgICAgaWYgKCFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogcmVzdWx0LmVycm9yIH0pO1xuICAgICAgfVxuICAgICAgXG4gICAgICByZXMuanNvbih7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIHZpZXdlcnM6IHJlc3VsdC52aWV3ZXJzLFxuICAgICAgICBtZXNzYWdlOiAnU3BldHRhdG9yZSByaW1vc3NvIGNvbiBzdWNjZXNzbydcbiAgICAgIH0pO1xuICAgICAgXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0xlYXZlIGxpdmUgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogJ0Vycm9yZSB1c2NpdGEgbGl2ZScgfSk7XG4gICAgfVxuICB9KTtcbiAgXG4gIC8vIEdFVCBWSUVXRVIgU1RBVFNcbiAgYXBwLmdldCgnL2FwaS9saXZlLzpsaXZlSWQvdmlld2VycycsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IGxpdmVJZCB9ID0gcmVxLnBhcmFtcztcbiAgICAgIFxuICAgICAgY29uc3QgeyBnZXRWaWV3ZXJTdGF0cyB9ID0gYXdhaXQgaW1wb3J0KCcuL3ZpZXdlci10cmFja2luZy5qcycpO1xuICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBnZXRWaWV3ZXJTdGF0cyhsaXZlSWQpO1xuICAgICAgXG4gICAgICByZXMuanNvbihzdGF0cyk7XG4gICAgICBcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignR2V0IHZpZXdlciBzdGF0cyBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIHN0YXRzIHNwZXR0YXRvcmknIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gR0VUIExJVkVTIEJZIFNFTExFUlxuICBhcHAuZ2V0KCcvYXBpL2xpdmVzL3NlbGxlci86c2VsbGVySWQnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBzZWxsZXJJZCB9ID0gcmVxLnBhcmFtcztcbiAgICAgIFxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeShcbiAgICAgICAgJ1NFTEVDVCAqIEZST00gbGl2ZXMgV0hFUkUgc2VsbGVyX2lkID0gJDEgT1JERVIgQlkgY3JlYXRlZF9hdCBERVNDJyxcbiAgICAgICAgW3NlbGxlcklkXVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgcmVzLmpzb24ocmVzdWx0LnJvd3MpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdHZXQgbGl2ZXMgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogJ0Vycm9yZSByZWN1cGVybyBsaXZlJyB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIERFTEVURSBMSVZFXG4gIGFwcC5kZWxldGUoJy9hcGkvbGl2ZXMvOmlkJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgaWQgfSA9IHJlcS5wYXJhbXM7XG4gICAgICBcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBvb2wucXVlcnkoXG4gICAgICAgICdERUxFVEUgRlJPTSBsaXZlcyBXSEVSRSBpZCA9ICQxIFJFVFVSTklORyBpZCcsXG4gICAgICAgIFtpZF1cbiAgICAgICk7XG4gICAgICBcbiAgICAgIGlmIChyZXN1bHQucm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDA0KS5qc29uKHsgZXJyb3I6ICdMaXZlIG5vdCBmb3VuZCcgfSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHsgc3VjY2VzczogdHJ1ZSB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignRGVsZXRlIGxpdmUgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogJ0Vycm9yZSBlbGltaW5hemlvbmUgbGl2ZScgfSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBHRVQgUE9TVFMgQlkgU0VMTEVSIElEXG4gIGFwcC5nZXQoJy9hcGkvcG9zdHMvc2VsbGVyLzpzZWxsZXJJZCcsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IHNlbGxlcklkIH0gPSByZXEucGFyYW1zO1xuICAgICAgXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KFxuICAgICAgICAnU0VMRUNUICogRlJPTSBwb3N0cyBXSEVSRSBzZWxsZXJfaWQgPSAkMSBPUkRFUiBCWSBjcmVhdGVkX2F0IERFU0MgTElNSVQgNjAnLFxuICAgICAgICBbc2VsbGVySWRdXG4gICAgICApO1xuICAgICAgXG4gICAgICByZXMuanNvbihyZXN1bHQucm93cyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBwb3N0cyBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIHJlY3VwZXJvIHBvc3RzJyB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEdFVCBTVE9SSUVTIEJZIFNFTExFUiBJRCAgXG4gIGFwcC5nZXQoJy9hcGkvc3Rvcmllcy9zZWxsZXIvOnNlbGxlcklkJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgc2VsbGVySWQgfSA9IHJlcS5wYXJhbXM7XG4gICAgICBcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBvb2wucXVlcnkoXG4gICAgICAgICdTRUxFQ1QgKiBGUk9NIHN0b3JpZXMgV0hFUkUgc2VsbGVyX2lkID0gJDEgT1JERVIgQlkgY3JlYXRlZF9hdCBERVNDIExJTUlUIDIwJyxcbiAgICAgICAgW3NlbGxlcklkXVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgcmVzLmpzb24ocmVzdWx0LnJvd3MpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdHZXQgc3RvcmllcyBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIHJlY3VwZXJvIHN0b3JpZXMnIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gR0VUIFNUT1JZIElURU1TIEJZIFNUT1JZIElEXG4gIGFwcC5nZXQoJy9hcGkvc3RvcnktaXRlbXMvOnN0b3J5SWQnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBzdG9yeUlkIH0gPSByZXEucGFyYW1zO1xuICAgICAgXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KFxuICAgICAgICAnU0VMRUNUICogRlJPTSBzdG9yeV9pdGVtcyBXSEVSRSBzdG9yeV9pZCA9ICQxIE9SREVSIEJZIGNyZWF0ZWRfYXQgQVNDJyxcbiAgICAgICAgW3N0b3J5SWRdXG4gICAgICApO1xuICAgICAgXG4gICAgICByZXMuanNvbihyZXN1bHQucm93cyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBzdG9yeSBpdGVtcyBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIHJlY3VwZXJvIHN0b3J5IGl0ZW1zJyB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vID09PSBTT0NJQUwgQVBJIEVORFBPSU5UUyA9PT1cbiAgXG4gIC8vIEZPTExPVy9VTkZPTExPVyBVU0VSXG4gIGFwcC5wb3N0KCcvYXBpL3NvY2lhbC9mb2xsb3cnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBmb2xsb3dlcklkLCBmb2xsb3dpbmdJZCB9ID0gcmVxLmJvZHk7XG4gICAgICBcbiAgICAgIGlmICghZm9sbG93ZXJJZCB8fCAhZm9sbG93aW5nSWQpIHtcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKHsgZXJyb3I6ICdmb2xsb3dlcklkIGUgZm9sbG93aW5nSWQgcmljaGllc3RpJyB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgY29uc3QgeyB0b2dnbGVGb2xsb3cgfSA9IGF3YWl0IGltcG9ydCgnLi9zb2NpYWwtYXBpLmpzJyk7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0b2dnbGVGb2xsb3coZm9sbG93ZXJJZCwgZm9sbG93aW5nSWQpO1xuICAgICAgXG4gICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMCkuanNvbih7IGVycm9yOiByZXN1bHQuZXJyb3IgfSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHJlc3VsdCk7XG4gICAgICBcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignRm9sbG93IGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdFcnJvcmUgZm9sbG93L3VuZm9sbG93JyB9KTtcbiAgICB9XG4gIH0pO1xuICBcbiAgLy8gR0VUIFVTRVIgU09DSUFMIFNUQVRTXG4gIGFwcC5nZXQoJy9hcGkvc29jaWFsL3N0YXRzLzp1c2VySWQnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyB1c2VySWQgfSA9IHJlcS5wYXJhbXM7XG4gICAgICBcbiAgICAgIGNvbnN0IHsgZ2V0VXNlclNvY2lhbFN0YXRzIH0gPSBhd2FpdCBpbXBvcnQoJy4vc29jaWFsLWFwaS5qcycpO1xuICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBnZXRVc2VyU29jaWFsU3RhdHModXNlcklkKTtcbiAgICAgIFxuICAgICAgcmVzLmpzb24oc3RhdHMpO1xuICAgICAgXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBzb2NpYWwgc3RhdHMgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogJ0Vycm9yZSByZWN1cGVybyBzdGF0aXN0aWNoZScgfSk7XG4gICAgfVxuICB9KTtcbiAgXG4gIC8vIEdFVCBVU0VSIE5PVElGSUNBVElPTlNcbiAgYXBwLmdldCgnL2FwaS9zb2NpYWwvbm90aWZpY2F0aW9ucy86dXNlcklkJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgdXNlcklkIH0gPSByZXEucGFyYW1zO1xuICAgICAgY29uc3QgeyBsaW1pdCA9IDUwLCB1bnJlYWRPbmx5ID0gZmFsc2UgfSA9IHJlcS5xdWVyeTtcbiAgICAgIFxuICAgICAgY29uc3QgeyBnZXRVc2VyTm90aWZpY2F0aW9ucyB9ID0gYXdhaXQgaW1wb3J0KCcuL3NvY2lhbC1hcGkuanMnKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGdldFVzZXJOb3RpZmljYXRpb25zKHVzZXJJZCwgcGFyc2VJbnQobGltaXQpLCB1bnJlYWRPbmx5ID09PSAndHJ1ZScpO1xuICAgICAgXG4gICAgICByZXMuanNvbihyZXN1bHQpO1xuICAgICAgXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBub3RpZmljYXRpb25zIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdFcnJvcmUgcmVjdXBlcm8gbm90aWZpY2hlJyB9KTtcbiAgICB9XG4gIH0pO1xuICBcbiAgLy8gR0VUIFVOUkVBRCBOT1RJRklDQVRJT05TIENPVU5UXG4gIGFwcC5nZXQoJy9hcGkvc29jaWFsL25vdGlmaWNhdGlvbnMvOnVzZXJJZC91bnJlYWQtY291bnQnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyB1c2VySWQgfSA9IHJlcS5wYXJhbXM7XG4gICAgICBcbiAgICAgIGNvbnN0IHsgZ2V0VW5yZWFkTm90aWZpY2F0aW9uc0NvdW50IH0gPSBhd2FpdCBpbXBvcnQoJy4vc29jaWFsLWFwaS5qcycpO1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2V0VW5yZWFkTm90aWZpY2F0aW9uc0NvdW50KHVzZXJJZCk7XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHJlc3VsdCk7XG4gICAgICBcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignR2V0IHVucmVhZCBjb3VudCBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIGNvbnRlZ2dpbyBub3RpZmljaGUnIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gTGl2ZUtpdCB0b2tlbiBlbmRwb2ludFxuICBhcHAucG9zdCgnL2FwaS9saXZla2l0L3Rva2VuJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgcm9vbU5hbWUsIHBhcnRpY2lwYW50TmFtZSwgcm9sZSA9ICdzdWJzY3JpYmVyJyB9ID0gcmVxLmJvZHk7XG4gICAgICBcbiAgICAgIGNvbnNvbGUubG9nKCdcdUQ4M0NcdURGQTUgTGl2ZUtpdCB0b2tlbiByZXF1ZXN0IHZpYSBWaXRlOicsIHsgcm9vbU5hbWUsIHBhcnRpY2lwYW50TmFtZSwgcm9sZSB9KTtcbiAgICAgIFxuICAgICAgLy8gSW1wb3J0YSBBY2Nlc3NUb2tlblxuICAgICAgY29uc3QgeyBBY2Nlc3NUb2tlbiB9ID0gYXdhaXQgaW1wb3J0KCdsaXZla2l0LXNlcnZlci1zZGsnKTtcbiAgICAgIFxuICAgICAgaWYgKCFwcm9jZXNzLmVudi5MSVZFS0lUX0FQSV9LRVkgfHwgIXByb2Nlc3MuZW52LkxJVkVLSVRfU0VDUkVUX0tFWSB8fCAhcHJvY2Vzcy5lbnYuTElWRUtJVF9VUkwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdMaXZlS2l0IGNyZWRlbnRpYWxzIG5vdCBjb25maWd1cmVkJyk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIENyZWF0ZSB0b2tlbiB3aXRoIHByb3BlciBvcHRpb25zXG4gICAgICBjb25zdCB0b2tlbiA9IG5ldyBBY2Nlc3NUb2tlbihwcm9jZXNzLmVudi5MSVZFS0lUX0FQSV9LRVksIHByb2Nlc3MuZW52LkxJVkVLSVRfU0VDUkVUX0tFWSwge1xuICAgICAgICBpZGVudGl0eTogcGFydGljaXBhbnROYW1lLFxuICAgICAgICBuYW1lOiBwYXJ0aWNpcGFudE5hbWUsXG4gICAgICAgIHR0bDogJzI0aCcsXG4gICAgICB9KTtcblxuICAgICAgLy8gQWRkIGdyYW50cyB3aXRoIHByb3BlciByb29tIG5hbWVcbiAgICAgIGNvbnN0IGdyYW50ID0ge1xuICAgICAgICByb29tSm9pbjogdHJ1ZSxcbiAgICAgICAgcm9vbTogcm9vbU5hbWUsXG4gICAgICAgIGNhblB1Ymxpc2g6IHJvbGUgPT09ICdwdWJsaXNoZXInLFxuICAgICAgICBjYW5TdWJzY3JpYmU6IHRydWUsXG4gICAgICAgIGNhblB1Ymxpc2hEYXRhOiByb2xlID09PSAncHVibGlzaGVyJyxcbiAgICAgIH07XG4gICAgICBcbiAgICAgIHRva2VuLmFkZEdyYW50KGdyYW50KTtcblxuICAgICAgLy8gR2VuZXJhdGUgSldUXG4gICAgICBsZXQgand0VG9rZW47XG4gICAgICB0cnkge1xuICAgICAgICBqd3RUb2tlbiA9IGF3YWl0IHRva2VuLnRvSnd0KCk7XG4gICAgICB9IGNhdGNoIChhc3luY0Vycm9yKSB7XG4gICAgICAgIGp3dFRva2VuID0gdG9rZW4udG9Kd3QoKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKCFqd3RUb2tlbiB8fCB0eXBlb2Ygand0VG9rZW4gIT09ICdzdHJpbmcnIHx8IGp3dFRva2VuLmxlbmd0aCA8IDEwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVG9rZW4gZ2VuZXJhdGlvbiBmYWlsZWQgLSBpbnZhbGlkIEpXVDogJHt0eXBlb2Ygand0VG9rZW59LCBsZW5ndGg6ICR7and0VG9rZW4/Lmxlbmd0aH1gKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgY29uc29sZS5sb2coJ1x1MjcwNSBUb2tlbiBnZW5lcmF0byB2aWEgVml0ZSwgbHVuZ2hlenphOicsIGp3dFRva2VuLmxlbmd0aCk7XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHsgXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIHRva2VuOiBqd3RUb2tlbixcbiAgICAgICAgc2VydmVyVXJsOiBwcm9jZXNzLmVudi5MSVZFS0lUX1VSTCxcbiAgICAgICAgbWVzc2FnZTogJ1Rva2VuIExpdmVLaXQgZ2VuZXJhdG8gY29uIHN1Y2Nlc3NvJ1xuICAgICAgfSk7XG4gICAgICBcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignXHUyNzRDIExpdmVLaXQgdG9rZW4gZXJyb3IgdmlhIFZpdGU6JywgZXJyb3IpO1xuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogJ0Vycm9yZSBnZW5lcmF6aW9uZSB0b2tlbiBMaXZlS2l0JyB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIE5PVEE6IEVuZHBvaW50IExpdmVLaXQgZHVwbGljYXRvIHJpbW9zc28gLSB1c2EgcXVlbGxvIHByaW5jaXBhbGUgaW4gc2VydmVyL2FwcC5qc1xuXG4gIGNvbnNvbGUubG9nKCdcdTI3MDUgQVBJIFJvdXRlcyBjb25maWd1cmF0ZSBuZWwgc2VydmVyIFZpdGUhJyk7XG59Il0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBU08sU0FBUyxtQkFBbUIsU0FBUyxNQUFNO0FBQ2hELE1BQUksWUFBWTtBQUVoQixVQUFRLE1BQU07QUFBQSxJQUNaLEtBQUs7QUFDSCxrQkFBWSxtQkFBbUIsT0FBTztBQUN0QztBQUFBLElBQ0YsS0FBSztBQUNILGtCQUFZLG1CQUFtQixPQUFPO0FBQ3RDO0FBQUEsSUFDRixLQUFLO0FBQ0gsa0JBQVksc0JBQXNCLE9BQU87QUFDekM7QUFBQSxJQUNGO0FBQ0Usa0JBQVk7QUFBQSxFQUNoQjtBQUVBLFNBQU8sS0FBSyxJQUFJLFdBQVcsRUFBRTtBQUMvQjtBQUtBLFNBQVMsbUJBQW1CLE1BQU07QUFDaEMsUUFBTTtBQUFBLElBQ0osZUFBZTtBQUFBLElBQ2YsYUFBYTtBQUFBLElBQ2IsbUJBQW1CO0FBQUEsSUFDbkIsbUJBQW1CO0FBQUEsSUFDbkIsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsU0FBUztBQUFBLEVBQ1gsSUFBSTtBQUdKLE1BQUksUUFBUTtBQUdaLFdBQVMsS0FBSyxJQUFJLGVBQWUsSUFBSSxHQUFHO0FBR3hDLFdBQVMsS0FBSyxJQUFJLGFBQWEsSUFBSSxHQUFHO0FBR3RDLFdBQVM7QUFHVCxXQUFTLEtBQUssSUFBSSxrQkFBa0IsR0FBRztBQUd2QyxXQUFTLFFBQVE7QUFDakIsV0FBUyxXQUFXO0FBQ3BCLFdBQVMsU0FBUztBQUVsQixTQUFPLEtBQUssTUFBTSxLQUFLO0FBQ3pCO0FBS0EsU0FBUyxtQkFBbUIsTUFBTTtBQUNoQyxRQUFNO0FBQUEsSUFDSixRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsSUFDWCxTQUFTO0FBQUEsSUFDVCxRQUFRO0FBQUEsSUFDUixRQUFRO0FBQUEsSUFDUixpQkFBaUI7QUFBQSxFQUNuQixJQUFJO0FBR0osTUFBSSxRQUFRO0FBR1osV0FBUyxLQUFLLElBQUksUUFBUSxLQUFLLEdBQUc7QUFHbEMsV0FBUyxRQUFRO0FBQ2pCLFdBQVMsV0FBVztBQUNwQixXQUFTLFNBQVM7QUFDbEIsV0FBUyxRQUFRO0FBQ2pCLFdBQVMsaUJBQWlCO0FBRTFCLFNBQU8sS0FBSyxNQUFNLEtBQUs7QUFDekI7QUFLQSxTQUFTLHNCQUFzQixTQUFTO0FBQ3RDLFFBQU07QUFBQSxJQUNKLFlBQVk7QUFBQSxJQUNaLGNBQWM7QUFBQSxJQUNkLGFBQWE7QUFBQSxJQUNiLGdCQUFnQjtBQUFBLElBQ2hCLGdCQUFnQjtBQUFBLElBQ2hCLGNBQWM7QUFBQSxFQUNoQixJQUFJO0FBR0osTUFBSSxRQUFRO0FBR1osV0FBUyxLQUFLLElBQUksWUFBWSxLQUFLLEdBQUc7QUFHdEMsV0FBUyxLQUFLLElBQUksY0FBYyxHQUFHLEdBQUc7QUFHdEMsV0FBVSxhQUFhLElBQUs7QUFHNUIsV0FBUyxLQUFLLElBQUksZ0JBQWdCLEdBQUcsR0FBRztBQUd4QyxXQUFTLEtBQUssSUFBSSxnQkFBZ0IsS0FBSyxHQUFHO0FBRzFDLFdBQVMsS0FBSyxJQUFJLGFBQWEsR0FBRztBQUVsQyxTQUFPLEtBQUssTUFBTSxLQUFLO0FBQ3pCO0FBUU8sU0FBUyxXQUFXLFdBQVcsa0JBQWtCLEdBQUc7QUFDekQsU0FBTyxLQUFLLE1BQU0sWUFBWSxlQUFlO0FBQy9DO0FBU08sU0FBUyxzQkFBc0IsU0FBUyxNQUFNLGtCQUFrQixHQUFHO0FBQ3hFLFFBQU0sWUFBWSxtQkFBbUIsU0FBUyxJQUFJO0FBQ2xELFFBQU0sZUFBZSxXQUFXLFdBQVcsZUFBZTtBQUcxRCxRQUFNLFlBQVksbUJBQW1CLFFBQVEsVUFBVTtBQUN2RCxRQUFNLGFBQWEsS0FBSyxNQUFNLGVBQWUsU0FBUztBQUV0RCxTQUFPO0FBQUEsSUFDTDtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsRUFDRjtBQUNGO0FBS0EsU0FBUyxtQkFBbUIsV0FBVztBQUNyQyxRQUFNLE1BQU0sb0JBQUksS0FBSztBQUNyQixRQUFNLFVBQVUsSUFBSSxLQUFLLFNBQVM7QUFDbEMsUUFBTSxZQUFZLE1BQU0sWUFBWSxNQUFPLEtBQUs7QUFHaEQsTUFBSSxZQUFZO0FBQUcsV0FBTztBQUMxQixNQUFJLFlBQVk7QUFBSSxXQUFPO0FBQzNCLE1BQUksWUFBWTtBQUFJLFdBQU87QUFDM0IsTUFBSSxZQUFZO0FBQUksV0FBTztBQUMzQixNQUFJLFlBQVk7QUFBSSxXQUFPO0FBQzNCLFNBQU87QUFDVDtBQUtPLFNBQVMsZ0JBQWdCLEdBQUcsR0FBRztBQUNwQyxRQUFNLFdBQVcsc0JBQXNCLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxtQkFBbUIsQ0FBQztBQUNoRixRQUFNLFdBQVcsc0JBQXNCLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxtQkFBbUIsQ0FBQztBQUVoRixTQUFPLFNBQVMsYUFBYSxTQUFTO0FBQ3hDO0FBS08sU0FBUyxzQkFBc0IsVUFBVTtBQUM5QyxTQUFPLFNBQ0osSUFBSSxXQUFTO0FBQUEsSUFDWixHQUFHO0FBQUEsSUFDSCxTQUFTLHNCQUFzQixLQUFLLFNBQVMsS0FBSyxNQUFNLEtBQUssbUJBQW1CLENBQUM7QUFBQSxFQUNuRixFQUFFLEVBQ0QsS0FBSyxDQUFDLEdBQUcsTUFBTSxFQUFFLFFBQVEsYUFBYSxFQUFFLFFBQVEsVUFBVTtBQUMvRDtBQTVNQTtBQUFBO0FBQUE7QUFBQTtBQUFBOzs7QUNBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUtBLFNBQVMsb0JBQW9CO0FBYzdCLGVBQWUsVUFBVSxRQUFRLFVBQVU7QUFDekMsTUFBSTtBQUVGLFFBQUksQ0FBQyxhQUFhLElBQUksTUFBTSxHQUFHO0FBQzdCLG1CQUFhLElBQUksUUFBUSxvQkFBSSxJQUFJLENBQUM7QUFBQSxJQUNwQztBQUVBLFVBQU0sVUFBVSxhQUFhLElBQUksTUFBTTtBQUN2QyxVQUFNLHFCQUFxQixRQUFRLElBQUksUUFBUTtBQUUvQyxRQUFJLENBQUMsb0JBQW9CO0FBQ3ZCLGNBQVEsSUFBSSxRQUFRO0FBR3BCLFlBQU0sV0FBVyxRQUFRO0FBRXpCLFlBQU0sRUFBRSxNQUFNLE1BQU0sSUFBSSxNQUFNLFNBQzNCLEtBQUssT0FBTyxFQUNaLE9BQU87QUFBQSxRQUNOLFNBQVM7QUFBQSxNQUNYLENBQUMsRUFDQSxHQUFHLE1BQU0sTUFBTSxFQUNmLE9BQU8sU0FBUyxFQUNoQixZQUFZO0FBRWYsVUFBSSxTQUFTLENBQUMsTUFBTTtBQUNsQixnQkFBUSxLQUFLLHFCQUFXLE1BQU0saURBQWlEO0FBQy9FLGdCQUFRLEtBQUssY0FBYyxLQUFLO0FBQ2hDLGVBQU87QUFBQSxVQUNMLFNBQVM7QUFBQSxVQUNULFNBQVM7QUFBQSxVQUNULGNBQWM7QUFBQSxRQUNoQjtBQUFBLE1BQ0Y7QUFFQSxjQUFRLElBQUksMkNBQW9DLE1BQU0sS0FBSyxRQUFRLHFCQUFxQjtBQUd4Riw0QkFBc0IsUUFBUSxRQUFRO0FBRXRDLGFBQU87QUFBQSxRQUNMLFNBQVM7QUFBQSxRQUNULFNBQVM7QUFBQSxRQUNULGNBQWM7QUFBQTtBQUFBLE1BQ2hCO0FBQUEsSUFDRjtBQUdBLDBCQUFzQixRQUFRLFFBQVE7QUFFdEMsV0FBTztBQUFBLE1BQ0wsU0FBUztBQUFBLE1BQ1QsU0FBUyxRQUFRO0FBQUEsTUFDakIsY0FBYztBQUFBLElBQ2hCO0FBQUEsRUFFRixTQUFTLE9BQU87QUFDZCxZQUFRLEtBQUssMERBQWdELE1BQU0sT0FBTztBQUUxRSxVQUFNLFVBQVUsYUFBYSxJQUFJLE1BQU0sS0FBSyxvQkFBSSxJQUFJO0FBQ3BELFdBQU87QUFBQSxNQUNMLFNBQVM7QUFBQSxNQUNULFNBQVMsUUFBUTtBQUFBLE1BQ2pCLGNBQWM7QUFBQSxJQUNoQjtBQUFBLEVBQ0Y7QUFDRjtBQUtBLGVBQWUsYUFBYSxRQUFRLFVBQVU7QUFDNUMsTUFBSTtBQUNGLFVBQU0sVUFBVSxhQUFhLElBQUksTUFBTTtBQUN2QyxRQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsSUFBSSxRQUFRLEdBQUc7QUFDdEMsYUFBTyxFQUFFLFNBQVMsTUFBTSxTQUFTLFNBQVMsUUFBUSxFQUFFO0FBQUEsSUFDdEQ7QUFHQSxZQUFRLE9BQU8sUUFBUTtBQUd2QixVQUFNLFVBQVUsY0FBYyxJQUFJLEdBQUcsTUFBTSxJQUFJLFFBQVEsRUFBRTtBQUN6RCxRQUFJLFNBQVM7QUFDWCxtQkFBYSxPQUFPO0FBQ3BCLG9CQUFjLE9BQU8sR0FBRyxNQUFNLElBQUksUUFBUSxFQUFFO0FBQUEsSUFDOUM7QUFHQSxVQUFNLFdBQVcsUUFBUTtBQUV6QixVQUFNLEVBQUUsTUFBTSxNQUFNLElBQUksTUFBTSxTQUMzQixLQUFLLE9BQU8sRUFDWixPQUFPLEVBQUUsU0FBUyxTQUFTLENBQUMsRUFDNUIsR0FBRyxNQUFNLE1BQU0sRUFDZixPQUFPLFNBQVMsRUFDaEIsT0FBTztBQUVWLFFBQUk7QUFBTyxZQUFNO0FBRWpCLFlBQVEsSUFBSSwyQ0FBb0MsTUFBTSxLQUFLLFFBQVEsdUJBQXVCO0FBRzFGLFVBQU0sa0JBQWtCLFFBQVEsUUFBUTtBQUV4QyxXQUFPO0FBQUEsTUFDTCxTQUFTO0FBQUEsTUFDVCxTQUFTO0FBQUEsSUFDWDtBQUFBLEVBRUYsU0FBUyxPQUFPO0FBQ2QsWUFBUSxNQUFNLHVDQUFrQyxLQUFLO0FBQ3JELFdBQU8sRUFBRSxTQUFTLE9BQU8sT0FBTyxNQUFNLFFBQVE7QUFBQSxFQUNoRDtBQUNGO0FBS0EsU0FBUyxzQkFBc0IsUUFBUSxVQUFVO0FBQy9DLFFBQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxRQUFRO0FBR2pDLFFBQU0sZ0JBQWdCLGNBQWMsSUFBSSxHQUFHO0FBQzNDLE1BQUksZUFBZTtBQUNqQixpQkFBYSxhQUFhO0FBQUEsRUFDNUI7QUFHQSxRQUFNLFFBQVEsV0FBVyxZQUFZO0FBQ25DLFlBQVEsSUFBSSwyQ0FBb0MsUUFBUSxlQUFlLE1BQU0sRUFBRTtBQUMvRSxVQUFNLGFBQWEsUUFBUSxRQUFRO0FBQUEsRUFDckMsR0FBRyxJQUFJLEtBQUssR0FBSTtBQUVoQixnQkFBYyxJQUFJLEtBQUssS0FBSztBQUM5QjtBQUtBLGVBQWUsa0JBQWtCLFFBQVEsYUFBYTtBQUNwRCxNQUFJO0FBRUYsVUFBTSxFQUFFLE1BQU0sTUFBTSxNQUFNLElBQUksTUFBTSxTQUNqQyxLQUFLLE9BQU8sRUFDWixPQUFPLEdBQUcsRUFDVixHQUFHLE1BQU0sTUFBTSxFQUNmLE9BQU87QUFFVixRQUFJO0FBQU8sWUFBTTtBQUdqQixVQUFNLEVBQUUsb0JBQUFBLHFCQUFvQixZQUFBQyxZQUFXLElBQUksTUFBTTtBQUdqRCxVQUFNLGtCQUFrQjtBQUFBLE1BQ3RCLEdBQUc7QUFBQSxNQUNILGNBQWM7QUFBQSxJQUNoQjtBQUVBLFVBQU0sWUFBWUQsb0JBQW1CLGlCQUFpQixhQUFhO0FBR25FLFVBQU0sRUFBRSxNQUFNLGFBQWEsSUFBSSxNQUFNLFNBQ2xDLEtBQUssaUJBQWlCLEVBQ3RCLE9BQU8sOEJBQThCLEVBQ3JDLEdBQUcsZ0JBQWdCLE1BQU0sRUFDekIsR0FBRyxjQUFjLE1BQU0sRUFDdkIsR0FBRyxVQUFVLFFBQVEsRUFDckIsR0FBRyxlQUFjLG9CQUFJLEtBQUssR0FBRSxZQUFZLENBQUM7QUFFNUMsUUFBSSxhQUFhO0FBQ2pCLFFBQUksZ0JBQWdCLGFBQWEsU0FBUyxHQUFHO0FBQzNDLFlBQU0sUUFBUSxhQUFhLENBQUM7QUFDNUIsbUJBQWFDLFlBQVcsV0FBVyxNQUFNLGdCQUFnQjtBQUFBLElBQzNEO0FBR0EsWUFBUSxJQUFJLHVDQUFnQyxNQUFNLEtBQUssVUFBVSxLQUFLLFdBQVcsY0FBYztBQUUvRixXQUFPO0FBQUEsRUFFVCxTQUFTLE9BQU87QUFDZCxZQUFRLE1BQU0sd0NBQW1DLEtBQUs7QUFDdEQsV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQUtBLGVBQWUsZUFBZSxRQUFRO0FBQ3BDLE1BQUk7QUFDRixVQUFNLEVBQUUsTUFBTSxNQUFNLElBQUksTUFBTSxTQUMzQixLQUFLLE9BQU8sRUFDWixPQUFPLFNBQVMsRUFDaEIsR0FBRyxNQUFNLE1BQU0sRUFDZixZQUFZO0FBR2YsUUFBSSxTQUFTLE1BQU0sU0FBUyxZQUFZO0FBQ3RDLFlBQU07QUFBQSxJQUNSO0FBRUEsVUFBTSxVQUFVLGFBQWEsSUFBSSxNQUFNLEdBQUcsUUFBUTtBQUVsRCxXQUFPO0FBQUEsTUFDTCxTQUFTLEtBQUssSUFBSSxTQUFTLE1BQU0sV0FBVyxDQUFDO0FBQUEsTUFDN0MsT0FBTztBQUFBO0FBQUEsTUFDUCxRQUFRO0FBQUEsSUFDVjtBQUFBLEVBRUYsU0FBUyxPQUFPO0FBRWQsUUFBSSxNQUFNLFNBQVMsWUFBWTtBQUM3QixjQUFRLE1BQU0sbUNBQThCLEtBQUs7QUFBQSxJQUNuRDtBQUNBLFdBQU8sRUFBRSxTQUFTLEdBQUcsT0FBTyxHQUFHLFFBQVEsRUFBRTtBQUFBLEVBQzNDO0FBQ0Y7QUFLQSxlQUFlLFlBQVksUUFBUTtBQUNqQyxVQUFRLElBQUksbUNBQTRCLE1BQU0sRUFBRTtBQUdoRCxRQUFNLFVBQVUsYUFBYSxJQUFJLE1BQU07QUFDdkMsTUFBSSxTQUFTO0FBQ1gsZUFBVyxZQUFZLFNBQVM7QUFDOUIsWUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLFFBQVE7QUFDakMsWUFBTSxRQUFRLGNBQWMsSUFBSSxHQUFHO0FBQ25DLFVBQUksT0FBTztBQUNULHFCQUFhLEtBQUs7QUFDbEIsc0JBQWMsT0FBTyxHQUFHO0FBQUEsTUFDMUI7QUFBQSxJQUNGO0FBQ0EsaUJBQWEsT0FBTyxNQUFNO0FBQUEsRUFDNUI7QUFHQSxRQUFNLFNBQ0gsS0FBSyxPQUFPLEVBQ1osT0FBTyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQ3JCLEdBQUcsTUFBTSxNQUFNO0FBQ3BCO0FBelFBLElBT00sVUFNQSxjQUNBO0FBZE47QUFBQTtBQUFBO0FBT0EsSUFBTSxXQUFXO0FBQUEsTUFDZixRQUFRLElBQUk7QUFBQSxNQUNaLFFBQVEsSUFBSTtBQUFBLElBQ2Q7QUFHQSxJQUFNLGVBQWUsb0JBQUksSUFBSTtBQUM3QixJQUFNLGdCQUFnQixvQkFBSSxJQUFJO0FBQUE7QUFBQTs7O0FDZG9QLFNBQVMsZ0JBQUFDLHFCQUFvQjtBQUEvUyxJQUVNLFVBRU9DO0FBSmI7QUFBQTtBQUFBO0FBRUEsSUFBTSxXQUFXO0FBRVYsSUFBTUEsWUFBV0Q7QUFBQSxNQUN0QixZQUFZLElBQUk7QUFBQSxNQUNoQixZQUFZLElBQUk7QUFBQSxNQUNoQjtBQUFBLFFBQ0UsTUFBTTtBQUFBLFVBQ0osa0JBQWtCO0FBQUEsVUFDbEIsZ0JBQWdCO0FBQUEsVUFDaEIsb0JBQW9CO0FBQUE7QUFBQSxVQUVwQixTQUFTO0FBQUEsVUFDVCxZQUFZLEdBQUcsUUFBUTtBQUFBLFFBQ3pCO0FBQUEsUUFDQSxRQUFRO0FBQUEsVUFDTixTQUFTO0FBQUEsWUFDUCxjQUFjO0FBQUEsVUFDaEI7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQTtBQUFBOzs7QUN0QkE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQVlBLGVBQXNCLGFBQWEsWUFBWSxhQUFhO0FBQzFELE1BQUk7QUFDRixRQUFJLGVBQWUsYUFBYTtBQUM5QixhQUFPLEVBQUUsU0FBUyxPQUFPLE9BQU8sNkJBQTZCO0FBQUEsSUFDL0Q7QUFHQSxVQUFNLEVBQUUsTUFBTSxTQUFTLElBQUksTUFBTUUsVUFDOUIsS0FBSyxTQUFTLEVBQ2QsT0FBTyxJQUFJLEVBQ1gsR0FBRyxlQUFlLFVBQVUsRUFDNUIsR0FBRyxnQkFBZ0IsV0FBVyxFQUM5QixPQUFPO0FBRVYsUUFBSSxVQUFVO0FBRVosWUFBTUEsVUFDSCxLQUFLLFNBQVMsRUFDZCxPQUFPLEVBQ1AsR0FBRyxlQUFlLFVBQVUsRUFDNUIsR0FBRyxnQkFBZ0IsV0FBVztBQUVqQyxhQUFPLEVBQUUsU0FBUyxNQUFNLFFBQVEsYUFBYTtBQUFBLElBQy9DLE9BQU87QUFFTCxZQUFNQSxVQUNILEtBQUssU0FBUyxFQUNkLE9BQU8sRUFBRSxhQUFhLFlBQVksY0FBYyxZQUFZLENBQUM7QUFHaEUsWUFBTSxtQkFBbUI7QUFBQSxRQUN2QixTQUFTO0FBQUEsUUFDVCxVQUFVO0FBQUEsUUFDVixNQUFNO0FBQUEsUUFDTixPQUFPO0FBQUEsUUFDUCxTQUFTO0FBQUEsUUFDVCxZQUFZLFlBQVksVUFBVTtBQUFBLE1BQ3BDLENBQUM7QUFFRCxhQUFPLEVBQUUsU0FBUyxNQUFNLFFBQVEsV0FBVztBQUFBLElBQzdDO0FBQUEsRUFDRixTQUFTLE9BQU87QUFDZCxZQUFRLE1BQU0sd0JBQXdCLEtBQUs7QUFDM0MsV0FBTyxFQUFFLFNBQVMsT0FBTyxPQUFPLE1BQU0sUUFBUTtBQUFBLEVBQ2hEO0FBQ0Y7QUFHQSxlQUFzQixtQkFBbUIsUUFBUTtBQUMvQyxNQUFJO0FBQ0YsVUFBTSxDQUFDLGlCQUFpQixlQUFlLElBQUksTUFBTSxRQUFRLElBQUk7QUFBQSxNQUMzREEsVUFDRyxLQUFLLFNBQVMsRUFDZCxPQUFPLElBQUksRUFDWCxHQUFHLGdCQUFnQixNQUFNO0FBQUEsTUFDNUJBLFVBQ0csS0FBSyxTQUFTLEVBQ2QsT0FBTyxJQUFJLEVBQ1gsR0FBRyxlQUFlLE1BQU07QUFBQSxJQUM3QixDQUFDO0FBRUQsV0FBTztBQUFBLE1BQ0wsaUJBQWlCLGdCQUFnQixNQUFNLFVBQVU7QUFBQSxNQUNqRCxpQkFBaUIsZ0JBQWdCLE1BQU0sVUFBVTtBQUFBLElBQ25EO0FBQUEsRUFDRixTQUFTLE9BQU87QUFDZCxZQUFRLE1BQU0sMkJBQTJCLEtBQUs7QUFDOUMsV0FBTyxFQUFFLGlCQUFpQixHQUFHLGlCQUFpQixFQUFFO0FBQUEsRUFDbEQ7QUFDRjtBQUdBLGVBQXNCLGlCQUFpQixZQUFZLGFBQWE7QUFDOUQsTUFBSTtBQUNGLFVBQU0sRUFBRSxLQUFLLElBQUksTUFBTUEsVUFDcEIsS0FBSyxTQUFTLEVBQ2QsT0FBTyxJQUFJLEVBQ1gsR0FBRyxlQUFlLFVBQVUsRUFDNUIsR0FBRyxnQkFBZ0IsV0FBVyxFQUM5QixPQUFPO0FBRVYsV0FBTyxDQUFDLENBQUM7QUFBQSxFQUNYLFNBQVMsT0FBTztBQUNkLFdBQU87QUFBQSxFQUNUO0FBQ0Y7QUFPQSxlQUFzQixpQkFBaUIsVUFBVTtBQUMvQyxNQUFJO0FBQ0YsVUFBTSxFQUFFLE1BQU0sTUFBTSxNQUFNLElBQUksTUFBTUEsVUFDakMsS0FBSyxjQUFjLEVBQ25CLE9BQU87QUFBQSxNQUNOLFNBQVMsU0FBUztBQUFBLE1BQ2xCLFNBQVMsU0FBUztBQUFBLE1BQ2xCLFFBQVEsU0FBUyxVQUFVLENBQUM7QUFBQSxNQUM1QixTQUFTLFNBQVMsV0FBVztBQUFBLElBQy9CLENBQUMsRUFDQSxPQUFPLEVBQ1AsT0FBTztBQUVWLFFBQUk7QUFBTyxZQUFNO0FBR2pCLFVBQU0seUJBQXlCLFNBQVMsU0FBUyxLQUFLLEVBQUU7QUFFeEQsV0FBTyxFQUFFLFNBQVMsTUFBTSxLQUFLO0FBQUEsRUFDL0IsU0FBUyxPQUFPO0FBQ2QsWUFBUSxNQUFNLHNCQUFzQixLQUFLO0FBQ3pDLFdBQU8sRUFBRSxTQUFTLE9BQU8sT0FBTyxNQUFNLFFBQVE7QUFBQSxFQUNoRDtBQUNGO0FBR0EsZUFBc0IsYUFBYSxRQUFRLFFBQVEsSUFBSSxTQUFTLEdBQUc7QUFDakUsTUFBSTtBQUNGLFVBQU0sRUFBRSxNQUFNLE9BQU8sTUFBTSxJQUFJLE1BQU1BLFVBQ2xDLEtBQUssY0FBYyxFQUNuQixPQUFPO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxPQVFQLEVBQ0EsR0FBRyxXQUFXLE1BQU0sRUFDcEIsR0FBRyxVQUFVLFdBQVcsRUFDeEIsTUFBTSxjQUFjLEVBQUUsV0FBVyxNQUFNLENBQUMsRUFDeEMsTUFBTSxRQUFRLFNBQVMsUUFBUSxDQUFDO0FBRW5DLFFBQUk7QUFBTyxZQUFNO0FBRWpCLFdBQU8sRUFBRSxTQUFTLE1BQU0sT0FBTyxTQUFTLENBQUMsRUFBRTtBQUFBLEVBQzdDLFNBQVMsT0FBTztBQUNkLFlBQVEsTUFBTSx5QkFBeUIsS0FBSztBQUM1QyxXQUFPLEVBQUUsU0FBUyxPQUFPLE9BQU8sQ0FBQyxFQUFFO0FBQUEsRUFDckM7QUFDRjtBQUdBLGVBQXNCLGFBQWEsUUFBUSxRQUFRLElBQUksU0FBUyxHQUFHO0FBQ2pFLE1BQUk7QUFJRixRQUFJLFFBQVFBLFVBQ1QsS0FBSyxjQUFjLEVBQ25CLE9BQU87QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE9BUVAsRUFDQSxHQUFHLFVBQVUsV0FBVztBQUUzQixRQUFJLFFBQVE7QUFFVixZQUFNLEVBQUUsTUFBTSxVQUFVLElBQUksTUFBTUEsVUFDL0IsS0FBSyxTQUFTLEVBQ2QsT0FBTyxjQUFjLEVBQ3JCLEdBQUcsZUFBZSxNQUFNO0FBRTNCLFlBQU0sZUFBZSxXQUFXLElBQUksT0FBSyxFQUFFLFlBQVksS0FBSyxDQUFDO0FBRTdELFVBQUksYUFBYSxTQUFTLEdBQUc7QUFDM0IsZ0JBQVEsTUFBTSxHQUFHLFdBQVcsWUFBWTtBQUFBLE1BQzFDO0FBQUEsSUFDRjtBQUVBLFVBQU0sRUFBRSxNQUFNLE9BQU8sTUFBTSxJQUFJLE1BQU0sTUFDbEMsTUFBTSxjQUFjLEVBQUUsV0FBVyxNQUFNLENBQUMsRUFDeEMsTUFBTSxRQUFRLFNBQVMsUUFBUSxDQUFDO0FBRW5DLFFBQUk7QUFBTyxZQUFNO0FBRWpCLFdBQU8sRUFBRSxTQUFTLE1BQU0sT0FBTyxTQUFTLENBQUMsRUFBRTtBQUFBLEVBQzdDLFNBQVMsT0FBTztBQUNkLFlBQVEsTUFBTSx5QkFBeUIsS0FBSztBQUM1QyxXQUFPLEVBQUUsU0FBUyxPQUFPLE9BQU8sQ0FBQyxFQUFFO0FBQUEsRUFDckM7QUFDRjtBQUdBLGVBQXNCLGVBQWUsUUFBUSxRQUFRO0FBQ25ELE1BQUk7QUFDRixVQUFNLEVBQUUsTUFBTSxTQUFTLElBQUksTUFBTUEsVUFDOUIsS0FBSyxZQUFZLEVBQ2pCLE9BQU8sSUFBSSxFQUNYLEdBQUcsV0FBVyxNQUFNLEVBQ3BCLEdBQUcsV0FBVyxNQUFNLEVBQ3BCLE9BQU87QUFFVixRQUFJLFVBQVU7QUFFWixZQUFNQSxVQUNILEtBQUssWUFBWSxFQUNqQixPQUFPLEVBQ1AsR0FBRyxXQUFXLE1BQU0sRUFDcEIsR0FBRyxXQUFXLE1BQU07QUFFdkIsYUFBTyxFQUFFLFNBQVMsTUFBTSxRQUFRLFVBQVU7QUFBQSxJQUM1QyxPQUFPO0FBRUwsWUFBTUEsVUFDSCxLQUFLLFlBQVksRUFDakIsT0FBTyxFQUFFLFNBQVMsUUFBUSxTQUFTLE9BQU8sQ0FBQztBQUc5QyxZQUFNLEVBQUUsTUFBTSxLQUFLLElBQUksTUFBTUEsVUFDMUIsS0FBSyxjQUFjLEVBQ25CLE9BQU8sU0FBUyxFQUNoQixHQUFHLE1BQU0sTUFBTSxFQUNmLE9BQU87QUFFVixVQUFJLFFBQVEsS0FBSyxZQUFZLFFBQVE7QUFDbkMsY0FBTSxtQkFBbUI7QUFBQSxVQUN2QixTQUFTLEtBQUs7QUFBQSxVQUNkLFVBQVU7QUFBQSxVQUNWLE1BQU07QUFBQSxVQUNOLE9BQU87QUFBQSxVQUNQLFNBQVM7QUFBQSxVQUNULFlBQVksU0FBUyxNQUFNO0FBQUEsUUFDN0IsQ0FBQztBQUFBLE1BQ0g7QUFFQSxhQUFPLEVBQUUsU0FBUyxNQUFNLFFBQVEsUUFBUTtBQUFBLElBQzFDO0FBQUEsRUFDRixTQUFTLE9BQU87QUFDZCxZQUFRLE1BQU0sc0JBQXNCLEtBQUs7QUFDekMsV0FBTyxFQUFFLFNBQVMsT0FBTyxPQUFPLE1BQU0sUUFBUTtBQUFBLEVBQ2hEO0FBQ0Y7QUFPQSxlQUFzQixZQUFZLFdBQVc7QUFDM0MsTUFBSTtBQUNGLFVBQU0sRUFBRSxNQUFNLE9BQU8sTUFBTSxJQUFJLE1BQU1BLFVBQ2xDLEtBQUssU0FBUyxFQUNkLE9BQU87QUFBQSxNQUNOLFNBQVMsVUFBVTtBQUFBLE1BQ25CLFdBQVcsVUFBVTtBQUFBLE1BQ3JCLFlBQVksVUFBVSxjQUFjO0FBQUEsTUFDcEMsY0FBYyxVQUFVLGdCQUFnQjtBQUFBLE1BQ3hDLGtCQUFrQixVQUFVLG9CQUFvQjtBQUFBLElBQ2xELENBQUMsRUFDQSxPQUFPLEVBQ1AsT0FBTztBQUVWLFFBQUk7QUFBTyxZQUFNO0FBRWpCLFdBQU8sRUFBRSxTQUFTLE1BQU0sTUFBTTtBQUFBLEVBQ2hDLFNBQVMsT0FBTztBQUNkLFlBQVEsTUFBTSx1QkFBdUIsS0FBSztBQUMxQyxXQUFPLEVBQUUsU0FBUyxPQUFPLE9BQU8sTUFBTSxRQUFRO0FBQUEsRUFDaEQ7QUFDRjtBQUdBLGVBQXNCLGVBQWUsUUFBUTtBQUMzQyxNQUFJO0FBQ0YsVUFBTSxFQUFFLE1BQU0sU0FBUyxNQUFNLElBQUksTUFBTUEsVUFDcEMsS0FBSyxTQUFTLEVBQ2QsT0FBTztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsT0FLUCxFQUNBLEdBQUcsV0FBVyxNQUFNLEVBQ3BCLEdBQUcsZUFBYyxvQkFBSSxLQUFLLEdBQUUsWUFBWSxDQUFDLEVBQ3pDLE1BQU0sY0FBYyxFQUFFLFdBQVcsTUFBTSxDQUFDO0FBRTNDLFFBQUk7QUFBTyxZQUFNO0FBRWpCLFdBQU8sRUFBRSxTQUFTLE1BQU0sU0FBUyxXQUFXLENBQUMsRUFBRTtBQUFBLEVBQ2pELFNBQVMsT0FBTztBQUNkLFlBQVEsTUFBTSwyQkFBMkIsS0FBSztBQUM5QyxXQUFPLEVBQUUsU0FBUyxPQUFPLFNBQVMsQ0FBQyxFQUFFO0FBQUEsRUFDdkM7QUFDRjtBQUdBLGVBQXNCLG9CQUFvQixRQUFRO0FBQ2hELE1BQUk7QUFFRixVQUFNLEVBQUUsTUFBTSxVQUFVLElBQUksTUFBTUEsVUFDL0IsS0FBSyxTQUFTLEVBQ2QsT0FBTyxjQUFjLEVBQ3JCLEdBQUcsZUFBZSxNQUFNO0FBRTNCLFVBQU0sZUFBZSxXQUFXLElBQUksT0FBSyxFQUFFLFlBQVksS0FBSyxDQUFDO0FBRTdELFFBQUksYUFBYSxXQUFXLEdBQUc7QUFDN0IsYUFBTyxFQUFFLFNBQVMsTUFBTSxTQUFTLENBQUMsRUFBRTtBQUFBLElBQ3RDO0FBRUEsVUFBTSxFQUFFLE1BQU0sU0FBUyxNQUFNLElBQUksTUFBTUEsVUFDcEMsS0FBSyxTQUFTLEVBQ2QsT0FBTztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsT0FLUCxFQUNBLEdBQUcsV0FBVyxZQUFZLEVBQzFCLEdBQUcsZUFBYyxvQkFBSSxLQUFLLEdBQUUsWUFBWSxDQUFDLEVBQ3pDLE1BQU0sY0FBYyxFQUFFLFdBQVcsTUFBTSxDQUFDO0FBRTNDLFFBQUk7QUFBTyxZQUFNO0FBR2pCLFVBQU0sZ0JBQWdCLENBQUM7QUFDdkIsYUFBUyxRQUFRLFdBQVM7QUFDeEIsVUFBSSxDQUFDLGNBQWMsTUFBTSxPQUFPLEdBQUc7QUFDakMsc0JBQWMsTUFBTSxPQUFPLElBQUk7QUFBQSxVQUM3QixNQUFNLE1BQU07QUFBQSxVQUNaLFNBQVMsQ0FBQztBQUFBLFFBQ1o7QUFBQSxNQUNGO0FBQ0Esb0JBQWMsTUFBTSxPQUFPLEVBQUUsUUFBUSxLQUFLLEtBQUs7QUFBQSxJQUNqRCxDQUFDO0FBRUQsV0FBTyxFQUFFLFNBQVMsTUFBTSxTQUFTLE9BQU8sT0FBTyxhQUFhLEVBQUU7QUFBQSxFQUNoRSxTQUFTLE9BQU87QUFDZCxZQUFRLE1BQU0sZ0NBQWdDLEtBQUs7QUFDbkQsV0FBTyxFQUFFLFNBQVMsT0FBTyxTQUFTLENBQUMsRUFBRTtBQUFBLEVBQ3ZDO0FBQ0Y7QUFPQSxlQUFzQixtQkFBbUIsa0JBQWtCO0FBQ3pELE1BQUk7QUFDRixVQUFNLEVBQUUsTUFBTSxNQUFNLElBQUksTUFBTUEsVUFDM0IsS0FBSyxlQUFlLEVBQ3BCLE9BQU8sZ0JBQWdCLEVBQ3ZCLE9BQU8sRUFDUCxPQUFPO0FBRVYsUUFBSTtBQUFPLFlBQU07QUFFakIsV0FBTyxFQUFFLFNBQVMsTUFBTSxjQUFjLEtBQUs7QUFBQSxFQUM3QyxTQUFTLE9BQU87QUFDZCxZQUFRLE1BQU0sOEJBQThCLEtBQUs7QUFDakQsV0FBTyxFQUFFLFNBQVMsT0FBTyxPQUFPLE1BQU0sUUFBUTtBQUFBLEVBQ2hEO0FBQ0Y7QUFHQSxlQUFzQixxQkFBcUIsUUFBUSxRQUFRLElBQUksYUFBYSxPQUFPO0FBQ2pGLE1BQUk7QUFDRixRQUFJLFFBQVFBLFVBQ1QsS0FBSyxlQUFlLEVBQ3BCLE9BQU87QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE9BS1AsRUFDQSxHQUFHLFdBQVcsTUFBTTtBQUV2QixRQUFJLFlBQVk7QUFDZCxjQUFRLE1BQU0sR0FBRyxXQUFXLEtBQUs7QUFBQSxJQUNuQztBQUVBLFVBQU0sRUFBRSxNQUFNLGVBQWUsTUFBTSxJQUFJLE1BQU0sTUFDMUMsTUFBTSxjQUFjLEVBQUUsV0FBVyxNQUFNLENBQUMsRUFDeEMsTUFBTSxLQUFLO0FBRWQsUUFBSTtBQUFPLFlBQU07QUFFakIsV0FBTyxFQUFFLFNBQVMsTUFBTSxlQUFlLGlCQUFpQixDQUFDLEVBQUU7QUFBQSxFQUM3RCxTQUFTLE9BQU87QUFDZCxZQUFRLE1BQU0sNEJBQTRCLEtBQUs7QUFDL0MsV0FBTyxFQUFFLFNBQVMsT0FBTyxlQUFlLENBQUMsRUFBRTtBQUFBLEVBQzdDO0FBQ0Y7QUFHQSxlQUFzQix1QkFBdUIsZ0JBQWdCLFFBQVE7QUFDbkUsTUFBSTtBQUNGLFVBQU0sRUFBRSxNQUFNLElBQUksTUFBTUEsVUFDckIsS0FBSyxlQUFlLEVBQ3BCLE9BQU8sRUFBRSxTQUFTLEtBQUssQ0FBQyxFQUN4QixHQUFHLE1BQU0sY0FBYyxFQUN2QixHQUFHLFdBQVcsTUFBTTtBQUV2QixRQUFJO0FBQU8sWUFBTTtBQUVqQixXQUFPLEVBQUUsU0FBUyxLQUFLO0FBQUEsRUFDekIsU0FBUyxPQUFPO0FBQ2QsWUFBUSxNQUFNLGlDQUFpQyxLQUFLO0FBQ3BELFdBQU8sRUFBRSxTQUFTLE9BQU8sT0FBTyxNQUFNLFFBQVE7QUFBQSxFQUNoRDtBQUNGO0FBR0EsZUFBc0IsNEJBQTRCLFFBQVE7QUFDeEQsTUFBSTtBQUNGLFVBQU0sRUFBRSxPQUFPLE1BQU0sSUFBSSxNQUFNQSxVQUM1QixLQUFLLGVBQWUsRUFDcEIsT0FBTyxLQUFLLEVBQUUsT0FBTyxRQUFRLENBQUMsRUFDOUIsR0FBRyxXQUFXLE1BQU0sRUFDcEIsR0FBRyxXQUFXLEtBQUs7QUFFdEIsUUFBSTtBQUFPLFlBQU07QUFFakIsV0FBTyxFQUFFLFNBQVMsTUFBTSxPQUFPLFNBQVMsRUFBRTtBQUFBLEVBQzVDLFNBQVMsT0FBTztBQUNkLFlBQVEsTUFBTSwyQkFBMkIsS0FBSztBQUM5QyxXQUFPLEVBQUUsU0FBUyxPQUFPLE9BQU8sRUFBRTtBQUFBLEVBQ3BDO0FBQ0Y7QUFPQSxlQUFlLHlCQUF5QixRQUFRLFFBQVE7QUFDdEQsTUFBSTtBQUNGLFVBQU0sRUFBRSxNQUFNLFVBQVUsSUFBSSxNQUFNQSxVQUMvQixLQUFLLFNBQVMsRUFDZCxPQUFPLGFBQWEsRUFDcEIsR0FBRyxnQkFBZ0IsTUFBTTtBQUU1QixRQUFJLENBQUMsYUFBYSxVQUFVLFdBQVc7QUFBRztBQUUxQyxVQUFNLGdCQUFnQixVQUFVLElBQUksYUFBVztBQUFBLE1BQzdDLFNBQVMsT0FBTztBQUFBLE1BQ2hCLFVBQVU7QUFBQSxNQUNWLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxNQUNQLFNBQVM7QUFBQSxNQUNULFlBQVksU0FBUyxNQUFNO0FBQUEsSUFDN0IsRUFBRTtBQUVGLFVBQU1BLFVBQ0gsS0FBSyxlQUFlLEVBQ3BCLE9BQU8sYUFBYTtBQUFBLEVBRXpCLFNBQVMsT0FBTztBQUNkLFlBQVEsTUFBTSwyQkFBMkIsS0FBSztBQUFBLEVBQ2hEO0FBQ0Y7QUF4ZEE7QUFBQTtBQUFBO0FBS0E7QUFBQTtBQUFBOzs7QUNMb1AsU0FBUyxvQkFBb0I7QUFDalIsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sYUFBYTs7O0FDRnFPLE9BQU8sUUFBUTtBQUd4USxJQUFNLEVBQUUsS0FBSyxJQUFJO0FBQ2pCLElBQU0sT0FBTyxJQUFJLEtBQUs7QUFBQSxFQUNwQixrQkFBa0IsUUFBUSxJQUFJO0FBQUEsRUFDOUIsS0FBSyxRQUFRLElBQUksYUFBYSxTQUFTLFdBQVcsSUFBSSxFQUFFLG9CQUFvQixNQUFNLElBQUk7QUFDeEYsQ0FBQztBQUdNLFNBQVMsU0FBUyxLQUFLO0FBRzVCLE1BQUksSUFBSSxxQkFBcUIsT0FBTyxLQUFLLFFBQVE7QUFDL0MsUUFBSTtBQUNGLFlBQU0sRUFBRSxHQUFHLElBQUksSUFBSTtBQUVuQixZQUFNLFNBQVMsTUFBTSxLQUFLO0FBQUEsUUFDeEI7QUFBQSxRQUNBLENBQUMsRUFBRTtBQUFBLE1BQ0w7QUFFQSxVQUFJLE9BQU8sS0FBSyxXQUFXLEdBQUc7QUFDNUIsZUFBTyxJQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLHNCQUFzQixDQUFDO0FBQUEsTUFDOUQ7QUFFQSxVQUFJLEtBQUssT0FBTyxLQUFLLENBQUMsQ0FBQztBQUFBLElBQ3pCLFNBQVMsT0FBTztBQUNkLGNBQVEsTUFBTSxzQkFBc0IsS0FBSztBQUN6QyxVQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLDBCQUEwQixDQUFDO0FBQUEsSUFDM0Q7QUFBQSxFQUNGLENBQUM7QUFHRCxNQUFJLElBQUksNkJBQTZCLE9BQU8sS0FBSyxRQUFRO0FBQ3ZELFFBQUk7QUFDRixZQUFNLEVBQUUsT0FBTyxJQUFJLElBQUk7QUFFdkIsWUFBTSxTQUFTLE1BQU0sS0FBSztBQUFBLFFBQ3hCO0FBQUEsUUFDQSxDQUFDLE1BQU07QUFBQSxNQUNUO0FBRUEsVUFBSSxPQUFPLEtBQUssV0FBVyxHQUFHO0FBQzVCLGVBQU8sSUFBSSxPQUFPLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxtQkFBbUIsQ0FBQztBQUFBLE1BQzNEO0FBRUEsVUFBSSxLQUFLLE9BQU8sS0FBSyxDQUFDLENBQUM7QUFBQSxJQUN6QixTQUFTLE9BQU87QUFDZCxjQUFRLE1BQU0scUJBQXFCLEtBQUs7QUFDeEMsVUFBSSxPQUFPLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyx5QkFBeUIsQ0FBQztBQUFBLElBQzFEO0FBQUEsRUFDRixDQUFDO0FBR0QsTUFBSSxJQUFJLHVCQUF1QixPQUFPLEtBQUssUUFBUTtBQUNqRCxRQUFJO0FBQ0YsWUFBTSxFQUFFLEVBQUUsSUFBSSxJQUFJO0FBRWxCLFVBQUksQ0FBQyxLQUFLLEVBQUUsU0FBUyxHQUFHO0FBQ3RCLGVBQU8sSUFBSSxLQUFLLENBQUMsQ0FBQztBQUFBLE1BQ3BCO0FBRUEsWUFBTSxTQUFTLE1BQU0sS0FBSyxNQUFNO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBcUI3QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7QUFFYixVQUFJLEtBQUssT0FBTyxJQUFJO0FBQUEsSUFDdEIsU0FBUyxPQUFPO0FBQ2QsY0FBUSxNQUFNLHlCQUF5QixLQUFLO0FBQzVDLFVBQUksT0FBTyxHQUFHLEVBQUUsS0FBSyxFQUFFLE9BQU8sMkJBQTJCLENBQUM7QUFBQSxJQUM1RDtBQUFBLEVBQ0YsQ0FBQztBQUdELE1BQUksSUFBSSx3QkFBd0IsT0FBTyxLQUFLLFFBQVE7QUFDbEQsUUFBSTtBQUNGLFlBQU07QUFBQSxRQUNKLElBQUk7QUFBQSxRQUNKLFdBQVc7QUFBQSxRQUNYLGFBQWE7QUFBQSxRQUNiLFdBQVc7QUFBQSxRQUNYLFlBQVk7QUFBQSxRQUNaLGdCQUFnQjtBQUFBLFFBQ2hCLGVBQWU7QUFBQSxRQUNmLFNBQVM7QUFBQSxRQUNULE9BQU87QUFBQSxRQUNQLFFBQVE7QUFBQSxNQUNWLElBQUksSUFBSTtBQUVSLFlBQU0sVUFBVSxTQUFTLElBQUksSUFBSSxLQUFLLFNBQVMsS0FBSztBQUNwRCxZQUFNLGFBQWEsSUFBSSxDQUFDO0FBRXhCLFVBQUksWUFBWTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFzQmhCLFlBQU0sYUFBYSxDQUFDO0FBQ3BCLFlBQU0sU0FBUyxDQUFDO0FBQ2hCLFVBQUksYUFBYTtBQUdqQixVQUFJLEtBQUssRUFBRSxLQUFLLEdBQUc7QUFDakI7QUFDQSxtQkFBVyxLQUFLO0FBQUEsa0NBQ1UsVUFBVTtBQUFBLDRCQUNoQixVQUFVO0FBQUEseUJBQ2IsVUFBVTtBQUFBLGdDQUNILFVBQVU7QUFBQSwrQkFDWCxVQUFVO0FBQUEsVUFDL0I7QUFDRixlQUFPLEtBQUssVUFBVTtBQUFBLE1BQ3hCO0FBR0EsVUFBSSxVQUFVO0FBQ1o7QUFDQSxtQkFBVyxLQUFLLHFCQUFxQixVQUFVLEVBQUU7QUFDakQsZUFBTyxLQUFLLElBQUksUUFBUSxHQUFHO0FBQUEsTUFDN0I7QUFNQSxVQUFJLGtCQUFrQixRQUFRO0FBQzVCLG1CQUFXLEtBQUssa0JBQWtCO0FBQUEsTUFDcEM7QUFHQSxVQUFJLGlCQUFpQixRQUFRO0FBQzNCLG1CQUFXLEtBQUssbUJBQW1CO0FBQUEsTUFDckM7QUFHQSxVQUFJLFlBQVk7QUFDZCxZQUFJLGVBQWUsUUFBUTtBQUN6QixxQkFBVyxLQUFLLHdCQUF3QjtBQUFBLFFBQzFDLFdBQVcsZUFBZSxVQUFVO0FBQ2xDLHFCQUFXLEtBQUsscUNBQXFDO0FBQUEsUUFDdkQsV0FBVyxlQUFlLFdBQVc7QUFDbkMscUJBQVcsS0FBSyxzQ0FBc0M7QUFBQSxRQUN4RCxXQUFXLGVBQWUsV0FBVztBQUNuQyxxQkFBVyxLQUFLLHNDQUFzQztBQUFBLFFBQ3hELFdBQVcsZUFBZSxRQUFRO0FBQ2hDLHFCQUFXLEtBQUssd0JBQXdCO0FBQUEsUUFDMUM7QUFBQSxNQUNGO0FBR0EsVUFBSSxXQUFXLFNBQVMsR0FBRztBQUN6QixxQkFBYSxVQUFVLFdBQVcsS0FBSyxPQUFPLENBQUM7QUFBQSxNQUNqRDtBQUdBLFVBQUksY0FBYztBQUNsQixjQUFRLFFBQVE7QUFBQSxRQUNkLEtBQUs7QUFDSCx3QkFBYztBQUNkO0FBQUEsUUFDRixLQUFLO0FBQ0gsd0JBQWM7QUFDZDtBQUFBLFFBQ0YsS0FBSztBQUNILHdCQUFjO0FBQ2Q7QUFBQSxRQUNGLEtBQUs7QUFDSCx3QkFBYztBQUNkO0FBQUEsUUFDRjtBQUNFLHdCQUFjO0FBQUEsTUFDbEI7QUFFQSxtQkFBYSxJQUFJLFdBQVc7QUFHNUI7QUFDQSxtQkFBYSxXQUFXLFVBQVU7QUFDbEMsYUFBTyxLQUFLLFNBQVMsS0FBSyxDQUFDO0FBRTNCO0FBQ0EsbUJBQWEsWUFBWSxVQUFVO0FBQ25DLGFBQU8sS0FBSyxNQUFNO0FBRWxCLGNBQVEsSUFBSSwwQkFBMEIsU0FBUztBQUMvQyxjQUFRLElBQUksZUFBZSxNQUFNO0FBRWpDLFlBQU0sU0FBUyxNQUFNLEtBQUssTUFBTSxXQUFXLE1BQU07QUFHakQsWUFBTSxhQUFhLFVBQVUsUUFBUSwrQkFBK0Isa0NBQWtDLEVBQzFFLFFBQVEsb0JBQW9CLEVBQUUsRUFDOUIsUUFBUSxpQkFBaUIsRUFBRTtBQUV2RCxZQUFNLGNBQWMsTUFBTSxLQUFLLE1BQU0sWUFBWSxPQUFPLE1BQU0sR0FBRyxFQUFFLENBQUM7QUFDcEUsWUFBTSxhQUFhLFNBQVMsWUFBWSxLQUFLLENBQUMsRUFBRSxLQUFLO0FBQ3JELFlBQU0sVUFBVSxTQUFTLFNBQVMsS0FBSyxJQUFJO0FBRTNDLFVBQUksS0FBSztBQUFBLFFBQ1AsU0FBUyxPQUFPO0FBQUEsUUFDaEI7QUFBQSxRQUNBO0FBQUEsUUFDQSxNQUFNLFNBQVMsSUFBSTtBQUFBLFFBQ25CLE9BQU8sU0FBUyxLQUFLO0FBQUEsTUFDdkIsQ0FBQztBQUFBLElBRUgsU0FBUyxPQUFPO0FBQ2QsY0FBUSxNQUFNLDBCQUEwQixLQUFLO0FBQzdDLFVBQUksT0FBTyxHQUFHLEVBQUUsS0FBSyxFQUFFLE9BQU8sMEJBQTBCLENBQUM7QUFBQSxJQUMzRDtBQUFBLEVBQ0YsQ0FBQztBQUdELE1BQUksSUFBSSwrQkFBK0IsT0FBTyxLQUFLLFFBQVE7QUFDekQsUUFBSTtBQUNGLFlBQU0sRUFBRSxPQUFPLElBQUksSUFBSTtBQUV2QixZQUFNLFNBQVMsTUFBTSxLQUFLO0FBQUEsUUFDeEI7QUFBQSxRQUNBLENBQUMsTUFBTTtBQUFBLE1BQ1Q7QUFFQSxVQUFJLE9BQU8sS0FBSyxXQUFXLEdBQUc7QUFDNUIsZUFBTyxJQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLG1CQUFtQixDQUFDO0FBQUEsTUFDM0Q7QUFFQSxVQUFJLEtBQUssT0FBTyxLQUFLLENBQUMsQ0FBQztBQUFBLElBQ3pCLFNBQVMsT0FBTztBQUNkLGNBQVEsTUFBTSwrQkFBK0IsS0FBSztBQUNsRCxVQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLHlCQUF5QixDQUFDO0FBQUEsSUFDMUQ7QUFBQSxFQUNGLENBQUM7QUFHRCxNQUFJLEtBQUsseUJBQXlCLE9BQU8sS0FBSyxRQUFRO0FBQ3BELFFBQUk7QUFDRixZQUFNLEVBQUUsUUFBUSxHQUFHLEtBQUssSUFBSSxJQUFJO0FBRWhDLGNBQVEsSUFBSSx1Q0FBZ0MsRUFBRSxRQUFRLEtBQUssQ0FBQztBQUc1RCxZQUFNLHFCQUFxQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFzQjNCLFlBQU0sZ0JBQWdCLE1BQU0sS0FBSyxNQUFNLG9CQUFvQjtBQUFBLFFBQ3pEO0FBQUEsUUFDQSxLQUFLLGtCQUFrQixRQUFRLE1BQU07QUFBQSxRQUNyQyxLQUFLLGNBQWM7QUFBQSxRQUNuQixLQUFLLFlBQVk7QUFBQSxRQUNqQixLQUFLLFFBQVE7QUFBQSxRQUNiLEtBQUssU0FBUztBQUFBLFFBQ2QsS0FBSyxvQkFBb0I7QUFBQSxRQUN6QixLQUFLLGlCQUFpQjtBQUFBLFFBQ3RCLEtBQUssd0JBQXdCO0FBQUEsUUFDN0IsS0FBSyxvQkFBb0I7QUFBQSxNQUMzQixDQUFDO0FBRUQsY0FBUSxJQUFJLDhDQUF5QyxjQUFjLEtBQUssQ0FBQyxDQUFDO0FBRzFFLFlBQU0sVUFBVSxLQUFLLGNBQWMsVUFBVSxZQUFZLEVBQUUsUUFBUSxjQUFjLEdBQUcsSUFBSSxNQUFNLEtBQUssT0FBTyxFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sR0FBRyxDQUFDO0FBRXBJLFVBQUk7QUFDRixjQUFNLG9CQUFvQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUF5QjFCLGNBQU0sZUFBZSxNQUFNLEtBQUssTUFBTSxtQkFBbUI7QUFBQSxVQUN2RDtBQUFBLFVBQ0E7QUFBQSxVQUNBLEtBQUs7QUFBQSxVQUNMLEtBQUs7QUFBQSxVQUNMLEtBQUsscUJBQXFCO0FBQUEsVUFDMUIsS0FBSztBQUFBLFVBQ0wsS0FBSztBQUFBLFVBQ0wsS0FBSztBQUFBLFVBQ0wsS0FBSztBQUFBLFVBQ0wsS0FBSztBQUFBLFVBQ0wsS0FBSyxvQkFBb0I7QUFBQSxVQUN6QixLQUFLO0FBQUEsVUFDTCxLQUFLO0FBQUEsVUFDTDtBQUFBLFFBQ0YsQ0FBQztBQUVELGdCQUFRLElBQUksMkNBQXNDLGFBQWEsS0FBSyxDQUFDLENBQUM7QUFFdEUsWUFBSSxLQUFLO0FBQUEsVUFDUCxTQUFTO0FBQUEsVUFDVCxTQUFTLGNBQWMsS0FBSyxDQUFDO0FBQUEsVUFDN0IsUUFBUSxhQUFhLEtBQUssQ0FBQztBQUFBLFVBQzNCLFNBQVM7QUFBQSxRQUNYLENBQUM7QUFBQSxNQUVILFNBQVMsYUFBYTtBQUNwQixnQkFBUSxNQUFNLDRCQUE0QixXQUFXO0FBRXJELFlBQUksS0FBSztBQUFBLFVBQ1AsU0FBUztBQUFBLFVBQ1QsU0FBUyxjQUFjLEtBQUssQ0FBQztBQUFBLFVBQzdCLFNBQVM7QUFBQSxRQUNYLENBQUM7QUFBQSxNQUNIO0FBQUEsSUFFRixTQUFTLE9BQU87QUFDZCxjQUFRLE1BQU0saUNBQTRCLE1BQU0sT0FBTztBQUN2RCxVQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUs7QUFBQSxRQUNuQixTQUFTO0FBQUEsUUFDVCxPQUFPO0FBQUEsUUFDUCxTQUFTLE1BQU07QUFBQSxNQUNqQixDQUFDO0FBQUEsSUFDSDtBQUFBLEVBQ0YsQ0FBQztBQUdELE1BQUksSUFBSSxrQkFBa0IsT0FBTyxLQUFLLFFBQVE7QUFDNUMsUUFBSTtBQUNGLFlBQU0sRUFBRSxHQUFHLElBQUksSUFBSTtBQUVuQixZQUFNLFNBQVMsTUFBTSxLQUFLO0FBQUEsUUFDeEI7QUFBQSxRQUNBLENBQUMsRUFBRTtBQUFBLE1BQ0w7QUFFQSxVQUFJLE9BQU8sS0FBSyxXQUFXLEdBQUc7QUFDNUIsZUFBTyxJQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLGlCQUFpQixDQUFDO0FBQUEsTUFDekQ7QUFFQSxVQUFJLEtBQUssT0FBTyxLQUFLLENBQUMsQ0FBQztBQUFBLElBQ3pCLFNBQVMsT0FBTztBQUNkLGNBQVEsTUFBTSxtQkFBbUIsS0FBSztBQUN0QyxVQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLHVCQUF1QixDQUFDO0FBQUEsSUFDeEQ7QUFBQSxFQUNGLENBQUM7QUFHRCxNQUFJLEtBQUssa0JBQWtCLE9BQU8sS0FBSyxRQUFRO0FBQzdDLFFBQUk7QUFDRixZQUFNLEVBQUUsU0FBUyxPQUFPLGFBQWEsU0FBUyxVQUFVLFdBQVcsZUFBZSxrQkFBa0IsSUFBSSxJQUFJO0FBRTVHLFVBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLGFBQWE7QUFDdEMsZUFBTyxJQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLDhDQUE4QyxDQUFDO0FBQUEsTUFDdEY7QUFFQSxZQUFNLFNBQVMsTUFBTSxLQUFLO0FBQUEsUUFDeEI7QUFBQSxRQUNBLENBQUMsU0FBUyxPQUFPLFdBQVcsV0FBVyxHQUFHLFFBQVEsYUFBYSxNQUFNLGdCQUFnQixXQUFXLGFBQWEsSUFBSSxNQUFNLG9CQUFvQixXQUFXLGlCQUFpQixJQUFJLENBQUk7QUFBQSxNQUNqTDtBQUVBLFVBQUksS0FBSyxPQUFPLEtBQUssQ0FBQyxDQUFDO0FBQUEsSUFDekIsU0FBUyxPQUFPO0FBQ2QsY0FBUSxNQUFNLDBCQUEwQixLQUFLO0FBQzdDLFVBQUksT0FBTyxHQUFHLEVBQUUsS0FBSyxFQUFFLE9BQU8sNEJBQTRCLENBQUM7QUFBQSxJQUM3RDtBQUFBLEVBQ0YsQ0FBQztBQUdELE1BQUksSUFBSSwrQkFBK0IsT0FBTyxLQUFLLFFBQVE7QUFDekQsUUFBSTtBQUNGLFlBQU0sRUFBRSxPQUFPLElBQUksSUFBSTtBQUV2QixZQUFNLFNBQVMsTUFBTSxLQUFLO0FBQUEsUUFDeEI7QUFBQSxRQUNBLENBQUMsTUFBTTtBQUFBLE1BQ1Q7QUFFQSxVQUFJLEtBQUssT0FBTyxJQUFJO0FBQUEsSUFDdEIsU0FBUyxPQUFPO0FBQ2QsY0FBUSxNQUFNLHdCQUF3QixLQUFLO0FBQzNDLFVBQUksT0FBTyxHQUFHLEVBQUUsS0FBSyxFQUFFLE9BQU8sMkJBQTJCLENBQUM7QUFBQSxJQUM1RDtBQUFBLEVBQ0YsQ0FBQztBQUdELE1BQUksTUFBTSx5QkFBeUIsT0FBTyxLQUFLLFFBQVE7QUFDckQsUUFBSTtBQUNGLFlBQU0sRUFBRSxNQUFNLElBQUksSUFBSTtBQUN0QixZQUFNLEVBQUUsUUFBUSxlQUFlLGFBQWEsZ0JBQWdCLGVBQWUsa0JBQWtCLElBQUksSUFBSTtBQUVyRyxZQUFNLFVBQVUsQ0FBQztBQUNqQixZQUFNLFNBQVMsQ0FBQyxLQUFLO0FBQ3JCLFVBQUksYUFBYTtBQUVqQixVQUFJLFdBQVcsUUFBVztBQUN4QixnQkFBUSxLQUFLLGFBQWEsVUFBVSxFQUFFO0FBQ3RDLGVBQU8sS0FBSyxNQUFNO0FBQ2xCO0FBQUEsTUFDRjtBQUVBLFVBQUksa0JBQWtCLFFBQVc7QUFDL0IsZ0JBQVEsS0FBSyxvQkFBb0IsVUFBVSxFQUFFO0FBQzdDLGVBQU8sS0FBSyxXQUFXLGFBQWEsQ0FBQztBQUNyQztBQUFBLE1BQ0Y7QUFFQSxVQUFJLGdCQUFnQixRQUFXO0FBQzdCLGdCQUFRLEtBQUssa0JBQWtCLFVBQVUsRUFBRTtBQUMzQyxlQUFPLEtBQUssY0FBYyxXQUFXLFdBQVcsSUFBSSxJQUFJO0FBQ3hEO0FBQUEsTUFDRjtBQUVBLFVBQUksbUJBQW1CLFFBQVc7QUFDaEMsZ0JBQVEsS0FBSyxxQkFBcUIsVUFBVSxFQUFFO0FBQzlDLGVBQU8sS0FBSyxjQUFjO0FBQzFCO0FBQUEsTUFDRjtBQUVBLFVBQUksa0JBQWtCLFFBQVc7QUFDL0IsZ0JBQVEsS0FBSyxvQkFBb0IsVUFBVSxFQUFFO0FBQzdDLGVBQU8sS0FBSyxnQkFBZ0IsV0FBVyxhQUFhLElBQUksSUFBSTtBQUM1RDtBQUFBLE1BQ0Y7QUFFQSxVQUFJLHNCQUFzQixRQUFXO0FBQ25DLGdCQUFRLEtBQUssd0JBQXdCLFVBQVUsRUFBRTtBQUNqRCxlQUFPLEtBQUssb0JBQW9CLFdBQVcsaUJBQWlCLElBQUksQ0FBSTtBQUNwRTtBQUFBLE1BQ0Y7QUFFQSxVQUFJLFFBQVEsV0FBVyxHQUFHO0FBQ3hCLGVBQU8sSUFBSSxPQUFPLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxtQ0FBbUMsQ0FBQztBQUFBLE1BQzNFO0FBRUEsWUFBTSxTQUFTLE1BQU0sS0FBSztBQUFBLFFBQ3hCLHdCQUF3QixRQUFRLEtBQUssSUFBSSxDQUFDO0FBQUEsUUFDMUM7QUFBQSxNQUNGO0FBRUEsVUFBSSxPQUFPLEtBQUssV0FBVyxHQUFHO0FBQzVCLGVBQU8sSUFBSSxPQUFPLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxvQkFBb0IsQ0FBQztBQUFBLE1BQzVEO0FBRUEsVUFBSSxLQUFLLE9BQU8sS0FBSyxDQUFDLENBQUM7QUFBQSxJQUN6QixTQUFTLE9BQU87QUFDZCxjQUFRLE1BQU0sMEJBQTBCLEtBQUs7QUFDN0MsVUFBSSxPQUFPLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyw2QkFBNkIsQ0FBQztBQUFBLElBQzlEO0FBQUEsRUFDRixDQUFDO0FBR0QsTUFBSSxJQUFJLDJCQUEyQixPQUFPLEtBQUssUUFBUTtBQUNyRCxRQUFJO0FBQ0YsWUFBTSxFQUFFLE9BQU8sSUFBSSxJQUFJO0FBRXZCLFlBQU0sU0FBUyxNQUFNLEtBQUs7QUFBQSxRQUN4QjtBQUFBLFFBQ0EsQ0FBQyxNQUFNO0FBQUEsTUFDVDtBQUVBLFVBQUksS0FBSyxPQUFPLFFBQVEsQ0FBQyxDQUFDO0FBQUEsSUFDNUIsU0FBUyxPQUFPO0FBQ2QsY0FBUSxNQUFNLDZCQUE2QixLQUFLO0FBQ2hELFVBQUksT0FBTyxHQUFHLEVBQUUsS0FBSyxFQUFFLE9BQU8saUNBQWlDLENBQUM7QUFBQSxJQUNsRTtBQUFBLEVBQ0YsQ0FBQztBQUdELE1BQUksS0FBSyxjQUFjLE9BQU8sS0FBSyxRQUFRO0FBQ3pDLFFBQUk7QUFDRixZQUFNLEVBQUUsV0FBVyxPQUFPLGFBQWEsYUFBYSxhQUFhLElBQUksSUFBSTtBQUV6RSxZQUFNLFNBQVMsTUFBTSxLQUFLO0FBQUEsUUFDeEI7QUFBQTtBQUFBO0FBQUEsUUFHQSxDQUFDLFdBQVcsT0FBTyxlQUFlLE1BQU0sZUFBZSxHQUFHLGdCQUFnQixPQUFPO0FBQUEsTUFDbkY7QUFFQSxVQUFJLEtBQUssT0FBTyxLQUFLLENBQUMsQ0FBQztBQUFBLElBQ3pCLFNBQVMsT0FBTztBQUNkLGNBQVEsTUFBTSxzQkFBc0IsS0FBSztBQUN6QyxVQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLHdCQUF3QixDQUFDO0FBQUEsSUFDekQ7QUFBQSxFQUNGLENBQUM7QUFHRCxNQUFJLElBQUkseUJBQXlCLE9BQU8sS0FBSyxRQUFRO0FBQ25ELFFBQUk7QUFDRixZQUFNLEVBQUUsR0FBRyxJQUFJLElBQUk7QUFDbkIsWUFBTSxFQUFFLE9BQU8sSUFBSSxJQUFJO0FBRXZCLFlBQU0sU0FBUyxNQUFNLEtBQUs7QUFBQSxRQUN4QjtBQUFBLFFBQ0EsQ0FBQyxRQUFRLEVBQUU7QUFBQSxNQUNiO0FBRUEsVUFBSSxPQUFPLEtBQUssV0FBVyxHQUFHO0FBQzVCLGVBQU8sSUFBSSxPQUFPLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxpQkFBaUIsQ0FBQztBQUFBLE1BQ3pEO0FBR0EsVUFBSSxXQUFXLFNBQVM7QUFDdEIsY0FBTSxFQUFFLGFBQUFDLGFBQVksSUFBSSxNQUFNO0FBQzlCLGNBQU1BLGFBQVksRUFBRTtBQUFBLE1BQ3RCO0FBRUEsVUFBSSxLQUFLLE9BQU8sS0FBSyxDQUFDLENBQUM7QUFBQSxJQUN6QixTQUFTLE9BQU87QUFDZCxjQUFRLE1BQU0sNkJBQTZCLEtBQUs7QUFDaEQsVUFBSSxPQUFPLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyw0QkFBNEIsQ0FBQztBQUFBLElBQzdEO0FBQUEsRUFDRixDQUFDO0FBS0QsTUFBSSxLQUFLLDBCQUEwQixPQUFPLEtBQUssUUFBUTtBQUNyRCxRQUFJO0FBQ0YsWUFBTSxFQUFFLE9BQU8sSUFBSSxJQUFJO0FBQ3ZCLFlBQU0sRUFBRSxTQUFTLElBQUksSUFBSTtBQUV6QixVQUFJLENBQUMsVUFBVTtBQUNiLGVBQU8sSUFBSSxPQUFPLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxxQkFBcUIsQ0FBQztBQUFBLE1BQzdEO0FBRUEsWUFBTSxFQUFFLFdBQUFDLFdBQVUsSUFBSSxNQUFNO0FBQzVCLFlBQU0sU0FBUyxNQUFNQSxXQUFVLFFBQVEsUUFBUTtBQUUvQyxVQUFJLENBQUMsT0FBTyxTQUFTO0FBQ25CLGVBQU8sSUFBSSxPQUFPLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxPQUFPLE1BQU0sQ0FBQztBQUFBLE1BQ3JEO0FBRUEsVUFBSSxLQUFLO0FBQUEsUUFDUCxTQUFTO0FBQUEsUUFDVCxTQUFTLE9BQU87QUFBQSxRQUNoQixjQUFjLE9BQU87QUFBQSxRQUNyQixTQUFTO0FBQUEsTUFDWCxDQUFDO0FBQUEsSUFFSCxTQUFTLE9BQU87QUFDZCxjQUFRLE1BQU0sb0JBQW9CLEtBQUs7QUFDdkMsVUFBSSxPQUFPLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyx1QkFBdUIsQ0FBQztBQUFBLElBQ3hEO0FBQUEsRUFDRixDQUFDO0FBR0QsTUFBSSxLQUFLLDJCQUEyQixPQUFPLEtBQUssUUFBUTtBQUN0RCxRQUFJO0FBQ0YsWUFBTSxFQUFFLE9BQU8sSUFBSSxJQUFJO0FBQ3ZCLFlBQU0sRUFBRSxTQUFTLElBQUksSUFBSTtBQUV6QixVQUFJLENBQUMsVUFBVTtBQUNiLGVBQU8sSUFBSSxPQUFPLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxxQkFBcUIsQ0FBQztBQUFBLE1BQzdEO0FBRUEsWUFBTSxFQUFFLGNBQUFDLGNBQWEsSUFBSSxNQUFNO0FBQy9CLFlBQU0sU0FBUyxNQUFNQSxjQUFhLFFBQVEsUUFBUTtBQUVsRCxVQUFJLENBQUMsT0FBTyxTQUFTO0FBQ25CLGVBQU8sSUFBSSxPQUFPLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxPQUFPLE1BQU0sQ0FBQztBQUFBLE1BQ3JEO0FBRUEsVUFBSSxLQUFLO0FBQUEsUUFDUCxTQUFTO0FBQUEsUUFDVCxTQUFTLE9BQU87QUFBQSxRQUNoQixTQUFTO0FBQUEsTUFDWCxDQUFDO0FBQUEsSUFFSCxTQUFTLE9BQU87QUFDZCxjQUFRLE1BQU0scUJBQXFCLEtBQUs7QUFDeEMsVUFBSSxPQUFPLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxxQkFBcUIsQ0FBQztBQUFBLElBQ3REO0FBQUEsRUFDRixDQUFDO0FBR0QsTUFBSSxJQUFJLDZCQUE2QixPQUFPLEtBQUssUUFBUTtBQUN2RCxRQUFJO0FBQ0YsWUFBTSxFQUFFLE9BQU8sSUFBSSxJQUFJO0FBRXZCLFlBQU0sRUFBRSxnQkFBQUMsZ0JBQWUsSUFBSSxNQUFNO0FBQ2pDLFlBQU0sUUFBUSxNQUFNQSxnQkFBZSxNQUFNO0FBRXpDLFVBQUksS0FBSyxLQUFLO0FBQUEsSUFFaEIsU0FBUyxPQUFPO0FBQ2QsY0FBUSxNQUFNLDJCQUEyQixLQUFLO0FBQzlDLFVBQUksT0FBTyxHQUFHLEVBQUUsS0FBSyxFQUFFLE9BQU8sMEJBQTBCLENBQUM7QUFBQSxJQUMzRDtBQUFBLEVBQ0YsQ0FBQztBQUdELE1BQUksSUFBSSwrQkFBK0IsT0FBTyxLQUFLLFFBQVE7QUFDekQsUUFBSTtBQUNGLFlBQU0sRUFBRSxTQUFTLElBQUksSUFBSTtBQUV6QixZQUFNLFNBQVMsTUFBTSxLQUFLO0FBQUEsUUFDeEI7QUFBQSxRQUNBLENBQUMsUUFBUTtBQUFBLE1BQ1g7QUFFQSxVQUFJLEtBQUssT0FBTyxJQUFJO0FBQUEsSUFDdEIsU0FBUyxPQUFPO0FBQ2QsY0FBUSxNQUFNLG9CQUFvQixLQUFLO0FBQ3ZDLFVBQUksT0FBTyxHQUFHLEVBQUUsS0FBSyxFQUFFLE9BQU8sdUJBQXVCLENBQUM7QUFBQSxJQUN4RDtBQUFBLEVBQ0YsQ0FBQztBQUdELE1BQUksT0FBTyxrQkFBa0IsT0FBTyxLQUFLLFFBQVE7QUFDL0MsUUFBSTtBQUNGLFlBQU0sRUFBRSxHQUFHLElBQUksSUFBSTtBQUVuQixZQUFNLFNBQVMsTUFBTSxLQUFLO0FBQUEsUUFDeEI7QUFBQSxRQUNBLENBQUMsRUFBRTtBQUFBLE1BQ0w7QUFFQSxVQUFJLE9BQU8sS0FBSyxXQUFXLEdBQUc7QUFDNUIsZUFBTyxJQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLGlCQUFpQixDQUFDO0FBQUEsTUFDekQ7QUFFQSxVQUFJLEtBQUssRUFBRSxTQUFTLEtBQUssQ0FBQztBQUFBLElBQzVCLFNBQVMsT0FBTztBQUNkLGNBQVEsTUFBTSxzQkFBc0IsS0FBSztBQUN6QyxVQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLDJCQUEyQixDQUFDO0FBQUEsSUFDNUQ7QUFBQSxFQUNGLENBQUM7QUFHRCxNQUFJLElBQUksK0JBQStCLE9BQU8sS0FBSyxRQUFRO0FBQ3pELFFBQUk7QUFDRixZQUFNLEVBQUUsU0FBUyxJQUFJLElBQUk7QUFFekIsWUFBTSxTQUFTLE1BQU0sS0FBSztBQUFBLFFBQ3hCO0FBQUEsUUFDQSxDQUFDLFFBQVE7QUFBQSxNQUNYO0FBRUEsVUFBSSxLQUFLLE9BQU8sSUFBSTtBQUFBLElBQ3RCLFNBQVMsT0FBTztBQUNkLGNBQVEsTUFBTSxvQkFBb0IsS0FBSztBQUN2QyxVQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLHdCQUF3QixDQUFDO0FBQUEsSUFDekQ7QUFBQSxFQUNGLENBQUM7QUFHRCxNQUFJLElBQUksaUNBQWlDLE9BQU8sS0FBSyxRQUFRO0FBQzNELFFBQUk7QUFDRixZQUFNLEVBQUUsU0FBUyxJQUFJLElBQUk7QUFFekIsWUFBTSxTQUFTLE1BQU0sS0FBSztBQUFBLFFBQ3hCO0FBQUEsUUFDQSxDQUFDLFFBQVE7QUFBQSxNQUNYO0FBRUEsVUFBSSxLQUFLLE9BQU8sSUFBSTtBQUFBLElBQ3RCLFNBQVMsT0FBTztBQUNkLGNBQVEsTUFBTSxzQkFBc0IsS0FBSztBQUN6QyxVQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLDBCQUEwQixDQUFDO0FBQUEsSUFDM0Q7QUFBQSxFQUNGLENBQUM7QUFHRCxNQUFJLElBQUksNkJBQTZCLE9BQU8sS0FBSyxRQUFRO0FBQ3ZELFFBQUk7QUFDRixZQUFNLEVBQUUsUUFBUSxJQUFJLElBQUk7QUFFeEIsWUFBTSxTQUFTLE1BQU0sS0FBSztBQUFBLFFBQ3hCO0FBQUEsUUFDQSxDQUFDLE9BQU87QUFBQSxNQUNWO0FBRUEsVUFBSSxLQUFLLE9BQU8sSUFBSTtBQUFBLElBQ3RCLFNBQVMsT0FBTztBQUNkLGNBQVEsTUFBTSwwQkFBMEIsS0FBSztBQUM3QyxVQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLDhCQUE4QixDQUFDO0FBQUEsSUFDL0Q7QUFBQSxFQUNGLENBQUM7QUFLRCxNQUFJLEtBQUssc0JBQXNCLE9BQU8sS0FBSyxRQUFRO0FBQ2pELFFBQUk7QUFDRixZQUFNLEVBQUUsWUFBWSxZQUFZLElBQUksSUFBSTtBQUV4QyxVQUFJLENBQUMsY0FBYyxDQUFDLGFBQWE7QUFDL0IsZUFBTyxJQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLHFDQUFxQyxDQUFDO0FBQUEsTUFDN0U7QUFFQSxZQUFNLEVBQUUsY0FBQUMsY0FBYSxJQUFJLE1BQU07QUFDL0IsWUFBTSxTQUFTLE1BQU1BLGNBQWEsWUFBWSxXQUFXO0FBRXpELFVBQUksQ0FBQyxPQUFPLFNBQVM7QUFDbkIsZUFBTyxJQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLE9BQU8sTUFBTSxDQUFDO0FBQUEsTUFDckQ7QUFFQSxVQUFJLEtBQUssTUFBTTtBQUFBLElBRWpCLFNBQVMsT0FBTztBQUNkLGNBQVEsTUFBTSxpQkFBaUIsS0FBSztBQUNwQyxVQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLHlCQUF5QixDQUFDO0FBQUEsSUFDMUQ7QUFBQSxFQUNGLENBQUM7QUFHRCxNQUFJLElBQUksNkJBQTZCLE9BQU8sS0FBSyxRQUFRO0FBQ3ZELFFBQUk7QUFDRixZQUFNLEVBQUUsT0FBTyxJQUFJLElBQUk7QUFFdkIsWUFBTSxFQUFFLG9CQUFBQyxvQkFBbUIsSUFBSSxNQUFNO0FBQ3JDLFlBQU0sUUFBUSxNQUFNQSxvQkFBbUIsTUFBTTtBQUU3QyxVQUFJLEtBQUssS0FBSztBQUFBLElBRWhCLFNBQVMsT0FBTztBQUNkLGNBQVEsTUFBTSwyQkFBMkIsS0FBSztBQUM5QyxVQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLDhCQUE4QixDQUFDO0FBQUEsSUFDL0Q7QUFBQSxFQUNGLENBQUM7QUFHRCxNQUFJLElBQUkscUNBQXFDLE9BQU8sS0FBSyxRQUFRO0FBQy9ELFFBQUk7QUFDRixZQUFNLEVBQUUsT0FBTyxJQUFJLElBQUk7QUFDdkIsWUFBTSxFQUFFLFFBQVEsSUFBSSxhQUFhLE1BQU0sSUFBSSxJQUFJO0FBRS9DLFlBQU0sRUFBRSxzQkFBQUMsc0JBQXFCLElBQUksTUFBTTtBQUN2QyxZQUFNLFNBQVMsTUFBTUEsc0JBQXFCLFFBQVEsU0FBUyxLQUFLLEdBQUcsZUFBZSxNQUFNO0FBRXhGLFVBQUksS0FBSyxNQUFNO0FBQUEsSUFFakIsU0FBUyxPQUFPO0FBQ2QsY0FBUSxNQUFNLDRCQUE0QixLQUFLO0FBQy9DLFVBQUksT0FBTyxHQUFHLEVBQUUsS0FBSyxFQUFFLE9BQU8sNEJBQTRCLENBQUM7QUFBQSxJQUM3RDtBQUFBLEVBQ0YsQ0FBQztBQUdELE1BQUksSUFBSSxrREFBa0QsT0FBTyxLQUFLLFFBQVE7QUFDNUUsUUFBSTtBQUNGLFlBQU0sRUFBRSxPQUFPLElBQUksSUFBSTtBQUV2QixZQUFNLEVBQUUsNkJBQUFDLDZCQUE0QixJQUFJLE1BQU07QUFDOUMsWUFBTSxTQUFTLE1BQU1BLDZCQUE0QixNQUFNO0FBRXZELFVBQUksS0FBSyxNQUFNO0FBQUEsSUFFakIsU0FBUyxPQUFPO0FBQ2QsY0FBUSxNQUFNLDJCQUEyQixLQUFLO0FBQzlDLFVBQUksT0FBTyxHQUFHLEVBQUUsS0FBSyxFQUFFLE9BQU8sNkJBQTZCLENBQUM7QUFBQSxJQUM5RDtBQUFBLEVBQ0YsQ0FBQztBQUdELE1BQUksS0FBSyxzQkFBc0IsT0FBTyxLQUFLLFFBQVE7QUFDakQsUUFBSTtBQUNGLFlBQU0sRUFBRSxVQUFVLGlCQUFpQixPQUFPLGFBQWEsSUFBSSxJQUFJO0FBRS9ELGNBQVEsSUFBSSw2Q0FBc0MsRUFBRSxVQUFVLGlCQUFpQixLQUFLLENBQUM7QUFHckYsWUFBTSxFQUFFLFlBQVksSUFBSSxNQUFNLE9BQU8sNkVBQW9CO0FBRXpELFVBQUksQ0FBQyxRQUFRLElBQUksbUJBQW1CLENBQUMsUUFBUSxJQUFJLHNCQUFzQixDQUFDLFFBQVEsSUFBSSxhQUFhO0FBQy9GLGNBQU0sSUFBSSxNQUFNLG9DQUFvQztBQUFBLE1BQ3REO0FBR0EsWUFBTSxRQUFRLElBQUksWUFBWSxRQUFRLElBQUksaUJBQWlCLFFBQVEsSUFBSSxvQkFBb0I7QUFBQSxRQUN6RixVQUFVO0FBQUEsUUFDVixNQUFNO0FBQUEsUUFDTixLQUFLO0FBQUEsTUFDUCxDQUFDO0FBR0QsWUFBTSxRQUFRO0FBQUEsUUFDWixVQUFVO0FBQUEsUUFDVixNQUFNO0FBQUEsUUFDTixZQUFZLFNBQVM7QUFBQSxRQUNyQixjQUFjO0FBQUEsUUFDZCxnQkFBZ0IsU0FBUztBQUFBLE1BQzNCO0FBRUEsWUFBTSxTQUFTLEtBQUs7QUFHcEIsVUFBSTtBQUNKLFVBQUk7QUFDRixtQkFBVyxNQUFNLE1BQU0sTUFBTTtBQUFBLE1BQy9CLFNBQVMsWUFBWTtBQUNuQixtQkFBVyxNQUFNLE1BQU07QUFBQSxNQUN6QjtBQUVBLFVBQUksQ0FBQyxZQUFZLE9BQU8sYUFBYSxZQUFZLFNBQVMsU0FBUyxJQUFJO0FBQ3JFLGNBQU0sSUFBSSxNQUFNLDBDQUEwQyxPQUFPLFFBQVEsYUFBYSxVQUFVLE1BQU0sRUFBRTtBQUFBLE1BQzFHO0FBRUEsY0FBUSxJQUFJLDhDQUF5QyxTQUFTLE1BQU07QUFFcEUsVUFBSSxLQUFLO0FBQUEsUUFDUCxTQUFTO0FBQUEsUUFDVCxPQUFPO0FBQUEsUUFDUCxXQUFXLFFBQVEsSUFBSTtBQUFBLFFBQ3ZCLFNBQVM7QUFBQSxNQUNYLENBQUM7QUFBQSxJQUVILFNBQVMsT0FBTztBQUNkLGNBQVEsTUFBTSx3Q0FBbUMsS0FBSztBQUN0RCxVQUFJLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLG1DQUFtQyxDQUFDO0FBQUEsSUFDcEU7QUFBQSxFQUNGLENBQUM7QUFJRCxVQUFRLElBQUksZ0RBQTJDO0FBQ3pEOzs7QUQ1MkJBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOO0FBQUEsTUFDRSxNQUFNO0FBQUEsTUFDTixnQkFBZ0IsUUFBUTtBQUN0QixjQUFNLE1BQU0sUUFBUTtBQUNwQixZQUFJLElBQUksUUFBUSxLQUFLLENBQUM7QUFHdEIsaUJBQVMsR0FBRztBQUdaLGVBQU8sWUFBWSxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVM7QUFDekMsY0FBSSxJQUFJLElBQUksV0FBVyxPQUFPLEdBQUc7QUFDL0IsZ0JBQUksS0FBSyxLQUFLLElBQUk7QUFBQSxVQUNwQixPQUFPO0FBQ0wsaUJBQUs7QUFBQSxVQUNQO0FBQUEsUUFDRixDQUFDO0FBQUEsTUFDSDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbImNhbGN1bGF0ZUJhc2VTY29yZSIsICJhcHBseUJvb3N0IiwgImNyZWF0ZUNsaWVudCIsICJzdXBhYmFzZSIsICJzdXBhYmFzZSIsICJjbGVhbnVwTGl2ZSIsICJhZGRWaWV3ZXIiLCAicmVtb3ZlVmlld2VyIiwgImdldFZpZXdlclN0YXRzIiwgInRvZ2dsZUZvbGxvdyIsICJnZXRVc2VyU29jaWFsU3RhdHMiLCAiZ2V0VXNlck5vdGlmaWNhdGlvbnMiLCAiZ2V0VW5yZWFkTm90aWZpY2F0aW9uc0NvdW50Il0KfQo=
