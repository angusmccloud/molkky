import { DataStore } from 'aws-amplify';
import awsExports from '../../aws-exports';
DataStore.configure(awsExports);

export default DataStore;