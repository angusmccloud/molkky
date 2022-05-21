import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  HomeScreen,
  UserScreen,
  RulesScreen,
} from '../screens';
import { colors } from '../styles';
import { Icon, Text } from '../components';
import { AuthModal } from '../containers';

const stackNavOptions = {
  headerStyle: {
    backgroundColor: colors.primaryBlue,
    borderBottomWidth: 0,
    shadowOffset: { height: 0, width: 0 },
  },
};

const HomeStack = createNativeStackNavigator();
const UserStack = createNativeStackNavigator();
const RulesStack = createNativeStackNavigator();

const HomeStackScreen = () => {
  return (
    <HomeStack.Navigator screenOptions={stackNavOptions}>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ headerRight: () => <AuthModal />, headerTitle: (props) => renderHeaderTitle(props)}} />
    </HomeStack.Navigator>
  );
}

const UserStackScreen = () => {
  return (
    <UserStack.Navigator screenOptions={stackNavOptions}>
      <UserStack.Screen name="User" component={UserScreen} options={{ headerTitle: (props) => renderHeaderTitle(props)}} />
    </UserStack.Navigator>
  );
}

const RulesStackScreen = () => {
  return (
    <RulesStack.Navigator screenOptions={stackNavOptions}>
      <RulesStack.Screen name="Rules" component={RulesScreen} options={{ headerTitle: (props) => renderHeaderTitle(props)}} />
    </RulesStack.Navigator>
  );
}

const Tab = createBottomTabNavigator();

const Navigation = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        options={{
          activeTintColor: colors.primaryBlue,
        }}
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'HomeStack') {
              iconName = focused ? 'home' : 'homeFocused';
            } else if (route.name === 'UserStack') {
              iconName = focused ? 'user' : 'userFocused';
            } else if (route.name === 'RulesStack') {
              iconName = focused ? 'rules' : 'rulesFocused';
            }
            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: colors.primaryBlue,
          tabBarInactiveTintColor: colors.gray,
        })}
      >
        <Tab.Screen name="HomeStack" component={HomeStackScreen} options={{ headerShown: false, title: 'Home' }} />
        <Tab.Screen name="UserStack" component={UserStackScreen} options={{ headerShown: false, title: 'User' }} />
        <Tab.Screen name="RulesStack" component={RulesStackScreen} options={{ headerShown: false, title: 'Rules' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default Navigation;

const renderHeaderTitle = (props) => {
  const { children } = props;
  return (
    <Text size='L' bold color={colors.white}>{children}</Text>
  )
}