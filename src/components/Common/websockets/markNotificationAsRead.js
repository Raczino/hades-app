import axios from 'axios';

export const markNotificationAsRead = async (notificationId) => {
    try {
        const response = await axios.put(
            `http://localhost:8080/api/v1/notification/read?id=${notificationId}`,
            {},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
                }
            }
        );
        if (response.status === 401 || response.status === 403) {
            window.location = '/login';
        }
        console.log(`Notification ${notificationId} marked as read.`);
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
};
