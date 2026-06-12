import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export const markNotificationAsRead = async (notificationId) => {
    try {
        await axios.put(
            `${API_URL}/api/v1/notification/read?id=${notificationId}`,
            {},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
                }
            }
        );
    } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
            window.location = '/login';
        }
    }
};
