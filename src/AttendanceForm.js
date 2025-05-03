import React, { useState, useEffect } from 'react';
import { Typography, Button, Select, MenuItem, FormControl, InputLabel, Box, RadioGroup, FormControlLabel, Radio, Dialog, DialogContent, DialogActions } from '@mui/material';
import { gapi } from 'gapi-script';

const AttendanceForm = ({ currentUser }) => {
    const [name, setName] = useState('');
    const [status, setStatus] = useState('Sign In');
    const [openDialog, setOpenDialog] = useState(false);
    const [greeting, setGreeting] = useState('');
    
    // List of authorized employees
    // eslint-disable-next-line
    const employeeList = [
        { name: 'Rahul'},
        { name: 'Shailender'},
        { name: 'Rohit'},
    ];

    const SPREADSHEET_ID = process.env.REACT_APP_ATTENDANCE_SPREADSHEET_ID;
    console.log("SPREADSHEET_ID:", process.env);
    const ATTENDANCE_RANGE = 'Sheet1!A2'; // Adjust to your sheet and range

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, []);

    useEffect(() => {
        // Auto-select name from dropdown if Google user's first name matches
        if (currentUser && currentUser.firstName) {
            const matchingEmployee = employeeList.find(
                employee => employee.name.toLowerCase() === currentUser.firstName.toLowerCase()
            );
            
            if (matchingEmployee) {
                setName(matchingEmployee.name);
            } 
        }
    }, [currentUser, employeeList]);

    const handleNameChange = (event) => {
        const selectedName = event.target.value;
        setName(selectedName);
    };

    const handleSubmit = async (e) => {
        if (!gapi.client || !gapi.client.sheets) {
            console.error("Google Sheets API is not initialized");
            return;
        }
        e.preventDefault();
        const values = [[name, status, new Date().toLocaleString('en-GB')]];
        const body = { values };

        try {
            const response = await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: ATTENDANCE_RANGE,
                valueInputOption: 'RAW',
                resource: body,
            });

            if (response.status === 200) {
                setOpenDialog(true);
                setName('');
                setStatus('Sign In');
            } else {
                console.error("Error updating Google Sheet:", response);
                alert('Failed to update attendance. Please try again.');
            }
        } catch (error) {
            console.error("Error updating Google Sheet:", error);
            alert('An error occurred. Please try again later.');
        }
    };

    const handleCloseDialog = () => setOpenDialog(false);

    return (
        <Box>
            <Typography variant="h4" gutterBottom align="center">Office Attendance</Typography>
            <Typography variant="h8" gutterBottom align="center">{greeting}!</Typography>
            <form onSubmit={handleSubmit}>
                <FormControl fullWidth margin="normal">
                    <InputLabel>Name</InputLabel>
                    <Select
                        value={name}
                        label="Name"
                        onChange={handleNameChange}
                        required
                    >
                        {employeeList.map((employee) => (
                            <MenuItem key={employee.name} value={employee.name}>
                                {employee.name}
                            </MenuItem>
                        ))}
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

                <Box textAlign="center" mt={3}>
                    <Button type="submit" variant="contained" color="primary" size="large">
                        Submit Attendance
                    </Button>
                </Box>
            </form>

            <Dialog open={openDialog} onClose={handleCloseDialog}>
                <DialogContent>Attendance recorded successfully!</DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} color="primary">OK</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AttendanceForm;