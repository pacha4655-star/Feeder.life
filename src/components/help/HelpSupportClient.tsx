'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  HelpCircle,
  Search,
  BookOpen,
  FileQuestion,
  AlertTriangle,
  ShieldAlert,
  Inbox,
  KeyRound,
  Shield,
  LifeBuoy,
  FileText,
  Mail,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Camera,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  User,
  Users2,
  Utensils,
  Bell,
  MessageSquare,
  Lock,
  Compass,
  Heart,
  Smartphone,
  Info,
  Check,
  X,
  RefreshCw,
  Eye,
  Trash2,
} from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';

interface HelpSupportClientProps {
  user: UserSession | null;
  initialSection?: string;
  requestId?: string;
}

export type HelpSectionKey =
  | 'overview'
  | 'center'
  | 'report-problem'
  | 'report-abuse'
  | 'requests'
  | 'account-recovery'
  | 'safety'
  | 'faq'
  | 'community-guidelines'
  | 'contact';

interface FAQItem {
  q: string;
  a: string;
  category: string;
}

const FAQ_DATA: FAQItem[] = [
  // Account
  { category: 'Account', q: 'How do I create a Feeder.life guardian account?', a: 'You can sign up directly using your Google account or email on the /signup page. Once verified, complete your onboarding to choose your local feeding colony and district.' },
  { category: 'Account', q: 'How do I change my account password?', a: 'Go to Settings > Password & Security to update your credentials, or visit the /reset-password page if you are logged out.' },
  { category: 'Account', q: 'How do I edit my public profile name and bio?', a: 'Navigate to Settings > Personal Information or visit your Profile page and click Edit Profile to update your display name, bio, and area.' },
  
  // Feed
  { category: 'Feed', q: 'How do I create a daily feeding update or photo post?', a: 'Click the "+" button in the top navigation or use the "Log Feeding" button to attach animal photos, select species, and share your colony progress.' },
  { category: 'Feed', q: 'How do I delete or edit a post I published?', a: 'Tap the three-dots menu icon (...) on the top right of your post card and select "Delete Post".' },
  { category: 'Feed', q: 'How do I report an offensive or harmful post?', a: 'Tap the three-dots menu on any post and select "Report Post" or submit a ticket through Help > Report Abuse & Safety.' },

  // Community
  { category: 'Communities', q: 'How do I join a neighborhood animal welfare community?', a: 'Visit the Communities page from the sidebar to browse local city packs, cat rescuer groups, and foster networks. Click "Join Community" on any open group.' },
  { category: 'Communities', q: 'How do I start a new community pack?', a: 'Click the "+" button in the top navigation and select "Start Community" to create a dedicated group for your locality or apartment complex.' },

  // Messaging
  { category: 'Messaging', q: 'How do I send a direct message to another guardian?', a: 'Visit their user profile and tap the "Message" button, or open your Messages inbox from the top navigation bar.' },
  { category: 'Messaging', q: 'How do I block someone who is harassing me?', a: 'Go to Settings > Privacy > Blocking or tap the three dots on the user\'s profile and select "Block User". Blocked users cannot see your feed or send messages.' },

  // Animal & Rescue
  { category: 'Animal & Rescue', q: 'How does adoption and fostering work on Feeder.life?', a: 'Guardians can list rescued or community puppies/kittens with medical records and photos. Interested adopters can send direct adoption inquiries.' },
  { category: 'Animal & Rescue', q: 'How do I report animal cruelty or illegal relocation?', a: 'Submit an immediate high-priority report via Help > Report Abuse & Safety > Animal Abuse, and alert your local Animal Welfare Board representative.' },

  // SOS & Emergency
  { category: 'SOS & Emergency', q: 'How does the Feeder.life SOS system work?', a: 'When an emergency SOS alert is published, all registered guardians within your chosen alert radius (1–20 km) receive instant push notifications with GPS location and photos.' },
  { category: 'SOS & Emergency', q: 'Is Feeder.life an official government ambulance service?', a: 'No. Feeder.life is a grassroots peer-to-peer animal welfare network connecting volunteers, private rescuers, and verified veterinary clinics.' },
];

const HELP_CATEGORIES = [
  { id: 'getting-started', title: 'Getting Started', desc: 'Welcome guide, verified badges, and setup', icon: LifeBuoy },
  { id: 'account-profile', title: 'Account & Profile', desc: 'Manage credentials, handles, and avatars', icon: User },
  { id: 'feed-posts', title: 'Feed & Posts', desc: 'Sharing updates, photos, and reactions', icon: Compass },
  { id: 'communities', title: 'Communities', desc: 'Local packs, neighborhood groups, and rules', icon: Users2 },
  { id: 'messaging', title: 'Messaging', desc: 'Direct chats, privacy filters, and inquiries', icon: MessageSquare },
  { id: 'notifications', title: 'Notifications', desc: 'Alert settings, streak reminders, and emails', icon: Bell },
  { id: 'adoption', title: 'Adoption', desc: 'Listing rescues and adoption inquiries', icon: Heart },
  { id: 'rescue', title: 'Rescue & First-Aid', desc: 'Emergency response and foster coordination', icon: AlertTriangle },
  { id: 'feeding', title: 'Feeding & Colonies', desc: 'Colony tracking, daily logs, and karma', icon: Utensils },
  { id: 'sos-safety', title: 'SOS & Safety', desc: 'Radius broadcasts and emergency contacts', icon: ShieldAlert },
  { id: 'privacy-security', title: 'Privacy & Security', desc: 'Location obfuscation and data controls', icon: Lock },
];

const POPULAR_TOPICS = [
  { id: 'create-account', title: 'Create and manage your account', category: 'Account', link: '/help/faq' },
  { id: 'edit-profile', title: 'Edit your profile details', category: 'Account', link: '/settings/personal' },
  { id: 'create-post', title: 'Create a feeding or rescue post', category: 'Feed', link: '/help/faq' },
  { id: 'report-post', title: 'Report harmful or spam content', category: 'Safety', link: '/help/report-abuse' },
  { id: 'block-user', title: 'Block or restrict an account', category: 'Privacy', link: '/settings/blocking' },
  { id: 'join-community', title: 'Join a local welfare community', category: 'Communities', link: '/communities' },
  { id: 'manage-notifs', title: 'Manage push & email notifications', category: 'Notifications', link: '/settings/notifications' },
  { id: 'change-password', title: 'Change password or recover login', category: 'Security', link: '/help/account-recovery' },
  { id: 'sos-features', title: 'SOS and emergency rescue alerts', category: 'Safety', link: '/help/safety' },
];

export default function HelpSupportClient({ user, initialSection, requestId }: HelpSupportClientProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<HelpSectionKey>(
    (initialSection as HelpSectionKey) || 'overview'
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // FAQ state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [faqCategoryFilter, setFaqCategoryFilter] = useState('All');

  // Report a Problem form state
  const [problemCategory, setProblemCategory] = useState('Login Problem');
  const [problemDesc, setProblemDesc] = useState('');
  const [problemScreenshot, setProblemScreenshot] = useState('');
  const [isSubmittingProblem, setIsSubmittingProblem] = useState(false);
  const [problemSuccess, setProblemSuccess] = useState<string | null>(null);
  const [problemError, setProblemError] = useState<string | null>(null);

  // Report Abuse form state
  const [abuseType, setAbuseType] = useState('Animal Abuse');
  const [abuseTarget, setAbuseTarget] = useState('');
  const [abuseDesc, setAbuseDesc] = useState('');
  const [isSubmittingAbuse, setIsSubmittingAbuse] = useState(false);
  const [abuseSuccess, setAbuseSuccess] = useState<string | null>(null);
  const [abuseError, setAbuseError] = useState<string | null>(null);

  // My Requests state
  const [requestsList, setRequestsList] = useState<any[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  // Auto-detect device info
  const [deviceInfo, setDeviceInfo] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent;
      const screenInfo = `${window.innerWidth}x${window.innerHeight}`;
      setDeviceInfo(`Browser: ${ua.slice(0, 80)}... | Viewport: ${screenInfo}`);
    }
  }, []);

  // Fetch support requests
  const fetchMyRequests = async () => {
    if (!user) return;
    setIsLoadingRequests(true);
    try {
      const res = await fetch('/api/help/requests');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.requests)) {
          setRequestsList(data.requests);
        }
      }
    } catch (err) {
      console.warn('Failed to load support requests:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'requests' && user) {
      fetchMyRequests();
    }
  }, [activeSection, user]);

  // Listen to browser back/forward buttons (popstate) for mobile navigation
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const parts = path.split('/').filter(Boolean);
        if (parts[0] === 'help') {
          if (parts[1]) {
            setActiveSection(parts[1] as HelpSectionKey);
          } else {
            setActiveSection('overview');
          }
          setSelectedRequest(null);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Section switcher
  const navigateToSection = (key: HelpSectionKey) => {
    setActiveSection(key);
    setSelectedRequest(null);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', key === 'overview' ? '/help' : `/help/${key}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Mobile back button handler
  const handleMobileBack = () => {
    setActiveSection('overview');
    setSelectedRequest(null);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/help');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Submit Problem Report
  const handleSubmitProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemDesc.trim()) {
      setProblemError('Please provide a description of the problem.');
      return;
    }
    setIsSubmittingProblem(true);
    setProblemSuccess(null);
    setProblemError(null);

    try {
      const res = await fetch('/api/help/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'problem_report',
          category: problemCategory,
          description: problemDesc,
          screenshotUrl: problemScreenshot,
          deviceInfo,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setProblemSuccess(`Thank you! Your report has been submitted as ${data.ticketNumber || 'Ticket'}. Our engineering and support team is reviewing it.`);
        setProblemDesc('');
        setProblemScreenshot('');
      } else {
        setProblemError(data.error || 'Failed to submit report. Please try again.');
      }
    } catch {
      setProblemError('Network error while submitting report.');
    } finally {
      setIsSubmittingProblem(false);
    }
  };

  // Submit Abuse Report
  const handleSubmitAbuse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!abuseDesc.trim()) {
      setAbuseError('Please provide details about the abuse or safety concern.');
      return;
    }
    setIsSubmittingAbuse(true);
    setAbuseSuccess(null);
    setAbuseError(null);

    try {
      const res = await fetch('/api/help/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'report_abuse',
          category: abuseType,
          targetId: abuseTarget,
          description: abuseDesc,
          deviceInfo,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAbuseSuccess(`Report logged under ${data.ticketNumber || 'Ticket'}. Feeder.life Safety Desk moderators have been alerted for immediate inspection.`);
        setAbuseTarget('');
        setAbuseDesc('');
      } else {
        setAbuseError(data.error || 'Failed to submit safety report.');
      }
    } catch {
      setAbuseError('Network error while submitting safety report.');
    } finally {
      setIsSubmittingAbuse(false);
    }
  };

  // Filter FAQs
  const filteredFaqs = FAQ_DATA.filter((item) => {
    const matchesCategory = faqCategoryFilter === 'All' || item.category === faqCategoryFilter;
    const matchesQuery =
      !searchQuery ||
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="feeder-help-wrapper">
      {/* Help Top Header Banner */}
      <div
        className="card feeder-help-header-card"
        style={{
          padding: '20px 24px',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, rgba(46, 125, 50, 0.08) 0%, rgba(56, 142, 60, 0.03) 100%)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            <LifeBuoy size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Feeder.life Help & Support
            </h1>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Official guardian guides, issue reporting, ticket tracking, and safety center
            </div>
          </div>
        </div>

        {/* Prominent Search Help Input */}
        <div className="feeder-help-search-container">
          <Search size={18} color="var(--brand-primary)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Help: e.g. change password, report a post, SOS alert, block someone..."
            className="feeder-help-search-input"
            aria-label="Search Help Articles and FAQs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="feeder-help-main-grid">
        {/* Left Side: Navigation Sidebar (Desktop sticky navigation) */}
        <aside
          className="feeder-help-nav-pane card"
          aria-label="Help & Support Navigation"
        >
          <div className="feeder-help-nav-scroll-area">
            {/* 1. Primary Hub */}
            <div className="feeder-help-nav-group">
              <div className="feeder-help-nav-group-title">Help Hub</div>
              <button
                type="button"
                onClick={() => navigateToSection('overview')}
                className={`feeder-help-nav-row ${activeSection === 'overview' ? 'active' : ''}`}
              >
                <div className="feeder-help-nav-icon-wrap">
                  <LifeBuoy size={18} />
                </div>
                <div className="feeder-help-nav-text">
                  <span className="feeder-help-nav-title">Support Home</span>
                  <span className="feeder-help-nav-desc">Overview & popular topics</span>
                </div>
                <ChevronRight size={16} className="feeder-help-chevron" />
              </button>

              <button
                type="button"
                onClick={() => navigateToSection('center')}
                className={`feeder-help-nav-row ${activeSection === 'center' ? 'active' : ''}`}
              >
                <div className="feeder-help-nav-icon-wrap">
                  <BookOpen size={18} />
                </div>
                <div className="feeder-help-nav-text">
                  <span className="feeder-help-nav-title">Help Center</span>
                  <span className="feeder-help-nav-desc">Browse 11 welfare categories</span>
                </div>
                <ChevronRight size={16} className="feeder-help-chevron" />
              </button>
            </div>

            {/* 2. Need Help? */}
            <div className="feeder-help-nav-group">
              <div className="feeder-help-nav-group-title">Need Help?</div>
              <button
                type="button"
                onClick={() => navigateToSection('report-problem')}
                className={`feeder-help-nav-row ${activeSection === 'report-problem' ? 'active' : ''}`}
              >
                <div className="feeder-help-nav-icon-wrap">
                  <AlertCircle size={18} color="#f59e0b" />
                </div>
                <div className="feeder-help-nav-text">
                  <span className="feeder-help-nav-title">Report a Problem</span>
                  <span className="feeder-help-nav-desc">Submit technical or app issues</span>
                </div>
                <ChevronRight size={16} className="feeder-help-chevron" />
              </button>

              <button
                type="button"
                onClick={() => navigateToSection('report-abuse')}
                className={`feeder-help-nav-row ${activeSection === 'report-abuse' ? 'active' : ''}`}
              >
                <div className="feeder-help-nav-icon-wrap">
                  <ShieldAlert size={18} color="#ef4444" />
                </div>
                <div className="feeder-help-nav-text">
                  <span className="feeder-help-nav-title">Report Abuse & Safety</span>
                  <span className="feeder-help-nav-desc">Animal abuse, scams, or harassment</span>
                </div>
                <ChevronRight size={16} className="feeder-help-chevron" />
              </button>

              <button
                type="button"
                onClick={() => navigateToSection('requests')}
                className={`feeder-help-nav-row ${activeSection === 'requests' ? 'active' : ''}`}
              >
                <div className="feeder-help-nav-icon-wrap">
                  <Inbox size={18} color="var(--brand-primary)" />
                </div>
                <div className="feeder-help-nav-text">
                  <span className="feeder-help-nav-title">My Support Requests</span>
                  <span className="feeder-help-nav-desc">Track status of your tickets</span>
                </div>
                <ChevronRight size={16} className="feeder-help-chevron" />
              </button>

              <button
                type="button"
                onClick={() => navigateToSection('account-recovery')}
                className={`feeder-help-nav-row ${activeSection === 'account-recovery' ? 'active' : ''}`}
              >
                <div className="feeder-help-nav-icon-wrap">
                  <KeyRound size={18} color="#3b82f6" />
                </div>
                <div className="feeder-help-nav-text">
                  <span className="feeder-help-nav-title">Account Recovery</span>
                  <span className="feeder-help-nav-desc">Password, email & login help</span>
                </div>
                <ChevronRight size={16} className="feeder-help-chevron" />
              </button>

              <button
                type="button"
                onClick={() => navigateToSection('safety')}
                className={`feeder-help-nav-row ${activeSection === 'safety' ? 'active' : ''}`}
              >
                <div className="feeder-help-nav-icon-wrap">
                  <Shield size={18} color="var(--brand-primary)" />
                </div>
                <div className="feeder-help-nav-text">
                  <span className="feeder-help-nav-title">Safety Center</span>
                  <span className="feeder-help-nav-desc">Colony protection & security</span>
                </div>
                <ChevronRight size={16} className="feeder-help-chevron" />
              </button>
            </div>

            {/* 3. Resources */}
            <div className="feeder-help-nav-group">
              <div className="feeder-help-nav-group-title">Resources</div>
              <button
                type="button"
                onClick={() => navigateToSection('faq')}
                className={`feeder-help-nav-row ${activeSection === 'faq' ? 'active' : ''}`}
              >
                <div className="feeder-help-nav-icon-wrap">
                  <FileQuestion size={18} />
                </div>
                <div className="feeder-help-nav-text">
                  <span className="feeder-help-nav-title">FAQs</span>
                  <span className="feeder-help-nav-desc">Frequently asked questions</span>
                </div>
                <ChevronRight size={16} className="feeder-help-chevron" />
              </button>

              <button
                type="button"
                onClick={() => navigateToSection('community-guidelines')}
                className={`feeder-help-nav-row ${activeSection === 'community-guidelines' ? 'active' : ''}`}
              >
                <div className="feeder-help-nav-icon-wrap">
                  <FileText size={18} />
                </div>
                <div className="feeder-help-nav-text">
                  <span className="feeder-help-nav-title">Community Guidelines</span>
                  <span className="feeder-help-nav-desc">Rules for humane conduct</span>
                </div>
                <ChevronRight size={16} className="feeder-help-chevron" />
              </button>
            </div>

            {/* 4. Contact */}
            <div className="feeder-help-nav-group">
              <div className="feeder-help-nav-group-title">Contact</div>
              <button
                type="button"
                onClick={() => navigateToSection('contact')}
                className={`feeder-help-nav-row ${activeSection === 'contact' ? 'active' : ''}`}
              >
                <div className="feeder-help-nav-icon-wrap">
                  <Mail size={18} />
                </div>
                <div className="feeder-help-nav-text">
                  <span className="feeder-help-nav-title">Contact Support</span>
                  <span className="feeder-help-nav-desc">Official email & response desk</span>
                </div>
                <ChevronRight size={16} className="feeder-help-chevron" />
              </button>
            </div>
          </div>
        </aside>

        {/* Right Side: Content Area */}
        <main
          className="feeder-help-content-pane card"
          aria-labelledby="help-content-title"
        >
          {/* Mobile Back Button */}
          {activeSection !== 'overview' && (
            <div className="feeder-help-mobile-back-bar">
              <button
                type="button"
                onClick={handleMobileBack}
                className="feeder-help-mobile-back-btn"
                aria-label="Back to Help & Support"
              >
                <ArrowLeft size={17} />
                <span>Help & Support</span>
              </button>
            </div>
          )}

          {/* 1. OVERVIEW & POPULAR TOPICS */}
          {activeSection === 'overview' && (
            <div className="feeder-help-stack">
              <div>
                <h2 id="help-content-title" className="feeder-help-section-title">
                  Popular Help Topics
                </h2>
                <p className="feeder-help-section-desc">
                  Quick answers to commonly needed features and guardian actions.
                </p>
              </div>

              {/* Popular Topics Grid */}
              <div className="feeder-help-topics-grid">
                {POPULAR_TOPICS.map((topic) => (
                  <Link
                    key={topic.id}
                    href={topic.link}
                    className="feeder-help-topic-card"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span className="feeder-help-topic-category">{topic.category}</span>
                      <ChevronRight size={15} color="var(--brand-primary)" />
                    </div>
                    <span className="feeder-help-topic-title">{topic.title}</span>
                  </Link>
                ))}
              </div>

              {/* Need Immediate Assistance Row */}
              <div className="feeder-help-action-boxes-grid" style={{ marginTop: '16px' }}>
                <div
                  className="feeder-help-action-box"
                  onClick={() => navigateToSection('report-problem')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="feeder-help-action-box-icon yellow">
                    <AlertCircle size={22} />
                  </div>
                  <div>
                    <h3 className="feeder-help-action-box-title">Report a Problem</h3>
                    <p className="feeder-help-action-box-desc">
                      Encountering an app glitch, upload error, or login bug? Let our team know.
                    </p>
                  </div>
                </div>

                <div
                  className="feeder-help-action-box"
                  onClick={() => navigateToSection('report-abuse')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="feeder-help-action-box-icon red">
                    <ShieldAlert size={22} />
                  </div>
                  <div>
                    <h3 className="feeder-help-action-box-title">Report Abuse & Safety</h3>
                    <p className="feeder-help-action-box-desc">
                      Report animal cruelty, harassment, fake profiles, or safety violations.
                    </p>
                  </div>
                </div>

                <div
                  className="feeder-help-action-box"
                  onClick={() => navigateToSection('requests')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="feeder-help-action-box-icon green">
                    <Inbox size={22} />
                  </div>
                  <div>
                    <h3 className="feeder-help-action-box-title">My Support Requests</h3>
                    <p className="feeder-help-action-box-desc">
                      Check live progress and status updates for your submitted tickets.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick FAQ preview */}
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Top Questions</h3>
                  <button
                    type="button"
                    onClick={() => navigateToSection('faq')}
                    style={{ border: 'none', background: 'transparent', color: 'var(--brand-primary)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    View All FAQs →
                  </button>
                </div>
                <div className="feeder-help-faq-accordion-list">
                  {FAQ_DATA.slice(0, 4).map((faq, idx) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div key={idx} className="feeder-help-faq-accordion-item">
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          className="feeder-help-faq-accordion-header"
                        >
                          <span style={{ fontWeight: 700, fontSize: '14px', textAlign: 'left' }}>{faq.q}</span>
                          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        {isOpen && (
                          <div className="feeder-help-faq-accordion-body">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 2. HELP CENTER CATEGORIES */}
          {activeSection === 'center' && (
            <div className="feeder-help-stack">
              <div>
                <h2 id="help-content-title" className="feeder-help-section-title">
                  Help Center Categories
                </h2>
                <p className="feeder-help-section-desc">
                  Browse comprehensive guidance across all 11 core Feeder.life areas.
                </p>
              </div>

              <div className="feeder-help-categories-grid">
                {HELP_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <div
                      key={cat.id}
                      className="feeder-help-category-card"
                      onClick={() => {
                        setFaqCategoryFilter(cat.title.split(' ')[0]);
                        navigateToSection('faq');
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="feeder-help-category-icon">
                        <Icon size={22} color="var(--brand-primary)" />
                      </div>
                      <h3 className="feeder-help-category-title">{cat.title}</h3>
                      <p className="feeder-help-category-desc">{cat.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. REPORT A PROBLEM */}
          {activeSection === 'report-problem' && (
            <div className="feeder-help-stack">
              <div>
                <h2 id="help-content-title" className="feeder-help-section-title">
                  Report a Problem
                </h2>
                <p className="feeder-help-section-desc">
                  Let our engineering team know if you're experiencing technical glitches or unexpected behavior.
                </p>
              </div>

              {problemSuccess && (
                <div role="alert" className="feeder-help-banner success">
                  <CheckCircle2 size={20} />
                  <span>{problemSuccess}</span>
                </div>
              )}

              {problemError && (
                <div role="alert" className="feeder-help-banner error">
                  <AlertCircle size={20} />
                  <span>{problemError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitProblem} className="feeder-help-form">
                <div className="feeder-help-input-group">
                  <label className="feeder-help-label" htmlFor="probCategorySelect">
                    Problem Category *
                  </label>
                  <select
                    id="probCategorySelect"
                    value={problemCategory}
                    onChange={(e) => setProblemCategory(e.target.value)}
                    className="feeder-help-select"
                  >
                    <option>Login Problem</option>
                    <option>Profile Problem</option>
                    <option>Feed / Post Problem</option>
                    <option>Community Problem</option>
                    <option>Messaging Problem</option>
                    <option>Notification Problem</option>
                    <option>Media Upload Problem</option>
                    <option>Performance Problem</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="feeder-help-input-group">
                  <label className="feeder-help-label" htmlFor="probDescInput">
                    Detailed Description *
                  </label>
                  <textarea
                    id="probDescInput"
                    rows={4}
                    required
                    value={problemDesc}
                    onChange={(e) => setProblemDesc(e.target.value)}
                    placeholder="Describe what happened, what you expected, and any steps to reproduce..."
                    className="feeder-help-textarea"
                  />
                </div>

                <div className="feeder-help-input-group">
                  <label className="feeder-help-label" htmlFor="probScreenshotInput">
                    Screenshot or Attachment URL (Optional)
                  </label>
                  <input
                    id="probScreenshotInput"
                    type="url"
                    value={problemScreenshot}
                    onChange={(e) => setProblemScreenshot(e.target.value)}
                    placeholder="https://..."
                    className="feeder-help-input"
                  />
                </div>

                <div className="feeder-help-input-group">
                  <label className="feeder-help-label">
                    Device & Environment Telemetry (Auto-detected)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={deviceInfo}
                    className="feeder-help-input disabled"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingProblem}
                  className="btn-primary"
                  style={{ alignSelf: 'flex-start', padding: '10px 22px', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {isSubmittingProblem ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                  <span>{isSubmittingProblem ? 'Submitting Report...' : 'Submit Report'}</span>
                </button>
              </form>
            </div>
          )}

          {/* 4. REPORT ABUSE & SAFETY */}
          {activeSection === 'report-abuse' && (
            <div className="feeder-help-stack">
              <div>
                <h2 id="help-content-title" className="feeder-help-section-title">
                  Report Abuse & Safety Concerns
                </h2>
                <p className="feeder-help-section-desc">
                  Use this section to report content or behavior that violates Feeder.life safety and animal welfare rules.
                </p>
              </div>

              {abuseSuccess && (
                <div role="alert" className="feeder-help-banner success">
                  <CheckCircle2 size={20} />
                  <span>{abuseSuccess}</span>
                </div>
              )}

              {abuseError && (
                <div role="alert" className="feeder-help-banner error">
                  <AlertCircle size={20} />
                  <span>{abuseError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitAbuse} className="feeder-help-form">
                <div className="feeder-help-input-group">
                  <label className="feeder-help-label" htmlFor="abuseTypeSelect">
                    Violation Type *
                  </label>
                  <select
                    id="abuseTypeSelect"
                    value={abuseType}
                    onChange={(e) => setAbuseType(e.target.value)}
                    className="feeder-help-select"
                  >
                    <option>Animal Abuse</option>
                    <option>Harassment or Threat</option>
                    <option>Report a User</option>
                    <option>Report a Post</option>
                    <option>Report a Comment</option>
                    <option>Report a Message</option>
                    <option>Spam / Scam</option>
                    <option>Threat / Safety Issue</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="feeder-help-input-group">
                  <label className="feeder-help-label" htmlFor="abuseTargetInput">
                    Target @username, Post Link, or ID (Optional)
                  </label>
                  <input
                    id="abuseTargetInput"
                    type="text"
                    value={abuseTarget}
                    onChange={(e) => setAbuseTarget(e.target.value)}
                    placeholder="e.g. @abusive_user or post ID"
                    className="feeder-help-input"
                  />
                </div>

                <div className="feeder-help-input-group">
                  <label className="feeder-help-label" htmlFor="abuseDescInput">
                    Safety Concern Details & Evidence *
                  </label>
                  <textarea
                    id="abuseDescInput"
                    rows={4}
                    required
                    value={abuseDesc}
                    onChange={(e) => setAbuseDesc(e.target.value)}
                    placeholder="Please explain in detail what happened and why this violates welfare safety rules..."
                    className="feeder-help-textarea"
                  />
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    fontSize: '12.5px',
                    color: 'var(--text-main)',
                  }}
                >
                  <strong style={{ color: '#ef4444' }}>Safety Policy Note:</strong> All abuse reports are treated with strict confidentiality. Reports are reviewed manually by platform moderators. False or retaliatory reporting is prohibited.
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingAbuse}
                  className="btn-primary"
                  style={{
                    background: '#ef4444',
                    borderColor: '#ef4444',
                    alignSelf: 'flex-start',
                    padding: '10px 22px',
                    fontSize: '13.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {isSubmittingAbuse ? <RefreshCw size={16} className="animate-spin" /> : <ShieldAlert size={16} />}
                  <span>{isSubmittingAbuse ? 'Transmitting Safety Report...' : 'Submit Safety Report'}</span>
                </button>
              </form>
            </div>
          )}

          {/* 5. MY SUPPORT REQUESTS */}
          {activeSection === 'requests' && (
            <div className="feeder-help-stack">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h2 id="help-content-title" className="feeder-help-section-title">
                    My Support Requests
                  </h2>
                  <p className="feeder-help-section-desc">
                    View the status and responses for tickets you have submitted.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchMyRequests}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', padding: '6px 12px' }}
                >
                  <RefreshCw size={14} className={isLoadingRequests ? 'animate-spin' : ''} />
                  <span>Refresh Tickets</span>
                </button>
              </div>

              {selectedRequest ? (
                /* Detail View of a specific ticket */
                <div className="feeder-help-ticket-detail card" style={{ padding: '20px', border: '1px solid var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedRequest(null)}
                    className="btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '5px 10px', marginBottom: '14px' }}
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Requests List</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>
                      Ticket {selectedRequest.ticketNumber} — {selectedRequest.category}
                    </h3>
                    <span className={`feeder-help-status-badge ${selectedRequest.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {selectedRequest.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Submitted on {new Date(selectedRequest.createdAt).toLocaleString()}
                  </div>

                  <div style={{ marginTop: '16px', padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', fontSize: '13.5px' }}>
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>Initial Description:</div>
                    <div style={{ color: 'var(--text-main)', lineHeight: 1.5 }}>{selectedRequest.description}</div>
                  </div>

                  {/* Responses list */}
                  <div style={{ marginTop: '20px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Support Timeline & Responses</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedRequest.responses.map((resp: any, rIdx: number) => (
                        <div key={rIdx} style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--brand-primary)' }}>{resp.author} ({resp.role})</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(resp.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.4 }}>{resp.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Ticket List */
                <div className="feeder-help-ticket-list">
                  {requestsList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                      <Inbox size={36} color="var(--text-muted)" style={{ margin: '0 auto 10px auto' }} />
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>No Support Requests Yet</div>
                      <p style={{ fontSize: '13px', marginTop: '4px' }}>
                        When you submit a problem or abuse report, you can track its progress here.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigateToSection('report-problem')}
                        className="btn-primary"
                        style={{ marginTop: '14px', fontSize: '13px', padding: '8px 16px' }}
                      >
                        Report a Problem
                      </button>
                    </div>
                  ) : (
                    requestsList.map((req) => (
                      <div
                        key={req.id}
                        className="feeder-help-ticket-row card"
                        onClick={() => setSelectedRequest(req)}
                        role="button"
                        tabIndex={0}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--brand-primary)' }}>
                            {req.ticketNumber}
                          </span>
                          <span className={`feeder-help-status-badge ${req.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            {req.status}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)', margin: '4px 0 2px 0' }}>
                          {req.category}
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {req.description}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                          Submitted: {new Date(req.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* 6. ACCOUNT RECOVERY */}
          {activeSection === 'account-recovery' && (
            <div className="feeder-help-stack">
              <div>
                <h2 id="help-content-title" className="feeder-help-section-title">
                  Account Recovery & Access
                </h2>
                <p className="feeder-help-section-desc">
                  Recover access to your account or fix compromised credentials.
                </p>
              </div>

              <div className="feeder-help-recovery-list">
                <div className="feeder-help-recovery-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <KeyRound size={22} color="var(--brand-primary)" />
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Forgot Password</h3>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                        Send a password reset link to your registered email address.
                      </p>
                    </div>
                  </div>
                  <Link href="/reset-password" className="btn-primary" style={{ fontSize: '12.5px', padding: '6px 14px' }}>
                    Reset Password
                  </Link>
                </div>

                <div className="feeder-help-recovery-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Mail size={22} color="#3b82f6" />
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Can't Access Registered Email</h3>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                        If you lost access to your login email, submit an identity recovery request.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateToSection('report-problem')}
                    className="btn-secondary"
                    style={{ fontSize: '12.5px', padding: '6px 14px' }}
                  >
                    Identity Recovery
                  </button>
                </div>

                <div className="feeder-help-recovery-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ShieldAlert size={22} color="#ef4444" />
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Suspicious Login or Account Compromised</h3>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                        Instantly terminate all active sessions and change your login password.
                      </p>
                    </div>
                  </div>
                  <Link href="/settings/security" className="btn-secondary" style={{ color: '#ef4444', fontSize: '12.5px', padding: '6px 14px' }}>
                    Secure Account
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* 7. SAFETY CENTER */}
          {activeSection === 'safety' && (
            <div className="feeder-help-stack">
              <div>
                <h2 id="help-content-title" className="feeder-help-section-title">
                  Feeder.life Safety Center
                </h2>
                <p className="feeder-help-section-desc">
                  Protocols protecting community guardians, vulnerable animals, and account security.
                </p>
              </div>

              <div className="feeder-help-safety-grid">
                <div className="feeder-help-safety-box">
                  <h3 className="feeder-help-safety-box-title" style={{ color: 'var(--brand-primary)' }}>
                    Street Animal Colony Protection
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    To protect stray animals from illegal relocation or cruelty, Feeder.life automatically obfuscates feeding spot coordinates (±500m jitter) in public discovery. Exact coordinates are never broadcast.
                  </p>
                </div>

                <div className="feeder-help-safety-box">
                  <h3 className="feeder-help-safety-box-title" style={{ color: '#3b82f6' }}>
                    Guardian Anti-Harassment
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Feeders have legal rights under animal welfare provisions. We provide blocking, tag moderation, and fast-track report escalation for any abusive behavior in communities or direct messages.
                  </p>
                </div>

                <div className="feeder-help-safety-box">
                  <h3 className="feeder-help-safety-box-title" style={{ color: '#ef4444' }}>
                    SOS Emergency Rescue Protocol
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    SOS alerts should only be created for active, physical emergencies (hit-and-run, acute injuries, trapped animals). Please provide clear photos and landmarks so local rescuers can reach in time.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 8. FAQS */}
          {activeSection === 'faq' && (
            <div className="feeder-help-stack">
              <div>
                <h2 id="help-content-title" className="feeder-help-section-title">
                  Frequently Asked Questions
                </h2>
                <p className="feeder-help-section-desc">
                  Browse by category or use the search bar above to filter questions.
                </p>
              </div>

              {/* Category Pills */}
              <div className="feeder-help-faq-filters">
                {['All', 'Account', 'Feed', 'Communities', 'Messaging', 'Animal & Rescue', 'SOS & Emergency'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFaqCategoryFilter(cat)}
                    className={`feeder-help-faq-pill ${faqCategoryFilter === cat ? 'active' : ''}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* FAQ Accordion List */}
              <div className="feeder-help-faq-accordion-list">
                {filteredFaqs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No FAQs matched your search. Try another query or contact support.
                  </div>
                ) : (
                  filteredFaqs.map((faq, idx) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div key={idx} className="feeder-help-faq-accordion-item">
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          className="feeder-help-faq-accordion-header"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--brand-primary)' }}>
                              {faq.category}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '14px', textAlign: 'left' }}>{faq.q}</span>
                          </div>
                          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        {isOpen && (
                          <div className="feeder-help-faq-accordion-body">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 9. COMMUNITY GUIDELINES */}
          {activeSection === 'community-guidelines' && (
            <div className="feeder-help-stack">
              <div>
                <h2 id="help-content-title" className="feeder-help-section-title">
                  Community Feeder Guidelines
                </h2>
                <p className="feeder-help-section-desc">
                  Code of conduct for responsible street animal feeding, peaceful neighborhood coexistence, and compassionate care.
                </p>
              </div>

              <div className="feeder-help-guidelines-list">
                <div className="feeder-help-guideline-item">
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--brand-primary)', margin: '0 0 4px 0' }}>
                    1. Respectful & Humane Conduct
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                    Treat fellow animal feeders, volunteers, and residents with empathy and respect. Constructive dialogue resolves local animal feeding concerns faster than hostility.
                  </p>
                </div>

                <div className="feeder-help-guideline-item">
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--brand-primary)', margin: '0 0 4px 0' }}>
                    2. Clean & Responsible Street Feeding
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                    Always clean feeding spots after the animals finish eating. Use eco-friendly bowls or newspaper layers, and provide fresh clean drinking water daily.
                  </p>
                </div>

                <div className="feeder-help-guideline-item">
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--brand-primary)', margin: '0 0 4px 0' }}>
                    3. Zero Tolerance for Cruelty, Doxxing & Scams
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                    Content promoting cruelty to animals, posting personal home addresses without consent, or creating fraudulent donation appeals will lead to immediate account termination.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 10. CONTACT SUPPORT */}
          {activeSection === 'contact' && (
            <div className="feeder-help-stack">
              <div>
                <h2 id="help-content-title" className="feeder-help-section-title">
                  Contact Support Desk
                </h2>
                <p className="feeder-help-section-desc">
                  Get in touch with our human support and animal welfare coordination team.
                </p>
              </div>

              <div className="feeder-help-contact-cards-grid">
                <div className="feeder-help-contact-card">
                  <Mail size={28} color="var(--brand-primary)" />
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '8px 0 4px 0' }}>Official Support Email</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                    Email our team directly for platform questions or shelter badge verifications.
                  </p>
                  <a
                    href="mailto:help@feeder.life"
                    className="btn-secondary"
                    style={{ display: 'inline-flex', fontSize: '13px', padding: '6px 14px' }}
                  >
                    help@feeder.life
                  </a>
                </div>

                <div className="feeder-help-contact-card">
                  <LifeBuoy size={28} color="#3b82f6" />
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '8px 0 4px 0' }}>Submit Support Ticket</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                    Open a tracked support inquiry and receive direct updates from our response team.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigateToSection('report-problem')}
                    className="btn-primary"
                    style={{ fontSize: '13px', padding: '6px 14px' }}
                  >
                    Submit Ticket
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
