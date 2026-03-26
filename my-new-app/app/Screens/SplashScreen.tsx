import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

/**
 * 🎨 THEME CONFIG
 */
const theme = {
  colors: {
    primaryBg: '#0A1628',
    secondaryBg: '#0D1F3C',
    gold: '#C5A050',
    white: '#FFFFFF',
    mutedWhite: 'rgba(255,255,255,0.75)',
    mutedGold: 'rgba(197, 160, 80, 0.7)',
    line: 'rgba(197, 160, 80, 0.6)',
  },
};

export default function SplashScreen() {
  const navigation = useNavigation<any>();

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.75)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(20)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const dotScale1 = useRef(new Animated.Value(0)).current;
  const dotScale2 = useRef(new Animated.Value(0)).current;
  const dotScale3 = useRef(new Animated.Value(0)).current;
  const bgShift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgShift, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        }),
        Animated.timing(bgShift, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: false,
        }),
      ])
    ).start();

    Animated.sequence([
      Animated.delay(200),

      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),

      Animated.delay(200),

      Animated.timing(lineWidth, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }),

      Animated.delay(100),

      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(taglineY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),

      Animated.delay(200),

      Animated.stagger(120, [
        Animated.spring(dotScale1, { toValue: 1, friction: 5, useNativeDriver: true }),
        Animated.spring(dotScale2, { toValue: 1, friction: 5, useNativeDriver: true }),
        Animated.spring(dotScale3, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setTimeout(() => {
        navigation.replace('Main');
      }, 800);
    });
  }, []);

  const animatedLineStyle = {
    width: lineWidth.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '60%'],
    }),
  };

  const bgColor = bgShift.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.primaryBg, theme.colors.secondaryBg],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primaryBg} />

      <View style={styles.centerContent}>

        {/* Logo */}
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
            alignItems: 'center',
          }}
        >
          <Text style={[styles.brandTop, { color: theme.colors.white }]}>
            DALALI
          </Text>
          <Text style={[styles.brandBottom, { color: theme.colors.gold }]}>
            KIGANJANI
          </Text>
        </Animated.View>

        {/* Divider */}
        <Animated.View
          style={[
            styles.divider,
            animatedLineStyle,
            { backgroundColor: theme.colors.gold },
          ]}
        />

        {/* Tagline */}
        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineY }],
              color: theme.colors.mutedWhite,
            },
          ]}
        >
          Nyumba Bora. Maisha Bora.
        </Animated.Text>

        <Animated.Text
          style={[
            styles.subTagline,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineY }],
              color: theme.colors.mutedGold,
            },
          ]}
        >
          Premium Real Estate at Your Fingertips
        </Animated.Text>

      </View>

      {/* Loading dots */}
      <View style={styles.dotsContainer}>
        <Animated.View
          style={[
            styles.dot,
            { backgroundColor: theme.colors.gold, transform: [{ scale: dotScale1 }] },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            { backgroundColor: theme.colors.gold, transform: [{ scale: dotScale2 }] },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            { backgroundColor: theme.colors.gold, transform: [{ scale: dotScale3 }] },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  brandTop: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: 10,
  },

  brandBottom: {
    fontSize: 20,
    letterSpacing: 6,
    marginTop: 4,
  },

  divider: {
    height: 2,
    marginVertical: 20,
  },

  tagline: {
    fontSize: 14,
    textAlign: 'center',
  },

  subTagline: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },

  dotsContainer: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    gap: 10,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});