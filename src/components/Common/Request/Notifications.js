export const markNotificationAsRead = async (notificationId) => {
    const response = await fetch(`http://localhost:8080/api/v1/notification/read?id=${notificationId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
    });
    if (response.status === 401 || response.status === 403) {
        window.location = '/login';
    }
    if (!response.ok) {
        throw new Error('Failed to fetch read notification', response);
    }
    return response;
};

export const getUserNotifications = async (userId, offset = 0, limit = 20) => {
    const response = await fetch(`http://localhost:8080/api/v1/notification/get/user?id=${userId}&offset=${offset}&limit=${limit}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
    });
    if (response.status === 401 || response.status === 403) {
        window.location = '/login';
    }
    if (!response.ok) {
        throw new Error('Failed to fetch get notification', response);
    }
    return response.json();
};