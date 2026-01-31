import React from "react";
import { Button, SafeAreaView, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { VolunteerStackParamList } from "../../navigation/VolunteerStack";
import { useAuth } from "../../auth/AuthContext";

type Props = NativeStackScreenProps<VolunteerStackParamList, "VolunteerHome">;

export default function VolunteerHomeScreen({ navigation }: Props) {
  return;
}
