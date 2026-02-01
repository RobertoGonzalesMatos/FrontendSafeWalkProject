import React, { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View, ActivityIndicator, Keyboard, TouchableWithoutFeedback, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Polyline } from "react-native-maps";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { usePreventRemove } from "@react-navigation/native";
import { SafewalkerStackParamList } from "../../navigation/SafewalkerStack";
import { API } from "../../api/endpoints";
import { StudentRequestStatusResponse } from "../../api/types";

type Props = NativeStackScreenProps<SafewalkerStackParamList, "SafewalkerActive">;

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

export default function SafewalkerActiveWalkScreen({ route, navigation }: Props) {
  const { requestId } = route.params;
  const [status, setStatus] = useState<StudentRequestStatusResponse | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Poll for status updates
  useEffect(() => {
    let active = true;

    async function fetchStatus() {
      try {
        const data = await API.getStudentRequestStatus(requestId);
        if (!active) return;

        setStatus(data);

        if (data.status === "COMPLETED") {
          Alert.alert("Success", "SafeWalk Completed!");
          navigation.popToTop();
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }

    // Initial fetch
    fetchStatus();

    // Poll every 3 seconds
    const interval = setInterval(fetchStatus, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [requestId, navigation]);

  // Prevent removal for ASSIGNED and WALKING status using official hook
  // SafeWalker can only leave after student marks walk as COMPLETED
  const shouldPreventRemove = status?.status === "ASSIGNED" || status?.status === "WALKING";

  usePreventRemove(shouldPreventRemove, ({ data }) => {
    const isWalkingStatus = status?.status === "WALKING";

    Alert.alert(
      isWalkingStatus ? "Cannot Leave Walk" : "Decline Request?",
      isWalkingStatus
        ? "You must complete the SafeWalk before leaving. Only the student can mark it as complete."
        : "Going back will return this request to the pool for other safewalkers.",
      isWalkingStatus
        ? [{ text: "OK", style: "cancel" }]
        : [
          {
            text: "Stay",
            style: "cancel",
          },
          {
            text: "Decline & Go Back",
            style: "destructive",
            onPress: async () => {
              try {
                await API.declineSafewalkerRequest(requestId);
                navigation.dispatch(data.action);
              } catch (error) {
                Alert.alert("Error", "Failed to decline request.");
              }
            },
          },
        ]
    );
  });

  React.useEffect(() => {
    navigation.setOptions({
      headerBackButtonMenuEnabled: false,
    });
  }, [navigation]);

  const handleVerify = async () => {
    if (code.length < 4) {
      Alert.alert("Invalid Code", "Please enter the 4-digit code from the student.");
      return;
    }

    setVerifying(true);
    try {
      await API.verifySafewalkerCode(requestId, code);
      // Status update will be picked up by polling, or we can force fetch
      Alert.alert("Verified!", "Start walking to the destination.");
    } catch (e) {
      Alert.alert("Error", "Incorrect code. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleDecline = async () => {
    Alert.alert(
      "Decline Request?",
      "This will return the request to the pool for other safewalkers.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            try {
              await API.declineSafewalkerRequest(requestId);
              navigation.goBack();
            } catch (e) {
              Alert.alert("Error", "Failed to decline request.");
            }
          },
        },
      ]
    );
  };

  if (!status) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={COLORS.yellow} />
        <Text style={{ color: COLORS.muted, marginTop: 10 }}>Loading mission...</Text>
      </View>
    );
  }

  const isWalking = status.status === "WALKING";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
            {/* SafeWalker (User) is shown via showsUserLocation */}

            {/* Student Location (Approximated for this view) */}
            {status.safewalkerLive && !isWalking && (
              <Marker
                coordinate={{
                  latitude: status.safewalkerLive.lat,
                  longitude: status.safewalkerLive.lng,
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
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                    if (code.length === 4) handleVerify();
                  }}
                  blurOnSubmit={true}
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
                  onPress={() => {
                    Keyboard.dismiss();
                    handleVerify();
                  }}
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

                <Pressable
                  onPress={handleDecline}
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
                    Decline Request
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
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
