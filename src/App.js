import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Container, Button, AppBar, Toolbar, Box, CssBaseline } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { gapi } from 'gapi-script';
import AttendanceForm from './AttendanceForm';
import LeaveApplication from './LeaveApplication';

const logoUrl = process.env.PUBLIC_URL + "/logo.png";

const App = () => {
    const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
    const [currentUser, setCurrentUser] = useState(null);

    // Initialize Google API when the component mounts
    useEffect(() => {
        const initClient = () => {
            gapi.client.init({
              apiKey: API_KEY,
              clientId: CLIENT_ID,
              scope: 'https://www.googleapis.com/auth/spreadsheets',
              discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
            }).then(() => {
                const authInstance = gapi.auth2.getAuthInstance();  // Get the auth instance

                authInstance.signIn().then((googleUser) => { 
                    if (googleUser) { // Check if googleUser is not null
                        fetchUserProfile(googleUser);
                    } else {
                        // User closed the popup or sign-in failed. Handle it.
                        console.log("User did not sign in."); // Or display a message to the user.
                        // You might want to disable certain functionalities or show a message
                        // indicating that the user needs to sign in.
                    }
                }).catch((error) => { // Add a catch block for additional error handling
                    console.error("Sign-in error:", error);
                    if(error['error']==="popup_closed_by_user"){
                      alert("Don't close Google Sign In popup!");
                      window.location.reload();
                    }
                });
            }).catch((error) => {
                console.error("Google API initialization error:", error);
            });
        };
        
        // Fetch user profile information
        const fetchUserProfile = (googleUser) => {
            // Get the user's basic profile information directly from the googleUser object
            if (googleUser) {
                const profile = googleUser.getBasicProfile();
                if (profile) {
                    setCurrentUser({
                        firstName: profile.getGivenName(),
                        email: profile.getEmail(),
                        fullName: profile.getName()
                    });
                    console.log("User profile fetched:", profile.getName());
                }
            } else {
                console.error("Google User object is null");
            }
        };
    
        gapi.load('client:auth2', initClient);
        
    }, [API_KEY, CLIENT_ID]);


    const theme = createTheme({
        palette: {
            primary: { main: '#1976d2' },
            background: { default: '#f5f5f5', paper: '#ffffff' },
        },
    });

    return (
      <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
              <AppBar position="static" elevation={0} style={{ backgroundColor: 'transparent' }}>
                  <Toolbar>
                      <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                          <img src={logoUrl} alt="Logo" style={{ width: '200px', height: 'auto', marginRight: '1rem' }} />                         
                      </Box>
                      {/* Apply Leave Button on the top right */}
                      <Box sx={{ display: 'flex', alignItems: 'center' }}> {/* Add this Box */}
                        <Button component={Link} to="/leave" variant="contained" color="primary">Apply Leave</Button>
                      </Box>
                  </Toolbar>
              </AppBar>

              <Container maxWidth="sm" style={{ marginTop: '2rem' }}>
                  <Box sx={{ padding: '2rem', backgroundColor: 'background.paper', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>

                      <Routes>
                          <Route path="/OfficeAttendance" element={<AttendanceForm currentUser={currentUser} />} />
                          <Route path="/leave" element={<LeaveApplication currentUser={currentUser} />} />
                          <Route path="/" element={<Navigate to="/OfficeAttendance" />} /> 
                      </Routes>
                  </Box>
              </Container>
          </BrowserRouter>
      </ThemeProvider>
    );
};

export default App;
