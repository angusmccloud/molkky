import React, { useState, useMemo, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  HomeScreen,
  NewGameScreen,
  UserScreen,
  RulesScreen,
} from '../screens';
import { colors, lightTheme, darkTheme, typography} from '../styles';
import { Icon, Text } from '../components';
import { AuthModal } from '../containers';
import { ThemeContext } from '../contexts';

const stackNavOptions = {
  headerStyle: {
    backgroundColor: colors.primaryBlue,
    borderBottomWidth: 0,
    shadowOffset: { height: 0, width: 0 },
  },
  headerTintColor: colors.white,
};

const HomeStack = createNativeStackNavigator();
const UserStack = createNativeStackNavigator();
const RulesStack = createNativeStackNavigator();

const HomeStackScreen = () => {
  return (
    <HomeStack.Navigator screenOptions={stackNavOptions}>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ headerRight: () => <AuthModal /> }} />
      <HomeStack.Screen name="New Game" component={NewGameScreen} />
    </HomeStack.Navigator>
  );
}

const UserStackScreen = () => {
  return (
    <UserStack.Navigator screenOptions={stackNavOptions}>
      <UserStack.Screen name="User" component={UserScreen} />
    </UserStack.Navigator>
  );
}

const RulesStackScreen = () => {
  return (
    <RulesStack.Navigator screenOptions={stackNavOptions}>
      <RulesStack.Screen name="Rules" component={RulesScreen} />
    </RulesStack.Navigator>
  );
}

const Tab = createBottomTabNavigator();

const Navigation = () => {
  const [isThemeDark, setIsThemeDark] = useState(false);
  const theme = isThemeDark ? darkTheme : lightTheme;

  const toggleTheme = useCallback(() => {
    return setIsThemeDark(!isThemeDark);
  }, [isThemeDark]);

  const preferences = useMemo(
    () => ({
      toggleTheme,
      isThemeDark,
    }),
    [toggleTheme, isThemeDark]
  );

  return (
    <ThemeContext.Provider value={preferences}>
      <PaperProvider theme={theme}>
        <NavigationContainer theme={theme}>
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
      </PaperProvider>
    </ThemeContext.Provider>
  );
}

export default Navigation;
