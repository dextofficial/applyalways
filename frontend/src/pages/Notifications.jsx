import React, { useEffect, useState } from 'react';
import { api, dateTime } from '../api.js';
import { useMe } from '../App.jsx';

export default function Notifications() {
  const [items, setItems] = useState([]);
  const { refresh } = useMe();
  useEffect(() => {
    api('/notifications').then(async (d) => { setItems(d.items); await api('/notifications/read-all', { method: 'POST' }); refresh(); });
  }, []); // eslint-disable-line
  return (
    <>
      <header className="page-heading">
        <span className="eyebrow">STAY IN THE LOOP</span><h1>Alerts</h1>
        <p className="muted">Updates about your applications and account.</p>
      </header>
      {items.length === 0 && <div className="card empty-state"><span className="empty-icon" aria-hidden="true">◷</span><h3>No alerts yet</h3><p className="muted">Important updates will show up here.</p></div>}
      <div className="notification-timeline">
      {items.map((n) => (
        <div className={'card notification-item' + (n.read ? '' : ' unread')} key={n._id}>
          <span className="timeline-dot" aria-hidden="true" />
          <b>{n.title}</b>
          <p>{n.message}</p>
          <span className="muted small-text">{dateTime(n.createdAt)}</span>
        </div>
      ))}
      </div>
    </>
  );
}
