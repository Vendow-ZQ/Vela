import { useAppStore } from './store/appStore';
import HomePage from './pages/HomePage';
import PersonalDataPage from './pages/PersonalDataPage';
import CalendarPage from './pages/CalendarPage';
import NegotiationPage from './pages/NegotiationPage';
import TodayPlanPage from './pages/TodayPlanPage';
import ActiveTrainingPage from './pages/ActiveTrainingPage';
import TrainingReviewPage from './pages/TrainingReviewPage';
import SessionDetailPage from './pages/SessionDetailPage';

export default function App() {
  const currentPage = useAppStore((s) => s.currentPage);

  switch (currentPage) {
    case 'home':
      return <HomePage />;
    case 'personalData':
      return <PersonalDataPage />;
    case 'calendar':
      return <CalendarPage />;
    case 'negotiation':
      return <NegotiationPage />;
    case 'todayPlan':
      return <TodayPlanPage />;
    case 'activeTraining':
      return <ActiveTrainingPage />;
    case 'trainingReview':
      return <TrainingReviewPage />;
    case 'sessionDetail':
      return <SessionDetailPage />;
    default:
      return <HomePage />;
  }
}
