'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Image as ImageIcon,
  Video,
  MapPin,
  Camera,
  Loader2,
  FileUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface PostComposerModalProps {
  user: UserSession | null;
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
  initialType?: string;
  communityId?: string;
}

interface LocalMediaItem {
  id: string;
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
  name: string;
  size: number;
  isValidated?: boolean;
  isValid?: boolean;
  validationReason?: string;
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

export default function PostComposerModal({
  user,
  isOpen,
  onClose,
  onPostCreated,
  initialType = 'NORMAL',
  communityId,
}: PostComposerModalProps) {
  useBodyScrollLock(isOpen);

  const [contentType, setContentType] = useState(initialType);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState(communityId ? 'COMMUNITY' : 'PUBLIC');
  const [locationName, setLocationName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<LocalMediaItem[]>([]);
  const [isValidatingFiles, setIsValidatingFiles] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [error, setError] = useState('');

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const deviceInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs when modal is closed or unmounted
  const cleanUpPreviews = () => {
    selectedFiles.forEach((item) => {
      try {
        URL.revokeObjectURL(item.previewUrl);
      } catch {}
    });
  };

  useEffect(() => {
    return () => {
      cleanUpPreviews();
    };
  }, []);

  const handleModalClose = () => {
    if (isSubmitting) return;
    cleanUpPreviews();
    setSelectedFiles([]);
    setError('');
    setUploadStatus('');
    setIsValidatingFiles(false);
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
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🐾</div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
            Sign In to Create Posts
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
            Join Feeder.life to share animal welfare stories, updates, and photos with your local community.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={handleModalClose}>Cancel</button>
            <a href="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>Sign In</a>
          </div>
        </div>
      </div>
    );
  }

  // Validate a single file locally before accepting it
  const validateFileLocally = (file: File): { valid: boolean; error?: string; type: 'image' | 'video' } => {
    const lowerName = file.name.toLowerCase();

    for (const badExt of DANGEROUS_EXTENSIONS) {
      if (lowerName.endsWith(badExt)) {
        return { valid: false, error: 'Unsupported file type. Executables and scripts are prohibited.', type: 'image' };
      }
    }

    const mime = file.type?.toLowerCase();
    const isImage = ALLOWED_IMAGE_TYPES.includes(mime) || /\.(jpe?g|png|webp|gif)$/i.test(lowerName);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(mime) || /\.(mp4|webm|mov)$/i.test(lowerName);

    if (!isImage && !isVideo) {
      return {
        valid: false,
        error: 'Please upload a supported image or video file (JPEG, PNG, WebP, GIF, MP4, WebM).',
        type: 'image',
      };
    }

    if (isVideo) {
      if (file.size > MAX_VIDEO_SIZE) {
        return { valid: false, error: 'Video must be 50 MB or smaller.', type: 'video' };
      }
      return { valid: true, type: 'video' };
    } else {
      if (file.size > MAX_IMAGE_SIZE) {
        return { valid: false, error: 'Image must be 10 MB or smaller.', type: 'image' };
      }
      return { valid: true, type: 'image' };
    }
  };

  // Handle files chosen from any picker
  const handleFilesChosen = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError('');

    const newItems: LocalMediaItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = validateFileLocally(file);

      if (!validation.valid) {
        setError(validation.error || 'Invalid file selected');
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        file,
        previewUrl,
        type: validation.type,
        name: file.name,
        size: file.size,
        isValidated: validation.type === 'video',
        isValid: validation.type === 'video',
        validationReason: validation.type === 'video' ? 'Real animal video accepted' : undefined,
      });
    }

    setSelectedFiles((prev) => [...prev, ...newItems]);

    // Reset inputs
    if (photoInputRef.current) photoInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
    if (deviceInputRef.current) deviceInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';

    // Step: Server-side visual validation for each newly added image
    const imagesToValidate = newItems.filter((item) => item.type === 'image');
    if (imagesToValidate.length > 0) {
      setIsValidatingFiles(true);
      for (const item of imagesToValidate) {
        try {
          const formData = new FormData();
          formData.append('file', item.file);

          const res = await fetch('/api/media/validate', {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();
          const v = data?.validation;

          setSelectedFiles((prev) =>
            prev.map((f) => {
              if (f.id === item.id) {
                return {
                  ...f,
                  isValidated: true,
                  isValid: v?.isValid ?? false,
                  validationReason: v?.reason || (v?.isValid ? 'Real animal photo detected' : 'Invalid media'),
                  animalType: v?.animalType,
                };
              }
              return f;
            })
          );

          if (v && !v.isValid) {
            setError(v.reason || 'This image cannot be used. Please upload a real animal photo.');
          }
        } catch (valErr) {
          console.error('[PostComposer] Validation error:', valErr);
        }
      }
      setIsValidatingFiles(false);
    }
  };

  const handleRemoveSelectedFile = (id: string) => {
    const itemToRemove = selectedFiles.find((f) => f.id === id);
    if (itemToRemove) {
      try {
        URL.revokeObjectURL(itemToRemove.previewUrl);
      } catch {}
    }
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting || isValidatingFiles) return;

    if (!body.trim()) {
      setError('Please write something to share.');
      return;
    }

    // Check if any attached media failed validation
    const invalidItem = selectedFiles.find((f) => f.isValidated && !f.isValid);
    if (invalidItem) {
      setError(invalidItem.validationReason || 'Please remove invalid non-animal images before publishing.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setUploadStatus('Preparing upload...');

    try {
      const uploadedUrls: string[] = [];

      // Step 1: Upload real media files to Supabase Storage
      for (let i = 0; i < selectedFiles.length; i++) {
        const item = selectedFiles[i];
        setUploadStatus(`Uploading ${item.type} (${i + 1} of ${selectedFiles.length}) to Supabase Storage...`);

        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('category', 'posts');

        const uploadRes = await fetch('/api/upload?category=posts', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();

        if (!uploadRes.ok || !uploadData.success || !uploadData.url) {
          throw new Error(uploadData.error || `Failed to upload ${item.name} to storage.`);
        }

        uploadedUrls.push(uploadData.url);
      }

      // Step 2: Create database post
      setUploadStatus('Publishing post to feed...');
      const feedRes = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          body: body.trim(),
          contentType,
          visibility,
          communityId: communityId || undefined,
          locationName: locationName.trim() || undefined,
          mediaUrls: uploadedUrls,
        }),
      });

      const feedData = await feedRes.json();

      if (!feedRes.ok || !feedData.success) {
        throw new Error(feedData.error || 'Failed to publish post to feed');
      }

      // Clean up previews upon successful publication
      cleanUpPreviews();
      setSelectedFiles([]);
      setTitle('');
      setBody('');
      setUploadStatus('');

      onPostCreated();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('feeder:feed-refresh'));
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while publishing.');
    } finally {
      setIsSubmitting(false);
      setUploadStatus('');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const hasInvalidMedia = selectedFiles.some((f) => f.isValidated && !f.isValid);
  const isPublishDisabled = isSubmitting || isValidatingFiles || hasInvalidMedia || !body.trim();

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
          maxWidth: '560px',
          maxHeight: 'min(90dvh, 720px)',
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
            <FileUp size={18} color="var(--brand-primary, #059669)" />
            <span>Create Animal Welfare Post</span>
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
          {/* Scrollable Body */}
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
            {/* User & Audience Selector Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <img
                src={user.avatarUrl || '/avatars/default.png'}
                alt=""
                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-primary)' }}>{user.fullName}</div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '3px' }}>
                  <select
                    className="form-select"
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    disabled={isSubmitting}
                    style={{ padding: '3px 8px', fontSize: '12px', width: 'auto', borderRadius: '6px' }}
                  >
                    <option value="PUBLIC">🌍 Public</option>
                    <option value="COMMUNITY">👥 Community Only</option>
                    <option value="FOLLOWERS">🔒 Followers Only</option>
                  </select>

                  <select
                    className="form-select"
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    disabled={isSubmitting}
                    style={{ padding: '3px 8px', fontSize: '12px', width: 'auto', borderRadius: '6px' }}
                  >
                    <option value="NORMAL">Standard Post</option>
                    <option value="FEEDING_UPDATE">🐾 Feeding Update</option>
                    <option value="HELP_REQUEST">🚨 Help Request</option>
                  </select>
                </div>
              </div>
            </div>

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

            {/* Progress Status */}
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

            {/* Post Title */}
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Give your update a title (e.g. Morning Stray Pack Fed)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13.5px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle, #cbd5e1)',
                }}
              />
            </div>

            {/* Post Content Body */}
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder={`What animal welfare work or observation would you like to share, ${user.fullName.split(' ')[0]}?`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '13.5px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle, #cbd5e1)',
                  resize: 'none',
                }}
              />
            </div>

            {/* Selected Media Previews Grid */}
            {selectedFiles.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Attached Media ({selectedFiles.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                  {selectedFiles.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        position: 'relative',
                        height: '100px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: '#111',
                        border: item.isValidated && !item.isValid ? '2px solid #ef4444' : '1px solid var(--border-subtle)',
                      }}
                    >
                      {item.type === 'video' ? (
                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                          <video
                            src={item.previewUrl}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            muted
                            playsInline
                          />
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '4px',
                              left: '4px',
                              background: 'rgba(0,0,0,0.7)',
                              color: 'white',
                              borderRadius: '4px',
                              padding: '2px 4px',
                              fontSize: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                          >
                            <Video size={10} />
                            <span>{formatFileSize(item.size)}</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                          <img
                            src={item.previewUrl}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '4px',
                              left: '4px',
                              background: item.isValidated && !item.isValid ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0,0,0,0.7)',
                              color: 'white',
                              borderRadius: '4px',
                              padding: '2px 4px',
                              fontSize: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            {item.isValidated && item.isValid ? (
                              <CheckCircle2 size={10} color="#34d399" />
                            ) : item.isValidated && !item.isValid ? (
                              <AlertCircle size={10} color="#ffffff" />
                            ) : (
                              <Loader2 size={10} className="animate-spin" />
                            )}
                            <span>{formatFileSize(item.size)}</span>
                          </div>
                        </div>
                      )}

                      {!isSubmitting && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedFile(item.id)}
                          title="Remove media"
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: 'rgba(239, 68, 68, 0.9)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '22px',
                            height: '22px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          }}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Authenticity Notice */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                background: 'rgba(5, 150, 105, 0.06)',
                borderRadius: '8px',
                border: '1px solid rgba(5, 150, 105, 0.15)',
                marginBottom: '12px',
                fontSize: '12px',
                color: 'var(--text-secondary, #475569)',
                lineHeight: 1.4,
              }}
            >
              <AlertCircle size={15} color="var(--brand-primary, #059669)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                <strong>Real animal photos/videos only:</strong> Posters, promotional graphics, and AI-generated images are not permitted.
              </span>
            </div>

            {/* Hidden File Inputs */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleFilesChosen(e.target.files)}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleFilesChosen(e.target.files)}
            />
            <input
              ref={deviceInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleFilesChosen(e.target.files)}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={(e) => handleFilesChosen(e.target.files)}
            />

            {/* Media Upload Buttons */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={isSubmitting}
                  onClick={() => photoInputRef.current?.click()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '12.5px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: '1px solid var(--border-subtle, #cbd5e1)',
                    background: 'var(--bg-secondary, #f1f5f9)',
                  }}
                >
                  <ImageIcon size={15} color="var(--brand-primary, #059669)" />
                  <span>Add Photo</span>
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  disabled={isSubmitting}
                  onClick={() => videoInputRef.current?.click()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '12.5px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: '1px solid var(--border-subtle, #cbd5e1)',
                    background: 'var(--bg-secondary, #f1f5f9)',
                  }}
                >
                  <Video size={15} color="var(--brand-primary, #059669)" />
                  <span>Add Video</span>
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  disabled={isSubmitting}
                  onClick={() => deviceInputRef.current?.click()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '12.5px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: '1px solid var(--border-subtle, #cbd5e1)',
                    background: 'var(--bg-secondary, #f1f5f9)',
                  }}
                >
                  <FileUp size={15} color="var(--brand-primary, #059669)" />
                  <span>Upload Device</span>
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  disabled={isSubmitting}
                  onClick={() => cameraInputRef.current?.click()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '12.5px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: '1px solid var(--border-subtle, #cbd5e1)',
                    background: 'var(--bg-secondary, #f1f5f9)',
                  }}
                >
                  <Camera size={15} />
                  <span>Camera</span>
                </button>
              </div>
            </div>

            {/* Tagged Location */}
            <div className="form-group" style={{ marginBottom: '4px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Tagged approximate location (e.g. Indiranagar, Central Park)"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle, #cbd5e1)',
                  }}
                />
                <MapPin size={15} color="var(--brand-primary, #059669)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              </div>
            </div>
          </div>

          {/* Sticky Footer with Publish Post & Cancel */}
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
                  <Loader2 size={15} className="animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : isValidatingFiles ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <span>Publish Post</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
