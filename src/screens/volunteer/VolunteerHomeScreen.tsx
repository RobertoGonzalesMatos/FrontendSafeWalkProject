import React from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { VolunteerStackParamList } from "../../navigation/VolunteerStack";
import { useAuth } from "../../auth/AuthContext";

type Props = NativeStackScreenProps<VolunteerStackParamList, "VolunteerHome">;

const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  border: "#334155",
  text: "#FFFFFF",
  muted: "#94A3B8",
  yellow: "#F4C430",
  yellowDark: "#D9A800",
  red: "#EF4444",
};

export default function VolunteerHomeScreen({ navigation }: Props) {
  const { logout } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 20 }}>
        <View>
          <Text style={{ color: COLORS.text, fontSize: 32, fontWeight: "900" }}>
            Welcome,
          </Text>
          <Text style={{ color: COLORS.yellow, fontSize: 32, fontWeight: "900" }}>
            Volunteer
          </Text>
          <Text style={{ color: COLORS.muted, marginTop: 10, fontSize: 16 }}>
            Ready to help students get home safely?
          </Text>
        </View>

        <Pressable
          onPress={() => navigation.navigate("VolunteerList")}
          style={({ pressed }) => ({
            backgroundColor: pressed ? COLORS.yellowDark : COLORS.yellow,
            paddingVertical: 18,
            borderRadius: 16,
            alignItems: "center",
            marginTop: 20,
            elevation: 4,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
          })}
        >
          <Text style={{ fontSize: 18, fontWeight: "900", color: "#0B1C2D" }}>
            View Open Requests
          </Text>
        </Pressable>

        <Pressable
          onPress={logout}
          style={({ pressed }) => ({
            backgroundColor: "transparent",
            borderWidth: 1,
            borderColor: COLORS.border,
            paddingVertical: 14,
            borderRadius: 16,
            alignItems: "center",
            marginTop: 10,
            opacity: pressed ? 0.7 : 1
          })}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.red }}>
            Log Out
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
