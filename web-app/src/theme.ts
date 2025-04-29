import { createTheme } from '@mui/material/styles';

// Define a basic theme for the application
const theme = createTheme({
  palette: {
    primary: {
      main: '#556cd6', // Example primary color
    },
    secondary: {
      main: '#19857b', // Example secondary color
    },
    error: {
      main: '#red', // Standard error color
    },
    background: {
      default: '#fff', // Default background color
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    // Add other typography variants as needed
  },
  components: {
    // Customize components globally if needed
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Example override
        },
      },
    },
  },
});

export default theme;