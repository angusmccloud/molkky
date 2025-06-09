import { useContext, useState, useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Text from '@/components/Text';
import PageWrapper from '@/components/PageWrapper';
import Button from '@/components/Button';
import { AuthContext } from '@/contexts/AuthContext';
import MultiSelectInput from '@/components/MultiSelectInput';
import TextInput from '@/components/TextInput';
import Chip from '@/components/Chip';
import Icon from '@/components/Icon';
import Avatar from '@/components/Avatar';
import typography from '@/constants/Typography';
import { TextSizes } from '@/components/Text';

import { createGame } from '@/services/games';

export default function HomeScreen() {
  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error('AuthContext must be used within an AuthProvider');
  }
  const { user, loading, error, signUp, signIn } = authContext;
  const router = useRouter();

  const createTestGame = async () => {
    try {
      const game = await createGame({"createdAt": "2025-06-09T17:42:07.607Z", "gameRound": 1, "gameStatus": "inProgress", "players": [{"id": "abd312", "name": "Alice Smith"}, {"id": "49bncas", "name": "David Wilson"}, {"id": "ab78f196-dd17-4e75-8ab6-1b5748213b2d", "name": "Connor Tyrrell"}], "rules": {"goBackToScore": 25, "outAfterThreeMisses": false, "outAfterThreeTimesOver": false, "winningScore": 50}, "scores": [{"isOut": false, "isWinner": false, "misses": 0, "playerId": "abd312", "score": 0, "timesOver": 0}, {"isOut": false, "isWinner": false, "misses": 0, "playerId": "49bncas", "score": 0, "timesOver": 0}, {"isOut": false, "isWinner": false, "misses": 0, "playerId": "ab78f196-dd17-4e75-8ab6-1b5748213b2d", "score": 0, "timesOver": 0}], "turns": [], "uid": "W5r4NzqpFBXq3makaJG8cUgC0JZ2", "updatedAt": "2025-06-09T17:42:07.607Z", "whichPlayersTurn": "abd312"});
      console.log('Game created successfully:', game);
    } catch (error) {
      console.error('Error creating game:', error);
    }
  };

  return (
    <PageWrapper>
      <ScrollView>
        <Button onPress={() => router.navigate('/new-game')}>
          Go to New Game Screen
        </Button>
        <Text>
          {loading ? 'Loading user...' : user ? `Welcome, ${user.email}` : 'No user found'}
        </Text>
        <MultiSelectInput
          key={'TestInput'}
          search={true}
          label="Select Options"
          placeholder="Select Options"
          focusPlaceholder="..."
          searchPlaceholder="Search..."
          data={[
            { label: 'Option 1', value: 'option1' },
            { label: 'Option 2', value: 'option2' },
            { label: 'Option 3', value: 'option3' },
          ]}
          values={[]}
          setValues={(values) => console.log('Selected values:', values)}
          valueField="value"
          renderItem={(item) => (
            <View style={{backgroundColor: 'black'}}>
              <Text style={{ padding: 10 }}>{item.label}</Text>
            </View>
          )}
        />
        <TextInput
          label="Email"
          placeholder="Enter your email"
          value=""
          onChangeText={(text) => console.log('Email:', text)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          style={{ marginBottom: 10 }}
        />
        <Chip
          icon={(item) => (
            <Avatar
              name={'Indigo Miller'}
              size={typography.fontSizeXS * 2}
              textSize={TextSizes.S}
              variant="circle"
              absolute={false}
            />
          )}
          closeIcon={() => (
            <Icon
              size={typography.fontSizeXS * 2}
              name={"close"}
            />
          )}
          onClose={() => console.log('Chip closed')}
          >
          Indigo Miller
        </Chip>
        <Button onPress={createTestGame}>
          Create Test Game
        </Button>
      </ScrollView>
    </PageWrapper>
  );
}
