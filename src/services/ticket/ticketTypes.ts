
export interface Ticket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  content: string;
  from_user: boolean;
  created_at: string;
  user_id: string | null;
  author_profile?: Profile | null;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  message_id?: string | null;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  created_at: string;
}

export interface Profile {
  id: string;
  discord_id?: string;
  discord_username?: string;
  discord_avatar?: string;
  created_at?: string;
  updated_at?: string;
}
