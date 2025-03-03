import React from "react";
import { SafeAreaView, View } from "react-native";

import { globalStyles } from "@/constants/styles";
import AppText from "@/components/AppText";

export default function EquipmentScreen() {
  return (
    <SafeAreaView style={globalStyles.container}>
      <View>
        <AppText>Equipment</AppText>
      </View>
    </SafeAreaView>
  );
}
