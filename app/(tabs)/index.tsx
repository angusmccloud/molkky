import { useContext } from 'react';
import Text from '@/components/Text';
import { PageWrapper } from '@/components/PageWrapper';
import Avatar from '@/components/Avatar';
import Button from '@/components/Button';
import Divider from '@/components/Divider';
import IconButton from '@/components/IconButton';
import TextInput from '@/components/TextInput';
import ActivityIndicator from '@/components/ActivityIndicator';
import { AuthContext } from '@/contexts/AuthContext'; // Import AuthContext and its type
import { ScrollView } from 'react-native';

export default function HomeScreen() {
  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error('AuthContext must be used within an AuthProvider');
  }

  const { user, loading, error, signUp, signIn } = authContext; // Safely destructure context values

  return (
    <PageWrapper>
      <ScrollView>
        <Text>Home Page Placeholder</Text>
        <Avatar name={user ? user.email : 'Guest'} />
        <Divider />
        <Button onPress={() => signUp('connort@gmail.com', 'abc123!@#')}>
          Create Test Account
        </Button>
        <Button onPress={() => signIn('connort@gmail.com', 'abc123!@#')}>
          Sign In Test Account
        </Button>
        <IconButton
          icon='home'
          onPress={() => alert('Icon Button Pressed!')}
          size={24}
        />
        <ActivityIndicator size={50} />
        <TextInput
          placeholder='Type something...'
          label={'Input Label'}
          onChangeText={(text) => console.log(text)}
          style={{ margin: 10 }}
        />
        {error && <Text style={{ color: 'red' }}>{error}</Text>} {/* Display error */}
        <Text>
          {loading ? 'Loading user...' : user ? `Welcome, ${user.email}` : 'No user found'}
        </Text>
        {user && (
          <>
            <Divider />
            <Text>
              {JSON.stringify(user, null, 2)}
            </Text>
          </>
        )}
      </ScrollView>
    </PageWrapper>
  );
}
