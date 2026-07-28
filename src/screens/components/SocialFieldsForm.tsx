import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { SocialFields } from "../../types/database";

interface Props {
  values: SocialFields;
  onChange: (field: keyof SocialFields, value: string) => void;
}

const FIELDS: { key: keyof SocialFields; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "@usuario" },
  { key: "twitter_x", label: "Twitter/X", placeholder: "@usuario" },
  { key: "tiktok", label: "TikTok", placeholder: "@usuario" },
  { key: "facebook", label: "Facebook", placeholder: "facebook.com/usuario" },
];

export default function SocialFieldsForm({ values, onChange }: Props) {
  return (
    <View>
      {FIELDS.map((field) => (
        <View key={field.key} style={styles.fieldGroup}>
          <Text style={styles.label}>{field.label}</Text>
          <TextInput
            style={styles.input}
            value={values[field.key]}
            onChangeText={(text) => onChange(field.key, text)}
            placeholder={field.placeholder}
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
