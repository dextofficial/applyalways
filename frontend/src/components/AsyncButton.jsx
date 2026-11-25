import React from 'react';

export default function AsyncButton({
  loading,
  loadingText = 'Working…',
  className = 'btn',
  disabled,
  children,
  ...props
}) {
  return (
    <button
      {...props}
      className={className}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <><span className="button-spinner" aria-hidden="true" />{loadingText}</> : children}
    </button>
  );
}
