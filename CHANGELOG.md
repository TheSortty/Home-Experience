# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Auth & Routing**: Centralized role resolution logic into `src/services/roleService.ts` to ensure consistency between client and server environments.
- **Auth & Routing**: Implemented strict server-side role validation in Layouts to prevent flickering and secure routes. Admins attempting to visit `/dashboard` will now be redirected to `/admin/dashboard`, and non-admins attempting to visit `/admin` will be redirected to `/dashboard`.
- **Auth & Routing**: Refactored `AuthContext` and `LoginPage` to use the new `roleService.ts` to reduce code duplication and enforce consistent role fallbacks.
