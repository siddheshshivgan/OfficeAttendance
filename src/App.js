import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
  AppBar,
  Toolbar,
  CssBaseline
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { gapi } from 'gapi-script';

// Import logo image (add your logo image in the public folder)
const logoUrl = '/logo.png';  // Add a logo image file in the public folder, e.g., public/logo.png

const App = () => {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Sign In');

  const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
  const SPREADSHEET_ID = process.env.REACT_APP_SPREADSHEET_ID;
  const RANGE = 'Sheet1!A2'; // Change this based on the range you want to write to in your Google Sheet

  // Initialize Google API when the component mounts
  useEffect(() => {
    const initClient = () => {
      gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
      }).then(() => {
        gapi.auth2.getAuthInstance().signIn();
      });
    };

    gapi.load('client:auth2', initClient);
  }, [API_KEY, CLIENT_ID]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prepare data to send to Google Sheets
    const values = [
      [name, status, new Date().toLocaleString('en-GB')], // Add name, status, and current timestamp
    ];

    const body = {
      values: values,
    };

    // Append data to the Google Sheet
    try {
      const response = await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: RANGE,
        valueInputOption: 'RAW',
        resource: body,
      });
      console.log(`${response.result.updates.updatedCells} cells updated.`);
    } catch (error) {
      console.error("Error updating Google Sheet:", error);
    }

    // Clear form fields after submission
    setName('');
    setStatus('Sign In');
  };

  // Theme customization (light mode only)
  const theme = createTheme({
    palette: {
      primary: {
        main: '#1976d2',
      },
      background: {
        default: '#f5f5f5',
        paper: '#ffffff',
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Attendance Form
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" style={{ marginTop: '2rem' }}>
        <Box
          sx={{
            padding: '2rem',
            backgroundColor: 'background.paper',
            borderRadius: '10px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Logo at the top */}
          <Box display="flex" justifyContent="center" mb={3}>
            <img src={logoUrl} alt="Logo" style={{ width: '100px', height: 'auto' }} />
          </Box>

          <Typography variant="h4" gutterBottom align="center">
            Log Attendance
          </Typography>

          <form onSubmit={handleSubmit}>
            {/* Name Dropdown */}
            <FormControl fullWidth margin="normal">
              <InputLabel>Name</InputLabel>
              <Select
                value={name}
                label="Name"
                onChange={(e) => setName(e.target.value)}
                required
              >
                <MenuItem value="Pooja">Pooja</MenuItem>
                <MenuItem value="Rahul">Rahul</MenuItem>
                <MenuItem value="Shailendra">Shailendra</MenuItem>
                <MenuItem value="Shantaram">Shantaram</MenuItem>
              </Select>
            </FormControl>

            {/* Radio Button for Sign In / Sign Out */}
            <FormControl component="fieldset" fullWidth margin="normal">
              <Typography component="legend">Status</Typography>
              <RadioGroup
                row
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <FormControlLabel
                  value="Sign In"
                  control={<Radio color="primary" />}
                  label="Sign In"
                />
                <FormControlLabel
                  value="Sign Out"
                  control={<Radio color="primary" />}
                  label="Sign Out"
                />
              </RadioGroup>
            </FormControl>

            {/* Submit Button */}
            <Box textAlign="center" mt={3}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
              >
                Submit Attendance
              </Button>
            </Box>
          </form>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default App;
