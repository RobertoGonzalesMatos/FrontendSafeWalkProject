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

// Helper to generate a 4-digit code
const generateCode = () => Math.floor(1000 + Math.random() * 9000).toString();

// Seed some initial requests for testing
if (USE_MOCK_AUTH) {
  const seedIds = ["req_seed_1", "req_seed_2"];

  mockRequests.set(seedIds[0], {
    requestId: seedIds[0],
    status: "MATCHING",
    createdAt: Date.now() - 1000 * 60 * 5, // 5 min ago
    etaSeconds: null,
  });

  mockRequests.set(seedIds[1], {
    requestId: seedIds[1],
    status: "MATCHING",
    createdAt: Date.now() - 1000 * 60 * 15, // 15 min ago
    etaSeconds: null,
  });
}

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
          email: email || "mock@brown.edu",
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
          req.status === "ASSIGNED" || req.status === "WALKING"
            ? {
              // Fake live position (jittered)
              lat: 41.8268 + Math.random() * 0.0005,
              lng: -71.4025 + Math.random() * 0.0005,
            }
            : null,
        // Optional safety codes
        studentCode:
          req.status === "ASSIGNED" || req.status === "WALKING"
            ? "1234" // Fixed code for demo simplicity, or use req.code if we stored it
            : undefined,
        volunteerCode: undefined, // Not using this flow for now
        volunteerHeadingDegrees:
          req.status === "ASSIGNED" || req.status === "WALKING"
            ? Math.floor(Math.random() * 360)
            : null,
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
  listVolunteerRequests: async () => {
    if (USE_MOCK_AUTH) {
      // Return all MATCHING requests
      const list: VolunteerRequestListItem[] = [];
      for (const req of mockRequests.values()) {
        if (req.status === "MATCHING") {
          list.push({
            requestId: req.requestId,
            studentName: "Student " + req.requestId.slice(-3),
            pickupLabel: "Main Green", // Mock data
            destinationLabel: "SciLi", // Mock data
            createdAt: new Date(req.createdAt).toISOString(),
          });
        }
      }
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return apiFetch<VolunteerRequestListItem[]>("/volunteer/requests");
  },

  getVolunteerRequest: async (requestId: string) => {
    if (USE_MOCK_AUTH) {
      const req = mockRequests.get(requestId);
      if (!req) return Promise.reject("Not found");

      // Return details
      return {
        requestId: req.requestId,
        studentName: "Student " + req.requestId.slice(-3),
        pickup: { label: "Main Green", lat: 41.8268, lng: -71.4025 },
        destination: { label: "SciLi", lat: 41.8270, lng: -71.4000 },
        etaToStudentSeconds: 300,
        etaTripSeconds: 600,
        status: (req.status === "MATCHING" ? "OPEN" : "ACCEPTED") as "OPEN" | "ACCEPTED",
      };
    }
    return apiFetch<VolunteerRequestDetail>(`/volunteer/requests/${requestId}`);
  },

  acceptVolunteerRequest: async (requestId: string) => {
    if (USE_MOCK_AUTH) {
      const req = mockRequests.get(requestId);
      if (req) {
        req.status = "ASSIGNED";
        mockRequests.set(requestId, req);
      }
      return { ok: true };
    }

    return apiFetch<{ ok: true }>(`/volunteer/requests/${requestId}/accept`, {
      method: "POST",
    });
  },

  verifyVolunteerCode: async (requestId: string, code: string) => {
    if (USE_MOCK_AUTH) {
      const req = mockRequests.get(requestId);
      if (!req) throw new Error("Request not found");

      // In a real app we'd compare against the actual generated code
      // For demo with fixed "1234":
      if (code === "1234") {
        req.status = "WALKING";
        mockRequests.set(requestId, req);
        return { ok: true };
      } else {
        throw new Error("Incorrect code");
      }
    }

    return apiFetch<{ ok: true }>(`/volunteer/requests/${requestId}/verify`, {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },

  declineVolunteerRequest: async (requestId: string) => {
    return apiFetch<{ ok: true }>(`/volunteer/requests/${requestId}/decline`, {
      method: "POST",
    });
  },

  // Student marks complete
  completeStudentRequest: async (requestId: string) => {
    if (USE_MOCK_AUTH) {
      const req = mockRequests.get(requestId);
      if (req) {
        req.status = "COMPLETED";
        mockRequests.set(requestId, req);
      }
      return { ok: true };
    }

    return apiFetch<{ ok: true }>(`/student/requests/${requestId}/complete`, {
      method: "POST",
    });
  },

  // Volunteer marks complete (optional, if we want dual confirmation)
  completeVolunteerRequest: async (requestId: string) => {
    // reuse same logic or just error if only student can do it
    return API.completeStudentRequest(requestId);
  },
};
