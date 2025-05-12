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

type XY = {
  x: number;
  y: number;
};

type Props = {
  cartesian: XY;
  name: string;
  center: LatLng;
};


type LatLng = { latitude: number; longitude: number };

const cartesianToLatLng = (xy: XY, center: LatLng): LatLng => {
  const earthRadius = 6378137;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const centerLatRad = toRad(center.latitude);
  const deltaLat = xy.y / earthRadius;
  const deltaLon = xy.x / (earthRadius * Math.cos(centerLatRad));

  // Adjust the latitude and longitude calculations
  const lat = centerLatRad - deltaLat; // Subtract for moving north to south
  const lon = toRad(center.longitude) + deltaLon; // Add for moving east, subtract for west

  const result = {
    latitude: toDeg(lat),
    longitude: toDeg(lon),
  };

  return result;
};

export default function PowerUpMarker({ cartesian, name, center }: Props) {
  return (
    <Marker coordinate={{
      latitude: cartesianToLatLng(cartesian, center).latitude,
      longitude: cartesianToLatLng(cartesian, center).longitude,
    }}>
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
