/**
 * API Endpoints per il sistema social di BIDLi
 * Gestisce follows, posts, stories, notifiche
 */

import { supabase } from './supabase-server.js';

/**
 * === FOLLOWER SYSTEM ===
 */

// Follow/Unfollow utente
export async function toggleFollow(followerId, followingId) {
  try {
    if (followerId === followingId) {
      return { success: false, error: 'Non puoi seguire te stesso' };
    }

    // Controlla se già segue
    const { data: existing } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    if (existing) {
      // Unfollow
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);

      return { success: true, action: 'unfollowed' };
    } else {
      // Follow
      await supabase
        .from('follows')
        .insert({ follower_id: followerId, following_id: followingId });

      // Crea notifica
      await createNotification({
        user_id: followingId,
        actor_id: followerId,
        type: 'follow',
        title: 'Nuovo follower!',
        message: 'Ha iniziato a seguirti',
        action_url: `/profile/${followerId}`
      });

      return { success: true, action: 'followed' };
    }
  } catch (error) {
    console.error('Toggle follow error:', error);
    return { success: false, error: error.message };
  }
}

// Ottieni statistiche follower
export async function getUserSocialStats(userId) {
  try {
    const [followersResult, followingResult] = await Promise.all([
      supabase
        .from('follows')
        .select('id')
        .eq('following_id', userId),
      supabase
        .from('follows')
        .select('id')
        .eq('follower_id', userId)
    ]);

    return {
      followers_count: followersResult.data?.length || 0,
      following_count: followingResult.data?.length || 0
    };
  } catch (error) {
    console.error('Get social stats error:', error);
    return { followers_count: 0, following_count: 0 };
  }
}

// Controlla se un utente segue un altro
export async function checkIfFollowing(followerId, followingId) {
  try {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    return !!data;
  } catch (error) {
    return false;
  }
}

/**
 * === POST SYSTEM ===
 */

// Crea nuovo post social
export async function createSocialPost(postData) {
  try {
    const { data: post, error } = await supabase
      .from('social_posts')
      .insert({
        user_id: postData.user_id,
        content: postData.content,
        images: postData.images || [],
        live_id: postData.live_id || null,
        visibility: postData.visibility || 'public',
        tags: postData.tags || [],
        mentions: postData.mentions || []
      })
      .select()
      .single();

    if (error) throw error;

    // Notifica i follower del nuovo post
    await notifyFollowersOfNewPost(postData.user_id, post.id);

    return { success: true, post };
  } catch (error) {
    console.error('Create post error:', error);
    return { success: false, error: error.message };
  }
}

// Ottieni post di un utente
export async function getUserPosts(userId, limit = 20, offset = 0) {
  try {
    const { data: posts, error } = await supabase
      .from('social_posts')
      .select(`
        *,
        user:user_id (
          id, username, first_name, last_name, profile_picture
        ),
        live:live_id (
          id, title, status
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return { success: true, posts: posts || [] };
  } catch (error) {
    console.error('Get user posts error:', error);
    return { success: false, posts: [] };
  }
}

// Ottieni feed post per homepage
export async function getPostsFeed(userId, limit = 20, offset = 0) {
  try {
    // Se l'utente è loggato, mostra post di chi segue + post popolari
    // Se non è loggato, mostra solo post popolari
    
    let query = supabase
      .from('social_posts')
      .select(`
        *,
        user:user_id (
          id, username, first_name, last_name, profile_picture
        ),
        live:live_id (
          id, title, status
        )
      `)
      .eq('status', 'published');

    if (userId) {
      // Ottieni ID degli utenti seguiti
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      const followingIds = following?.map(f => f.following_id) || [];
      
      if (followingIds.length > 0) {
        query = query.in('user_id', followingIds);
      }
    }

    const { data: posts, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return { success: true, posts: posts || [] };
  } catch (error) {
    console.error('Get posts feed error:', error);
    return { success: false, posts: [] };
  }
}

// Like/Unlike post
export async function togglePostLike(postId, userId) {
  try {
    const { data: existing } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Unlike
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      return { success: true, action: 'unliked' };
    } else {
      // Like
      await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: userId });

      // Notifica l'autore del post
      const { data: post } = await supabase
        .from('social_posts')
        .select('user_id')
        .eq('id', postId)
        .single();

      if (post && post.user_id !== userId) {
        await createNotification({
          user_id: post.user_id,
          actor_id: userId,
          type: 'like',
          title: 'Nuovo like!',
          message: 'Ha messo like al tuo post',
          action_url: `/post/${postId}`
        });
      }

      return { success: true, action: 'liked' };
    }
  } catch (error) {
    console.error('Toggle like error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * === STORIES SYSTEM ===
 */

// Crea nuova story
export async function createStory(storyData) {
  try {
    const { data: story, error } = await supabase
      .from('stories')
      .insert({
        user_id: storyData.user_id,
        media_url: storyData.media_url,
        media_type: storyData.media_type || 'image',
        text_overlay: storyData.text_overlay || null,
        background_color: storyData.background_color || '#000000'
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, story };
  } catch (error) {
    console.error('Create story error:', error);
    return { success: false, error: error.message };
  }
}

// Ottieni stories attive di un utente
export async function getUserStories(userId) {
  try {
    const { data: stories, error } = await supabase
      .from('stories')
      .select(`
        *,
        user:user_id (
          id, username, first_name, last_name, profile_picture
        )
      `)
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, stories: stories || [] };
  } catch (error) {
    console.error('Get user stories error:', error);
    return { success: false, stories: [] };
  }
}

// Ottieni stories di utenti seguiti per homepage
export async function getFollowingStories(userId) {
  try {
    // Ottieni ID degli utenti seguiti
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    const followingIds = following?.map(f => f.following_id) || [];
    
    if (followingIds.length === 0) {
      return { success: true, stories: [] };
    }

    const { data: stories, error } = await supabase
      .from('stories')
      .select(`
        *,
        user:user_id (
          id, username, first_name, last_name, profile_picture
        )
      `)
      .in('user_id', followingIds)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Raggruppa per utente
    const storiesByUser = {};
    stories?.forEach(story => {
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
    console.error('Get following stories error:', error);
    return { success: false, stories: [] };
  }
}

/**
 * === NOTIFICATIONS SYSTEM ===
 */

// Crea notifica
export async function createNotification(notificationData) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single();

    if (error) throw error;

    return { success: true, notification: data };
  } catch (error) {
    console.error('Create notification error:', error);
    return { success: false, error: error.message };
  }
}

// Ottieni notifiche utente
export async function getUserNotifications(userId, limit = 50, unreadOnly = false) {
  try {
    let query = supabase
      .from('notifications')
      .select(`
        *,
        actor:actor_id (
          id, username, first_name, last_name, profile_picture
        )
      `)
      .eq('user_id', userId);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, notifications: notifications || [] };
  } catch (error) {
    console.error('Get notifications error:', error);
    return { success: false, notifications: [] };
  }
}

// Marca notifica come letta
export async function markNotificationAsRead(notificationId, userId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Mark notification read error:', error);
    return { success: false, error: error.message };
  }
}

// Conta notifiche non lette
export async function getUnreadNotificationsCount(userId) {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    return { success: true, count: count || 0 };
  } catch (error) {
    console.error('Get unread count error:', error);
    return { success: false, count: 0 };
  }
}

/**
 * === UTILITY FUNCTIONS ===
 */

// Notifica follower di nuovo post
async function notifyFollowersOfNewPost(userId, postId) {
  try {
    const { data: followers } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', userId);

    if (!followers || followers.length === 0) return;

    const notifications = followers.map(follow => ({
      user_id: follow.follower_id,
      actor_id: userId,
      type: 'new_post',
      title: 'Nuovo post!',
      message: 'Ha pubblicato un nuovo post',
      action_url: `/post/${postId}`
    }));

    await supabase
      .from('notifications')
      .insert(notifications);

  } catch (error) {
    console.error('Notify followers error:', error);
  }
}