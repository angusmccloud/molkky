import React from 'react';
import { View, ScrollView, Image } from 'react-native';
import { Text, Divider } from '../../components';
import { calcDimensions } from '../../styles';
import styles from './RulesScreenStyles';
const formation = require('../../assets/images/formation.png');

const imageDimensions = {
  width: 2109,
  height: 1904
};

const RulesScreen = ({ navigation, route }) => {
  const dimensions = calcDimensions();
  const { width, height } = dimensions;;

  return (
    <View style={styles.pageWrapper}>
      <ScrollView>
        <View style={{ padding: 10, flexDirection: 'row' }}>
          <View style={{ flex: 2 }}>
            <Text size='XL' bold>
              Setup:
            </Text>
            <Text size='L'>
              - The numbered pins are placed in a formation (see image)
            </Text>
            <Text size='L'>
              - A throwing line is drawn about 3-4 metres away from the pin formation
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Image source={formation} style={{ width: width * 0.3, height: (imageDimensions.height / imageDimensions.width) * (width * 0.3) }} />
          </View>
        </View>
        <View style={{ paddingTop: 5, paddingBottom: 5, width: '100%' }}>
          <Divider />
        </View>
        <View style={{ padding: 10, paddingTop: 0 }}>
          <Text size='XL' bold>
            Game Play:
          </Text>
          <Text size='L'>
            - Take turns in knocking down numbered pins with the Mölkky
          </Text>
          <Text size='L'>
            - After each throw, the pins are stood up again in the location where they landed
          </Text>
          <Text size='L'>
            - The first player to reach exactly 50 points wins the game
          </Text>
        </View>
        <View style={{ paddingTop: 5, paddingBottom: 5, width: '100%' }}>
          <Divider />
        </View>
        <View style={{ padding: 10, paddingTop: 0 }}>
          <Text size='XL' bold>
            Scoring System:
          </Text>
          <Text size='L'>
            - Knocking over one pin scores the amount of points that is marked on the respective pin
          </Text>
          <Text size='L'>
            - Knocking over two or more pins scores the number of pins that were knocked over
          </Text>
          <Text size='L'>
            - A player that exceeds the score of 50, drops back to 25
          </Text>
          <Text size='L'>
            - OPTIONAL: A player that misses all of the target pins three times in a row is eliminated
          </Text>
          <Text size='L'>
            - OPTIONAL: A player that goes over 50 three times is eliminated
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

export default RulesScreen;