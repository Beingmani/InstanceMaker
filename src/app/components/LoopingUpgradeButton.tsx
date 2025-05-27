import React from 'react';
import { Button } from 'antd';
import './UpgradeButton.css';

const LoopingUpgradeButton = ({ onClick, className = '' }) => {
  return (
    <Button
      type="primary"
      size="large"
      className={`scrolling-subscribe-button ${className}`}
      onClick={onClick}
    >
      <div className="scrolling-text-container">
        <div className="scrolling-text">
       *** UPGRADE TO PREMIUM ***** UNLIMITED ACCESS ***** UPGRADE TO PREMIUM ***** UNLIMITED ACCESS *****
        </div>
      </div>
    </Button>
  );
};

export default LoopingUpgradeButton;