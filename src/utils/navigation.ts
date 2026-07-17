export function getDashboardRoute(role: string): string {
  switch (role) {
    case 'employee':
      return '/dashboard';
    case 'hr':
      return '/employer/dashboard';
    case 'attorney':
      return '/lawyer/dashboard';
    case 'app_admin':
      return '/admin/dashboard';
    default:
      return '/dashboard';
  }
}

export function getOnboardingRoute(step: number): string {
  switch (step) {
    case 1:
      return '/signup/verify-email';
    case 2:
      return '/signup/profile-setup';
    default:
      return '/signup/profile-setup';
  }
}