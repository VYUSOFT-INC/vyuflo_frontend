// src/components/common/ComingSoonModal.tsx
//
// Usage: drop anywhere, controlled by open/onClose
//
// <ComingSoonModal
//   open={showComingSoon}
//   onClose={() => setShowComingSoon(false)}
//   feature="Book Consultation"
//   eta="August 2025"                  // optional
//   description="Schedule 1-on-1 sessions with immigration attorneys directly through VisaFlow."
// />

import { X, Clock, Bell } from 'lucide-react';
import { useState } from 'react';

interface ComingSoonModalProps {
  open: boolean;
  onClose: () => void;
  feature?: string;
  description?: string;
  eta?: string;
}

export function ComingSoonModal({
  open,
  onClose,
  feature = 'This feature',
  description = "We're putting the finishing touches on it. You'll be notified as soon as it's ready.",
  eta,
}: ComingSoonModalProps) {
  const [notified, setNotified] = useState(false);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)',
          zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}
      >
        {/* Modal card */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 380, backgroundColor: '#fff',
            borderRadius: 18, padding: '28px 24px', fontFamily: 'Inter, sans-serif',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            position: 'relative',
          }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 14, right: 14,
              width: 30, height: 30, borderRadius: 9,
              border: 'none', background: '#f1f5f9',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#64748b',
            }}
            aria-label="Close"
          >
            <X size={14} />
          </button>

          {/* Icon */}
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #eef2ff 0%, #ede9fe 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            <Clock size={26} color="#6366f1" />
          </div>

          {/* Text */}
          <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6366f1', marginBottom: 6 }}>
            Coming soon
          </p>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px', lineHeight: '24px', marginBottom: 8 }}>
            {feature}
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: '19px', letterSpacing: '-0.3px', marginBottom: eta ? 10 : 20 }}>
            {description}
          </p>

          {eta && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 8,
              background: '#f0fdf4', marginBottom: 20,
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>Expected: {eta}</span>
            </div>
          )}

          {/* CTA */}
          {!notified ? (
            <button
              onClick={() => setNotified(true)}
              style={{
                width: '100%', height: 42, borderRadius: 11, border: 'none',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                letterSpacing: '-0.3px',
              }}
            >
              <Bell size={14} /> Notify me when it's ready
            </button>
          ) : (
            <div style={{
              width: '100%', height: 42, borderRadius: 11,
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>
                ✓ You'll be notified!
              </span>
            </div>
          )}

          <button
            onClick={onClose}
            style={{
              display: 'block', width: '100%', marginTop: 10,
              textAlign: 'center', fontSize: 12, color: '#94a3b8',
              background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '-0.3px',
            }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </>
  );
}