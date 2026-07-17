// src/hooks/useOnboardingGuard.ts
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMeApi } from '../api/auth.api';
import { getOnboardingRoute, getDashboardRoute } from '../utils/navigation';

export function useOnboardingGuard() {
  const navigate = useNavigate();

  useEffect(() => {
    getMeApi()
      .then((user) => {
        // ── Not completed → send to correct onboarding step
        if (!user.is_verified || !user.onboarding_completed) {
          navigate(getOnboardingRoute(user.onboarding_step), { replace: true });
          return;
        }

        // ── Completed → send to role-based dashboard
        const role = user.roles[0] ?? '';
        navigate(getDashboardRoute(role), { replace: true });
      })
      .catch(() => {
        // Token invalid / expired → send to login
        navigate('/login', { replace: true });
      });
  }, [navigate]);
}