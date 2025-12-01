// src/components/TagInput.jsx
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const TagInput = ({ value, onChange, placeholder = "Aggiungi tag...", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [searchType, setSearchType] = useState(null); // 'mention' or 'hashtag'
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Parse current input to detect @mention or #hashtag
  const parseInput = (text, cursorPos) => {
    const beforeCursor = text.slice(0, cursorPos);
    const words = beforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@') && lastWord.length > 1) {
      return { type: 'mention', query: lastWord.slice(1), start: beforeCursor.lastIndexOf('@') };
    } else if (lastWord.startsWith('#') && lastWord.length > 1) {
      return { type: 'hashtag', query: lastWord.slice(1), start: beforeCursor.lastIndexOf('#') };
    }
    return null;
  };

  // Fetch suggestions for mentions or hashtags
  const fetchSuggestions = async (type, query) => {
    if (!query || query.length < 1) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      if (type === 'mention') {
        // Search users by display_name or handle
        const { data, error } = await supabase
          .from('sellers')
          .select('id, display_name, handle, avatar_url')
          .or(`display_name.ilike.%${query}%,handle.ilike.%${query}%`)
          .limit(5);

        if (!error && data) {
          setSuggestions(data.map(user => ({
            type: 'mention',
            id: user.id,
            text: user.display_name || user.handle,
            handle: user.handle,
            avatar: user.avatar_url,
            value: `@${user.handle}`
          })));
        }
      } else if (type === 'hashtag') {
        // Search trending hashtags
        const { data, error } = await supabase
          .from('trending_hashtags')
          .select('tag, usage_count')
          .ilike('tag', `%${query}%`)
          .order('usage_count', { ascending: false })
          .limit(5);

        if (!error && data) {
          setSuggestions(data.map(tag => ({
            type: 'hashtag',
            text: tag.tag,
            count: tag.usage_count,
            value: `#${tag.tag}`
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);

    const parsed = parseInput(newValue, cursorPos);
    if (parsed) {
      setCurrentQuery(parsed.query);
      setSearchType(parsed.type);
      setIsOpen(true);
      fetchSuggestions(parsed.type, parsed.query);
    } else {
      setIsOpen(false);
      setSuggestions([]);
      setSearchType(null);
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    const cursorPos = inputRef.current.selectionStart;
    const parsed = parseInput(value, cursorPos);
    
    if (parsed) {
      const beforeTag = value.slice(0, parsed.start);
      const afterCursor = value.slice(cursorPos);
      const newValue = beforeTag + suggestion.value + ' ' + afterCursor;
      
      onChange(newValue);
      
      // Update trending hashtags
      if (suggestion.type === 'hashtag') {
        updateHashtagUsage(suggestion.text);
      }
    }
    
    setIsOpen(false);
    inputRef.current.focus();
  };

  // Update hashtag usage count
  const updateHashtagUsage = async (tag) => {
    try {
      const { error } = await supabase
        .rpc('increment_hashtag_usage', { hashtag: tag });
      
      if (error) {
        // If function doesn't exist, just insert/update manually
        await supabase
          .from('trending_hashtags')
          .upsert(
            { tag, usage_count: 1, last_used_at: new Date().toISOString() },
            { onConflict: 'tag', ignoreDuplicates: false }
          );
      }
    } catch (error) {
      console.error('Error updating hashtag usage:', error);
    }
  };

  // Handle key navigation
  const handleKeyDown = (e) => {
    if (isOpen && suggestions.length > 0) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
      // Add arrow key navigation if needed
    }
  };

  return (
    <div className={`tag-input-container ${className}`} style={{ position: 'relative' }}>
      <textarea
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          width: '100%',
          minHeight: 80,
          padding: 12,
          border: '1px solid #dbdbdb',
          borderRadius: 8,
          fontSize: 14,
          fontFamily: 'inherit',
          resize: 'vertical',
          outline: 'none',
          background: '#fff'
        }}
      />

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #dbdbdb',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 1000,
            maxHeight: 200,
            overflowY: 'auto'
          }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: index < suggestions.length - 1 ? '1px solid #efefef' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              {suggestion.type === 'mention' && (
                <>
                  <img
                    src={suggestion.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${suggestion.text}`}
                    alt={suggestion.text}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {suggestion.text}
                    </div>
                    <div style={{ fontSize: 12, color: '#8e8e8e' }}>
                      @{suggestion.handle}
                    </div>
                  </div>
                </>
              )}
              
              {suggestion.type === 'hashtag' && (
                <>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#40e0d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: 16
                  }}>
                    #
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      #{suggestion.text}
                    </div>
                    <div style={{ fontSize: 12, color: '#8e8e8e' }}>
                      {suggestion.count || 0} post
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#fff',
          border: '1px solid #dbdbdb',
          borderRadius: 8,
          padding: 16,
          textAlign: 'center',
          fontSize: 14,
          color: '#8e8e8e'
        }}>
          Cercando...
        </div>
      )}
    </div>
  );
};

export default TagInput;