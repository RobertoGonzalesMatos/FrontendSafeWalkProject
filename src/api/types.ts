export type Role = "STUDENT" | "VOLUNTEER";

export type User = {
  id: string;
  role: Role;
  name: string;
};

export type LoginResponse = {
  token: string;
  user: User;
};

export type LatLng = { lat: number; lng: number };

export type StudentCreateRequestBody = {
  pickup: { label: string; lat: number | null; lng: number | null };
  destination: { label: string };
  expoPushToken: string | null;
};

export type StudentCreateRequestResponse = { requestId: string };

export type StudentRequestStatus =
  | "MATCHING"
  | "ASSIGNED"
  | "NO_AVAILABLE"
  | "CANCELLED"
  | "COMPLETED";

export type StudentRequestStatusResponse = {
  requestId: string;
  status: StudentRequestStatus;
  etaSeconds: number | null;
  volunteerLive: { lat: number; lng: number } | null;
  studentCode?: string;
  volunteerCode?: string;
  volunteerHeadingDegrees?: number | null;
};

export type VolunteerRequestListItem = {
  requestId: string;
  studentName: string;
  pickupLabel: string;
  destinationLabel: string;
  createdAt: string;
};

export type VolunteerRequestDetail = {
  requestId: string;
  studentName: string;
  pickup: { label: string; lat: number | null; lng: number | null };
  destination: { label: string; lat?: number | null; lng?: number | null };
  etaToStudentSeconds: number | null;
  etaTripSeconds: number | null;
  status: "OPEN" | "ACCEPTED" | "COMPLETED";
  studentCode?: string;
  volunteerCode?: string;
};
