import { apiFetch } from "./client";
import type {
  LoginResponse,
  Role,
  StudentCreateRequestBody,
  StudentCreateRequestResponse,
  StudentRequestStatusResponse,
  VolunteerRequestDetail,
  VolunteerRequestListItem,
} from "./types";
const USE_MOCK_AUTH = true;

type MockRequest = {
  requestId: string;
  status: StudentRequestStatusResponse["status"];
  createdAt: number;
  etaSeconds: number | null;
  volunteerHeadingDegrees?: number | null;
};

const mockRequests = new Map<string, MockRequest>();

export const API = {
  login: async (email: string, code: string) => {
    if (USE_MOCK_AUTH) {
      // Super simple role rule for hackathon:
      // - code "volunteer" => volunteer
      // - otherwise => student
      const role: Role =
        code.toLowerCase() === "volunteer" ? "VOLUNTEER" : "STUDENT";

      // Optional: allow "v" or "s"
      // const role = code.toLowerCase().startsWith("v") ? "VOLUNTEER" : "STUDENT";

      // Simulate network delay
      await new Promise((r) => setTimeout(r, 400));

      return {
        token: "mock-token",
        user: {
          id: `mock-${role.toLowerCase()}-${email || "user"}`,
          role,
          name: role === "VOLUNTEER" ? "Volunteer" : "Student",
        },
      };
    }

    // Real backend call (later)
    return apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
  },

  // Student
  createStudentRequest: async (
    body: StudentCreateRequestBody
  ): Promise<StudentCreateRequestResponse> => {
    if (USE_MOCK_AUTH) {
      const requestId = `req_${Math.random().toString(36).slice(2, 8)}`;

      // Initial state
      mockRequests.set(requestId, {
        requestId,
        status: "MATCHING",
        createdAt: Date.now(),
        etaSeconds: null,
      });

      // Simulate backend matching after delay
      setTimeout(() => {
        const req = mockRequests.get(requestId);
        if (!req || req.status !== "MATCHING") return;

        // 70% chance a volunteer is found
        const found = Math.random() < 0.7;

        if (found) {
          req.status = "ASSIGNED";
          req.etaSeconds = 60 * (3 + Math.floor(Math.random() * 5)); // 3–7 min
        } else {
          req.status = "NO_AVAILABLE";
        }

        mockRequests.set(requestId, req);
      }, 2500); // simulate backend work

      return { requestId };
    }

    // REAL BACKEND (later)
    return apiFetch<StudentCreateRequestResponse>("/student/requests", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  getStudentRequestStatus: async (
    requestId: string
  ): Promise<StudentRequestStatusResponse> => {
    if (USE_MOCK_AUTH) {
      const req = mockRequests.get(requestId);

      if (!req) {
        return {
          requestId,
          status: "CANCELLED",
          etaSeconds: null,
          volunteerLive: null,
        };
      }

      return {
        requestId,
        status: req.status,
        etaSeconds: req.etaSeconds,
        volunteerLive:
          req.status === "ASSIGNED"
            ? {
                // Fake live position (jittered)
                lat: 41.8268 + Math.random() * 0.0005,
                lng: -71.4025 + Math.random() * 0.0005,
              }
            : null,
        // Optional safety codes
        studentCode: req.status === "ASSIGNED" ? "STU-42A" : undefined,
        volunteerCode: req.status === "ASSIGNED" ? "VOL-9XZ" : undefined,
        volunteerHeadingDegrees:
          req.status === "ASSIGNED" ? Math.floor(Math.random() * 360) : null,
      };
    }

    // REAL BACKEND (later)
    return apiFetch<StudentRequestStatusResponse>(
      `/student/requests/${requestId}`
    );
  },

  cancelStudentRequest: async (requestId: string) => {
    if (USE_MOCK_AUTH) {
      mockRequests.delete(requestId);
      return { ok: true };
    }

    return apiFetch<{ ok: true }>(`/student/requests/${requestId}/cancel`, {
      method: "POST",
    });
  },

  // Volunteer
  listVolunteerRequests: () =>
    apiFetch<VolunteerRequestListItem[]>("/volunteer/requests"),

  getVolunteerRequest: (requestId: string) =>
    apiFetch<VolunteerRequestDetail>(`/volunteer/requests/${requestId}`),

  acceptVolunteerRequest: (requestId: string, studentCode?: string) =>
    apiFetch<{ ok: true }>(`/volunteer/requests/${requestId}/accept`, {
      method: "POST",
      body: JSON.stringify({ studentCode }),
    }),

  declineVolunteerRequest: (requestId: string) =>
    apiFetch<{ ok: true }>(`/volunteer/requests/${requestId}/decline`, {
      method: "POST",
    }),

  completeVolunteerRequest: (requestId: string) =>
    apiFetch<{ ok: true }>(`/volunteer/requests/${requestId}/complete`, {
      method: "POST",
    }),
};
