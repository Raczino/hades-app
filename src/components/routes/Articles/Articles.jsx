import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileHeader from '../User/ProfileHeader';
import NotificationComponent from '../../Common/websockets/NotificationComponent';
import CommentForm from '../../Common/Comments/CommentForm';
import { dateFormat } from '../../Common/Patterns/DatePattern';
import { getArticles, getUser, likeArticle } from '../../Common/Request/Requests';
import { getCommentsForArticle, likeComment } from '../../Common/Request/Comments.js';
import Pagination from '../../pagination/Pagination';
import { FaThumbsUp } from 'react-icons/fa';
import './Articles.css';
import { height } from '@mui/system';
import Search from '../../Common/Search/Search';

const Articles = () => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [notificationModalOpen, setNotificationModalOpen] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null); // <-- added to fix no-undef
    // NEW: comments per article state
    const [commentsByArticle, setCommentsByArticle] = useState({}); // { [articleId]: [comment,...] }
    const [commentsLoadingByArticle, setCommentsLoadingByArticle] = useState({}); // { [articleId]: bool }
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

    // NEW: when articles change, fetch up to 3 comments for each visible article (if not loaded)
    useEffect(() => {
        articles.forEach((article) => {
            const id = article.id ?? article._id;
            if (!id) return;
            if (Array.isArray(commentsByArticle[id]) && commentsByArticle[id].length > 0) return; // already loaded

            // set loading flag
            setCommentsLoadingByArticle(prev => ({ ...prev, [id]: true }));
            // try to fetch comments (page 1)
            getCommentsForArticle(id, { page: 1 }).then((data) => {
                const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
                setCommentsByArticle(prev => ({ ...prev, [id]: arr.slice(0, 3) }));
            }).catch(() => {
                setCommentsByArticle(prev => ({ ...prev, [id]: [] }));
            }).finally(() => {
                setCommentsLoadingByArticle(prev => ({ ...prev, [id]: false }));
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [articles]);

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

    // update articles and local comments cache when a new comment is added
    const updateComments = (newCommentData, articleId) => {
        // update article's commentsNumber and article.comments if present
        setArticles(prevArticles =>
            prevArticles.map(article => {
                if (article.id === articleId) {
                    return {
                        ...article,
                        comments: [...(article.comments || []), newCommentData],
                        commentsNumber: (article.commentsNumber || 0) + 1,
                    };
                }
                return article;
            })
        );
        // update commentsByArticle immediately (prepend and keep up to 3)
        setCommentsByArticle(prev => {
            const existing = prev[articleId] || [];
            return { ...prev, [articleId]: [newCommentData, ...existing].slice(0, 3) };
        });
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

    // NEW: like a comment and update local comments view
    const handleCommentLikeClick = async (articleId, commentId, liked) => {
        try {
            await likeComment(commentId);
            setCommentsByArticle(prev => {
                const list = prev[articleId] || [];
                return {
                    ...prev,
                    [articleId]: list.map(c => (c.id === commentId ? { ...c, liked: !liked, likesNumber: liked ? c.likesNumber - 1 : c.likesNumber + 1 } : c))
                };
            });
        } catch (err) {
            // ignore
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
    const goToCreateArticle = () => navigate('/create-article');

    // handle search invoked from Search component
    const handleSearch = async (q) => {
        const query = String(q ?? '').trim();
        // if query empty, reload default list (first page)
        if (!query) {
            setSearching(false);
            setCurrentPage(1);
            // reuse existing fetch via getArticles
            try {
                setLoading(true);
                const data = await getArticles({ page: 1, items: articlesPerPage, sort: sortField, order: sortOrder });
                setArticles(data.items || []);
                setTotalArticles(data.meta?.totalItems ?? (data.items?.length ?? 0));
                setTotalPages(data.meta?.totalPages ?? 1);
                setCurrentPage(data.meta?.currentPage ?? 1);
                setCommentsByArticle({}); // clear cached comments for new list
            } catch (err) {
                console.error('Error fetching articles:', err);
                setArticles([]);
            } finally {
                setLoading(false);
            }
            return;
        }

        // search query
        setSearching(true);
        setLoading(true);
        try {
            const token = localStorage.getItem('token') || '';
            const res = await fetch(`http://localhost:8080/api/v1/articles/search?q=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
            const normalized = items.map((a) => ({
                ...a,
                content: a.content ?? a.excerpt ?? '',
                postedDate: a.postedDate ?? a.createdAt ?? a.publishedAt,
                likesCount: a.likesCount ?? a.likesNumber ?? 0,
                liked: !!a.liked,
            }));
            setArticles(normalized);
            // use meta if provided, otherwise single-page result
            setTotalArticles(Number(data?.meta?.totalItems) || normalized.length);
            setTotalPages(Number(data?.meta?.totalPages) || 1);
            setCurrentPage(1);
            setCommentsByArticle({}); // clear cached comments for search results
        } catch (err) {
            console.error('Search error:', err);
            setArticles([]);
            setTotalArticles(0);
            setTotalPages(1);
        } finally {
            setSearching(false);
            setLoading(false);
        }
    };

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
                    <Search onSearch={handleSearch} />
                    <div className="filters-container">
                        <div className="filter">
                            <label htmlFor="articlesPerPage">Ilość na stronę</label>
                            <select
                                id="articlesPerPage"
                                value={articlesPerPage}
                                onChange={handleArticlesPerPageChange}
                                // ensure select doesn't accidentally submit forms if contained within one
                                // browsers don't submit on select change, but keep type-safety for buttons elsewhere
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
                    articles.map(article => {
                        const articleId = article.id;
                        const comments = commentsByArticle[articleId] || [];
                        const commentsLoading = !!commentsLoadingByArticle[articleId];
                        return (
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

                                {/* comments preview (up to 3) */}
                                <div className="article-comments">
                                    <h4>Komentarze</h4>
                                    {commentsLoading && <div>Ładowanie komentarzy...</div>}
                                    {!commentsLoading && comments.length === 0 && (
                                        <div style={{ height: '20px', marginTop: '20px', marginBottom: '10px' }}>Brak komentarzy.</div>
                                    )}
                                    {!commentsLoading && comments.length > 0 && comments.map((comment) => (
                                        <div key={comment.id} className="article-comment">
                                            <div className="comment-author-link" onClick={() => handleAuthorClick(comment.author?.id)} style={{ cursor: 'pointer' }}>
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
                                                    onClick={() => handleCommentLikeClick(articleId, comment.id, comment.liked)}
                                                >
                                                    {comment.liked ? 'Liked' : 'Like'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* comment input (if logged) - pass update callback so new comments appear immediately */}
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
                        );
                    })
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
