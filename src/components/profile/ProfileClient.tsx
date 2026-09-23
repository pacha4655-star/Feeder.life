'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PostCard from '@/components/feed/PostCard';
import FeederAvatar from '@/components/common/FeederAvatar';
import {
  MapPin,
  Utensils,
  AlertTriangle,
  Users2,
  Award,
  ShieldCheck,
  Check,
  MessageSquare,
  Ban,
  Flag,
  Loader2,
  Camera,
  Edit2,
  X,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';

interface ProfileClientProps {
  profileUser: any;
  posts: any[];
  feedingLogs: any[];
  currentUser: UserSession | null;
}

export default function ProfileClient({
  profileUser,
  posts,
  feedingLogs,
  currentUser,
}: ProfileClientProps) {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'posts' | 'feeding'>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState<number>(profileUser.followers_count || 0);
  const [followingCount, setFollowingCount] = useState<number>(profileUser.following_count || 0);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockLoading, setIsBlockLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('HARASSMENT');
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string>(profileUser.avatar_url || '');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);

  // Cover state
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(profileUser.cover_url || null);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showCoverMenu, setShowCoverMenu] = useState(false);

  // Remove avatar photo and revert to Feeder default avatar
  const handleRemoveAvatar = async () => {
    if (!window.confirm('Remove profile photo and revert to default Feeder avatar?')) return;
    setShowAvatarMenu(false);

    try {
      const profileRes = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: null }),
      });

      const profileData = await profileRes.json();
      if (profileRes.ok && profileData.success) {
        setAvatarUrl('');
        profileUser.avatar_url = null;
        router.refresh();
      } else {
        alert('Failed to remove profile photo.');
      }
    } catch {
      alert('Network error removing profile photo.');
    }
  };

  // Username state
  const [currentUsername, setCurrentUsername] = useState<string>(profileUser.username || '');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const isSelf = currentUser ? profileUser.id === currentUser.id : false;

  // Handle native file selection for avatar
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      alert('Only JPG, PNG, and WebP images are supported.');
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image size exceeds 10MB limit.');
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      return;
    }

    setSelectedAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarError(null);
    setShowAvatarModal(true);
  };

  // Upload avatar to /api/upload?category=profiles and update users.avatar_url
  const handleUploadAvatarConfirm = async () => {
    if (!selectedAvatarFile) return;

    setIsUploadingAvatar(true);
    setAvatarError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedAvatarFile);
      formData.append('category', 'profiles');

      const uploadRes = await fetch('/api/upload?category=profiles', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        setAvatarError(uploadData.error || 'Failed to upload image.');
        return;
      }

      const profileRes = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: uploadData.url }),
      });

      const profileData = await profileRes.json();
      if (!profileRes.ok || !profileData.success) {
        setAvatarError(profileData.error || 'Failed to save profile picture.');
        return;
      }

      setAvatarUrl(uploadData.url);
      profileUser.avatar_url = uploadData.url;
      setShowAvatarModal(false);
      setSelectedAvatarFile(null);
      setAvatarPreview(null);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      router.refresh();
    } catch {
      setAvatarError('Network error uploading avatar.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handle native file selection for cover
  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      alert('Only JPG, PNG, and WebP images are supported.');
      if (coverInputRef.current) coverInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Cover image size exceeds 10MB limit.');
      if (coverInputRef.current) coverInputRef.current.value = '';
      return;
    }

    setSelectedCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setCoverError(null);
    setShowCoverModal(true);
    setShowCoverMenu(false);
  };

  // Upload cover to /api/upload?category=covers and update user profile
  const handleUploadCoverConfirm = async () => {
    if (!selectedCoverFile) return;

    setIsUploadingCover(true);
    setCoverError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedCoverFile);
      formData.append('category', 'covers');

      const uploadRes = await fetch('/api/upload?category=covers', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        setCoverError(uploadData.error || 'Failed to upload cover image.');
        return;
      }

      const profileRes = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverUrl: uploadData.url }),
      });

      const profileData = await profileRes.json();
      if (!profileRes.ok || !profileData.success) {
        setCoverError(profileData.error || 'Failed to save cover image.');
        return;
      }

      setCoverUrl(uploadData.url);
      profileUser.cover_url = uploadData.url;
      setShowCoverModal(false);
      setSelectedCoverFile(null);
      setCoverPreview(null);
      if (coverInputRef.current) coverInputRef.current.value = '';
      router.refresh();
    } catch {
      setCoverError('Network error uploading cover.');
    } finally {
      setIsUploadingCover(false);
    }
  };

  // Remove cover image and revert to default Feeder background
  const handleRemoveCover = async () => {
    if (!window.confirm('Remove cover image and return to default Feeder background?')) return;
    setShowCoverMenu(false);

    try {
      const profileRes = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverUrl: null }),
      });

      const profileData = await profileRes.json();
      if (profileRes.ok && profileData.success) {
        setCoverUrl(null);
        profileUser.cover_url = null;
        router.refresh();
      } else {
        alert('Failed to remove cover image.');
      }
    } catch {
      alert('Network error removing cover image.');
    }
  };

  // Handle saving username with validation
  const handleSaveUsername = async () => {
    const trimmed = usernameInput.trim();
    if (!trimmed) {
      setUsernameError('Username is required.');
      return;
    }
    if (trimmed.length < 3) {
      setUsernameError('Username is too short.');
      return;
    }
    if (trimmed.length > 30) {
      setUsernameError('Username is too long.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameError('Username can only contain letters, numbers, and underscores.');
      return;
    }

    setIsSavingUsername(true);
    setUsernameError(null);

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed.toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setUsernameError(data.error || 'Unable to update username. Please try again.');
        return;
      }

      const updatedName = data.profile?.username || trimmed.toLowerCase();
      setCurrentUsername(updatedName);
      profileUser.username = updatedName;
      setIsEditingUsername(false);
      setUsernameError(null);
      router.replace(`/profile/${updatedName}`);
      router.refresh();
    } catch {
      setUsernameError('Unable to update username. Please try again.');
    } finally {
      setIsSavingUsername(false);
    }
  };

  // Fetch real follow status & counts
  useEffect(() => {
    let isMounted = true;
    const fetchFollowStatus = async () => {
      try {
        const res = await fetch(`/api/users/${profileUser.id}/follow`);
        const data = await res.json();
        if (data && isMounted) {
          setIsFollowing(!!data.following);
          if (typeof data.followerCount === 'number') setFollowerCount(data.followerCount);
          if (typeof data.followingCount === 'number') setFollowingCount(data.followingCount);
        }
      } catch {}
    };

    fetchFollowStatus();
    return () => {
      isMounted = false;
    };
  }, [profileUser.id]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    setIsFollowLoading(true);
    try {
      const res = await fetch(`/api/users/${profileUser.id}/follow`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setIsFollowing(data.following);
        setFollowerCount(data.followerCount);
      }
    } catch {} finally {
      setIsFollowLoading(false);
    }
  };

  const handleBlockToggle = async () => {
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    if (!confirm(isBlocked ? 'Unblock this user?' : 'Are you sure you want to block this user? They will not be able to follow, message, or view your private stories.')) {
      return;
    }

    setIsBlockLoading(true);
    try {
      const method = isBlocked ? 'DELETE' : 'POST';
      const res = await fetch(`/api/users/${profileUser.id}/block`, { method });
      const data = await res.json();
      if (data.success) {
        setIsBlocked(data.isBlocked);
        if (data.isBlocked) {
          setIsFollowing(false);
        }
      }
    } catch {} finally {
      setIsBlockLoading(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    setIsReporting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'USER',
          targetId: profileUser.id,
          reason: reportReason,
          details: reportDetails.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReportSuccess(true);
        setTimeout(() => {
          setReportSuccess(false);
          setShowReportModal(false);
          setReportDetails('');
        }, 2000);
      }
    } catch {} finally {
      setIsReporting(false);
    }
  };

  return (
    <div>
      {/* 1. Profile Cover & Header Card */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: '16px', position: 'relative' }}>
        <div
          className="profile-cover-banner"
          style={{
            height: '210px',
            position: 'relative',
            background: coverUrl
              ? `url(${coverUrl}) center/cover no-repeat`
              : 'linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%)',
          }}
        >
          {isSelf && (
            <div style={{ position: 'absolute', bottom: '12px', right: '16px', zIndex: 10 }}>
              <input
                type="file"
                ref={coverInputRef}
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCoverFileChange}
                style={{ display: 'none' }}
              />
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowCoverMenu(!showCoverMenu)}
                  style={{
                    background: 'rgba(0, 0, 0, 0.65)',
                    color: '#ffffff',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  }}
                  title="Edit Cover Photo"
                >
                  <Camera size={15} />
                  <span>Edit Cover</span>
                </button>

                {showCoverMenu && (
                  <div
                    className="card"
                    style={{
                      position: 'absolute',
                      bottom: '42px',
                      right: 0,
                      width: '180px',
                      padding: '4px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                      borderRadius: '10px',
                      zIndex: 30,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowCoverMenu(false);
                        coverInputRef.current?.click();
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        border: 'none',
                        background: 'none',
                        color: 'var(--text-primary)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderRadius: '6px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      <Camera size={14} color="var(--brand-primary)" />
                      <span>Upload Photo</span>
                    </button>

                    {coverUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveCover}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          border: 'none',
                          background: 'none',
                          color: '#dc2626',
                          textAlign: 'left',
                          cursor: 'pointer',
                          borderRadius: '6px',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#FEE2E2')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      >
                        <X size={14} color="#dc2626" />
                        <span>Remove Cover</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <FeederAvatar
                src={avatarUrl}
                alt={profileUser.full_name}
                size={90}
                style={{
                  border: '4px solid var(--bg-card)',
                  marginTop: '-60px',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                }}
              />
              {isSelf && (
                <>
                  <input
                    type="file"
                    ref={avatarInputRef}
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarFileChange}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    title="Edit Profile Photo"
                    aria-label="Edit Profile Photo"
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                      background: 'var(--brand-primary)',
                      color: 'white',
                      border: '2px solid white',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    }}
                  >
                    <Camera size={15} />
                  </button>
                </>
              )}
            </div>

            {isSelf ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                    className="btn btn-secondary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      minHeight: '40px',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <Camera size={15} />
                    <span>Edit Photo</span>
                  </button>

                  {showAvatarMenu && (
                    <div
                      className="card"
                      style={{
                        position: 'absolute',
                        top: '46px',
                        right: 0,
                        width: '180px',
                        padding: '4px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                        borderRadius: '10px',
                        zIndex: 30,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setShowAvatarMenu(false);
                          avatarInputRef.current?.click();
                        }}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          border: 'none',
                          background: 'none',
                          color: 'var(--text-primary)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          borderRadius: '6px',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      >
                        <Camera size={14} color="var(--brand-primary)" />
                        <span>Upload Photo</span>
                      </button>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '13px',
                            border: 'none',
                            background: 'none',
                            color: '#dc2626',
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderRadius: '6px',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#FEE2E2')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                        >
                          <X size={14} color="#dc2626" />
                          <span>Remove Photo</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Link
                  href={`/messages?user=${profileUser.id}`}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', minHeight: '44px' }}
                >
                  <MessageSquare size={15} />
                  <span>Message</span>
                </Link>

                <button
                  onClick={handleFollowToggle}
                  disabled={isFollowLoading || isBlocked}
                  className={isFollowing ? 'btn btn-secondary' : 'btn btn-primary'}
                  style={{ padding: '8px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', minHeight: '44px' }}
                >
                  {isFollowLoading ? (
                    <Loader2 className="animate-spin" size={15} />
                  ) : isFollowing ? (
                    '✓ Following'
                  ) : (
                    '+ Follow'
                  )}
                </button>

                <button
                  onClick={handleBlockToggle}
                  disabled={isBlockLoading}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    color: isBlocked ? '#dc2626' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    minHeight: '44px',
                  }}
                  title={isBlocked ? 'Unblock User' : 'Block User'}
                >
                  <Ban size={14} />
                  <span>{isBlocked ? 'Blocked' : 'Block'}</span>
                </button>

                <button
                  onClick={() => setShowReportModal(true)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    minHeight: '44px',
                  }}
                  title="Report User"
                >
                  <Flag size={14} />
                  <span>Report</span>
                </button>
              </div>
            )}
          </div>

          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800 }}>{profileUser.full_name}</h1>
              {profileUser.is_verified === 1 && (
                <span title="Verified Animal Welfare Guardian">
                  <Check size={18} color="#059669" />
                </span>
              )}
            </div>

            <div style={{ fontSize: '13px', color: '#059669', fontWeight: 700 }}>
              {profileUser.feeder_level || 'Grassroots Animal Guardian'}
            </div>

            {!isEditingUsername ? (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                <span style={{ fontWeight: 600 }}>@{currentUsername}</span>
                {isSelf && (
                  <button
                    onClick={() => {
                      setIsEditingUsername(true);
                      setUsernameInput(currentUsername);
                      setUsernameError(null);
                    }}
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
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                    title="Edit Username"
                  >
                    <Edit2 size={12} />
                    <span>Edit Username</span>
                  </button>
                )}
                {profileUser.area_name && (
                  <>
                    <span>&bull;</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <MapPin size={12} color="#059669" />
                      {profileUser.area_name}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div style={{ margin: '8px 0', maxWidth: '420px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '13px' }}>@</span>
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => {
                        setUsernameInput(e.target.value);
                        setUsernameError(null);
                      }}
                      placeholder="username"
                      disabled={isSavingUsername}
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 26px',
                        fontSize: '13px',
                        borderRadius: 'var(--radius-md)',
                        border: usernameError ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>
                  <button
                    onClick={handleSaveUsername}
                    disabled={isSavingUsername}
                    className="btn btn-primary"
                    style={{ padding: '8px 14px', fontSize: '12px', minHeight: '36px' }}
                  >
                    {isSavingUsername ? <Loader2 className="animate-spin" size={14} /> : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingUsername(false);
                      setUsernameError(null);
                    }}
                    disabled={isSavingUsername}
                    className="btn btn-secondary"
                    style={{ padding: '8px 12px', fontSize: '12px', minHeight: '36px' }}
                  >
                    Cancel
                  </button>
                </div>
                {usernameError && (
                  <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: 500 }}>
                    {usernameError}
                  </div>
                )}
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  3-30 characters: letters, numbers, and underscores. Case-insensitive unique.
                </div>
              </div>
            )}

            {/* Real Follower / Following Counts */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '13px' }}>
              <Link
                href="/connections?tab=followers"
                style={{
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '4px',
                }}
                className="hover:underline"
                title="View Followers"
              >
                <strong style={{ color: 'var(--text-main)' }}>{followerCount}</strong>{' '}
                <span style={{ color: 'var(--text-muted)' }}>Followers</span>
              </Link>
              <Link
                href="/connections?tab=following"
                style={{
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '4px',
                }}
                className="hover:underline"
                title="View Following"
              >
                <strong style={{ color: 'var(--text-main)' }}>{followingCount}</strong>{' '}
                <span style={{ color: 'var(--text-muted)' }}>Following</span>
              </Link>
            </div>

            {profileUser.bio && (
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-main)', marginTop: '8px', maxWidth: '600px' }}>
                {profileUser.bio}
              </p>
            )}

            {/* Badges Cluster */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
              {profileUser.badges?.map((b: string, i: number) => (
                <span
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                >
                  <Award size={13} color="#f59e0b" />
                  <span>{b}</span>
                </span>
              ))}
            </div>

            {/* Contribution Stats Strip (Zero fake data) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-subtle)',
                textAlign: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>
                  {profileUser.feeding_count || feedingLogs.length || 0}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Feedings Logged</div>
              </div>

              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#dc2626' }}>
                  {profileUser.sos_responses_count || 0}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SOS Triage Actions</div>
              </div>

              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#3b82f6' }}>
                  {profileUser.community_contributions_count || 0}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Community Contributions</div>
              </div>
            </div>
          </div>

          {/* Profile Tabs */}
          <div className="feed-tabs-bar" style={{ marginTop: '20px', marginBottom: 0 }}>
            <button
              className={`feed-filter-chip ${activeTab === 'posts' ? 'active' : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              Posts ({posts.length})
            </button>
            <button
              className={`feed-filter-chip ${activeTab === 'feeding' ? 'active' : ''}`}
              onClick={() => setActiveTab('feeding')}
            >
              Feeding Logs ({feedingLogs.length})
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tab Content */}
      {activeTab === 'posts' && (
        <div>
          {posts.length === 0 ? (
            <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)' }}>
                No posts yet.
              </div>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                onPostUpdated={() => {
                  window.location.reload();
                }}
              />
            ))
          )}
        </div>
      )}

      {activeTab === 'feeding' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {feedingLogs.length === 0 ? (
            <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)' }}>
                No feeding logs recorded yet.
              </div>
            </div>
          ) : (
            feedingLogs.map((log) => (
              <div key={log.id} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>
                    🐾 Fed {log.animal_count} {log.animal_type}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{log.fed_at}</div>
                </div>
                <div style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  📍 {log.approx_location_name} &bull; Meal: {log.food_type} ({log.quantity_desc})
                </div>
                {log.notes && <p style={{ fontSize: '13.5px', color: 'var(--text-main)' }}>{log.notes}</p>}
                {log.photo_url && (
                  <img
                    src={log.photo_url}
                    alt=""
                    style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginTop: '8px' }}
                  />
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Report User Modal */}
      {showReportModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowReportModal(false)}
        >
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div className="modal-title">Report Guardian Account</div>
              <button className="modal-close-btn" onClick={() => setShowReportModal(false)}>
                &times;
              </button>
            </div>
            {reportSuccess ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#059669', fontWeight: 700 }}>
                ✓ Report submitted to platform safety moderators.
              </div>
            ) : (
              <form onSubmit={handleReportSubmit}>
                <div className="modal-body">
                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label className="form-label">Violation Reason</label>
                    <select
                      className="form-select"
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                    >
                      <option value="SPAM">Spam or False Identity</option>
                      <option value="HARASSMENT">Harassment or Aggressive Conduct</option>
                      <option value="ANIMAL_CRUELTY">Animal Cruelty or Abuse Concern</option>
                      <option value="FALSE_SOS">False Emergency or Fraudulent Donation</option>
                      <option value="OTHER">Other Community Policy Violation</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Details / Evidence</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      placeholder="Explain what happened..."
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowReportModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-danger" disabled={isReporting}>
                    {isReporting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Change Photo Confirmation Modal */}
      {showAvatarModal && avatarPreview && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1000 }}
          onClick={() => !isUploadingAvatar && setShowAvatarModal(false)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '420px', padding: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                Selected Photo
              </div>
              {!isUploadingAvatar && (
                <button
                  onClick={() => setShowAvatarModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <img
                src={avatarPreview}
                alt="Selected Photo Preview"
                style={{
                  width: '140px',
                  height: '140px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  margin: '0 auto',
                  border: '4px solid var(--brand-primary)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
              />
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '12px' }}>
                {selectedAvatarFile?.name} ({((selectedAvatarFile?.size || 0) / 1024).toFixed(1)} KB)
              </div>
            </div>

            {avatarError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#dc2626',
                  fontSize: '12.5px',
                  marginBottom: '14px',
                }}
              >
                <AlertCircle size={15} />
                <span>{avatarError}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAvatarModal(false)}
                disabled={isUploadingAvatar}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleUploadAvatarConfirm}
                disabled={isUploadingAvatar}
                style={{ padding: '8px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isUploadingAvatar ? (
                  <>
                    <Loader2 className="animate-spin" size={15} />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>Save / Upload</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cover Image Upload Modal */}
      {showCoverModal && (
        <div
          className="modal-overlay"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
          onClick={() => !isUploadingCover && setShowCoverModal(false)}
        >
          <div
            className="modal-content card"
            style={{ maxWidth: '520px', width: '100%', padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Update Profile Cover
              </h3>
              {!isUploadingCover && (
                <button
                  type="button"
                  onClick={() => setShowCoverModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {coverError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  background: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  color: '#991B1B',
                  fontSize: '13px',
                  marginBottom: '14px',
                }}
              >
                <AlertCircle size={16} />
                <span>{coverError}</span>
              </div>
            )}

            {coverPreview && (
              <div
                style={{
                  width: '100%',
                  height: '180px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  marginBottom: '18px',
                  border: '1px solid var(--border-subtle)',
                  background: '#000000',
                }}
              >
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCoverModal(false)}
                disabled={isUploadingCover}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleUploadCoverConfirm}
                disabled={isUploadingCover}
                style={{ padding: '8px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isUploadingCover ? (
                  <>
                    <Loader2 className="animate-spin" size={15} />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>Save Cover</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
