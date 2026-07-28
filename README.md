# CrushRoll

App de cadastro de Usuário e Crushs, com login via Google/Apple (Supabase Auth).

## Stack
- React Native via Expo (SDK 51), TypeScript
- Supabase (Auth + Postgres + RLS)
- React Navigation (native-stack)

## Estrutura
```
App.tsx
src/
  lib/
    supabase.ts     -> cliente Supabase
    useAuth.ts       -> hook de sessao e OAuth
  navigation/
    AppNavigator.tsx
    types.ts
  screens/
    LoginScreen.tsx
    ProfileScreen.tsx      -> cadastro do Usuario
    CrushListScreen.tsx    -> lista de crushs
    CrushFormScreen.tsx    -> cadastro/edicao/exclusao de crush
    components/SocialFieldsForm.tsx
  types/database.ts
supabase/migrations/0001_init.sql -> schema, RLS, triggers
```

## Setup

### 1. Supabase
1. Crie um projeto em https://supabase.com.
2. No SQL Editor, rode o conteúdo de `supabase/migrations/0001_init.sql`.
3. Em Authentication > Providers, habilite Google e Apple, configurando os Client IDs/Secrets de cada um (necessário criar credenciais no Google Cloud Console e Apple Developer).
4. Em Authentication > URL Configuration, adicione `crushroll://` como Redirect URL.
5. Copie a Project URL e a anon key (Project Settings > API).

### 2. App
```bash
cp .env.example .env
# preencha EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY

npm install
npx expo start
```

- Android: pressione `a` no terminal do Expo (emulador ou dispositivo com Expo Go/dev build).
- iOS: pressione `i` (requer macOS + Xcode, ou EAS Build para gerar sem Mac).

### 3. Login social em build nativo
O fluxo OAuth via `expo-web-browser` funciona em Expo Go para testes, mas login com Apple exige build nativo (EAS Build) para publicação na App Store — Expo Go não passa na revisão da Apple com esse provider em produção.

## Modelo de dados
- `profiles`: 1 registro por usuário autenticado (criado automaticamente no signup via trigger). Campos: `name`, `instagram`, `twitter_x`, `tiktok`, `facebook`.
- `crushes`: N registros por usuário, mesmos campos + `user_id`. RLS garante que cada usuário só vê/edita os próprios registros.
