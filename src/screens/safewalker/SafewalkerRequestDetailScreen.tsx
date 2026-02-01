import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { API } from "../../api/endpoints";
import { useAuth } from "../../auth/AuthContext";
import { SafewalkerStackParamList } from "../../navigation/SafewalkerStack";

type Props = NativeStackScreenProps<SafewalkerStackParamList, "SafewalkerRequestDetail">;

export default function SafewalkerRequestDetailScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const { requestId, studentLabel, lat, lng } = route.params;
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDecline = async () => {
    try {
      await API.declineSafewalkerRequest(user?.id || requestId);
      navigation.replace("SafewalkerHome");
    } catch (e) {
      console.warn("Decline failed", e);
      navigation.replace("SafewalkerHome");
    }
  };

  const handleAccept = () => {
    navigation.replace("SafewalkerActiveWalk", {
      requestId: user?.id || requestId,
      studentLat: lat,
      studentLng: lng
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>New Request!</Text>

      <View style={styles.timerContainer}>
        <View style={[styles.timerBar, { width: `${(timeLeft / 30) * 100}%` }]} />
      </View>
      <Text style={styles.timerText}>{timeLeft}s remaining</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Location:</Text>
        <Text style={styles.value}>{studentLabel || "Unknown Location"}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.declineButton} onPress={handleDecline}>
          <Text style={styles.buttonText}>Decline</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
          <Text style={styles.buttonText}>Go to Student</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff", justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 30 },
  timerContainer: {
    height: 10,
    backgroundColor: "#eee",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 10,
    width: "100%"
  },
  timerBar: { height: "100%", backgroundColor: "#e74c3c" },
  timerText: { textAlign: "center", marginBottom: 40, color: "#666" },
  card: { padding: 20, backgroundColor: "#f9f9f9", borderRadius: 10, marginBottom: 40 },
  label: { fontSize: 16, color: "#888", marginBottom: 5 },
  value: { fontSize: 18, fontWeight: "600" },
  actions: { flexDirection: "row", justifyContent: "space-between", gap: 15 },
  declineButton: { flex: 1, padding: 15, backgroundColor: "#e74c3c", borderRadius: 10, alignItems: "center" },
  acceptButton: { flex: 1, padding: 15, backgroundColor: "#2ecc71", borderRadius: 10, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 }
});
