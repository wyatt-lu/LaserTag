import React from "react";
import { View } from "react-native";
import { Marker } from "react-native-maps";
import {
  BadgeIcon,
  BootsIcon,
  BountyIcon,
  CactusIcon,
  HatIcon,
  HorseshoeIcon,
  LassoIcon,
  MoneyIcon,
  OxIcon,
} from "@/constants/icons";

type LatLng = {
  latitude: number;
  longitude: number;
};

type Props = {
  coordinate: LatLng;
  name: string;
};

export default function PowerUpMarker({ coordinate, name }: Props) {
  return (
    <Marker coordinate={coordinate}>
      <View>
        {name === "Sheriff Badge" && <BadgeIcon width={30} height={30} />}
        {name === "Cowboy Boots" && <BootsIcon width={30} height={30} />}
        {name === "Bounty" && <BountyIcon width={30} height={30} />}
        {name === "Cactus" && <CactusIcon width={30} height={30} />}
        {name === "Cowboy Hat" && <HatIcon width={30} height={30} />}
        {name === "Horseshoe" && <HorseshoeIcon width={30} height={30} />}
        {name === "Lasso" && <LassoIcon width={30} height={30} />}
        {name === "Ox Stampede" && <OxIcon width={30} height={30} />}
        {name === "Money" && <MoneyIcon width={30} height={30} />}
      </View>
    </Marker>
  );
}
