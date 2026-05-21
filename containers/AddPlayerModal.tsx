import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Dropdown } from 'react-native-element-dropdown';
import uuid from 'react-native-uuid';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import Text, { TextSizes } from '@/components/Text';
import TextInput from '@/components/TextInput';
import useReusableStyles from '@/hooks/useReusableStyles';
import typography from '@/constants/Typography';

// END_OF_ORDER sentinel for the rotation dropdown. Using a non-uuid sentinel so
// it can't collide with a real player id.
const END_OF_ORDER = '__end_of_order__';

type Player = { id: string; name: string };

interface AddPlayerModalProps {
  showModal: boolean;
  closeModal: () => void;
  players: Player[];
  whichPlayersTurn: string;
  winningScore: number;
  onAddPlayer: (args: {
    newPlayer: Player;
    insertAfterPlayerId: string | null; // null => end of rotation
    startingScore: number;
  }) => void;
}

const AddPlayerModal = (props: AddPlayerModalProps) => {
  const { showModal, closeModal, players, whichPlayersTurn, winningScore, onAddPlayer } = props;
  const theme = useTheme();
  const styles = useStyles(theme);

  const [name, setName] = useState('');
  const [startingScore, setStartingScore] = useState('0');
  const [insertAfterId, setInsertAfterId] = useState<string>(END_OF_ORDER);
  const [error, setError] = useState<string | null>(null);

  // Reset when reopened
  useEffect(() => {
    if (showModal) {
      setName('');
      setStartingScore('0');
      setInsertAfterId(END_OF_ORDER);
      setError(null);
    }
  }, [showModal]);

  // Build dropdown data: "End of rotation" + "After <Player>" for each current player.
  // We order the "After X" options based on rotation order starting from the
  // current player, so the most contextually relevant options come first.
  const rotationOptions = useMemo(() => {
    const ordered: Player[] = [];
    const tail: Player[] = [];
    let foundCurrent = false;
    players.forEach((p) => {
      if (p.id === whichPlayersTurn || foundCurrent) {
        ordered.push(p);
        foundCurrent = true;
      } else {
        tail.push(p);
      }
    });
    const inRotationOrder = [...ordered, ...tail];
    return [
      { label: 'End of rotation', value: END_OF_ORDER },
      ...inRotationOrder.map((p) => ({ label: `After ${p.name}`, value: p.id })),
    ];
  }, [players, whichPlayersTurn]);

  const trimmedName = name.trim();
  const startingScoreNum = parseInt(startingScore, 10);
  const startingScoreValid =
    startingScore.trim() !== '' &&
    Number.isFinite(startingScoreNum) &&
    startingScoreNum >= 0 &&
    startingScoreNum <= winningScore;
  const duplicateName = players.some(
    (p) => p.name.toLowerCase() === trimmedName.toLowerCase(),
  );
  const canAdd = trimmedName.length > 0 && !duplicateName && startingScoreValid;

  const handleAdd = () => {
    if (!canAdd) {
      if (!trimmedName) {
        setError('Please enter a name.');
      } else if (duplicateName) {
        setError('A player with that name is already in the game.');
      } else if (!startingScoreValid) {
        setError(`Starting score must be between 0 and ${winningScore}.`);
      }
      return;
    }
    const newPlayer: Player = { id: String(uuid.v4()), name: trimmedName };
    onAddPlayer({
      newPlayer,
      insertAfterPlayerId: insertAfterId === END_OF_ORDER ? null : insertAfterId,
      startingScore: startingScoreNum,
    });
    closeModal();
  };

  return (
    <Modal
      isVisible={showModal}
      onBackButtonPress={closeModal}
      onBackdropPress={closeModal}
      avoidKeyboard={true}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={{ padding: 0, margin: 0 }}
    >
      <View style={styles.modalBody}>
        <View style={styles.modalHeader}>
          <View style={{ flex: 1, alignItems: 'flex-start' }}>
            <Button variant="onModalHeader" onPress={closeModal}>
              Cancel
            </Button>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text color={theme.colors.onBackground} bold size={TextSizes.M}>
              Add Player
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Button onPress={handleAdd} disabled={!canAdd} variant="onModalHeader">
              Add
            </Button>
          </View>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" style={{ padding: 10 }}>
          <View style={styles.fieldWrapper}>
            <TextInput
              value={name}
              onChangeText={setName}
              label="Player Name"
              placeholder="Enter player name"
              autoCapitalize="words"
              autoFocus
              returnKeyType="next"
            />
          </View>
          <View style={styles.fieldWrapper}>
            <Text size={TextSizes.XS} style={styles.dropdownLabel}>
              Position in Rotation
            </Text>
            <Dropdown
              style={styles.dropdown}
              placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelectedText}
              itemTextStyle={styles.dropdownItemText}
              iconStyle={styles.dropdownIcon}
              data={rotationOptions}
              labelField="label"
              valueField="value"
              value={insertAfterId}
              onChange={(item) => setInsertAfterId(item.value)}
              placeholder="End of rotation"
              containerStyle={styles.dropdownContainer}
              activeColor={theme.colors.secondaryContainer}
            />
          </View>
          <View style={styles.fieldWrapper}>
            <TextInput
              value={startingScore}
              onChangeText={setStartingScore}
              label="Starting Score"
              placeholder="0"
              keyboardType="number-pad"
              maxLength={3}
              clearButtonMode="while-editing"
            />
            <Text size={TextSizes.XS} style={styles.helperText}>
              {`0 to ${winningScore}`}
            </Text>
          </View>
          {error && (
            <Text color={theme.colors.error} size={TextSizes.S}>
              {error}
            </Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

export default AddPlayerModal;

const useStyles = (theme: any) => {
  const reusableStyles = useReusableStyles(theme);
  return StyleSheet.create({
    ...reusableStyles,
    fieldWrapper: {
      marginBottom: 12,
    },
    helperText: {
      color: theme.colors.onBackground,
      opacity: 0.7,
      marginTop: 4,
      marginLeft: 4,
    },
    dropdownLabel: {
      color: theme.colors.onBackground,
      marginBottom: 4,
      marginLeft: 4,
    },
    dropdown: {
      height: 50,
      borderColor: theme.colors.outline,
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 10,
      backgroundColor: theme.colors.background,
    },
    dropdownContainer: {
      backgroundColor: theme.colors.background,
    },
    dropdownPlaceholder: {
      fontSize: typography.fontSizeM,
      color: theme.colors.outline,
    },
    dropdownSelectedText: {
      fontSize: typography.fontSizeM,
      color: theme.colors.onBackground,
    },
    dropdownItemText: {
      color: theme.colors.onBackground,
      fontSize: typography.fontSizeM,
    },
    dropdownIcon: {
      width: typography.fontSizeL,
      height: typography.fontSizeL,
    },
  });
};
