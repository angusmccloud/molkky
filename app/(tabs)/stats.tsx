import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import Text from '@/components/Text';
import Avatar from '@/components/Avatar';
import Divider from '@/components/Divider';
import PageWrapper from '@/components/PageWrapper';
import { fetchGamesByUser } from '@/services/firebaseDatabase';

const StatsScreen = () => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   const loadStats = async () => {
  //     try {
  //       // Replace with actual user ID or auth context
  //       const userId = 'currentUserId';
  //       fetchGamesByUser(userId, (games) => {
  //         const playerStats = games.map(([gameId, game]) => {
  //           const player = game.players.find(p => p.id === userId);
  //           return {
  //             gameId,
  //             playerName: player.name,
  //             score: game.scores.find(s => s.playerId === userId)?.score || 0,
  //             won: game.winningPlayerId === userId,
  //           };
  //         });
  //         setStats(playerStats);
  //       });
  //     } catch (error) {
  //       console.log('-- Error loading stats: --', error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   loadStats();
  // }, []);

  const renderItem = ({ item }) => (
    <View style={styles.statItem}>
      <Avatar name={item.playerName} size={40} />
      <View style={styles.statDetails}>
        <Text bold>{item.playerName}</Text>
        <Text>Score: {item.score}</Text>
        <Text>{item.won ? 'Winner' : 'Participant'}</Text>
      </View>
    </View>
  );

  return (
    <PageWrapper>
      {loading ? (
        <Text>Loading stats...</Text>
      ) : (
        <FlatList
          data={stats}
          keyExtractor={(item) => item.gameId}
          renderItem={renderItem}
          ItemSeparatorComponent={Divider}
        />
      )}
    </PageWrapper>
  );
};

const styles = StyleSheet.create({
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  statDetails: {
    marginLeft: 16,
  },
});

export default StatsScreen;