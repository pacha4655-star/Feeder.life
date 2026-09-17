'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Clock,
  Loader2,
  UploadCloud,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface StoryModalProps {
  user: UserSession | null;
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
}

interface LocalStoryMedia {
  file: File;
  previewUrl: string;
  type: 'IMAGE' | 'VIDEO';
  name: string;
  size: number;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.bin', '.js', '.mjs',
  '.ts', '.py', '.php', '.phtml', '.vbs', '.msi', '.com', '.scr',
];

export default function StoryModal({
  user,
  isOpen,
  onClose,
  onStoryCreated,
}: StoryModalProps) {
  useBodyScrollLock(isOpen);

  const [selectedMedia, setSelectedMedia] = useState<LocalStoryMedia | null>(null);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URL on unmount or reset
  const cleanupPreview = (url?: string) => {
    const target = url || selectedMedia?.previewUrl;
    if (target) {
      try {
        URL.revokeObjectURL(target);
      } catch {}
    }
  };

  useEffect(() => {
    return () => {
      cleanupPreview();
    };
  }, []);

  const handleModalClose = () => {
    if (isSubmitting) return;
    cleanupPreview();
    setSelectedMedia(null);
    setCaption('');
    setError('');
    setUploadStatus('');
    onClose();
  };

  if (!isOpen) return null;

  if (!user) {
    return (
      <div className="modal-overlay" onClick={handleModalClose}>
        <div
          className="modal-dialog"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '440px', textAlign: 'center', padding: '32px 24px' }}
        >
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📸</div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
            Sign In to Share Stories
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
            Share 24-hour animal welfare highlights, morning feeding rounds, and rescue updates with your local circle.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={handleModalClose}>Cancel</button>
            <a href="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>Sign In</a>
          </div>
        </div>
      </div>
    );
  }

  // Client-side file validation before creating local preview
  const validateFileLocally = (file: File): { valid: boolean; error?: string; type: 'IMAGE' | 'VIDEO' } => {
    const lowerName = file.name.toLowerCase();

    // 1. Prohibit dangerous extensions
    for (const badExt of DANGEROUS_EXTENSIONS) {
      if (lowerName.endsWith(badExt)) {
        return { valid: false, error: 'Unsupported file type. Executables and scripts are prohibited.', type: 'IMAGE' };
      }
    }

    const mime = file.type?.toLowerCase();
    const isImage = ALLOWED_IMAGE_TYPES.includes(mime) || /\.(jpe?g|png|webp|gif)$/i.test(lowerName);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(mime) || /\.(mp4|webm|mov)$/i.test(lowerName);

    if (!isImage && !isVideo) {
      return {
        valid: false,
        error: 'Unsupported file type. Please select JPEG, PNG, WebP, GIF, MP4, or WebM.',
        type: 'IMAGE',
      };
    }

    if (isVideo) {
      if (file.size > MAX_VIDEO_SIZE) {
        return { valid: false, error: 'Video must be 50 MB or smaller.', type: 'VIDEO' };
      }
      return { valid: true, type: 'VIDEO' };
    } else {
      if (file.size > MAX_IMAGE_SIZE) {
        return { valid: false, error: 'Image must be 10 MB or smaller.', type: 'IMAGE' };
      }
      return { valid: true, type: 'IMAGE' };
    }
  };

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    const validation = validateFileLocally(file);

    if (!validation.valid) {
      setError(validation.error || 'Invalid file selected');
      if (e.target) e.target.value = '';
      return;
    }

    // Clean up existing preview if replacing
    cleanupPreview();

    // Create safe local object URL
    const previewUrl = URL.createObjectURL(file);
    setSelectedMedia({
      file,
      previewUrl,
      type: validation.type,
      name: file.name,
      size: file.size,
    });

    if (e.target) e.target.value = '';
  };

  const handleRemoveMedia = () => {
    cleanupPreview();
    setSelectedMedia(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return; // Prevent double submission

    if (!selectedMedia) {
      setError('Please select an image or video from your device for your story.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setUploadStatus('Uploading media to Supabase Storage...');

    try {
      // Step 1: Upload media to Supabase Storage via /api/upload?category=stories
      const formData = new FormData();
      formData.append('file', selectedMedia.file);
      formData.append('category', 'stories');

      const uploadRes = await fetch('/api/upload?category=stories', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.success || !uploadData.url) {
        throw new Error(uploadData.error || 'Failed to upload story media to storage.');
      }

      // Step 2: Create social_posts record with record_type = 'story' & 24h expiration
      setUploadStatus('Publishing 24-hour welfare story...');
      const storyRes = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaUrl: uploadData.url,
          mediaType: selectedMedia.type,
          caption: caption.trim() || undefined,
        }),
      });

      const storyData = await storyRes.json();

      if (!storyRes.ok || !storyData.success) {
        throw new Error(storyData.error || 'Failed to publish story.');
      }

      // Step 3: Clean up and notify
      cleanupPreview();
      setSelectedMedia(null);
      setCaption('');
      setUploadStatus('');

      onStoryCreated();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('feeder:stories-refresh'));
        window.dispatchEvent(new CustomEvent('feeder:feed-refresh'));
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while publishing story.');
    } finally {
      setIsSubmitting(false);
      setUploadStatus('');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="modal-overlay" onClick={handleModalClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={18} color="var(--brand-primary)" />
            <span>Create 24-Hour Welfare Story</span>
          </div>
          <button className="modal-close-btn" onClick={handleModalClose} disabled={isSubmitting} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '8px',
                  fontSize: '13px',
                  marginBottom: '14px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {uploadStatus && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  background: 'rgba(5, 150, 105, 0.1)',
                  color: 'var(--brand-primary, #059669)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  marginBottom: '14px',
                  fontWeight: 600,
                }}
              >
                <Loader2 size={16} className="animate-spin" style={{ flexShrink: 0 }} />
                <span>{uploadStatus}</span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px',
                background: 'rgba(5, 150, 105, 0.08)',
                borderRadius: '8px',
                marginBottom: '12px',
              }}
            >
              <Clock size={16} color="var(--brand-primary)" />
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Stories automatically expire after <strong>24 hours</strong> and appear to your followers and local community.
              </span>
            </div>

            {/* Real Media Authenticity Warning */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                background: 'rgba(5, 150, 105, 0.08)',
                borderRadius: '8px',
                border: '1px solid rgba(5, 150, 105, 0.2)',
                marginBottom: '16px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                lineHeight: 1.45,
              }}
            >
              <AlertCircle size={15} color="var(--brand-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                Please upload real photos or videos captured by you or from a trusted source. Do not upload AI-generated or AI-created images as real-world animal welfare evidence.
              </span>
            </div>

            {/* Hidden file inputs */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
              onChange={handleFileChosen}
            />
            <input
              type="file"
              ref={cameraInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              capture="environment"
              onChange={handleFileChosen}
            />

            {/* Upload Area or Local Preview */}
            {!selectedMedia ? (
              <div
                style={{
                  border: '2px dashed var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '32px 16px',
                  textAlign: 'center',
                  background: 'var(--bg-secondary)',
                  marginBottom: '16px',
                }}
              >
                <UploadCloud size={36} color="var(--brand-primary)" style={{ margin: '0 auto 10px auto' }} />
                <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
                  Upload Real Animal Welfare Story
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    marginBottom: '16px',
                    maxWidth: '320px',
                    margin: '0 auto 16px auto',
                  }}
                >
                  Select photo or video directly from your device (Max: Photo 10MB, Video 50MB)
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', minHeight: '44px' }}
                  >
                    <ImageIcon size={16} />
                    <span>Choose from Device</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isSubmitting}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', minHeight: '44px' }}
                  >
                    <Camera size={16} />
                    <span>Take Photo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '16px', position: 'relative' }}>
                <div
                  style={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    height: '260px',
                    background: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  {selectedMedia.type === 'VIDEO' ? (
                    <video
                      src={selectedMedia.previewUrl}
                      controls
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <img
                      src={selectedMedia.previewUrl}
                      alt="Story preview"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '8px',
                    padding: '0 2px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={14} /> Ready ({selectedMedia.name} &bull; {formatFileSize(selectedMedia.size)})
                  </span>

                  {!isSubmitting && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          fontSize: '12px',
                          color: 'var(--brand-primary, #059669)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px 6px',
                          fontWeight: 600,
                        }}
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveMedia}
                        style={{
                          fontSize: '12px',
                          color: '#dc2626',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px 6px',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>
                Story Caption (Optional)
              </label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Add a quick note e.g. Morning indie round in Indiranagar complete 🐾"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={140}
                disabled={isSubmitting}
              />
              <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {caption.length}/140
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleModalClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !selectedMedia}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '120px', justifyContent: 'center' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Publishing...</span>
                </>
              ) : (
                <span>Publish Story</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
