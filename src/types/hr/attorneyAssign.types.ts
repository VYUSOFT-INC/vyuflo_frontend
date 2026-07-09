export interface AttorneyAssignOption {
  user_id: string;
  full_name: string;
  email: string;
  profile_picture_url: string | null;
  law_firm_name: string | null;
  specialisations: string[];
  active_cases: number;
  is_accepting: boolean;
}