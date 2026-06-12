import React, { useEffect, useState, useRef } from 'react';
import PremiumPromoModal from './PremiumPromoModal';
import { getUser } from '../../Common/Request/Requests';

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const DISMISS_KEY = 'premiumPromoDismissedUntil';

const PremiumPromoManager = ({ user: userProp, options }) => {
    const [user, setUser] = useState(userProp || null);
    const [open, setOpen] = useState(false);
    const intervalRef = useRef(null);
    const timeoutRef = useRef(null);
    const offers = options && options.length ? options : [
        { title: 'Monthly subscription', desc: 'Best for short term', price: '€4.99 / month' },
        { title: 'Half-yearly subscription', desc: 'Save 15%', price: '€24.99 / 6 months' },
        { title: 'Yearly subscription', desc: 'Best value', price: '€44.99 / year' },
    ];

    useEffect(() => {
        let mounted = true;
        if (!userProp) {
            const uid = localStorage.getItem('userId');
            if (uid) {
                (async () => {
                    try {
                        const data = await getUser(uid);
                        if (mounted) setUser(data);
                    } catch (e) { /* ignore */ }
                })();
            }
        } else {
            setUser(userProp);
        }
        return () => { mounted = false; };
    }, [userProp]);

    useEffect(() => {
        if (!user) return;
        if (String(user.accountType || '').toLowerCase() === 'premium') return;

        // If dev/test forced show requested, open immediately and clear the flag
        const forceShow = localStorage.getItem('premiumPromoForceShow');
        if (forceShow) {
            localStorage.removeItem('premiumPromoForceShow');
            setOpen(true);
            // continue — still setup regular timers if desired
        }

        const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
        const now = Date.now();
        if (dismissedUntil && now < dismissedUntil) return;

        // show first after 30min, then every 30min
        timeoutRef.current = setTimeout(() => {
            setOpen(true);
            localStorage.setItem('premiumPromoLastShown', String(Date.now()));
        }, DEFAULT_INTERVAL_MS);

        intervalRef.current = setInterval(() => {
            const dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
            if (dismissed && Date.now() < dismissed) return;
            setOpen(true);
            localStorage.setItem('premiumPromoLastShown', String(Date.now()));
        }, DEFAULT_INTERVAL_MS);

        return () => {
            clearTimeout(timeoutRef.current);
            clearInterval(intervalRef.current);
        };
    }, [user]);

    const handleClose = ({ dismissDays = 0 } = {}) => {
        setOpen(false);
        if (dismissDays > 0) {
            const until = Date.now() + dismissDays * 24 * 60 * 60 * 1000;
            localStorage.setItem(DISMISS_KEY, String(until));
        } else {
            const until = Date.now() + (1 * 60 * 60 * 1000);
            localStorage.setItem(DISMISS_KEY, String(until));
        }
    };

    return (
        <PremiumPromoModal open={open} onClose={handleClose} options={offers} />
    );
};

export default PremiumPromoManager;