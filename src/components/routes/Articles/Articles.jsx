import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileHeader from '../User/ProfileHeader';
import NotificationComponent from '../../Common/websockets/NotificationComponent';
import CommentForm from '../../Common/Comments/CommentForm';
import { dateFormat } from '../../Common/Patterns/DatePattern';
import { getArticles, getUser, likeArticle } from '../../Common/Request/Requests';
import { getCommentsForArticle } from '../../Common/Request/Comments.js';
import Pagination from '../../pagination/Pagination';
import { FaThumbsUp } from 'react-icons/fa';
import './Articles.css';
import { height } from '@mui/system';

const ArticleCommentsPreview = ({ articleId }) => {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Dodaj obsługę likowania komentarza
    const handleCommentLikeClick = async (commentId, liked) => {
        try {
            // importuj likeComment z odpowiedniego pliku
            const { likeComment } = require('../../Common/Request/Comments');
            const response = await likeComment(commentId);
            if (!response) throw new Error('Failed to update like status');
            setComments(prevComments =>
                prevComments.map(comment =>
                    comment.id === commentId
                        ? {
                            ...comment,
                            liked: !liked,
                            likesNumber: liked ? comment.likesNumber - 1 : comment.likesNumber + 1
                        }
                        : comment
                )
            );
        } catch (error) {
            // obsługa błędu
        }
    };

    useEffect(() => {
        const fetchComments = async () => {
            setLoading(true);
            try {
                const data = await getCommentsForArticle(articleId);
                const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
                setComments(arr.slice(0, 3));
            } catch (error) {
                setComments([]);
            } finally {
                setLoading(false);
            }
        };
        fetchComments();
    }, [articleId]);

    const handleAuthorClick = async (authorId) => {
        try {
            const userData = await getUser(authorId);
            navigate('/profile', { state: { authorData: userData } });
        } catch (error) {
        }
    };

    if (loading) return <div>Ładowanie komentarzy...</div>;
    if (!comments.length) return <div style={{ height: '20px', marginTop: '20px', marginBottom: '10px' }}> Brak komentarzy.</div>;

    return (
        <div className="article-comments">
            <h4>Komentarze</h4>
            {comments.map(comment => (
                <div key={comment.id} className="article-comment">
                    <div
                        className="comment-author-link"
                        onClick={() => handleAuthorClick(comment.author?.id)}
                        style={{ cursor: 'pointer' }}
                    >
                        {comment.author?.firstName} {comment.author?.lastName}
                    </div>
                    <div className="comment-content">{comment.content}</div>
                    <div className="comment-date">{dateFormat(comment.postedDate)}</div>
                    <div className="comment-likes-container">
                        <span className="likes">
                            <FaThumbsUp style={{ marginRight: '6px', color: '#573b8a' }} />
                            {comment.likesNumber}
                        </span>
                        <button
                            type="button"
                            className={`like-button ${comment.liked ? 'liked' : ''}`}
                            onClick={() => handleCommentLikeClick(comment.id, comment.liked)}
                            disabled={loading}
                        >
                            {comment.liked ? 'Liked' : 'Like'}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

const Articles = () => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [notificationModalOpen, setNotificationModalOpen] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [totalArticles, setTotalArticles] = useState(0);
    const [totalPages, setTotalPages] = useState();
    const [currentPage, setCurrentPage] = useState(1);
    const [articlesPerPage, setArticlesPerPage] = useState(10);
    const [sortField, setSortField] = useState('likesCount');
    const [sortOrder, setSortOrder] = useState('desc');

    useEffect(() => {
        const fetchUser = async () => {
            if (!localStorage.getItem('userId')) return;
            try {
                const data = await getUser(localStorage.getItem('userId'));
                setUserData(data);
            } catch (error) {
                setUserData(null);
            }
        };

        const fetchArticles = async () => {
            try {
                setLoading(true);
                const data = await getArticles({ page: currentPage, items: articlesPerPage, sort: sortField, order: sortOrder });
                setArticles(data.items);
                setTotalArticles(data.meta.totalItems);
                setTotalPages(data.meta.totalPages);
                setCurrentPage(data.meta.currentPage);
            } catch (error) {
                console.error('Error fetching articles:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
        fetchArticles();
    }, [currentPage, articlesPerPage, sortField, sortOrder]);

    const handleAuthorClick = async (authorId) => {
        setLoading(true);
        try {
            const userData = await getUser(authorId);
            navigate('/profile', { state: { authorData: userData } });
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleComments = (article) => {
        setSelectedArticle(prevSelected => (prevSelected === article ? null : article));
    };

    const updateComments = (newCommentData, articleId) => {
        setArticles(prevArticles =>
            prevArticles.map(article => {
                if (article.id === articleId) {
                    return {
                        ...article,
                        comments: [...(article.comments || []), newCommentData],
                        commentsNumber: article.commentsNumber + 1,
                    };
                }
                return article;
            })
        );
    };

    const handleLikeClick = async (event, articleId) => {
        event.preventDefault();

        try {
            const response = await likeArticle(articleId);
            if (!response) {
                throw new Error('Failed to update like status');
            }

            setArticles(prevArticles =>
                prevArticles.map(article => {
                    if (article.id === articleId) {
                        const updatedLikesCount = article.liked ? article.likesCount - 1 : article.likesCount + 1;
                        return { ...article, likesCount: updatedLikesCount, liked: !article.liked };
                    }
                    return article;
                })
            );
        } catch (error) {
            console.error('Error liking article:', error);
        }
    };

    const paginate = (pageNumber) => {
        setCurrentPage(pageNumber);
        console.log("Current Page Set To: ", pageNumber);
    };

    const handleArticlesPerPageChange = (event) => {
        setArticlesPerPage(Number(event.target.value));
        setCurrentPage(1);
    };

    const handleSortFieldChange = (event) => {
        setSortField(event.target.value);
        setCurrentPage(1);
    };

    const handleSortOrderChange = (event) => {
        setSortOrder(event.target.value);
        setCurrentPage(1);
    };

    const goToArticles = () => navigate('/articles');
    const goToHome = () => navigate('/home');
    const goToProfile = () => navigate('/profile', { state: { authorData: userData } });
    const logOut = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        navigate('/login');
    };
    const goToCreateArticle = () => navigate('/create');

    if (loading) {
        return <p>Loading articles...</p>;
    }

    return (
        <div className="explore">
            <ProfileHeader
                user={userData}
                onHome={goToHome}
                onExplore={goToArticles}
                onCreateArticle={goToCreateArticle}
                onProfile={goToProfile}
                onLogout={logOut}
                notificationCount={notificationCount}
                onNotificationClick={() => setNotificationModalOpen(true)}
            />
            <NotificationComponent
                userId={userData?.id}
                open={notificationModalOpen}
                onClose={() => setNotificationModalOpen(false)}
                setNotificationCount={setNotificationCount}
            />
            <div className="explore-content">
                <div className="explore-header-row">
                    <h2>Explore</h2>
                    <div className="filters-container">
                        <div className="filter">
                            <label htmlFor="articlesPerPage">Ilość na stronę</label>
                            <select
                                id="articlesPerPage"
                                value={articlesPerPage}
                                onChange={handleArticlesPerPageChange}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <div className="filter">
                            <label htmlFor="sortField">Sortuj po</label>
                            <select
                                id="sortField"
                                value={sortField}
                                onChange={handleSortFieldChange}
                            >
                                <option value="likesCount">Liczba polubień</option>
                                <option value="postedDate">Data dodania</option>
                            </select>
                        </div>
                        <div className="filter">
                            <label htmlFor="sortOrder">Kierunek</label>
                            <select
                                id="sortOrder"
                                value={sortOrder}
                                onChange={handleSortOrderChange}
                            >
                                <option value="desc">Malejąco</option>
                                <option value="asc">Rosnąco</option>
                            </select>
                        </div>
                    </div>
                </div>
                {articles.length > 0 ? (
                    articles.map(article => (
                        <div key={article.id} className={`article ${article.pinned ? 'pinned' : ''}`}>
                            <h3
                                className='title'
                                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                onClick={() => navigate(`/article/${article.id}`)}
                            >
                                {article.title}
                            </h3>
                            <p className='content'>{article.content}</p>
                            <div className="likes-container">
                                <span className="likes">
                                    <FaThumbsUp style={{ marginRight: '6px', color: '#573b8a' }} />
                                    {article.likesCount}
                                </span>
                                <button
                                    type="button"
                                    className={`like-button ${article.liked ? 'liked' : ''}`}
                                    onClick={(event) => handleLikeClick(event, article.id)}
                                    disabled={loading}
                                >
                                    {article.liked ? 'Liked' : 'Like'}
                                </button>
                            </div>
                            {/* Wyświetl 3 pierwsze komentarze nad inputem */}
                            <ArticleCommentsPreview articleId={article.id} />
                            {localStorage.getItem('token') &&
                                <CommentForm articleId={article.id} updateComments={updateComments} />
                            }
                            <div className="article-meta">
                                <button
                                    className='article-author-button'
                                    onClick={() => handleAuthorClick(article.author.id)}
                                    disabled={loading}
                                >
                                    {loading ? 'Loading...' : `${article.author.firstName} ${article.author.lastName}`}
                                </button>
                                <span className='article-author-date'>{dateFormat(article.postedDate)}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <p>Brak artykułów do wyświetlenia.</p>
                )}
                {totalPages > 1 && (
                    <Pagination
                        itemsPerPage={articlesPerPage}
                        totalItems={totalArticles}
                        paginate={paginate}
                        currentPage={currentPage}
                        className="custom-pagination"
                    />
                )}
            </div>
        </div>
    );
};

export default Articles;
