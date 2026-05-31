'use client';

import React from 'react';

export default function WorkLogo() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .work-logo-container {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 1000;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .work-logo-img {
          height: 200px;
          object-fit: contain;
          filter: drop-shadow(2px 3px 6px rgba(0,0,0,0.15));
          transition: height 0.3s ease;
        }
        @media (max-width: 768px) {
          .work-logo-container {
            top: 16px;
            right: 16px;
          }
          .work-logo-img {
            height: 100px;
          }
        }
      `}} />
      <div className="work-logo-container">
        <img 
          src="/images/gongwon.png" 
          alt="GONGWON Logo" 
          className="work-logo-img"
        />
      </div>
    </>
  );
}
