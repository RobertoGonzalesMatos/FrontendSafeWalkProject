import React, { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API } from "../../api/endpoints";
import { useAuth } from "../../auth/AuthContext";

// Theme tokens (Night Safety + Safewalk Yellow)
const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  border: "#334155",
  text: "#FFFFFF",
  muted: "#94A3B8",
  yellow: "#F4C430",
  yellowDark: "#D9A800",
};

export default function LoginScreen() {
  const { login, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function onLogin() {
    setLoading(true);
    try {
      const res = await API.login(email.trim(), code.trim());
      login(res.token, res.user);
    } catch (e: any) {
      Alert.alert("Login failed", e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleLogin() {
    try {
      setLoading(true);
      await signInWithGoogle();
      // Note: signInWithGoogle handles redirects, so we might not reach here immediately
      // or at all if redirect happens fast. 
    } catch (e: any) {
      Alert.alert("Google Login failed", e.message ?? String(e));
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ flex: 1, padding: 16, justifyContent: "center", gap: 16 }}>
        {/* Brand */}
        <View style={{ alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 34, fontWeight: "900", color: COLORS.text }}>
            SafePulse
          </Text>
          <Text
            style={{ fontSize: 15, color: COLORS.muted, textAlign: "center" }}
          >
            Campus Safewalk, redesigned for scale
          </Text>
        </View>

        {/* Login card */}
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
          <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.text }}>
            Sign in
          </Text>

          <Pressable
            onPress={onGoogleLogin}
            disabled={loading}
            style={({ pressed }) => ({
              backgroundColor: "white", // Google White
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: "center",
              marginTop: 8,
              opacity: loading ? 0.7 : 1,
              flexDirection: "row",
              justifyContent: "center",
              gap: 10
            })}
          >
            <Image
              source={require('../../../assets/google-logo.png')}
              style={{ width: 20, height: 20 }}
            />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "black",
              }}
            >
              Sign in with Google
            </Text>
          </Pressable>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 10 }}>
            <View style={{ height: 1, backgroundColor: COLORS.border, flex: 1 }} />
            <Text style={{ color: COLORS.muted, fontSize: 12 }}>OR</Text>
            <View style={{ height: 1, backgroundColor: COLORS.border, flex: 1 }} />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ color: COLORS.muted, fontSize: 13 }}>Email (Dev)</Text>
            <TextInput
              placeholder="name@brown.edu"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              style={{
                backgroundColor: "#0B1C2D",
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 12,
                padding: 12,
                color: COLORS.text,
              }}
            />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ color: COLORS.muted, fontSize: 13 }}>
              Access code (Dev)
            </Text>
            <TextInput
              placeholder="••••••"
              placeholderTextColor={COLORS.muted}
              value={code}
              onChangeText={setCode}
              secureTextEntry
              style={{
                backgroundColor: "#0B1C2D",
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 12,
                padding: 12,
                color: COLORS.text,
              }}
            />
          </View>

          {/* CTA */}
          <Pressable
            onPress={onLogin}
            disabled={loading}
            style={({ pressed }) => ({
              backgroundColor: pressed ? COLORS.yellowDark : COLORS.yellow,
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: "center",
              marginTop: 8,
              opacity: loading ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "900",
                color: "#0B1C2D",
              }}
            >
              {loading ? "Signing in…" : "Dev Login"}
            </Text>
          </Pressable>

          {/* Hackathon helper */}
          <Text
            style={{
              color: COLORS.muted,
              fontSize: 12,
              textAlign: "center",
              marginTop: 6,
            }}
          >
            Tip: use access code{" "}
            <Text style={{ color: COLORS.yellow, fontWeight: "800" }}>
              safewalker
            </Text>{" "}
            to enter SafeWalker mode
          </Text>
        </View>

        {/* Footer */}
        <Text
          style={{
            color: COLORS.muted,
            fontSize: 11,
            textAlign: "center",
          }}
        >
          Built for campus safety • Scales to hundreds of concurrent requests
        </Text>
      </View>
    </SafeAreaView>
  );
}
