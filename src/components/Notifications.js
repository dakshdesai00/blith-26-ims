import React, { useEffect, useState } from "react";
import {
  Box,
  Text,
  Stack,
  IconButton,
  HStack,
  Spinner,
  Badge,
} from "@chakra-ui/react";
import { CheckIcon } from "@chakra-ui/icons";
import { Divider } from "@chakra-ui/react";
import { db, auth } from "../firebase";
import { useToken } from "@chakra-ui/react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  orderBy,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";

export default function Notifications() {
  const [user] = useAuthState(auth);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Blithchron accent color
  const [unreadBg, readBg] = useToken("colors", ["yellow.200", "gray.100"]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    // Listen for notifications for this user, newest first
    const q = query(
      collection(db, "notifications"),
      where("toUser", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    await updateDoc(doc(db, "notifications", notificationId), {
      read: true,
    });
  };

  return (
    <Box>
      <Text fontSize="xl" fontWeight="bold" mb={4} color="yellow.300">
        Notifications
      </Text>
      {loading ? (
        <HStack justify="center" py={8}>
          <Spinner color="yellow.300" size="lg" />
        </HStack>
      ) : notifications.length === 0 ? (
        <Text color="gray.400" textAlign="center" py={8}>
          No notifications yet.
        </Text>
      ) : (
        <Stack spacing={4}>
          {notifications.map((n, i) => (
            <Box
              key={n.id}
              px={4}
              py={3}
              borderRadius="md"
              bg={n.read ? readBg : unreadBg}
              boxShadow="md"
              position="relative"
              cursor={n.read ? "default" : "pointer"}
              transition="background 0.2s"
              onClick={() => !n.read && markAsRead(n.id)}
              _hover={{ bg: !n.read ? "yellow.200" : readBg }}
            >
              <HStack justify="space-between" align="start">
                <Box>
                  <Text
                    fontWeight={n.read ? "normal" : "bold"}
                    color="brand.900"
                  >
                    {n.message}
                  </Text>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    {n.createdAt?.toDate
                      ? n.createdAt.toDate().toLocaleString()
                      : new Date(n.createdAt).toLocaleString()}
                  </Text>
                </Box>
                {!n.read && (
                  <IconButton
                    icon={<CheckIcon />}
                    aria-label="Mark as read"
                    size="sm"
                    colorScheme="yellow"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(n.id);
                    }}
                  />
                )}
              </HStack>
              {i < notifications.length - 1 && <Divider mt={3} mb={-2} />}
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
