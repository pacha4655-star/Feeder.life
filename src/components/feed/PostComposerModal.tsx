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

    // 1. Reject dangerous extensions
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
        error: 'Unsupported file type. Only JPEG, PNG, WebP, GIF, MP4, and WebM are permitted.',
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

  // Handle files chosen from any picker (photo, video, device, or camera)
  const handleFilesChosen = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError('');

    const newItems: LocalMediaItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = validateFileLocally(file);

      if (!validation.valid) {
        setError(validation.error || 'Invalid file selected');
        return; // stop and display the error
      }

      // Safe local object URL for preview before upload
      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        file,
        previewUrl,
        type: validation.type,
        name: file.name,
        size: file.size,
      });
    }

    setSelectedFiles((prev) => [...prev, ...newItems]);

    // Reset inputs so the same file can be re-selected if removed
    if (photoInputRef.current) photoInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
    if (deviceInputRef.current) deviceInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleRemoveSelectedFile = (id: string) => {
    const itemToRemove = selectedFiles.find((f) => f.id === id);
    if (itemToRemove) {
      try {
        URL.revokeObjectURL(itemToRemove.previewUrl);
      } catch {}
    }
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return; // Prevent double clicks

    if (!body.trim()) {
      setError('Please write something to share.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setUploadStatus('Preparing upload...');

    try {
      const uploadedUrls: string[] = [];

      // Step 1: Upload real media files to Supabase Storage sequentially
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

      // Clean up object URLs upon successful publication
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

  return (
    <div className="modal-overlay" onClick={handleModalClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileUp size={18} color="var(--brand-primary)" />
            <span>Create Animal Welfare Post</span>
          </div>
          <button className="modal-close-btn" onClick={handleModalClose} disabled={isSubmitting} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* User & Audience Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <img src={user.avatarUrl || '/avatars/default.png'} alt="" className="avatar-img" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>{user.fullName}</div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '3px' }}>
                  <select
                    className="form-select"
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    disabled={isSubmitting}
                    style={{ padding: '2px 8px', fontSize: '12px', width: 'auto' }}
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
                    style={{ padding: '2px 8px', fontSize: '12px', width: 'auto' }}
                  >
                    <option value="NORMAL">Standard Post</option>
                    <option value="FEEDING_UPDATE">🐾 Feeding Update</option>
                    <option value="HELP_REQUEST">🚨 Help Request</option>
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  background: '#fee2e2',
                  color: '#b91c1c',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  fontSize: '13px',
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
                  padding: '10px 12px',
                  background: 'rgba(5, 150, 105, 0.1)',
                  color: 'var(--brand-primary, #059669)',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <Loader2 size={16} className="animate-spin" style={{ flexShrink: 0 }} />
                <span>{uploadStatus}</span>
              </div>
            )}

            {/* Post Title (optional) */}
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Give your update a title (e.g. Morning Stray Pack Fed)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* Post Body */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder={`What animal welfare work or observation would you like to share, ${user.fullName.split(' ')[0]}?`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Local Previews Grid */}
            {selectedFiles.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Selected Media ({selectedFiles.length}) &bull; Uploads when you click Publish
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
                        border: '1px solid var(--border-subtle)',
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
                              background: 'rgba(0,0,0,0.7)',
                              color: 'white',
                              borderRadius: '4px',
                              padding: '2px 4px',
                              fontSize: '10px',
                            }}
                          >
                            {formatFileSize(item.size)}
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

            {/* Real Media Authenticity Warning / Instruction */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                background: 'rgba(5, 150, 105, 0.08)',
                borderRadius: '8px',
                border: '1px solid rgba(5, 150, 105, 0.2)',
                marginBottom: '14px',
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

            {/* Real File Pickers (Hidden Inputs) */}
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
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* 1. Add Photo */}
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={isSubmitting}
                  onClick={() => photoInputRef.current?.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '13px' }}
                >
                  <ImageIcon size={16} color="var(--brand-primary, #059669)" />
                  <span>Add Photo</span>
                </button>

                {/* 2. Add Video */}
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={isSubmitting}
                  onClick={() => videoInputRef.current?.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '13px' }}
                >
                  <Video size={16} color="var(--brand-primary, #059669)" />
                  <span>Add Video</span>
                </button>

                {/* 3. Upload from device */}
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={isSubmitting}
                  onClick={() => deviceInputRef.current?.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '13px' }}
                >
                  <FileUp size={16} color="var(--brand-primary, #059669)" />
                  <span>Upload from device</span>
                </button>

                {/* 4. Camera */}
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={isSubmitting}
                  onClick={() => cameraInputRef.current?.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '13px' }}
                >
                  <Camera size={16} />
                  <span>Camera</span>
                </button>
              </div>
            </div>

            {/* Tagged Location */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Tagged approximate location (e.g. Indiranagar, Anna Nagar, Central Park)"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  disabled={isSubmitting}
                  style={{ paddingLeft: '32px' }}
                />
                <MapPin size={16} color="var(--brand-primary)" style={{ position: 'absolute', left: '10px', top: '12px' }} />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleModalClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '120px', justifyContent: 'center' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Publishing...</span>
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
