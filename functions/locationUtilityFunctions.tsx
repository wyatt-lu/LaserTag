import { useState } from "react";

type LatLng = { latitude: number; longitude: number };
type XY = { x: number; y: number };

export const degree = (x: number, y: number): number => {
  let degree = 0;
  if (Math.atan2(y, x) >= 0) {
    degree = Math.atan2(y, x) * (180 / Math.PI);
  } else {
    degree = (Math.atan2(y, x) + 2 * Math.PI) * (180 / Math.PI);
  }
  degree = Math.round(degree - 90 >= 0 ? degree - 90 : degree + 271);
  return degree;
};

export const latLngToCartesian = (point: LatLng, center: LatLng): XY => {
  const earthRadius = 6378137; // meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const deltaLat = toRad(point.latitude - center.latitude);
  const deltaLon = toRad(point.longitude - center.longitude);

  const meanLat = toRad((point.latitude + center.latitude) / 2);

  const x = earthRadius * deltaLon * Math.cos(meanLat);
  const y = earthRadius * deltaLat;
  return { x, y };
};

export const cartesianToLatLng = (xy: XY, centerLatLng: LatLng): LatLng => {
  if (!xy) return { latitude: 0, longitude: 0 };
  const earthRadius = 6378137; // meters (WGS-84)

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat0 = toRad(centerLatLng.latitude);
  const lon0 = toRad(centerLatLng.longitude);

  // Calculate latitude
  const lat = lat0 + xy.y / earthRadius;

  // Calculate longitude (note the cos(mean latitude) factor)
  const lon = lon0 + xy.x / (earthRadius * Math.cos((lat0 + lat) / 2));
  return {
    latitude: toDeg(lat),
    longitude: toDeg(lon),
  };
};
