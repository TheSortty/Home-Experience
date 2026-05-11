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

### Removed
- **Legacy Mocks**: Physically deleted `src/services/mockDatabase.ts` and removed all remaining references. Switched `TestimonialListModal` and `RegistrationForm` to use real Supabase data.
