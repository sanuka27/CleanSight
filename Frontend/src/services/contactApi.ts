import { ApiError } from "@/lib/api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
}

export interface ContactSuccessResponse {
  ok: true;
  id: string;
  message: string;
}

export interface ContactErrorResponse {
  success: false;
  message?: string;
  errors?: Record<string, string>;
}

/**
 * Submit a contact form message (public — no auth needed).
 */
export async function submitContactMessage(
  payload: ContactPayload
): Promise<ContactSuccessResponse> {
  const res = await fetch(`${API_BASE_URL}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({ message: res.statusText }));

  if (!res.ok) {
    // Attach validation errors so the form can display per-field messages
    const err = new ApiError(
      data.message || "Failed to send message",
      res.status
    ) as ApiError & { errors?: Record<string, string> };
    err.errors = data.errors;
    throw err;
  }

  return data as ContactSuccessResponse;
}
