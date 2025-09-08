import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getArticleById, likeArticle } from '../../Common/Request/Requests';
import { getCommentsForArticle } from '../../Common/Request/Comments';
import { getUser } from '../../Common/Request/Requests';
import { FaThumbsUp } from 'react-icons/fa';
import CommentForm from '../../Common/Comments/CommentForm';
import './Articles.css';
import { likeComment } from '../../Common/Request/Comments';
import Pagination from '../../pagination/Pagination';

const COMMENTS_PER_PAGE = 10;

const ArticleDetails = () => {
    const { articleId } = useParams();
    const { commentId } = useParams();
    const navigate = useNavigate();
    const [article, setArticle] = useState(null);
    const [author, setAuthor] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [liked, setLiked] = useState(false);
    const [commentLiked, setCommentLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [commentLikesCount, setCommentLikesCount] = useState(0);
    const [commentsPerPage, setCommentsPerPage] = useState(COMMENTS_PER_PAGE);
    const [sortField, setSortField] = useState('likesNumber');
    const [sortOrder, setSortOrder] = useState('desc');
    const [totalComments, setTotalComments] = useState(0);

    useEffect(() => {
        const fetchArticle = async () => {
            setLoading(true);
            try {
                const data = await getArticleById(articleId);
                setArticle(data);
                setLiked(data.liked || false);
                setLikesCount(data.likesCount || 0);
                setCommentLiked(data.commentLiked || false);
                setCommentLikesCount(data.commentLikesCount || 0);
                const authorData = await getUser(data.author.id);
                setAuthor(authorData);
            } catch (error) {
                setArticle(null);
            } finally {
                setLoading(false);
            }
        };
        fetchArticle();
    }, [articleId]);

    useEffect(() => {
        refreshComments();
    }, [articleId, currentPage, commentsPerPage, sortField, sortOrder]);

    const refreshComments = async () => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                items: commentsPerPage,
                sort: sortField,
                order: sortOrder
            };
            const data = await getCommentsForArticle(articleId, params);
            const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
            setComments(arr);
            setTotalComments(data?.meta?.totalItems || arr.length);
        } catch (error) {
            setComments([]);
            setTotalComments(0);
        } finally {
            setLoading(false);
        }
    };

    const paginateComments = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const totalPages = Math.ceil(totalComments / commentsPerPage);

    const handleArticleLikeClick = async (event) => {
        event.preventDefault();
        try {
            const response = await likeArticle(articleId);
            if (!response) throw new Error('Failed to update like status');
            setLiked(!liked);
            setLikesCount(liked ? likesCount - 1 : likesCount + 1);
        } catch (error) {
        }
    };

    const handleCommentLikeClick = async (commentId, liked) => {
        try {
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
    }

    return (
        <>
            <button className="back-button" onClick={() => navigate(-1)}>Powrót</button>
            <div className="article-details-container" style={{ position: 'relative' }}>
                {loading && <p>Ładowanie...</p>}
                {article && (
                    <div className="article-details">
                        <h1 className="details-title">{article.title}</h1>
                        <div className="details-meta">
                            <span className="details-author">
                                {author ? `${author.firstName} ${author.lastName}` : 'Autor'}
                            </span>
                            <span className="details-date">{new Date(article.postedDate).toLocaleString()}</span>
                            <div className="likes-container">
                                <span className="likes">
                                    <FaThumbsUp style={{ marginRight: '6px', color: '#573b8a' }} />
                                    {likesCount}
                                </span>
                                <button
                                    type="button"
                                    className={`like-button ${liked ? 'liked' : ''}`}
                                    onClick={handleArticleLikeClick}
                                    disabled={loading}
                                >
                                    {liked ? 'Liked' : 'Like'}
                                </button>
                            </div>
                        </div>
                        <div className="details-content">{article.content}</div>
                    </div>
                )}
                <div className="details-comments-section">
                    <h2>Komentarze:</h2>
                    {/* Usuń selecty sortowania i ilości na stronę */}
                    {comments.length > 0 ? (
                        comments.map(comment => (
                            <div key={comment.id} className="details-comment">
                                <div className="details-comment-author">{comment.author?.firstName} {comment.author?.lastName}</div>
                                <div className="details-comment-content">{comment.content}</div>
                                <div className="details-comment-date">{new Date(comment.postedDate).toLocaleString()}</div>
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
                        ))
                    ) : (
                        <p>Brak komentarzy.</p>
                    )}
                    <CommentForm articleId={articleId} updateComments={refreshComments} />
                    {totalPages > 1 && (
                        <Pagination
                            itemsPerPage={commentsPerPage}
                            totalItems={totalComments}
                            paginate={paginateComments}
                            currentPage={currentPage}
                            className="custom-pagination"
                        />
                    )}
                </div>
            </div>
        </>
    );
};
export default ArticleDetails;

