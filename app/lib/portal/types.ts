export type ClientStatus = "active" | "disabled";

export interface ClientAccount {
  id: string;
  auth_user_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  status: ClientStatus;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientDelivery {
  id: string;
  client_account_id: string;
  title: string;
  campaign: string;
  description: string | null;
  delivered_at: string;
  read_at: string | null;
  archived_at: string | null;
  notification_status: "not_sent" | "pending" | "sent" | "failed";
  created_at: string;
}

export interface DeliveryFile {
  id: string;
  delivery_id: string;
  client_account_id: string;
  storage_path: string;
  filename: string;
  mime_type: string;
  file_size: number;
  revoked_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  client_account_id: string | null;
  auth_user_id: string | null;
  action: string;
  file_id: string | null;
  delivery_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
