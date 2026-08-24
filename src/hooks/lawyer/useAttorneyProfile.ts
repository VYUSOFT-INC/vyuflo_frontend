// src/hooks/lawyer/useAttorneyProfile.ts
import { useQuery } from "@tanstack/react-query";
import { getAttorneyProfile } from "../../api/lawyer/attorneyProfile.api";

export function useAttorneyProfile() {
  return useQuery({
    queryKey: ["attorney-profile"],
    queryFn: getAttorneyProfile,
    staleTime: 60_000,
  });
}