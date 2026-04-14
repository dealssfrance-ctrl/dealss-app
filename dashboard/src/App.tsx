import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Offers from './pages/Offers';
import Statistics from './pages/Statistics';
import Traffic from './pages/Traffic';
import './App.css';

function App() {
  return (
    <Router>
      <div id="wrapper">
        <Sidebar />
        <div id="page-wrapper" className="gray-bg">
          <div className="row border-bottom">
            <nav className="navbar navbar-static-top white-bg" role="navigation">
              <div className="navbar-header">
                <form role="search" className="navbar-form-custom">
                  <div className="form-group">
                    <input type="text" placeholder="Search for something..." className="form-control" name="top-search" id="top-search" />
                  </div>
                </form>
              </div>
              <ul className="nav navbar-top-links navbar-right">
                <li>
                  <span className="m-r-sm text-muted welcome-message">Welcome to Dealss Admin</span>
                </li>
                <li>
                  <a href="#">
                    <i className="fa fa-sign-out"></i> Log out
                  </a>
                </li>
              </ul>
            </nav>
          </div>
          <div className="wrapper wrapper-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/users" element={<Users />} />
              <Route path="/offers" element={<Offers />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/traffic" element={<Traffic />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
