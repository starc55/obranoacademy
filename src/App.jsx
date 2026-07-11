import { lazy, Suspense, useSyncExternalStore } from "react";
import { Navigate, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { authService } from "./services/authService";

const page = (name) =>
  lazy(() =>
    import(`./pages/${name}.jsx`).then((module) => ({ default: module[name] })),
  );
const Login = page("LoginPage"),
  Dashboard = page("DashboardPage"),
  Students = page("StudentsPage"),
  StudentDetails = page("StudentDetailsPage"),
  Groups = page("GroupsPage"),
  GroupDetails = page("GroupDetailsPage"),
  Individuals = page("IndividualsPage"),
  Attendance = page("AttendancePage"),
  Payments = page("PaymentsPage"),
  Reports = page("ReportsPage"),
  WeeklySummary = page("WeeklySummaryPage"),
  Alerts = page("AlertsPage"),
  Settings = page("SettingsPage");

function RouteLoader() {
  return (
    <div className="route-loader">
      <i />
      <span>Yuklanmoqda...</span>
    </div>
  );
}

function ProtectedApp({ authenticated }) {
  if (!authenticated) return <Navigate to="/login" replace />;
  return (
    <AppLayout>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/students/:id" element={<StudentDetails />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/:id" element={<GroupDetails />} />
          <Route path="/individuals" element={<Individuals />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/weekly-summary" element={<WeeklySummary />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}

export function App() {
  const authenticated = useSyncExternalStore(
    authService.subscribe,
    authService.isAuthenticated,
    () => false,
  );
  return (
    <Routes>
      <Route
        path="/login"
        element={
          authenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Suspense fallback={<RouteLoader />}>
              <Login />
            </Suspense>
          )
        }
      />
      <Route
        path="/*"
        element={<ProtectedApp authenticated={authenticated} />}
      />
    </Routes>
  );
}
