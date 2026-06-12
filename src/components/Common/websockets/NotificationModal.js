import React, { useEffect, useRef } from 'react';
import './NotificationModal.css';
import { dateFormat } from '../Patterns/DatePattern';

const NotificationModal = ({ open, onClose, notifications, highlightedNotificationIds, onNotificationClick, loadMore, hasMore, loadingMore }) => {
    const listRef = useRef(null);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    useEffect(() => {
        const el = listRef.current;
        if (!el || typeof loadMore !== 'function') return;

        let ticking = false;
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const { scrollTop, clientHeight, scrollHeight } = el;
                const threshold = 120; // px from bottom to trigger
                if (scrollTop + clientHeight >= scrollHeight - threshold) {
                    if (hasMore && !loadingMore) {
                        loadMore();
                    }
                }
                ticking = false;
            });
        };

        el.addEventListener('scroll', onScroll);
        return () => el.removeEventListener('scroll', onScroll);
    }, [loadMore, hasMore, loadingMore]);

    if (!open) return null;

    return (
        <div className="notification-modal" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <span className="close" onClick={onClose}>&times;</span>
                <h2>Notifications</h2>
                <ul className="notification-list" ref={listRef} style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {notifications.map((notification) => (
                        <li
                            key={notification.id}
                            className={`notification notification-${notification.id} ${highlightedNotificationIds.includes(notification.id) ? 'highlighted' : ''} clickable`}
                            onClick={() => typeof onNotificationClick === 'function' && onNotificationClick(notification)}
                            role="button"
                            tabIndex={0}
                            style={{ cursor: "pointer" }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); typeof onNotificationClick === 'function' && onNotificationClick(notification); } }}
                        >
                            <p className="notification-title">{notification.title}</p>
                            <p className="notification-message">{notification.message} <strong>{notification.createdBy}</strong></p>
                            <p className="notification-date">{dateFormat(notification.createdAt)}</p>
                        </li>
                    ))}
                    {loadingMore && (
                        <li className="notification-loading">Ładowanie...</li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default NotificationModal;
