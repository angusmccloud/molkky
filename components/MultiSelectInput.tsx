import React, { useState } from 'react';
import { View, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import { MultiSelect, IMultiSelectRef } from 'react-native-element-dropdown';
import Text, { TextSizes } from '@/components/Text';
import typography from '@/constants/Typography';
import useReusableStyles from '@/hooks/useReusableStyles';

interface MultiselectInputProps extends IMultiSelectRef {
  values: string[];
  setValues: (values: string[]) => void;
  data: any[];
  placeholder?: string;
  focusPlaceholder?: string;
  valueField?: string;
  label?: string;
  visibleSelectedItem?: boolean;
}

const MultiselectInput = (props: MultiselectInputProps) => {
  const { values, setValues, data, placeholder, focusPlaceholder, valueField, label, visibleSelectedItem = false, ...restOfProps } = props;
  const theme = useTheme();
  const styles = useStyles(theme);
  const [isFocus, setIsFocus] = useState(false);

  const renderLabel = (label) => {
    if (isFocus) {
      return (
        <View style={styles.dropdownLabelWrapper}>
          <Text style={[isFocus && { color: theme.colors.primary }]} size={TextSizes.XS}>
            {label}
          </Text>
        </View>
      );
    }
    return null;
  };
  return (
    <View style={styles.dropdownWrapper}>
      {/* {renderLabel(placeholder)} */}
      <MultiSelect
        style={[styles.dropdown, isFocus && { borderColor: theme.colors.primary }]}
        placeholderStyle={styles.dropdownPlaceholder}
        selectedTextStyle={styles.dropdownSelectedText}
        itemTextStyle={styles.dropdownItemText}
        iconStyle={styles.dropdownIcon}
        data={data}
        placeholder={isFocus ? focusPlaceholder : placeholder}
        labelField="label"
        valueField={valueField || "value"}
        value={values}
        onFocus={() => setIsFocus(true)}
        onBlur={() => setIsFocus(false)}
        onChange={item => {
          setValues(item);
        }}
        inputSearchStyle={styles.searchFieldWrapper}
        containerStyle={styles.searchContainerStyle}
        visibleSelectedItem={visibleSelectedItem}
        {...restOfProps}
      />
    </View>
  );
};

export default MultiselectInput;

const useStyles = theme => {
  const reusableStyles = useReusableStyles(theme);
  return StyleSheet.create({
    ...reusableStyles,
    dropdown: {
      height: 50,
      borderColor: theme.colors.outline,
      borderWidth: 1,
      borderRadius: 3,
      paddingHorizontal: 8,
      marginBottom: -5,
    },
    dropdownLabelWrapper: {
      position: 'absolute',
      backgroundColor: theme.colors.background,
      left: 22,
      top: 7,
      zIndex: 999,
      paddingHorizontal: 8,
    },
    dropdownItemText: {
      color: 'red',
      fontSize: typography.fontSizeS,
    },
    dropdownPlaceholder: {
      fontSize: typography.fontSizeS,
      color: theme.colors.outline,
    },
    dropdownSelectedText: {
      fontSize: typography.fontSizeS,
      color: theme.colors.onBackground,
    },
    dropdownIcon: {
      width: typography.fontSizeL,
      height: typography.fontSizeL,
    },
    dropdownWrapper: {
      backgroundColor: theme.colors.background,
      // padding: typography.fontSizeS,
    },
    searchFieldWrapper: {
      backgroundColor: theme.colors.background,
      color: theme.colors.onBackground,
    },
    searchContainerStyle: {
      backgroundColor: theme.colors.background,
      color: theme.colors.onBackground,
    },
  });
};