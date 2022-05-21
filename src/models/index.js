// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { Games, Users } = initSchema(schema);

export {
  Games,
  Users
};