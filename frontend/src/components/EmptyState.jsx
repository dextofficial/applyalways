import React from 'react';

export default function EmptyState({ title, message }) {
  return (
    <div className="card empty-state" role="status">
      <span className="empty-icon" aria-hidden="true">⌕</span>
      <h3>{title}</h3>
      <p className="muted">{message}</p>
    </div>
  );
}
