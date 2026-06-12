import React, { useState } from 'react';

export const OfferTiles = ({ offers = [], onBuy = () => {} }) => {

  const firstFeatures = Array.isArray(offers?.[0]?.premiumFeatures) ? offers[0].premiumFeatures : null;
  const featuresOrder = firstFeatures ? firstFeatures.map(f => f.featureName) : null;

  return (
    <div className="promo-tiles" role="list">
      {(offers || []).map((offer) => {
        const featureMap = new Map((offer.premiumFeatures || []).map(f => [f.featureName]));

        return (
          <div key={offer.id || offer.name || offer.title} className="promo-tile" role="listitem">
            <div className="promo-tile-title">{offer.name || offer.title}</div>
            {offer.description && <div className="promo-tile-desc">{offer.description}</div>}

            {featuresOrder ? (
              // narzucona kolejność z pierwszej oferty
              <ul className="promo-features">
                {featuresOrder.map(fname => (
                  <li key={fname}>
                    <span className="feature-name">{fname}</span>{' '}
                    <span className="feature-value">{featureMap.has(fname) ? featureMap.get(fname) : '—'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              Array.isArray(offer.premiumFeatures) && offer.premiumFeatures.length > 0 && (
                <ul className="promo-features">
                  {offer.premiumFeatures.map(f => (
                    <li key={f.id}><span className="feature-name">{f.featureName}</span></li>
                  ))}
                </ul>
              )
            )}

            <div className="promo-tile-duration">{offer.durationDays} days</div>
            <div className="promo-tile-price">{offer.price?.amount ?? ''} {offer.price?.currency ?? ''}</div>
            <button className="promo-buy" onClick={() => onBuy(offer)}>Buy</button>
          </div>
        );
      })}
    </div>
  );
};

const PremiumPromoModal = ({ open, onClose, options = [] }) => {
  const [dismissDays, setDismissDays] = useState(0);

  if (!open) return null;

  const handleClose = () => {
    if (typeof onClose === 'function') onClose({ dismissDays });
  };

  return (
    <div className="promo-modal-overlay" onClick={handleClose}>
      <div className="promo-modal" onClick={(e) => e.stopPropagation()}>
        <button className="promo-close" onClick={handleClose} aria-label="close">✕</button>
        <h3 className="promo-title">Upgrade to Premium</h3>
        <OfferTiles offers={options} onBuy={(offer) => {
          window.location.href = `/subscribe?planId=${offer.id}`;
        }} />
      </div>
    </div>
  );
};

export default PremiumPromoModal;
