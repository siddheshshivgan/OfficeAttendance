import React, { useEffect } from 'react';
import { gapi } from 'gapi-script';

const GoogleSheet = () => {
  const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
  const SPREADSHEET_ID = process.env.REACT_APP_SPREADSHEET_ID;
  const RANGE = 'Sheet1!A1'; // Change this based on the range you want to write to

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

  const appendData = () => {
    const values = [
      ['React', 'Google Sheets'], // Data you want to add
    ];

    const body = {
      values: values,
    };

    gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
      valueInputOption: 'RAW',
      resource: body,
    }).then((response) => {
      console.log(`${response.result.updates.updatedCells} cells updated.`);
    }).catch(err => {
      console.error("Error:", err);
    });
  };

  return (
    <div>
      <button onClick={appendData}>Add Data to Google Sheets</button>
    </div>
  );
};

export default GoogleSheet;
