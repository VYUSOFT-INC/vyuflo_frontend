// src/pages/public/LinkedInCallback.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { callSSOEndpoint } from "../../lib/sso";
import { useAuthStore } from "../../store/authStore";
import { getDashboardRoute } from "../../utils/navigation";

export default function LinkedInCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params  = new URLSearchParams(window.location.search);
    const code    = params.get("code");
    const state   = params.get("state");
    const saved   = sessionStorage.getItem("linkedin_state");
    const postLogin = sessionStorage.getItem("linkedin_post_login"); // "dashboard" if from login

    if (!code || state !== saved) { navigate("/signup"); return; }
    sessionStorage.removeItem("linkedin_state");
    sessionStorage.removeItem("linkedin_post_login");

    callSSOEndpoint("linkedin", code)
      .then(data => {
        useAuthStore.getState().setAuth({
          access_token: data.access_token,
          user:         data.user,
          roles:        data.roles,
        });
        // From login → dashboard, from signup → profile-setup (already verified)
        navigate(
          postLogin === "/dashboard"
            ? getDashboardRoute(data.roles?.[0] ?? "")
            : "/signup/profile-setup",
          { replace: true }
        );
      })
      .catch(() => navigate("/signup?sso_error=linkedin"));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center text-[#4b5563] text-sm">
      Completing sign-in…
    </div>
  );
}