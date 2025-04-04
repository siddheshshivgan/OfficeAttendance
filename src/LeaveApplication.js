import React, { useState } from 'react';
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

    const SPREADSHEET_ID = process.env.REACT_APP_LEAVE_SPREADSHEET_ID; // Use the same Spreadsheet ID from environment variables
    const LEAVE_RANGE = 'Sheet1!A2';

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

    const handleNameChange = (event) => {
        const selectedName = event.target.value;
        handleChange('name', selectedName);

        const selectedEmployee = employeeList.find(employee => employee.name === selectedName);
        const selectedEmail = selectedEmployee?.email || '';
        handleChange('email', selectedEmail);
    };

    const employeeList = [
        { name: 'Pooja', email: process.env.REACT_APP_POOJA_EMAILID},
        { name: 'Rahul', email: process.env.REACT_APP_RAHUL_EMAILID},
        { name: 'Shailender', email: process.env.REACT_APP_SHAILENDER_EMAILID},
        { name: 'Shantaram', email: process.env.REACT_APP_SHANTARAM_EMAILID},
    ];

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

        const values = [[leaveData.name, leaveData.type, formattedStartDate, formattedEndDate, leaveData.reason, leaveData.email, appliedOn]];
        const body = { values };

        try {
            const response = await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: LEAVE_RANGE,
                valueInputOption: 'RAW',
                resource: body,
            });

            if (response.status === 200) {
                setOpenDialog(true);
                setLeaveData({ startDate: null, endDate: null, type: '', reason: '', name: '' });
                setErrors({});
            } else {
                console.error("Error updating Google Sheet:", response);
                alert('Failed to update leave application. Please try again.');
            }
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