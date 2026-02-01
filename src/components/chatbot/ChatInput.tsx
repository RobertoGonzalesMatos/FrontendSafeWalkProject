import React from "react";
import { View, TextInput, Pressable, Text, StyleSheet } from "react-native";
import { CHATBOT_COLORS } from "./types";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  value,
  onChangeText,
  onSend,
  disabled = false,
  placeholder = "Ask for directions...",
}: Props) {
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={CHATBOT_COLORS.muted}
        style={styles.input}
        onSubmitEditing={canSend ? onSend : undefined}
        editable={!disabled}
        multiline
        maxLength={500}
      />
      <Pressable
        onPress={onSend}
        disabled={!canSend}
        style={({ pressed }) => [
          styles.sendButton,
          {
            backgroundColor: pressed
              ? CHATBOT_COLORS.yellowDark
              : CHATBOT_COLORS.yellow,
            opacity: canSend ? 1 : 0.5,
          },
        ]}
      >
        <Text style={styles.sendIcon}>➤</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: CHATBOT_COLORS.border,
    gap: 10,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    backgroundColor: CHATBOT_COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: CHATBOT_COLORS.text,
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: CHATBOT_COLORS.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sendIcon: {
    fontSize: 18,
    color: "#0B1C2D",
  },
});
