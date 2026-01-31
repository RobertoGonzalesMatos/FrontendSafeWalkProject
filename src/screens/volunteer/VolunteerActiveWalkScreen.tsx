import React, { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, Text, TextInput, View, ActivityIndicator } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { VolunteerStackParamList } from "../../navigation/VolunteerStack";
import { API } from "../../api/endpoints";
import { StudentRequestStatusResponse } from "../../api/types";

type Props = NativeStackScreenProps<VolunteerStackParamList, "VolunteerActive">;

const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  border: "#334155",
  text: "#FFFFFF",
  muted: "#94A3B8",
  yellow: "#F4C430",
  yellowDark: "#D9A800",
  success: "#10B981",
  inputBg: "#0B1C2D",
};

export default function VolunteerActiveWalkScreen({ route, navigation }: Props) {
  const { requestId } = route.params;
  const [status, setStatus] = useState<StudentRequestStatusResponse | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Poll for status updates
  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      try {
        const data = await API.getStudentRequestStatus(requestId);
        if (active) setStatus(data);

        if (data.status === "COMPLETED") {
          Alert.alert("Success", "SafeWalk Completed!");
          navigation.popToTop();
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [requestId, navigation]);

  const handleVerify = async () => {
    if (code.length < 4) {
      Alert.alert("Invalid Code", "Please enter the 4-digit code from the student.");
      return;
    }

    setVerifying(true);
    try {
      await API.verifyVolunteerCode(requestId, code);
      // Status update will be picked up by polling, or we can force fetch
      Alert.alert("Verified!", "Start walking to the destination.");
    } catch (e) {
      Alert.alert("Error", "Incorrect code. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  if (!status) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={COLORS.yellow} />
        <Text style={{ color: COLORS.muted, marginTop: 10 }}>Loading mission...</Text>
      </View>
    );
  }

  // If we are ASSIGNED, we navigate to Student.
  // If we are WALKING, we navigate to Destination side-by-side.
  // We need logic to know where to show marker.
  // Since we rely on mock data, let's just show Map centered on Student (if assigned) or Dest (if walking).

  // Note: Mock API returns `volunteerLive` but doesn't exactly give us stored pickup/dest coords in the STATUS response.
  // In a real app we'd merge response or fetch details again.
  // For now, let's assume we can see student's live location.

  const isWalking = status.status === "WALKING";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ flex: 1 }}>
        <MapView
          style={{ flex: 1 }}
          region={{
            latitude: 41.8268,
            longitude: -71.4025,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation
        >
          {/* Volunteer (User) is shown via showsUserLocation */}

          {/* Student Location (Approximated for this view) */}
          {status.volunteerLive && !isWalking && (
            <Marker
              coordinate={{
                latitude: status.volunteerLive.lat,
                longitude: status.volunteerLive.lng,
              }}
              title="Student Location"
              pinColor="cyan"
            />
          )}
        </MapView>

        {/* Overlay Card */}
        <View style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          backgroundColor: COLORS.card,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 20,
          borderTopWidth: 1,
          borderColor: COLORS.border,
        }}>

          <Text style={{ color: COLORS.yellow, fontWeight: "bold", marginBottom: 8 }}>
            STATUS: {status.status}
          </Text>

          {!isWalking ? (
            <View style={{ gap: 12 }}>
              <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: "bold" }}>
                Meet the Student
              </Text>
              <Text style={{ color: COLORS.muted }}>
                Go to the pickup location. When you meet, ask for their Safe Code.
              </Text>

              <TextInput
                placeholder="Enter 4-digit Code"
                placeholderTextColor={COLORS.muted}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={4}
                style={{
                  backgroundColor: COLORS.inputBg,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 12,
                  padding: 16,
                  color: COLORS.text,
                  fontSize: 20,
                  textAlign: "center",
                  letterSpacing: 4,
                  fontWeight: "bold"
                }}
              />

              <Pressable
                onPress={handleVerify}
                disabled={verifying}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? COLORS.yellowDark : COLORS.yellow,
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: "center",
                  opacity: verifying ? 0.7 : 1
                })}
              >
                <Text style={{ fontSize: 16, fontWeight: "900", color: "#0B1C2D" }}>
                  {verifying ? "Verifying..." : "Verify & Start Walk"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <Text style={{ color: COLORS.success, fontSize: 20, fontWeight: "bold" }}>
                SafeWalk in Progress
              </Text>
              <Text style={{ color: COLORS.muted }}>
                Escort the student to their destination.
              </Text>
              <Text style={{ color: COLORS.muted, fontSize: 12, fontStyle: "italic" }}>
                Only the student can mark the walk as complete.
              </Text>
            </View>
          )}

        </View>
      </View>
    </SafeAreaView>
  );
}
