import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/useAuth";
import { Profile, SocialFields } from "../types/database";
import SocialFieldsForm from "./components/SocialFieldsForm";

const EMPTY_SOCIAL: SocialFields = {
  instagram: "",
  twitter_x: "",
  tiktok: "",
  facebook: "",
};

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [social, setSocial] = useState<SocialFields>(EMPTY_SOCIAL);

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile() {
    if (!session?.user.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single<Profile>();

    if (error) {
      Alert.alert("Erro ao carregar perfil", error.message);
    } else if (data) {
      setName(data.name ?? "");
      setSocial({
        instagram: data.instagram ?? "",
        twitter_x: data.twitter_x ?? "",
        tiktok: data.tiktok ?? "",
        facebook: data.facebook ?? "",
      });
    }

    setLoading(false);
  }

  async function handleSave() {
    if (!session?.user.id) return;

    if (!name.trim()) {
      Alert.alert("Nome obrigatorio", "Informe seu nome.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: session.user.id, name: name.trim(), ...social });
    setSaving(false);

    if (error) {
      Alert.alert("Erro ao salvar", error.message);
    } else {
      Alert.alert("Sucesso", "Perfil atualizado.");
    }
  }

  function handleSocialChange(field: keyof SocialFields, value: string) {
    setSocial((prev) => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Meu perfil</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Seu nome"
          placeholderTextColor="#6B7280"
        />
      </View>

      <SocialFieldsForm values={social} onChange={handleSocialChange} />

      <Pressable
        style={[styles.button, styles.save]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? "Salvando..." : "Salvar"}
        </Text>
      </Pressable>

      <Pressable style={[styles.button, styles.logout]} onPress={signOut}>
        <Text style={styles.buttonText}>Sair</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E2327",
  },
  content: {
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1E2327",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    color: "#A0A0A0",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#3A3F45",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#FFFFFF",
    fontSize: 15,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  save: {
    backgroundColor: "#E1306C",
  },
  logout: {
    backgroundColor: "#3A3F45",
    marginTop: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
