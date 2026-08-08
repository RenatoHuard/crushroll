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
import { Crush, CrushDate } from "../types/database";
import { RootStackParamList } from "../navigation/types";

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, "DateForm">;
  route: RouteProp<RootStackParamList, "DateForm">;
}

const ACTIVITIES: {
  key: keyof ActivityFlags;
  ratingKey: keyof ActivityRatings;
  emoji: string;
}[] = [
  { key: "had_chat", ratingKey: "had_chat_rating", emoji: "💬" },
  { key: "had_kiss", ratingKey: "had_kiss_rating", emoji: "💋" },
  { key: "had_pirulito", ratingKey: "had_pirulito_rating", emoji: "🍭" },
  { key: "had_donut", ratingKey: "had_donut_rating", emoji: "🍩" },
  { key: "had_fire", ratingKey: "had_fire_rating", emoji: "🔥" },
  { key: "had_sweat", ratingKey: "had_sweat_rating", emoji: "💦" },
];

interface ActivityFlags {
  had_chat: boolean;
  had_kiss: boolean;
  had_pirulito: boolean;
  had_donut: boolean;
  had_fire: boolean;
  had_sweat: boolean;
}

interface ActivityRatings {
  had_chat_rating: number;
  had_kiss_rating: number;
  had_pirulito_rating: number;
  had_donut_rating: number;
  had_fire_rating: number;
  had_sweat_rating: number;
}

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
        <Pressable key={star} onPress={() => onChange(star === value ? 0 : star)}>
          <Text style={{ fontSize: size, color: star <= value ? "#FFD700" : "#3A3F45" }}>
            {star <= value ? "★" : "☆"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// Format today as DD/MM/AAAA
function todayDisplay(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear());
  return `${day}/${month}/${year}`;
}

// DD/MM/AAAA -> YYYY-MM-DD for DB (returns null if invalid)
function displayToISO(text: string): string | null {
  const parts = text.split("/");
  if (parts.length !== 3 || parts[2].length !== 4) return null;
  const [day, month, year] = parts;
  if (!day || !month || !year) return null;
  return `${year}-${month}-${day}`;
}

// YYYY-MM-DD -> DD/MM/AAAA for display
function isoToDisplay(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Auto-mask input: inserts slashes after day and month
function maskDate(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length > 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }
  if (digits.length > 2) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

export default function DateFormScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const dateId = route.params?.dateId;
  const isEditing = Boolean(dateId);

  const [selectedCrushId, setSelectedCrushId] = useState<string | null>(
    route.params?.crushId ?? null
  );
  const [selectedCrushName, setSelectedCrushName] = useState<string>("");
  const [selectedCrushPhoto, setSelectedCrushPhoto] = useState<string | null>(null);
  const [crushes, setCrushes] = useState<Crush[]>([]);
  const [searchText, setSearchText] = useState("");
  const [showCrushPicker, setShowCrushPicker] = useState(false);
  const [loadingCrushes, setLoadingCrushes] = useState(true);

  const [dateText, setDateText] = useState(todayDisplay());
  const [location, setLocation] = useState("");
  const [dateRating, setDateRating] = useState(0);
  const [activities, setActivities] = useState<ActivityFlags>({
    had_chat: false, had_kiss: false, had_pirulito: false, had_donut: false, had_fire: false, had_sweat: false,
  });
  const [activityRatings, setActivityRatings] = useState<ActivityRatings>({
    had_chat_rating: 0, had_kiss_rating: 0, had_pirulito_rating: 0,
    had_donut_rating: 0, had_fire_rating: 0, had_sweat_rating: 0,
  });
  const [review, setReview] = useState("");
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCrushes();
  }, []);

  useEffect(() => {
    if (isEditing && dateId) loadDate(dateId);
  }, [dateId]);

  // Update selected crush when param changes (after creating a new crush from this screen)
  useEffect(() => {
    const paramId = route.params?.crushId;
    if (paramId && paramId !== selectedCrushId) {
      setSelectedCrushId(paramId);
      const found = crushes.find((c) => c.id === paramId);
      if (found) {
        setSelectedCrushName(found.name);
        setSelectedCrushPhoto(found.photo_url);
      }
    }
  }, [route.params?.crushId]);

  async function loadCrushes() {
    setLoadingCrushes(true);
    const { data, error } = await supabase
      .from("crushes")
      .select("*")
      .order("crush_number", { ascending: true });

    if (!error && data) {
      const list = data as Crush[];
      setCrushes(list);
      const paramId = route.params?.crushId;
      if (paramId) {
        const found = list.find((c) => c.id === paramId);
        if (found) {
          setSelectedCrushName(found.name);
          setSelectedCrushPhoto(found.photo_url);
        }
      }
    }
    setLoadingCrushes(false);
  }

  async function loadDate(id: string) {
    const { data, error } = await supabase
      .from("crush_dates")
      .select("*")
      .eq("id", id)
      .single<CrushDate>();

    if (error || !data) return;

    setSelectedCrushId(data.crush_id);
    if (data.date) setDateText(isoToDisplay(data.date));
    setLocation(data.location ?? "");
    setDateRating(data.date_rating);
    setActivities({
      had_chat: data.had_chat, had_kiss: data.had_kiss,
      had_pirulito: data.had_pirulito, had_donut: data.had_donut, had_fire: data.had_fire,
      had_sweat: data.had_sweat,
    });
    setActivityRatings({
      had_chat_rating: data.had_chat_rating, had_kiss_rating: data.had_kiss_rating,
      had_pirulito_rating: data.had_pirulito_rating,
      had_donut_rating: data.had_donut_rating, had_fire_rating: data.had_fire_rating,
      had_sweat_rating: data.had_sweat_rating,
    });
    setReview(data.review ?? "");
    setPhotoUris(data.photos ?? []);

    // Load crush name/photo for display (picker hidden in edit mode)
    const { data: crushData } = await supabase
      .from("crushes").select("name, photo_url").eq("id", data.crush_id).single();
    if (crushData) {
      setSelectedCrushName(crushData.name);
      setSelectedCrushPhoto(crushData.photo_url);
    }
  }

  async function addPhotos() {
    if (photoUris.length >= 5) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão necessária", "Permita acesso à galeria.");
      return;
    }
    const remaining = 5 - photoUris.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map((a) => a.uri).slice(0, remaining);
      setPhotoUris((prev) => [...prev, ...newUris]);
    }
  }

  function removePhoto(index: number) {
    setPhotoUris((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadDatePhoto(uri: string, userId: string, targetDateId: string, index: number): Promise<string> {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const path = `${userId}/dates/${targetDateId}-${index}.jpg`;
    const { error } = await supabase.storage
      .from("crush-photos")
      .upload(path, arrayBuffer, { contentType: "image/jpeg", upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from("crush-photos").getPublicUrl(path);
    return `${publicUrl}?t=${Date.now()}`;
  }

  const filteredCrushes = crushes.filter((c) =>
    c.name.toLowerCase().includes(searchText.toLowerCase())
  );

  function selectCrush(crush: Crush) {
    setSelectedCrushId(crush.id);
    setSelectedCrushName(crush.name);
    setSelectedCrushPhoto(crush.photo_url);
    setShowCrushPicker(false);
    setSearchText("");
  }

  async function handleSave() {
    if (!session?.user.id) return;
    if (!selectedCrushId) {
      Alert.alert("Selecione um crush", "Você precisa escolher com quem foi o date.");
      return;
    }

    setSaving(true);
    try {
      const userId = session.user.id;
      const targetDateId = isEditing ? dateId! : Crypto.randomUUID();
      const isoDate = displayToISO(dateText);

      // Upload local photos, keep remote URLs as-is
      const uploadedPhotos: string[] = [];
      for (let i = 0; i < photoUris.length; i++) {
        const uri = photoUris[i];
        if (uri.startsWith("https://") || uri.startsWith("http://")) {
          uploadedPhotos.push(uri);
        } else {
          const url = await uploadDatePhoto(uri, userId, targetDateId, i);
          uploadedPhotos.push(url);
        }
      }

      const payload = {
        crush_id: selectedCrushId,
        user_id: userId,
        date: isoDate,
        location: location.trim() || null,
        date_rating: dateRating,
        ...activities,
        ...activityRatings,
        review: review.trim() || null,
        photos: uploadedPhotos.length > 0 ? uploadedPhotos : [],
      };

      if (isEditing) {
        const { error } = await supabase.from("crush_dates").update(payload).eq("id", targetDateId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("crush_dates").insert({ id: targetDateId, ...payload });
        if (error) throw error;
      }

      navigation.goBack();
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
    if (!dateId) return;
    Alert.alert("Excluir date", "Tem certeza que deseja excluir este date?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("crush_dates").delete().eq("id", dateId);
          if (error) Alert.alert("Erro ao excluir", error.message);
          else navigation.goBack();
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{isEditing ? "Editar Date" : "Registrar Date"}</Text>

      {/* Quem foi? — oculto no modo edição */}
      {!isEditing ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quem foi?</Text>

          {selectedCrushId ? (
            <Pressable
              style={styles.selectedCrushRow}
              onPress={() => setShowCrushPicker(!showCrushPicker)}
            >
              {selectedCrushPhoto ? (
                <Image source={{ uri: selectedCrushPhoto }} style={styles.selectedCrushPhoto} />
              ) : (
                <View style={styles.selectedCrushPhotoPlaceholder}>
                  <Text style={{ fontSize: 18 }}>💘</Text>
                </View>
              )}
              <Text style={styles.selectedCrushName}>{selectedCrushName}</Text>
              <Text style={styles.changeText}>Trocar</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.selectCrushBtn}
              onPress={() => setShowCrushPicker(!showCrushPicker)}
            >
              <Text style={styles.selectCrushBtnText}>Selecionar crush</Text>
            </Pressable>
          )}

          {showCrushPicker && (
            <View style={styles.pickerContainer}>
              <TextInput
                style={styles.searchInput}
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Buscar crush..."
                placeholderTextColor="#6B7280"
              />
              {loadingCrushes ? (
                <ActivityIndicator color="#FFFFFF" style={{ marginTop: 12 }} />
              ) : (
                <>
                  {filteredCrushes.map((crush) => (
                    <Pressable
                      key={crush.id}
                      style={styles.crushPickerItem}
                      onPress={() => selectCrush(crush)}
                    >
                      {crush.photo_url ? (
                        <Image source={{ uri: crush.photo_url }} style={styles.crushPickerPhoto} />
                      ) : (
                        <View style={styles.crushPickerPhotoPlaceholder}>
                          <Text style={{ fontSize: 16 }}>💘</Text>
                        </View>
                      )}
                      <Text style={styles.crushPickerName}>{crush.name}</Text>
                    </Pressable>
                  ))}
                  <Pressable
                    style={styles.newCrushBtn}
                    onPress={() => {
                      setShowCrushPicker(false);
                      navigation.navigate("CrushForm", { returnToDate: true });
                    }}
                  >
                    <Text style={styles.newCrushBtnText}>+ Novo Crush</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        </View>
      ) : (
        // Edit mode: show fixed crush (read-only)
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Crush</Text>
          <View style={styles.selectedCrushRow}>
            {selectedCrushPhoto ? (
              <Image source={{ uri: selectedCrushPhoto }} style={styles.selectedCrushPhoto} />
            ) : (
              <View style={styles.selectedCrushPhotoPlaceholder}>
                <Text style={{ fontSize: 18 }}>💘</Text>
              </View>
            )}
            <Text style={styles.selectedCrushName}>{selectedCrushName}</Text>
          </View>
        </View>
      )}

      {/* Data do date */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Data</Text>
        <TextInput
          style={styles.input}
          value={dateText}
          onChangeText={(t) => setDateText(maskDate(t))}
          placeholder="DD/MM/AAAA"
          placeholderTextColor="#6B7280"
          keyboardType="numeric"
          maxLength={10}
        />
      </View>

      {/* Localização */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Localização</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Onde foi?"
          placeholderTextColor="#6B7280"
        />
      </View>

      {/* Classificação do Date */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Classificação do Date</Text>
        <StarRating value={dateRating} onChange={setDateRating} />
      </View>

      {/* O que rolou? */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>O que rolou?</Text>
        <View style={styles.activitiesRow}>
          {ACTIVITIES.map(({ key, ratingKey, emoji }) => {
            const active = activities[key];
            return (
              <View key={key} style={styles.activityWrapper}>
                <Pressable
                  style={[styles.activityBtn, active && styles.activityBtnOn]}
                  onPress={() => setActivities((prev) => ({ ...prev, [key]: !prev[key] }))}
                >
                  <Text style={styles.activityEmoji}>{emoji}</Text>
                </Pressable>
                {active && (
                  <View style={styles.activityRatingRow}>
                    <StarRating
                      value={activityRatings[ratingKey]}
                      onChange={(v) => setActivityRatings((prev) => ({ ...prev, [ratingKey]: v }))}
                      size={20}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Fotos do date (até 5) */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Fotos do Date ({photoUris.length}/5)</Text>
        <View style={styles.photosRow}>
          {photoUris.map((uri, i) => (
            <View key={i} style={styles.photoThumb}>
              <Image source={{ uri }} style={styles.photoThumbImg} />
              <Pressable style={styles.photoRemoveBtn} onPress={() => removePhoto(i)}>
                <Text style={styles.photoRemoveBtnText}>×</Text>
              </Pressable>
            </View>
          ))}
          {photoUris.length < 5 && (
            <Pressable style={styles.photoAddBtn} onPress={addPhotos}>
              <Text style={styles.photoAddBtnText}>+</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Anotações do date */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Anotações do Date</Text>
        <TextInput
          style={[styles.input, styles.reviewInput]}
          value={review}
          onChangeText={setReview}
          placeholder="Como foi? O que aconteceu..."
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
        <Pressable style={[styles.button, styles.delete]} onPress={handleDelete}>
          <Text style={styles.buttonText}>Excluir Date</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1E2327" },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700", color: "#FFFFFF", marginBottom: 20 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, color: "#A0A0A0", marginBottom: 10, fontWeight: "600" },

  selectedCrushRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#262B31", borderRadius: 8, padding: 12, gap: 10,
  },
  selectedCrushPhoto: { width: 40, height: 40, borderRadius: 20 },
  selectedCrushPhotoPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#3A3F45", justifyContent: "center", alignItems: "center",
  },
  selectedCrushName: { color: "#FFFFFF", fontSize: 15, fontWeight: "600", flex: 1 },
  changeText: { color: "#E1306C", fontSize: 13 },

  selectCrushBtn: {
    backgroundColor: "#262B31", borderRadius: 8, padding: 14, alignItems: "center",
    borderWidth: 1, borderColor: "#3A3F45", borderStyle: "dashed",
  },
  selectCrushBtnText: { color: "#E1306C", fontSize: 15, fontWeight: "600" },

  pickerContainer: {
    marginTop: 10, backgroundColor: "#262B31",
    borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#3A3F45",
  },
  searchInput: {
    borderWidth: 1, borderColor: "#3A3F45", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    color: "#FFFFFF", fontSize: 14, marginBottom: 8,
  },
  crushPickerItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: "#3A3F45", gap: 10,
  },
  crushPickerPhoto: { width: 36, height: 36, borderRadius: 18 },
  crushPickerPhotoPlaceholder: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#3A3F45", justifyContent: "center", alignItems: "center",
  },
  crushPickerName: { color: "#FFFFFF", fontSize: 14, fontWeight: "500" },
  newCrushBtn: {
    marginTop: 10, backgroundColor: "#E1306C",
    borderRadius: 8, paddingVertical: 10, alignItems: "center",
  },
  newCrushBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, color: "#A0A0A0", marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: "#3A3F45", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, color: "#FFFFFF", fontSize: 15,
  },
  reviewInput: { minHeight: 100, paddingTop: 10 },

  photosRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  photoThumb: { position: "relative", width: 72, height: 72 },
  photoThumbImg: { width: 72, height: 72, borderRadius: 8 },
  photoRemoveBtn: {
    position: "absolute", top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#E1306C", justifyContent: "center", alignItems: "center",
  },
  photoRemoveBtnText: { color: "#FFF", fontSize: 14, lineHeight: 16, fontWeight: "700" },
  photoAddBtn: {
    width: 72, height: 72, borderRadius: 8,
    backgroundColor: "#262B31", borderWidth: 1, borderColor: "#3A3F45",
    borderStyle: "dashed", justifyContent: "center", alignItems: "center",
  },
  photoAddBtnText: { color: "#A0A0A0", fontSize: 32, lineHeight: 36 },

  activitiesRow: { flexDirection: "row", flexWrap: "wrap" },
  activityWrapper: { width: "33.33%", padding: 4, alignItems: "center" },
  activityBtn: {
    width: "100%", alignItems: "center", paddingVertical: 12,
    backgroundColor: "#262B31", borderRadius: 10, borderWidth: 1, borderColor: "#3A3F45",
  },
  activityBtnOn: { backgroundColor: "#3D1A26", borderColor: "#E1306C" },
  activityEmoji: { fontSize: 26 },
  activityLabel: { color: "#6B7280", fontSize: 11, marginTop: 4 },
  activityLabelOn: { color: "#E1306C" },
  activityRatingRow: { marginTop: 4 },

  button: { paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 8 },
  save: { backgroundColor: "#E1306C" },
  delete: { backgroundColor: "#8B2E3F", marginTop: 12 },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 16 },
});
