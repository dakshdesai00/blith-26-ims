// src/utils/onedrive.js
import { PublicClientApplication } from "@azure/msal-browser";
import axios from "axios";

const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_MS_CLIENT_ID,
    authority: "https://login.microsoftonline.com/common",
    redirectUri: window.location.origin,
  },
};

const msalInstance = new PublicClientApplication(msalConfig);

export async function createAndShareOneDriveFile(filename, emails) {
  try {
    // Login if needed
    if (msalInstance.getAllAccounts().length === 0) {
      await msalInstance.loginPopup({
        scopes: ["Files.ReadWrite.All"],
      });
    }

    const account = msalInstance.getAllAccounts()[0];
    const tokenResponse = await msalInstance.acquireTokenSilent({
      scopes: ["Files.ReadWrite.All"],
      account,
    });

    // Create file
    const createRes = await axios.put(
      `https://graph.microsoft.com/v1.0/me/drive/root:/${filename}:/content`,
      "",
      {
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`,
          "Content-Type": "text/plain",
        },
      }
    );

    const fileId = createRes.data.id;

    // Share file with each email
    for (let email of emails) {
      await axios.post(
        `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/invite`,
        {
          requireSignIn: true,
          sendInvitation: true,
          roles: ["write"],
          recipients: [{ email }],
        },
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.accessToken}`,
          },
        }
      );
    }

    return createRes.data.webUrl;
  } catch (error) {
    console.error("OneDrive error:", error);
    throw error;
  }
}
