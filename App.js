import 'react-native-gesture-handler';
import App from './src';
import { Amplify, AuthModeStrategyType } from 'aws-amplify';
import awsconfig from './src/aws-exports';
Amplify.configure({
  ...awsconfig,
  DataStore: {
    authModeStrategyType: AuthModeStrategyType.MULTI_AUTH
  }
});


export default App;
