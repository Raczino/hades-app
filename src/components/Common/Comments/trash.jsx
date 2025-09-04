import { FaTrash } from 'react-icons/fa';
import './Trash.css';

const TrashIcon = ({ onClick, disabled }) => {
    return (
        <FaTrash
            className="Trash"
            onClick={disabled ? undefined : onClick}
            title="Delete comment"
            style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
        />
    );
};

export default TrashIcon;