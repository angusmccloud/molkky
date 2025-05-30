import { useState, useEffect } from 'react';
import Text from '@/components/Text';
import { PageWrapper } from '@/components/PageWrapper';
import Avatar from '@/components/Avatar';
import Button from '@/components/Button';
import Divider from '@/components/Divider';
import IconButton from '@/components/IconButton';
import TextInput from '@/components/TextInput';
import ActivityIndicator from '@/components/ActivityIndicator';
import { signUpNewUser, signInUser, getCurrentUser } from '@/services/auth';

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const loadUser = async () => {
    setLoading(true);
    try {
      const currentUser = await getCurrentUser();
      console.log('Current User:', currentUser);
      // setUser(currentUser);
    } catch (error) {
      console.error('Error fetching current user:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <PageWrapper>
      <Text>Home Page Placeholder</Text>
      <Avatar name='John Doe' />
      <Divider />
      <Button onPress={() => signUpNewUser('connort@gmail.com', 'abc123!@#')}>
        Create Test Account
      </Button>
      <Button onPress={() => signInUser('connort@gmail.com', 'abc123!@#')}>
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
      <Text>
        {loading ? 'Loading user...' : user ? JSON.parse(user) : 'No user found'}
      </Text>
    </PageWrapper>
  );
}
