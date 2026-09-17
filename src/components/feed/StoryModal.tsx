'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Clock,
  Loader2,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
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

interface ValidationState {
  isValid: boolean;
  reason: string;
  animalType?: string | null;
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
  const [isValidatingMedia, setIsValidatingMedia] = useState(false);
  const [mediaValidation, setMediaValidation] = useState<ValidationState | null>(null);
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
    setMediaValidation(null);
    setIsValidatingMedia(false);
    onClose();
  };

  if (!isOpen) return null;

  if (!user) {
    return (
      <div className="modal-overlay" onClick={handleModalClose} style={{ zIndex: 1100 }}>
        <div
          className="modal-dialog"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '440px',
            textAlign: 'center',
            padding: '32px 24px',
            borderRadius: '16px',
            background: 'var(--bg-card)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          }}
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
        error: 'Please upload a supported image or video file (JPEG, PNG, WebP, GIF, MP4, WebM).',
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

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setMediaValidation(null);
    const localCheck = validateFileLocally(file);

    if (!localCheck.valid) {
      setError(localCheck.error || 'Invalid file selected');
      if (e.target) e.target.value = '';
      return;
    }

    // Clean up previous preview
    cleanupPreview();

    // Create safe local preview
    const previewUrl = URL.createObjectURL(file);
    const mediaObj: LocalStoryMedia = {
      file,
      previewUrl,
      type: localCheck.type,
      name: file.name,
      size: file.size,
    };
    setSelectedMedia(mediaObj);

    if (e.target) e.target.value = '';

    // Step: Server-side visual validation for real animal media
    if (localCheck.type === 'IMAGE') {
      setIsValidatingMedia(true);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const valRes = await fetch('/api/media/validate', {
          method: 'POST',
          body: formData,
        });

        const valData = await valRes.json();
        if (valRes.ok && valData.success && valData.validation) {
          const v = valData.validation;
          setMediaValidation({
            isValid: v.isValid,
            reason: v.reason || (v.isValid ? 'Real animal photo detected' : 'Invalid media'),
            animalType: v.animalType,
          });
          if (!v.isValid) {
            setError(v.reason || 'This upload can\'t be used for an animal welfare Story. Please upload a real photo or video of an animal.');
          }
        } else {
          // If validator had an error or returned failure
          setMediaValidation({
            isValid: false,
            reason: valData.error || 'Media verification failed. Please upload a real animal photo.',
          });
          setError(valData.error || 'Media verification failed.');
        }
      } catch (valErr: any) {
        console.error('[StoryModal] Media validation error:', valErr);
        // Do not crash, set retry state
        setMediaValidation({
          isValid: false,
          reason: 'Unable to verify photo authenticity. Please check connection.',
        });
      } finally {
        setIsValidatingMedia(false);
      }
    } else {
      // Video
      setMediaValidation({
        isValid: true,
        reason: 'Real animal video accepted',
      });
    }
  };

  const handleRemoveMedia = () => {
    cleanupPreview();
    setSelectedMedia(null);
    setMediaValidation(null);
    setIsValidatingMedia(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting || isValidatingMedia) return; // Prevent double submission

    if (!selectedMedia) {
      setError('Please select an image or video from your device for your story.');
      return;
    }

    if (mediaValidation && !mediaValidation.isValid) {
      setError(mediaValidation.reason || 'Please upload a genuine, real-world animal photo or video.');
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
      setMediaValidation(null);

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

  const isPublishDisabled =
    isSubmitting ||
    isValidatingMedia ||
    !selectedMedia ||
    (mediaValidation !== null && !mediaValidation.isValid);

  return (
    <div
      className="modal-overlay"
      onClick={handleModalClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '16px',
        overflow: 'hidden',
      }}
    >
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '500px',
          maxHeight: 'min(90dvh, 680px)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-card, #ffffff)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-subtle, #e2e8f0)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
            flexShrink: 0,
            background: 'var(--bg-card, #ffffff)',
          }}
        >
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 700 }}>
            <Camera size={18} color="var(--brand-primary, #059669)" />
            <span>Create 24-Hour Welfare Story</span>
          </div>
          <button
            className="modal-close-btn"
            onClick={handleModalClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted, #64748b)',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Scrollable Modal Body */}
          <div
            className="modal-body"
            style={{
              flex: '1 1 auto',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              padding: '16px 18px',
              minHeight: 0,
            }}
          >
            {/* Error Message */}
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '10px 12px',
                  background: '#fee2e2',
                  color: '#b91c1c',
                  borderRadius: '8px',
                  fontSize: '13px',
                  marginBottom: '12px',
                  lineHeight: 1.4,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
              </div>
            )}

            {/* Upload & Progress Status */}
            {uploadStatus && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  background: 'rgba(5, 150, 105, 0.1)',
                  color: 'var(--brand-primary, #059669)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  marginBottom: '12px',
                  fontWeight: 600,
                }}
              >
                <Loader2 size={16} className="animate-spin" style={{ flexShrink: 0 }} />
                <span>{uploadStatus}</span>
              </div>
            )}

            {/* Expiry Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                background: 'rgba(5, 150, 105, 0.08)',
                borderRadius: '8px',
                marginBottom: '12px',
              }}
            >
              <Clock size={16} color="var(--brand-primary, #059669)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary, #475569)' }}>
                Stories automatically expire after <strong>24 hours</strong> and appear to your followers and local community.
              </span>
            </div>

            {/* Real Animal Media Warning */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                background: 'rgba(5, 150, 105, 0.06)',
                borderRadius: '8px',
                border: '1px solid rgba(5, 150, 105, 0.15)',
                marginBottom: '14px',
                fontSize: '12px',
                color: 'var(--text-secondary, #475569)',
                lineHeight: 1.45,
              }}
            >
              <AlertCircle size={15} color="var(--brand-primary, #059669)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                <strong>Real animal photos/videos only:</strong> Posters, flyers, screenshots, and AI-generated images are not permitted.
              </span>
            </div>

            {/* Hidden Real File Inputs */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
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

            {/* Media Upload Area or Active Preview */}
            {!selectedMedia ? (
              <div
                style={{
                  border: '2px dashed var(--border-subtle, #cbd5e1)',
                  borderRadius: '12px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: 'var(--bg-secondary, #f8fafc)',
                  marginBottom: '14px',
                }}
              >
                <UploadCloud size={32} color="var(--brand-primary, #059669)" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>
                  Upload Real Animal Welfare Story
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted, #64748b)',
                    marginBottom: '14px',
                    maxWidth: '300px',
                    margin: '0 auto 14px auto',
                  }}
                >
                  Choose photo or video directly from device (Max: Photo 10MB, Video 50MB)
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                    }}
                  >
                    <ImageIcon size={15} />
                    <span>Choose from Device</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isSubmitting}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                    }}
                  >
                    <Camera size={15} />
                    <span>Take Photo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '14px' }}>
                {/* Media Preview Container */}
                <div
                  style={{
                    borderRadius: '10px',
                    overflow: 'hidden',
                    height: '220px',
                    background: '#0f172a',
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

                {/* Validation Status / Actions Bar */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '8px',
                    padding: '0 2px',
                    fontSize: '12px',
                  }}
                >
                  {isValidatingMedia ? (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--brand-primary, #059669)',
                        fontWeight: 600,
                      }}
                    >
                      <Loader2 size={14} className="animate-spin" />
                      Checking media for animal welfare authenticity...
                    </span>
                  ) : mediaValidation?.isValid ? (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#059669',
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle2 size={14} />
                      {mediaValidation.reason} ({formatFileSize(selectedMedia.size)})
                    </span>
                  ) : mediaValidation && !mediaValidation.isValid ? (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#dc2626',
                        fontWeight: 600,
                      }}
                    >
                      <AlertCircle size={14} />
                      {mediaValidation.reason}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>
                      {selectedMedia.name} &bull; {formatFileSize(selectedMedia.size)}
                    </span>
                  )}

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
                          padding: '2px 4px',
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
                          padding: '2px 4px',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Story Caption Input */}
            <div className="form-group" style={{ marginBottom: '8px' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
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
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle, #cbd5e1)',
                  background: 'var(--bg-secondary, #f8fafc)',
                  color: 'var(--text-primary)',
                  resize: 'none',
                }}
              />
              <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {caption.length}/140
              </div>
            </div>
          </div>

          {/* Fixed Modal Action Footer — Always Visible Across All Viewports */}
          <div
            className="modal-footer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              padding: '12px 18px',
              borderTop: '1px solid var(--border-subtle, #e2e8f0)',
              background: 'var(--bg-card, #ffffff)',
              flexShrink: 0,
              position: 'sticky',
              bottom: 0,
              zIndex: 10,
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleModalClose}
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                fontSize: '13.5px',
                fontWeight: 600,
                borderRadius: '8px',
                cursor: 'pointer',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                background: 'var(--bg-secondary, #f1f5f9)',
                color: 'var(--text-primary, #334155)',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isPublishDisabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minWidth: '130px',
                justifyContent: 'center',
                padding: '8px 18px',
                fontSize: '13.5px',
                fontWeight: 600,
                borderRadius: '8px',
                cursor: isPublishDisabled ? 'not-allowed' : 'pointer',
                opacity: isPublishDisabled ? 0.6 : 1,
                background: 'var(--brand-btn, #059669)',
                color: '#ffffff',
                border: 'none',
                transition: 'opacity 0.15s ease, background 0.15s ease',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={15} />
                  <span>Publishing...</span>
                </>
              ) : isValidatingMedia ? (
                <>
                  <Loader2 className="animate-spin" size={15} />
                  <span>Checking...</span>
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
