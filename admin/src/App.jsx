import React, { useState } from 'react';
import './App.css';
import PromosManager from './components/PromosManager';
import RestaurantStatusManager from './components/RestaurantStatusManager';
import RatingsManager from './components/RatingsManager';

function App() {
  const [activeTab, setActiveTab] = useState('promos');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { id: 'promos', label: 'Promotions', icon: '🎯' },
    { id: 'restaurants', label: 'Statuts Restaurants', icon: '🍽️' },
    { id: 'ratings', label: 'Annotations', icon: '⭐' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'promos':
        return <PromosManager />;
      case 'restaurants':
        return <RestaurantStatusManager />;
      case 'ratings':
        return <RatingsManager />;
      default:
        return <PromosManager />;
    }
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo">M</div>
            {sidebarOpen && <span className="logo-text">Mayombe Admin</span>}
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            type="button"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {sidebarOpen && (
            <div className="user-info">
              <div className="user-avatar">A</div>
              <div className="user-details">
                <div className="user-name">Administrateur</div>
                <div className="user-role">Admin</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-container">
        {/* Banner Header */}
        <header className="banner-header">
          <div className="banner-content">
            <h1 className="banner-title">
              {menuItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
            </h1>
            <p className="banner-subtitle">Gestion de la plateforme Mayombe</p>
          </div>
        </header>

        {/* Content Area */}
        <div className="content-area">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default App;
