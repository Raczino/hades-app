import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import { getUser } from '../../Common/Request/Requests';
import NotificationComponent from '../../Common/websockets/NotificationComponent';
import ProfileHeader from '../User/ProfileHeader';
import { OfferTiles } from '../../Common/Modals/PremiumPromoModal';
import SurveyList from '../../Common/SurveyList/SurveyList';
import ArticleList from '../../Common/ArticleList/ArticleList';

const Home = () => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [userName, setUserName] = useState(null);
    const [notificationModalOpen, setNotificationModalOpen] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);
    const [promoOffers, setPromoOffers] = useState([]);

    useEffect(() => {
        if (userData) return;
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

    useEffect(() => {
        // fetch subscription offers once userData is available
        const fetchOffers = async () => {
            if (!userData) return;
            try {
                const res = await fetch('http://localhost:8080/api/v1/subscription/plan/offers?currencyCode=PLN', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
                    },
                });
                if (!res.ok) {
                    console.warn('Failed to fetch promo offers:', res.status);
                    return;
                }
                const data = await res.json();
                // backend may return { items: [...] } or an array
                const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
                setPromoOffers(arr);
            } catch (err) {
                console.error('Error fetching promo offers:', err);
            }
        };
        fetchOffers();
    }, [userData]);

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
        navigate('/create-article');
    };

    const handleBuy = (offer) => {
        // Przekierowanie do strony subskrypcji / płatności z przekazaniem wybranej oferty
        navigate('/subscribe', { state: { offer } });
    };

    // DEVELOPMENT FLAG: ustaw na false, żeby WYŁĄCZYĆ wyświetlanie modala promo (przydatne w dev)
    const DEV_PROMO_ENABLED = false; // <-- change to false to disable promo modal globally during development

    useEffect(() => {
        // jeśli wyłączamy promo w czasie developmentu, ustawiamy długie tłumienie
        if (DEV_PROMO_ENABLED === false) {
            const farFuture = Date.now() + 10 * 365 * 24 * 60 * 60 * 1000; // 10 lat
            localStorage.setItem('premiumPromoDismissedUntil', String(farFuture));
            // upewnij się, że nie ma wymuszenia
            localStorage.removeItem('premiumPromoForceShow');
        } else {
            // jeśli włączone, usuń ewentualne hard-disable ustawione wcześniej
            if (localStorage.getItem('premiumPromoDismissedUntil')) {
                localStorage.removeItem('premiumPromoDismissedUntil');
            }
            // DEV: wymuś natychmiastowy pokaz modala (test) — ustaw klucz, manager go odczyta
            localStorage.setItem('premiumPromoForceShow', '1');
        }
    }, []); // uruchom raz przy mountowaniu

    return (
        <div className="home">
            <ProfileHeader
                user={userData}
                onHome={() => { }}
                onExplore={goToArticles}
                onCreateArticle={goToCreateArticle}
                onProfile={goToProfile}
                onLogout={logOut}
                notificationCount={notificationCount}
                onNotificationClick={() => setNotificationModalOpen(true)}
                promoOffers={promoOffers} // pass offers to header so manager/modal can use them
            />
            <NotificationComponent
                userId={userData?.id}
                open={notificationModalOpen}
                onClose={() => setNotificationModalOpen(false)}
                setNotificationCount={setNotificationCount}
            />
            <div className="home-board-content"  style={{ marginTop: '150px' }}>
                {userData && (String(userData.accountType || '').toLowerCase() !== 'premium') && (
                    <div className="premium-section">
                        <h3 className="premium-title">Upgrade to Premium account</h3>
                        <div className="premium-options">
                            <OfferTiles
                                offers={promoOffers}
                                onBuy={handleBuy}
                            />
                        </div>
                    </div>
                )}
                <div className="home-welcome">
                    <div className="my-surveys">
                        <SurveyList
                            title="Yours surveys"
                            userId={userData?.id ?? localStorage.getItem('userId')}
                        />
                    </div>
                    <div className="my-articles">
                        <h2>Your Articles</h2>
                        <ArticleList userId={userData?.id ?? localStorage.getItem('userId')} />
                     </div>
                </div>
            </div>
        </div>
    );
}

export default Home;
