import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuth } from "../lib/useAuth";

export default function LoginScreen() {
  const { signInWithEmail, signUpWithEmail, signInWithProvider } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmailAuth() {
    if (!email || !password) {
      Alert.alert("Atenção", "Preencha email e senha.");
      return;
    }
    try {
      setLoading(true);
      if (mode === "login") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
        Alert.alert("Conta criada!", "Verifique seu email para confirmar o cadastro.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }

  async function handleProvider(provider: "google" | "apple") {
    try {
      await signInWithProvider(provider);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      Alert.alert("Falha no login", message);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>CrushDex</Text>
      <Text style={styles.subtitle}>Entre para cadastrar seus crushs</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#666"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor="#666"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable
        style={[styles.button, styles.primary, loading && styles.disabled]}
        onPress={handleEmailAuth}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
        </Text>
      </Pressable>

      <Pressable onPress={() => setMode(mode === "login" ? "signup" : "login")}>
        <Text style={styles.toggleText}>
          {mode === "login"
            ? "Não tem conta? Criar agora"
            : "Já tem conta? Entrar"}
        </Text>
      </Pressable>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>ou</Text>
        <View style={styles.line} />
      </View>

      <Pressable
        style={[styles.button, styles.google]}
        onPress={() => handleProvider("google")}
      >
        <Text style={styles.buttonText}>Entrar com Google</Text>
      </Pressable>

    </KeyboardAvoidingView>
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
  input: {
    width: "100%",
    backgroundColor: "#2C3137",
    color: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  primary: {
    backgroundColor: "#E63946",
  },
  disabled: {
    opacity: 0.6,
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
  toggleText: {
    color: "#A0A0A0",
    fontSize: 14,
    marginBottom: 24,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#3C4147",
  },
  dividerText: {
    color: "#666",
    marginHorizontal: 12,
    fontSize: 13,
  },
});
