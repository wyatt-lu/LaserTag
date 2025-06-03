import { ref, get, update, Database } from "firebase/database";
import { cartesianToLatLng } from "@/functions/locationUtilityFunctions";
import { getAuth } from "firebase/auth";

type LatLng = { latitude: number; longitude: number };

export async function fireLaser(
  database: Database,
  roomCode: string | string[],
  LASER_LENGTH: number,
  center: { latitude: number; longitude: number }
) {
  const auth = getAuth();
  if (!auth.currentUser) return;

  const playerId = auth.currentUser.uid;
  const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
  const playerInfo = await get(playerRef);

  if (!playerInfo.exists()) return;

  const playerData = playerInfo.val();

  if (
    playerData.eliminated ||
    playerData.isRespawning ||
    playerData.lives === 0
  ) {
    return;
  }

  const { cartesian, direction } = playerData;

  const roomPlayerRef = ref(database, `rooms/${roomCode}/players`);
  const roomPlayerInfo = await get(roomPlayerRef);

  if (!roomPlayerInfo.exists()) return;

  const roomPlayerData = roomPlayerInfo.val();

  const directionInRadians = (direction * Math.PI) / 180;
  const laserEndX = cartesian.x + LASER_LENGTH * Math.cos(directionInRadians);
  const laserEndY = cartesian.y + LASER_LENGTH * Math.sin(directionInRadians);

  const laserStart = cartesianToLatLng(cartesian, center);
  const laserEnd = cartesianToLatLng({ x: laserEndX, y: laserEndY }, center);

  const laserVisuals = [];
  laserVisuals.push({
    id: `laser-${Date.now()}`,
    start: laserStart,
    end: laserEnd,
  });

  for (const [targetPlayerId, targetPlayerData] of Object.entries(
    roomPlayerData
  )) {
    const target = targetPlayerData as any;

    if (
      targetPlayerId === playerId ||
      target.eliminated ||
      target.isRespawning ||
      target.lives === 0 ||
      !target.cartesian
    ) {
      continue;
    }

    if (target.cowboyHat) continue;

    if (
      checkIfLineIntersectsRectangle(
        cartesian.x,
        cartesian.y,
        laserEndX,
        laserEndY,
        target.cartesian.x - 1,
        target.cartesian.y - 1,
        2,
        2
      )
    ) {
      const angleToTarget =
        Math.atan2(
          target.cartesian.y - cartesian.y,
          target.cartesian.x - cartesian.x
        ) *
        (180 / Math.PI);

      const normalizedDirection = ((direction % 360) + 360) % 360;
      const normalizedAngleToTarget = ((angleToTarget % 360) + 360) % 360;

      const angleDiff = Math.abs(normalizedAngleToTarget - normalizedDirection);
      const normalizedAngleDiff = Math.min(angleDiff, 360 - angleDiff);

      if (normalizedAngleDiff <= 30) {
        const targetRef = ref(
          database,
          `rooms/${roomCode}/players/${targetPlayerId}`
        );
        const currentLives = target.lives || 5;
        const newLives = Math.max(0, currentLives - 1);

        if (newLives > 0) {
          await update(targetRef, {
            eliminated: true,
            lives: newLives,
            isRespawning: true,
            isAlive: false,
          });
        } else {
          await update(targetRef, {
            eliminated: true,
            lives: 0,
            isRespawning: false,
            isAlive: false,
            isSpectator: true,
          });
        }

        const freshPlayerInfo = await get(playerRef);
        const shooterData = freshPlayerInfo.val();
        const newPoints = (shooterData.points || 0) + 1;
        await update(playerRef, { points: newPoints });

        break;
      }
    }
  }

  return laserVisuals;
}

const checkIfLineIntersectsRectangle = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number
): boolean => {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return (
      x1 >= rectX &&
      x1 <= rectX + rectWidth &&
      y1 >= rectY &&
      y1 <= rectY + rectHeight
    );
  }

  let t0 = 0;
  let t1 = 1;

  const p = [-dx, dx, -dy, dy];
  const q = [
    x1 - rectX,
    rectX + rectWidth - x1,
    y1 - rectY,
    rectY + rectHeight - y1,
  ];

  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }

  return t0 <= t1;
};
