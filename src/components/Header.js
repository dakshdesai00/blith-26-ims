import { Flex, Box, Text, Avatar, VStack, Badge } from "@chakra-ui/react";
import logo from "./blithchron-logo.png";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

export default function Header() {
  const [user] = useAuthState(auth);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) setProfile(snap.data());
    });
  }, [user]);

  return (
    <Flex
      as="header"
      align="center"
      justify="space-between"
      p={6}
      bg="brand.900"
      borderRadius="2xl"
      mb={8}
      boxShadow="lg"
    >
      <Flex align="center">
        <Box boxSize={14} mr={5}>
          <img src={logo} alt="Blithchron Logo" style={{ width: "100%" }} />
        </Box>
        <Text fontSize="2xl" fontWeight="bold" color="yellow.300">
          Blithchron Team Portal
        </Text>
      </Flex>
      {profile && (
        <Flex align="center">
          <VStack align="end" spacing={0} mr={3}>
            <Text fontWeight="bold">{profile.name}</Text>
            <Text fontSize="sm" color="gray.300">
              {profile.email}
            </Text>
            <Badge colorScheme="yellow" borderRadius="md" px={2} mt={1}>
              {Array.isArray(profile.roles)
                ? profile.roles.join(", ")
                : profile.roles || ""}
            </Badge>
          </VStack>
          <Avatar name={profile.name} size="md" />
        </Flex>
      )}
    </Flex>
  );
}
