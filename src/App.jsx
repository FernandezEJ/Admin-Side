import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Announcements from './pages/Announcements';
import CreateAnnouncement from './pages/CreateAnnouncement';
import ViewAnnouncement from './pages/ViewAnnouncement';
import EditAnnouncement from './pages/EditAnnouncement';
import Verification from './pages/Verification';
import VerificationDetail from './pages/VerificationDetail';
import Donors from './pages/Donors';
import Rewards from './pages/Rewards';
import AddReward from './pages/AddReward';
import Feedback from './pages/Feedback';
import Reports from './pages/Reports';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/announcements/create" element={<CreateAnnouncement />} />
        <Route path="/announcements/:id" element={<ViewAnnouncement />} />
        <Route path="/announcements/:id/edit" element={<EditAnnouncement />} />
        <Route path="/verification" element={<Verification />} />
        <Route path="/verification/:id" element={<VerificationDetail />} />
        <Route path="/donors" element={<Donors />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/rewards/create" element={<AddReward />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;