import React, { useEffect, useState, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { useNavigate } from 'react-router-dom';
import NotificationModal from './NotificationModal';
import { markNotificationAsRead, getUserNotifications } from '../Request/Notifications';

const NotificationComponent = ({ userId, open, onClose, setNotificationCount }) => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [highlightedNotificationIds, setHighlightedNotificationIds] = useState([]);
    const [offset, setOffset] = useState(0);
    const limit = 20;
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const modalOpenRef = useRef(modalOpen);
    const clientRef = useRef(null);
    const pendingSubscribeRef = useRef(null); // function to run when client connects
    const subscriptionRef = useRef(null); // current subscription object

    // logged-in user id
    const loggedInId = localStorage.getItem('userId');
    // if parent passed a userId different than logged in, ignore it (show only own notifications)
    const effectiveUserId = (userId && userId === loggedInId) ? userId : loggedInId;

    useEffect(() => { modalOpenRef.current = modalOpen; }, [modalOpen]);

    // -- create single websocket client on mount, deactivate on unmount --
    useEffect(() => {
        const client = new Client({
            brokerURL: 'ws://localhost:8080/ws',
            debug: () => {},
            onConnect: () => {
                // if there's a pending subscribe action, run it now
                if (typeof pendingSubscribeRef.current === 'function') {
                    try {
                        pendingSubscribeRef.current();
                    } catch (err) {
                        console.error('Pending subscribe failed', err);
                    }
                    pendingSubscribeRef.current = null;
                }
            },
            onStompError: (frame) => {
                console.error('Broker error:', frame.headers?.message);
                if (frame.headers?.message && frame.headers.message.includes('Unauthorized')) {
                    window.location = '/login';
                }
            },
        });

        clientRef.current = client;
        client.activate();

        return () => {
            // only deactivate when component unmounts
            if (clientRef.current) {
                try { clientRef.current.deactivate(); } catch (e) { /* ignore */ }
                clientRef.current = null;
            }
        };
    }, []); // run once

    // sync internal modal state with external `open` prop (unchanged behaviour)
    useEffect(() => {
        if (open) {
            setModalOpen(true);
            // fetch first page
            fetchNotifications(effectiveUserId, 0, limit, false);
        } else {
            setModalOpen(false);
            setHighlightedNotificationIds([]);
        }
    }, [open]);

    // -- subscribe/unsubscribe when effectiveUserId changes, WITHOUT deactivating client --
    useEffect(() => {
        if (!effectiveUserId || !clientRef.current) return;

        // unsubscribe previous subscription if any
        if (subscriptionRef.current) {
            try { subscriptionRef.current.unsubscribe(); } catch (e) { /* ignore */ }
            subscriptionRef.current = null;
        }

        const doSubscribe = () => {
            try {
                subscriptionRef.current = clientRef.current.subscribe(
                    `/topic/notifications/${effectiveUserId}`,
                    (message) => {
                        try {
                            const notification = JSON.parse(message.body);
                            setNotifications(prev => {
                                // prepend incoming notification so newest appears first
                                const updated = [notification, ...prev];
                                 // if modal is open, highlight and mark
                                 if (modalOpenRef.current && !notification.read) {
                                     setHighlightedNotificationIds(prevIds => {
                                         if (!prevIds.includes(notification.id)) return [...prevIds, notification.id];
                                         return prevIds;
                                     });
                                     markNotificationAsRead(notification.id).catch(() => {});
                                 }
                                 return updated;
                             });
                        } catch (err) { console.error('Invalid notification message', err); }
                    }
                );
            } catch (err) {
                // probably not connected yet -> queue subscribe for onConnect
                pendingSubscribeRef.current = doSubscribe;
            }
        };

        // try to subscribe immediately, or queue if client not connected
        try {
            doSubscribe();
        } catch (err) {
            pendingSubscribeRef.current = doSubscribe;
        }

        // cleanup: unsubscribe only, do NOT deactivate client
        return () => {
            if (subscriptionRef.current) {
                try { subscriptionRef.current.unsubscribe(); } catch (e) { /* ignore */ }
                subscriptionRef.current = null;
            }
            pendingSubscribeRef.current = null;
        };
    }, [effectiveUserId]);

    useEffect(() => {
        if (typeof setNotificationCount === 'function') {
            setNotificationCount(notifications.filter(n => !n.read).length);
        }
    }, [notifications, setNotificationCount]);

    const closeModal = () => {
        setModalOpen(false);
        if (typeof onClose === 'function') onClose();
        // reset notification badge on header bell
        if (typeof setNotificationCount === 'function') {
            setNotificationCount(0);
        }
    };

    const handleNotificationClick = async (notification) => {
        if (!notification) return;
        try {
            // optimistically mark read locally
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
            setHighlightedNotificationIds(prev => prev.filter(id => id !== notification.id));
            // inform backend
            try { await markNotificationAsRead(notification.id); } catch (e) { /* ignore */ }
        } catch (e) {
            console.error('Error marking notification read', e);
        }
        // close modal then navigate
        closeModal();
        const target = notification.targetUrl || notification.targetURL || notification.url || '';
        if (!target) return;
        let url = String(target);
        if (!url.startsWith('http') && !url.startsWith('/')) url = '/' + url;
        navigate(url);
    };

    const fetchNotifications = async (uid, off = 0, lim = limit, append = false) => {
        if (!uid) return;
        try {
            if (!append) {
                // initial load - reset
                setNotifications([]);
                setHasMore(true);
                setOffset(0);
            }

            const data = await getUserNotifications(uid, off, lim);

            // items array handling (backwards compatible)
            const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];

            if (append) {
                setNotifications(prev => [...prev, ...arr]);
            } else {
                setNotifications(arr);
            }

            // Jeśli to pierwsze ładowanie (nie append) i modal jest otwarty, oznacz nieprzeczytane natychmiast
            if (!append && modalOpenRef.current) {
                const unread = arr.filter(n => !n.read);
                if (unread.length > 0) {
                    setHighlightedNotificationIds(prev => {
                        const ids = unread.map(n => n.id);
                        // dodaj nowe idów unikając duplikatów
                        return Array.from(new Set([...(prev || []), ...ids]));
                    });
                    // oznacz na backendzie (fire-and-forget)
                    unread.forEach(n => { markNotificationAsRead(n.id).catch(() => {}); });
                }
            }

            // New backend shape: { items, hasNext, nextOffset }
            if (typeof data?.hasNext === 'boolean') {
                const newOffset = typeof data?.nextOffset === 'number' ? data.nextOffset : off + arr.length;
                setOffset(newOffset);
                setHasMore(Boolean(data.hasNext));
            } else if (data?.meta) {
                // Old backend shape: meta.totalItems / meta.currentPage / meta.pageSize
                const totalItems = data.meta.totalItems ?? (append ? (notifications.length + arr.length) : arr.length);
                const newOffset = off + arr.length;
                setOffset(newOffset);
                setHasMore(newOffset < totalItems);
            } else {
                // Fallback: use length-based offset
                const newOffset = off + arr.length;
                setOffset(newOffset);
                setHasMore(arr.length === lim); // if received full page, assume more
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    // load more handler (infinite scroll)
    const loadMore = async () => {
        if (!effectiveUserId || loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            await fetchNotifications(effectiveUserId, offset, limit, true);
        } finally {
            setLoadingMore(false);
        }
    };

    return modalOpen ? (
        <NotificationModal
            open={modalOpen}
            onClose={closeModal}
            notifications={notifications}
            highlightedNotificationIds={highlightedNotificationIds}
            onNotificationClick={handleNotificationClick}
            loadMore={loadMore}
            hasMore={hasMore}
            loadingMore={loadingMore}
        />
    ) : null;
};

export default NotificationComponent;
