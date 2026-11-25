import React from 'react';

export default function LoadingState({ title, message }) {
  return (
    <div className="card empty-state loading-state" role="status" aria-live="polite">
      <span className="button-spinner" aria-hidden="true" />
      <h3>{title}</h3>
      <p className="muted">{message}</p>
    </div>
  );
}
