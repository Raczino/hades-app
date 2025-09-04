export const getComments = async (articleId) => {
    const response = await interceptedFetch(`http://localhost:8080/api/v1/comments/article?id=${articleId}&page=1&size=100&sort=desc`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.token}`,
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch Comments', response);
    }
    return response.json();
};

export const likeComment = async (commentId) => {
    const response = await interceptedFetch(`http://localhost:8080/api/v1/comments/like?id=${commentId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch Comments', response);
    }
    return response;
};

export const deleteComment = async (commentId) => {
    const response = await interceptedFetch(`http://localhost:8080/api/v1/comments/delete?id=${commentId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch Comments', response);
    }
    return response;
};

export const getCommentsForUser = async (userId) => {
    const response = await interceptedFetch(`http://localhost:8080/api/v1/comments/user?userId=${userId}&page=1&size=10`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.token}`,
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch Comments', response);
    }
    return response.json();
};

async function interceptedFetch(url, options) {
    const response = await fetch(url, options);

    if (response.status === 401 || response.status === 403) {
        window.location = '/login';
    }
    return response
}