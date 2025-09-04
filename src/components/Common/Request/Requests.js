export const getArticles = async ({ page = 1, items=1, sort = 'likesCount', order = 'desc' } = {}) => {
    const response = await interceptedFetch(`http://localhost:8080/api/v1/articles/get/all?page=${page}&size=${items}&sortBy=${sort}&sort=${order}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.token}`,
        }
    })
    if (!response.ok) {
        throw new Error('Failed to fetch articles', response);
    }
    return response.json();
};

export const addArticle = async (title, content) => {
    const response = await interceptedFetch('http://localhost:8080/api/v1/articles/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.token}`,
            'Accept': '*'
        },
        body: JSON.stringify({ title, content }),
    });
    if (!response.ok) {
        throw new Error('Failed to insert new article', response);
    }
};

export const deleteArticle = async (articleId) => {
    const response = await interceptedFetch(`http://localhost:8080/api/v1/articles/delete?id=${articleId}`, {
        method: 'Delete',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.token}`,
            'Accept': '*'
        },
    });
    if (!response.ok) {
        throw new Error('Failed to insert new article', response);
    }
};

export const getUser = async (id) => {
    const response = await interceptedFetch(`http://localhost:8080/api/v1/users/get?id=${id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.token}`,
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch articles', response);
    }
    return response.json();
};

export const getArticleForUser = async (id) => {
    const response = await interceptedFetch(`http://localhost:8080/api/v1/articles/get/from?userId=${id}&page=1&size=10`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.token}`,
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch articles');
    }
    return response.json();
};

export const getPendingArticlesForUser = async (id) => {
    const response = await interceptedFetch(`http://localhost:8080/webapi/v1/moderator/article/get/from/user?id=${id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.token}`,
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch articles');
    }
    return response.json();
};

export const likeArticle = async (articleId) => {
    const response = await interceptedFetch(`http://localhost:8080/api/v1/articles/like?id=${articleId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.token}`,
        },
    });
    if (!response.ok) {
        throw new Error('Failed to fetch articles');
    }
    return response.ok;
};

async function interceptedFetch(url, options) {

    const response = await fetch(url, options);

    if (response.status === 401) {
        window.location = '/login'
    }
    return response
}