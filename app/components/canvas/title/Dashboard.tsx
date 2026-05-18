import React from 'react';
import { MapData } from './data'; // data.ts 경로에 맞게 수정

interface DashboardProps {
  selectedNode: MapData[string] | null;
  dashboardPos: 'left' | 'right' | 'top' | null;
  onClose: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ selectedNode, dashboardPos, onClose }) => {
  if (!selectedNode || !dashboardPos) return null;

  return (
    <>
      <div 
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1999, backgroundColor: 'rgba(0,0,0,0.05)' }} 
        onClick={onClose} 
      />
      <div 
        className={`dashboard ${dashboardPos}`}
        style={{
          position: 'fixed', zIndex: 2000, display: 'flex', flexDirection: 'column',
          padding: '50px', backgroundColor: '#F7F5F0',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)',
          border: '1px solid #E2DEC9', borderRadius: '24px', 
          animation: 'inkSpreadIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          ...(dashboardPos === 'left' && { left: '24px', top: '24px', width: '35vw', minWidth: '400px', height: 'calc(100vh - 48px)' }),
          ...(dashboardPos === 'right' && { right: '24px', top: '24px', width: '35vw', minWidth: '400px', height: 'calc(100vh - 48px)' }),
          ...(dashboardPos === 'top' && { left: '24px', top: '24px', width: 'calc(100vw - 48px)', height: '45vh' }),
        }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '32px', background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#333' }}>✕</button>
        
        <div style={{ flex: 1, opacity: 0, animation: 'fadeInContent 0.5s 0.4s forwards', display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
          <h2 style={{ color: selectedNode.color, borderBottom: `4px solid ${selectedNode.color}`, paddingBottom: '15px', fontSize: '2.5rem', margin: 0 }}>
            {selectedNode.caption}
          </h2>
          <p style={{ marginTop: '30px', fontSize: '1.15rem', lineHeight: '1.8', color: '#444' }}>
            {selectedNode.description}
          </p>
          
          <button 
            className="view-more-btn"
            style={{
              marginTop: 'auto', marginBottom: '10px', padding: '12px 24px',
              backgroundColor: selectedNode.color, color: '#fff', border: 'none', 
              borderRadius: '30px', cursor: 'pointer', fontSize: '0.95rem',
              fontWeight: 'bold', transition: 'transform 0.2s', width: 'fit-content',
              alignSelf: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}
            onClick={() => alert(`${selectedNode.id} 상세 페이지로 전체 확장 이동!`)}
          >
            VIEW PROJECT DETAILS
          </button>
        </div>
      </div>

      <style>{`
        @keyframes inkSpreadIn {
          from { clip-path: circle(0% at ${dashboardPos === 'left' ? '0% 50%' : dashboardPos === 'right' ? '100% 50%' : '50% 0%'}); opacity: 0; }
          to { clip-path: circle(150% at ${dashboardPos === 'left' ? '0% 50%' : dashboardPos === 'right' ? '100% 50%' : '50% 0%'}); opacity: 1; }
        }
        @keyframes fadeInContent {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .view-more-btn:hover { transform: scale(1.05); }
        .view-more-btn:active { transform: scale(0.98); }
      `}</style>
    </>
  );
};

export default Dashboard;