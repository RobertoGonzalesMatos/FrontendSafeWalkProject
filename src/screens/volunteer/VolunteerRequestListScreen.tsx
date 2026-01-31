import React, { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, SafeAreaView, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { VolunteerStackParamList } from "../../navigation/VolunteerStack";
import { API } from "../../api/endpoints";
import { VolunteerRequestListItem } from "../../api/types";

type Props = NativeStackScreenProps<VolunteerStackParamList, "VolunteerList">;

const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  border: "#334155",
  text: "#FFFFFF",
  muted: "#94A3B8",
  yellow: "#F4C430",
};

export default function VolunteerRequestListScreen({ navigation }: Props) {
  const [requests, setRequests] = useState<VolunteerRequestListItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = async () => {
    try {
      setRefreshing(true);
      const data = await API.listVolunteerRequests();
      setRequests(data);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [])
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.requestId}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchRequests} tintColor={COLORS.yellow} />
        }
        ListEmptyComponent={
          <View style={{ marginTop: 50, alignItems: "center" }}>
            <Text style={{ color: COLORS.muted }}>No active requests found.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate("VolunteerDetail", { requestId: item.requestId })}
            style={({ pressed }) => ({
              backgroundColor: COLORS.card,
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: COLORS.border,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ color: COLORS.text, fontWeight: "bold", fontSize: 16 }}>
                {item.studentName}
              </Text>
              <Text style={{ color: COLORS.yellow, fontSize: 12 }}>MATCHING</Text>
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ color: COLORS.muted, fontSize: 14 }}>
                📍 From: <Text style={{ color: COLORS.text }}>{item.pickupLabel}</Text>
              </Text>
              <Text style={{ color: COLORS.muted, fontSize: 14 }}>
                🏁 To: <Text style={{ color: COLORS.text }}>{item.destinationLabel}</Text>
              </Text>
            </View>

            <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 8, alignSelf: "flex-end" }}>
              {new Date(item.createdAt).toLocaleTimeString()}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
