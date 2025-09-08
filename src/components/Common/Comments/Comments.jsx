import React, { useState, useEffect } from 'react';
import { getCommentsForArticle, likeComment, deleteComment } from '../Request/Comments';
import { useNavigate } from 'react-router-dom';
import './Comments.css';
import TrashIcon from './trash';
import { getUser } from '../../Common/Request/Requests'

function dateFormat(data) {
    const date = new Date(data);
    const rrrr = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const gg = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return `${gg}:${mi} ${dd}-${mm}-${rrrr} `;
}

const CommentList = ({ articleId }) => {
    const navigate = useNavigate();
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchComments = async () => {
        setLoading(true);
        try {
            const data = await getCommentsForArticle(articleId);

            if (data && Array.isArray(data.items)) {
                setComments(data.items);
            } else if (Array.isArray(data)) {
                setComments(data);
            } else {
                setComments([]);
                console.error('Invalid comments data:', data);
            }

        } catch (error) {
            console.error('Error fetching comments:', error);
            setComments([]);
        } finally {
            setLoading(false);
        }
    };

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

    useEffect(() => {
        fetchComments();
    }, [articleId]);

    const handleLikeClick = async (commentId, isLiked) => {
        try {
            setLoading(true);
            const response = await likeComment(commentId);

            if (response.ok) {
                const updatedComments = comments.map(comment => {
                    if (comment.id === commentId) {
                        return { ...comment, likesNumber: isLiked ? comment.likesNumber - 1 : comment.likesNumber + 1, liked: !isLiked };
                    }
                    return comment;
                });
                setComments(updatedComments);
            } else {
                console.error('Failed to handle like/unlike:', response);
            }
        } catch (error) {
            console.error('Error handling like/unlike:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = async (commentId) => {
        try {
            setLoading(true);
            const response = await deleteComment(commentId);
            if (response.ok) {
                const updatedComments = comments.filter(comment => comment.id !== commentId);
                setComments(updatedComments);
            } else {
                console.error('Failed to delete comment:', response);
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {comments.map((comment, index) => (
                <div key={comment.id} className={`Comment comment-${index + 1} ${comment.pinned ? 'pinned' : ''}`}>
                    <hr />
                    <div className='Main'>
                        <p className='content'>{comment.content}</p>
                        <div className='delete-icon'>
                            {comment.author.id === Number(localStorage.userId) && (
                                <TrashIcon onClick={() => handleDeleteClick(comment.id)} disabled={loading}></TrashIcon>
                            )}
                        </div>
                    </div>
                    <div className="author-container">
                        <p className='likes'>{"Likes: " + comment.likesNumber}</p>
                        <button
                            className={`like-button ${comment.liked ? 'liked' : ''}`}
                            onClick={() => handleLikeClick(comment.id, comment.liked)}
                            disabled={loading}
                        >
                            {comment.liked ? 'Liked' : 'Like'}
                        </button>
                        <button
                            className='author-button'
                            onClick={() => handleAuthorClick(comment.author.id)}
                            disabled={loading}
                        >
                            {comment.author ? `${comment.author.firstName} ${comment.author.lastName}` : 'Unknown'}
                        </button>
                        <p className='date'>
                            {comment.updatedAt
                                ? `Edited: ${dateFormat(comment.updatedAt)}`
                                : `Posted: ${dateFormat(comment.postedDate)}`}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default CommentList;