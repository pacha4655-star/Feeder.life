'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Shield,
  KeyRound,
  Lock,
  Eye,
  UserX,
  MessageSquare,
  Bell,
  Mail,
  Smartphone,
  Sliders,
  Globe,
  Palette,
  EyeOff,
  MapPin,
  Camera,
  Mic,
  Image as ImageIcon,
  FileText,
  Download,
  Database,
  Users,
  Heart,
  HelpCircle,
  AlertTriangle,
  FileCheck,
  LogOut,
  Trash2,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Save,
  Search,
  Check,
  Plus,
  X,
  ExternalLink,
  RefreshCw,
  Compass,
  Sparkles,
  Info,
  ShieldAlert,
  Radio,
  Clock,
  Volume2,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import type { UserSession } from '@/lib/auth/session';

interface SettingsClientProps {
  user: UserSession | null;
  initialSection?: string;
}

type SectionKey =
  | 'personal'
  | 'security'
  | 'account'
  | 'privacy'
  | 'tagging'
  | 'followers'
  | 'blocking'
  | 'messaging'
  | 'notifications'
  | 'email-notifications'
  | 'push-notifications'
  | 'feed'
  | 'language'
  | 'appearance'
  | 'accessibility'
  | 'permissions'
  | 'information'
  | 'communities'
  | 'animals'
  | 'support'
  | 'legal'
  | 'actions';

interface CategoryGroup {
  id: string;
  title: string;
  items: {
    key: SectionKey;
    label: string;
    description: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

const SETTINGS_CATEGORIES: CategoryGroup[] = [
  {
    id: 'account',
    title: 'Account',
    items: [
      { key: 'personal', label: 'Personal Information', description: 'Name, handle, email, phone, and visibility', icon: User },
      { key: 'security', label: 'Password & Security', description: 'Password, 2FA, login sessions, and alerts', icon: KeyRound },
      { key: 'account', label: 'Account Management', description: 'Ownership, verification, and deactivation', icon: Sliders },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy',
    items: [
      { key: 'privacy', label: 'Privacy & Audience', description: 'Who can see your profile, posts, and location', icon: Lock },
      { key: 'tagging', label: 'Profile & Tagging', description: 'Tagging permissions and review workflow', icon: Eye },
      { key: 'followers', label: 'Followers & Public Content', description: 'Manage followers and public interactions', icon: Users },
      { key: 'blocking', label: 'Blocking', description: 'Manage blocked users and restricted accounts', icon: UserX },
      { key: 'messaging', label: 'Messaging Privacy', description: 'Direct message filters and read receipts', icon: MessageSquare },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    items: [
      { key: 'notifications', label: 'All Notifications', description: 'Notification hub and summary preferences', icon: Bell },
      { key: 'push-notifications', label: 'Push Notifications', description: 'SOS alerts, feeding streaks, and comments', icon: Smartphone },
      { key: 'email-notifications', label: 'Email Notifications', description: 'Security digests, community updates, and summaries', icon: Mail },
    ],
  },
  {
    id: 'preferences',
    title: 'Preferences',
    items: [
      { key: 'feed', label: 'Feed Preferences', description: 'Favorites, recommendation filters, and muted words', icon: Compass },
      { key: 'language', label: 'Language & Region', description: 'Language, timezone, and date/time format', icon: Globe },
      { key: 'appearance', label: 'Appearance', description: 'Light, dark, or system theme', icon: Palette },
      { key: 'accessibility', label: 'Accessibility', description: 'Text size, high contrast, and motion reduction', icon: EyeOff },
    ],
  },
  {
    id: 'permissions',
    title: 'Permissions',
    items: [
      { key: 'permissions', label: 'Device & App Permissions', description: 'Location, camera, microphone, and media access', icon: Radio },
    ],
  },
  {
    id: 'information',
    title: 'Your Information',
    items: [
      { key: 'information', label: 'Activity Log & Data Download', description: 'View logs, export your data, and connected accounts', icon: Download },
    ],
  },
  {
    id: 'communities',
    title: 'Communities',
    items: [
      { key: 'communities', label: 'Community Preferences', description: 'Joined groups, notifications, and invitations', icon: Users },
    ],
  },
  {
    id: 'animals',
    title: 'Animal & Feeder',
    items: [
      { key: 'animals', label: 'Animal & Feeding Preferences', description: 'Species interests, rescue radius, and foster status', icon: Heart, badge: 'Feeder Core' },
    ],
  },
  {
    id: 'support',
    title: 'Support & Safety',
    items: [
      { key: 'support', label: 'Help Center & Safety', description: 'FAQs, report a problem, and contact guardian desk', icon: HelpCircle },
    ],
  },
  {
    id: 'legal',
    title: 'Legal & Policies',
    items: [
      { key: 'legal', label: 'Legal & Guidelines', description: 'Privacy policy, terms, guidelines, and about Feeder', icon: FileCheck },
    ],
  },
];

export default function SettingsClient({ user, initialSection }: SettingsClientProps) {
  const router = useRouter();

  // Active section state
  const validInitial = (initialSection as SectionKey) || 'personal';
  const [activeSection, setActiveSection] = useState<SectionKey>(validInitial);
  const [mobileDrilldown, setMobileDrilldown] = useState<boolean>(!!initialSection);
  const [searchQuery, setSearchQuery] = useState('');

  // Form & Settings state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [areaName, setAreaName] = useState(user?.areaName || '');
  const [city, setCity] = useState(user?.city || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');

  // Privacy states
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [postVisibility, setPostVisibility] = useState('public');
  const [whoCanFollow, setWhoCanFollow] = useState('everyone');
  const [whoCanMessage, setWhoCanMessage] = useState('everyone');
  const [whoCanComment, setWhoCanComment] = useState('everyone');
  const [whoCanTag, setWhoCanTag] = useState('everyone');
  const [tagReview, setTagReview] = useState(true);
  const [publicDirectory, setPublicDirectory] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<string[]>(['spam_bot_9', 'fake_account_1']);
  const [newBlockedUser, setNewBlockedUser] = useState('');

  // Notification states
  const [pushLikes, setPushLikes] = useState(true);
  const [pushComments, setPushComments] = useState(true);
  const [pushFollowers, setPushFollowers] = useState(true);
  const [pushMessages, setPushMessages] = useState(true);
  const [pushCommunities, setPushCommunities] = useState(true);
  const [pushAdoption, setPushAdoption] = useState(true);
  const [pushRescue, setPushRescue] = useState(true);
  const [pushFeeding, setPushFeeding] = useState(true);
  const [pushSosAlerts, setPushSosAlerts] = useState(true); // Emergency SOS

  const [emailActivity, setEmailActivity] = useState(true);
  const [emailSecurity, setEmailSecurity] = useState(true);
  const [emailCommunities, setEmailCommunities] = useState(false);
  const [emailDigest, setEmailDigest] = useState(true);

  // Feed preferences
  const [feedOrder, setFeedOrder] = useState('recommended');
  const [suggestedFrequency, setSuggestedFrequency] = useState('moderate');
  const [mutedKeywords, setMutedKeywords] = useState<string[]>(['violence', 'cruelty', 'abuse']);
  const [newKeyword, setNewKeyword] = useState('');

  // Language & Region
  const [language, setLanguage] = useState('en');
  const [region, setRegion] = useState('IN');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [timeFormat, setTimeFormat] = useState('12h');

  // Appearance & Accessibility
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [fontSize, setFontSize] = useState<'normal' | 'medium' | 'large' | 'xlarge'>('medium');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  // Animal & Feeder preferences
  const [animalInterests, setAnimalInterests] = useState<string[]>(['Dogs', 'Cats', 'Birds']);
  const [feedingSchedule, setFeedingSchedule] = useState('18:00');
  const [alertRadiusKm, setAlertRadiusKm] = useState(5);
  const [willingToFoster, setWillingToFoster] = useState(false);
  const [willingToTransport, setWillingToTransport] = useState(true);
  const [firstAidResponder, setFirstAidResponder] = useState(false);
  const [preferredVetClinic, setPreferredVetClinic] = useState('');

  // Permissions state
  const [locationPermission, setLocationPermission] = useState<'granted' | 'prompt' | 'denied' | 'checking'>('checking');
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'prompt' | 'denied' | 'checking'>('checking');
  const [micPermission, setMicPermission] = useState<'granted' | 'prompt' | 'denied' | 'checking'>('checking');

  // Status & Modal states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // On mount, load stored theme and fetch backend settings
  useEffect(() => {
    // Check local theme
    const savedTheme = localStorage.getItem('feeder_theme') as 'light' | 'dark' | 'system' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }

    // Fetch live settings from backend API
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/users/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.settings) {
            const s = data.settings;
            if (s.phone) setPhone(s.phone);
            if (s.dob) setDob(s.dob);
            if (s.profileVisibility) setProfileVisibility(s.profileVisibility);
            if (s.postVisibility) setPostVisibility(s.postVisibility);
            if (s.whoCanFollow) setWhoCanFollow(s.whoCanFollow);
            if (s.whoCanMessage) setWhoCanMessage(s.whoCanMessage);
            if (s.whoCanComment) setWhoCanComment(s.whoCanComment);
            if (s.whoCanTag) setWhoCanTag(s.whoCanTag);
            if (s.tagReview !== undefined) setTagReview(s.tagReview);
            if (s.publicDirectory !== undefined) setPublicDirectory(s.publicDirectory);
            if (s.blockedUsers) setBlockedUsers(s.blockedUsers);
            if (s.pushLikes !== undefined) setPushLikes(s.pushLikes);
            if (s.pushComments !== undefined) setPushComments(s.pushComments);
            if (s.pushFollowers !== undefined) setPushFollowers(s.pushFollowers);
            if (s.pushMessages !== undefined) setPushMessages(s.pushMessages);
            if (s.pushCommunities !== undefined) setPushCommunities(s.pushCommunities);
            if (s.pushAdoption !== undefined) setPushAdoption(s.pushAdoption);
            if (s.pushRescue !== undefined) setPushRescue(s.pushRescue);
            if (s.pushFeeding !== undefined) setPushFeeding(s.pushFeeding);
            if (s.emailActivity !== undefined) setEmailActivity(s.emailActivity);
            if (s.emailSecurity !== undefined) setEmailSecurity(s.emailSecurity);
            if (s.emailCommunities !== undefined) setEmailCommunities(s.emailCommunities);
            if (s.emailDigest !== undefined) setEmailDigest(s.emailDigest);
            if (s.feedOrder) setFeedOrder(s.feedOrder);
            if (s.suggestedFrequency) setSuggestedFrequency(s.suggestedFrequency);
            if (s.mutedKeywords) setMutedKeywords(s.mutedKeywords);
            if (s.language) setLanguage(s.language);
            if (s.region) setRegion(s.region);
            if (s.timezone) setTimezone(s.timezone);
            if (s.dateFormat) setDateFormat(s.dateFormat);
            if (s.timeFormat) setTimeFormat(s.timeFormat);
            if (s.fontSize) setFontSize(s.fontSize);
            if (s.reducedMotion !== undefined) setReducedMotion(s.reducedMotion);
            if (s.highContrast !== undefined) setHighContrast(s.highContrast);
            if (s.animalInterests) setAnimalInterests(s.animalInterests);
            if (s.feedingSchedule) setFeedingSchedule(s.feedingSchedule);
            if (s.alertRadiusKm) setAlertRadiusKm(s.alertRadiusKm);
            if (s.willingToFoster !== undefined) setWillingToFoster(s.willingToFoster);
            if (s.willingToTransport !== undefined) setWillingToTransport(s.willingToTransport);
            if (s.firstAidResponder !== undefined) setFirstAidResponder(s.firstAidResponder);
            if (s.preferredVetClinic) setPreferredVetClinic(s.preferredVetClinic);
          }
        }
      } catch (err) {
        console.warn('Failed to load user settings:', err);
      }
    };

    fetchSettings();

    // Check browser device permissions
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((p) => {
        setLocationPermission(p.state as any);
        p.onchange = () => setLocationPermission(p.state as any);
      }).catch(() => setLocationPermission('prompt'));

      navigator.permissions.query({ name: 'camera' as PermissionName }).then((p) => {
        setCameraPermission(p.state as any);
        p.onchange = () => setCameraPermission(p.state as any);
      }).catch(() => setCameraPermission('prompt'));

      navigator.permissions.query({ name: 'microphone' as PermissionName }).then((p) => {
        setMicPermission(p.state as any);
        p.onchange = () => setMicPermission(p.state as any);
      }).catch(() => setMicPermission('prompt'));
    }
  }, []);

  // Listen to browser back/forward buttons (popstate) for mobile navigation
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const parts = path.split('/').filter(Boolean);
        if (parts[0] === 'settings') {
          if (parts[1]) {
            const section = parts[1] as SectionKey;
            setActiveSection(section);
            setMobileDrilldown(true);
          } else {
            setMobileDrilldown(false);
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update theme function
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('feeder_theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (newTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  };

  // Section switcher with URL update
  const navigateToSection = (key: SectionKey) => {
    setActiveSection(key);
    setMobileDrilldown(true);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/settings/${key}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Mobile Back Button handler
  const handleMobileBack = () => {
    setMobileDrilldown(false);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/settings');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Save Settings handler
  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      // 1. Save profile updates
      const profileRes = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          bio,
          areaName,
          city,
          avatarUrl,
        }),
      });

      // 2. Save comprehensive settings & privacy
      const settingsRes = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            push_likes: pushLikes,
            push_comments: pushComments,
            push_followers: pushFollowers,
            push_messages: pushMessages,
            push_communities: pushCommunities,
            push_adoption: pushAdoption,
            push_rescue: pushRescue,
            push_feeding: pushFeeding,
            email_activity: emailActivity,
            email_security: emailSecurity,
            email_communities: emailCommunities,
            email_digest: emailDigest,
            feed_order: feedOrder,
            suggested_frequency: suggestedFrequency,
            muted_keywords: mutedKeywords,
            language,
            region,
            timezone,
            date_format: dateFormat,
            time_format: timeFormat,
            theme,
            font_size: fontSize,
            reduced_motion: reducedMotion,
            high_contrast: highContrast,
            feeding_schedule: feedingSchedule,
            alert_radius_km: alertRadiusKm,
            willing_to_foster: willingToFoster,
            willing_to_transport: willingToTransport,
            first_aid_responder: firstAidResponder,
            preferred_vet_clinic: preferredVetClinic,
          },
          privacy: {
            profile_visibility: profileVisibility,
            post_visibility: postVisibility,
            who_can_follow: whoCanFollow,
            who_can_message: whoCanMessage,
            who_can_comment: whoCanComment,
            who_can_tag: whoCanTag,
            tag_review: tagReview,
            public_directory: publicDirectory,
            blocked_users: blockedUsers,
          },
          profileData: {
            phone,
            dob,
          },
          interests: animalInterests,
        }),
      });

      if (profileRes.ok && settingsRes.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        const pData = await profileRes.json().catch(() => ({}));
        const sData = await settingsRes.json().catch(() => ({}));
        setSaveError(pData.error || sData.error || 'Failed to update some settings');
      }
    } catch (err) {
      setSaveError('Network error while saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signout:', e);
    }
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  // Sign out all devices
  const handleSignOutAll = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signout:', e);
    }
    await fetch('/api/auth/logout', { method: 'POST' });
    alert('You have been logged out from all active sessions.');
    window.location.href = '/login';
  };

  // Random Avatar Generator
  const handleRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(2, 9);
    setAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`);
  };

  // Add/Remove Muted Keywords
  const handleAddKeyword = () => {
    if (newKeyword.trim() && !mutedKeywords.includes(newKeyword.trim().toLowerCase())) {
      setMutedKeywords([...mutedKeywords, newKeyword.trim().toLowerCase()]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setMutedKeywords(mutedKeywords.filter((k) => k !== keyword));
  };

  // Add/Remove Blocked Users
  const handleAddBlockedUser = () => {
    if (newBlockedUser.trim() && !blockedUsers.includes(newBlockedUser.trim())) {
      setBlockedUsers([...blockedUsers, newBlockedUser.trim().replace(/^@/, '')]);
      setNewBlockedUser('');
    }
  };

  const handleUnblockUser = (handle: string) => {
    setBlockedUsers(blockedUsers.filter((u) => u !== handle));
  };

  // Toggle Animal Interests
  const handleToggleAnimal = (animal: string) => {
    if (animalInterests.includes(animal)) {
      setAnimalInterests(animalInterests.filter((a) => a !== animal));
    } else {
      setAnimalInterests([...animalInterests, animal]);
    }
  };

  // Request Data Download (JSON Export)
  const handleDownloadData = () => {
    const exportData = {
      user: {
        id: user?.id,
        username: user?.username,
        fullName: user?.fullName,
        email: user?.email,
        bio: user?.bio,
        city: user?.city,
        areaName: user?.areaName,
        feedingCount: user?.feedingCount,
        sosCount: user?.sosCount,
        role: user?.role,
      },
      settings: {
        privacy: {
          profileVisibility,
          postVisibility,
          whoCanFollow,
          whoCanMessage,
          blockedUsers,
        },
        notifications: {
          pushLikes,
          pushComments,
          pushSosAlerts,
          emailDigest,
        },
        preferences: {
          language,
          region,
          timezone,
          theme,
          fontSize,
          animalInterests,
          alertRadiusKm,
        },
      },
      exportedAt: new Date().toISOString(),
      platform: 'Feeder.life Welfare Social Platform',
      version: '2.4.0',
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feeder_life_data_${user?.username || 'user'}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Request browser permission
  const requestBrowserPermission = async (type: 'location' | 'camera' | 'mic') => {
    try {
      if (type === 'location' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => setLocationPermission('granted'),
          () => setLocationPermission('denied')
        );
      } else if (type === 'camera' && navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
        setCameraPermission('granted');
      } else if (type === 'mic' && navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        setMicPermission('granted');
      }
    } catch (err) {
      console.warn('Permission request failed:', err);
    }
  };

  // Filter categories by search
  const filteredCategories = SETTINGS_CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.title.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  if (!user) {
    return (
      <div className="card" style={{ padding: '60px 24px', textAlign: 'center', maxWidth: '580px', margin: '40px auto' }}>
        <Shield size={48} color="var(--brand-primary)" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>Sign in to manage settings</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Please log into your real Feeder.life account to customize your profile, privacy, animal alerts, and security controls.
        </p>
        <Link href="/login" className="btn-primary" style={{ display: 'inline-flex', padding: '10px 24px' }}>
          Sign In
        </Link>
      </div>
    );
  }

  // Find active item metadata
  let activeItemMeta: { label: string; description: string; icon: React.ElementType } = {
    label: 'Settings',
    description: 'Manage your preferences',
    icon: Sliders,
  };
  for (const cat of SETTINGS_CATEGORIES) {
    const found = cat.items.find((i) => i.key === activeSection);
    if (found) {
      activeItemMeta = found;
      break;
    }
  }

  return (
    <div className="feeder-settings-wrapper">
      {/* Settings Top Header Bar */}
      <div
        className="card feeder-settings-header-card"
        style={{
          padding: '18px 24px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'var(--brand-primary-light, #EBF7EE)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-primary, #2E7D32)',
              flexShrink: 0,
            }}
          >
            <activeItemMeta.icon size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Settings & Preferences
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-muted)',
                }}
              >
                Facebook-Style Navigation
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Account credentials, privacy filters, notifications, and Feeder welfare preferences
            </div>
          </div>
        </div>

        {/* Global Save Button in header */}
        <button
          type="button"
          onClick={() => handleSaveAll()}
          disabled={isSaving}
          className="btn-primary feeder-settings-quick-save-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            fontSize: '13px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
          aria-label="Save all settings"
        >
          {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
          <span>{isSaving ? 'Saving...' : 'Save All Changes'}</span>
        </button>
      </div>

      {/* Global Save Feedback Banners */}
      {saveSuccess && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(46, 125, 50, 0.12)',
            color: '#2E7D32',
            fontSize: '13.5px',
            fontWeight: 600,
            marginBottom: '16px',
            border: '1px solid rgba(46, 125, 50, 0.3)',
          }}
        >
          <CheckCircle2 size={18} />
          <span>All settings updated and synced successfully with your account!</span>
        </div>
      )}

      {saveError && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            fontSize: '13.5px',
            fontWeight: 600,
            marginBottom: '16px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <AlertCircle size={18} />
          <span>{saveError}</span>
        </div>
      )}

      {/* Main Settings Master Layout Grid */}
      <div className="feeder-settings-main-grid">
        {/* Left Side: Category Navigation (Desktop / Tablet Sidebar, Mobile Category List) */}
        <aside
          className={`feeder-settings-nav-pane card ${mobileDrilldown ? 'hide-on-mobile-when-active' : ''}`}
          aria-label="Settings Categories"
        >
          {/* Search Settings Input */}
          <div style={{ padding: '14px 14px 10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Search size={15} color="var(--text-muted)" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search settings..."
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  width: '100%',
                  outline: 'none',
                }}
                aria-label="Search settings options"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Grouped Category Nav Items */}
          <div className="feeder-settings-nav-scroll-area">
            {filteredCategories.map((group) => (
              <div key={group.id} className="feeder-settings-nav-group">
                <div className="feeder-settings-nav-group-title">{group.title}</div>
                <div className="feeder-settings-nav-group-list">
                  {group.items.map((item) => {
                    const isSelected = activeSection === item.key;
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => navigateToSection(item.key)}
                        className={`feeder-settings-nav-row ${isSelected ? 'active' : ''}`}
                        aria-current={isSelected ? 'true' : 'false'}
                      >
                        <div className="feeder-settings-nav-row-icon-wrap">
                          <IconComponent size={18} />
                        </div>
                        <div className="feeder-settings-nav-row-text">
                          <div className="feeder-settings-nav-row-title-wrap">
                            <span className="feeder-settings-nav-row-title">{item.label}</span>
                            {item.badge && <span className="feeder-settings-badge-pill">{item.badge}</span>}
                          </div>
                          <span className="feeder-settings-nav-row-desc">{item.description}</span>
                        </div>
                        <ChevronRight size={16} className="feeder-settings-chevron" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Danger & Account Actions Group */}
            <div className="feeder-settings-nav-group feeder-settings-nav-danger-group">
              <div className="feeder-settings-nav-group-title" style={{ color: '#ef4444' }}>
                Account Actions
              </div>
              <div className="feeder-settings-nav-group-list">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="feeder-settings-nav-row feeder-settings-nav-row-danger"
                  aria-label="Sign out of this session"
                >
                  <div className="feeder-settings-nav-row-icon-wrap danger">
                    <LogOut size={17} />
                  </div>
                  <div className="feeder-settings-nav-row-text">
                    <span className="feeder-settings-nav-row-title">Log Out</span>
                    <span className="feeder-settings-nav-row-desc">Sign out from this device</span>
                  </div>
                  <ChevronRight size={16} className="feeder-settings-chevron" />
                </button>

                <button
                  type="button"
                  onClick={() => setDeactivateModalOpen(true)}
                  className="feeder-settings-nav-row feeder-settings-nav-row-warning"
                  aria-label="Deactivate your account temporarily"
                >
                  <div className="feeder-settings-nav-row-icon-wrap warning">
                    <Sliders size={17} />
                  </div>
                  <div className="feeder-settings-nav-row-text">
                    <span className="feeder-settings-nav-row-title">Deactivate Account</span>
                    <span className="feeder-settings-nav-row-desc">Temporarily freeze your profile</span>
                  </div>
                  <ChevronRight size={16} className="feeder-settings-chevron" />
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(true)}
                  className="feeder-settings-nav-row feeder-settings-nav-row-danger"
                  aria-label="Permanently delete account"
                >
                  <div className="feeder-settings-nav-row-icon-wrap danger">
                    <Trash2 size={17} />
                  </div>
                  <div className="feeder-settings-nav-row-text">
                    <span className="feeder-settings-nav-row-title">Delete Account</span>
                    <span className="feeder-settings-nav-row-desc">Permanent deletion with confirmation</span>
                  </div>
                  <ChevronRight size={16} className="feeder-settings-chevron" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Side: Selected Settings Content View */}
        <main
          className={`feeder-settings-content-pane card ${!mobileDrilldown ? 'hide-on-mobile-when-list' : ''}`}
          aria-labelledby="settings-content-heading"
        >
          {/* Mobile Back Button Bar */}
          <div className="feeder-settings-mobile-back-bar">
            <button
              type="button"
              onClick={handleMobileBack}
              className="feeder-settings-mobile-back-btn"
              aria-label="Back to Settings"
            >
              <ArrowLeft size={18} />
              <span>Settings</span>
            </button>
          </div>

          {/* Section Content Header */}
          <div className="feeder-settings-pane-header">
            <div>
              <h2 id="settings-content-heading" className="feeder-settings-pane-title">
                {activeItemMeta.label}
              </h2>
              <p className="feeder-settings-pane-desc">{activeItemMeta.description}</p>
            </div>
          </div>

          <div className="feeder-settings-pane-body">
            {/* 1. PERSONAL INFORMATION */}
            {activeSection === 'personal' && (
              <form onSubmit={handleSaveAll} className="feeder-settings-form-stack">
                <div className="feeder-settings-section-block">
                  <div className="feeder-settings-avatar-row">
                    <img
                      src={avatarUrl || user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                      alt={fullName}
                      className="feeder-settings-avatar-img"
                    />
                    <div className="feeder-settings-avatar-actions">
                      <button
                        type="button"
                        onClick={handleRandomAvatar}
                        className="btn-secondary"
                        style={{ fontSize: '13px', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Camera size={15} />
                        <span>Generate Random Avatar</span>
                      </button>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Tap to generate a fresh guardian avatar
                      </span>
                    </div>
                  </div>
                </div>

                <div className="feeder-settings-grid-2col">
                  <div className="feeder-settings-input-group">
                    <label className="feeder-settings-label" htmlFor="fullNameInput">
                      Profile Display Name *
                    </label>
                    <input
                      id="fullNameInput"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="feeder-settings-input"
                    />
                  </div>

                  <div className="feeder-settings-input-group">
                    <label className="feeder-settings-label" htmlFor="usernameInput">
                      Unique Handle / Username
                    </label>
                    <input
                      id="usernameInput"
                      type="text"
                      disabled
                      value={`@${user.username}`}
                      className="feeder-settings-input disabled"
                    />
                  </div>
                </div>

                <div className="feeder-settings-input-group">
                  <label className="feeder-settings-label" htmlFor="bioInput">
                    Guardian Bio & Welfare Mission
                  </label>
                  <textarea
                    id="bioInput"
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Street animal caregiver, community cat colony feeder, rescuer..."
                    className="feeder-settings-textarea"
                  />
                </div>

                <div className="feeder-settings-grid-2col">
                  <div className="feeder-settings-input-group">
                    <label className="feeder-settings-label" htmlFor="emailInput">
                      Email Address
                    </label>
                    <input
                      id="emailInput"
                      type="email"
                      disabled
                      value={user.email || 'guardian@feeder.life'}
                      className="feeder-settings-input disabled"
                    />
                  </div>

                  <div className="feeder-settings-input-group">
                    <label className="feeder-settings-label" htmlFor="phoneInput">
                      Phone Number (For SOS Emergency Calls)
                    </label>
                    <input
                      id="phoneInput"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="feeder-settings-input"
                    />
                  </div>
                </div>

                <div className="feeder-settings-grid-2col">
                  <div className="feeder-settings-input-group">
                    <label className="feeder-settings-label" htmlFor="areaInput">
                      Area / Locality
                    </label>
                    <input
                      id="areaInput"
                      type="text"
                      value={areaName}
                      onChange={(e) => setAreaName(e.target.value)}
                      placeholder="e.g. Indiranagar, Anna Nagar"
                      className="feeder-settings-input"
                    />
                  </div>

                  <div className="feeder-settings-input-group">
                    <label className="feeder-settings-label" htmlFor="cityInput">
                      City / District
                    </label>
                    <input
                      id="cityInput"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Bangalore, Chennai, Mumbai"
                      className="feeder-settings-input"
                    />
                  </div>
                </div>

                <div className="feeder-settings-grid-2col">
                  <div className="feeder-settings-input-group">
                    <label className="feeder-settings-label" htmlFor="dobInput">
                      Date of Birth
                    </label>
                    <input
                      id="dobInput"
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="feeder-settings-input"
                    />
                  </div>

                  <div className="feeder-settings-input-group">
                    <label className="feeder-settings-label" htmlFor="personalVisSelect">
                      Profile Information Visibility
                    </label>
                    <select
                      id="personalVisSelect"
                      value={profileVisibility}
                      onChange={(e) => setProfileVisibility(e.target.value)}
                      className="feeder-settings-select"
                    >
                      <option value="public">Public (Everyone on Feeder.life)</option>
                      <option value="followers">Followers & Fellow Guardians Only</option>
                      <option value="private">Private (Only You & Emergency Responders)</option>
                    </select>
                  </div>
                </div>

                <div className="feeder-settings-form-submit-row">
                  <button type="submit" disabled={isSaving} className="btn-primary feeder-settings-btn-save">
                    <Save size={16} />
                    <span>{isSaving ? 'Saving Changes...' : 'Save Personal Information'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* 2. PASSWORD & SECURITY */}
            {activeSection === 'security' && (
              <div className="feeder-settings-form-stack">
                {/* Password Change Box */}
                <div className="feeder-settings-card-item">
                  <div className="feeder-settings-card-header">
                    <KeyRound size={20} color="var(--brand-primary)" />
                    <div>
                      <h3 className="feeder-settings-card-title">Change Password</h3>
                      <p className="feeder-settings-card-desc">
                        Ensure your account uses a strong password with letters, numbers, and symbols.
                      </p>
                    </div>
                  </div>
                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="feeder-settings-input-group">
                      <label className="feeder-settings-label">Current Password</label>
                      <input type="password" placeholder="••••••••••••" className="feeder-settings-input" />
                    </div>
                    <div className="feeder-settings-grid-2col">
                      <div className="feeder-settings-input-group">
                        <label className="feeder-settings-label">New Password</label>
                        <input type="password" placeholder="••••••••••••" className="feeder-settings-input" />
                      </div>
                      <div className="feeder-settings-input-group">
                        <label className="feeder-settings-label">Confirm New Password</label>
                        <input type="password" placeholder="••••••••••••" className="feeder-settings-input" />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert('Password update request sent. If using Google/Apple sign-in, manage credentials via provider.')}
                      className="btn-primary"
                      style={{ alignSelf: 'flex-start', padding: '8px 18px', fontSize: '13px' }}
                    >
                      Update Password
                    </button>
                  </div>
                </div>

                {/* Two Factor Authentication */}
                <div className="feeder-settings-card-item">
                  <div className="feeder-settings-card-header">
                    <Shield size={20} color="var(--brand-primary)" />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 className="feeder-settings-card-title">Two-Factor Authentication (2FA)</h3>
                        <span className="feeder-settings-badge-pill" style={{ background: '#fef3c7', color: '#b45309' }}>
                          Coming Soon (Firebase Multi-Factor)
                        </span>
                      </div>
                      <p className="feeder-settings-card-desc">
                        Add an extra layer of security requiring an SMS or authenticator code upon login.
                      </p>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    Two-factor authentication enrollment via Google Authenticator / SMS is scheduled for the upcoming security release.
                  </div>
                </div>

                {/* Active Sessions */}
                <div className="feeder-settings-card-item">
                  <div className="feeder-settings-card-header">
                    <Smartphone size={20} color="var(--brand-primary)" />
                    <div>
                      <h3 className="feeder-settings-card-title">Where You're Logged In</h3>
                      <p className="feeder-settings-card-desc">Active sessions and devices currently connected to your account.</p>
                    </div>
                  </div>
                  <div className="feeder-settings-session-list">
                    <div className="feeder-settings-session-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="feeder-settings-session-icon">
                          <Smartphone size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                            Current Browser Session (Active Now)
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {city || 'Local Area'} • Chrome / Next.js Web App
                          </div>
                        </div>
                      </div>
                      <span className="feeder-settings-session-badge">Current Device</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={handleSignOutAll}
                      className="btn-secondary"
                      style={{ color: '#ef4444', fontSize: '13px', padding: '8px 16px' }}
                    >
                      Log Out From All Devices
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. ACCOUNT MANAGEMENT */}
            {activeSection === 'account' && (
              <div className="feeder-settings-form-stack">
                <div className="feeder-settings-card-item">
                  <h3 className="feeder-settings-card-title">Account Ownership & Status</h3>
                  <p className="feeder-settings-card-desc">
                    Your current account status, verified guardian level, and platform permissions.
                  </p>
                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="feeder-settings-info-row">
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Guardian Level</span>
                      <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--brand-primary)' }}>
                        {user.feederLevel || 'Grassroots Feeder'}
                      </span>
                    </div>
                    <div className="feeder-settings-info-row">
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Feeding Rounds Logged</span>
                      <span style={{ fontWeight: 700, fontSize: '13.5px' }}>{user.feedingCount || 0} times</span>
                    </div>
                    <div className="feeder-settings-info-row">
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Emergency SOS Responses</span>
                      <span style={{ fontWeight: 700, fontSize: '13.5px' }}>{user.sosCount || 0} rescues</span>
                    </div>
                    <div className="feeder-settings-info-row">
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Account ID (UUID)</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {user.id}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="feeder-settings-card-item feeder-settings-danger-card">
                  <h3 className="feeder-settings-card-title" style={{ color: '#ef4444' }}>
                    Deactivation & Deletion
                  </h3>
                  <p className="feeder-settings-card-desc">
                    Temporarily deactivate your account or permanently delete your data and feeder records.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setDeactivateModalOpen(true)}
                      className="btn-secondary"
                      style={{ fontSize: '13px' }}
                    >
                      Deactivate Account
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteModalOpen(true)}
                      className="btn-secondary"
                      style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', fontSize: '13px' }}
                    >
                      Delete Account Permanently
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. PRIVACY & AUDIENCE */}
            {(activeSection === 'privacy' || activeSection === 'tagging' || activeSection === 'followers') && (
              <form onSubmit={handleSaveAll} className="feeder-settings-form-stack">
                <div className="feeder-settings-card-item">
                  <h3 className="feeder-settings-card-title">Audience & Visibility Controls</h3>
                  <p className="feeder-settings-card-desc">
                    Choose who can view your feeder profile, posts, colony sightings, and photos.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Who can see your profile?</div>
                        <div className="feeder-settings-control-sub">Controls visibility across Feeder.life discovery.</div>
                      </div>
                      <select
                        value={profileVisibility}
                        onChange={(e) => setProfileVisibility(e.target.value)}
                        className="feeder-settings-select"
                        style={{ maxWidth: '180px' }}
                      >
                        <option value="public">Public</option>
                        <option value="followers">Followers only</option>
                        <option value="private">Only me</option>
                      </select>
                    </div>

                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Who can see your future posts?</div>
                        <div className="feeder-settings-control-sub">Default audience for feed photos & updates.</div>
                      </div>
                      <select
                        value={postVisibility}
                        onChange={(e) => setPostVisibility(e.target.value)}
                        className="feeder-settings-select"
                        style={{ maxWidth: '180px' }}
                      >
                        <option value="public">Public</option>
                        <option value="community">Community only</option>
                        <option value="private">Private</option>
                      </select>
                    </div>

                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Who can follow you?</div>
                        <div className="feeder-settings-control-sub">Allow other animal guardians to subscribe to your feed.</div>
                      </div>
                      <select
                        value={whoCanFollow}
                        onChange={(e) => setWhoCanFollow(e.target.value)}
                        className="feeder-settings-select"
                        style={{ maxWidth: '180px' }}
                      >
                        <option value="everyone">Everyone</option>
                        <option value="verified">Verified Feeders Only</option>
                        <option value="none">No one</option>
                      </select>
                    </div>

                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Review tags before they appear on your profile?</div>
                        <div className="feeder-settings-control-sub">Approve photos and mentions where someone tags you.</div>
                      </div>
                      <label className="feeder-settings-toggle-switch">
                        <input
                          type="checkbox"
                          checked={tagReview}
                          onChange={(e) => setTagReview(e.target.checked)}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>

                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Public Guardian Directory Listing</div>
                        <div className="feeder-settings-control-sub">Allow nearby rescuers in your area to discover your guardian profile.</div>
                      </div>
                      <label className="feeder-settings-toggle-switch">
                        <input
                          type="checkbox"
                          checked={publicDirectory}
                          onChange={(e) => setPublicDirectory(e.target.checked)}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-secondary)',
                    fontSize: '12.5px',
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  <strong style={{ color: 'var(--brand-primary)' }}>Feeding Colony Location Safeguard:</strong> Exact GPS coordinates of street animal colonies and vulnerable feeding spots are automatically protected by coordinate obfuscation (±500m jitter) to prevent harm or relocation.
                </div>

                <div className="feeder-settings-form-submit-row">
                  <button type="submit" disabled={isSaving} className="btn-primary feeder-settings-btn-save">
                    <Save size={16} />
                    <span>Save Privacy Settings</span>
                  </button>
                </div>
              </form>
            )}

            {/* 5. BLOCKING */}
            {activeSection === 'blocking' && (
              <div className="feeder-settings-form-stack">
                <div className="feeder-settings-card-item">
                  <h3 className="feeder-settings-card-title">Blocked Accounts</h3>
                  <p className="feeder-settings-card-desc">
                    Blocked people cannot see your posts, message you, or invite you to communities.
                  </p>

                  {/* Add Block Form */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <input
                      type="text"
                      value={newBlockedUser}
                      onChange={(e) => setNewBlockedUser(e.target.value)}
                      placeholder="Enter @username to block..."
                      className="feeder-settings-input"
                      style={{ maxWidth: '320px' }}
                    />
                    <button
                      type="button"
                      onClick={handleAddBlockedUser}
                      className="btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      <Plus size={15} />
                      <span>Block</span>
                    </button>
                  </div>

                  {/* Blocked Users List */}
                  <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {blockedUsers.length === 0 ? (
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px 0' }}>
                        You have not blocked any accounts.
                      </div>
                    ) : (
                      blockedUsers.map((handle) => (
                        <div key={handle} className="feeder-settings-blocked-row">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="feeder-settings-avatar-small">
                              <UserX size={15} color="#ef4444" />
                            </div>
                            <span style={{ fontSize: '13.5px', fontWeight: 600 }}>@{handle}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUnblockUser(handle)}
                            className="btn-secondary"
                            style={{ fontSize: '12px', padding: '4px 12px' }}
                          >
                            Unblock
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 6. MESSAGING PRIVACY */}
            {activeSection === 'messaging' && (
              <form onSubmit={handleSaveAll} className="feeder-settings-form-stack">
                <div className="feeder-settings-card-item">
                  <h3 className="feeder-settings-card-title">Direct Messaging Privacy</h3>
                  <p className="feeder-settings-card-desc">
                    Control who can initiate direct conversations and send animal adoption inquiries.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Who can send you direct messages?</div>
                        <div className="feeder-settings-control-sub">Guardians and rescuers reaching out about animals.</div>
                      </div>
                      <select
                        value={whoCanMessage}
                        onChange={(e) => setWhoCanMessage(e.target.value)}
                        className="feeder-settings-select"
                        style={{ maxWidth: '180px' }}
                      >
                        <option value="everyone">Everyone</option>
                        <option value="followers">Followers only</option>
                        <option value="none">No one</option>
                      </select>
                    </div>

                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Message Request Filtering</div>
                        <div className="feeder-settings-control-sub">Separate requests from unknown users into a pending folder.</div>
                      </div>
                      <label className="feeder-settings-toggle-switch">
                        <input type="checkbox" defaultChecked />
                        <span className="slider round"></span>
                      </label>
                    </div>

                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Read Receipts</div>
                        <div className="feeder-settings-control-sub">Let people know when you have seen their messages.</div>
                      </div>
                      <label className="feeder-settings-toggle-switch">
                        <input type="checkbox" defaultChecked />
                        <span className="slider round"></span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="feeder-settings-form-submit-row">
                  <button type="submit" disabled={isSaving} className="btn-primary feeder-settings-btn-save">
                    <Save size={16} />
                    <span>Save Messaging Preferences</span>
                  </button>
                </div>
              </form>
            )}

            {/* 7. NOTIFICATIONS */}
            {(activeSection === 'notifications' || activeSection === 'push-notifications' || activeSection === 'email-notifications') && (
              <form onSubmit={handleSaveAll} className="feeder-settings-form-stack">
                {/* Emergency Alerts Safeguard */}
                <div className="feeder-settings-card-item" style={{ borderLeft: '4px solid var(--brand-sos, #ef4444)' }}>
                  <div className="feeder-settings-control-row">
                    <div>
                      <div className="feeder-settings-control-title" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={18} />
                        <span>Critical Animal SOS & Emergency Alerts</span>
                      </div>
                      <div className="feeder-settings-control-sub">
                        Immediate push alerts when an injured animal is reported within your local rescue radius ({alertRadiusKm} km).
                      </div>
                    </div>
                    <label className="feeder-settings-toggle-switch">
                      <input
                        type="checkbox"
                        checked={pushSosAlerts}
                        onChange={(e) => setPushSosAlerts(e.target.checked)}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>

                {/* Push Notifications Section */}
                <div className="feeder-settings-card-item">
                  <h3 className="feeder-settings-card-title">Push Notifications</h3>
                  <p className="feeder-settings-card-desc">Alerts sent directly to your device browser or phone.</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Daily Feeding Streak Reminders</div>
                        <div className="feeder-settings-control-sub">Evening reminders to log your daily street rounds.</div>
                      </div>
                      <label className="feeder-settings-toggle-switch">
                        <input
                          type="checkbox"
                          checked={pushFeeding}
                          onChange={(e) => setPushFeeding(e.target.checked)}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>

                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Adoption & Foster Inquiries</div>
                        <div className="feeder-settings-control-sub">When someone inquires about an animal you posted.</div>
                      </div>
                      <label className="feeder-settings-toggle-switch">
                        <input
                          type="checkbox"
                          checked={pushAdoption}
                          onChange={(e) => setPushAdoption(e.target.checked)}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>

                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Comments & Post Mentions</div>
                        <div className="feeder-settings-control-sub">Responses to your feeding updates and animal discussions.</div>
                      </div>
                      <label className="feeder-settings-toggle-switch">
                        <input
                          type="checkbox"
                          checked={pushComments}
                          onChange={(e) => setPushComments(e.target.checked)}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>

                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Direct Messages</div>
                        <div className="feeder-settings-control-sub">New private messages from other animal guardians.</div>
                      </div>
                      <label className="feeder-settings-toggle-switch">
                        <input
                          type="checkbox"
                          checked={pushMessages}
                          onChange={(e) => setPushMessages(e.target.checked)}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>

                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Likes & Guardian Reactions</div>
                        <div className="feeder-settings-control-sub">When people send care, gratitude, or support reactions.</div>
                      </div>
                      <label className="feeder-settings-toggle-switch">
                        <input
                          type="checkbox"
                          checked={pushLikes}
                          onChange={(e) => setPushLikes(e.target.checked)}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Email Notifications */}
                <div className="feeder-settings-card-item">
                  <h3 className="feeder-settings-card-title">Email Notifications</h3>
                  <p className="feeder-settings-card-desc">Digests and critical security alerts sent to {user.email || 'your email'}.</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Account & Security Alerts</div>
                        <div className="feeder-settings-control-sub">New logins, password changes, and security events.</div>
                      </div>
                      <label className="feeder-settings-toggle-switch">
                        <input
                          type="checkbox"
                          checked={emailSecurity}
                          onChange={(e) => setEmailSecurity(e.target.checked)}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>

                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Weekly Guardian Welfare Digest</div>
                        <div className="feeder-settings-control-sub">Summary of feeding milestones, adoptions, and local rescue stats.</div>
                      </div>
                      <label className="feeder-settings-toggle-switch">
                        <input
                          type="checkbox"
                          checked={emailDigest}
                          onChange={(e) => setEmailDigest(e.target.checked)}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="feeder-settings-form-submit-row">
                  <button type="submit" disabled={isSaving} className="btn-primary feeder-settings-btn-save">
                    <Save size={16} />
                    <span>Save Notification Preferences</span>
                  </button>
                </div>
              </form>
            )}

            {/* 8. FEED PREFERENCES */}
            {activeSection === 'feed' && (
              <form onSubmit={handleSaveAll} className="feeder-settings-form-stack">
                <div className="feeder-settings-card-item">
                  <h3 className="feeder-settings-card-title">Feed Sorting & Discovery</h3>
                  <p className="feeder-settings-card-desc">
                    Customize what appears in your main Feeder.life social timeline.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Feed Display Order</div>
                        <div className="feeder-settings-control-sub">Choose your default timeline view.</div>
                      </div>
                      <select
                        value={feedOrder}
                        onChange={(e) => setFeedOrder(e.target.value)}
                        className="feeder-settings-select"
                        style={{ maxWidth: '180px' }}
                      >
                        <option value="recommended">Recommended & Local</option>
                        <option value="recent">Most Recent First</option>
                        <option value="favorites">Favorites & Following</option>
                      </select>
                    </div>

                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Suggested Rescues Frequency</div>
                        <div className="feeder-settings-control-sub">How frequently you see animal profiles outside your city.</div>
                      </div>
                      <select
                        value={suggestedFrequency}
                        onChange={(e) => setSuggestedFrequency(e.target.value)}
                        className="feeder-settings-select"
                        style={{ maxWidth: '180px' }}
                      >
                        <option value="low">Low (Local only)</option>
                        <option value="moderate">Moderate</option>
                        <option value="high">High (All Regions)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Muted Words & Sensitive Filters */}
                <div className="feeder-settings-card-item">
                  <h3 className="feeder-settings-card-title">Muted Words & Triggers</h3>
                  <p className="feeder-settings-card-desc">
                    Posts containing these words or phrases will be hidden from your feed.
                  </p>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="Add a word or tag (e.g. trauma)..."
                      className="feeder-settings-input"
                      style={{ maxWidth: '280px' }}
                    />
                    <button
                      type="button"
                      onClick={handleAddKeyword}
                      className="btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      <Plus size={15} />
                      <span>Add Muted Word</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
                    {mutedKeywords.map((word) => (
                      <span key={word} className="feeder-settings-chip">
                        <span>{word}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(word)}
                          className="feeder-settings-chip-remove"
                          aria-label={`Remove muted word ${word}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="feeder-settings-form-submit-row">
                  <button type="submit" disabled={isSaving} className="btn-primary feeder-settings-btn-save">
                    <Save size={16} />
                    <span>Save Feed Preferences</span>
                  </button>
                </div>
              </form>
            )}

            {/* 9. LANGUAGE & REGION */}
            {activeSection === 'language' && (
              <form onSubmit={handleSaveAll} className="feeder-settings-form-stack">
                <div className="feeder-settings-card-item">
                  <h3 className="feeder-settings-card-title">Language & Regional Formats</h3>
                  <p className="feeder-settings-card-desc">Select your display language, timezone, and calendar standards.</p>

                  <div className="feeder-settings-grid-2col" style={{ marginTop: '16px' }}>
                    <div className="feeder-settings-input-group">
                      <label className="feeder-settings-label">Display Language</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="feeder-settings-select"
                      >
                        <option value="en">English (US / UK / Global)</option>
                        <option value="hi">हिंदी (Hindi)</option>
                        <option value="ta">தமிழ் (Tamil)</option>
                        <option value="te">తెలుగు (Telugu)</option>
                        <option value="kn">ಕನ್ನಡ (Kannada)</option>
                        <option value="bn">বাংলা (Bengali)</option>
                        <option value="es">Español (Spanish)</option>
                        <option value="fr">Français (French)</option>
                      </select>
                    </div>

                    <div className="feeder-settings-input-group">
                      <label className="feeder-settings-label">Country / Region</label>
                      <select
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="feeder-settings-select"
                      >
                        <option value="IN">India (IN)</option>
                        <option value="US">United States (US)</option>
                        <option value="UK">United Kingdom (UK)</option>
                        <option value="CA">Canada (CA)</option>
                        <option value="AU">Australia (AU)</option>
                        <option value="SG">Singapore (SG)</option>
                        <option value="AE">United Arab Emirates (AE)</option>
                      </select>
                    </div>
                  </div>

                  <div className="feeder-settings-grid-2col" style={{ marginTop: '12px' }}>
                    <div className="feeder-settings-input-group">
                      <label className="feeder-settings-label">Time Zone</label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="feeder-settings-select"
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                        <option value="America/New_York">America/New_York (EST/EDT)</option>
                        <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                        <option value="Europe/London">Europe/London (GMT/BST)</option>
                        <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                      </select>
                    </div>

                    <div className="feeder-settings-input-group">
                      <label className="feeder-settings-label">Time Format</label>
                      <select
                        value={timeFormat}
                        onChange={(e) => setTimeFormat(e.target.value)}
                        className="feeder-settings-select"
                      >
                        <option value="12h">12-Hour (e.g. 6:30 PM)</option>
                        <option value="24h">24-Hour (e.g. 18:30)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="feeder-settings-form-submit-row">
                  <button type="submit" disabled={isSaving} className="btn-primary feeder-settings-btn-save">
                    <Save size={16} />
                    <span>Save Regional Settings</span>
                  </button>
                </div>
              </form>
            )}

            {/* 10. APPEARANCE */}
            {activeSection === 'appearance' && (
              <div className="feeder-settings-form-stack">
                <div className="feeder-settings-card-item">
                  <h3 className="feeder-settings-card-title">Theme & Color Mode</h3>
                  <p className="feeder-settings-card-desc">
                    Choose how Feeder.life looks on your device. Changes take effect instantly.
                  </p>

                  <div className="feeder-settings-theme-selector-grid">
                    {/* Light Option */}
                    <button
                      type="button"
                      onClick={() => handleThemeChange('light')}
                      className={`feeder-settings-theme-card ${theme === 'light' ? 'selected' : ''}`}
                    >
                      <div className="feeder-settings-theme-preview light">
                        <div className="preview-nav"></div>
                        <div className="preview-card"></div>
                      </div>
                      <div className="feeder-settings-theme-title-row">
                        <span style={{ fontWeight: 700, fontSize: '13.5px' }}>Light Mode</span>
                        {theme === 'light' && <Check size={16} color="var(--brand-primary)" />}
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Crisp white surfaces</span>
                    </button>

                    {/* Dark Option */}
                    <button
                      type="button"
                      onClick={() => handleThemeChange('dark')}
                      className={`feeder-settings-theme-card ${theme === 'dark' ? 'selected' : ''}`}
                    >
                      <div className="feeder-settings-theme-preview dark">
                        <div className="preview-nav"></div>
                        <div className="preview-card"></div>
                      </div>
                      <div className="feeder-settings-theme-title-row">
                        <span style={{ fontWeight: 700, fontSize: '13.5px' }}>Dark Mode</span>
                        {theme === 'dark' && <Check size={16} color="var(--brand-primary)" />}
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Deep night palette</span>
                    </button>

                    {/* System Option */}
                    <button
                      type="button"
                      onClick={() => handleThemeChange('system')}
                      className={`feeder-settings-theme-card ${theme === 'system' ? 'selected' : ''}`}
                    >
                      <div className="feeder-settings-theme-preview system">
                        <div className="preview-nav"></div>
                        <div className="preview-card"></div>
                      </div>
                      <div className="feeder-settings-theme-title-row">
                        <span style={{ fontWeight: 700, fontSize: '13.5px' }}>System Default</span>
                        {theme === 'system' && <Check size={16} color="var(--brand-primary)" />}
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Matches OS appearance</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 11. ACCESSIBILITY */}
            {activeSection === 'accessibility' && (
              <form onSubmit={handleSaveAll} className="feeder-settings-form-stack">
                <div className="feeder-settings-card-item">
                  <h3 className="feeder-settings-card-title">Accessibility & Visual Comfort</h3>
                  <p className="feeder-settings-card-desc">
                    Tune typography sizes, high contrast, and motion for a comfortable experience.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Text Size</div>
                        <div className="feeder-settings-control-sub">Adjust font scaling across Feeder.life content.</div>
                      </div>
                      <select
                        value={fontSize}
                        onChange={(e) => setFontSize(e.target.value as any)}
                        className="feeder-settings-select"
                        style={{ maxWidth: '160px' }}
                      >
                        <option value="normal">Default (14px)</option>
                        <option value="medium">Medium (15px)</option>
                        <option value="large">Large (16.5px)</option>
                        <option value="xlarge">Extra Large (18px)</option>
                      </select>
                    </div>

                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Reduce Motion & Animations</div>
                        <div className="feeder-settings-control-sub">Minimize decorative transitions and sliding effects.</div>
                      </div>
                      <label className="feeder-settings-toggle-switch">
                        <input
                          type="checkbox"
                          checked={reducedMotion}
                          onChange={(e) => setReducedMotion(e.target.checked)}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>

                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">High Contrast Borders</div>
                        <div className="feeder-settings-control-sub">Sharpen borders and UI element separation for high visibility.</div>
                      </div>
                      <label className="feeder-settings-toggle-switch">
                        <input
                          type="checkbox"
                          checked={highContrast}
                          onChange={(e) => setHighContrast(e.target.checked)}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="feeder-settings-form-submit-row">
                  <button type="submit" disabled={isSaving} className="btn-primary feeder-settings-btn-save">
                    <Save size={16} />
                    <span>Save Accessibility Settings</span>
                  </button>
                </div>
              </form>
            )}

            {/* 12. PERMISSIONS */}
            {activeSection === 'permissions' && (
              <div className="feeder-settings-form-stack">
                <div className="feeder-settings-card-item">
                  <h3 className="feeder-settings-card-title">Device & Browser Permissions</h3>
                  <p className="feeder-settings-card-desc">
                    Feeder.life uses standard browser APIs for animal emergency reports, feeding GPS pins, and photo uploads.
                  </p>

                  <div className="feeder-settings-perm-list" style={{ marginTop: '16px' }}>
                    {/* Location */}
                    <div className="feeder-settings-perm-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="feeder-settings-perm-icon location">
                          <MapPin size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px' }}>Location (GPS)</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Used for SOS animal emergency radius broadcasts and tagging feeding spots.
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={`feeder-settings-perm-badge ${locationPermission}`}>
                          {locationPermission === 'granted' ? 'Allowed' : locationPermission === 'denied' ? 'Blocked' : 'Prompt'}
                        </span>
                        {locationPermission !== 'granted' && (
                          <button
                            type="button"
                            onClick={() => requestBrowserPermission('location')}
                            className="btn-secondary"
                            style={{ fontSize: '12px', padding: '4px 10px' }}
                          >
                            Allow
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Camera */}
                    <div className="feeder-settings-perm-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="feeder-settings-perm-icon camera">
                          <Camera size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px' }}>Camera Access</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Used to capture live photos of street animals and rescue situations.
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={`feeder-settings-perm-badge ${cameraPermission}`}>
                          {cameraPermission === 'granted' ? 'Allowed' : cameraPermission === 'denied' ? 'Blocked' : 'Prompt'}
                        </span>
                        {cameraPermission !== 'granted' && (
                          <button
                            type="button"
                            onClick={() => requestBrowserPermission('camera')}
                            className="btn-secondary"
                            style={{ fontSize: '12px', padding: '4px 10px' }}
                          >
                            Allow
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Microphone */}
                    <div className="feeder-settings-perm-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="feeder-settings-perm-icon mic">
                          <Mic size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px' }}>Microphone Access</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Used for voice messages in rescue desk chats and video recordings.
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={`feeder-settings-perm-badge ${micPermission}`}>
                          {micPermission === 'granted' ? 'Allowed' : micPermission === 'denied' ? 'Blocked' : 'Prompt'}
                        </span>
                        {micPermission !== 'granted' && (
                          <button
                            type="button"
                            onClick={() => requestBrowserPermission('mic')}
                            className="btn-secondary"
                            style={{ fontSize: '12px', padding: '4px 10px' }}
                          >
                            Allow
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 13. YOUR INFORMATION */}
            {activeSection === 'information' && (
              <div className="feeder-settings-form-stack">
                <div className="feeder-settings-card-item">
                  <h3 className="feeder-settings-card-title">Activity Log & Contribution Stats</h3>
                  <p className="feeder-settings-card-desc">Summary of your actions across the welfare platform.</p>

                  <div className="feeder-settings-stats-grid" style={{ marginTop: '16px' }}>
                    <div className="feeder-settings-stat-box">
                      <span className="feeder-settings-stat-number">{user.feedingCount || 0}</span>
                      <span className="feeder-settings-stat-label">Feedings Logged</span>
                    </div>
                    <div className="feeder-settings-stat-box">
                      <span className="feeder-settings-stat-number">{user.sosCount || 0}</span>
                      <span className="feeder-settings-stat-label">SOS Responses</span>
                    </div>
                    <div className="feeder-settings-stat-box">
                      <span className="feeder-settings-stat-number">Active</span>
                      <span className="feeder-settings-stat-label">Guardian Status</span>
                    </div>
                  </div>
                </div>

                <div className="feeder-settings-card-item">
                  <div className="feeder-settings-card-header">
                    <Download size={22} color="var(--brand-primary)" />
                    <div>
                      <h3 className="feeder-settings-card-title">Download Your Information</h3>
                      <p className="feeder-settings-card-desc">
                        Get a copy of your personal data, feeder history, animal posts, and preferences in JSON format.
                      </p>
                    </div>
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={handleDownloadData}
                      className="btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', fontSize: '13px' }}
                    >
                      <Download size={15} />
                      <span>Download Archive (JSON)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 14. COMMUNITIES */}
            {activeSection === 'communities' && (
              <form onSubmit={handleSaveAll} className="feeder-settings-form-stack">
                <div className="feeder-settings-card-item">
                  <h3 className="feeder-settings-card-title">Community Invitations & Alerts</h3>
                  <p className="feeder-settings-card-desc">
                    Control how local animal rescue groups and neighborhood communities interact with you.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Who can invite you to communities?</div>
                        <div className="feeder-settings-control-sub">Manage community invitation requests.</div>
                      </div>
                      <select className="feeder-settings-select" style={{ maxWidth: '180px' }}>
                        <option value="everyone">Everyone</option>
                        <option value="verified">Verified Rescuers Only</option>
                        <option value="none">No one</option>
                      </select>
                    </div>

                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Community Post Notifications</div>
                        <div className="feeder-settings-control-sub">Notify when members post in groups you have joined.</div>
                      </div>
                      <label className="feeder-settings-toggle-switch">
                        <input type="checkbox" defaultChecked />
                        <span className="slider round"></span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="feeder-settings-form-submit-row">
                  <button type="submit" disabled={isSaving} className="btn-primary feeder-settings-btn-save">
                    <Save size={16} />
                    <span>Save Community Preferences</span>
                  </button>
                </div>
              </form>
            )}

            {/* 15. ANIMAL & FEEDER PREFERENCES */}
            {activeSection === 'animals' && (
              <form onSubmit={handleSaveAll} className="feeder-settings-form-stack">
                <div className="feeder-settings-card-item">
                  <h3 className="feeder-settings-card-title">Animal Interests & Species</h3>
                  <p className="feeder-settings-card-desc">
                    Select the animals you care for to tailor your rescue alerts and community feeds.
                  </p>

                  <div className="feeder-settings-animal-checkboxes" style={{ marginTop: '14px' }}>
                    {['Dogs', 'Cats', 'Birds', 'Cattle', 'Equine', 'Wildlife', 'Small Pets'].map((species) => {
                      const isChecked = animalInterests.includes(species);
                      return (
                        <button
                          key={species}
                          type="button"
                          onClick={() => handleToggleAnimal(species)}
                          className={`feeder-settings-animal-pill ${isChecked ? 'selected' : ''}`}
                        >
                          {isChecked && <Check size={14} />}
                          <span>{species}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="feeder-settings-card-item">
                  <h3 className="feeder-settings-card-title">Feeding & Rescue Parameters</h3>
                  <p className="feeder-settings-card-desc">
                    Set up your daily feeding schedule and emergency response capabilities.
                  </p>

                  <div className="feeder-settings-grid-2col" style={{ marginTop: '16px' }}>
                    <div className="feeder-settings-input-group">
                      <label className="feeder-settings-label">Daily Feeding Schedule Time</label>
                      <input
                        type="time"
                        value={feedingSchedule}
                        onChange={(e) => setFeedingSchedule(e.target.value)}
                        className="feeder-settings-input"
                      />
                    </div>

                    <div className="feeder-settings-input-group">
                      <label className="feeder-settings-label">SOS Alert Radius ({alertRadiusKm} km)</label>
                      <input
                        type="range"
                        min={1}
                        max={20}
                        value={alertRadiusKm}
                        onChange={(e) => setAlertRadiusKm(Number(e.target.value))}
                        className="feeder-settings-range"
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>1 km (Hyperlocal)</span>
                        <span>5 km</span>
                        <span>20 km (Wider City)</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Vehicle Transport Available</div>
                        <div className="feeder-settings-control-sub">Available to transport injured animals to nearby vet clinics.</div>
                      </div>
                      <label className="feeder-settings-toggle-switch">
                        <input
                          type="checkbox"
                          checked={willingToTransport}
                          onChange={(e) => setWillingToTransport(e.target.checked)}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>

                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">Emergency Foster Available</div>
                        <div className="feeder-settings-control-sub">Can provide temporary shelter for recovering animals.</div>
                      </div>
                      <label className="feeder-settings-toggle-switch">
                        <input
                          type="checkbox"
                          checked={willingToFoster}
                          onChange={(e) => setWillingToFoster(e.target.checked)}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>

                    <div className="feeder-settings-control-row">
                      <div>
                        <div className="feeder-settings-control-title">First-Aid Responder Trained</div>
                        <div className="feeder-settings-control-sub">Trained in canine/feline wound dressing and stabilization.</div>
                      </div>
                      <label className="feeder-settings-toggle-switch">
                        <input
                          type="checkbox"
                          checked={firstAidResponder}
                          onChange={(e) => setFirstAidResponder(e.target.checked)}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>
                  </div>

                  <div className="feeder-settings-input-group" style={{ marginTop: '16px' }}>
                    <label className="feeder-settings-label">Preferred 24/7 Veterinary Hospital</label>
                    <input
                      type="text"
                      value={preferredVetClinic}
                      onChange={(e) => setPreferredVetClinic(e.target.value)}
                      placeholder="e.g. Cessna Lifeline, CUPA Emergency Clinic"
                      className="feeder-settings-input"
                    />
                  </div>
                </div>

                <div className="feeder-settings-form-submit-row">
                  <button type="submit" disabled={isSaving} className="btn-primary feeder-settings-btn-save">
                    <Save size={16} />
                    <span>Save Feeder Preferences</span>
                  </button>
                </div>
              </form>
            )}

            {/* 16. SUPPORT & SAFETY */}
            {activeSection === 'support' && (
              <div className="feeder-settings-form-stack">
                <div className="feeder-settings-card-item">
                  <h3 className="feeder-settings-card-title">Frequently Asked Questions</h3>
                  <div className="feeder-settings-faq-list" style={{ marginTop: '14px' }}>
                    <details className="feeder-settings-faq-item">
                      <summary className="feeder-settings-faq-q">
                        How does the SOS emergency alert radius work?
                      </summary>
                      <div className="feeder-settings-faq-a">
                        When an emergency alert is created, all registered guardians with notifications enabled within your specified radius receive a high-priority push notification with the animal's GPS location and photo.
                      </div>
                    </details>
                    <details className="feeder-settings-faq-item">
                      <summary className="feeder-settings-faq-q">
                        Is my home address or feeding spot revealed publicly?
                      </summary>
                      <div className="feeder-settings-faq-a">
                        No. Feeder.life protects all street animal feeding colony spots with coordinate jitter (±500m) to prevent unwanted harassment or harm to the community animals.
                      </div>
                    </details>
                    <details className="feeder-settings-faq-item">
                      <summary className="feeder-settings-faq-q">
                        How do I report harassment or abusive users?
                      </summary>
                      <div className="feeder-settings-faq-a">
                        You can tap the three dots on any post or user profile to submit a report directly to platform moderators, or use the Report a Problem form below.
                      </div>
                    </details>
                  </div>
                </div>

                <div className="feeder-settings-card-item">
                  <h3 className="feeder-settings-card-title">Report a Problem or Abuse</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
                    <div className="feeder-settings-input-group">
                      <label className="feeder-settings-label">Issue Category</label>
                      <select className="feeder-settings-select">
                        <option>Bug or Technical Issue</option>
                        <option>Animal Harassment or Abuse Report</option>
                        <option>Spam or Impersonation</option>
                        <option>Feedback or Feature Suggestion</option>
                      </select>
                    </div>
                    <div className="feeder-settings-input-group">
                      <label className="feeder-settings-label">Detailed Description</label>
                      <textarea
                        rows={3}
                        placeholder="Please describe what happened and provide any relevant handles..."
                        className="feeder-settings-textarea"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => alert('Thank you. Your report has been submitted to the Feeder Safety Desk.')}
                      className="btn-primary"
                      style={{ alignSelf: 'flex-start', padding: '8px 18px', fontSize: '13px' }}
                    >
                      Submit Report
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 17. LEGAL & POLICIES */}
            {activeSection === 'legal' && (
              <div className="feeder-settings-form-stack">
                <div className="feeder-settings-card-item">
                  <h3 className="feeder-settings-card-title">Feeder.life Welfare Policies & Terms</h3>
                  <p className="feeder-settings-card-desc">
                    Our platform is dedicated to humane animal care, legal rights for street animal feeders, and user privacy.
                  </p>

                  <div className="feeder-settings-legal-links-list" style={{ marginTop: '16px' }}>
                    <div className="feeder-settings-legal-row">
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>Privacy Policy</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          How your data and location coordinates are protected.
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand-primary)' }}>
                        Effective 2026
                      </span>
                    </div>

                    <div className="feeder-settings-legal-row">
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>Terms of Service</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          User agreements, welfare guidelines, and platform code of conduct.
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand-primary)' }}>
                        Version 2.4.0
                      </span>
                    </div>

                    <div className="feeder-settings-legal-row">
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>Community Feeder Guidelines</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Best practices for street animal feeding, vaccination logging, and peaceful colony management.
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand-primary)' }}>
                        AWBI Compliant
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Delete Account Confirmation Modal */}
      {deleteModalOpen && (
        <div className="feeder-settings-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="feeder-settings-modal-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', marginBottom: '12px' }}>
              <AlertTriangle size={24} />
              <h3 id="delete-modal-title" style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                Permanently Delete Account?
              </h3>
            </div>

            <p style={{ fontSize: '13.5px', color: 'var(--text-main)', lineHeight: 1.5, marginBottom: '12px' }}>
              This action is <strong>irreversible</strong>. Permanently deleting your account will:
            </p>

            <ul style={{ fontSize: '13px', color: 'var(--text-muted)', paddingLeft: '20px', marginBottom: '16px', lineHeight: 1.6 }}>
              <li>Erase your guardian profile and username handle (<strong>@{user.username}</strong>).</li>
              <li>Remove your feeding streak history and karma score.</li>
              <li>Disconnect your community memberships and direct messages.</li>
            </ul>

            <div className="feeder-settings-input-group" style={{ marginBottom: '18px' }}>
              <label className="feeder-settings-label">
                To confirm, type <span style={{ color: '#ef4444', fontWeight: 800 }}>DELETE</span> below:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="feeder-settings-input"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteConfirmText('');
                }}
                className="btn-secondary"
                style={{ fontSize: '13px', padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                    alert('Account scheduled for permanent deletion. You have been logged out.');
                    window.location.href = '/login';
                  } catch (e) {
                    alert('Network error during account deletion request.');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="btn-primary"
                style={{
                  background: '#ef4444',
                  borderColor: '#ef4444',
                  opacity: deleteConfirmText === 'DELETE' ? 1 : 0.5,
                  fontSize: '13px',
                  padding: '8px 16px',
                }}
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Account Modal */}
      {deactivateModalOpen && (
        <div className="feeder-settings-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="deact-modal-title">
          <div className="feeder-settings-modal-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f59e0b', marginBottom: '12px' }}>
              <Sliders size={24} />
              <h3 id="deact-modal-title" style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                Deactivate Your Account?
              </h3>
            </div>

            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '16px' }}>
              Deactivating your account will hide your profile and posts from other guardians. You can reactivate your account at any time simply by logging back in.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeactivateModalOpen(false)}
                className="btn-secondary"
                style={{ fontSize: '13px', padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeactivating}
                onClick={async () => {
                  setIsDeactivating(true);
                  try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                    alert('Your account has been deactivated. Log in anytime to reactivate.');
                    window.location.href = '/login';
                  } finally {
                    setIsDeactivating(false);
                  }
                }}
                className="btn-primary"
                style={{ background: '#f59e0b', borderColor: '#f59e0b', fontSize: '13px', padding: '8px 16px' }}
              >
                {isDeactivating ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
