import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TrashIcon from '../../../components/Common/Comments/trash.jsx';
import './profile.css';
import { deleteArticle, getArticleForUser, getPendingArticlesForUser } from '../../Common/Request/Requests';
import { getCommentsForUser, deleteComment } from '../../Common/Request/Comments.js';
import { dateFormat } from '../../Common/Patterns/DatePattern.js';
import ProfileHeader from './ProfileHeader';
import NotificationComponent from '../../Common/websockets/NotificationComponent';

const TABS = [
    { key: 'articles', label: 'Artykuły' },
    { key: 'comments', label: 'Komentarze' },
    { key: 'followers', label: 'Obserwujący' },
    { key: 'following', label: 'Obserwowani' }
];

const Profile = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const authorData = location.state?.authorData;
    const [articles, setArticles] = useState([]);
    const [commentsData, setCommentsData] = useState([]);
    const [followersData, setFollowersData] = useState([]);
    const [followingData, setFollowingData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showArticles, setShowArticles] = useState(false);
    const [showFollowers, setShowFollowers] = useState(false);
    const [showFollowing, setShowFollowing] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [isFollowing, setIsFollowing] = useState(authorData.isFollowing || false);
    const [activeTab, setActiveTab] = useState('accepted');
    const [activeSideTab, setActiveSideTab] = useState('articles');
    const [notificationModalOpen, setNotificationModalOpen] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

    const loggedInUserId = localStorage.getItem('userId');

    useEffect(() => {
        if (activeTab === 'accepted') {
            fetchAcceptedArticles();
        } else {
            fetchPendingArticles();
        }
    }, [activeTab]);

    useEffect(() => {
    }, [authorData]);

    useEffect(() => {
        // Pobierz komentarze na wejściu
        if (activeSideTab === 'comments' && authorData) {
            const fetchComments = async () => {
                setLoading(true);
                try {
                    const data = await getCommentsForUser(authorData.id);
                    setCommentsData(data);
                } catch (error) {
                    console.error('Error fetching comments:', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchComments();
        }
        // Pobierz followers i following na wejściu
        if (authorData) {
            const fetchFollowers = async () => {
                try {
                    const response = await fetch(`http://localhost:8080/api/v1/users/${authorData.id}/followers`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.token}`,
                        },
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setFollowersData(data);
                        setFollowersCount(Array.isArray(data) ? data.length : 0);
                    }
                } catch (error) {
                    setFollowersCount(0);
                }
            };
            const fetchFollowing = async () => {
                try {
                    const response = await fetch(`http://localhost:8080/api/v1/users/${authorData.id}/following`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.token}`,
                        },
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setFollowingData(data);
                        setFollowingCount(Array.isArray(data) ? data.length : 0);
                    }
                } catch (error) {
                    setFollowingCount(0);
                }
            };
            fetchFollowers();
            fetchFollowing();
        }
    }, [authorData, activeSideTab]);

    const fetchAcceptedArticles = async () => {
        setLoading(true);
        try {
            const data = await getArticleForUser(authorData.id);
            setArticles(data);
        } catch (error) {
            console.error('Error fetching accepted articles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAuthorClick = (userId) => navigate(`/profile/${userId}`);

    const fetchPendingArticles = async () => {
        setLoading(true);
        try {
            const data = await getPendingArticlesForUser(authorData.id);
            setArticles(data);
        } catch (error) {
            console.error('Error fetching pending articles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCommentClick = async (commentId) => {
        try {
            setLoading(true);
            const response = await deleteComment(commentId);
            if (response.ok) {
                setCommentsData(prev => prev.filter(comment => comment.id !== commentId));
            } else {
                console.error('Failed to delete comment:', response);
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = async (articleId) => {
        try {
            setLoading(true);
            const response = await deleteArticle(articleId);
            if (response.ok) {
                const updatedArticles = articles.filter(article => article.id !== articleId);
                setArticles(updatedArticles);
            } else {
                console.error('Failed to delete article:', response);
            }
        } catch (error) {
            console.error('Error deleting article:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleArticlesClick = async () => {
        setLoading(true);
        try {
            if (showArticles) {
                setShowArticles(false);
                return;
            }
            setActiveTab('accepted')
            const data = await getArticleForUser(authorData.id);
            setArticles(data);
            setShowFollowing(false);
            setShowFollowers(false);
            setShowComments(false);
            setShowArticles(true);
        } catch (error) {
            console.error('Error fetching articles:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleCommentsClick = async () => {
        setLoading(true);
        try {
            if (showComments) {
                setShowComments(false);
                return;
            }
            const data = await getCommentsForUser(authorData.id)
            setCommentsData(data);
            setShowFollowing(false);
            setShowFollowers(false);
            setShowArticles(false);
            setShowComments(true);
        } catch (error) {
            console.error('Error fetching articles:', error);
        } finally {
            setLoading(false);
        }
    }


    const handleFollowersClick = async () => {
        setLoading(true);
        try {
            if (showFollowers) {
                setShowFollowers(false); // poprawiono
                return;
            }
            const response = await fetch(`http://localhost:8080/api/v1/users/${authorData.id}/followers`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.token}`,
                },
            });
            if (!response.ok) {
                throw new Error('Failed to fetch followers');
            }
            const data = await response.json();
            setFollowersData(data);
            setShowArticles(false);
            setShowComments(false);
            setShowFollowing(false);
            setShowFollowers(true);
        } catch (error) {
            console.error('Error fetching followers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFollowingClick = async () => {
        setLoading(true);
        try {
            if (showFollowing) {
                setShowFollowing(false);
                return;
            }
            const response = await fetch(`http://localhost:8080/api/v1/users/${authorData.id}/following`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.token}`,
                },
            });
            if (!response.ok) {
                throw new Error('Failed to fetch following');
            }
            const data = await response.json();
            setFollowingData(data);
            setShowArticles(false);
            setShowFollowers(false);
            setShowComments(false)
            setShowFollowing(true);
        } catch (error) {
            console.error('Error fetching following:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleArticles = () => {
        setShowArticles(!showArticles);
    };

    const handleFollowClick = async () => {
        setLoading(true);
        try {
            const endpoint = isFollowing ? 'unfollow' : 'follow';
            const response = await fetch(`http://localhost:8080/api/v1/users/${authorData.id}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.token}`
                },
            });

            if (response.ok) {
                setIsFollowing(!isFollowing);
            } else {
                console.error('Błąd przy aktualizacji obserwacji');
            }
        } catch (error) {
            console.error('Błąd sieci', error);
        } finally {
            setLoading(false);
        }
    };

    // Obsługa kliknięcia w zakładkę boczną
    const handleSideTabClick = async (tabKey) => {
        setActiveSideTab(tabKey);
        setLoading(true);
        try {
            if (tabKey === 'comments') {
                const data = await getCommentsForUser(authorData.id);
                setCommentsData(data);
            } else if (tabKey === 'articles') {
                setActiveTab('accepted');
                const data = await getArticleForUser(authorData.id);
                setArticles(data);
            } else if (tabKey === 'followers') {
                const response = await fetch(`http://localhost:8080/api/v1/users/${authorData.id}/followers`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.token}`,
                    },
                });
                if (!response.ok) throw new Error('Failed to fetch followers');
                const data = await response.json();
                setFollowersData(data);
            } else if (tabKey === 'following') {
                const response = await fetch(`http://localhost:8080/api/v1/users/${authorData.id}/following`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.token}`,
                    },
                });
                if (!response.ok) throw new Error('Failed to fetch following');
                const data = await response.json();
                setFollowingData(data);
            }
        } catch (error) {
            console.error('Error fetching tab data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTabClick = (tabKey) => {
        setActiveSideTab(tabKey);
        // Możesz dodać logikę do pobierania danych dla danej zakładki
    };

    const handleNotificationClick = () => {
        setNotificationModalOpen(true);
    };

    const logOut = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        navigate('/login');
    };

    if (!authorData) {
        return (
            <div className="profile-container">
                <div className="profile-card">
                    <h2>Brak danych użytkownika</h2>
                    <p>Odśwież stronę z listy użytkowników.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-container">
            <ProfileHeader
                user={authorData}
                onExplore={() => navigate('/articles')}
                onBoard={() => { navigate('/home') }}
                onCreateArticle={() => navigate('/create')}
                onProfile={() => navigate('/profile', { state: { authorData } })}
                onLogout={logOut}
                onTabClick={handleTabClick}
                notificationCount={notificationCount}
                onNotificationClick={() => setNotificationModalOpen(true)}
            />
            <NotificationComponent
                userId={authorData?.id}
                open={notificationModalOpen}
                onClose={() => setNotificationModalOpen(false)}
                setNotificationCount={setNotificationCount}
            />
            <div className="profile-content">
                <div className="profile-tabs">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            className={`side-tab${activeSideTab === tab.key ? ' active' : ''}`}
                            onClick={() => handleSideTabClick(tab.key)}
                        >
                            {tab.label}
                            {tab.key === 'comments' && authorData.commentsCount > 0 && (
                                <span className="tab-count">{authorData.commentsCount}</span>
                            )}
                            {tab.key === 'articles' && authorData.articlesCount > 0 && (
                                <span className="tab-count">{authorData.articlesCount}</span>
                            )}
                            {tab.key === 'followers' && followersCount > 0 && (
                                <span className="tab-count">{followersCount}</span>
                            )}
                            {tab.key === 'following' && followingCount > 0 && (
                                <span className="tab-count">{followingCount}</span>
                            )}
                        </button>
                    ))}
                </div>
                <div className="profile-list-card">
                    {loading && <p>Loading...</p>}
                    {activeSideTab === 'followers' && (
                        <div className='followers-list'>
                            <h1 className='list-title'>Lista Obserwujących</h1>
                            {followersData.length > 0 ? followersData.map((follower) => (
                                <div key={follower.id} className="follower-card">
                                    <h3
                                        className='title'
                                        onClick={() => handleAuthorClick(follower.id)}
                                        disabled={loading}
                                    >{follower.firstName} {follower.lastName}</h3>
                                    <p>{follower.email}</p>
                                </div>
                            )) : <p>Nikt Cię jeszcze nie obserwuje</p>}
                        </div>
                    )}
                    {activeSideTab === 'following' && (
                        <div className='following-list'>
                            <h1 className='list-title'>Lista Obserwowanych</h1>
                            {followingData.length > 0 ? followingData.map((following) => (
                                <div key={following.id} className="follower-card">
                                    <h3>{following.firstName} {following.lastName}</h3>
                                    <p>{following.email}</p>
                                </div>
                            )) : <p>Nie obserwujesz jeszcze nikogo.</p>}
                        </div>
                    )}
                    {activeSideTab === 'comments' && (
                        <div className='comments-list'>
                            <h1 className='list-title'>Lista Komentarzy</h1>
                            {(Array.isArray(commentsData.items) ? commentsData.items : commentsData).length > 0 ? (
                                (Array.isArray(commentsData.items) ? commentsData.items : commentsData).map((comment, index) => (
                                    <div key={comment.id} className={`MyComment comment-${index + 1}`}>
                                        <TrashIcon onClick={() => handleDeleteCommentClick(comment.id)} />
                                        <p className='content'>{comment.content}</p>
                                        <div className="comment-info">
                                            <p>Likes: {comment.likesNumber}</p>
                                            <p>Posted: {dateFormat(comment.postedDate)}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p>Brak komentarzy.</p>
                            )}
                        </div>
                    )}
                    {activeSideTab === 'articles' && (
                        <div className='articles-list'>
                            <h1 className='list-title'>Lista Artykułów</h1>
                            {loggedInUserId == authorData.id && (
                                <div className="tabs">
                                    <button
                                        className={activeTab === 'accepted' ? 'tab active' : 'tab'}
                                        onClick={() => setActiveTab('accepted')}
                                        disabled={loading}
                                    >
                                        Opublikowane
                                    </button>
                                    <button
                                        className={activeTab === 'pending' ? 'tab active pending' : 'tab'}
                                        onClick={() => setActiveTab('pending')}
                                        disabled={loading}
                                    >
                                        Oczekujące
                                    </button>
                                </div>
                            )}
                            {(Array.isArray(articles.items) ? articles.items : articles).length > 0 ? (
                                (Array.isArray(articles.items) ? articles.items : articles).map((article, index) => (
                                    <div key={article.id} className={`MyArticle article-${index + 1}`}>
                                        <div className="title-container">
                                            <h3
                                                className='title'
                                                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                onClick={() => navigate(`/article/${article.id}`)}
                                            >{article.title}</h3>
                                            <TrashIcon onClick={() => handleDeleteClick(article.id)} />
                                        </div>
                                        <p className='content'>{article.content}</p>
                                        <div className="article-info">
                                            <p>Liczba polubień: {article.likesCount}</p>
                                            <p>Data Publikacji: {dateFormat(article.postedDate)}</p>
                                            <p>Status: {article.status}</p>
                                            <p>Liczba komentarzy: {article.commentsNumber}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p>Nie masz oczekujących artykułów.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Profile;