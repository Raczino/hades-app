import React from 'react';
import './profile.css';
import { FaBell, FaCheck } from 'react-icons/fa';

const ProfileHeader = ({
    user,
    onExplore,
    onCreateArticle,
    onProfile,
    onLogout,
    onTabClick,
    notificationCount,
    onNotificationClick,
    onHome,
    showFollowButton,
    isFollowing,
    onFollowClick,
    followLoading,
}) => (
    <div className="profile-header">
        <div className="avatar">
            <span>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
        </div>
        <div className="profile-main-info">
            <h2>{user?.firstName} {user?.lastName}</h2>
                <p className="profile-role">{user?.userRole}</p>
            <div className="profile-title-row">
                <p className="profile-email">{user?.email}</p>
                {showFollowButton && (
                    <button className={`follow-btn ${isFollowing ? 'active' : ''}`} onClick={onFollowClick} disabled={followLoading}>
                        {isFollowing ? <><FaCheck style={{ marginRight: 6 }} /> Obserwujesz</> : 'Obserwuj'}
                    </button>
                )}
            </div>
        </div>
        <div className="header-navButtons">
            <div className="header-bell" onClick={onNotificationClick}>
                <FaBell size={28} />
                {notificationCount > 0 && (
                    <span className="header-bell-count">{notificationCount}</span>
                )}
            </div>
            <button className="button" onClick={onHome}>Home</button>
            <button className="button" onClick={onExplore}>Explore</button>
            <button className="button" onClick={onCreateArticle}>Create Article</button>
            <button className="button" onClick={onProfile}>Profile</button>
            <button className="button" onClick={onLogout}>Log out</button>
        </div>
    </div>
);

export default ProfileHeader;
