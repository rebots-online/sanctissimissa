import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useDeviceInfo } from '../hooks/useDeviceInfo';

type FoldableLayoutProps = {
  /**
   * Content to render in folded mode (phone-like view)
   */
  foldedContent: ReactNode;
  
  /**
   * Content to render in unfolded mode (tablet-like view)
   */
  unfoldedContent?: ReactNode;
  
  /**
   * Whether to force folded mode regardless of device state
   */
  forceFolded?: boolean;
  
  /**
   * Whether to force unfolded mode regardless of device state
   */
  forceUnfolded?: boolean;
  
  /**
   * Style for the container
   */
  style?: ViewStyle;

  /**
   * Debug mode to show a visual indicator of the current state
   */
  debug?: boolean;
};

/**
 * A component that renders different layouts based on the device's fold state.
 * If the device is not foldable or no unfoldedContent is provided, it will always render the foldedContent.
 */
export const FoldableLayout: React.FC<FoldableLayoutProps> = ({
  foldedContent,
  unfoldedContent,
  forceFolded = false,
  forceUnfolded = false,
  style,
  debug = false,
}) => {
  const deviceInfo = useDeviceInfo();
  
  // Determine if we should show the unfolded content
  const shouldShowUnfolded = () => {
    if (forceFolded) return false;
    if (forceUnfolded) return true;
    
    return deviceInfo.isFoldable && deviceInfo.isUnfolded && unfoldedContent !== undefined;
  };
  
  const isUnfolded = shouldShowUnfolded();
  
  return (
    <View style={[styles.container, style]}>
      {isUnfolded ? unfoldedContent : foldedContent}
      
      {debug && (
        <View style={[
          styles.debugIndicator,
          isUnfolded ? styles.unfoldedIndicator : styles.foldedIndicator
        ]}>
        </View>
      )}
    </View>
  );
};

/**
 * A component that provides a two-column layout when unfolded, and a single column layout when folded.
 */
export const FoldableTwoColumnLayout: React.FC<{
  leftContent: ReactNode;
  rightContent: ReactNode;
  style?: ViewStyle;
  columnRatio?: number; // Left column width as a ratio of total (0-1), defaults to 0.4
  spacing?: number; // Spacing between columns when unfolded
  debug?: boolean;
}> = ({
  leftContent,
  rightContent,
  style,
  columnRatio = 0.4,
  spacing = 16,
  debug = false,
}) => {
  const deviceInfo = useDeviceInfo();
  
  // Render both columns side by side when unfolded
  const unfoldedView = (
    <View style={styles.twoColumnContainer}>
      <View style={[
        styles.leftColumn,
        { width: `${columnRatio * 100}%` }
      ]}>
        {leftContent}
      </View>
      <View style={{ width: spacing }} />
      <View style={[
        styles.rightColumn,
        { width: `${(1 - columnRatio) * 100 - (spacing / 100)}%` }
      ]}>
        {rightContent}
      </View>
    </View>
  );
  
  // Render both columns stacked when folded
  const foldedView = (
    <View style={styles.oneColumnContainer}>
      <View style={styles.topSection}>
        {leftContent}
      </View>
      <View style={{ height: spacing }} />
      <View style={styles.bottomSection}>
        {rightContent}
      </View>
    </View>
  );
  
  return (
    <FoldableLayout
      foldedContent={foldedView}
      unfoldedContent={unfoldedView}
      style={style}
      debug={debug}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  debugIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  foldedIndicator: {
    backgroundColor: '#ff6b6b',
  },
  unfoldedIndicator: {
    backgroundColor: '#51cf66',
  },
  twoColumnContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  oneColumnContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  leftColumn: {
    flex: 0,
  },
  rightColumn: {
    flex: 1,
  },
  topSection: {
    flex: 0,
  },
  bottomSection: {
    flex: 1,
  },
});

export default FoldableLayout;