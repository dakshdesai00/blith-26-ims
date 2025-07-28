import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  VStack,
  Button,
  Image,
  Text,
  Spinner,
} from "@chakra-ui/react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebase";
import Header from "./components/Header";
import Links from "./components/Links";
import TeamCalendars from "./components/Calendar";
import Notifications from "./components/Notifications";
import { signIn } from "./components/Auth";
import logo from "./components/blithchron-logo.png"; // Save your attached image as this file

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [signingIn, setSigningIn] = useState(false);

  // Optional: handle sign-in errors (for better UX)
  const handleSignIn = async () => {
    setSigningIn(true);
    await signIn();
    setSigningIn(false);
  };

  if (loading) {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner size="xl" color="yellow.300" />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box
        minH="100vh"
        bg="brand.900"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
      >
        <Image src={logo} alt="Blithchron" boxSize="100px" mb={6} />
        <Text fontSize="2xl" fontWeight="bold" color="yellow.300" mb={4}>
          Blithchron Team Portal
        </Text>
        <Button
          colorScheme="yellow"
          size="lg"
          onClick={handleSignIn}
          isLoading={signingIn}
        >
          Sign in with IITGN Google
        </Button>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="brand.900">
      <Container maxW="5xl" py={8}>
        <Header />
        <VStack spacing={8}>
          <Box w="100%" bg="brand.900" borderRadius="2xl" boxShadow="lg" p={8}>
            <Links />
          </Box>
          <Box w="100%" bg="brand.900" borderRadius="2xl" boxShadow="lg" p={8}>
            <Notifications />
          </Box>
          <Box w="100%" bg="brand.900" borderRadius="2xl" boxShadow="lg" p={8}>
            <TeamCalendars />
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}
