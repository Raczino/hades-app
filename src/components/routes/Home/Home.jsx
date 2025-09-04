import React, {useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import { getUser } from '../../Common/Request/Requests';
import NotificationComponent from '../../Common/websockets/NotificationComponent';

const Home = () => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [userName, setUserName] = useState(null);
    
    const fetchUserData = async () => {
        if (!localStorage.getItem('userId')) return;
        try {
            const data = await getUser(localStorage.userId);
            setUserName(data.firstName);
            setUserData(data);
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    const goToArticles = () => {
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
            <h1 className="main-copy">Witaj, {userName || "Gość"}</h1>
            <div className="navButtons">
                <button className="button" onClick={goToArticles}>Explore</button>
                <button className="button" >My Board</button>
                <button className="button" onClick={() => goToCreateArticle()}>Create Article</button>
                <button className="button" onClick={() => goToProfile()}>Your profile</button>
                <button className="button" onClick={logOut}>Log out</button>
            </div> 
            <NotificationComponent/> 
        </div>
    );
}

export default Home;
