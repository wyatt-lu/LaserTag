import React, { useState } from "react";
import { SafeAreaView, View } from "react-native";
import { globalStyles } from "@/constants/styles";
import AppText from "@/components/AppText";

export default function SettingsScreen() {
  return (
    <SafeAreaView style={globalStyles.container}>
      <View>
        <AppText> Settings?</AppText>
      </View>
    </SafeAreaView>
  );
}
