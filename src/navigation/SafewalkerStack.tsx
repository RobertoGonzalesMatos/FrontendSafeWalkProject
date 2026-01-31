import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SafewalkerHomeScreen from "../screens/safewalker/SafewalkerHomeScreen";
import SafewalkerRequestListScreen from "../screens/safewalker/SafewalkerRequestListScreen";
import SafewalkerRequestDetailScreen from "../screens/safewalker/SafewalkerRequestDetailScreen";
import SafewalkerActiveWalkScreen from "../screens/safewalker/SafewalkerActiveWalkScreen";

export type SafewalkerStackParamList = {
  SafewalkerHome: undefined;
  SafewalkerList: undefined;
  SafewalkerDetail: { requestId: string };
  SafewalkerActive: { requestId: string };
};

const Stack = createNativeStackNavigator<SafewalkerStackParamList>();

export default function SafewalkerStack() {
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
        name="SafewalkerHome"
        component={SafewalkerHomeScreen}
        options={{ title: "SafeWalker" }}
      />
      <Stack.Screen
        name="SafewalkerList"
        component={SafewalkerRequestListScreen}
        options={{ title: "Requests" }}
      />
      <Stack.Screen
        name="SafewalkerDetail"
        component={SafewalkerRequestDetailScreen}
        options={{ title: "Request" }}
      />
      <Stack.Screen
        name="SafewalkerActive"
        component={SafewalkerActiveWalkScreen}
        options={{ title: "Active Walk" }}
      />
    </Stack.Navigator>
  );
}
