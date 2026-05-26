import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import CVManager from './pages/CVManager';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import Applications from './pages/Applications';
import InterviewPrep from './pages/InterviewPrep';
import Settings from './pages/Settings';
import Inbox from './pages/Inbox';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/inbox" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="cv" element={<CVManager />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="startups" element={<Inbox />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/:id" element={<JobDetail />} />
        <Route path="applications" element={<Applications />} />
        <Route path="interview-prep" element={<InterviewPrep />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
