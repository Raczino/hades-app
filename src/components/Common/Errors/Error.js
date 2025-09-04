import React from 'react';

const Error = ({ error, onClose }) => {
  if (!error) return null;
  return (
    <div className="modal">
      <div className="modalContent">
        <span className="close" onClick={onClose}>&times;</span>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    </div>
  );
};

export default Error;