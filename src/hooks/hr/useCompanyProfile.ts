// src/hooks/hr/useCompanyProfile.ts
import { useQuery } from "@tanstack/react-query";
import { getCompanyProfile } from "../../api/hr/companyProfile.api";

export function useCompanyProfile() {
  return useQuery({
    queryKey: ["company-profile"],
    queryFn: getCompanyProfile,
    staleTime: 60_000,
  });
}