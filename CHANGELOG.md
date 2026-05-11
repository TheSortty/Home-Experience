# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Middleware & Routing**: Refactored `middleware.ts` to implement centralized server-side role-based redirection. This fixes infinite loops and blank screens when Admins accessed student routes.
- **Preview Mode**: Implemented "Student Preview" mode for Admins. Admins can now bypass enrollment and lock checks by adding `?preview=true` to campus URLs. Added a "Vista Previa (Alumno)" button in the Admin Sidebar.
- **Material Flow**: Enhanced icon rendering for resources in both Admin and Student views. Added automatic detection for Word (`.doc`, `.docx`), Excel (`.xls`, `.xlsx`, `.csv`), and PowerPoint (`.ppt`, `.pptx`) extensions with custom icons and colors.
- **Admin Dashboard**: Optimized dashboard loading to maintain layout visibility during data refreshes (F5 fix).
- **Admin Courses**: Improved `LessonModal` to allow adding materials during the creation of a new class. Materials added before saving are now batched and saved together with the lesson.
- **Stability Fixes**: Fixed critical "split" errors in Admin and Campus dashboards by adding safe null/undefined checks for dates and user emails.
- **Stability Fixes**: Resolved "Unique Key Prop" warnings in the Admin Dashboard by ensuring all mapped elements have stable UUID-based keys.
- **Auth**: Ensured `handleLogout` performs a full client-side redirect to guarantee a clean state after mock removal.
- **Registration**: Removed all legacy `MockDatabase` fallback logic. The form now relies exclusively on Supabase for schema fetching and submission.
- **Middleware**: Optimized role-based redirection using direct RPC calls in a consolidated "Step 4" resolution phase.
- **UI Stability**: Completed the transition to stable UUID-based keys for all dashboard components.
- **Forms**: Fixed critical "TypeError: e.map is not a function" bug by implementing a defensive shield for form options in `RegistrationForm.tsx`.
- **Admin Forms**: Added an options editor to `AdminForms.tsx` and implemented automatic string-to-array conversion to ensure correct JSON schema structure in Supabase.
- **Production**: Implemented a Cloudflare-ready HTTPS detection patch in `middleware.ts` to prevent "split-brain" cookie issues.
- **Dashboard**: Added an anti-data-erasure shield in `AdminDashboard.tsx` to prevent states from being overwritten with zeros/nulls during network timeouts or browser inactivity.
- **Dashboard**: Refactored notification loading into a dedicated `fetchGlobalStats` function that executes immediately on mount, ensuring badges appear without delay.
- **Statistics**: Corrected the "Active Students" metric to strictly count users with the `student` role in the `profiles` table.
- **UI/Rebranding**: Renamed "Cursos LMS" to "CAMPUS" in the admin sidebar and integrated the Home logo circle as its new icon.
- **LMS/Campus Admin**: Implemented the "Anti-Data Erasure" shield in `AdminCourses.tsx`, `AdminStudents.tsx`, and `AdminCalendar.tsx`. Data is no longer cleared on fetch errors or timeouts, preserving the UI for the user.
- **Silent Loading**: Refactored admin modules to only show loading spinners on the initial component mount. Background refreshes (e.g., on window focus) now update data silently without flickering.
- **Student Management**: Added a robust first-load spinner and error-safe data mapping to the Alumnos section.
- **Calendar/Cycles**: Optimized cycle detail loading and attendance toggling to be more resilient to network intermitency.

### Removed
- **Legacy Mocks**: Physically deleted `src/services/mockDatabase.ts` and removed all remaining references. Switched `TestimonialListModal` and `RegistrationForm` to use real Supabase data.
