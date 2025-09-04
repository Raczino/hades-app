import React from 'react';
import PropTypes from 'prop-types';
import './Pagination.css';

const Pagination = ({
    itemsPerPage,
    totalItems,
    paginate,
    currentPage,
    className
}) => {
    const pageNumbers = [];
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
    }

    const visiblePageNumbers = () => {
        let start = 0;
        let end = 5;

        if (totalPages <= 5) {
            start = 0;
            end = totalPages;
        } else if (currentPage <= 3) {
            start = 0;
            end = 5;
        } else if (currentPage + 2 >= totalPages) {
            start = totalPages - 5;
            end = totalPages;
        } else {
            start = currentPage - 3;
            end = currentPage + 2;
        }

        return pageNumbers.slice(Math.max(start, 0), Math.min(end, totalPages));
    };

    return (
        <nav className={className}>
            <ul className="pagination">
                {currentPage > 1 && (
                    <li>
                        <button onClick={() => paginate(1)}>&lt;&lt;</button>
                    </li>
                )}
                {currentPage > 1 && (
                    <li>
                        <button onClick={() => paginate(currentPage - 1)}>&lt;</button>
                    </li>
                )}
                {visiblePageNumbers().map(number => (
                    <li key={number}>
                        <button
                            onClick={() => paginate(number)}
                            className={`page-link ${currentPage === number ? 'active' : ''}`}
                        >
                            {number}
                        </button>
                    </li>
                ))}
                {currentPage < totalPages && (
                    <li>
                        <button onClick={() => paginate(currentPage + 1)}>&gt;</button>
                    </li>
                )}
                {currentPage < totalPages && (
                    <li>
                        <button onClick={() => paginate(totalPages)}>&gt;&gt;</button>
                    </li>
                )}
            </ul>
        </nav>
    );
};

Pagination.propTypes = {
    itemsPerPage: PropTypes.number.isRequired,
    totalItems: PropTypes.number.isRequired,
    paginate: PropTypes.func.isRequired,
    currentPage: PropTypes.number.isRequired,
    className: PropTypes.string
};

export default Pagination;
