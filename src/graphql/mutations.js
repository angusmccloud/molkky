/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createGames = /* GraphQL */ `
  mutation CreateGames(
    $input: CreateGamesInput!
    $condition: ModelGamesConditionInput
  ) {
    createGames(input: $input, condition: $condition) {
      id
      owner
      players
      scores
      gameStatus
      rules
      turns
      whichPlayersTurn
      gameRound
      winningPlayerId
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
    }
  }
`;
export const updateGames = /* GraphQL */ `
  mutation UpdateGames(
    $input: UpdateGamesInput!
    $condition: ModelGamesConditionInput
  ) {
    updateGames(input: $input, condition: $condition) {
      id
      owner
      players
      scores
      gameStatus
      rules
      turns
      whichPlayersTurn
      gameRound
      winningPlayerId
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
    }
  }
`;
export const deleteGames = /* GraphQL */ `
  mutation DeleteGames(
    $input: DeleteGamesInput!
    $condition: ModelGamesConditionInput
  ) {
    deleteGames(input: $input, condition: $condition) {
      id
      owner
      players
      scores
      gameStatus
      rules
      turns
      whichPlayersTurn
      gameRound
      winningPlayerId
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
    }
  }
`;
export const createUsers = /* GraphQL */ `
  mutation CreateUsers(
    $input: CreateUsersInput!
    $condition: ModelUsersConditionInput
  ) {
    createUsers(input: $input, condition: $condition) {
      id
      owner
      email
      friends
      gameHistory
      stats
      image
      imageThumbnail
      name
      turnHistory
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
    }
  }
`;
export const updateUsers = /* GraphQL */ `
  mutation UpdateUsers(
    $input: UpdateUsersInput!
    $condition: ModelUsersConditionInput
  ) {
    updateUsers(input: $input, condition: $condition) {
      id
      owner
      email
      friends
      gameHistory
      stats
      image
      imageThumbnail
      name
      turnHistory
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
    }
  }
`;
export const deleteUsers = /* GraphQL */ `
  mutation DeleteUsers(
    $input: DeleteUsersInput!
    $condition: ModelUsersConditionInput
  ) {
    deleteUsers(input: $input, condition: $condition) {
      id
      owner
      email
      friends
      gameHistory
      stats
      image
      imageThumbnail
      name
      turnHistory
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
    }
  }
`;
