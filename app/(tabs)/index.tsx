import { useContext, useState, useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Text from '@/components/Text';
import PageWrapper from '@/components/PageWrapper';
import Button from '@/components/Button';
import { AuthContext } from '@/contexts/AuthContext';
import MultiselectInput from '@/components/MultiSelectInput';
import TextInput from '@/components/TextInput';

export default function HomeScreen() {
  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error('AuthContext must be used within an AuthProvider');
  }
  const { user, loading, error, signUp, signIn } = authContext;
  const router = useRouter();

  return (
    <PageWrapper>
      <ScrollView>
        <Button onPress={() => router.navigate('/new-game')}>
          Go to New Game Screen
        </Button>
        <Text>
          {loading ? 'Loading user...' : user ? `Welcome, ${user.email}` : 'No user found'}
        </Text>
        <MultiselectInput
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
      </ScrollView>
    </PageWrapper>
  );
}
