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
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const { session, signOut, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [social, setSocial] = useState<SocialFields>(EMPTY_SOCIAL);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoChanged, setPhotoChanged] = useState(false);

  useEffect(() => {
    if (!authLoading) loadProfile();
  }, [authLoading, session?.user.id]);

  async function loadProfile() {
    if (!session?.user.id) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle<Profile>();

    if (error) {
      Alert.alert("Erro ao carregar perfil", error.message);
    } else if (data) {
      setName(data.name ?? "");
      setPhotoUri(data.photo_url ?? null);
      setSocial({
        instagram: data.instagram ?? "",
        twitter_x: data.twitter_x ?? "",
        tiktok: data.tiktok ?? "",
        facebook: data.facebook ?? "",
      });
    }

    setLoading(false);
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão necessária", "Permita acesso à galeria.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoChanged(true);
    }
  }

  async function uploadPhoto(uri: string, userId: string): Promise<string> {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const path = `${userId}/profile.jpg`;
    const { error } = await supabase.storage
      .from("crush-photos")
      .upload(path, arrayBuffer, { contentType: "image/jpeg", upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage
      .from("crush-photos")
      .getPublicUrl(path);
    return `${publicUrl}?t=${Date.now()}`;
  }

  async function handleSave() {
    if (!session?.user.id) return;
    if (!name.trim()) {
      Alert.alert("Nome obrigatório", "Informe seu nome.");
      return;
    }

    setSaving(true);
    try {
      const userId = session.user.id;
      let photo_url = photoUri;

      if (photoChanged && photoUri) {
        photo_url = await uploadPhoto(photoUri, userId);
      }

      const { error } = await supabase
        .from("profiles")
        .upsert({ id: userId, name: name.trim(), photo_url, ...social });

      if (error) throw error;
      setPhotoChanged(false);
      Alert.alert("Sucesso", "Perfil atualizado.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : JSON.stringify(err);
      Alert.alert("Erro ao salvar", message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FFFFFF" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}>
      {/* Foto do perfil */}
      <Pressable style={styles.avatarContainer} onPress={pickPhoto}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>👤</Text>
            <Text style={styles.avatarPlaceholderLabel}>Adicionar foto</Text>
          </View>
        )}
        <View style={styles.avatarEditBadge}>
          <Text style={styles.avatarEditBadgeText}>✏️</Text>
        </View>
      </Pressable>

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

      <SocialFieldsForm
        values={social}
        onChange={(field, value) => setSocial((prev) => ({ ...prev, [field]: value }))}
      />

      <Pressable
        style={[styles.button, styles.save, saving && styles.disabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.buttonText}>{saving ? "Salvando..." : "Salvar"}</Text>
      </Pressable>

      <Pressable style={[styles.button, styles.logout]} onPress={signOut}>
        <Text style={styles.buttonText}>Sair</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1E2327" },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1E2327" },

  avatarContainer: {
    alignSelf: "center",
    marginBottom: 28,
    position: "relative",
  },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 2, borderColor: "#E1306C" },
  avatarPlaceholder: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: "#262B31",
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#3A3F45", borderStyle: "dashed",
  },
  avatarPlaceholderText: { fontSize: 36 },
  avatarPlaceholderLabel: { color: "#6B7280", fontSize: 11, marginTop: 4 },
  avatarEditBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#E1306C", justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#1E2327",
  },
  avatarEditBadgeText: { fontSize: 13 },

  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, color: "#A0A0A0", marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: "#3A3F45", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, color: "#FFFFFF", fontSize: 15,
  },

  button: { paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 8 },
  save: { backgroundColor: "#E1306C" },
  logout: { backgroundColor: "#3A3F45", marginTop: 12 },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 16 },
});
