import React, { useState } from "react";
import { SafeAreaView, View } from "react-native";
import { globalStyles } from "@/constants/styles";
import AppText from "@/components/AppText";

export default function EquipmentScreen() {
  return (
    <SafeAreaView style={globalStyles.container}>
      <View>
        <AppText>How to play LaserTag!</AppText>
        <AppText>
          First, pick a host and start a game. Then share the roomcode with
          your friends in order to play in the same game! The host can then choose
          who's on which team. Note: a free for all style game is just everyone on different teams!
        </AppText>
        <AppText>
          Now start the game, and run to various starting locations! Note: be careful
          not to run out of the boundary. The boundary is a sqaure, centerd at the host's
          location when they first started the game.
        </AppText>
        <AppText>
          How do PowerUps work?
          CowboyHat works as invisibility, concealing the user for 10 seconds.
          CowboyBoots creates a fake doppelganger for 20 seconds! If this doppelganger
          gets out, nothing happens!
          Cactus works as a landmine where the user can place it anyway. Beware, the user
          won't be able to see where they placed it on their game map, so don't accidentally
          eliminate yourself!!
        </AppText>
      </View>
    </SafeAreaView>
  );
}
