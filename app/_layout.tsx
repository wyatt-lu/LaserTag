import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Coiny_400Regular } from "@expo-google-fonts/coiny";
import { Bungee_400Regular } from "@expo-google-fonts/bungee";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Brother1816: require("../assets/fonts/Brother1816.ttf"),
  });

  let [fontsLoaded] = useFonts({
    Coiny_400Regular,
    Bungee_400Regular,
  });

  let fontSize = 24;
  let paddingVertical = 6;

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
