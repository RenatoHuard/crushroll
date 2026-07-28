import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function signInWithProvider(provider: "google" | "apple") {
    const redirectTo = AuthSession.makeRedirectUri({ scheme: "crushroll" });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (!data?.url) throw new Error("URL de autenticacao nao retornada");

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type === "success" && result.url) {
      const params = new URL(result.url).hash
        .replace("#", "")
        .split("&")
        .reduce<Record<string, string>>((acc, part) => {
          const [key, value] = part.split("=");
          acc[key] = decodeURIComponent(value ?? "");
          return acc;
        }, {});

      if (params.access_token && params.refresh_token) {
        await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
      }
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { session, loading, signInWithProvider, signOut };
}
