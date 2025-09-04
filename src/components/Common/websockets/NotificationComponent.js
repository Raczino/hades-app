import React, { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import NotificationModal from './NotificationModal';
import { markNotificationAsRead, getUserNotifications } from '../Request/Notifications';

const NotificationComponent = ({ userId, open, onClose, setNotificationCount }) => {
    const [notifications, setNotifications] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [highlightedNotificationIds, setHighlightedNotificationIds] = useState([]);

    const fetchNotifications = async () => {
        if (!userId) return;
        try {
            const data = await getUserNotifications(userId);
            setNotifications(data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    useEffect(() => {
        if (!userId) return;
        fetchNotifications();

        const client = new Client({
            brokerURL: 'ws://localhost:8080/ws',
            debug: (str) => { console.log(str); },
            onConnect: () => {
                console.log('Connected!');
                client.subscribe(`/topic/notifications/${userId}`, (message) => {
                    const notification = JSON.parse(message.body);
                    console.log('Received message: ', notification);

                    setNotifications((prevNotifications) => {
                        const updatedNotifications = [...prevNotifications, notification];

                        if (modalOpen && !notification.read) {
                            setHighlightedNotificationIds((prevIds) => {
                                if (!prevIds.includes(notification.id)) {
                                    return [...prevIds, notification.id];
                                }
                                return prevIds;
                            });
                        }

                        return updatedNotifications;
                    });
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ', frame.headers['message']);
                console.error('Additional details: ', frame.body);
                if (frame.headers['message'] && frame.headers['message'].includes('Unauthorized')) {
                    window.location = '/login';
                }
            }
        });

        client.activate();

        return () => {
            client.deactivate();
        };
    }, [userId]); // <-- usunięto modalOpen z zależności

    useEffect(() => {
        setNotificationCount && setNotificationCount(
            notifications.filter(notification => !notification.read).length
        );
    }, [notifications, setNotificationCount]);

    const openModal = () => {
        const unreadNotifications = notifications.filter(notification => !notification.read);
        setModalOpen(true);
        setHighlightedNotificationIds(unreadNotifications.map(notification => notification.id));

        unreadNotifications.forEach(notification => {
            markNotificationAsRead(notification.id);
        });
    };

    const closeModal = () => {
        setModalOpen(false);
    };

    const unreadCount = notifications.filter(notification => !notification.read).length;

    return open ? (
        <NotificationModal
            open={open}
            onClose={onClose}
            notifications={notifications}
            highlightedNotificationIds={highlightedNotificationIds}
        />
    ) : null;
};

export default NotificationComponent;
