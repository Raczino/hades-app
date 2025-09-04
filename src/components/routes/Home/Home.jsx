import React, {useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import { getUser } from '../../Common/Request/Requests';
import NotificationComponent from '../../Common/websockets/NotificationComponent';
import ProfileHeader from '../User/ProfileHeader';

const Home = () => {
    console.log('Home rendered'); // sprawdź czy pojawia się dwa razy

    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [userName, setUserName] = useState(null);
    const [notificationModalOpen, setNotificationModalOpen] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);

    useEffect(() => {
        if (userData) return; // nie pobieraj ponownie jeśli już masz usera
        const fetchUserData = async () => {
            if (!localStorage.getItem('userId')) return;
            try {
                const data = await getUser(localStorage.getItem('userId'));
                setUserName(data.firstName);
                setUserData(data);
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };
        fetchUserData();
    }, [userData]);

    const goToArticles = () => {
        navigate('/articles');
    };

     const goToHome = () => {
        navigate('/articles');
    };

    const goToProfile = () => {
        navigate('/profile', { state: { authorData: userData } });
    };

    const logOut = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        navigate('/login');
    };

    const goToCreateArticle = () => {
        navigate('/create');
    };

    return (
        <div className="home">
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
            <div className="home-board-content">
                {/* Tu będą wyświetlane artykuły obserwowanych osób (My Board) */}
                <h2>My Board</h2>
                <p>W tej sekcji będą wyświetlane artykuły osób, które obserwujesz.</p>
                {/* Przykład: <ArticleList articles={followedArticles} /> */}
            </div>
        </div>
    );
}

export default Home;
