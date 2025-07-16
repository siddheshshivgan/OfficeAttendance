import React, { useState, useMemo } from 'react';
import { TextField, Button, Box, Typography, FormControl, InputLabel, Select, MenuItem, Dialog, DialogContent, DialogActions, FormHelperText } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';
import { gapi } from 'gapi-script';

const LeaveApplication = () => {
    const [leaveData, setLeaveData] = useState({ startDate: null, endDate: null, type: '', reason: '', name: '', email: '' });
    const [openDialog, setOpenDialog] = useState(false);
    const [errors, setErrors] = useState({});
    const [remainingLeaves, setRemainingLeaves] = useState(null);


    const SPREADSHEET_ID = process.env.REACT_APP_LEAVE_SPREADSHEET_ID; // Use the same Spreadsheet ID from environment variables
    const LEAVE_RANGE = 'Sheet1!A2';
    const COUNTER_RANGE = 'LeaveCounter!A2:D';

    const handleChange = (field, value) => {
        setLeaveData(prevData => ({ ...prevData, [field]: value }));
        
        // Clear the specific field error
        setErrors(prevErrors => ({ ...prevErrors, [field]: '' }));

        // For date fields, validate immediately
        if (field === 'startDate' || field === 'endDate') {
            const newErrors = { ...errors };
            delete newErrors[field];

            const startDate = field === 'startDate' ? value : leaveData.startDate;
            const endDate = field === 'endDate' ? value : leaveData.endDate;

            if (startDate && endDate && dayjs(endDate).isBefore(dayjs(startDate))) {
                newErrors.endDate = 'End date cannot be before start date';
            }

            setErrors(newErrors);
        }
    };

    const handleNameChange = async (event) => {
        const selectedName = event.target.value;
        handleChange('name', selectedName);

        const selectedEmployee = employeeList.find(employee => employee.name === selectedName);
        const selectedEmail = selectedEmployee?.email || '';
        handleChange('email', selectedEmail);

        try {
            const counterResponse = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'LeaveCounter!A2:D',
            });

            const rows = counterResponse.result.values || [];
            const employeeRow = rows.find(row => row[0] === selectedName);

            if (employeeRow) {
                const remaining = parseInt(employeeRow[3], 10); // Column D = LeavesRemaining
                setRemainingLeaves(remaining);
            } else {
                setRemainingLeaves(null);
            }
        } catch (error) {
            console.error("Failed to fetch leave balance:", error);
            setRemainingLeaves(null);
        }
    };

    const employeeList =  useMemo(() => [
        { name: 'Rahul', email: process.env.REACT_APP_RAHUL_EMAILID},
        { name: 'Shailender', email: process.env.REACT_APP_SHAILENDER_EMAILID},
        { name: 'Rohit', email: process.env.REACT_APP_ROHIT_EMAILID},
    ], []);

    const calculateLeaveDays = (startDate, endDate) => {
        return dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
    };

    // useEffect(() => {
    //     // Auto-select employee based on Google user's first name
    //     if (currentUser && currentUser.firstName) {
    //         const matchingEmployee = employeeList.find(
    //             employee => employee.name.toLowerCase() === currentUser.firstName.toLowerCase()
    //         );
            
    //         if (matchingEmployee) {
    //             setLeaveData(prevData => ({
    //                 ...prevData,
    //                 name: matchingEmployee.name,
    //                 email: matchingEmployee.email
    //             }));
    //         }
    //     }
    // }, [currentUser, employeeList]);

    const validateForm = () => {
        let isValid = true;
        const newErrors = {};

        if (!leaveData.name) {
            newErrors.name = 'Name is required';
            isValid = false;
        }

        if (!leaveData.type) {
            newErrors.type = 'Leave type is required';
            isValid = false;
        }

        if (!leaveData.startDate) {
            newErrors.startDate = 'Start date is required';
            isValid = false;
        }

        if (!leaveData.endDate) {
            newErrors.endDate = 'End date is required';
            isValid = false;
        }

        if (leaveData.startDate && leaveData.endDate && dayjs(leaveData.endDate).isBefore(dayjs(leaveData.startDate))) {
            newErrors.endDate = 'End date cannot be before start date';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        
        const formattedStartDate = leaveData.startDate ? leaveData.startDate.format('DD-MM-YYYY') : '';
        const formattedEndDate = leaveData.endDate ? leaveData.endDate.format('DD-MM-YYYY') : '';
        const appliedOn = new Date().toLocaleString('en-GB');
        const leaveDays = calculateLeaveDays(leaveData.startDate, leaveData.endDate);

        try {
            const counterResponse = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: COUNTER_RANGE,
            });

            const rows = counterResponse.result.values || [];
            const employeeIndex = rows.findIndex(row => row[0] === leaveData.name);

            if (employeeIndex === -1) throw new Error("Employee not found in LeaveCounter sheet");

            const row = rows[employeeIndex];
            const totalLeaves = parseInt(row[1] || 8, 10); 
            const currentLeavesTaken = parseInt(row[2] || 0, 10);
            const currentLeavesRemaining = parseInt(row[3] || (totalLeaves - currentLeavesTaken), 10);
            
            if (leaveDays > currentLeavesRemaining) 
                alert(`Insufficient leave balance. This leave will be considered unpaid and will be deducted from your salary.`);
            
            
            const updatedLeavesTaken = currentLeavesTaken + leaveDays;
            const updatedLeavesRemaining = currentLeavesRemaining - leaveDays;
            const updateRange = `LeaveCounter!C${employeeIndex + 2}:D${employeeIndex + 2}`; // Adjusting for header row
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: updateRange,
                valueInputOption: 'RAW',
                resource: {
                    values: [[updatedLeavesTaken, updatedLeavesRemaining]],
                },
            });

            const values = [[leaveData.name, leaveData.type, formattedStartDate, formattedEndDate, leaveData.reason, leaveData.email, appliedOn, updatedLeavesRemaining]];
            const body = { values };

            // Append the leave application data to the Leave sheet
            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: LEAVE_RANGE,
                valueInputOption: 'RAW',
                resource: body,
            });
            
            setOpenDialog(true);
            setLeaveData({ startDate: null, endDate: null, type: '', reason: '', name: '', email: '' });
            setErrors({});
            setRemainingLeaves(null);
        } catch (error) {
            console.error("Error updating Google Sheet:", error);
            alert('An error occurred. Please try again later.');
        }
    };

    const handleCloseDialog = () => setOpenDialog(false);

    return (
        <Box>
            <Typography variant="h4" gutterBottom align="center">Leave Application</Typography>
            <form onSubmit={handleSubmit}>

                <FormControl fullWidth margin="normal" error={!!errors.name}>
                    <InputLabel id="employee-name-label">Employee Name</InputLabel>
                    <Select
                        labelId="employee-name-label"
                        id="employee-name"
                        value={leaveData.name}
                        label="Employee Name"
                        onChange={handleNameChange}
                        required
                    >
                        {employeeList.map((employee) => (
                            <MenuItem key={employee.name} value={employee.name}>
                                {employee.name}
                            </MenuItem>
                        ))}
                    </Select>
                    {remainingLeaves !== null && (
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            Remaining Leave Balance: <strong>{remainingLeaves}</strong> day(s)
                        </Typography>
                    )}
                    {errors.name && <FormHelperText>{errors.name}</FormHelperText>}
                </FormControl>

                <FormControl fullWidth margin="normal" error={!!errors.type}>
                    <InputLabel id="leave-type-label">Leave Type</InputLabel>
                    <Select
                        labelId="leave-type-label"
                        id="leave-type"
                        value={leaveData.type}
                        label="Leave Type"
                        onChange={(e) => handleChange('type', e.target.value)}
                        required
                    >
                        <MenuItem value="Casual">Casual Leave</MenuItem>
                        <MenuItem value="Sick">Sick Leave</MenuItem>
                    </Select>
                    {errors.type && <FormHelperText>{errors.type}</FormHelperText>}
                </FormControl>

                <LocalizationProvider dateAdapter={AdapterDayjs} locale="en-gb">
                    <Box marginY={2}>
                        <DesktopDatePicker
                            label="Start Date"
                            value={leaveData.startDate}
                            format="DD/MM/YYYY"
                            onChange={(newValue) => handleChange('startDate', newValue)}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    error: !!errors.startDate,
                                    helperText: errors.startDate,
                                    required: true
                                }
                            }}
                        />
                    </Box>

                    <Box marginY={2}>
                        <DesktopDatePicker
                            label="End Date"
                            value={leaveData.endDate}
                            format="DD/MM/YYYY"
                            onChange={(newValue) => handleChange('endDate', newValue)}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    error: !!errors.endDate,
                                    helperText: errors.endDate,
                                    required: true
                                }
                            }}
                        />
                    </Box>
                </LocalizationProvider>

                <TextField
                    label="Reason for Leave"
                    multiline
                    rows={3}
                    fullWidth
                    margin="normal"
                    value={leaveData.reason}
                    onChange={(e) => handleChange('reason', e.target.value)}
                />

                <Box textAlign="center" mt={3}>
                    <Button type="submit" variant="contained" color="primary" size="large">
                        Submit Leave Application
                    </Button>
                </Box>

            </form>

            <Dialog open={openDialog} onClose={handleCloseDialog}>
                <DialogContent>Leave application submitted successfully!</DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} color="primary">OK</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default LeaveApplication;