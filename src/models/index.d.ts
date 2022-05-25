import { ModelInit, MutableModel, PersistentModelConstructor } from "@aws-amplify/datastore";





type GamesMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

type UsersMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

export declare class Games {
  readonly id: string;
  readonly owner?: string | null;
  readonly players?: string[] | null;
  readonly scores?: (string | null)[] | null;
  readonly gameStatus: string;
  readonly rules?: string | null;
  readonly turns?: (string | null)[] | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  constructor(init: ModelInit<Games, GamesMetaData>);
  static copyOf(source: Games, mutator: (draft: MutableModel<Games, GamesMetaData>) => MutableModel<Games, GamesMetaData> | void): Games;
}

export declare class Users {
  readonly id: string;
  readonly owner?: string | null;
  readonly email: string;
  readonly friends?: (string | null)[] | null;
  readonly gameHistory?: (string | null)[] | null;
  readonly stats?: string | null;
  readonly image?: string | null;
  readonly imageThumbnail?: string | null;
  readonly name: string;
  readonly turnHistory?: (string | null)[] | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  constructor(init: ModelInit<Users, UsersMetaData>);
  static copyOf(source: Users, mutator: (draft: MutableModel<Users, UsersMetaData>) => MutableModel<Users, UsersMetaData> | void): Users;
}