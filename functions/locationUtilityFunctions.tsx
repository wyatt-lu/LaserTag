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
  // console.log("rawPoint", point);
  // console.log("center", center);

  const earthRadius = 6378137;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const deltaLat = toRad(point.latitude - center.latitude);
  const deltaLon = toRad(point.longitude - center.longitude);
  const centerLatRad = toRad(center.latitude);

  // console.log("deltaLat", deltaLat)
  // console.log("deltaLon", deltaLon)
  // console.log("centerLatRad",centerLatRad)
  const x = earthRadius * deltaLat * Math.cos(centerLatRad);
  const y = earthRadius * deltaLon;

  // console.log("x", x)
  // console.log("y",y)
  return { x, y };
};

export const cartesianToLatLng = (xy: XY, center: LatLng): LatLng => {
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
