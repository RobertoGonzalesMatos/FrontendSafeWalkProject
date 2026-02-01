import React, { useRef } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import type { ChatMessage } from "./types";
import { CHATBOT_COLORS } from "./types";
import ChatMessageBubble from "./ChatMessageBubble";
import ChatInput from "./ChatInput";

interface Props {
  visible: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  inputValue: string;
  onInputChange: (text: string) => void;
  onSend: () => void;
  isLoading: boolean;
}

export default function ChatModal({
  visible,
  onClose,
  messages,
  inputValue,
  onInputChange,
  onSend,
  isLoading,
}: Props) {
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <ChatMessageBubble message={item} />
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Directions Assistant</Text>
                <Text style={styles.subtitle}>Powered by Gemini AI</Text>
              </View>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.closeButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={styles.closeIcon}>✕</Text>
              </Pressable>
            </View>

            {/* Messages */}
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messageList}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
              showsVerticalScrollIndicator={false}
            />

            {/* Loading indicator */}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={CHATBOT_COLORS.yellow} size="small" />
                <Text style={styles.loadingText}>Getting directions...</Text>
              </View>
            )}

            {/* Input */}
            <ChatInput
              value={inputValue}
              onChangeText={onInputChange}
              onSend={onSend}
              disabled={isLoading}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: CHATBOT_COLORS.overlay,
  },
  container: {
    flex: 1,
    marginTop: 80,
    backgroundColor: CHATBOT_COLORS.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: CHATBOT_COLORS.border,
  },
  title: {
    color: CHATBOT_COLORS.text,
    fontSize: 18,
    fontWeight: "900",
  },
  subtitle: {
    color: CHATBOT_COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  closeIcon: {
    color: CHATBOT_COLORS.muted,
    fontSize: 24,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  loadingText: {
    color: CHATBOT_COLORS.muted,
    fontSize: 13,
  },
});
