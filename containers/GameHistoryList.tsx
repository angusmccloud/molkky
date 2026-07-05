import React, { useState, useCallback } from 'react';
import { View, FlatList, Pressable, StyleSheet } from 'react-native';
import { Menu, Divider, useTheme } from 'react-native-paper';
import Text, { TextSizes } from '@/components/Text';
import IconButton from '@/components/IconButton';
import useBottomContentInset from '@/hooks/useBottomContentInset';
import typography from '@/constants/Typography';
import type { Game } from '@/services/localStore';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const firstNameOf = (name?: string): string => {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'Someone';
  return trimmed.split(/\s+/)[0];
};

// "June 5" for the current year, "June 5, 2024" for any other year.
const formatPlayedDate = (iso?: string): string => {
  const ms = Date.parse(iso || '');
  if (Number.isNaN(ms)) return '';
  const d = new Date(ms);
  const label = `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
  const currentYear = new Date().getFullYear();
  return d.getFullYear() === currentYear ? label : `${label}, ${d.getFullYear()}`;
};

type GameInfo = { title: string; subtitle: string };

const gameInfo = (game: Game): GameInfo => {
  if (game.gameStatus === 'finished') {
    const winner = game.players.find((p) => p.id === game.winningPlayerId);
    const others = game.players
      .filter((p) => p.id !== game.winningPlayerId)
      .map((p) => firstNameOf(p.name));
    return {
      title: `${firstNameOf(winner?.name)} Won!`,
      subtitle: others.length ? `Beat: ${others.join(', ')}` : '',
    };
  }
  return {
    title: 'Game in Progress',
    subtitle: game.players.map((p) => firstNameOf(p.name)).join(', '),
  };
};

interface ItemProps {
  game: Game;
  onViewGame: (game: Game) => void;
  onPlayAgain: (game: Game) => void;
  onDeleteGame: (game: Game) => void;
}

const GameListItem = ({ game, onViewGame, onPlayAgain, onDeleteGame }: ItemProps) => {
  const theme = useTheme();
  const styles = useStyles(theme);
  const [menuVisible, setMenuVisible] = useState(false);

  const closeMenu = useCallback(() => setMenuVisible(false), []);
  const { title, subtitle } = gameInfo(game);

  return (
    <View style={styles.row}>
      <Pressable
        style={styles.rowMain}
        onPress={() => onViewGame(game)}
        accessibilityRole="button"
        accessibilityLabel={`Open game: ${title}`}
      >
        <View style={styles.info}>
          <Text size={TextSizes.M} bold numberOfLines={1} color={theme.colors.onBackground}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              size={TextSizes.S}
              numberOfLines={1}
              color={theme.colors.onSurfaceVariant}
              style={styles.subtitle}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Text
          size={TextSizes.S}
          color={theme.colors.onSurfaceVariant}
          style={styles.date}
        >
          {formatPlayedDate(game.createdAt)}
        </Text>
      </Pressable>
      <Menu
        visible={menuVisible}
        onDismiss={closeMenu}
        anchor={
          <IconButton
            icon="dots-horizontal"
            mode="standard"
            size={typography.fontSizeL}
            onPress={() => setMenuVisible(true)}
            iconColor={theme.colors.onBackground}
            accessibilityLabel="Game options"
          />
        }
      >
        <Menu.Item
          leadingIcon="eye"
          onPress={() => {
            closeMenu();
            onViewGame(game);
          }}
          title="View Game"
        />
        <Menu.Item
          leadingIcon="replay"
          onPress={() => {
            closeMenu();
            onPlayAgain(game);
          }}
          title="Play Again"
        />
        <Divider />
        <Menu.Item
          leadingIcon="delete"
          onPress={() => {
            closeMenu();
            onDeleteGame(game);
          }}
          title="Delete Game"
          titleStyle={{ color: theme.colors.error }}
        />
      </Menu>
    </View>
  );
};

interface ListProps {
  games: Game[];
  onViewGame: (game: Game) => void;
  onPlayAgain: (game: Game) => void;
  onDeleteGame: (game: Game) => void;
}

const GameHistoryList = ({ games, onViewGame, onPlayAgain, onDeleteGame }: ListProps) => {
  const theme = useTheme();
  const styles = useStyles(theme);
  // Pad the list past the (iOS-absolute) tab bar and the floating ad banner
  // so the last game isn't hidden behind them.
  const bottomInset = useBottomContentInset();

  // Most recent first.
  const sorted = [...games].sort((a, b) => {
    const ta = Date.parse(a.createdAt || '') || 0;
    const tb = Date.parse(b.createdAt || '') || 0;
    return tb - ta;
  });

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={[styles.listContent, { paddingBottom: 4 + bottomInset }]}
      data={sorted}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <Divider />}
      renderItem={({ item }) => (
        <GameListItem
          game={item}
          onViewGame={onViewGame}
          onPlayAgain={onPlayAgain}
          onDeleteGame={onDeleteGame}
        />
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text size={TextSizes.M} color={theme.colors.onSurfaceVariant}>
            No games yet. Start a new game to get going!
          </Text>
        </View>
      }
    />
  );
};

export default GameHistoryList;

const useStyles = (theme: any) =>
  StyleSheet.create({
    list: {
      width: '100%',
    },
    listContent: {
      paddingTop: 4,
      flexGrow: 1,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 16,
      paddingRight: 4,
    },
    rowMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    info: {
      flex: 1,
      paddingRight: 8,
    },
    subtitle: {
      marginTop: 2,
    },
    date: {
      marginLeft: 8,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
  });
