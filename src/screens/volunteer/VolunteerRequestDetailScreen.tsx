import React, { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, Text, View, ActivityIndicator } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { VolunteerStackParamList } from "../../navigation/VolunteerStack";
import { API } from "../../api/endpoints";
import { VolunteerRequestDetail } from "../../api/types";

type Props = NativeStackScreenProps<VolunteerStackParamList, "VolunteerDetail">;

const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  border: "#334155",
  text: "#FFFFFF",
  muted: "#94A3B8",
  yellow: "#F4C430",
  yellowDark: "#D9A800",
  danger: "#EF4444",
};

export default function VolunteerRequestDetailScreen({ route, navigation }: Props) {
  const { requestId } = route.params;
  const [request, setRequest] = useState<VolunteerRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    loadRequest();
  }, [requestId]);

  const loadRequest = async () => {
    try {
      setLoading(true);
      const data = await API.getVolunteerRequest(requestId);
      setRequest(data);
    } catch (e) {
      Alert.alert("Error", "Could not load request details");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      setAccepting(true);
      await API.acceptVolunteerRequest(requestId);
      // Navigate to Active Walk
      navigation.replace("VolunteerActive", { requestId });
    } catch (e) {
      Alert.alert("Error", "Failed to accept request");
    } finally {
      setAccepting(false);
    }
  };

  if (loading || !request) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={COLORS.yellow} />
      </View>
    );
  }

  const pickupLat = request.pickup.lat ?? 41.8268;
  const pickupLng = request.pickup.lng ?? -71.4025;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ flex: 1 }}>
        {/* Map View */}
        <View style={{ flex: 1 }}>
          <MapView
            style={{ flex: 1 }}
            initialRegion={{
              latitude: pickupLat,
              longitude: pickupLng,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            }}
          >
            <Marker
              coordinate={{ latitude: pickupLat, longitude: pickupLng }}
              title="Pickup"
              description={request.pickup.label}
              pinColor={COLORS.yellow}
            />
            {request.destination.lat && request.destination.lng && (
              <Marker
                coordinate={{ latitude: request.destination.lat, longitude: request.destination.lng }}
                title="Destination"
                description={request.destination.label}
                pinColor="cyan"
              />
            )}
          </MapView>
        </View>

        {/* Info Card */}
        <View style={{
          padding: 20,
          backgroundColor: COLORS.card,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderTopWidth: 1,
          borderColor: COLORS.border,
          gap: 16
        }}>
          <View>
            <Text style={{ color: COLORS.muted, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>
              Request For
            </Text>
            <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: "800" }}>
              {request.studentName}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, padding: 12, backgroundColor: COLORS.bg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border }}>
              <Text style={{ color: COLORS.muted, fontSize: 12 }}>Pickup</Text>
              <Text style={{ color: COLORS.text, fontWeight: "600", marginTop: 4 }}>{request.pickup.label}</Text>
            </View>
            <View style={{ flex: 1, padding: 12, backgroundColor: COLORS.bg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border }}>
              <Text style={{ color: COLORS.muted, fontSize: 12 }}>Destination</Text>
              <Text style={{ color: COLORS.text, fontWeight: "600", marginTop: 4 }}>{request.destination.label}</Text>
            </View>
          </View>

          <Pressable
            onPress={handleAccept}
            disabled={accepting}
            style={({ pressed }) => ({
              backgroundColor: pressed ? COLORS.yellowDark : COLORS.yellow,
              paddingVertical: 16,
              borderRadius: 16,
              alignItems: "center",
              opacity: accepting ? 0.7 : 1,
              marginTop: 8
            })}
          >
            <Text style={{ fontSize: 18, fontWeight: "900", color: "#0B1C2D" }}>
              {accepting ? "Accepting..." : "Accept Request"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
