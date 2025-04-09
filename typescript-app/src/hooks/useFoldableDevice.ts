import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import * as Device from 'expo-device';
import * as ScreenOrientation from 'expo-screen-orientation';

interface FoldableState {
  isFoldable: boolean;
  isUnfolded: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'PORTRAIT' | 'LANDSCAPE';
  layoutMode: 'SINGLE_PANE' | 'DUAL_PANE';
}

// Samsung Z Fold series model IDs
const KNOWN_FOLDABLES = [
  'SM-F926B',  // Z Fold 3 5G (Global)
  'SM-F926U',  // Z Fold 3 5G (US)
  'SM-F926W',  // Z Fold 3 5G (Canada)
  'SM-F926N',  // Z Fold 3 5G (Korea)
  'SM-F936B',  // Z Fold 4
  'SM-F936U',  // Z Fold 4 (US)
  'SM-F946B',  // Z Fold 5
  'SM-F946U',  // Z Fold 5 (US)
];

const FOLD_BREAKPOINT = 600; // Width threshold for unfolded state

export const useFoldableDevice = (): FoldableState => {
  const [state, setState] = useState<FoldableState>({
    isFoldable: false,
    isUnfolded: false,
    screenWidth: Dimensions.get('window').width,
    screenHeight: Dimensions.get('window').height,
    orientation: 'PORTRAIT',
    layoutMode: 'SINGLE_PANE',
  });

  useEffect(() => {
    const checkDevice = async () => {
      const isFoldable = Device.modelId ? KNOWN_FOLDABLES.includes(Device.modelId) : false;
      
      // Additional check for large screen devices that might benefit from dual-pane layout
      const { width, height } = Dimensions.get('window');
      const isLargeScreen = width >= FOLD_BREAKPOINT || height >= FOLD_BREAKPOINT;
      
      updateState(isFoldable || isLargeScreen);
    };

    const updateState = (isFoldable: boolean) => {
      const { width, height } = Dimensions.get('window');
      const isLandscape = width > height;
      
      // Consider device unfolded if width meets breakpoint and device is foldable,
      // or if it's a large screen device in landscape
      const isUnfolded = (isFoldable && width >= FOLD_BREAKPOINT) || 
                        (!isFoldable && isLandscape && width >= FOLD_BREAKPOINT);

      setState({
        isFoldable,
        isUnfolded,
        screenWidth: width,
        screenHeight: height,
        orientation: isLandscape ? 'LANDSCAPE' : 'PORTRAIT',
        layoutMode: isUnfolded ? 'DUAL_PANE' : 'SINGLE_PANE',
      });
    };

    // Initial check
    checkDevice();

    // Listen for dimension changes
    const dimensionSubscription = Dimensions.addEventListener('change', () => {
      updateState(state.isFoldable);
    });

    // Listen for orientation changes
    const setupOrientationListener = async () => {
      await ScreenOrientation.unlockAsync(); // Allow any orientation
      ScreenOrientation.addOrientationChangeListener(() => {
        updateState(state.isFoldable);
      });
    };
    setupOrientationListener();

    return () => {
      dimensionSubscription.remove();
      ScreenOrientation.removeOrientationChangeListeners();
    };
  }, []);

  return state;
};

// Layout utility functions
export const calculateLayoutWidth = (totalWidth: number, mode: 'SINGLE_PANE' | 'DUAL_PANE'): number => {
  if (mode === 'DUAL_PANE') {
    return Math.floor(totalWidth / 2);
  }
  return totalWidth;
};

export const shouldUseDualPane = (width: number, height: number): boolean => {
  return width >= FOLD_BREAKPOINT && width > height;
};

// Layout presets with responsive values
export const LAYOUT_PRESETS = {
  SINGLE_PANE: {
    contentWidth: '100%',
    paddingHorizontal: 16,
    maxWidth: '100%',
  },
  DUAL_PANE: {
    contentWidth: '50%',
    paddingHorizontal: 24,
    maxWidth: 800, // Maximum width for readability
  },
  COMMON: {
    spacing: {
      small: 8,
      medium: 16,
      large: 24,
    },
    borderRadius: {
      small: 4,
      medium: 8,
      large: 12,
    },
  },
};

// Responsive font sizes based on screen width
export const getFontSizes = (width: number) => ({
  small: Math.max(12, Math.floor(width * 0.03)),
  medium: Math.max(14, Math.floor(width * 0.04)),
  large: Math.max(16, Math.floor(width * 0.05)),
  xlarge: Math.max(20, Math.floor(width * 0.06)),
});

// Usage example in a component:
/*
const MyComponent = () => {
  const { isUnfolded, layoutMode, screenWidth } = useFoldableDevice();
  const fontSizes = getFontSizes(screenWidth);
  
  return (
    <View style={[
      styles.container,
      LAYOUT_PRESETS[layoutMode],
    ]}>
      <Text style={{ fontSize: fontSizes.medium }}>
        Content adapts to fold state
      </Text>
    </View>
  );
};
*/