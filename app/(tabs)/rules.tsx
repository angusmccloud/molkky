import React from 'react';
import { View, ScrollView, Image } from 'react-native';
import Text, { TextSizes } from '@/components/Text';
import Divider from '@/components/Divider';
import PageWrapper from '@/components/PageWrapper';
import useDeviceDimensions from '@/hooks/useDeviceDimensions';
const formation = require('@/assets/images/formation.png');

// Hardcoded for Formation file dimensions
const imageDimensions = {
  width: 2109,
  height: 1904
};

export default function RulesScreen() {
  const dimensions = useDeviceDimensions();
  const { width, height } = dimensions;

  return (
    <PageWrapper>
      <ScrollView>
        <View style={{ padding: 10, flexDirection: 'row' }}>
          <View style={{ flex: 2 }}>
            <Text size={TextSizes.XL} bold>
              Setup:
            </Text>
            <Text size={TextSizes.L}>
              - The numbered pins are placed in a formation (see image)
            </Text>
            <Text size={TextSizes.L}>
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
          <Text size={TextSizes.XL} bold>
            Game Play:
          </Text>
          <Text size={TextSizes.L}>
            - Take turns in knocking down numbered pins with the Mölkky
          </Text>
          <Text size={TextSizes.L}>
            - After each throw, the pins are stood up again in the location where they landed
          </Text>
          <Text size={TextSizes.L}>
            - The first player to reach exactly 50 points wins the game
          </Text>
        </View>
        <View style={{ paddingTop: 5, paddingBottom: 5, width: '100%' }}>
          <Divider />
        </View>
        <View style={{ padding: 10, paddingTop: 0 }}>
          <Text size={TextSizes.XL} bold>
            Scoring System:
          </Text>
          <Text size={TextSizes.L}>
            - Knocking over one pin scores the amount of points that is marked on the respective pin
          </Text>
          <Text size={TextSizes.L}>
            - Knocking over two or more pins scores the number of pins that were knocked over
          </Text>
          <Text size={TextSizes.L}>
            - A player that exceeds the score of 50, drops back to 25
          </Text>
          <Text size={TextSizes.L}>
            - OPTIONAL: A player that misses all of the pins three times in a row is eliminated
          </Text>
          <Text size={TextSizes.L}>
            - OPTIONAL: A player that goes over 50 three times is eliminated
          </Text>
        </View>
      </ScrollView>
    </PageWrapper>
  );
}
