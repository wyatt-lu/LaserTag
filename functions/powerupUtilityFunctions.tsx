import React from "react";
import { TouchableOpacity, View } from "react-native";
import { styles } from "@/constants/styles";
import {
  BadgeIcon,
  BootsIcon,
  BountyIcon,
  CactusIcon,
  HatIcon,
  HorseshoeIcon,
  LassoIcon,
  OxIcon,
  MoneyIcon,
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
        {item.type === "Sheriff Badge" && <BadgeIcon width={30} height={30} />}
        {item.type === "Cowboy Boots" && <BootsIcon width={30} height={30} />}
        {item.type === "Bounty" && <BountyIcon width={30} height={30} />}
        {item.type === "Cactus" && <CactusIcon width={30} height={30} />}
        {item.type === "Cowboy Hat" && <HatIcon width={30} height={30} />}
        {item.type === "Horseshoe" && <HorseshoeIcon width={30} height={30} />}
        {item.type === "Lasso" && <LassoIcon width={30} height={30} />}
        {item.type === "Ox Stampede" && <OxIcon width={30} height={30} />}
        {item.type === "Money" && <MoneyIcon width={30} height={30} />}
      </View>
      {/* <AppText style={styles.powerUpName}>{item.type}</AppText> */}
      {item.count > 1 && (
        <AppText style={styles.powerUpCount}>{item.count}</AppText>
      )}
    </TouchableOpacity>
  );
};
