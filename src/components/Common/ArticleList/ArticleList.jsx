import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaThumbsUp } from 'react-icons/fa';
import CommentForm from '../../Common/Comments/CommentForm';
import { dateFormat } from '../../Common/Patterns/DatePattern';
import { getUser, likeArticle } from '../../Common/Request/Requests';
import { getCommentsForArticle, likeComment } from '../../Common/Request/Comments';
import Pagination from '../../pagination/Pagination';

const ArticleList = ({ userId: propUserId = null }) => {
	const navigate = useNavigate();
	const [articles, setArticles] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalItems, setTotalItems] = useState(0);

	// NEW: comments state per article (limited to 3)
	const [commentsByArticle, setCommentsByArticle] = useState({}); // { [articleId]: [comment,...] }
	const [commentsLoadingByArticle, setCommentsLoadingByArticle] = useState({}); // { [articleId]: bool }

	const SIZE = 6;
	const SORT_BY = 'postedDate';
	const SORT_DIRECTION = 'desc';

	useEffect(() => {
		const uid = propUserId ?? localStorage.getItem('userId');
		if (!uid) {
			setError('No userId');
			return;
		}
		const controller = new AbortController();
		const fetchArticles = async () => {
			setLoading(true);
			setError(null);
			try {
				const token = localStorage.getItem('token') || '';
				const url = `http://localhost:8080/api/v1/articles/get/articles/from/follows?userId=${encodeURIComponent(uid)}&page=${encodeURIComponent(page)}&size=${encodeURIComponent(SIZE)}&sortBy=${encodeURIComponent(SORT_BY)}&sortDirection=${encodeURIComponent(SORT_DIRECTION)}`;
				const res = await fetch(url, {
					method: 'GET',
					signal: controller.signal,
					headers: {
						'Content-Type': 'application/json',
						'Authorization': token ? `Bearer ${token}` : '',
					},
				});
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const data = await res.json();
				const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
				// normalize fields used by Articles.jsx
				const normalized = items.map((a) => ({
					...a,
					content: a.content ?? a.excerpt ?? '',
					postedDate: a.postedDate ?? a.createdAt ?? a.publishedAt,
					likesCount: a.likesCount ?? a.likesNumber ?? 0,
					liked: !!a.liked,
				}));
				setArticles(normalized);
				if (data?.meta) {
					setTotalPages(Number(data.meta.totalPages) || 1);
					setTotalItems(Number(data.meta.totalItems) || items.length || 0);
				} else {
					setTotalPages(items.length < SIZE ? 1 : Math.ceil(items.length / SIZE));
					setTotalItems(items.length);
				}
			} catch (err) {
				if (err.name !== 'AbortError') setError(err.message || 'Fetch error');
			} finally {
				setLoading(false);
			}
		};
		fetchArticles();
		return () => controller.abort();
	}, [propUserId, page]);

	// NEW: fetch comments for visible articles (limited to 3)
	useEffect(() => {
		// for each article fetch comments unless already loaded
		articles.forEach((a) => {
			const id = a.id ?? a._id;
			if (!id) return;
			// skip if already loaded
			if (Array.isArray(commentsByArticle[id]) && commentsByArticle[id].length > 0) return;
			const params = { page: 1 };
			// set loading
			setCommentsLoadingByArticle((prev) => ({ ...prev, [id]: true }));
			getCommentsForArticle(id, params)
				.then((data) => {
					const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
					setCommentsByArticle((prev) => ({ ...prev, [id]: arr.slice(0, 3) }));
				})
				.catch(() => {
					setCommentsByArticle((prev) => ({ ...prev, [id]: [] }));
				})
				.finally(() => {
					setCommentsLoadingByArticle((prev) => ({ ...prev, [id]: false }));
				});
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [articles]);

	const openArticle = (a) => {
		navigate(`/article/${a.id ?? a._id}`, { state: { article: a } });
	};

	const handleAuthorClick = async (authorId) => {
		setLoading(true);
		try {
			const userData = await getUser(authorId);
			navigate('/profile', { state: { authorData: userData } });
		} catch (error) {
			// ignore
		} finally {
			setLoading(false);
		}
	};

	const handleLikeClick = async (event, articleId) => {
		event.preventDefault();
		try {
			const response = await likeArticle(articleId);
			if (!response) throw new Error('Failed to update like status');
			setArticles((prevArticles) =>
				prevArticles.map((article) => {
					if (article.id === articleId) {
						const updatedLikesCount = article.liked ? article.likesCount - 1 : article.likesCount + 1;
						return { ...article, likesCount: updatedLikesCount, liked: !article.liked };
					}
					return article;
				})
			);
		} catch (err) {
			// ignore
		}
	};

	// NEW: handle comment like, update local comments list
	const handleCommentLikeClick = async (articleId, commentId, liked) => {
		try {
			await likeComment(commentId);
			setCommentsByArticle((prev) => {
				const list = prev[articleId] || [];
				return {
					...prev,
					[articleId]: list.map((c) => (c.id === commentId ? { ...c, liked: !liked, likesNumber: liked ? c.likesNumber - 1 : c.likesNumber + 1 } : c))
				};
			});
		} catch {
			// ignore
		}
	};

	// NEW: callback passed to CommentForm — immediately add new comment to local list
	const handleNewComment = (newComment, articleId) => {
		if (!articleId || !newComment) return;
		setCommentsByArticle((prev) => {
			const list = prev[articleId] || [];
			// prepend new comment and limit to 3
			return { ...prev, [articleId]: [newComment, ...list].slice(0, 3) };
		});
		// optionally increment commentsNumber in articles list
		setArticles((prev) => prev.map((a) => {
			if ((a.id ?? a._id) === articleId) {
				return { ...a, commentsNumber: (a.commentsNumber || 0) + 1 };
			}
			return a;
		}));
	};

	return (
		<div className="article-list-component">
			{/* reuse same title structure as Articles.jsx */}
			{loading && <p>Loading articles...</p>}
			{error && <div className="articles-error">Błąd: {error}</div>}

			{!loading && !error && articles.length > 0 ? (
				articles.map((article) => {
					const articleId = article.id ?? article._id;
					const comments = commentsByArticle[articleId] || [];
					const commentsLoading = !!commentsLoadingByArticle[articleId];

					return (
						<div key={articleId} className={`article ${article.pinned ? 'pinned' : ''}`}>
							<h3
								className="title"
								style={{ cursor: 'pointer', textDecoration: 'underline' }}
								onClick={() => openArticle(article)}
							>
								{article.title || 'Untitled'}
							</h3>

							<p className="content">{article.content}</p>

							<div className="likes-container">
								<span className="likes">
									<FaThumbsUp style={{ marginRight: '6px', color: '#573b8a' }} />
									{article.likesCount}
								</span>
								<button
									type="button"
									className={`like-button ${article.liked ? 'liked' : ''}`}
									onClick={(e) => handleLikeClick(e, article.id)}
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
							{localStorage.getItem('token') && (
								<CommentForm articleId={articleId} updateComments={(newComment) => handleNewComment(newComment, articleId)} />
							)}

							<div className="article-meta">
								<button
									className="article-author-button"
									onClick={() => handleAuthorClick(article.author?.id)}
									disabled={loading}
								>
									{loading ? 'Loading...' : `${article.author?.firstName || ''} ${article.author?.lastName || ''}`}
								</button>
								<span className="article-author-date">{dateFormat(article.postedDate)}</span>
							</div>
						</div>
					);
				})
			) : (
				!loading && !error && <p>Brak artykułów do wyświetlenia.</p>
			)}

			{/* pagination using shared Pagination component */}
			{!loading && !error && totalItems > SIZE && (
				<Pagination
					itemsPerPage={SIZE}
					totalItems={totalItems}
					paginate={(p) => setPage(p)}
					currentPage={page}
					className="custom-pagination"
				/>
			)}
		</div>
	);
};

export default ArticleList;