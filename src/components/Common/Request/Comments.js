const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export const getCommentsForArticle = async (articleId, params) => {
    const response = await interceptedFetch(`${API_URL}/api/v1/comments/for/article?articleId=${articleId}&page=${params.page}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch comments');
    }
    return response.json();
};

export const likeComment = async (commentId) => {
    const response = await interceptedFetch(`${API_URL}/api/v1/comments/like?id=${commentId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
    });
    if (!response.ok) {
        throw new Error('Failed to like comment');
    }
    return response;
};

export const deleteComment = async (commentId) => {
    const response = await interceptedFetch(`${API_URL}/api/v1/comments/delete?id=${commentId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
    });
    if (!response.ok) {
        throw new Error('Failed to delete comment');
    }
    return response;
};

export const getCommentsForUser = async (userId, page = 1) => {
    const response = await interceptedFetch(`${API_URL}/api/v1/comments/for/user?userId=${userId}&page=${page}&size=10`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch comments');
    }
    return response.json();
};

async function interceptedFetch(url, options) {
    const response = await fetch(url, options);
    if (response.status === 401 || response.status === 403) {
        window.location = '/login';
        return response;
    }
    return response;
}
