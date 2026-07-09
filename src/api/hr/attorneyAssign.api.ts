import axios from "../axios";
import type { AttorneyAssignOption } from "../../types/hr/attorneyAssign.types";

export const listAttorneysForAssignment = async (): Promise<AttorneyAssignOption[]> => {
  const res = await axios.get<{ attorneys: AttorneyAssignOption[] }>("/hr/attorneys");
  return res.data.attorneys;
};