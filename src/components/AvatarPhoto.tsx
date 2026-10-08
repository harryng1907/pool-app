import React from 'react';
import { Image, StyleSheet } from 'react-native';

// Drop inside any round initials avatar: covers the initials when there's a photo.
export const AvatarPhoto: React.FC<{ url?: string | null }> = ({ url }) =>
  url ? <Image source={{ uri: url }} style={styles.photo} accessibilityIgnoresInvertColors /> : null;

const styles = StyleSheet.create({
  photo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
  },
});
