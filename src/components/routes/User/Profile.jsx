import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import TrashIcon from '../../../components/Common/Comments/trash.jsx';
import './profile.css';
import { deleteArticle, getArticleForUser, getPendingArticlesForUser, getUser, getCommentsForUser, getFollowersForUser, getFollowingForUser } from '../../Common/Request/Requests';
import { deleteComment } from '../../Common/Request/Comments.js';
import { dateFormat } from '../../Common/Patterns/DatePattern.js';
import ProfileHeader from './ProfileHeader';
import NotificationComponent from '../../Common/websockets/NotificationComponent';
import Pagination from '../../pagination/Pagination';

const TABS = [
    { key: 'articles', label: 'Artykuły' },
    { key: 'comments', label: 'Komentarze' },
    { key: 'followers', label: 'Obserwujący' },
    { key: 'following', label: 'Obserwowani' }
];

const ITEMS_PER_PAGE = 10;

const Profile = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = useParams();
    const paramUserId = params.userId;

    const [authorData, setAuthorData] = useState(location.state?.authorData || null);
    const [articles, setArticles] = useState([]);
    const [commentsData, setCommentsData] = useState([]);
    const [followersData, setFollowersData] = useState([]);
    const [followingData, setFollowingData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [activeTab, setActiveTab] = useState('accepted');
    const [activeSideTab, setActiveSideTab] = useState('articles');
    const [notificationModalOpen, setNotificationModalOpen] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    // pagination state
    const [articlesPage, setArticlesPage] = useState(1);
    const [commentsPage, setCommentsPage] = useState(1);
    const [followersPage, setFollowersPage] = useState(1);
    const [followingPage, setFollowingPage] = useState(1);

    const [totalArticles, setTotalArticles] = useState(0);
    const [totalComments, setTotalComments] = useState(0);
    const [totalFollowers, setTotalFollowers] = useState(0);
    const [totalFollowing, setTotalFollowing] = useState(0);

    const loggedInUserId = localStorage.getItem('userId');

    // check if logged-in user is following the profile owner (use endpoint /is-following/{userId})
    useEffect(() => {
        const checkFollowing = async () => {
            if (!authorData) return;
            const me = loggedInUserId;
            if (!me || String(me) === String(authorData.id)) return; // owner or not logged in -> no follow button
            try {
                const response = await fetch(`http://localhost:8080/api/v1/users/is-following/${authorData.id}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
                    },
                });
                if (!response.ok) {
                    console.warn('is-following endpoint returned', response.status);
                    return;
                }
                const text = await response.text();
                let val;
                try { val = JSON.parse(text); } catch { val = text === 'true'; }
                setIsFollowing(Boolean(val));
            } catch (err) {
                console.error('Failed to check following status', err);
            }
        };
        checkFollowing();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authorData]);

    useEffect(() => {
        const loadAuthorIfNeeded = async () => {
            const uid = paramUserId || (location.state?.authorData && location.state.authorData.id);
            if (!uid) return;
            if (!authorData || String(authorData.id) !== String(uid)) {
                setLoading(true);
                try {
                    const data = await getUser(uid);
                    setAuthorData(data);
                    setIsFollowing(data?.isFollowing || false);
                } catch (err) {
                    console.error('Error fetching user for profile URL', err);
                    setAuthorData(null);
                } finally {
                    setLoading(false);
                }
            }
        };
        loadAuthorIfNeeded();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paramUserId]);

    useEffect(() => {
        if (activeTab === 'accepted') {
            fetchAcceptedArticles(articlesPage);
        } else {
            fetchPendingArticles(articlesPage);
        }
    }, [activeTab, authorData, articlesPage]);

    useEffect(() => {
        // Pobierz komentarze na wejściu
        if (activeSideTab === 'comments' && authorData) {
            const fetchComments = async () => {
                setLoading(true);
                try {
                    const data = await getCommentsForUser(authorData.id, commentsPage, ITEMS_PER_PAGE);
                    const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
                    setCommentsData(arr);
                    setTotalComments(Number(data?.meta?.totalItems || arr.length));
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
                    const data = await getFollowersForUser(authorData.id, 0, 25);
                    const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
                    setFollowersData(arr);
                    setTotalFollowers(Number(data?.meta?.totalItems || arr.length));
                } catch (error) {
                    setFollowersCount(0);
                }
            };
            const fetchFollowing = async () => {
                try {
                    const data = await getFollowingForUser(authorData.id, 0, 25);
                    const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
                    setFollowingData(arr);
                    setTotalFollowing(Number(data?.meta?.totalItems || arr.length));
                } catch (error) {
                    setFollowingCount(0);
                }
            };
            fetchFollowers();
            fetchFollowing();
        }
    }, [authorData, activeSideTab, commentsPage, followersPage, followingPage]);

    const fetchAcceptedArticles = async (page = 1) => {
        if (!authorData) return;
        setLoading(true);
        try {
            const data = await getArticleForUser(authorData.id, page, ITEMS_PER_PAGE);
            const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
            setArticles(arr);
            setTotalArticles(Number(data?.meta?.totalItems || arr.length));
        } catch (error) {
            console.error('Error fetching accepted articles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAuthorClick = (userId) => navigate(`/profile/${userId}`);

    const fetchPendingArticles = async (page = 1) => {
        if (!authorData) return;
        setLoading(true);
        try {
            const data = await getPendingArticlesForUser(authorData.id, page, ITEMS_PER_PAGE);
            const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
            setArticles(arr);
            setTotalArticles(Number(data?.meta?.totalItems || arr.length));
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

    const handleSideTabClick = async (tabKey) => {
        // just switch tab and reset page counters; fetches handled by effects
        setActiveSideTab(tabKey);
        if (tabKey === 'comments') setCommentsPage(1);
        if (tabKey === 'followers') setFollowersPage(1);
        if (tabKey === 'following') setFollowingPage(1);
        if (tabKey === 'articles') setArticlesPage(1);
    };

    const handleTabClick = (tabKey) => {
        setActiveSideTab(tabKey);
        // Możesz dodać logikę do pobierania danych dla danej zakładki
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

    const handleFollowClick = async () => {
        if (!authorData) return;
        // optimistic update
        const prev = isFollowing;
        setIsFollowing(!prev);
        setFollowersCount(c => prev ? Math.max(0, c - 1) : c + 1);
        let errorOccurred = false;
        setLoading(true);
        try {
            const endpoint = prev ? 'unfollow' : 'follow';
            const response = await fetch(`http://localhost:8080/api/v1/users/${authorData.id}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.token}`
                },
            });
            if (!response.ok) {
                errorOccurred = true;
                console.error('Błąd przy aktualizacji obserwacji');
            }
        } catch (error) {
            errorOccurred = true;
            console.error('Błąd sieci', error);
        } finally {
            setLoading(false);
            if (errorOccurred) {
                // revert optimistic update
                setIsFollowing(prev);
                setFollowersCount(c => prev ? c + 1 : Math.max(0, c - 1));
            }
        }
    };

    const displayedArticles = Array.isArray(articles)
        ? (articles.length > ITEMS_PER_PAGE ? articles.slice((articlesPage - 1) * ITEMS_PER_PAGE, articlesPage * ITEMS_PER_PAGE) : articles)
        : [];

    return (
        <div className="profile-container">
            <ProfileHeader
                user={authorData}
                onExplore={() => navigate('/articles')}
                onHome={() => { navigate('/home') }}
                onCreateArticle={() => navigate('/create-article')}
                onProfile={() => navigate(`/profile/${authorData.id}`, { state: { authorData } })}
                onLogout={logOut}
                onTabClick={handleTabClick}
                notificationCount={notificationCount}
                onNotificationClick={() => setNotificationModalOpen(true)}
                showFollowButton={String(loggedInUserId) !== String(authorData.id)}
                isFollowing={isFollowing}
                onFollowClick={handleFollowClick}
                followLoading={loading}
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
                            {tab.key === 'comments' && (totalComments > 0 ? <span className="tab-count">{totalComments}</span> : (authorData?.commentsCount > 0 ? <span className="tab-count">{authorData.commentsCount}</span> : null))}
                            {tab.key === 'articles' && (totalArticles > 0 ? <span className="tab-count">{totalArticles}</span> : (authorData?.articlesCount > 0 ? <span className="tab-count">{authorData.articlesCount}</span> : null))}
                            {tab.key === 'followers' && (totalFollowers > 0 ? <span className="tab-count">{totalFollowers}</span> : (followersCount > 0 ? <span className="tab-count">{followersCount}</span> : null))}
                            {tab.key === 'following' && (totalFollowing > 0 ? <span className="tab-count">{totalFollowing}</span> : (followingCount > 0 ? <span className="tab-count">{followingCount}</span> : null))}
                        </button>
                    ))}
                </div>
                <div className="profile-list-card">
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
                            {totalFollowers > ITEMS_PER_PAGE && (
                                <Pagination itemsPerPage={ITEMS_PER_PAGE} totalItems={totalFollowers} paginate={setFollowersPage} currentPage={followersPage} className="custom-pagination" />
                            )}
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
                            {totalFollowing > ITEMS_PER_PAGE && (
                                <Pagination itemsPerPage={ITEMS_PER_PAGE} totalItems={totalFollowing} paginate={setFollowingPage} currentPage={followingPage} className="custom-pagination" />
                            )}
                        </div>
                    )}
                    {activeSideTab === 'comments' && (
                        <div className='comments-list'>
                            <h1 className='list-title'>Lista Komentarzy</h1>
                            {commentsData.length > 0 ? (
                                commentsData.map((comment, index) => (
                                    <div key={comment.id} className={`MyComment comment-${index + 1}`}>
                                        {String(loggedInUserId) === String(authorData.id) && (
                                            <TrashIcon onClick={() => handleDeleteCommentClick(comment.id)} />
                                        )}
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
                            {totalComments > ITEMS_PER_PAGE && (
                                <Pagination itemsPerPage={ITEMS_PER_PAGE} totalItems={totalComments} paginate={setCommentsPage} currentPage={commentsPage} className="custom-pagination" />
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
                                        onClick={() => { setActiveTab('accepted'); setArticlesPage(1); }}
                                        disabled={loading}
                                    >
                                        Opublikowane
                                    </button>
                                    {String(loggedInUserId) === String(authorData.id) && (
                                        <button
                                            className={activeTab === 'pending' ? 'tab active pending' : 'tab'}
                                            onClick={() => { setActiveTab('pending'); setArticlesPage(1); }}
                                            disabled={loading}
                                        >
                                            Oczekujące
                                        </button>
                                    )}
                                </div>
                            )}
                            {articles.length > 0 ? (
                                displayedArticles.map((article, index) => (
                                    <div key={article.id} className={`MyArticle article-${index + 1}`}>
                                        <div className="title-container">
                                            <h3 className='title' style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate(`/article/${article.id}`)}>{article.title}</h3>
                                            {String(loggedInUserId) === String(authorData.id) && (
                                                <TrashIcon onClick={() => handleDeleteClick(article.id)} />
                                            )}
                                        </div>
                                        <p className='content'>{article.content}</p>
                                        <div className="article-info">
                                            <p>Liczba polubień: {article.likesCount}</p>
                                            <p>Data Publikacji: {dateFormat(article.postedDate)}</p>
                                            <p>Status: {article.status}</p>
                                            <p>Liczba komentarzy: {article.commentsCount}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p>{activeTab === 'pending' ? 'Nie masz oczekujących artykułów.' : 'Brak opublikowanych artykułów.'}</p>
                            )}
                            {totalArticles > ITEMS_PER_PAGE && (
                                <Pagination itemsPerPage={ITEMS_PER_PAGE} totalItems={totalArticles} paginate={setArticlesPage} currentPage={articlesPage} className="custom-pagination" />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Profile;