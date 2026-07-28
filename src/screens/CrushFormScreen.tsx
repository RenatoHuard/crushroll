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

export default function CrushFormScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const crushId = route.params?.crushId;
  const isEditing = Boolean(crushId);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [social, setSocial] = useState<SocialFields>(EMPTY_SOCIAL);

  useEffect(() => {
    if (crushId) {
      loadCrush(crushId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    }
    setLoading(false);
  }

  function handleSocialChange(field: keyof SocialFields, value: string) {
    setSocial((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!session?.user.id) return;

    if (!name.trim()) {
      Alert.alert("Nome obrigatorio", "Informe o nome do crush.");
      return;
    }

    setSaving(true);

    const payload = {
      name: name.trim(),
      user_id: session.user.id,
      ...social,
    };

    const { error } = crushId
      ? await supabase.from("crushes").update(payload).eq("id", crushId)
      : await supabase.from("crushes").insert(payload);

    setSaving(false);

    if (error) {
      Alert.alert("Erro ao salvar", error.message);
    } else {
      navigation.goBack();
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

          if (error) {
            Alert.alert("Erro ao excluir", error.message);
          } else {
            navigation.goBack();
          }
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
      <Text style={styles.title}>
        {isEditing ? "Editar crush" : "Novo crush"}
      </Text>

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

      {isEditing && (
        <Pressable style={[styles.button, styles.delete]} onPress={handleDelete}>
          <Text style={styles.buttonText}>Excluir</Text>
        </Pressable>
      )}
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
  delete: {
    backgroundColor: "#8B2E3F",
    marginTop: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
