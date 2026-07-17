// src/types/message.types.ts

// ── Matches ThreadResponse from backend ──────────────────────────────────────
export interface Conversation {
  id:               string;
  thread_type:      "direct" | "group";
  title?:           string;
  application_id?:  string;
  is_archived:      boolean;

  // The other participant (direct) or group info
  participant_id?:  string;
  participant_name: string;
  participant_role?: string;
  avatar_url?:      string; 
  is_online:        boolean;
  last_seen_at?:    string;    // ← ADD

  // Left-panel preview
  last_message?:    string;
  last_message_at?: string;
  unread_count:     number;

  created_at:       string;
}

// ── Matches MessageResponse from backend ─────────────────────────────────────

// export interface Message {
//   id:           string;
//   thread_id:    string;
//   sender_id:    string;
//   content?:     string;
//   message_type: "text" | "file_attachment" | "call_event" | "system_notification";

//   // Attachment fields
//   attachment_name?: string;
//   attachment_url?:  string;
//   attachment_size?: string;
//   document_id?:     string;

//   // Call fields
//   call_duration_seconds?: number;
//   call_status?: "incoming" | "outgoing" | "missed" | "declined";

//   is_read:    boolean;
//   is_edited:  boolean;
//   is_deleted: boolean;

//   created_at: string;
//   updated_at?: string;
// }

// src/types/message.types.ts

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  content?: string | null;
  message_type: "text" | "file_attachment" | "call_event" | "system_notification";

  attachment_name?: string | null;
  attachment_url?: string | null;
  attachment_size?: string | null;
  document_id?: string | null;

  // add these
  attachment_type?: string | null;
  is_image?: boolean;

  call_duration_seconds?: number;
  call_status?: "incoming" | "outgoing" | "missed" | "declined";

  is_read: boolean;
  is_edited: boolean;
  is_deleted: boolean;

  created_at: string;
  updated_at?: string | null;
}
export interface ThreadListResponse {
  items: Conversation[];
  total: number;
}

export interface MessageListResponse {
  items: Message[];
  total: number;
}

export interface SendMessagePayload {
  conversationId: string;
  content?:       string;
  file?:          File;
}