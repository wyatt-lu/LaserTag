import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";

const { width: screenWidth } = Dimensions.get("window");

type Player = {
  id: string;
  username: string;
  team: string;
  points?: number;
  lives?: number;
  isEliminated?: boolean;
};

type PlayerURL = {
  id: string;
  url?: string;
};

type GameEndModalProps = {
  visible: boolean;
  onClose: () => void;
  players: Player[];
  playerURLArray: PlayerURL[];
};

export default function GameEndModal({
  visible,
  onClose,
  players,
  playerURLArray,
}: GameEndModalProps) {
  // Sort players by points (descending) and add rankings
  const sortedPlayers = useMemo(() => {
    return [...players]
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .map((player, index) => ({
        ...player,
        rank: index + 1,
      }));
  }, [players]);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "#FFD700"; // Gold
      case 2:
        return "#C0C0C0"; // Silver
      case 3:
        return "#CD7F32"; // Bronze
      default:
        return "#E5E7EB"; // Gray
    }
  };

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return "";
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>GAME OVER</Text>
            <Text style={styles.subtitle}>Final Results</Text>
          </View>

          {/* Players List */}
          <ScrollView
            style={styles.playersList}
            showsVerticalScrollIndicator={false}
          >
            {sortedPlayers.map((player, index) => {
              const playerURL = playerURLArray?.find((p) => p.id === player.id);
              const isSpectator = player.lives === 0 || player.isEliminated;

              return (
                <View
                  key={player.id}
                  style={[
                    styles.playerCard,
                    { backgroundColor: getRankColor(player.rank) + "20" },
                    player.rank === 1 && styles.winnerCard,
                  ]}
                >
                  {/* Rank */}
                  <View style={styles.rankContainer}>
                    <Text style={styles.rankEmoji}>
                      {getRankEmoji(player.rank)}
                    </Text>
                    <Text style={styles.rankText}>#{player.rank}</Text>
                  </View>

                  {/* Player Info */}
                  <View style={styles.playerInfo}>
                    {/* Avatar */}
                    <View
                      style={[
                        styles.avatarContainer,
                        { borderColor: player.team },
                      ]}
                    >
                      {playerURL?.url ? (
                        <Image
                          source={{ uri: playerURL.url }}
                          style={styles.avatar}
                        />
                      ) : (
                        <View
                          style={[
                            styles.avatarPlaceholder,
                            { backgroundColor: player.team },
                          ]}
                        >
                          <Text style={styles.avatarText}>
                            {player.username?.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Name and Team */}
                    <View style={styles.nameContainer}>
                      <Text style={styles.playerName}>{player.username}</Text>
                      <Text style={[styles.teamText, { color: player.team }]}>
                        Team {player.team}
                      </Text>
                    </View>
                  </View>

                  {/* Stats */}
                  <View style={styles.statsContainer}>
                    <View style={styles.pointsContainer}>
                      <Text style={styles.pointsNumber}>
                        {player.points || 0}
                      </Text>
                      <Text style={styles.pointsLabel}>POINTS</Text>
                    </View>

                    <View style={styles.livesContainer}>
                      {isSpectator ? (
                        <View style={styles.spectatorBadge}>
                          <Text style={styles.spectatorText}>SPECTATOR</Text>
                        </View>
                      ) : (
                        <View style={styles.livesBadge}>
                          <Text style={styles.livesText}>
                            Lives: {player.lives}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Return Button */}
          <TouchableOpacity style={styles.returnButton} onPress={onClose}>
            <Text style={styles.returnButtonText}>RETURN TO LOBBY</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: screenWidth * 0.9,
    maxHeight: "85%",
    backgroundColor: "#1F2937",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FF6B6B",
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 18,
    color: "#9CA3AF",
    marginTop: 5,
  },
  playersList: {
    maxHeight: 400,
  },
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#374151",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#4B5563",
  },
  winnerCard: {
    borderColor: "#FFD700",
    borderWidth: 2,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  rankContainer: {
    alignItems: "center",
    marginRight: 12,
    minWidth: 50,
  },
  rankEmoji: {
    fontSize: 24,
  },
  rankText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#E5E7EB",
  },
  playerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    overflow: "hidden",
    marginRight: 12,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  nameContainer: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#F3F4F6",
  },
  teamText: {
    fontSize: 12,
    marginTop: 2,
    textTransform: "uppercase",
  },
  statsContainer: {
    alignItems: "flex-end",
  },
  pointsContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  pointsNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#10B981",
  },
  pointsLabel: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  livesContainer: {
    alignItems: "center",
  },
  spectatorBadge: {
    backgroundColor: "#6B7280",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  spectatorText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "white",
  },
  livesBadge: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  livesText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "white",
  },
  returnButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 20,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  returnButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 1,
  },
});
