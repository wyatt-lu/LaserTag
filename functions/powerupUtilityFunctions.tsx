import React from "react";
import { TouchableOpacity, View } from "react-native";
import { styles } from "@/constants/styles";
import {
  BootsIcon,
  CactusIcon,
  HatIcon,
} from "@/constants/icons";
import AppText from "@/components/AppText";

export const renderPowerUpItem = ({
  item,
}: {
  item: { id: string; type: string; count: number };
}) => {
  return (
    <TouchableOpacity
      style={styles.powerUpItem}
      onPress={() => {}} //usePowerUp(item)}
    >
      <View style={styles.powerUpIconContainer}>
        {item.type === "Cowboy Boots" && <BootsIcon width={30} height={30} />}
        {item.type === "Cactus" && <CactusIcon width={30} height={30} />}
        {item.type === "Cowboy Hat" && <HatIcon width={30} height={30} />}
      </View>
      {/* <AppText style={styles.powerUpName}>{item.type}</AppText> */}
      {item.count > 1 && (
        <AppText style={styles.powerUpCount}>{item.count}</AppText>
      )}
    </TouchableOpacity>
  );
};
