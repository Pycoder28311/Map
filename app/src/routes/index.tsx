import { Routes, Route, Navigate } from 'react-router-dom'
import GuestOnly from '../features/auth/GuestOnly'
import AppLayout from '../components/layout/AppLayout'
import { WORKSPACE_PATH } from '../features/workspace/layout'
import Workspace from '../features/workspace/Workspace'
import RequireAuth from '../features/auth/RequireAuth'
import HomePage from '../pages/Home/HomePage'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import ProjectsPage from '../pages/Projects/ProjectsPage'
import SignInPage from '../pages/SignIn/SignInPage'
import SignUpPage from '../pages/SignUp/SignUpPage'
import ForgotPasswordPage from '../pages/ForgotPassword/ForgotPasswordPage'
import ResetPasswordPage from '../pages/ResetPassword/ResetPasswordPage'
import { isDesktop } from '../lib/platform'

export default function AppRoutes() {
    return (
        <Routes>
            <Route
                path="/"
                element={isDesktop ? <Navigate to="/dashboard" replace /> : <HomePage />}
            />

            {/* Signed-in users only, inside the navbar + sidebar frame */}
            <Route element={<RequireAuth />}>
                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/projects" element={<ProjectsPage />} />
                    <Route path={WORKSPACE_PATH} element={<Workspace />} />
                </Route>
            </Route>

            {/* Guests only */}
            <Route element={<GuestOnly />}>
                <Route path="/sign-in" element={<SignInPage />} />
                <Route path="/sign-up" element={<SignUpPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>

            {/* Everyone: the email link must open even when signed in on this device */}
            <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
    )
}
