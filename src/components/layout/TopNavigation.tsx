'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Users2,
  MapPin,
  AlertTriangle,
  Utensils,
  Search,
  Plus,
  Bell,
  Check,
  LogOut,
  Bookmark,
  ShieldAlert,
  Moon,
  Sun,
  X,
  Film,
  Settings,
  User,
  FileText,
  Camera,
  MessageCircle,
  Sparkles,
  Loader2,
  CheckCircle2,
  Newspaper,
  Image as ImageIcon,
  ExternalLink,
  MessageSquare,
  Heart,
} from 'lucide-react';
import { formatTime } from '@/lib/utils/date';
import type { UserSession } from '@/lib/auth/session';
import FeederLogo from '@/components/common/FeederLogo';
import FeederAvatar from '@/components/common/FeederAvatar';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

interface TopNavProps {
  user: UserSession | null;
  activeTab?: string;
  onOpenComposer?: (type?: string) => void;
  onOpenStory?: () => void;
  onOpenSos?: () => void;
  onOpenFeeding?: () => void;
}

export default function TopNavigation({
  user,
  activeTab: propActiveTab,
  onOpenComposer,
  onOpenStory,
  onOpenSos,
  onOpenFeeding,
}: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchTab, setSearchTab] = useState<'all' | 'people' | 'communities' | 'posts' | 'news' | 'images'>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const latestQueryRef = useRef('');

  // Dropdowns state
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobileScreen(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useBodyScrollLock(showCreateMenu && isMobileScreen);

  // Active tab determination
  let currentActiveTab = propActiveTab;
  if (!currentActiveTab) {
    if (pathname === '/') currentActiveTab = 'home';
    else if (pathname.startsWith('/reels')) currentActiveTab = 'reels';
    else if (pathname.startsWith('/communities')) currentActiveTab = 'communities';
    else if (pathname.startsWith('/nearby')) currentActiveTab = 'nearby';
    else if (pathname.startsWith('/sos')) currentActiveTab = 'sos';
    else if (pathname.startsWith('/feeding')) currentActiveTab = 'feeding';
    else if (pathname.startsWith('/connections')) currentActiveTab = 'connections';
    else if (pathname.startsWith('/messages')) currentActiveTab = 'messages';
  }

  // Fetch notifications and unread messages with live polling
  const loadNotifications = () => {
    if (!user) return;
    fetch('/api/notifications')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      })
      .catch(() => {});
  };

  const loadUnreadMessages = () => {
    if (!user) return;
    fetch('/api/messages/unread-count')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && typeof data.unreadCount === 'number') {
          setUnreadMessagesCount(data.unreadCount);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadNotifications();
    loadUnreadMessages();
    const interval = setInterval(() => {
      loadNotifications();
      loadUnreadMessages();
    }, 20000); // 20s polling
    return () => clearInterval(interval);
  }, [user]);

  // Execute search with race-condition prevention
  const executeSearch = (query: string, tab: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults(null);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
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

  // Handle Search Input with debounce
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

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard listener for Escape key to close search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowSearchDropdown(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMarkNotificationsRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'POST' });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch {}
  };

  const toggleTheme = () => {
    const nextTheme = !isDarkMode;
    setIsDarkMode(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme ? 'dark' : 'light');
  };

  const searchTabs = [
    { id: 'all', label: 'All' },
    { id: 'people', label: 'People' },
    { id: 'communities', label: 'Communities' },
    { id: 'posts', label: 'Posts' },
    { id: 'news', label: 'News' },
    { id: 'images', label: 'Images' },
  ] as const;

  const totalResultsCount = searchResults
    ? (searchResults.people?.length || 0) +
      (searchResults.communities?.length || 0) +
      (searchResults.posts?.length || 0) +
      (searchResults.news?.length || 0) +
      (searchResults.images?.length || 0)
    : 0;

  return (
    <header className="app-topbar">
      {/* Top Left: Brand Logo & Single Header Global Search */}
      <div className="topbar-left">
        <Link href="/" className="brand-logo" title="Feeder" aria-label="Feeder Home">
          <FeederLogo variant="responsive" height={36} />
        </Link>

        <div className="global-search-container" ref={searchRef}>
          <Search className="global-search-icon" size={16} />
          <input
            type="text"
            className="global-search-input"
            placeholder="Search people, communities, posts, news, images..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults) setShowSearchDropdown(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowSearchDropdown(false);
              }
            }}
          />

          {isSearching ? (
            <div
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Loader2 size={14} className="animate-spin" />
            </div>
          ) : searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults(null);
                setShowSearchDropdown(false);
              }}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : null}

          {/* Real Global Search Dropdown */}
          {showSearchDropdown && (searchResults || isSearching || searchError) && (
            <div
              className="card glass-panel"
              style={{
                position: 'absolute',
                top: '46px',
                left: 0,
                width: '460px',
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
              {/* Search Category Tabs Header */}
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

              {/* Error State */}
              {searchError && (
                <div style={{ padding: '16px', textAlign: 'center', color: '#dc2626', fontSize: '13px' }}>
                  <AlertTriangle size={24} style={{ margin: '0 auto 6px auto', opacity: 0.8 }} />
                  <div>{searchError}</div>
                  <button
                    type="button"
                    onClick={() => executeSearch(searchQuery, searchTab)}
                    className="btn btn-secondary"
                    style={{ marginTop: '8px', padding: '4px 12px', fontSize: '12px' }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Loading State Skeleton */}
              {isSearching && !searchResults && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', color: 'var(--brand-primary)' }} />
                  Searching across Feeder...
                </div>
              )}

              {/* 1. Real Users / People Section */}
              {searchResults && (searchTab === 'all' || searchTab === 'people') && searchResults.people?.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                    People & Guardians
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {searchResults.people.map((p: any) => (
                      <Link
                        key={p.id}
                        href={`/profile/${p.username}`}
                        onClick={() => {
                          setShowSearchDropdown(false);
                          setSearchQuery('');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: '10px',
                          textDecoration: 'none',
                          transition: 'background 0.15s ease',
                        }}
                        className="sidebar-user-card"
                      >
                        <FeederAvatar src={p.avatar_url} alt={p.full_name} size={36} className="avatar-img" />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.full_name}
                            </span>
                            {p.is_verified && (
                              <CheckCircle2 size={13} color="var(--brand-primary)" fill="var(--brand-primary-light)" style={{ flexShrink: 0 }} />
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            <span>@{p.username}</span>
                            {p.area_name && (
                              <>
                                <span>•</span>
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.area_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Real Communities Section */}
              {searchResults && (searchTab === 'all' || searchTab === 'communities') && searchResults.communities?.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                    Communities
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {searchResults.communities.map((c: any) => (
                      <Link
                        key={c.id}
                        href={`/communities/${c.id}`}
                        onClick={() => {
                          setShowSearchDropdown(false);
                          setSearchQuery('');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: '10px',
                          textDecoration: 'none',
                        }}
                        className="sidebar-user-card"
                      >
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '8px',
                            background: 'var(--brand-primary-light)',
                            color: 'var(--brand-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Users2 size={18} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.name}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
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
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                    Posts
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {searchResults.posts.map((post: any) => (
                      <Link
                        key={post.id}
                        href={post.author_username ? `/profile/${post.author_username}` : '/'}
                        onClick={() => {
                          setShowSearchDropdown(false);
                          setSearchQuery('');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: '10px',
                          textDecoration: 'none',
                        }}
                        className="sidebar-user-card"
                      >
                        <FeederAvatar src={post.author_avatar} alt={post.author_name} size={32} className="avatar-img" />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                            {post.author_name}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-muted)',
                              marginTop: '2px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              lineHeight: 1.35,
                            }}
                          >
                            {post.body}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            <span>{formatTime(post.created_at)}</span>
                            {post.reaction_count > 0 && <span>• {post.reaction_count} likes</span>}
                            {post.comment_count > 0 && <span>• {post.comment_count} comments</span>}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Real News Section */}
              {searchResults && (searchTab === 'all' || searchTab === 'news') && searchResults.news?.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                    News & Updates
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
                          padding: '9px 10px',
                          borderRadius: '10px',
                          textDecoration: 'none',
                          border: '1px solid var(--border-subtle)',
                          background: 'var(--bg-secondary)',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '3px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: 'var(--brand-primary)',
                              background: 'var(--brand-primary-light, #EBF7EE)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {item.source}
                          </span>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            {formatTime(item.published_at)}
                            <ExternalLink size={11} />
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: 'var(--text-main)',
                            lineHeight: 1.35,
                            marginBottom: '2px',
                          }}
                        >
                          {item.title}
                        </div>
                        {item.snippet && (
                          <div
                            style={{
                              fontSize: '11.5px',
                              color: 'var(--text-muted)',
                              lineHeight: 1.35,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {item.snippet}
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Real Images Section */}
              {searchResults && (searchTab === 'all' || searchTab === 'images') && searchResults.images?.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                    Images
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                      gap: '8px',
                    }}
                  >
                    {searchResults.images.map((img: any) => (
                      <a
                        key={img.id || img.url}
                        href={img.source_url || img.url}
                        target="_blank"
                        rel="noopener noreferrer"
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
                        <div style={{ width: '100%', height: '88px', overflow: 'hidden', background: '#000' }}>
                          <img
                            src={img.thumbnail_url || img.url}
                            alt={img.title}
                            loading="lazy"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              transition: 'transform 0.2s ease',
                            }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.transform = 'scale(1.05)')}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
                          />
                        </div>
                        <div style={{ padding: '6px 8px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 600,
                              color: 'var(--text-main)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={img.title}
                          >
                            {img.title}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {img.author ? `By ${img.author}` : img.license}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty Search Result State */}
              {searchResults && !isSearching && !searchError && totalResultsCount === 0 && (
                <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <Search size={32} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    No {searchTab === 'all' ? 'results' : searchTab} found for &ldquo;{searchQuery}&rdquo;
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    Try checking your spelling or searching for another keyword.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Top Center: 5 Reference Navigation Tabs (Home, Communities, Nearby, SOS, Feeding) */}
      <nav className="topbar-center">
        <Link
          href="/"
          className={`nav-tab-btn ${currentActiveTab === 'home' ? 'active' : ''}`}
          title="Home"
        >
          <Home size={20} fill={currentActiveTab === 'home' ? 'currentColor' : 'none'} />
          <span className="nav-tab-label">Home</span>
        </Link>

        <Link
          href="/communities"
          className={`nav-tab-btn ${currentActiveTab === 'communities' ? 'active' : ''}`}
          title="Communities"
        >
          <Users2 size={20} />
          <span className="nav-tab-label">Communities</span>
        </Link>

        <Link
          href="/nearby"
          className={`nav-tab-btn ${currentActiveTab === 'nearby' ? 'active' : ''}`}
          title="Nearby"
        >
          <MapPin size={20} />
          <span className="nav-tab-label">Nearby</span>
        </Link>

        <Link
          href="/sos"
          className={`nav-tab-btn ${currentActiveTab === 'sos' ? 'active' : ''}`}
          title="SOS"
        >
          <AlertTriangle size={20} color={currentActiveTab === 'sos' ? 'var(--brand-sos)' : undefined} />
          <span className="nav-tab-label">SOS</span>
        </Link>

        <Link
          href="/feeding"
          className={`nav-tab-btn ${currentActiveTab === 'feeding' ? 'active' : ''}`}
          title="Feeding"
        >
          <Utensils size={20} />
          <span className="nav-tab-label">Feeding</span>
        </Link>
      </nav>

      {/* Top Right: + Create Button, Messages, Notifications, Profile Avatar */}
      <div className="topbar-right">
        {/* + Create Button */}
        <div className="topbar-create-wrapper" style={{ position: 'relative' }}>
          <button
            className="topbar-create-btn"
            title="Create"
            aria-label="Create post, story, or feeding log"
            onClick={() => {
              setShowCreateMenu(!showCreateMenu);
              setShowNotifMenu(false);
              setShowUserMenu(false);
            }}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Create</span>
          </button>

              {showCreateMenu && (
                <>
                  {/* Mobile Action Sheet Backdrop & Modal */}
                  <div
                    className="mobile-create-sheet-backdrop"
                    onClick={() => setShowCreateMenu(false)}
                  >
                    <div
                      className="mobile-create-sheet-dialog"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="mobile-create-sheet-handle" />

                      <div className="mobile-create-sheet-header">
                        <div>
                          <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--brand-primary-light)', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Plus size={16} strokeWidth={3} />
                            </div>
                            <span>Create New</span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Share updates, rescue cases, or log street feeds
                          </div>
                        </div>
                        <button
                          type="button"
                          className="modal-close-btn"
                          onClick={() => setShowCreateMenu(false)}
                          aria-label="Close create menu"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="mobile-create-action-grid">
                        {/* 1. Create Post */}
                        <button
                          type="button"
                          className="create-action-card"
                          onClick={() => {
                            setShowCreateMenu(false);
                            onOpenComposer ? onOpenComposer('NORMAL') : router.push('/?action=create');
                          }}
                        >
                          <div className="sidebar-icon-wrap" style={{ background: 'var(--brand-primary-light)', color: 'var(--brand-primary)' }}>
                            <FileText size={20} />
                          </div>
                          <div className="create-action-card-text">
                            <div className="create-action-card-title">Create Post</div>
                            <div className="create-action-card-sub">Share update, photo or rescue</div>
                          </div>
                        </button>

                        {/* 2. Add Story */}
                        <button
                          type="button"
                          className="create-action-card"
                          onClick={() => {
                            setShowCreateMenu(false);
                            onOpenStory ? onOpenStory() : router.push('/?action=story');
                          }}
                        >
                          <div className="sidebar-icon-wrap" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
                            <Camera size={20} />
                          </div>
                          <div className="create-action-card-text">
                            <div className="create-action-card-title" style={{ color: '#4f46e5' }}>Add Story</div>
                            <div className="create-action-card-sub">24-hour welfare highlight</div>
                          </div>
                        </button>

                        {/* 3. Log Feeding */}
                        <button
                          type="button"
                          className="create-action-card"
                          onClick={() => {
                            setShowCreateMenu(false);
                            onOpenFeeding ? onOpenFeeding() : router.push('/feeding?action=log');
                          }}
                        >
                          <div className="sidebar-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
                            <Utensils size={20} />
                          </div>
                          <div className="create-action-card-text">
                            <div className="create-action-card-title">Log Feeding</div>
                            <div className="create-action-card-sub">Record animals fed & nutrition</div>
                          </div>
                        </button>

                        {/* 4. Report SOS */}
                        <button
                          type="button"
                          className="create-action-card"
                          onClick={() => {
                            setShowCreateMenu(false);
                            onOpenSos ? onOpenSos() : router.push('/sos?action=report');
                          }}
                        >
                          <div className="sidebar-icon-wrap" style={{ background: '#fee2e2', color: 'var(--brand-sos)' }}>
                            <AlertTriangle size={20} />
                          </div>
                          <div className="create-action-card-text">
                            <div className="create-action-card-title" style={{ color: 'var(--brand-sos)' }}>Report SOS</div>
                            <div className="create-action-card-sub">Emergency rescue triage</div>
                          </div>
                        </button>

                        {/* 5. Start Community */}
                        <button
                          type="button"
                          className="create-action-card create-action-card-full"
                          onClick={() => {
                            setShowCreateMenu(false);
                            router.push('/communities?action=create');
                          }}
                        >
                          <div className="sidebar-icon-wrap" style={{ background: '#ecfdf5', color: 'var(--brand-primary)' }}>
                            <Users2 size={20} />
                          </div>
                          <div className="create-action-card-text">
                            <div className="create-action-card-title">Start Community</div>
                            <div className="create-action-card-sub">Create a neighborhood pack</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Dropdown */}
                  <div
                    className="card glass-panel desktop-create-dropdown"
                    style={{
                      position: 'absolute',
                      top: '48px',
                      right: 0,
                      width: '280px',
                      zIndex: 200,
                      padding: '8px',
                      boxShadow: 'var(--shadow-xl)',
                    }}
                  >
                    <div style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                      CREATE ACTION
                    </div>
                    <button
                      type="button"
                      className="sidebar-nav-item"
                      onClick={() => {
                        setShowCreateMenu(false);
                        onOpenComposer ? onOpenComposer('NORMAL') : router.push('/?action=create');
                      }}
                    >
                      <div className="sidebar-icon-wrap" style={{ background: 'var(--brand-primary-light)', color: 'var(--brand-primary)' }}>
                        <FileText size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>Create Post</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Share update, photo or rescue</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="sidebar-nav-item"
                      onClick={() => {
                        setShowCreateMenu(false);
                        onOpenStory ? onOpenStory() : router.push('/?action=story');
                      }}
                    >
                      <div className="sidebar-icon-wrap" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
                        <Camera size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#4f46e5' }}>Add Story</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>24-hour welfare highlight</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="sidebar-nav-item"
                      onClick={() => {
                        setShowCreateMenu(false);
                        onOpenFeeding ? onOpenFeeding() : router.push('/feeding?action=log');
                      }}
                    >
                      <div className="sidebar-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
                        <Utensils size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>Log Feeding</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Record animals fed & nutrition</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="sidebar-nav-item"
                      onClick={() => {
                        setShowCreateMenu(false);
                        onOpenSos ? onOpenSos() : router.push('/sos?action=report');
                      }}
                    >
                      <div className="sidebar-icon-wrap" style={{ background: '#fee2e2', color: 'var(--brand-sos)' }}>
                        <AlertTriangle size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--brand-sos)' }}>Report Animal SOS</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Emergency rescue triage</div>
                      </div>
                    </button>

                    <Link
                      href="/communities?action=create"
                      className="sidebar-nav-item"
                      onClick={() => setShowCreateMenu(false)}
                    >
                      <div className="sidebar-icon-wrap" style={{ background: '#ecfdf5', color: 'var(--brand-primary)' }}>
                        <Users2 size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>Start Community</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Create a neighborhood pack</div>
                      </div>
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Direct Messages Button */}
            <Link
              href="/messages"
              className={`topbar-action-icon ${currentActiveTab === 'messages' ? 'active-icon' : ''}`}
              title="Messages"
              aria-label={`Direct Messages ${unreadMessagesCount > 0 ? `(${unreadMessagesCount} unread)` : ''}`}
              style={{ position: 'relative' }}
            >
              <MessageCircle size={20} />
              {unreadMessagesCount > 0 && <span className="action-badge-green">{unreadMessagesCount}</span>}
            </Link>

            {/* Notifications Bell */}
            <div style={{ position: 'relative' }}>
              <button
                className={`topbar-action-icon ${showNotifMenu ? 'active-icon' : ''}`}
                title="Notifications"
                aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
                onClick={() => {
                  setShowNotifMenu(!showNotifMenu);
                  setShowCreateMenu(false);
                  setShowUserMenu(false);
                }}
              >
                <Bell size={20} />
                {unreadCount > 0 && <span className="action-badge-green">{unreadCount}</span>}
              </button>

              {showNotifMenu && (
                <div
                  className="card glass-panel"
                  style={{
                    position: 'absolute',
                    top: '48px',
                    right: 0,
                    width: '360px',
                    maxWidth: 'calc(100vw - 24px)',
                    maxHeight: '440px',
                    overflowY: 'auto',
                    zIndex: 200,
                    boxShadow: 'var(--shadow-xl)',
                    padding: '12px',
                    borderRadius: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', padding: '0 4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700 }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkNotificationsRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--brand-primary)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Check size={14} /> Mark all read
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={n.target_url || '/notifications'}
                        onClick={async () => {
                          setShowNotifMenu(false);
                          if (!n.is_read) {
                            try {
                              await fetch(`/api/notifications/${n.id}`, { method: 'PATCH' });
                              setNotifications((prev) =>
                                prev.map((item) => (item.id === n.id ? { ...item, is_read: 1 } : item))
                              );
                              setUnreadCount((prev) => Math.max(0, prev - 1));
                            } catch {}
                          }
                        }}
                        style={{
                          display: 'flex',
                          gap: '12px',
                          padding: '10px',
                          borderRadius: '8px',
                          background: n.is_read ? 'transparent' : 'var(--brand-primary-light)',
                          marginBottom: '4px',
                          transition: 'background 0.15s ease',
                          textDecoration: 'none',
                        }}
                      >
                        <FeederAvatar
                          src={n.sender_avatar || (user ? user.avatarUrl : null)}
                          alt={n.title}
                          size={38}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{n.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{n.body}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-subtle)', marginTop: '2px' }}>
                            {formatTime(n.created_at)}
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* User Profile Avatar Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                className="user-avatar-btn"
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowCreateMenu(false);
                  setShowNotifMenu(false);
                }}
                aria-label="User Account Menu"
              >
                {user ? (
                  <FeederAvatar
                    src={user.avatarUrl}
                    alt={user.fullName}
                    size={38}
                    className="avatar-img"
                  />
                ) : (
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'var(--bg-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <User size={18} />
                  </div>
                )}
              </button>

              {showUserMenu && (
                <div
                  className="card glass-panel"
                  style={{
                    position: 'absolute',
                    top: '48px',
                    right: 0,
                    width: '280px',
                    maxWidth: 'calc(100vw - 24px)',
                    zIndex: 200,
                    padding: '12px',
                    boxShadow: 'var(--shadow-xl)',
                  }}
                >
                  {user ? (
                    <>
                      <Link
                        href={`/profile/${user.username}`}
                        onClick={() => setShowUserMenu(false)}
                        className="sidebar-user-card"
                        style={{ padding: '8px', marginBottom: '8px' }}
                      >
                        <FeederAvatar src={user.avatarUrl} alt={user.fullName} size={44} className="avatar-img" />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '15px' }}>{user.fullName}</div>
                          <div style={{ fontSize: '12px', color: 'var(--brand-primary)', fontWeight: 600 }}>
                            {user.feederLevel || 'Guardian'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{user.username}</div>
                        </div>
                      </Link>

                      <div className="sidebar-divider" />

                      <Link
                        href={`/profile/${user.username}?tab=feeding`}
                        onClick={() => setShowUserMenu(false)}
                        className="sidebar-nav-item"
                      >
                        <Utensils size={18} color="var(--brand-primary)" />
                        <span>My Feeding Log ({user.feedingCount})</span>
                      </Link>

                      <Link
                        href="/communities"
                        onClick={() => setShowUserMenu(false)}
                        className="sidebar-nav-item"
                      >
                        <Users2 size={18} color="var(--brand-accent)" />
                        <span>My Communities</span>
                      </Link>

                      <Link
                        href="/saved"
                        onClick={() => setShowUserMenu(false)}
                        className="sidebar-nav-item"
                      >
                        <Bookmark size={18} color="#f59e0b" />
                        <span>Saved Posts</span>
                      </Link>

                      <Link
                        href="/settings"
                        onClick={() => setShowUserMenu(false)}
                        className="sidebar-nav-item"
                      >
                        <Settings size={18} color="var(--text-muted)" />
                        <span>Settings & Privacy</span>
                      </Link>

                      {(user.role === 'PLATFORM_ADMIN' || user.role === 'PLATFORM_MODERATOR') && (
                        <Link
                          href="/admin"
                          onClick={() => setShowUserMenu(false)}
                          className="sidebar-nav-item"
                        >
                          <ShieldAlert size={18} color="var(--brand-sos)" />
                          <span>Admin Moderation</span>
                        </Link>
                      )}
                    </>
                  ) : (
                    <div style={{ padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Welcome, Animal Ally</div>
                      <Link href="/login" className="btn-secondary" style={{ padding: '8px', textAlign: 'center', fontSize: '13px' }} onClick={() => setShowUserMenu(false)}>
                        Sign In
                      </Link>
                      <Link href="/signup" className="btn-primary" style={{ padding: '8px', textAlign: 'center', fontSize: '13px' }} onClick={() => setShowUserMenu(false)}>
                        Sign Up
                      </Link>
                    </div>
                  )}

                  <div className="sidebar-divider" />

                  {/* Theme Toggle */}
                  <button
                    className="sidebar-nav-item"
                    onClick={toggleTheme}
                    style={{ width: '100%', justifyContent: 'space-between' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                      <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {isDarkMode ? 'On' : 'Off'}
                    </span>
                  </button>

                  {user && (
                    <>
                      <div className="sidebar-divider" />
                      <button
                        className="sidebar-nav-item"
                        style={{ color: 'var(--brand-sos)' }}
                        onClick={async () => {
                          try {
                            await signOut(auth);
                          } catch (e) {
                            console.warn('Firebase signout notice:', e);
                          }
                          await fetch('/api/auth/logout', { method: 'POST' });
                          window.location.href = '/';
                        }}
                      >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
      </div>
    </header>
  );
}
