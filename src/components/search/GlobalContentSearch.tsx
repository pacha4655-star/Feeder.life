'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Users,
  Building2,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Loader2,
  X,
  CheckCircle2,
  Heart,
  MessageSquare,
} from 'lucide-react';

export interface GlobalContentSearchProps {
  variant?: 'home' | 'header';
  placeholder?: string;
  autoFocus?: boolean;
}

export default function GlobalContentSearch({
  variant = 'header',
  placeholder,
}: GlobalContentSearchProps) {
  const isHomeVariant = variant === 'home';
  const defaultPlaceholder = isHomeVariant
    ? 'Search posts, photos, and videos...'
    : 'Search people and communities...';
  const resolvedPlaceholder = placeholder || defaultPlaceholder;

  // Header tabs: People & Communities. Home tabs: Posts, Photos, Videos.
  const searchTabs = useMemo(() => {
    if (isHomeVariant) {
      return [
        { id: 'all', label: 'All Content' },
        { id: 'posts', label: 'Posts' },
        { id: 'photos', label: 'Photos' },
        { id: 'videos', label: 'Videos' },
      ];
    }
    return [
      { id: 'all', label: 'All' },
      { id: 'people', label: 'People' },
      { id: 'communities', label: 'Communities' },
    ];
  }, [isHomeVariant]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchTab, setSearchTab] = useState<string>('all');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // When variant changes, reset tab to 'all'
  useEffect(() => {
    setSearchTab('all');
  }, [isHomeVariant]);

  // Execute Search with AbortController and strict API separation
  const executeSearch = (query: string, tab: string) => {
    const trimmed = query.trim();

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Minimum query length: 2 characters
    if (trimmed.length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      setSearchError('');
      return;
    }

    setIsSearching(true);
    setSearchError('');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Resolve API type parameter: header uses 'header' or specific tab; home uses 'content' or specific tab
    let apiType = tab;
    if (tab === 'all') {
      apiType = isHomeVariant ? 'content' : 'header';
    }

    fetch(`/api/search?q=${encodeURIComponent(trimmed)}&type=${apiType}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Search request failed');
        return res.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data.success) {
          setSearchResults(data.results);
          setShowSearchDropdown(true);
        } else {
          setSearchError(data.error || "Search couldn't be completed.");
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setSearchError("Search couldn't be completed. Check network connection.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      });
  };

  // Debounced query execution (300ms)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      executeSearch(searchQuery, searchTab);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery, searchTab]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard Escape listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowSearchDropdown(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const totalResultsCount = searchResults
    ? (searchResults.people?.length || 0) +
      (searchResults.communities?.length || 0) +
      (searchResults.posts?.length || 0) +
      (searchResults.photos?.length || 0) +
      (searchResults.videos?.length || 0)
    : 0;

  const handleClear = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setSearchQuery('');
    setSearchResults(null);
    setIsSearching(false);
    setShowSearchDropdown(false);
    setSearchError('');
    inputRef.current?.focus();
  };

  return (
    <div
      ref={searchContainerRef}
      style={{
        position: 'relative',
        width: isHomeVariant ? '100%' : undefined,
        marginBottom: isHomeVariant ? '16px' : 0,
      }}
    >
      {/* Search Input Bar */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          background: isHomeVariant ? 'var(--bg-card)' : 'var(--bg-secondary)',
          borderRadius: isHomeVariant ? '14px' : '9999px',
          border: '1px solid var(--border-subtle)',
          padding: isHomeVariant ? '6px 14px' : '4px 12px',
          boxShadow: isHomeVariant ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        }}
        className={isHomeVariant ? 'home-search-container' : 'global-search-container'}
      >
        <Search
          size={isHomeVariant ? 18 : 16}
          style={{
            color: 'var(--text-muted)',
            flexShrink: 0,
            marginRight: '10px',
          }}
        />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (searchResults || searchQuery.trim().length >= 2) setShowSearchDropdown(true);
          }}
          placeholder={resolvedPlaceholder}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: isHomeVariant ? '14.5px' : '13.5px',
            color: 'var(--text-main)',
            minWidth: 0,
            padding: isHomeVariant ? '7px 0' : '5px 0',
          }}
          aria-label={resolvedPlaceholder}
        />

        {/* Loading Spinner / Clear button with accessible touch target */}
        {isSearching ? (
          <div
            style={{
              color: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
            }}
          >
            <Loader2 size={16} className="animate-spin" />
          </div>
        ) : searchQuery ? (
          <button
            type="button"
            onClick={handleClear}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              transition: 'background 0.15s ease',
            }}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      {/* Search Results Dropdown */}
      {showSearchDropdown && (searchResults || isSearching || searchError) && (
        <div
          className="card glass-panel"
          style={{
            position: 'absolute',
            top: isHomeVariant ? 'calc(100% + 6px)' : '46px',
            left: 0,
            width: isHomeVariant ? '100%' : '480px',
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: '480px',
            overflowY: 'auto',
            zIndex: 250,
            padding: '12px',
            borderRadius: '14px',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
          }}
        >
          {/* Category Tabs Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              paddingBottom: '10px',
              marginBottom: '10px',
              borderBottom: '1px solid var(--border-subtle)',
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            {searchTabs.map((tab) => {
              const isActive = searchTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSearchTab(tab.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: isActive ? 'var(--brand-primary-light, #EBF7EE)' : 'transparent',
                    color: isActive ? 'var(--brand-primary)' : 'var(--text-muted)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '12px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    minHeight: '28px',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Loading Indicator */}
          {isSearching && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '24px 0',
                color: 'var(--text-muted)',
                fontSize: '13px',
              }}
            >
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--brand-primary)' }} />
              Searching {searchTab === 'all' ? (isHomeVariant ? 'feed content' : 'people & communities') : searchTab}...
            </div>
          )}

          {/* Error Message */}
          {searchError && !isSearching && (
            <div style={{ padding: '16px 12px', textAlign: 'center', color: '#ef4444', fontSize: '13px' }}>
              {searchError}
            </div>
          )}

          {/* ===================================================
              HEADER SEARCH SECTIONS (People & Communities Only)
              =================================================== */}
          {!isHomeVariant && searchResults && (
            <>
              {/* 1. People Section */}
              {(searchTab === 'all' || searchTab === 'people') && searchResults.people?.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: 'var(--brand-primary)',
                      textTransform: 'uppercase',
                      marginBottom: '6px',
                      letterSpacing: '0.04em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Users size={12} /> People
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {searchResults.people.map((p: any) => (
                      <Link
                        key={p.id}
                        href={`/profile/${encodeURIComponent(p.username || p.id)}`}
                        onClick={() => setShowSearchDropdown(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          color: 'inherit',
                          transition: 'background 0.15s ease',
                        }}
                        className="search-result-item"
                      >
                        {p.avatar_url ? (
                          <img
                            src={p.avatar_url}
                            alt={p.full_name}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'var(--bg-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-muted)',
                              fontSize: '13px',
                              fontWeight: 700,
                            }}
                          >
                            {p.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                              {p.full_name}
                            </span>
                            {p.is_verified && (
                              <CheckCircle2
                                size={13}
                                style={{ color: 'var(--brand-primary)', fill: 'var(--brand-primary-light, #EBF7EE)' }}
                              />
                            )}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            @{p.username} {p.area_name ? `• ${p.area_name}` : ''}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Communities Section */}
              {(searchTab === 'all' || searchTab === 'communities') && searchResults.communities?.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: 'var(--brand-primary)',
                      textTransform: 'uppercase',
                      marginBottom: '6px',
                      letterSpacing: '0.04em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Building2 size={12} /> Communities
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {searchResults.communities.map((c: any) => (
                      <Link
                        key={c.id}
                        href={`/communities/${c.slug || c.id}`}
                        onClick={() => setShowSearchDropdown(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          color: 'inherit',
                          transition: 'background 0.15s ease',
                        }}
                        className="search-result-item"
                      >
                        {c.avatar_image ? (
                          <img
                            src={c.avatar_image}
                            alt={c.name}
                            style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: 'var(--brand-primary-light)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--brand-primary)',
                            }}
                          >
                            <Building2 size={18} />
                          </div>
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: '13.5px',
                              fontWeight: 600,
                              color: 'var(--text-main)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {c.name}
                          </div>
                          <div
                            style={{
                              fontSize: '11.5px',
                              color: 'var(--text-muted)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {c.member_count} {c.member_count === 1 ? 'member' : 'members'}{' '}
                            {c.location_area ? `• ${c.location_area}` : ''}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ===================================================
              FEED CONTENT SEARCH SECTIONS (Posts, Photos, Videos)
              Note: NO users/people rendered here!
              =================================================== */}
          {isHomeVariant && searchResults && (
            <>
              {/* 1. Feed Posts Section */}
              {(searchTab === 'all' || searchTab === 'posts') && searchResults.posts?.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: 'var(--brand-primary)',
                      textTransform: 'uppercase',
                      marginBottom: '6px',
                      letterSpacing: '0.04em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <FileText size={12} /> Posts
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {searchResults.posts.map((post: any) => (
                      <Link
                        key={post.id}
                        href={`/#post-${post.id}`}
                        onClick={() => setShowSearchDropdown(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '10px',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          color: 'inherit',
                          background: 'var(--bg-secondary)',
                          transition: 'background 0.15s ease',
                        }}
                        className="search-result-item"
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                              {post.author_name}
                            </span>
                            {post.author_username && (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                @{post.author_username}
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: '12.5px',
                              color: 'var(--text-main)',
                              lineHeight: 1.35,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {post.title ? <strong>{post.title}: </strong> : null}
                            {post.body}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              marginTop: '6px',
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Heart size={11} /> {post.reaction_count}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <MessageSquare size={11} /> {post.comment_count}
                            </span>
                          </div>
                        </div>
                        {post.media_url && (
                          <img
                            src={post.media_url}
                            alt="Media"
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Feed Photos Section */}
              {(searchTab === 'all' || searchTab === 'photos') && searchResults.photos?.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: 'var(--brand-primary)',
                      textTransform: 'uppercase',
                      marginBottom: '6px',
                      letterSpacing: '0.04em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <ImageIcon size={12} /> Photos
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
                    {searchResults.photos.map((photo: any) => (
                      <Link
                        key={photo.id}
                        href={`/#post-${photo.post_id || photo.id}`}
                        onClick={() => setShowSearchDropdown(false)}
                        style={{
                          textDecoration: 'none',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid var(--border-subtle)',
                          background: 'var(--bg-secondary)',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div style={{ width: '100%', height: '80px', overflow: 'hidden', background: '#000' }}>
                          <img
                            src={photo.thumbnail_url || photo.url}
                            alt={photo.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <div
                          style={{
                            padding: '4px 6px',
                            fontSize: '10.5px',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {photo.author_name}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Feed Videos Section */}
              {(searchTab === 'all' || searchTab === 'videos') && searchResults.videos?.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: 'var(--brand-primary)',
                      textTransform: 'uppercase',
                      marginBottom: '6px',
                      letterSpacing: '0.04em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <VideoIcon size={12} /> Videos
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
                    {searchResults.videos.map((vid: any) => (
                      <Link
                        key={vid.id}
                        href={`/#post-${vid.post_id || vid.id}`}
                        onClick={() => setShowSearchDropdown(false)}
                        style={{
                          textDecoration: 'none',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid var(--border-subtle)',
                          background: 'var(--bg-secondary)',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: '80px',
                            background: '#18181b',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <VideoIcon size={24} style={{ color: '#fff', opacity: 0.8 }} />
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '4px',
                              right: '4px',
                              background: 'rgba(0,0,0,0.7)',
                              color: '#fff',
                              fontSize: '9px',
                              fontWeight: 700,
                              padding: '1px 4px',
                              borderRadius: '3px',
                            }}
                          >
                            VIDEO
                          </div>
                        </div>
                        <div
                          style={{
                            padding: '4px 6px',
                            fontSize: '10.5px',
                            color: 'var(--text-main)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {vid.title || vid.author_name}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Empty Search Result State */}
          {searchResults && !isSearching && !searchError && totalResultsCount === 0 && (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              <Search size={28} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                No {isHomeVariant ? 'posts, photos, or videos' : 'people or communities'} found for &ldquo;
                {searchQuery}&rdquo;
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                {isHomeVariant
                  ? 'Try searching with different feed keywords or animal terms.'
                  : 'Try searching another username, full name, or community keyword.'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
