import React, { useEffect, useState, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { useNavigate } from 'react-router-dom';
import NotificationModal from './NotificationModal';
import { markNotificationAsRead, getUserNotifications } from '../Request/Notifications';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8080';

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
    const pendingSubscribeRef = useRef(null);
    const subscriptionRef = useRef(null);
    const isMountedRef = useRef(true);

    const loggedInId = localStorage.getItem('userId');
    const effectiveUserId = (userId && userId === loggedInId) ? userId : loggedInId;

    useEffect(() => { modalOpenRef.current = modalOpen; }, [modalOpen]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    useEffect(() => {
        const client = new Client({
            brokerURL: `${WS_URL}/ws`,
            debug: () => {},
            onConnect: () => {
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
            onWebSocketError: (error) => {
                console.error('WebSocket error:', error);
            },
            onDisconnect: () => {
                console.warn('WebSocket disconnected');
            },
        });

        clientRef.current = client;
        client.activate();

        return () => {
            if (clientRef.current) {
                try { clientRef.current.deactivate(); } catch (e) { /* ignore */ }
                clientRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (open) {
            setModalOpen(true);
            fetchNotifications(effectiveUserId, 0, limit, false);
        } else {
            setModalOpen(false);
            setHighlightedNotificationIds([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (!effectiveUserId || !clientRef.current) return;

        if (subscriptionRef.current) {
            try { subscriptionRef.current.unsubscribe(); } catch (e) { /* ignore */ }
            subscriptionRef.current = null;
        }

        const doSubscribe = () => {
            try {
                subscriptionRef.current = clientRef.current.subscribe(
                    `/topic/notifications/${effectiveUserId}`,
                    (message) => {
                        if (!isMountedRef.current) return;
                        try {
                            const notification = JSON.parse(message.body);
                            setNotifications(prev => {
                                const updated = [notification, ...prev];
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
                pendingSubscribeRef.current = doSubscribe;
            }
        };

        try {
            doSubscribe();
        } catch (err) {
            pendingSubscribeRef.current = doSubscribe;
        }

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
    };

    const handleNotificationClick = async (notification) => {
        if (!notification) return;
        try {
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
            setHighlightedNotificationIds(prev => prev.filter(id => id !== notification.id));
            try { await markNotificationAsRead(notification.id); } catch (e) { /* ignore */ }
        } catch (e) {
            console.error('Error marking notification read', e);
        }
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
                setNotifications([]);
                setHasMore(true);
                setOffset(0);
            }

            const data = await getUserNotifications(uid, off, lim);
            if (!isMountedRef.current) return;

            const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];

            if (append) {
                setNotifications(prev => [...prev, ...arr]);
            } else {
                setNotifications(arr);
            }

            if (!append && modalOpenRef.current) {
                const unread = arr.filter(n => !n.read);
                if (unread.length > 0) {
                    setHighlightedNotificationIds(prev => {
                        const ids = unread.map(n => n.id);
                        return Array.from(new Set([...(prev || []), ...ids]));
                    });
                    unread.forEach(n => { markNotificationAsRead(n.id).catch(() => {}); });
                }
            }

            if (typeof data?.hasNext === 'boolean') {
                const newOffset = typeof data?.nextOffset === 'number' ? data.nextOffset : off + arr.length;
                setOffset(newOffset);
                setHasMore(Boolean(data.hasNext));
            } else if (data?.meta) {
                const totalItems = data.meta.totalItems ?? (append ? notifications.length + arr.length : arr.length);
                const newOffset = off + arr.length;
                setOffset(newOffset);
                setHasMore(newOffset < totalItems);
            } else {
                const newOffset = off + arr.length;
                setOffset(newOffset);
                setHasMore(arr.length === lim);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

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
