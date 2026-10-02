'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  ShieldCheck,
  FileText,
  DollarSign,
  Plus,
  Receipt,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  ExternalLink,
  Info,
} from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';

interface MedicalFundraisingSectionProps {
  sosId: string;
  user: UserSession | null;
  isReporterOrStaff: boolean;
}

export default function MedicalFundraisingSection({
  sosId,
  user,
  isReporterOrStaff,
}: MedicalFundraisingSectionProps) {
  const [campaign, setCampaign] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Pledge modal
  const [isPledgeModalOpen, setIsPledgeModalOpen] = useState(false);
  const [pledgeAmount, setPledgeAmount] = useState(500);
  const [pledgeNote, setPledgeNote] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmittingPledge, setIsSubmittingPledge] = useState(false);
  const [pledgeSuccess, setPledgeSuccess] = useState(false);

  // Upload receipt modal
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptTitle, setReceiptTitle] = useState('Emergency Surgery & X-Ray Invoice');
  const [receiptAmount, setReceiptAmount] = useState(2500);
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState('');

  // Create Campaign Modal
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [targetAmount, setTargetAmount] = useState(6000);
  const [clinicName, setClinicName] = useState('CUPA Small Animal Hospital & Trauma Care');
  const [vetDoctorName, setVetDoctorName] = useState('Dr. Priya Sharma (BVSc & AH)');
  const [costItems, setCostItems] = useState([
    { item: 'Emergency Surgery & Wound Debridement', cost: 3500 },
    { item: 'Digital Radiography (X-Ray)', cost: 1200 },
    { item: 'Antibiotic Injections & Post-Op Medications', cost: 1300 },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCampaign = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sos/${sosId}/campaign`);
      const data = await res.json();
      if (data.success) {
        setCampaign(data.campaign);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaign();
  }, [sosId]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const res = await fetch(`/api/sos/${sosId}/campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAmount,
          clinicName,
          vetDoctorName,
          costBreakdown: costItems,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateCampaignOpen(false);
        fetchCampaign();
      }
    } catch {
      // ignore
    }
  };

  const handlePledgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      window.location.href = '/login';
      return;
    }
    setIsSubmittingPledge(true);

    try {
      const res = await fetch(`/api/sos/${sosId}/campaign/pledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: pledgeAmount,
          note: pledgeNote,
          isAnonymous,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPledgeSuccess(true);
        setTimeout(() => {
          setPledgeSuccess(false);
          setIsPledgeModalOpen(false);
          fetchCampaign();
        }, 1800);
      }
    } catch {
      // ignore
    } finally {
      setIsSubmittingPledge(false);
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setReceiptError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload?category=receipts', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setReceiptPhotoUrl(data.url);
      } else {
        setReceiptError('Failed to upload invoice photo');
      }
    } catch {
      setReceiptError('Upload failed');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !receiptPhotoUrl) {
      setReceiptError('Please upload the clinic bill receipt photo.');
      return;
    }
    setIsSubmittingReceipt(true);

    try {
      const res = await fetch(`/api/sos/${sosId}/campaign/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptTitle,
          amount: receiptAmount,
          photoUrl: receiptPhotoUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsReceiptModalOpen(false);
        setReceiptPhotoUrl('');
        fetchCampaign();
      }
    } catch {
      // ignore
    } finally {
      setIsSubmittingReceipt(false);
    }
  };

  if (isLoading) {
    return null;
  }

  const campaignData = campaign?.data || {};
  const target = Number(campaignData.target_amount) || 5000;
  const raised = Number(campaignData.amount_raised) || 0;
  const percentage = Math.min(100, Math.round((raised / target) * 100));
  const receipts: any[] = Array.isArray(campaignData.receipts) ? campaignData.receipts : [];
  const pledges: any[] = Array.isArray(campaignData.pledges) ? campaignData.pledges : [];
  const costBreakdown: any[] = Array.isArray(campaignData.cost_breakdown) ? campaignData.cost_breakdown : [];

  return (
    <div
      className="card"
      style={{
        padding: '22px',
        borderRadius: '16px',
        marginBottom: '20px',
        border: '1px solid #BAE6FD',
        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.04) 0%, rgba(16, 185, 129, 0.04) 100%)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Medical Emergency Treatment Fund
            </h3>
            <span style={{ fontSize: '11.5px', color: '#0369A1', fontWeight: 600 }}>
              Verified Vet Clinic Ledger & Transparency Escrow
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {campaign ? (
            <>
              <button
                className="btn-primary"
                onClick={() => {
                  if (!user) window.location.href = '/login';
                  else setIsPledgeModalOpen(true);
                }}
                style={{ padding: '7px 16px', fontSize: '13px', background: '#0284C7', borderColor: '#0284C7' }}
              >
                <Heart size={14} fill="#fff" />
                <span>Pledge Medical Support</span>
              </button>

              {isReporterOrStaff && (
                <button
                  className="btn-secondary"
                  onClick={() => setIsReceiptModalOpen(true)}
                  style={{ padding: '7px 12px', fontSize: '12.5px' }}
                >
                  <Plus size={14} />
                  <span>Upload Clinic Bill</span>
                </button>
              )}
            </>
          ) : (
            isReporterOrStaff && (
              <button
                className="btn-primary"
                onClick={() => setIsCreateCampaignOpen(true)}
                style={{ padding: '7px 16px', fontSize: '13px', background: '#0284C7', borderColor: '#0284C7' }}
              >
                <Plus size={14} />
                <span>Initiate Medical Fund</span>
              </button>
            )
          )}
        </div>
      </div>

      {!campaign ? (
        <div style={{ textAlign: 'center', padding: '16px 10px', color: 'var(--text-muted)', fontSize: '13px' }}>
          No public medical fund has been attached to this emergency. Responders or reporters can initialize an itemized clinic ledger.
        </div>
      ) : (
        <div>
          {/* Progress Bar & Financial Status */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <div>
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#0284C7' }}>
                  ₹{raised.toLocaleString()}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}> raised of ₹{target.toLocaleString()} estimated target</span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#0369A1' }}>
                {percentage}% Funded
              </span>
            </div>

            <div style={{ width: '100%', height: '10px', background: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${percentage}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #0EA5E9 0%, #10B981 100%)',
                  borderRadius: '9999px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Verified Clinic Badge */}
          <div
            style={{
              padding: '10px 14px',
              background: '#F0FDF4',
              borderRadius: '10px',
              border: '1px solid #BBF7D0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              fontSize: '12.5px',
              color: '#166534',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} color="#15803D" />
              <span>
                <strong>Attending Clinic:</strong> {campaignData.clinic_name} {campaignData.vet_doctor_name && `(${campaignData.vet_doctor_name})`}
              </span>
            </div>
            <span style={{ fontSize: '11px', background: '#DCFCE7', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
              ✓ Verified Clinic Ledger
            </span>
          </div>

          {/* Itemized Cost Breakdown Table */}
          {costBreakdown.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '13.5px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                Itemized Medical Estimate Breakdown
              </h4>
              <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                {costBreakdown.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 14px',
                      fontSize: '12.5px',
                      borderBottom: idx !== costBreakdown.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    }}
                  >
                    <span>{item.item}</span>
                    <strong>₹{Number(item.cost).toLocaleString()}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Uploaded Clinic Invoices & Receipts */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '13.5px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
              Uploaded Invoices & Bills ({receipts.length})
            </h4>

            {receipts.length === 0 ? (
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px' }}>
                No hospital receipts uploaded yet. Responders will attach itemized vet invoices upon discharge.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                {receipts.map((rec) => (
                  <div
                    key={rec.id}
                    style={{
                      padding: '10px',
                      background: 'var(--bg-card)',
                      borderRadius: '10px',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '2px' }}>{rec.title}</div>
                    <div style={{ fontSize: '12px', color: '#0284C7', fontWeight: 800 }}>₹{Number(rec.amount).toLocaleString()}</div>
                    {rec.photo_url && (
                      <img
                        src={rec.photo_url}
                        alt="Bill Receipt"
                        style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '6px', marginTop: '6px' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Community Pledges List */}
          {pledges.length > 0 && (
            <div>
              <h4 style={{ fontSize: '13.5px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                Community Supporters ({pledges.length})
              </h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {pledges.slice(-6).map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-secondary)',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{p.user_name}:</span>
                    <strong style={{ color: '#059669' }}>₹{p.amount}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Escrow Disclaimer */}
          <div
            style={{
              marginTop: '16px',
              padding: '8px 12px',
              background: 'rgba(2, 132, 199, 0.06)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: '#0369A1',
            }}
          >
            <Info size={14} style={{ flexShrink: 0 }} />
            <span>
              <strong>Direct Clinic Escrow Protocol:</strong> Community pledges are matched directly against hospital invoices. Feeder.life does not deduct platform cuts from emergency medical care.
            </span>
          </div>
        </div>
      )}

      {/* Pledge Modal */}
      {isPledgeModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPledgeModalOpen(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px', padding: '24px', borderRadius: '16px' }}
          >
            <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '12px' }}>
              Pledge Medical Care Support
            </h3>

            {pledgeSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#059669' }}>
                <CheckCircle2 size={36} style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontWeight: 800, fontSize: '15px' }}>Pledge Recorded!</div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  Thank you for helping fund this emergency recovery.
                </p>
              </div>
            ) : (
              <form onSubmit={handlePledgeSubmit}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                    Pledge Amount (₹)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '8px' }}>
                    {[250, 500, 1000, 2500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPledgeAmount(amt)}
                        style={{
                          padding: '6px',
                          borderRadius: '8px',
                          border: pledgeAmount === amt ? '2px solid #0284C7' : '1px solid var(--border-subtle)',
                          background: pledgeAmount === amt ? '#E0F2FE' : 'var(--bg-card)',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={50}
                    max={100000}
                    className="input"
                    value={pledgeAmount}
                    onChange={(e) => setPledgeAmount(parseInt(e.target.value, 10) || 100)}
                    required
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                    Words of Encouragement (Optional)
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Get well soon brave puppy!"
                    value={pledgeNote}
                    onChange={(e) => setPledgeNote(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                  <input
                    type="checkbox"
                    id="isAnon"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    style={{ accentColor: '#0284C7', cursor: 'pointer' }}
                  />
                  <label htmlFor="isAnon" style={{ fontSize: '12px', cursor: 'pointer' }}>
                    Display pledge anonymously
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setIsPledgeModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={isSubmittingPledge} style={{ background: '#0284C7', borderColor: '#0284C7' }}>
                    {isSubmittingPledge ? 'Recording...' : 'Confirm Pledge'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Upload Invoice Receipt Modal */}
      {isReceiptModalOpen && (
        <div className="modal-overlay" onClick={() => setIsReceiptModalOpen(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', padding: '24px', borderRadius: '16px' }}
          >
            <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '12px' }}>
              Upload Clinic Invoice / Bill Receipt
            </h3>

            {receiptError && (
              <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '8px 12px', borderRadius: '8px', fontSize: '12.5px', marginBottom: '12px' }}>
                {receiptError}
              </div>
            )}

            <form onSubmit={handleReceiptSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                  Invoice Title *
                </label>
                <input
                  type="text"
                  className="input"
                  value={receiptTitle}
                  onChange={(e) => setReceiptTitle(e.target.value)}
                  placeholder="e.g. Day 1 Surgery Bill, X-Ray & Antibiotics"
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                  Invoice Billed Amount (₹) *
                </label>
                <input
                  type="number"
                  min={1}
                  className="input"
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(parseInt(e.target.value, 10) || 0)}
                  required
                />
              </div>

              {/* Photo Upload */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                  Invoice Photo / PDF Snapshot *
                </label>
                {receiptPhotoUrl ? (
                  <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden' }}>
                    <img src={receiptPhotoUrl} alt="Receipt preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => setReceiptPhotoUrl('')}
                      style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer' }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1.5px dashed var(--border-subtle)',
                      background: 'var(--bg-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                    }}
                  >
                    {isUploadingPhoto ? <Loader2 size={16} className="spin" /> : <Camera size={16} />}
                    <span>{isUploadingPhoto ? 'Uploading invoice...' : 'Upload Bill Photo'}</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleReceiptUpload}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsReceiptModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmittingReceipt}>
                  {isSubmittingReceipt ? 'Publishing...' : 'Publish to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Initialize Campaign Modal */}
      {isCreateCampaignOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateCampaignOpen(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', padding: '24px', borderRadius: '16px' }}
          >
            <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '12px' }}>
              Initiate Medical Fund for SOS Case
            </h3>

            <form onSubmit={handleCreateCampaign}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                  Target Medical Estimate (₹) *
                </label>
                <input
                  type="number"
                  min={500}
                  className="input"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(parseInt(e.target.value, 10) || 5000)}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                  Attending Veterinary Clinic *
                </label>
                <input
                  type="text"
                  className="input"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="e.g. CUPA Small Animal Hospital"
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                  Attending Vet Doctor (Optional)
                </label>
                <input
                  type="text"
                  className="input"
                  value={vetDoctorName}
                  onChange={(e) => setVetDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Ramesh (BVSc)"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsCreateCampaignOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ background: '#0284C7', borderColor: '#0284C7' }}>
                  Create Verified Fund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
