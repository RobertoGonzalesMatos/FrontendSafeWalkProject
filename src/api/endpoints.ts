import { apiFetch } from "./client";
import type {
  LoginResponse,
  Role,
  StudentCreateRequestBody,
  StudentCreateRequestResponse,
  StudentRequestStatusResponse,
  SafewalkerRequestDetail,
  SafewalkerRequestListItem,
  StatusUpdateResponse,
} from "./types";
import * as Location from "expo-location";
import * as Network from "expo-network";
import { startStatusHeartbeat } from "./statusHeartbeat";

const USE_MOCK_AUTH = true;

type MockRequest = {
  requestId: string;
  status: StudentRequestStatusResponse["status"];
  createdAt: number;
  etaSeconds: number | null;
  safewalkerHeadingDegrees?: number | null;
};

const mockRequests = new Map<string, MockRequest>();
type RegisterSafewalkerParams = {
  name: string;
  sid: string;
  listening_addr: string;
  label: string;
  lat: number;
  long: number;
};

async function registerSafewalker(params: RegisterSafewalkerParams) {
  const qp = new URLSearchParams({
    name: params.name,
    sid: params.sid,
    listening_addr: params.listening_addr,
    label: params.label,
    lat: String(params.lat),
    long: String(params.long),
  });

  const res = await fetch(
    `http://localhost:8090/register-safewalker?${qp.toString()}`,
    {
      method: "POST",
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`register-safewalker failed: ${res.status} ${text}`);
  }
}
async function getDeviceInfoForRegistration() {
  // 1) Location permission + coords
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission not granted");
  }

  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const lat = loc.coords.latitude;
  const long = loc.coords.longitude;

  // 2) LAN IP (Wi-Fi). This is the one your backend can usually reach.
  const ip = await Network.getIpAddressAsync();

  // If user is on cellular/VPN, IP might not be reachable.
  if (!ip || ip === "0.0.0.0") {
    throw new Error("Could not determine device IP");
  }

  return { ip, lat, long };
}
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
      const role: Role =
        code.toLowerCase() === "safewalker" ? "SAFEWALKER" : "STUDENT";

      await new Promise((r) => setTimeout(r, 400));

      const resp = {
        token: "mock-token",
        user: {
          id: `mock-${role.toLowerCase()}-${email || "user"}`,
          role,
          name: role === "SAFEWALKER" ? "SafeWalker" : "Student",
          email: email || "mock@brown.edu",
        },
      };

      if (resp.user.role === "SAFEWALKER") {
        const { ip, lat, long } = await getDeviceInfoForRegistration();

        await registerSafewalker({
          name: resp.user.name,
          sid: resp.user.id,
          listening_addr: `${ip}:2030`,
          label: "",
          lat,
          long,
        });
      }

      // ✅ Start heartbeat for BOTH roles
      await startStatusHeartbeat({
        sid: resp.user.id,
        isStudent: resp.user.role === "STUDENT",
        getIsActiveRequest: () => resp.user.role === "SAFEWALKER", // default: safewalker active, student not active until they request
        intervalMs: 5000,
        label: "",
      });

      return resp;
    }

    const resp = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });

    if (resp.user.role === "SAFEWALKER") {
      const { ip, lat, long } = await getDeviceInfoForRegistration();

      await registerSafewalker({
        name: resp.user.name,
        sid: resp.user.id,
        listening_addr: `${ip}:2030`,
        label: "",
        lat,
        long,
      });
    }

    // ✅ Start heartbeat for BOTH roles
    await startStatusHeartbeat({
      sid: resp.user.id,
      isStudent: resp.user.role === "STUDENT",
      getIsActiveRequest: () => resp.user.role === "SAFEWALKER",
      intervalMs: 5000,
      label: "",
    });

    return resp;
  },

  // Student
  createStudentRequest: async (
    body: StudentCreateRequestBody
  ): Promise<StudentCreateRequestResponse> => {
    if (USE_MOCK_AUTH) {
      const requestId = `req_${Math.random().toString(36).slice(2, 8)}`;

      mockRequests.set(requestId, {
        requestId,
        status: "MATCHING",
        createdAt: Date.now(),
        etaSeconds: null,
      });

      setTimeout(() => {
        const req = mockRequests.get(requestId);
        if (!req || req.status !== "MATCHING") return;

        const found = Math.random() < 0.7;
        if (found) {
          req.status = "ASSIGNED";
          req.etaSeconds = 60 * (3 + Math.floor(Math.random() * 5));
        } else {
          req.status = "NO_AVAILABLE";
        }
        mockRequests.set(requestId, req);
      }, 2500);

      return { requestId };
    }

    const qp = new URLSearchParams({
      plabel: body.pickup.label ?? "",
      plat: String(body.pickup.lat),
      plng: String(body.pickup.lng),
      dlabel: body.destination.label ?? "",
      dlat: String(body.destination.lat),
      dlng: String(body.destination.lng),
    });

    const res = await fetch(
      `http://localhost:8090/request-safewalk?${qp.toString()}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`request-safewalk failed: ${res.status} ${text}`);
    }

    const data = await res.json();

    return {
      requestId:
        data.requestId ?? `req_${Math.random().toString(36).slice(2, 8)}`,
    };
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
          safewalkerLive: null,
        };
      }

      return {
        requestId,
        status: req.status,
        etaSeconds: req.etaSeconds,
        safewalkerLive:
          req.status === "ASSIGNED" || req.status === "WALKING"
            ? {
                // Fake live position (jittered)
                lat: 41.8268 + Math.random() * 0.0005,
                lng: -71.4025 + Math.random() * 0.0005,
              }
            : null,
        studentCode:
          req.status === "ASSIGNED" || req.status === "WALKING"
            ? "1234" // Fixed code for demo simplicity, or use req.code if we stored it
            : undefined,
        safewalkerCode: undefined, // Not using this flow for now
        safewalkerHeadingDegrees:
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

    return apiFetch<{ ok: true }>(
      `/cancel-safewalk?sid=${encodeURIComponent(requestId)}&isStudent=${true}`,
      {
        method: "POST",
      }
    );
  },

  // SafeWalker
  listSafewalkerRequests: async () => {
    if (USE_MOCK_AUTH) {
      // Return all MATCHING requests
      const list: SafewalkerRequestListItem[] = [];
      for (const req of mockRequests.values()) {
        if (req.status === "MATCHING") {
          list.push({
            requestId: req.requestId,
            studentName: "Student " + req.requestId.slice(-3),
            pickupLabel: "Main Green", // Mock data
            destinationLabel: "SciLi", // Mock data
            createdAt: new Date(req.createdAt).getTime(),
          });
        }
      }
      return list.sort((a, b) =>
        b.createdAt.toString().localeCompare(a.createdAt.toString())
      );
    }
    return apiFetch<SafewalkerRequestListItem[]>("/safewalker/requests");
  },

  getSafewalkerRequest: async (requestId: string) => {
    if (USE_MOCK_AUTH) {
      const req = mockRequests.get(requestId);
      if (!req) return Promise.reject("Not found");

      // Return details
      return {
        requestId: req.requestId,
        studentName: "Student " + req.requestId.slice(-3),
        pickup: { label: "Main Green", lat: 41.8268, lng: -71.4025 },
        destination: { label: "SciLi", lat: 41.827, lng: -71.4 },
        etaToStudentSeconds: 300,
        etaTripSeconds: 600,
        status: (req.status === "MATCHING" ? "OPEN" : "ACCEPTED") as
          | "OPEN"
          | "ACCEPTED",
      };
    }
    return apiFetch<SafewalkerRequestDetail>(
      `/safewalker/requests/${requestId}`
    );
  },

  acceptSafewalkerRequest: async (requestId: string) => {
    if (USE_MOCK_AUTH) {
      const req = mockRequests.get(requestId);
      if (req) {
        req.status = "ASSIGNED";
        mockRequests.set(requestId, req);
      }
      return { ok: true };
    }

    return apiFetch<{ ok: true }>(`/safewalker/requests/${requestId}/accept`, {
      method: "POST",
    });
  },

  verifySafewalkerCode: async (requestId: string, code: string) => {
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

    return apiFetch<{ ok: true }>(`/safewalker/requests/${requestId}/verify`, {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },

  declineSafewalkerRequest: async (requestId: string) => {
    if (USE_MOCK_AUTH) {
      const req = mockRequests.get(requestId);
      if (req) {
        // Return request to matching pool
        req.status = "MATCHING";
        mockRequests.set(requestId, req);
      }
      return { ok: true };
    }

    return apiFetch<{ ok: true }>(`/safewalker/requests/${requestId}/decline`, {
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

  deregisterSafewalker: async (sid: string) => {
    return apiFetch<{ ok: true }>(
      `/deregister-safewalker?sid=${encodeURIComponent(sid)}`,
      {
        method: "POST",
      }
    );
  },

  // SafeWalker marks complete (optional, if we want dual confirmation)
  completeSafewalkerRequest: async (requestId: string) => {
    // reuse same logic or just error if only student can do it
    return API.completeStudentRequest(requestId);
  },
  statusUpdate: async (params: {
    sid: string;
    isStudent: boolean;
    isActiveRequest: boolean;
    label?: string; // blank ok
    lat: number;
    lng: number;
  }) => {
    const qp = new URLSearchParams({
      sid: params.sid, // encodeURIComponent happens in URLSearchParams
      isStudent: String(params.isStudent),
      isActiveRequest: String(params.isActiveRequest),
      label: params.label ?? "",
      lat: String(params.lat),
      lng: String(params.lng),
    });

    return apiFetch<StatusUpdateResponse>(`/status-update?${qp.toString()}`, {
      method: "POST",
    });
  },
};
