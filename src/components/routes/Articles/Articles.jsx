import React, { useState, useEffect } from 'react';
import './Articles.css';
import { useNavigate } from 'react-router-dom';
import CommentList from '../../Common/Comments/Comments';
import CommentForm from '../../Common/Comments/CommentForm';
import { dateFormat } from '../../Common/Patterns/DatePattern';
import { getArticles, getUser, likeArticle } from '../../Common/Request/Requests';
import Pagination from '../../pagination/Pagination';

const ArticleList = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [articles, setArticles] = useState([]);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [totalArticles, setTotalArticles] = useState(0);
    const [totalPages, setTotalPages] = useState();
    const [currentPage, setCurrentPage] = useState(1);
    const [articlesPerPage, setArticlesPerPage] = useState(10);
    const [sortField, setSortField] = useState('postedDate');
    const [sortOrder, setSortOrder] = useState('desc');

    useEffect(() => {
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

    if (loading) {
        return <p>Loading articles...</p>;
    }

    return (
        <div className='article-list'>
            <h1 className='article-list-title'>Lista Artykułów</h1>
            <div className="filters-container">
                <div className="filter">
                    <label htmlFor="articles-per-page">Artykułów na stronie:</label>
                    <select id="articles-per-page" value={articlesPerPage} onChange={handleArticlesPerPageChange}>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={20}>20</option>
                    </select>
                </div>

                <div className="filter">
                    <label htmlFor="sort-field">Sortuj według:</label>
                    <select id="sort-field" value={sortField} onChange={handleSortFieldChange}>
                        <option value="postedDate">Data publikacji</option>
                        <option value="likesNumber">Liczba polubień</option>
                    </select>
                </div>

                <div className="filter">
                    <label htmlFor="sort-order">Kierunek:</label>
                    <select id="sort-order" value={sortOrder} onChange={handleSortOrderChange}>
                        <option value="asc">Rosnąco</option>
                        <option value="desc">Malejąco</option>
                    </select>
                </div>
            </div>
            {articles.map((article) => (
                <div key={article.id} className={`article ${article.pinned ? 'pinned' : ''}`}>
                    <h2 className='title'>{article.title}</h2>
                    <p className='content'>{article.content}</p>
                    <div className="author-container">
                        <button
                            className='article-author-button'
                            onClick={() => handleAuthorClick(article.author.id)}
                            disabled={loading}
                        >
                            {loading ? 'Loading...' : `${article.author.firstName} ${article.author.lastName}`}
                        </button>
                        <p className='article-author-date'>{dateFormat(article.postedDate)}</p>
                    </div>
                    <div className="likes-container">
                        <p className='likes'>{"Likes: " + article.likesCount}</p>
                        <button
                            type="button"
                            className={`like-button ${article.liked ? 'liked' : ''}`}
                            onClick={(event) => handleLikeClick(event, article.id)}
                            disabled={loading}
                        >
                            {article.liked ? 'Liked' : 'Like'}
                        </button>
                        {article.commentsNumber > 0 && (
                            <button className='comment-button' onClick={() => toggleComments(article)}>
                                {selectedArticle === article ? 'Close' : `Comments (${article.commentsNumber})`}
                            </button>
                        )}
                    </div>
                    {selectedArticle === article && (
                        <CommentList articleId={article.id} />
                    )}
                    {localStorage.getItem('token') &&
                        <CommentForm articleId={article.id} updateComments={updateComments} />
                    }
                </div>
            ))}
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
    );
};

export default ArticleList;
