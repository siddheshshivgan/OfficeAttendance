import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Container, Button, AppBar, Toolbar, Box, CssBaseline } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { gapi } from 'gapi-script';
import AttendanceForm from './AttendanceForm';
import LeaveApplication from './LeaveApplication';

const logoUrl = process.env.PUBLIC_URL + "/logo.png";

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const SCOPES = `openid email profile ${SHEETS_SCOPE}`;

// Move the AppBar and routing logic into a separate component to use hooks
const AppContent = ({ currentUser, onSignIn }) => {
    const location = useLocation();
    const navigate = useNavigate();

    // Determine which page we're on
    const isLeavePage = location.pathname === "/leave";

    // Button label and navigation target
    const buttonLabel = isLeavePage ? "Apply Attendance" : "Apply Leave";
    const buttonTarget = isLeavePage ? "/OfficeAttendance" : "/leave";

    return (
        <>
            <AppBar position="static" elevation={0} style={{ backgroundColor: 'transparent' }}>
                <Toolbar>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                        <img src={logoUrl} alt="Logo" style={{ width: '200px', height: 'auto', marginRight: '1rem' }} />
                    </Box>
                    {currentUser && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => navigate(buttonTarget)}
                            >
                                {buttonLabel}
                            </Button>
                        </Box>
                    )}
                </Toolbar>
            </AppBar>

            <Container maxWidth="sm" style={{ marginTop: '2rem' }}>
                <Box sx={{ padding: '2rem', backgroundColor: 'background.paper', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>
                    {!currentUser ? (
                        <Box textAlign="center">
                            <Button variant="contained" color="primary" size="large" onClick={onSignIn}>
                                Sign in with Google
                            </Button>
                        </Box>
                    ) : (
                        <Routes>
                            <Route path="/OfficeAttendance" element={<AttendanceForm currentUser={currentUser} />} />
                            <Route path="/leave" element={<LeaveApplication currentUser={currentUser} />} />
                            <Route path="/" element={<Navigate to="/OfficeAttendance" />} />
                        </Routes>
                    )}
                </Box>
            </Container>
        </>
    );
};

const App = () => {
    const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
    const [currentUser, setCurrentUser] = useState(null);
    const tokenClientRef = useRef(null);
    const expiryTimerRef = useRef(null);
    const needsConsentRef = useRef(false);

    useEffect(() => {
        // 1) Load the Sheets API client (authentication is handled separately by GIS)
        gapi.load('client', () => {
            gapi.client
                .init({
                    apiKey: API_KEY,
                    discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
                })
                .catch((error) => console.error('Google API initialization error:', error));
        });

        // 2) Set up the Google Identity Services token client
        if (!window.google || !window.google.accounts) {
            console.error('Google Identity Services script not loaded. Check public/index.html');
            return;
        }

        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: async (resp) => {
                if (resp.error) {
                    console.error('Auth error:', resp);
                    if (resp.error === 'popup_closed_by_user' || resp.error === 'access_denied') {
                        alert("Please complete the Google Sign In and allow access.");
                    }
                    return;
                }

                // Make sure the user actually ticked the Sheets permission
                if (!window.google.accounts.oauth2.hasGrantedAllScopes(resp, SHEETS_SCOPE)) {
                    needsConsentRef.current = true; // force the consent screen on the next attempt
                    alert('Please tick the Google Sheets permission on the consent screen and sign in again.');
                    return;
                }
                needsConsentRef.current = false;

                // Give the token to the Sheets client
                gapi.client.setToken(resp);

                try {
                    const info = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                        headers: { Authorization: `Bearer ${resp.access_token}` },
                    }).then((r) => r.json());

                    console.log('Signed-in account:', info.email);
                    console.log('Granted scopes:', resp.scope);

                    setCurrentUser({
                        firstName: info.given_name,
                        email: info.email,
                        fullName: info.name,
                    });

                    // Access tokens last ~1 hour. Show the sign-in button again before it expires.
                    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
                    const ms = Math.max((Number(resp.expires_in) || 3600) - 60, 60) * 1000;
                    expiryTimerRef.current = setTimeout(() => {
                        gapi.client.setToken(null);
                        setCurrentUser(null);
                    }, ms);
                } catch (error) {
                    console.error('Failed to fetch user profile:', error);
                }
            },
        });

        return () => {
            if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
        };
    }, [API_KEY, CLIENT_ID]);

    const handleSignIn = () => {
        if (!tokenClientRef.current) {
            alert('Google Sign In is not ready yet. Please refresh the page.');
            return;
        }
        // Normally Google remembers the grant and skips the permission screen.
        // Only force the consent screen if the Sheets permission was missing last time.
        tokenClientRef.current.requestAccessToken({
            prompt: needsConsentRef.current ? 'consent' : '',
        });
    };

    const theme = createTheme({
        palette: {
            primary: { main: '#1976d2' },
            background: { default: '#f5f5f5', paper: '#ffffff' },
        },
    });

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <HashRouter>
                <AppContent currentUser={currentUser} onSignIn={handleSignIn} />
            </HashRouter>
        </ThemeProvider>
    );
};

export default App;