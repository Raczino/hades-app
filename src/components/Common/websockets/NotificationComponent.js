import React, { useEffect, useState, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import NotificationModal from './NotificationModal';
import { markNotificationAsRead, getUserNotifications } from '../Request/Notifications';

const NotificationComponent = ({ userId, open, onClose, setNotificationCount }) => {
    const [notifications, setNotifications] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [highlightedNotificationIds, setHighlightedNotificationIds] = useState([]);
    const modalOpenRef = useRef(modalOpen);
    const clientRef = useRef(null);

    // logged-in user id
    const loggedInId = localStorage.getItem('userId');
    // if parent passed a userId different than logged in, ignore it (show only own notifications)
    const effectiveUserId = (userId && userId === loggedInId) ? userId : loggedInId;

    useEffect(() => { modalOpenRef.current = modalOpen; }, [modalOpen]);

    // sync internal modal state with external `open` prop
    useEffect(() => {
        if (open) {
            setModalOpen(true);
            // mark unread as read when opening
            const unread = notifications.filter(n => !n.read);
            setHighlightedNotificationIds(unread.map(n => n.id));
            unread.forEach(n => { markNotificationAsRead(n.id).catch(() => {}); });
        } else {
            setModalOpen(false);
            setHighlightedNotificationIds([]);
        }
    }, [open]);

    const fetchNotifications = async (uid) => {
        if (!uid) return;
        try {
            const data = await getUserNotifications(uid);
            const arr = Array.isArray(data) ? data : (data?.items || []);
            setNotifications(arr);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    useEffect(() => {
        if (!effectiveUserId) return;

        fetchNotifications(effectiveUserId);

        // cleanup previous client if any
        if (clientRef.current) {
            try { clientRef.current.deactivate(); } catch (e) { }
            clientRef.current = null;
        }

        const client = new Client({
            brokerURL: 'ws://localhost:8080/ws',
            debug: () => {},
            onConnect: () => {
                try {
                    client.subscribe(`/topic/notifications/${effectiveUserId}`, (message) => {
                        try {
                            const notification = JSON.parse(message.body);
                            setNotifications(prev => {
                                const updated = [...prev, notification];
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
                    });
                } catch (err) { console.error('Failed to subscribe', err); }
            },
            onStompError: (frame) => {
                console.error('Broker error:', frame.headers?.message);
                if (frame.headers?.message && frame.headers.message.includes('Unauthorized')) {
                    window.location = '/login';
                }
            }
        });

        clientRef.current = client;
        client.activate();

        return () => {
            if (clientRef.current) {
                try { clientRef.current.deactivate(); } catch (e) { }
                clientRef.current = null;
            }
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

    return modalOpen ? (
        <NotificationModal
            open={modalOpen}
            onClose={closeModal}
            notifications={notifications}
            highlightedNotificationIds={highlightedNotificationIds}
        />
    ) : null;
};

export default NotificationComponent;
