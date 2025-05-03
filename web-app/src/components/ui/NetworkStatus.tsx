import React, { useState, useEffect } from 'react';
import { Snackbar, Alert, Badge } from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';

/**
 * NetworkStatus component
 * 
 * Displays the current network status and shows notifications when the status changes.
 */
const NetworkStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = useState<string>('');

  useEffect(() => {
    // Function to handle online status change
    const handleOnline = () => {
      setIsOnline(true);
      setNotificationMessage('You are back online. Synchronizing data...');
      setShowNotification(true);
    };

    // Function to handle offline status change
    const handleOffline = () => {
      setIsOnline(false);
      setNotificationMessage('You are offline. App will continue to work with cached data.');
      setShowNotification(true);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Remove event listeners on cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle notification close
  const handleClose = () => {
    setShowNotification(false);
  };

  return (
    <>
      {/* Network status icon */}
      <Badge
        color={isOnline ? 'success' : 'error'}
        variant="dot"
        sx={{ 
          marginRight: 2,
          '& .MuiBadge-badge': {
            right: 3,
            top: 3,
          }
        }}
      >
        {isOnline ? (
          <WifiIcon color="action" />
        ) : (
          <WifiOffIcon color="error" />
        )}
      </Badge>

      {/* Notification for network status changes */}
      <Snackbar
        open={showNotification}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleClose} 
          severity={isOnline ? 'success' : 'warning'}
          variant="filled"
        >
          {notificationMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default NetworkStatus;
