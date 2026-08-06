'use client';

import { useState } from 'react';

type CheckoutButtonProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  plan?: 'pro' | 'team';
};

export default function CheckoutButton({ children, className, style, plan }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startCheckout = async () => {
    setError('Plan upgrades are coming soon. Pro and Team tiers will be available after the beta launch.');
  };

  return (
    <div style={{ width: '100%' }}>
      <button
        className={className}
        style={style}
        type="button"
        onClick={startCheckout}
        disabled={loading}
      >
        {loading ? 'Opening Stripe...' : children}
      </button>
      {error && (
        <p style={{ color: '#fca5a5', fontSize: '12px', textAlign: 'center', marginTop: '10px' }}>
          {error}
        </p>
      )}
    </div>
  );
}
