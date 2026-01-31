import React, { useState } from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StudentStackParamList } from "../../navigation/StudentStack";
import { API } from "../../api/endpoints";
import { usePolling } from "../../hooks/usePolling";
import type { StudentRequestStatusResponse } from "../../api/types";
import VolunteerLiveMap from "../../components/VolunteerLiveMap";
import { useAuth } from "../../auth/AuthContext";
import { Alert, Modal } from "react-native";

type Props = NativeStackScreenProps<StudentStackParamList, "StudentStatus">;

const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  border: "#334155",
  text: "#FFFFFF",
  muted: "#94A3B8",
  yellow: "#F4C430",
  yellowDark: "#D9A800",
  green: "#22C55E",
  amber: "#F59E0B",
  blue: "#1E90FF",
};

function Pill({ status }: { status: string }) {
  const meta =
    status === "ASSIGNED"
      ? {
          label: "VOLUNTEER FOUND",
          bg: "rgba(34,197,94,0.15)",
          fg: COLORS.green,
        }
      : status === "MATCHING"
      ? { label: "MATCHING", bg: "rgba(30,144,255,0.15)", fg: COLORS.blue }
      : status === "NO_AVAILABLE"
      ? { label: "NO AVAILABLE", bg: "rgba(245,158,11,0.18)", fg: COLORS.amber }
      : status === "COMPLETED"
      ? { label: "COMPLETED", bg: "rgba(34,197,94,0.15)", fg: COLORS.green }
      : { label: "CANCELLED", bg: "rgba(148,163,184,0.15)", fg: COLORS.muted };

  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: meta.bg,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
      }}
    >
      <Text style={{ color: meta.fg, fontWeight: "900", fontSize: 12 }}>
        {meta.label}
      </Text>
    </View>
  );
}

function PrimaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: pressed ? COLORS.yellowDark : COLORS.yellow,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        opacity: disabled ? 0.6 : 1,
      })}
    >
      <Text style={{ fontSize: 16, fontWeight: "900", color: "#0B1C2D" }}>
        {title}
      </Text>
    </Pressable>
  );
}

function SecondaryButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: pressed ? "#475569" : COLORS.border,
        backgroundColor: pressed ? "#162133" : "transparent",
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: "center",
      })}
    >
      <Text style={{ fontSize: 15, fontWeight: "800", color: COLORS.text }}>
        {title}
      </Text>
    </Pressable>
  );
}

export default function StudentStatusScreen({ route, navigation }: Props) {
  const { requestId } = route.params;
  const [data, setData] = useState<StudentRequestStatusResponse | null>(null);
  const { setActiveRequest } = useAuth();
  async function refresh() {
    const res = await API.getStudentRequestStatus(requestId);
    setData(res);

    if (res.status === "ASSIGNED") {
      setActiveRequest({
        requestId,
        status: "ASSIGNED",
        etaSeconds: res.etaSeconds ?? null,
        studentCode: res.studentCode,
        volunteerCode: res.volunteerCode,
      });
    } else if (res.status === "MATCHING") {
      setActiveRequest({ requestId, status: "MATCHING" });
    } else if (
      res.status === "CANCELLED" ||
      res.status === "COMPLETED" ||
      res.status === "NO_AVAILABLE"
    ) {
      setActiveRequest(null);
    }
  }

  usePolling(refresh, 2000, true);

  function cancel() {
    Alert.alert(
      "Cancel Safewalk request?",
      "You’ll lose your place in the queue.",
      [
        { text: "Keep waiting", style: "cancel" },
        {
          text: "Cancel request",
          style: "destructive",
          onPress: async () => {
            await API.cancelStudentRequest(requestId);
            setActiveRequest(null);
            navigation.popToTop();
          },
        },
      ]
    );
  }

  const status = data?.status ?? "MATCHING";

  const etaText =
    data?.etaSeconds != null ? `${Math.ceil(data.etaSeconds / 60)} min` : "—";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ flex: 1, padding: 16, gap: 14 }}>
        {/* Header */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: "900", color: COLORS.text }}>
            Live Status
          </Text>
          <Pill status={status} />
          <Text style={{ color: COLORS.muted, fontSize: 12 }}>
            Request ID: {requestId}
          </Text>
        </View>

        {/* Status card */}
        <View
          style={{
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 18,
            padding: 16,
            gap: 12,
          }}
        >
          {status === "MATCHING" && (
            <>
              <Text
                style={{ color: COLORS.text, fontWeight: "900", fontSize: 18 }}
              >
                Matching…
              </Text>
              <Text style={{ color: COLORS.muted, lineHeight: 20 }}>
                We’re finding the closest available Safewalk volunteer.
              </Text>
            </>
          )}

          {status === "ASSIGNED" && data?.volunteerLive && (
            <>
              <Text
                style={{ color: COLORS.text, fontWeight: "900", fontSize: 18 }}
              >
                Volunteer accepted ✅
              </Text>

              <View style={{ flexDirection: "row", gap: 16 }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ color: COLORS.muted, fontSize: 12 }}>ETA</Text>
                  <Text
                    style={{
                      color: COLORS.text,
                      fontWeight: "900",
                      fontSize: 16,
                    }}
                  >
                    {etaText}
                  </Text>
                </View>

                {data?.studentCode ? (
                  <View style={{ gap: 4 }}>
                    <Text style={{ color: COLORS.muted, fontSize: 12 }}>
                      Safety Code
                    </Text>
                    <Text
                      style={{
                        color: COLORS.yellow,
                        fontWeight: "900",
                        fontSize: 16,
                      }}
                    >
                      {data.studentCode}
                    </Text>
                  </View>
                ) : null}
              </View>

              <VolunteerLiveMap
                volunteer={{
                  lat: data.volunteerLive.lat,
                  lng: data.volunteerLive.lng,
                }}
                headingDegrees={data.volunteerHeadingDegrees ?? 0}
                pickup={null}
              />

              <Text
                style={{ color: COLORS.muted, fontSize: 12, lineHeight: 16 }}
              >
                Confirm the safety code before you start walking.
              </Text>
            </>
          )}

          {status === "NO_AVAILABLE" && (
            <>
              <Text
                style={{ color: COLORS.text, fontWeight: "900", fontSize: 18 }}
              >
                No Safewalk available right now
              </Text>
              <Text style={{ color: COLORS.muted, lineHeight: 20 }}>
                Try again in a minute — demand is high at the moment.
              </Text>
            </>
          )}

          {status === "CANCELLED" && (
            <Text style={{ color: COLORS.text, fontWeight: "900" }}>
              Cancelled.
            </Text>
          )}

          {status === "COMPLETED" && (
            <Text style={{ color: COLORS.text, fontWeight: "900" }}>
              Completed ✅
            </Text>
          )}
        </View>

        {/* Actions */}
        <View style={{ marginTop: "auto", gap: 10 }}>
          <PrimaryButton
            title="Back to Home"
            onPress={() => navigation.popToTop()}
          />
          <SecondaryButton title="Cancel Request" onPress={cancel} />
        </View>
      </View>
    </SafeAreaView>
  );
}
