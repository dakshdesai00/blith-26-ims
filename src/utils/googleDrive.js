// src/utils/googleDrive.js

// Constants
const API_KEY = "AIzaSyD714feD_IF-lRSEWadBuY4-cLZM3j0IVs";
const CLIENT_ID =
  "827066366169-178s77phs9jbdio4csl3cja45m2g40kl.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.file";

// Initialize the Google API client
async function initializeGapiClient() {
  if (!window.gapi) {
    throw new Error("Google API client not loaded");
  }

  return new Promise((resolve, reject) => {
    window.gapi.load("client", {
      callback: async () => {
        try {
          await window.gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [
              "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
            ],
          });
          resolve();
        } catch (error) {
          reject(error);
        }
      },
      onerror: reject,
    });
  });
}

// Get access token using Google Identity Services
async function getAccessToken() {
  if (!window.google || !window.google.accounts) {
    throw new Error("Google Identity Services not loaded");
  }

  return new Promise((resolve, reject) => {
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            reject(tokenResponse);
          } else {
            resolve(tokenResponse.access_token);
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: "consent" });
    } catch (error) {
      reject(error);
    }
  });
}

export async function createAndShareGoogleFile(type, title, emails) {
  try {
    // 1. Initialize the API client
    await initializeGapiClient();

    // 2. Get access token
    await getAccessToken();

    // 3. Create file
    const mimeType = {
      doc: "application/vnd.google-apps.document",
      sheet: "application/vnd.google-apps.spreadsheet",
      slide: "application/vnd.google-apps.presentation",
    }[type];

    if (!mimeType) throw new Error("Invalid file type");

    const file = await window.gapi.client.drive.files.create({
      resource: { name: title, mimeType },
      fields: "id, webViewLink",
    });

    const fileId = file.result.id;

    // 4. Share with each email
    for (let email of emails) {
      await window.gapi.client.drive.permissions.create({
        fileId,
        resource: {
          type: "user",
          role: "writer",
          emailAddress: email,
        },
      });
    }

    return file.result.webViewLink;
  } catch (error) {
    console.error("Google Drive error:", error);
    throw error;
  }
}
