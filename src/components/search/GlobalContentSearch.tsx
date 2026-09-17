'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Users,
  Building2,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Newspaper,
  Loader2,
  X,
  CheckCircle2,
  ExternalLink,
  Heart,
  MessageSquare,
} from 'lucide-react';

interface GlobalContentSearchProps {
  variant?: 'home' | 'header';
  placeholder?: string;
  autoFocus?: boolean;
}

export default function GlobalContentSearch({
  variant = 'header',
  placeholder = 'Search people, communities, posts, photos, videos...',
}: GlobalContentSearchProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTab, setSearchTab] = useState<'all' | 'people' | 'communities' | 'posts' | 'photos' | 'videos' | 'news'>('all');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const latestQueryRef = useRef<string>('');

  const searchTabs = [
    { id: 'all', label: 'All' },
    { id: 'people', label: 'People' },
    { id: 'communities', label: 'Communities' },
    { id: 'posts', label: 'Posts' },
    { id: 'photos', label: 'Photos' },
    { id: 'videos', label: 'Videos' },
    { id: 'news', label: 'News' },
  ] as const;

  const executeSearch = (query: string, tab: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError('');
    const queryKey = `${trimmed}::${tab}`;
    latestQueryRef.current = queryKey;

    fetch(`/api/search?q=${encodeURIComponent(trimmed)}&type=${tab}`)
      .then((res) => res.json())
      .then((data) => {
        if (latestQueryRef.current === queryKey) {
          if (data.success) {
            setSearchResults(data.results);
            setShowSearchDropdown(true);
          } else {
            setSearchError(data.error || "Search couldn't be completed. Please try again.");
          }
        }
      })
      .catch(() => {
        if (latestQueryRef.current === queryKey) {
          setSearchError("Search couldn't be completed. Check network connection.");
        }
      })
      .finally(() => {
        if (latestQueryRef.current === queryKey) {
          setIsSearching(false);
        }
      });
  };

  // Debounced query execution
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(() => {
      executeSearch(searchQuery, searchTab);
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, searchTab]);

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
      (searchResults.videos?.length || 0) +
      (searchResults.news?.length || 0)
    : 0;

  const isHomeVariant = variant === 'home';

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
            if (searchResults || searchQuery.trim()) setShowSearchDropdown(true);
          }}
          placeholder={placeholder}
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
          aria-label="Global content search"
        />

        {/* Loading Spinner / Clear button */}
        {isSearching ? (
          <div style={{ color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
            <Loader2 size={15} className="animate-spin" />
          </div>
        ) : searchQuery ? (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSearchResults(null);
              setShowSearchDropdown(false);
              inputRef.current?.focus();
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
              borderRadius: '50%',
            }}
            aria-label="Clear search query"
          >
            <X size={15} />
          </button>
        ) : null}
      </div>

      {/* Real Global Content Search Dropdown */}
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
              gap: '4px',
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
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Loading Indicator */}
          {isSearching && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '20px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--brand-primary)' }} />
              Searching {searchTab === 'all' ? 'everything' : searchTab}...
            </div>
          )}

          {/* Error Message */}
          {searchError && !isSearching && (
            <div style={{ padding: '16px 12px', textAlign: 'center', color: '#ef4444', fontSize: '13px' }}>
              {searchError}
            </div>
          )}

          {/* 1. Real People Section */}
          {searchResults && (searchTab === 'all' || searchTab === 'people') && searchResults.people?.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Users size={12} /> People
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {searchResults.people.map((p: any) => (
                  <Link
                    key={p.id}
                    href={`/profile/${p.username}`}
                    onClick={() => setShowSearchDropdown(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '7px 8px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'background 0.15s ease',
                    }}
                    className="search-result-item"
                  >
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={p.full_name} style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 700 }}>
                        {p.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)' }}>{p.full_name}</span>
                        {p.is_verified && <CheckCircle2 size={13} style={{ color: 'var(--brand-primary)', fill: 'var(--brand-primary-light, #EBF7EE)' }} />}
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

          {/* 2. Real Communities Section */}
          {searchResults && (searchTab === 'all' || searchTab === 'communities') && searchResults.communities?.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
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
                      padding: '7px 8px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'background 0.15s ease',
                    }}
                    className="search-result-item"
                  >
                    {c.avatar_image ? (
                      <img src={c.avatar_image} alt={c.name} style={{ width: '34px', height: '34px', borderRadius: '8px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--brand-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)' }}>
                        <Building2 size={18} />
                      </div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.member_count} {c.member_count === 1 ? 'member' : 'members'} {c.location_area ? `• ${c.location_area}` : ''}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 3. Real Posts Section */}
          {searchResults && (searchTab === 'all' || searchTab === 'posts') && searchResults.posts?.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FileText size={12} /> Posts
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {searchResults.posts.map((post: any) => (
                  <Link
                    key={post.id}
                    href={`/#post-${post.id}`}
                    onClick={() => setShowSearchDropdown(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '8px',
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
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)' }}>{post.author_name}</span>
                        {post.author_username && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{post.author_username}</span>}
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-main)', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {post.title ? <strong>{post.title}: </strong> : null}
                        {post.body}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Heart size={11} /> {post.reaction_count}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><MessageSquare size={11} /> {post.comment_count}</span>
                      </div>
                    </div>
                    {post.media_url && (
                      <img src={post.media_url} alt="Media" style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 4. Real Photos Section */}
          {searchResults && (searchTab === 'all' || searchTab === 'photos') && searchResults.photos?.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
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
                      <img src={photo.thumbnail_url || photo.url} alt={photo.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ padding: '4px 6px', fontSize: '10.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {photo.author_name}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 5. Real Videos Section */}
          {searchResults && (searchTab === 'all' || searchTab === 'videos') && searchResults.videos?.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
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
                    <div style={{ width: '100%', height: '80px', background: '#18181b', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <VideoIcon size={24} style={{ color: '#fff', opacity: 0.8 }} />
                      <div style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '1px 4px', borderRadius: '3px' }}>
                        VIDEO
                      </div>
                    </div>
                    <div style={{ padding: '4px 6px', fontSize: '10.5px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {vid.title || vid.author_name}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 6. Real News Section */}
          {searchResults && (searchTab === 'all' || searchTab === 'news') && searchResults.news?.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Newspaper size={12} /> News
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {searchResults.news.map((item: any) => (
                  <a
                    key={item.id || item.url}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      background: 'var(--bg-secondary)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--brand-primary)', background: 'var(--brand-primary-light, #EBF7EE)', padding: '2px 6px', borderRadius: '4px' }}>
                        {item.source}
                      </span>
                      <ExternalLink size={11} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.35 }}>
                      {item.title}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Empty Search Result State */}
          {searchResults && !isSearching && !searchError && totalResultsCount === 0 && (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              <Search size={30} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                No {searchTab === 'all' ? 'results' : searchTab} found for &ldquo;{searchQuery}&rdquo;
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                Try searching another animal welfare keyword, community name, or username.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
