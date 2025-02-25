import { Link, Stack } from "expo-router";
import { Text, StyleSheet, SafeAreaView } from "react-native";

import React from "react";
import { globalStyles } from "@/constants/styles";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <SafeAreaView style={globalStyles.container}>
        <Text>This screen doesn't exist.</Text>
        <Link href="/" style={styles.link}>
          <Text>Go to home screen!</Text>
        </Link>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
