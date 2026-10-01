import { Routes, Route, Navigate } from 'react-router-dom'
import App from '../App'
import Dashboard from '../pages/Dashboard/page'
import Project from '../pages/Projects/page'
import { isDesktop } from '../lib/platform'

export default function AppRoutes() {
    return (
        <Routes>
            <Route
                path="/"
                element={isDesktop ? <Navigate to="/dashboard" replace /> : <App />}
            />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/Project" element={<Project />} />
        </Routes>
    )
}
