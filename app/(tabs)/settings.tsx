import React, { useState } from "react";
import { SafeAreaView, View } from "react-native";
import { globalStyles } from "@/constants/styles";
import AppText from "@/components/AppText";
import { get, ref, set, onDisconnect } from "firebase/database";
import { auth, database } from "../../firebaseconfig";
import ReusableButton from "@/components/ReusableButton";

function ButtonComponent({ laserCode, setLaserCode }) {
  const [showButtons, setShowButtons] = useState(false);

  const defaultCode = "111";
  const widthCode = "222";
  const radiusCode = "333";

  const createLaser = async (laserType: string) => {
    if (!auth.currentUser) return;

    var lCode;
    if (laserType == "Default") {
      lCode = defaultCode;
      setLaserCode(defaultCode);
    }

    if (laserType == "2x Width") {
      lCode = widthCode;
      setLaserCode(widthCode);
    }

    if (laserType == "Radius") {
      lCode = radiusCode;
      setLaserCode(radiusCode);
    }

    const laserRef = ref(database, `lasers/${lCode}`);

    await set(laserRef, {
      host: auth.currentUser.uid,
      laserType,
      players: {
        [auth.currentUser.uid]: {
          username: auth.currentUser.displayName,
        },
      },
    });

    onDisconnect(laserRef).remove();
  };

  const getLaser = async (laserType: string) => {
    if (!auth.currentUser) return;

    var lCode;
    if (laserType == "Default") {
      lCode = defaultCode;
      setLaserCode(defaultCode);
    }

    if (laserType == "2x Width") {
      lCode = widthCode;
      setLaserCode(widthCode);
    }

    if (laserType == "Radius") {
      lCode = radiusCode;
      setLaserCode(radiusCode);
    }

    const laserRef = ref(database, `lasers/${lCode}`);
    const laserSnapshot = await get(laserRef);

    if (!laserSnapshot.exists()) {
      createLaser(laserType);
    }
  };

  const toggleButtons = () => {
    setShowButtons(!showButtons);
  };

  return (
    <View>
      <ReusableButton
        onPress={toggleButtons}
        label={showButtons ? "Select Laser" : "Show Lasers"}
      />
      {showButtons && (
        <View>
          <ReusableButton
            label="Default"
            onPress={() => {
              getLaser("Default");
              toggleButtons();
            }}
          />
          <ReusableButton
            label="2x Width"
            onPress={() => {
              getLaser("2x Width");
              toggleButtons();
            }}
          />
          <ReusableButton
            label="Radius"
            onPress={() => {
              getLaser("Radius");
              toggleButtons();
            }}
          />
        </View>
      )}
    </View>
  );
}

function getLaserType(laserCode: string) {
  if (laserCode == "111") {
    return "Default";
  }

  if (laserCode == "222") {
    return "2x Width";
  }

  if (laserCode == "333") {
    return "Radius";
  }

  if (laserCode == "None") {
    return "None";
  }
}

export default function SettingsScreen() {
  const [laserCode, setLaserCode] = useState<string | "None">("None");
  return (
    <SafeAreaView style={globalStyles.container}>
      <View>
        <AppText> Current Selected Laser: {getLaserType(laserCode)}</AppText>
      </View>

      <ButtonComponent laserCode={laserCode} setLaserCode={setLaserCode} />
    </SafeAreaView>
  );
}

/*
const types = ["Default Laser", "2x Width", "Radius"];

try {
  const Tab = styled.button`
    padding: 10px 30px;
    cursor: pointer;
    opacity: 0.6;
    background: white;
    border: 0;
    outline: 0;
    border-bottom: 2px solid transparent;
    transition: ease border-bottom 250ms;
    ${({ active }) =>
      active &&
      `
      border-bottom: 2px solid black;
      opacity: 1;
    `}
  `;

  function TabGroup() {
    const [active, setActive] = useState(types[0]);
    return (
      <>
        <div>
          {types.map((type) => (
            <Tab
              key={type}
              active={active === type}
              onPress={() => setActive(type)}
            >
              {type}
            </Tab>
          ))}
        </div>
        <p />
        <p> Your payment selection: {active} </p>
      </>
    );
  }
} catch (error) {
  console.error("Error selecting laser:", error);
} */
