const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export const markNotificationAsRead = async (notificationId) => {
    const response = await fetch(`${API_URL}/api/v1/notification/read?id=${notificationId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
    });
    if (response.status === 401 || response.status === 403) {
        window.location = '/login';
        return;
    }
    if (!response.ok) {
        throw new Error('Failed to mark notification as read');
    }
    return response;
};

export const getUserNotifications = async (userId, offset = 0, limit = 20) => {
    const response = await fetch(`${API_URL}/api/v1/notification/get/user?id=${userId}&offset=${offset}&limit=${limit}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
    });
    if (response.status === 401 || response.status === 403) {
        window.location = '/login';
        return;
    }
    if (!response.ok) {
        throw new Error('Failed to fetch notifications');
    }
    return response.json();
};
