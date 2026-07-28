import React from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { useAuth } from "../lib/useAuth";

export default function LoginScreen() {
  const { signInWithProvider } = useAuth();

  async function handleLogin(provider: "google" | "apple") {
    try {
      await signInWithProvider(provider);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      Alert.alert("Falha no login", message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CrushRoll</Text>
      <Text style={styles.subtitle}>Entre para cadastrar seus crushs</Text>

      <Pressable
        style={[styles.button, styles.google]}
        onPress={() => handleLogin("google")}
      >
        <Text style={styles.buttonText}>Entrar com Google</Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.apple]}
        onPress={() => handleLogin("apple")}
      >
        <Text style={styles.buttonText}>Entrar com Apple</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#1E2327",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#A0A0A0",
    marginBottom: 32,
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  google: {
    backgroundColor: "#4285F4",
  },
  apple: {
    backgroundColor: "#000000",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
