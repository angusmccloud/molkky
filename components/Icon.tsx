import React from "react";
import { Image } from "react-native";
import { Ionicons, FontAwesome5, FontAwesome6, FontAwesome, MaterialCommunityIcons, EvilIcons, SimpleLineIcons, MaterialIcons, AntDesign } from '@expo/vector-icons';
import { useTheme } from "react-native-paper";

interface IconProps {
  name: string;
  size?: number;
  color?: string;
}

const Icon = (props: IconProps) => {
  const theme = useTheme();
  const { name, size = 32, color = theme.colors.primary, ...restOfProps } = props;
  let iconName = allIcons.find((icon) => icon.iconName === name);
  if (!iconName) {
    // Default to the friends icon if we get one that doesn't exist
    iconName = allIcons.find((icon) => icon.iconName === 'friends');
  }

  if(iconName.type === 'Image') {
    return (
      <Image source={iconName.source} style={{width: size, height: size}} resizeMode="contain" resizeMethod='scale' />
    )
  } else if (iconName.type === 'Ionicons') {
    return (
      <Ionicons name={iconName.name} size={size} color={color} {...restOfProps} />
    );
  } else if (iconName.type === 'FontAwesome5') {
    return (
      <FontAwesome5 name={iconName.name} size={size} color={color} {...restOfProps} />
    );
  } else if (iconName.type === 'FontAwesome6') {
    return (
      <FontAwesome6 name={iconName.name} size={size} color={color} {...restOfProps} />
    );
  } else if (iconName.type === 'MaterialCommunityIcons') {
    return (
      <MaterialCommunityIcons name={iconName.name} size={size} color={color} {...restOfProps} />
    );
  } else if (iconName.type === 'EvilIcons') {
    return (
      <EvilIcons name={iconName.name} size={size} color={color} {...restOfProps} />
    );
  } else if (iconName.type === 'SimpleLineIcons') {
    return (
      <SimpleLineIcons name={iconName.name} size={size} color={color} {...restOfProps} />
    );
  } else if (iconName.type === 'MaterialIcons') {
    return (
      <MaterialIcons name={iconName.name} size={size} color={color} {...restOfProps} />
    );
  } else if (iconName.type === 'AntDesign') {
    return (
      <AntDesign name={iconName.name} size={size} color={color} {...restOfProps} />
    );
  } else if (iconName.type === 'FontAwesome') {
    return (
      <FontAwesome name={iconName.name} size={size} color={color} {...restOfProps} />
    );
  }

  // ...And just in case that didn't work for some reason, return null
  return null;
};

export default Icon;

// As we need more icons, add the conversion from friendly-names to Ionicons names here
// Controlling by user-friendly names so if we switch from Ionicons to Awesome, etc... We just change this file
// https://icons.expo.fyi/
export const allIcons = [
  // Model for Icon object:
  // Type = Image, Ionicons, FontAwesome5, MaterialCommunityIcons, or another VectorIcon library
  // Name = name of icon from library
  // IconName = name passed to the component within our app (aka we call it `settings` instead of `cog` vs. `gear`, etc...)
  // Label = user-friendly name for icon when shown in a drop-down
  { type: "Ionicons", name: "home", iconName: "home", label: "Home" },
  { type: "MaterialIcons", name: "search", iconName: "search", label: "Search" },
  { type: "MaterialIcons", name: "location-on", iconName: "places", label: "Location" },
  { type: "MaterialCommunityIcons", name: "stairs", iconName: "cellar", label: "cellar" },
  { type: "MaterialCommunityIcons", name: "size-xl", iconName: "x", label: "x" },
  { type: "MaterialCommunityIcons", name: "size-xxl", iconName: "xx", label: "xx" },
  { type: "MaterialCommunityIcons", name: "size-xxxl", iconName: "xxx", label: "xxx" },
  { type: 'FontAwesome5', name: 'user-friends', iconName: 'friends', label: 'Friends' },
  { type: "MaterialIcons", name: "family-restroom", iconName: "family", label: "Family" },
  { type: "FontAwesome5", name: "cocktail", iconName: "newCouples", label: "New Couples" },
  { type: "Ionicons", name: "heart", iconName: "loveLife", label: "Love Life" },
  { type: "MaterialIcons", name: "auto-graph", iconName: "futurePlanning", label: "Future Planning" },
  { type: "MaterialIcons", name: "travel-explore", iconName: "travelAndAdventure", label: "Travel and Adventure" },
  { type: "FontAwesome5", name: 'people-arrows', iconName: 'longTermCouples', label: 'Long Term Couples' },
  { type: "FontAwesome", name: "intersex", iconName: "sex", label: "Sex" },
  { type: "Ionicons", name: "chatbubbles", iconName: "chat", label: "Chat" },
  { type: "MaterialCommunityIcons", name: "rabbit", iconName: "rabbitHole", label: "Rabbit Hole" },
  { type: "SimpleLineIcons", name: "share", iconName: "share", label: "Share" },
  { type: "FontAwesome", name: "thumbs-down", iconName: "thumbsDown", label: "Thumbs Down" },
  { type: "FontAwesome", name: "thumbs-o-down", iconName: "thumbsDownOutline", label: "Thumbs Down Outline" },
  { type: "FontAwesome6", name: "children", iconName: "kids", label: "Kids" },
  { type: "FontAwesome5", name: "hammer", iconName: "iceBreakers", label: "Ice Breakers" },
  
  { type: "EvilIcons", name: "calendar", iconName: "calendar", label: "Calendar" },
  { type: "Ionicons", name: "map", iconName: "map", label: "Map" },
  { type: "Ionicons", name: "trophy-outline", iconName: "standings", label: "Standings" },
  { type: "EvilIcons", name: "bell", iconName: "notifications", label: "Notifications" },
  { type: "FontAwesome5", name: "info-circle", iconName: "info", label: "Info" },
  { type: "Ionicons", name: "person-circle", iconName: "user", label: "User" },
  { type: "EvilIcons", name: "plus", iconName: "addItem", label: "Add Item" },
  { type: "AntDesign", name: "edit", iconName: "edit", label: "Edit" },
  { type: "Ionicons", name: "heart-outline", iconName: "heartOutline", label: "Heart Outline" },
  { type: "Ionicons", name: "heart", iconName: "heart", label: "Heart" },
  { type: "SimpleLineIcons", name: "bubble", iconName: "comment", label: "Comment" },
  { type: "Ionicons", name: "checkmark-circle-outline", iconName: "check", label: "Check" },
  { type: "Ionicons", name: "image-outline", iconName: "picture", label: "Picture" },
  { type: "EvilIcons", name: "camera", iconName: "camera", label: "Camera" },
  { type: "Ionicons", name: "trash-outline", iconName: "trash", label: "Trash" },
  { type: "Ionicons", name: "close-outline", iconName: "close", label: "Close" },
  { type: "Ionicons", name: "checkmark-outline", iconName: "checkmark", label: "Checkmark" },
  { type: "EvilIcons", name: "gear", iconName: "settings", label: "Settings" },
  { type: "Ionicons", name: "ellipse", iconName: "circle", label: "Circle" },
  { type: "Ionicons", name: "chevron-down-outline", iconName: "expanded", label: "Expanded" },
  { type: "Ionicons", name: "chevron-forward-outline", iconName: "collapsed", label: "Collapsed" },
  { type: "Ionicons", name: "beer", iconName: "beer", label: "Beer" },
  { type: "Ionicons", name: "medal", iconName: "medal", label: "Medal" },
  { type: "Ionicons", name: "pint", iconName: "pint", label: "Pint" },
  { type: "Ionicons", name: "ribbon", iconName: "ribbon", label: "Ribbon" },
  { type: "MaterialCommunityIcons", name: "magnify-expand", iconName: "expand", label: "Expand" },
  { type: "Ionicons", name: "shuffle-sharp", iconName: "shuffle", label: "Shuffle" },
  { type: "MaterialIcons", name: "groups", iconName: "teams", label: "Teams" },
  { type: "FontAwesome5", name: 'save', iconName: 'save', label: 'Save' },
  { type: 'Ionicons', name: 'alert-circle-outline', iconName: 'alert', label: 'Alert' },
  { type: 'MaterialCommunityIcons', name: 'new-box', iconName: 'new', label: 'New' },
  { type: 'FontAwesome5', name: 'archive', iconName: 'archive', label: 'Archive' },
  { type: "MaterialIcons", name: "delete-forever", iconName: "delete", label: "Delete" },
  { type: "MaterialIcons", name: "mark-email-read", iconName: "markAsRead", label: "Mark As Read" },
  { type: "FontAwesome", name: "ban", iconName: "unrate", label: "Unrate a Beer" },
  { type: "FontAwesome", name: "star-o", iconName: "unratedStar", label: "Unrated Rated Star" },
  { type: "FontAwesome", name: "star", iconName: "ratedStar", label: "Fully Rated Star" },
  { type: "FontAwesome", name: "star-half-o", iconName: "halfRatedStar", label: "Half Rated Star" },
  { type: "FontAwesome", name: "check-square-o", iconName: "ratedBeer", label: "Rated This Beer" },
  { type: "FontAwesome5", name: "eye", iconName: "onWatchList", label: "Watching for this Beer" },
  { type: "Ionicons", name: "book-outline", iconName: "rules", label: "Rules" },
];
