## Learn once, write anywhere

React Native uses the same React (components, props, state, hooks, context) but renders **native platform views** instead of DOM nodes. A `<View>` becomes a `UIView` on iOS and an `android.view.View` on Android. Your JavaScript runs on a JS engine (Hermes) inside the app; there is no browser and no HTML.

```tsx
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Count: {count}</Text>
      <Pressable onPress={() => setCount(count + 1)} accessibilityRole="button">
        <Text>Increment</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600' },
});
```

## Differences from React DOM

| Web | React Native |
| --- | --- |
| `<div>`, `<span>`, `<p>` | `<View>`, `<Text>` (**all text must be inside `<Text>`**) |
| `<img>` | `<Image>` |
| `<button onClick>` | `<Pressable onPress>` |
| `<input>` | `<TextInput onChangeText>` |
| scrolling `<div>` / long `<ul>` | `<ScrollView>` / virtualized `<FlatList>`, `<SectionList>` |
| CSS files, cascade | `style` objects / `StyleSheet.create`, no cascade, no selectors |
| Flexbox `row` by default | Flexbox `column` by default, units are density-independent numbers |

Platform differences are handled with `Platform.OS`, `Platform.select({ ios, android })` or platform files (`Button.ios.tsx`, `Button.android.tsx`).

## The New Architecture

The original architecture sent every message between JavaScript and native code through an asynchronous JSON **bridge**: serialization costs, no synchronous calls, janky gestures. The New Architecture replaces it:

- **JSI** (JavaScript Interface): C++ API that lets JavaScript hold references to native objects and call them directly, synchronously when needed.
- **Fabric**: the new renderer, written in C++, shared across platforms. It supports concurrent React features (Transitions, Suspense, automatic batching) and synchronous layout reads.
- **TurboModules**: native modules loaded lazily and called through JSI.
- **Codegen**: generates type-safe native glue from TypeScript specs.

Timeline: the New Architecture became the default in React Native 0.76 (2024). The legacy architecture was frozen in 0.80, and since **0.82 (October 2025)** React Native runs **only** on the New Architecture; following releases keep removing legacy code. **Hermes V1** became the default engine in 0.84. React Native 0.88 (October 2026) ships with React 19.3.

## Expo: the recommended way to start

The React Native team recommends a **framework**, and Expo is the one they point to:

```bash
npx create-expo-app@latest
```

- **Expo SDK**: maintained native modules (camera, notifications, file system, secure store) with a consistent API. Expo SDK 55+ supports only the New Architecture.
- **Expo Router**: file-based routing (`app/index.tsx`, `app/[id].tsx`) for iOS, Android and web, with deep links for free; recent SDKs added stable data loaders, server rendering and middleware for web output.
- **Expo Go** for quick experiments, **development builds** when you need custom native code, **config plugins** to change native projects without editing them by hand.
- **EAS**: cloud builds, store submission and over-the-air **updates** for JavaScript changes.

**Legacy vs modern.** Old tutorials start with `react-native init` and hand-edited Xcode/Gradle projects, plus `react-navigation` set up manually. Today: Expo, Expo Router and Continuous Native Generation (native folders generated from config).

## Ecosystem essentials

- Animation: **Reanimated** (runs animations on the UI thread with worklets) and **Gesture Handler**.
- Lists: `FlatList`, or **FlashList** for very long lists.
- Styling: `StyleSheet`, NativeWind (Tailwind classes for native), Tamagui, Unistyles.
- Web: **React Native Web** renders the same components to the DOM (Expo uses it for web output).

## Pitfalls

- Rendering raw text outside `<Text>` throws an error.
- `ScrollView` with thousands of items renders all of them: use a virtualized list.
- Libraries that touch the DOM (`document`, `window`) do not work. Check for React Native support.
- Animations driven by React state on the JS thread stutter; use Reanimated.
- Accessibility props differ: `accessibilityRole`, `accessibilityLabel` (or the newer `role` and `aria-*` aliases).
