import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import CalendarPage from './pages/CalendarPage'
import DatabaseTest from './components/database/DatabaseTest'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-gray-800 text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold">SanctissiMissa</h1>
            <nav>
              <ul className="flex space-x-4">
                <li>
                  <Link to="/" className="hover:text-gray-300">Home</Link>
                </li>
                <li>
                  <Link to="/calendar" className="hover:text-gray-300">Calendar</Link>
                </li>
                <li>
                  <Link to="/mass" className="hover:text-gray-300">Mass</Link>
                </li>
                <li>
                  <Link to="/office" className="hover:text-gray-300">Divine Office</Link>
                </li>
                <li>
                  <Link to="/database-test" className="hover:text-gray-300">DB Test</Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>

        <main className="container mx-auto py-6">
          <Routes>
            <Route path="/" element={<CalendarPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/database-test" element={<DatabaseTest />} />
            {/* Add more routes as we develop more pages */}
          </Routes>
        </main>

        <footer className="bg-gray-800 text-white p-4 mt-auto">
          <div className="container mx-auto text-center">
            <p>SanctissiMissa &copy; 2025 Robin L. M. Cheung, MBA</p>
          </div>
        </footer>
      </div>
    </Router>
  )
}

export default App
