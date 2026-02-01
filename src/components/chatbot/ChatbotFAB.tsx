import React, { useState, useCallback, useEffect } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import type { ChatbotProps, ChatMessage } from "./types";
import { CHATBOT_COLORS } from "./types";
import ChatModal from "./ChatModal";
import { getDirections, getWelcomeMessage } from "../../services/geminiService";

export default function ChatbotFAB({
  userLocation,
  destination,
  pickupLabel,
  destinationLabel,
}: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Initialize welcome message when context changes
  useEffect(() => {
    const context = {
      userLocation,
      destination,
      pickupLabel,
      destinationLabel,
    };

    const welcomeMessage: ChatMessage = {
      id: "welcome",
      text: getWelcomeMessage(context),
      isUser: false,
      timestamp: new Date(),
    };

    setMessages([welcomeMessage]);
  }, [userLocation, destination, pickupLabel, destinationLabel]);

  const sendMessage = useCallback(async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText || isLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: trimmedText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const context = {
        userLocation,
        destination,
        pickupLabel,
        destinationLabel,
      };

      const response = await getDirections(context, trimmedText);

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        text: response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        text:
          error.message ||
          "Sorry, I couldn't get directions right now. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, userLocation, destination, pickupLabel, destinationLabel]);

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);

  return (
    <>
      {/* Floating Action Button */}
      <Pressable
        onPress={openChat}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: pressed
              ? CHATBOT_COLORS.yellowDark
              : CHATBOT_COLORS.yellow,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}
      >
        <Text style={styles.fabIcon}>💬</Text>
      </Pressable>

      {/* Chat Modal */}
      <ChatModal
        visible={isOpen}
        onClose={closeChat}
        messages={messages}
        inputValue={inputText}
        onInputChange={setInputText}
        onSend={sendMessage}
        isLoading={isLoading}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 1000,
  },
  fabIcon: {
    fontSize: 28,
  },
});
