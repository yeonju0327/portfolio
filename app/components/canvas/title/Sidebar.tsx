import React, { useState, useEffect } from 'react';
import { RAW_TREE } from './data';
import SidebarNode from './SidebarNode';

interface SidebarProps {
  activeIds: string[];
  onExpandNode: (parentId: string | null, childId: string, customDelay?: number) => void;
  onMoveCameraOnly: (nodeId: string) => void;
  onNodeDoubleClick: (nodeId: string) => void; 
  onAutoExplore: () => void; 
  isAutoExploring: boolean; 
}

const CORK_TEXTURE = `
  linear-gradient(rgba(156, 114, 79, 0.9), rgba(156, 114, 79, 0.9)),
  url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.25'/%3E%3C/svg%3E")
`;

const Sidebar: React.FC<SidebarProps> = (props) => {
  const { isAutoExploring, onAutoExplore } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ root: true });
  const [isHeadMounted, setIsHeadMounted] = useState(false);
  
  // ✨ 카메라 1.2초 이동 시 캔버스 노드들의 오작동/호버 프리징을 막기 위한 투명 쉴드 상태
  const [isMovementShieldActive, setIsMovementShieldActive] = useState(false);

  useEffect(() => {
    const headTimer = setTimeout(() => {
      setIsHeadMounted(true);
    }, 50);
    return () => clearTimeout(headTimer);
  }, []);

  // ✨ 카메라가 움직이는 1.2초(1200ms) 동안 화면 전체 포인터 이벤트를 임시 격리
  const triggerMovementShield = () => {
    setIsMovementShieldActive(true);
    setTimeout(() => {
      setIsMovementShieldActive(false);
    }, 1200);
  };

  const handleExpandAll = () => {
    if (isAutoExploring) return;
    const allExpanded: Record<string, boolean> = {};
    Object.keys(RAW_TREE).forEach(key => {
      if (RAW_TREE[key].children && RAW_TREE[key].children.length > 0) {
        allExpanded[key] = true;
      }
    });
    setExpandedNodes(allExpanded);
  };

  const handleCollapseAll = () => {
    if (isAutoExploring) return;
    setExpandedNodes({});
  };

  const handleTriggerAutoExplore = () => {
    if (isAutoExploring) return;
    setIsOpen(false);
    onAutoExplore();
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: '24px', 
          bottom: '24px', 
          height: 'auto', 
          left: isOpen ? '24px' : '-350px', 
          width: '340px',
          backgroundColor: '#9C724F', 
          backgroundImage: CORK_TEXTURE, 
          border: '10px solid #5C3A21', 
          borderRadius: '8px', 
          boxShadow: isOpen ? '12px 12px 40px rgba(0,0,0,0.4)' : 'none',
          zIndex: 1500,
          transition: 'left 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Nanum Pen Script', cursive",
        }}
      >
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="flag-toggle-container"
          style={{
            position: 'absolute',
            top: '40px',
            right: '-100px', 
            width: '90px', 
            height: '85px',
            cursor: 'pointer',
            zIndex: 1501,
            opacity: isAutoExploring ? 0 : 1,
            pointerEvents: isAutoExploring ? 'none' : 'auto',
            transition: 'opacity 0.6s ease-in-out'
          }}
        >
          <div className="flag-paper flag-pink" style={{ top: '0px', '--flag-rot': isOpen ? '4deg' : '-2deg' } as React.CSSProperties}>
            <span>INDEX</span>
          </div>
          <div className="flag-paper flag-yellow" style={{ top: '38px', '--flag-rot': isOpen ? '-3deg' : '3deg' } as React.CSSProperties}>
            <span>MAP</span>
          </div>
        </div>

        <div style={{ padding: '34px 24px 20px 24px', borderBottom: '2px dashed rgba(255, 255, 255, 0.2)' }}>
          <h3 style={{ margin: 0, color: '#FDFCF8', fontSize: '2.2rem', letterSpacing: '0.02em', textShadow: '1px 1px 3px rgba(0,0,0,0.4)' }}>
            MAP REPOSITORY
          </h3>
          <p style={{ margin: '6px 0 0 2px', fontSize: '1.2rem', color: '#E2DEC9', textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}>
            인터랙티브 노드 인덱스 탐색기
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', padding: '16px 24px 0 24px', position: 'relative', zIndex: 10 }}>
          <button className="icon-btn" data-tooltip="모든 탭 펼치기" onClick={handleExpandAll}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 13 12 18 17 13"></polyline>
              <polyline points="7 6 12 11 17 6"></polyline>
            </svg>
          </button>
          <button className="icon-btn" data-tooltip="모든 탭 닫기" onClick={handleCollapseAll}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 11 12 6 17 11"></polyline>
              <polyline points="7 18 12 13 17 18"></polyline>
            </svg>
          </button>
          <div style={{ width: '2px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 6px' }} />
          <button className="icon-btn" data-tooltip="지도 자동 탐색" onClick={handleTriggerAutoExplore}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>
        </div>

        <div className="sidebar-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 32px 16px', overflowX: 'hidden' }}>
          <div style={{
            transform: isHeadMounted ? 'translateY(0)' : 'translateY(-30px)',
            opacity: isHeadMounted ? 1 : 0,
            transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1) 0.1s, opacity 0.2s ease-out 0s'
          }}>
            <SidebarNode 
              nodeId="root" 
              parentId={null} 
              depth={0} 
              expandedNodes={expandedNodes}
              setExpandedNodes={setExpandedNodes}
              triggerMovementShield={triggerMovementShield} // ✨ 쉴드 트리거 하향 전달
              {...props} 
            />
          </div>
        </div>
      </div>

      {/* ✨ 전역 물리 이벤트 격리 쉴드 레이어 (카메라 가속 이동 중 투과 레이어 쇼크 완전 흡수) */}
      {isMovementShieldActive && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            zIndex: 99999, backgroundColor: 'transparent', pointerEvents: 'auto', cursor: 'default'
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseMove={(e) => e.stopPropagation()}
        />
      )}

      <style>{`
        .flag-toggle-container::before { content: ''; position: absolute; top: -15px; bottom: -15px; left: -15px; right: -20px; z-index: 10; }
        .flag-paper {
          position: absolute; left: -20px; width: 110px; height: 32px; display: flex; align-items: center; justify-content: flex-end; 
          padding-right: 14px; font-size: 1.15rem; letter-spacing: 1.5px; font-weight: bold; color: rgba(0,0,0,0.65); background-color: transparent !important; 
          border-radius: 2px 5px 5px 2px; transform: rotate(var(--flag-rot)); transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1); z-index: -1; 
        }
        .flag-paper::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: inherit; background-image: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%); border-radius: inherit; z-index: -1; }
        .flag-paper::after { content: ''; position: absolute; top: 0; left: 20px; right: 1px; bottom: 1px; box-shadow: 2px 3px 6px rgba(0,0,0,0.12); border-bottom-right-radius: 12px 5px; border-top-right-radius: 5px; z-index: -2; transition: box-shadow 0.3s, transform 0.3s; pointer-events: none; }
        .flag-pink { --flag-base: #FFB7C5; } .flag-yellow { --flag-base: #FFF4A3; }
        .flag-paper.flag-pink::before { background-color: var(--flag-base); } .flag-paper.flag-yellow::before { background-color: var(--flag-base); }
        .flag-toggle-container:hover .flag-paper { transform: rotate(var(--flag-rot)) translateY(-2px); }
        .flag-toggle-container:hover .flag-paper::after { box-shadow: 3px 6px 10px rgba(0,0,0,0.16); transform: translate(1px, 1px); }
        .post-it-item { display: flex; align-items: center; padding: 4px 14px; font-size: 1.3rem; cursor: pointer; user-select: none; background-color: transparent !important; border-left: none !important; transform: rotate(var(--rot)); transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1); }
        .post-it-item::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--paper-bg); background-image: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%); border-left: var(--paper-border); box-shadow: 1px 2px 4px rgba(0,0,0,0.15); border-radius: 1px; z-index: -1; }
        .post-it-item::after { content: ''; position: absolute; bottom: 2px; right: 1px; width: 70%; height: 50%; box-shadow: 1px 4px 8px rgba(0, 0, 0, 0.25); transform: rotate(2.5deg); border-bottom-right-radius: 60% 20%; z-index: -2; transition: box-shadow 0.3s, transform 0.3s; pointer-events: none; }
        .post-it-item:hover { transform: rotate(var(--rot)) translateY(-2px); } .post-it-item:hover::after { box-shadow: 2px 6px 12px rgba(0, 0, 0, 0.3); transform: rotate(3.5deg) translate(1px, 1px); }
        .folder-toggle-btn { position: relative; display: inline-flex; align-items: center; justify-content: center; margin-right: 6px; }
        .folder-toggle-btn::before { content: ''; position: absolute; top: -12px; bottom: -12px; left: -14px; right: -2px; z-index: 10; }
        .icon-btn { position: relative; background: transparent; border: 1px solid rgba(255, 255, 255, 0.25); color: rgba(255, 255, 255, 0.7); padding: 6px; border-radius: 4px; transition: background-color 0.2s, color 0.2s, border-color 0.2s, transform 0.2s; display: flex; align-items: center; justify-content: center; }
        .icon-btn:hover { background-color: rgba(255, 255, 255, 0.15); color: #FFFFFF; border-color: rgba(255, 255, 255, 0.6); transform: translateY(-1px); }
        .icon-btn::after { content: attr(data-tooltip); position: absolute; top: 100%; left: 50%; transform: translateX(-50%); margin-top: 8px; background-color: #2C2C2C; color: #FFFFFF; padding: 5px 10px; border-radius: 4px; font-size: 0.95rem; font-family: \"'Nanum Pen Script', cursive\"; letter-spacing: 1px; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity 0.2s; z-index: 2000; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .icon-btn:first-of-type::after { left: 0; transform: translateX(0); } .icon-btn:last-of-type::after { left: auto; right: 0; transform: translateX(0); } .icon-btn:hover::after { opacity: 1; }
        .sidebar-scroll::-webkit-scrollbar { width: 6px; } .sidebar-scroll::-webkit-scrollbar-track { background: transparent; } .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.25); border-radius: 6px; } .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.45); }
      `}</style>
    </>
  );
};

export default Sidebar;