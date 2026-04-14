import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path ? 'active' : '';

  const handleNavClick = () => {
    setIsOpen(false);
  };

  return (
    <>
      <button className="sidebar-toggle" onClick={() => setIsOpen(!isOpen)}>
        <i className={`fa ${isOpen ? 'fa-times' : 'fa-bars'}`}></i>
      </button>
      {isOpen && <div className="sidebar-overlay visible" onClick={() => setIsOpen(false)} />}
      <nav className={`navbar-default navbar-static-side ${isOpen ? 'sidebar-open' : ''}`} role="navigation">
        <div className="sidebar-collapse">
          <ul className="nav metismenu" id="side-menu">
            <li className="nav-header">
              <div className="logo-element">
                <span className="logo-text">IN+</span>
              </div>
            </li>
            <li className={isActive('/')}>
              <Link to="/" title="Dashboard" onClick={handleNavClick}>
                <i className="fa fa-th-large"></i>
              </Link>
            </li>
            <li className={isActive('/statistics')}>
              <Link to="/statistics" title="Statistics" onClick={handleNavClick}>
                <i className="fa fa-bar-chart"></i>
              </Link>
            </li>
            <li className={isActive('/offers')}>
              <Link to="/offers" title="Offers" onClick={handleNavClick}>
                <i className="fa fa-tag"></i>
              </Link>
            </li>
            <li className={isActive('/users')}>
              <Link to="/users" title="Users" onClick={handleNavClick}>
                <i className="fa fa-users"></i>
              </Link>
            </li>
            <li className={isActive('/traffic')}>
              <Link to="/traffic" title="Traffic" onClick={handleNavClick}>
                <i className="fa fa-line-chart"></i>
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
