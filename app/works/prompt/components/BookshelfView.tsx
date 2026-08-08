'use client';

import React from 'react';
import { MAGAZINE_ISSUES, MagazineIssue } from '../data/magazines';

interface BookshelfViewProps {
  onSelectIssue: (issueId: number) => void;
}

export default function BookshelfView({ onSelectIssue }: BookshelfViewProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        boxSizing: 'border-box',
        background: 'radial-gradient(circle at 50% 30%, #3D2B1F 0%, #1F150F 80%, #120B07 100%)',
        overflow: 'hidden',
      }}
    >
      {/* 아날로그 조명 & 림 라이트 헤일로 */}
      <div
        style={{
          position: 'absolute',
          top: '5%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80%',
          height: '400px',
          background: 'radial-gradient(ellipse at center, rgba(245, 200, 150, 0.15) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* 헤더 타이틀 */}
      <div
        style={{
          zIndex: 2,
          textAlign: 'center',
          marginBottom: '40px',
        }}
      >
        <div
          style={{
            fontFamily: "'Nanum Pen Script', cursive, sans-serif",
            fontSize: '1.6rem',
            color: '#D4AF37',
            letterSpacing: '2px',
            marginBottom: '6px',
          }}
        >
          #2 PORTFOLIO ARCHIVE
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: '3.2rem',
            fontWeight: 900,
            color: '#FAF3E0',
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '6px',
            textShadow: '0 4px 12px rgba(0,0,0,0.6)',
          }}
        >
          PROMPT MAGAZINE
        </h1>
        <p
          style={{
            margin: '8px 0 0 0',
            color: 'rgba(250, 243, 224, 0.7)',
            fontSize: '1.05rem',
            fontFamily: "'Nanum Myeongjo', serif",
          }}
        >
          원하는 호수를 클릭하여 테이블 위에서 실물 매거진을 펼쳐보세요.
        </p>
      </div>

      {/* 우드 책장 틀 (Bookshelf Compartment Frame) */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '1100px',
          background: 'linear-[#2F1F17]',
          backgroundColor: '#2F1F17',
          border: '14px solid #4A3326',
          borderRadius: '12px',
          boxShadow: `
            inset 0 0 40px rgba(0, 0, 0, 0.9),
            inset 0 10px 20px rgba(0, 0, 0, 0.8),
            0 20px 50px rgba(0, 0, 0, 0.7)
          `,
          padding: '40px 30px 20px 30px',
          boxSizing: 'border-box',
          zIndex: 2,
        }}
      >
        {/* 책장 뒷판 나뭇결 패턴 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 80px, rgba(255,255,255,0.03) 81px, rgba(0,0,0,0.1) 160px)',
            pointerEvents: 'none',
            borderRadius: '4px',
          }}
        />

        {/* 진열된 매거진 카드 그리드 (Scalable Grid) */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'flex-end',
            gap: '28px',
            position: 'relative',
            zIndex: 3,
            minHeight: '380px',
            paddingBottom: '20px',
          }}
        >
          {MAGAZINE_ISSUES.map((issue: MagazineIssue) => (
            <BookshelfItem key={issue.id} issue={issue} onClick={() => onSelectIssue(issue.id)} />
          ))}
        </div>

        {/* 책장 선반 바닥판 (Wooden Shelf Plank) */}
        <div
          style={{
            width: '100%',
            height: '24px',
            background: 'linear-gradient(180deg, #604232 0%, #3D291D 60%, #281B13 100%)',
            borderRadius: '4px',
            borderTop: '3px solid #7A5540',
            boxShadow: '0 8px 16px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.5)',
            position: 'relative',
            marginTop: '10px',
          }}
        />
      </div>

      {/* 가이드 안내 텍스트 */}
      <div
        style={{
          marginTop: '24px',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.9rem',
          fontFamily: "'Nanum Myeongjo', serif",
          zIndex: 2,
        }}
      >
        PROMPT Archive • 1080 × 1350 Magazine Format
      </div>
    </div>
  );
}

interface BookshelfItemProps {
  issue: MagazineIssue;
  onClick: () => void;
}

function BookshelfItem({ issue, onClick }: BookshelfItemProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '170px',
        cursor: 'pointer',
        perspective: '1000px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transition: 'transform 0.3s ease, filter 0.3s ease',
        transform: isHovered ? 'translateY(-16px) scale(1.05)' : 'translateY(0) scale(1)',
        zIndex: isHovered ? 10 : 1,
      }}
    >
      {/* 1080 * 1350 비율 (4:5) 입체 매거진 커버 카드 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4 / 5', // exact 1080 * 1350 ratio
          backgroundColor: issue.coverBg,
          borderRadius: '4px 8px 8px 4px',
          overflow: 'hidden',
          boxShadow: isHovered
            ? '0 25px 35px rgba(0,0,0,0.7), -10px 10px 20px rgba(0,0,0,0.5)'
            : '0 12px 20px rgba(0,0,0,0.6), -4px 4px 10px rgba(0,0,0,0.4)',
          borderLeft: '5px solid rgba(255,255,255,0.2)',
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '16px 14px',
          boxSizing: 'border-box',
        }}
      >
        {/* 매거진 상단 은은한 그라데이션 및 로고 */}
        <div style={{ zIndex: 2 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: `1px solid ${issue.accentColor}44`,
              paddingBottom: '6px',
            }}
          >
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 900,
                fontSize: '1.2rem',
                color: '#FFFFFF',
                letterSpacing: '2px',
              }}
            >
              PROMPT
            </span>
            <span
              style={{
                backgroundColor: issue.themeColor,
                color: '#FFFFFF',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '3px',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              VOL.{issue.vol < 10 ? `0${issue.vol}` : issue.vol}
            </span>
          </div>

          <div
            style={{
              marginTop: '12px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: issue.accentColor,
              lineHeight: 1.3,
              fontFamily: "'Nanum Myeongjo', serif",
            }}
          >
            {issue.title}
          </div>
        </div>

        {/* 매거진 썸네일 히어로 그래픽 */}
        <div
          style={{
            width: '100%',
            height: '80px',
            borderRadius: '4px',
            background: `radial-gradient(circle at 30% 30%, ${issue.themeColor} 0%, rgba(0,0,0,0.6) 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '10px 0',
            boxShadow: 'inset 0 0 15px rgba(0,0,0,0.5)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              fontSize: '2rem',
              fontWeight: 900,
              color: 'rgba(255,255,255,0.2)',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            0{issue.vol}
          </span>
        </div>

        {/* 매거진 하단 서브타이틀 및 발행 정보 */}
        <div style={{ zIndex: 2 }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.65rem',
              color: 'rgba(255,255,255,0.7)',
              fontFamily: "'Nanum Myeongjo', serif",
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {issue.subtitle}
          </p>
          <div
            style={{
              marginTop: '6px',
              fontSize: '0.55rem',
              color: 'rgba(255,255,255,0.4)',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {issue.issueDate}
          </div>
        </div>

        {/* 종이 표면 하이라이트 광택 (Paper Gloss Shift) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: isHovered
              ? 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 50%)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 60%)',
            pointerEvents: 'none',
            transition: 'background 0.3s ease',
          }}
        />

        {/* 왼쪽 책등 접힘선 수직 그림자 (Spine Crease) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '8px',
            height: '100%',
            background: 'linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* 세워진 명찰 / 라벨 (Shelf Vol Name Tag) */}
      <div
        style={{
          marginTop: '12px',
          background: isHovered ? issue.themeColor : '#231812',
          color: isHovered ? '#FFFFFF' : '#D4AF37',
          border: `1px solid ${issue.themeColor}88`,
          borderRadius: '4px',
          padding: '4px 10px',
          fontSize: '0.75rem',
          fontWeight: 700,
          fontFamily: "'Inter', sans-serif",
          boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
          transition: 'all 0.3s ease',
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        Vol. 0{issue.vol} 읽기 →
      </div>
    </div>
  );
}
