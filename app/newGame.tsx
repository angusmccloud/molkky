import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { createGame } from '@/services/games';

const NewGameScreen = () => {
  const [gameName, setGameName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateGame = async () => {
    if (!gameName.trim()) {
      setError('Game name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const gameData = {
        name: gameName,
        createdAt: new Date().toISOString(),
        players: [],
        gameStatus: 'inProgress',
      };
      await createGame(gameData);
    } catch (err) {
      setError('Failed to create game. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create a New Game</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter game name"
        value={gameName}
        onChangeText={setGameName}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button title={loading ? 'Creating...' : 'Create Game'} onPress={handleCreateGame} disabled={loading} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 16,
  },
  error: {
    color: 'red',
    marginBottom: 16,
  },
});

export default NewGameScreen;