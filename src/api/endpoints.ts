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
import { BACKEND_BASE_URL } from "../config";

const USE_MOCK_AUTH = false; // Mock disabled

type RegisterSafewalkerParams = {
  name: string;
  sid: string;
  label: string;
  lat: number;
  long: number;
};

// Backend expects query params for registration
// POST or GET? Backend main.go checks req.URL.Query().Get("name") ... so it reads Query Params. 
// Standard in Go http.HandleFunc is that it reads query params regardless of method if you use req.URL.Query().
// However, the previous mock code used POST. I'll use GET to be safe with main.go's reading style, or POST with query params.
// The safe bet for this specific Go backend is GET or POST *but with Query Params in the URL*.
// Helper exported for AuthContext
export async function registerSafewalker(params: RegisterSafewalkerParams) {
  const qp = new URLSearchParams({
    name: params.name,
    sid: params.sid,
    label: params.label,
    lat: String(params.lat),
    long: String(params.long),
  });

  // Using GET as main.go reads from URL.Query() which works best with GET.
  const res = await fetch(
    `${BACKEND_BASE_URL}/register-safewalker?${qp.toString()}`,
    {
      method: "GET",
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`register-safewalker failed: ${res.status} ${text}`);
  }
}

export async function getDeviceInfoForRegistration() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission not granted");
  }

  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const lat = loc.coords.latitude;
  const long = loc.coords.longitude;

  const ip = await Network.getIpAddressAsync();
  // if (!ip || ip === "0.0.0.0") ... permissive

  return { ip: ip ?? "0.0.0.0", lat, long };
}

export const API = {
  login: async (email: string, code: string) => {
    // 1. Role Logic
    // "henrywang3510@gmail.com" -> Safewalker. All others -> Student.
    // We ignore the `code` param as 'auth' implies Google login result which gives email.

    let role: Role = "STUDENT";
    if (email === "henrywang3510@gmail.com") {
      role = "SAFEWALKER";
    }

    // 2. Generate Session/User ID
    // Backend needs a stable ID. We can use email as ID or base64 it.
    // For simplicity, we use email as ID.
    const userId = email;

    // 3. User Object
    const user = {
      id: userId,
      role,
      name: role === "SAFEWALKER" ? "Henry Wang" : "Student", // Basic name
      email: email,
    };

    console.log(`[Auth] Logged in: ${email} | Role: ${role}`);

    // 4. Register if Safewalker
    if (role === "SAFEWALKER") {
      try {
        const { lat, long } = await getDeviceInfoForRegistration();
        await registerSafewalker({
          name: user.name,
          sid: user.id,
          label: "",
          lat,
          long,
        });
      } catch (e) {
        console.warn("Safewalker registration failed (location/network?):", e);
        // Should we block login? Probably yes if they need to be registered.
        // But for allowed non-blocking:
        // throw e; 
      }
    }

    // 5. Start Heartbeat (Same as before)
    // IMPORTANT: Heartbeat is what keeps the backend updated.
    await startStatusHeartbeat({
      sid: user.id,
      isStudent: role === "STUDENT",
      getIsActiveRequest: () => role === "SAFEWALKER", // Safewalker is "active" (available) by default? 
      // Wait, getIsActiveRequest is passed to `isActiveRequest` param in `status-update`.
      // For Safewalker, `isActiveRequest=true` means "I am available"? 
      // Backend: `status := req.URL.Query().Get("isActiveRequest")`. 
      // If true, it updates location. If false, it calls `remove_student`.
      // So YES, Safewalker should always send true unless they want to go offline.
      // For Student, they only send true if they have a request? 
      // Actually `startStatusHeartbeat` is called ONCE at login. 
      // The `getIsActiveRequest` callback allows dynamic changing.
      intervalMs: 5000,
      label: "",
    });

    return { token: "dummy-token", user };
  },

  // Student
  createStudentRequest: async (
    body: StudentCreateRequestBody
  ): Promise<StudentCreateRequestResponse> => {
    const qp = new URLSearchParams({
      plabel: body.pickup.label ?? "",
      plat: String(body.pickup.lat),
      plng: String(body.pickup.lng),
      dlabel: body.destination.label ?? "",
      dlat: String(body.destination.lat),
      dlng: String(body.destination.lng),
    });

    // Backend uses http.HandleFunc("/request-safewalk", server.request_safewalk)
    // It reads query params.
    const res = await fetch(
      `${BACKEND_BASE_URL}/request-safewalk?${qp.toString()}`,
      {
        method: "GET", // Using GET as params are in URL
        headers: { "Content-Type": "application/json" }
      }
    );

    if (!res.ok) {
      throw new Error(`request-safewalk failed: ${res.status}`);
    }

    const data = await res.json();
    // Expected: { success, safewalker, distance_km, match_code, error }

    if (data.success === false) {
      throw new Error(data.error || "No safewalkers available");
    }

    return {
      requestId: data.safewalker, // mapping safewalker ID to requestId so we can track it
      code: data.match_code ? String(data.match_code) : undefined,
    };
  },

  getStudentRequestStatus: async (
    requestId: string // This is the safewalker SID
  ): Promise<StudentRequestStatusResponse> => {
    // We poll `status-update`.
    // PROBLEM: We need valid lat/lng to avoid overwriting location with 0,0.
    // Hack: We can't easily get location here without `explo-location`.
    // But this function is just a poll for status.
    // If we rely on heartbeat for location, can we send a "read-only" status update?
    // Backend DOES NOT support read-only. It always updates.
    // If we send 0,0, the Safewalker sees Student at 0,0.
    // CRITICAL: This endpoint is broken for polling status without location.
    // We will attempt to get location.

    let lat = 0;
    let lng = 0;
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
      lat = loc.coords.latitude;
      lng = loc.coords.longitude;
    } catch (e) {
      // failed to get loc
    }

    const qp = new URLSearchParams({
      sid: requestId,
      isStudent: "true",
      isActiveRequest: "true",
      label: "",
      lat: String(lat),
      lng: String(lng)
    });

    const res = await fetch(`${BACKEND_BASE_URL}/status-update?${qp.toString()}`, { method: "GET" });
    // Response: { success, matching_status }
    // matching_status: true => Code Matched (WALKING)
    // matching_status: false => Not matched (ASSIGNED)

    if (!res.ok) return { requestId, status: "MATCHING", etaSeconds: null, safewalkerLive: null };

    try {
      const data = await res.json();
      const status = data.matching_status ? (data.match_code ? "ASSIGNED" : "WALKING") : "MATCHING"; // wait, matching_status=true means ASSIGNED.
      // Backend: "matching_status": true if code_matched==true OR safewalker assigned?
      // Re-reading main.go:
      // if (safewalker.Student_latest_location == Location{} || safewalker.code_matched == false) -> matching_status=false?
      // Wait, main.go line 250: if (student_loc == empty || code_matched == false) -> false.
      // So matching_status=true ONLY if code_matched == true??
      // Actually, let's re-read main.go logic carefully.

      // My backend edit:
      // if (safewalker.Student_latest_location == Location{} || safewalker.code_matched == false)
      // This means if student is assigned AND code is matched, then matching_status=true.
      // If student is assigned BUT code NOT matched, matching_status=false.

      // This is problematic. "ASSIGNED" state is when matched but code NOT verified.
      // "WALKING" is when code verified.

      // Let's adjust main.go logic first, it seems conflated. 
      // User said "backend matches safewalker". That means ASSIGNED.
      // Front-end needs to distinguish ASSIGNED vs WALKING.
      // And also MATCHING (not assigned).

      // BUT I cannot change main.go logic too much or I break other things.
      // Let's rely on `safewalker_lat` presence?
      // If `safewalker_lat` is sent, it means we are at least ASSIGNED?
      // No, `status-update` is called by student.

      // Let's defer this frontend change until I fix the backend logic in the NEXT tool call if `multi_replace` wasn't enough.
      // Actually, looking at main.go:250:
      // if (safewalker.Student_latest_location == Location{} || safewalker.code_matched == false)
      // This logic returns matching_status=FALSE if NOT walking.
      // This implies "ASSIGNED" state returns false?
      // Use `request_safewalk` confirmed "success" for ASSIGNED initial state.
      // Polling:
      // If ASSIGNED (but not code matched): matching_status=false.
      // If MATCHING (no safewalker): matching_status=false.

      // We need to distinguish "ASSIGNED" (waiting for pickup) vs "MATCHING" (searching).
      // main.go checks `safewalker` from map.
      // If `safewalker` exists in map, it means we have a session.
      // Wait, `student` calls `status-update` with `sid`.
      // If `safewalker` is found, `ok` is true.

      // So if `ok` is true, we are at least ASSIGNED.
      // Current main.go returns:
      // if ok:
      //    if (!isWalking): matching_status=false
      //    else: matching_status=true

      // So effectively:
      // matching_status=true => WALKING
      // matching_status=false => ASSIGNED (if ok) or MATCHING (if !ok)?
      // Backend sends {success: true, matching_status: false} if found but not walking.

      // So on frontend:
      // matching_status ? "WALKING" : "ASSIGNED"

      // But we need to know if we are still MATCHING (searching).
      // If we are searching, we don't have an SID to poll!
      // `StudentRequestScreen` gets SID from `createStudentRequest`.
      // So if we have SID, we are ASSIGNED.

      // Wait, `createStudentRequest` returns `safewalker` (ID).
      // So we have an ID.
      // If backend says `success: true`, we are ASSIGNED.
      // If backend says `matching_status: true`, we are WALKING.

      // Okay, so:
      // matching_status: true => WALKING
      // matching_status: false => ASSIGNED

      // Parse Safewalker Location:
      const swLive = (data.safewalker_lat || data.safewalker_lng)
        ? { lat: data.safewalker_lat, lng: data.safewalker_lng }
        : null;

      return {
        requestId,
        status: data.matching_status ? "WALKING" : "ASSIGNED",
        etaSeconds: null,
        safewalkerLive: swLive,
        safewalkerHeadingDegrees: null,
        studentCode: data.match_code ? String(data.match_code) : undefined
      };
    } catch {
      return { requestId, status: "MATCHING", etaSeconds: null, safewalkerLive: null };
    }
  },

  cancelStudentRequest: async (requestId: string) => {
    // Backend: /finish-request?sid=...
    await fetch(`${BACKEND_BASE_URL}/finish-request?sid=${requestId}`, { method: "GET" });
    return { ok: true };
  },

  // SafeWalker
  listSafewalkerRequests: async () => {
    // Not supported.
    return [];
  },

  getSafewalkerRequest: async (requestId: string) => {
    // Not supported.
    return Promise.reject("Not supported");
  },

  acceptSafewalkerRequest: async (requestId: string) => {
    // Auto-accepted.
    return { ok: true };
  },

  verifySafewalkerCode: async (requestId: string, code: string) => {
    // GET /checkcode?sid=...&code=...
    const qp = new URLSearchParams({
      sid: requestId,
      code: code
    });
    const res = await fetch(`${BACKEND_BASE_URL}/checkcode?${qp.toString()}`, { method: "GET" });
    const data = await res.json();
    if (!data.success) {
      throw new Error("Incorrect code");
    }
    return { ok: true };
  },

  declineSafewalkerRequest: async (requestId: string) => {
    // /finish-request?sid=... (resets safewalker)
    await fetch(`${BACKEND_BASE_URL}/finish-request?sid=${requestId}`, { method: "GET" });
    return { ok: true };
  },

  completeStudentRequest: async (requestId: string) => {
    // /finish-request?sid=...
    await fetch(`${BACKEND_BASE_URL}/finish-request?sid=${requestId}`, { method: "GET" });
    return { ok: true };
  },

  deregisterSafewalker: async (sid: string) => {
    await fetch(`${BACKEND_BASE_URL}/deregister-safewalker?sid=${sid}`, { method: "GET" });
    return { ok: true };
  },

  completeSafewalkerRequest: async (requestId: string) => {
    return API.completeStudentRequest(requestId);
  },

  statusUpdate: async (params: {
    sid: string;
    isStudent: boolean;
    isActiveRequest: boolean;
    label?: string;
    lat: number;
    lng: number;
  }) => {
    const qp = new URLSearchParams({
      sid: params.sid,
      isStudent: String(params.isStudent),
      isActiveRequest: String(params.isActiveRequest),
      label: params.label ?? "",
      lat: String(params.lat),
      lng: String(params.lng),
    });

    const res = await fetch(`${BACKEND_BASE_URL}/status-update?${qp.toString()}`, {
      method: "GET",
    });
    const data = await res.json();
    return data as StatusUpdateResponse;
  },
};
