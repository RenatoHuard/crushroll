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
import * as Crypto from "expo-crypto";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/useAuth";
import { Crush, SocialFields } from "../types/database";
import { RootStackParamList } from "../navigation/types";
import SocialFieldsForm from "./components/SocialFieldsForm";

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, "CrushForm">;
  route: RouteProp<RootStackParamList, "CrushForm">;
}

const EMPTY_SOCIAL: SocialFields = {
  instagram: "",
  twitter_x: "",
  tiktok: "",
  facebook: "",
};

function StarRating({
  value,
  onChange,
  size = 30,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => onChange(star === value ? 0 : star)}
        >
          <Text style={{ fontSize: size, color: star <= value ? "#FFD700" : "#3A3F45" }}>
            {star <= value ? "★" : "☆"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// Collapsible section component
function Collapsible({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={collapsibleStyles.container}>
      <Pressable style={collapsibleStyles.header} onPress={() => setOpen(!open)}>
        <Text style={collapsibleStyles.title}>{title}</Text>
        <Text style={collapsibleStyles.arrow}>{open ? "▲" : "▼"}</Text>
      </Pressable>
      {open && <View style={collapsibleStyles.body}>{children}</View>}
    </View>
  );
}

const collapsibleStyles = StyleSheet.create({
  container: {
    backgroundColor: "#262B31",
    borderRadius: 10,
    marginBottom: 14,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  arrow: { color: "#A0A0A0", fontSize: 12 },
  body: { paddingHorizontal: 16, paddingBottom: 14 },
});

export default function CrushFormScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const crushId = route.params?.crushId;
  const isEditing = Boolean(crushId);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [social, setSocial] = useState<SocialFields>(EMPTY_SOCIAL);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [interestRating, setInterestRating] = useState(0);
  const [isTop, setIsTop] = useState(false);
  const [review, setReview] = useState("");

  useEffect(() => {
    if (crushId) loadCrush(crushId);
  }, [crushId]);

  async function loadCrush(id: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("crushes")
      .select("*")
      .eq("id", id)
      .single<Crush>();

    if (error) {
      Alert.alert("Erro ao carregar crush", error.message);
    } else if (data) {
      setName(data.name);
      setSocial({
        instagram: data.instagram ?? "",
        twitter_x: data.twitter_x ?? "",
        tiktok: data.tiktok ?? "",
        facebook: data.facebook ?? "",
      });
      setPhotoUri(data.photo_url);
      setInterestRating(data.interest_rating);
      setIsTop(data.is_top);
      setReview(data.review ?? "");
    }
    setLoading(false);
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão necessária", "Permita acesso à galeria para adicionar foto.");
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

  async function uploadPhoto(uri: string, userId: string, id: string): Promise<string> {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const path = `${userId}/${id}.jpg`;
    const { error } = await supabase.storage
      .from("crush-photos")
      .upload(path, arrayBuffer, { contentType: "image/jpeg", upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage
      .from("crush-photos")
      .getPublicUrl(path);
    return publicUrl;
  }

  async function handleSave() {
    if (!session?.user.id) return;
    if (!name.trim()) {
      Alert.alert("Nome obrigatório", "Informe o nome do crush.");
      return;
    }

    setSaving(true);
    try {
      const userId = session.user.id;
      const targetId = crushId ?? Crypto.randomUUID();
      let photo_url: string | null = photoUri;

      if (photoChanged && photoUri) {
        photo_url = await uploadPhoto(photoUri, userId, targetId);
      }

      const payload = {
        name: name.trim(),
        user_id: userId,
        ...social,
        photo_url,
        interest_rating: interestRating,
        is_top: interestRating === 5 ? isTop : false,
        review: review.trim() || null,
      };

      const { error } = crushId
        ? await supabase.from("crushes").update(payload).eq("id", crushId)
        : await supabase.from("crushes").insert({ id: targetId, ...payload });

      if (error) throw error;

      if (crushId) {
        // Editing: go back to CrushDetail
        navigation.goBack();
      } else {
        // New crush: check if we came from DateForm
        if (route.params?.returnToDate) {
          navigation.navigate("DateForm", { crushId: targetId });
        } else {
          navigation.replace("CrushDetail", { crushId: targetId });
        }
      }
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

  async function handleDelete() {
    if (!crushId) return;
    Alert.alert("Excluir crush", "Tem certeza que deseja excluir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("crushes")
            .delete()
            .eq("id", crushId);
          if (error) Alert.alert("Erro ao excluir", error.message);
          else navigation.goBack();
        },
      },
    ]);
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
      <Text style={styles.title}>{isEditing ? "Editar crush" : "Novo crush"}</Text>

      {/* Foto */}
      <Pressable style={styles.photoContainer} onPress={pickPhoto}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={[styles.photo, isTop && styles.photoTop]} />
        ) : (
          <View style={[styles.photoPlaceholder, isTop && styles.photoTop]}>
            <Text style={styles.photoPlaceholderText}>📷</Text>
            <Text style={styles.photoPlaceholderLabel}>Adicionar foto</Text>
          </View>
        )}
        {isTop && <Text style={styles.topBadgePhoto}>TOP</Text>}
      </Pressable>

      {/* Nome */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Nome do crush"
          placeholderTextColor="#6B7280"
        />
      </View>

      {/* Redes sociais — collapsible, collapsed by default */}
      <Collapsible title="Redes Sociais" defaultOpen={false}>
        <SocialFieldsForm
          values={social}
          onChange={(field, value) => setSocial((prev) => ({ ...prev, [field]: value }))}
        />
      </Collapsible>

      {/* Interesse em sair */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interesse em sair</Text>
        <StarRating
          value={interestRating}
          onChange={(v) => {
            setInterestRating(v);
            if (v < 5) setIsTop(false);
          }}
        />
        {interestRating === 5 && (
          <Pressable style={styles.topRow} onPress={() => setIsTop(!isTop)}>
            <View style={[styles.topCheck, isTop && styles.topCheckOn]}>
              {isTop && <Text style={styles.topCheckMark}>✓</Text>}
            </View>
            <Text style={styles.topLabel}>TOP</Text>
          </Pressable>
        )}
      </View>

      {/* Notas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notas</Text>
        <TextInput
          style={[styles.input, styles.reviewInput]}
          value={review}
          onChangeText={setReview}
          placeholder="Anotações gerais sobre o crush..."
          placeholderTextColor="#6B7280"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <Pressable
        style={[styles.button, styles.save, saving && styles.disabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.buttonText}>{saving ? "Salvando..." : "Salvar"}</Text>
      </Pressable>

      {isEditing && (
        <Pressable
          style={[styles.button, styles.addDate]}
          onPress={() => navigation.navigate("DateForm", { crushId: crushId as string })}
        >
          <Text style={styles.buttonText}>Registrar Date</Text>
        </Pressable>
      )}

      {isEditing && (
        <Pressable style={[styles.button, styles.delete]} onPress={handleDelete}>
          <Text style={styles.buttonText}>Excluir</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1E2327" },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1E2327" },
  title: { fontSize: 22, fontWeight: "700", color: "#FFFFFF", marginBottom: 20 },

  photoContainer: { alignSelf: "center", marginBottom: 24 },
  photo: { width: 120, height: 120, borderRadius: 60 },
  photoTop: { borderWidth: 3, borderColor: "#FFD700" },
  topBadgePhoto: {
    position: "absolute", bottom: -6, alignSelf: "center",
    backgroundColor: "#FFD700", color: "#000", fontWeight: "800",
    fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  photoPlaceholder: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: "#262B31",
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#3A3F45", borderStyle: "dashed",
  },
  photoPlaceholderText: { fontSize: 32 },
  photoPlaceholderLabel: { color: "#6B7280", fontSize: 11, marginTop: 4 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  topCheck: {
    width: 22, height: 22, borderRadius: 4,
    borderWidth: 2, borderColor: "#FFD700",
    justifyContent: "center", alignItems: "center",
  },
  topCheckOn: { backgroundColor: "#FFD700" },
  topCheckMark: { color: "#000", fontWeight: "800", fontSize: 13 },
  topLabel: { color: "#FFD700", fontWeight: "700", fontSize: 15, letterSpacing: 1 },

  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, color: "#A0A0A0", marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: "#3A3F45", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    color: "#FFFFFF", fontSize: 15,
  },
  reviewInput: {
    minHeight: 100,
    paddingTop: 10,
  },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, color: "#A0A0A0", marginBottom: 10, fontWeight: "600" },

  button: { paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 8 },
  save: { backgroundColor: "#E1306C" },
  addDate: { backgroundColor: "#16a34a", marginTop: 12 },
  delete: { backgroundColor: "#8B2E3F", marginTop: 12 },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 16 },
});
