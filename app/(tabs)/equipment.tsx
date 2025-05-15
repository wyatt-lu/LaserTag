import React, { useState } from "react";
import { SafeAreaView, View } from "react-native";
import { globalStyles } from "@/constants/styles";
import AppText from "@/components/AppText";

export default function EquipmentScreen() {
  return (
    <SafeAreaView style={globalStyles.container}>
      <View>
        <AppText>Other?</AppText>
      </View>
    </SafeAreaView>
  );
}
