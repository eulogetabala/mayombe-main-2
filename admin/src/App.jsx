import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Promos from './pages/Promos'
import Restaurants from './pages/Restaurants'
import Layout from './components/Layout'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/promos" element={<Promos />} />
          <Route path="/restaurants" element={<Restaurants />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
