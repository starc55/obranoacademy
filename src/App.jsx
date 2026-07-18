import { lazy, Suspense, useSyncExternalStore } from "react";
import { Navigate, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { StudentLayout } from "./components/layout/StudentLayout";
import { authService } from "./services/authService";

const page = (name) =>
  lazy(() =>
    import(`./pages/${name}.jsx`).then((module) => ({ default: module[name] })),
  );
const Login = page("LoginPage"),
  Register = page("RegisterPage"),
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
  Settings = page("SettingsPage"),
  AdminSubmissions = page("AdminSubmissionsPage"),
  StudentDashboard = page("StudentDashboardPage"),
  StudentSubmit = page("StudentSubmitPage"),
  StudentSubmissions = page("StudentSubmissionsPage"),
  StudentSubmissionDetail = page("StudentSubmissionDetailPage"),
  StudentNotifications = page("StudentNotificationsPage");

function RouteLoader() {
  return (
    <div className="route-loader">
      <i />
      <span>Yuklanmoqda...</span>
    </div>
  );
}

function ProtectedApp({ authenticated, role }) {
  if (!authenticated) return <Navigate to="/login" replace />;
  if (role === "STUDENT")
    return <StudentLayout><Suspense fallback={<RouteLoader/>}><Routes>
      <Route path="/student" element={<StudentDashboard/>}/>
      <Route path="/student/submit" element={<StudentSubmit/>}/>
      <Route path="/student/submissions" element={<StudentSubmissions/>}/>
      <Route path="/student/submissions/:id" element={<StudentSubmissionDetail/>}/>
      <Route path="/student/notifications" element={<StudentNotifications/>}/>
      <Route path="*" element={<Navigate to="/student" replace/>}/>
    </Routes></Suspense></StudentLayout>;
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
          <Route path="/submissions" element={<AdminSubmissions />} />
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
  const role = authService.getRole();
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
        path="/register"
        element={authenticated ? <Navigate to={role === "STUDENT" ? "/student" : "/"} replace /> : <Suspense fallback={<RouteLoader/>}><Register/></Suspense>}
      />
      <Route
        path="/*"
        element={<ProtectedApp authenticated={authenticated} role={role} />}
      />
    </Routes>
  );
}
