import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import VolunteerHomeScreen from "../screens/volunteer/VolunteerHomeScreen";
import VolunteerRequestListScreen from "../screens/volunteer/VolunteerRequestListScreen";
import VolunteerRequestDetailScreen from "../screens/volunteer/VolunteerRequestDetailScreen";
import VolunteerActiveWalkScreen from "../screens/volunteer/VolunteerActiveWalkScreen";

export type VolunteerStackParamList = {
  VolunteerHome: undefined;
  VolunteerList: undefined;
  VolunteerDetail: { requestId: string };
  VolunteerActive: { requestId: string };
};

const Stack = createNativeStackNavigator<VolunteerStackParamList>();

export default function VolunteerStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#0B1C2D" },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "800" },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="VolunteerHome"
        component={VolunteerHomeScreen}
        options={{ title: "Volunteer" }}
      />
      <Stack.Screen
        name="VolunteerList"
        component={VolunteerRequestListScreen}
        options={{ title: "Requests" }}
      />
      <Stack.Screen
        name="VolunteerDetail"
        component={VolunteerRequestDetailScreen}
        options={{ title: "Request" }}
      />
      <Stack.Screen
        name="VolunteerActive"
        component={VolunteerActiveWalkScreen}
        options={{ title: "Active Walk" }}
      />
    </Stack.Navigator>
  );
}
