// src/types/auth/personalEmail.types.ts

export interface AddPersonalEmailRequest {
  personal_email: string;
}

export interface VerifyPersonalEmailRequest {
  otp_code: string;
}

export interface MessageResponse {
  message: string;
}