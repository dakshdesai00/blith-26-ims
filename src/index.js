import React from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import { ColorModeScript } from "@chakra-ui/color-mode";
import { extendTheme } from "@chakra-ui/theme-utils";
import App from "./App";

// Custom dark theme (optional)
const theme = extendTheme({
  config: { initialColorMode: "dark", useSystemColorMode: false },
  fonts: { body: "'Inter', sans-serif" },
  colors: {
    brand: {
      50: "#e3f9ff",
      100: "#c8e6fa",
      900: "#18125e",
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode="dark" />
      <App />
    </ChakraProvider>
  </React.StrictMode>
);
