import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from '../pages/Home/HomePage'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import ProjectsPage from '../pages/Projects/ProjectsPage'
import { isDesktop } from '../lib/platform'

export default function AppRoutes() {
    return (
        <Routes>
            <Route
                path="/"
                element={isDesktop ? <Navigate to="/dashboard" replace /> : <HomePage />}
            />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
        </Routes>
    )
}
