import { useAudioPlayer } from "expo-audio";

const soundFiles = {
  buttonClick: require("@/assets/sounds/button-click.mp3"),
  gameStart: require("@/assets/sounds/game-start.wav"),
  lasso: require("@/assets/sounds/lasso.wav"),
  backgroundTheme: require("@/assets/sounds/background-theme.wav"),
  // Add more sounds here
} as const;

type SoundName = keyof typeof soundFiles;

export const useSound = () => {
  const buttonClickPlayer = useAudioPlayer(soundFiles.buttonClick);
  const gameStartPlayer = useAudioPlayer(soundFiles.gameStart);
  const lassoPlayer = useAudioPlayer(soundFiles.lasso);
  const backgroundPlayer = useAudioPlayer(soundFiles.backgroundTheme);

  const playSound = (soundName: SoundName): void => {
    let player;
    switch (soundName) {
      case "buttonClick":
        player = buttonClickPlayer;
        break;
      case "gameStart":
        player = gameStartPlayer;
        break;
      case "lasso":
        player = lassoPlayer;
        break;
      case "backgroundTheme":
        player = backgroundPlayer;
        break;
      default:
        console.warn(`Sound ${soundName} not found`);
        return;
    }

    try {
      player.play();
      player.seekTo(0);
    } catch (error) {
      console.log("Sound play error:", error);
    }
  };

  return { playSound };
};
