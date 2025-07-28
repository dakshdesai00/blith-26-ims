import React, { useEffect, useState } from "react";
import {
  Box,
  Stack,
  Input,
  IconButton,
  Button,
  HStack,
  Text,
  Select,
  Spinner,
  Divider,
  Flex,
  Tooltip,
} from "@chakra-ui/react";
import { useToast } from "@chakra-ui/react";
import {
  StarIcon,
  SearchIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  DeleteIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@chakra-ui/icons";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
  addDoc,
  where,
  deleteDoc,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import ShareSelector from "./ShareSelector";
import { createAndShareGoogleFile } from "../utils/googleDrive";

const PAGE_SIZE = 10;

export default function Links() {
  const [user] = useAuthState(auth);
  const [links, setLinks] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [search, setSearch] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [loading, setLoading] = useState(false);
  const [pageStack, setPageStack] = useState([]);
  const [newLink, setNewLink] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [fileName, setFileName] = useState("");
  const [shareWith, setShareWith] = useState([]);
  const [fileType, setFileType] = useState("doc");
  const toast = useToast();

  useEffect(() => {
    if (user) fetchLinks();
    // eslint-disable-next-line
  }, [sortDesc, search, user]);

  async function fetchLinks(startAfterDoc = null, reverse = false) {
    setLoading(true);

    // Query links where user is owner OR in sharedWith array
    let q = query(
      collection(db, "links"),
      where("owner", "==", user.uid),
      orderBy("createdAt", sortDesc ? "desc" : "asc"),
      limit(PAGE_SIZE)
    );

    if (startAfterDoc) {
      q = query(
        collection(db, "links"),
        where("owner", "==", user.uid),
        orderBy("createdAt", sortDesc ? "desc" : "asc"),
        startAfter(startAfterDoc),
        limit(PAGE_SIZE)
      );
    }

    const snap = await getDocs(q);

    // Also fetch links shared with the user
    const sharedQ = query(
      collection(db, "links"),
      where("sharedWith", "array-contains", user.uid)
    );
    const sharedSnap = await getDocs(sharedQ);

    // Combine both sets, remove duplicates
    let docs = [
      ...snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      ...sharedSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    ];
    const seen = new Set();
    docs = docs.filter((doc) => {
      if (seen.has(doc.id)) return false;
      seen.add(doc.id);
      return true;
    });

    // Filter by search
    if (search) {
      docs = docs.filter(
        (l) =>
          l.label?.toLowerCase().includes(search.toLowerCase()) ||
          l.url?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Pinning logic: pinned first
    docs.sort((a, b) => {
      const aPinned = a.pinnedBy?.includes(user?.uid);
      const bPinned = b.pinnedBy?.includes(user?.uid);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });

    setLinks(docs);
    setLastDoc(snap.docs[snap.docs.length - 1]);

    if (!reverse && snap.docs.length > 0) {
      setPageStack((prev) => [...prev, snap.docs[0]]);
    } else if (reverse && pageStack.length > 1) {
      setPageStack((prev) => prev.slice(0, -1));
    }

    setLoading(false);
  }

  const handleNext = () => fetchLinks(lastDoc);
  const handlePrev = () => {
    if (pageStack.length > 1) {
      fetchLinks(pageStack[pageStack.length - 2], true);
    }
  };

  const handleSearch = (e) => setSearch(e.target.value);
  const handleSort = () => setSortDesc((prev) => !prev);

  // Pin/Unpin
  const pinLink = async (linkId) => {
    await updateDoc(doc(db, "links", linkId), {
      pinnedBy: arrayUnion(user.uid),
    });
    fetchLinks();
  };
  const unpinLink = async (linkId) => {
    await updateDoc(doc(db, "links", linkId), {
      pinnedBy: arrayRemove(user.uid),
    });
    fetchLinks();
  };

  // Delete link
  const deleteLink = async (linkId) => {
    try {
      await deleteDoc(doc(db, "links", linkId));
      toast({
        title: "Link deleted",
        status: "success",
        isClosable: true,
      });
      fetchLinks();
    } catch (error) {
      toast({
        title: "Error deleting link",
        description: error.message,
        status: "error",
      });
    }
  };

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown date";

    // Handle both Firestore Timestamp objects and JavaScript Date objects
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper to expand teams to user UIDs and emails
  async function resolveShareWith(shareWith) {
    const usersSnap = await getDocs(collection(db, "users"));
    const allUsers = usersSnap.docs.map((doc) => ({
      ...doc.data(),
      uid: doc.id,
    }));
    let uids = [];
    let emails = [];
    for (let sel of shareWith) {
      if (sel.type === "user") {
        uids.push(sel.value);
        emails.push(sel.email);
      }
      if (sel.type === "team") {
        const teamUsers = allUsers.filter((u) => u.team === sel.value);
        uids.push(...teamUsers.map((u) => u.uid));
        emails.push(...teamUsers.map((u) => u.email));
      }
    }
    // Remove duplicates and self
    return {
      uids: [...new Set(uids)].filter((uid) => uid !== user.uid),
      emails: [...new Set(emails)].filter((email) => email !== user.email),
    };
  }

  const addLink = async () => {
    const { uids } = await resolveShareWith(shareWith);
    await addDoc(collection(db, "links"), {
      url: newLink,
      label: linkLabel,
      owner: user.uid,
      sharedWith: uids,
      pinnedBy: [],
      createdAt: new Date(),
      type: "link",
    });
    // Notifications for shared users
    for (const uid of uids) {
      await addDoc(collection(db, "notifications"), {
        toUser: uid,
        message: `${
          user.displayName || user.email
        } shared a link with you: ${linkLabel}`,
        createdAt: new Date(),
        read: false,
      });
    }
    setNewLink("");
    setLinkLabel("");
    setShareWith([]);
    fetchLinks();
    toast({
      title: "Link added and shared!",
      status: "success",
      isClosable: true,
    });
  };

  const createFile = async () => {
    try {
      if (!fileName) {
        toast({ title: "Please enter a file name", status: "warning" });
        return;
      }
      const { uids, emails } = await resolveShareWith(shareWith);
      let url;
      url = await createAndShareGoogleFile(fileType, fileName, emails);

      await addDoc(collection(db, "links"), {
        url,
        label: fileName,
        owner: user.uid,
        sharedWith: uids,
        pinnedBy: [],
        createdAt: new Date(),
        type: fileType,
      });
      for (const uid of uids) {
        await addDoc(collection(db, "notifications"), {
          toUser: uid,
          message: `${
            user.displayName || user.email
          } shared a ${fileType} file with you: ${fileName}`,
          createdAt: new Date(),
          read: false,
        });
      }
      setFileName("");
      setShareWith([]);
      fetchLinks();
      toast({
        title: "File created and shared!",
        status: "success",
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error creating file",
        description: error.message,
        status: "error",
      });
    }
  };

  return (
    <Box>
      <HStack mb={4} spacing={4}>
        <Input
          placeholder="Search links..."
          value={search}
          onChange={handleSearch}
          maxW="300px"
          bg="brand.900"
          color="white"
        />
        <IconButton
          icon={<SearchIcon />}
          onClick={handleSearch}
          aria-label="Search"
          colorScheme="yellow"
        />
        <Button
          onClick={handleSort}
          colorScheme="yellow"
          variant="outline"
          size="sm"
          px={3}
          py={2}
          fontWeight="medium"
          fontSize="sm"
          borderRadius="md"
          minW="fit-content"
          overflow="hidden"
          whiteSpace="nowrap"
          display="flex"
          alignItems="center"
          gap={1}
        >
          Sort by Date{" "}
          {sortDesc ? (
            <ChevronDownIcon boxSize={4} />
          ) : (
            <ChevronUpIcon boxSize={4} />
          )}
        </Button>
      </HStack>
      {loading ? (
        <Spinner size="xl" color="yellow.300" />
      ) : (
        <Stack spacing={4}>
          {links.map((link) => (
            <Box
              key={link.id}
              p={4}
              borderRadius="md"
              bg="brand.900"
              boxShadow="md"
              _hover={{ bg: "gray.700" }}
            >
              <HStack justify="space-between">
                <Text fontWeight="bold">
                  {link.label}
                  {link.pinnedBy?.includes(user?.uid) && (
                    <StarIcon color="yellow.300" ml={2} />
                  )}
                </Text>
                <HStack>
                  {link.pinnedBy?.includes(user?.uid) ? (
                    <IconButton
                      icon={<StarIcon />}
                      colorScheme="yellow"
                      variant="ghost"
                      onClick={() => unpinLink(link.id)}
                      aria-label="Unpin"
                    />
                  ) : (
                    <IconButton
                      icon={<StarIcon />}
                      variant="ghost"
                      onClick={() => pinLink(link.id)}
                      aria-label="Pin"
                    />
                  )}
                  {link.owner === user.uid && (
                    <IconButton
                      icon={<DeleteIcon />}
                      colorScheme="red"
                      variant="ghost"
                      onClick={() => deleteLink(link.id)}
                      aria-label="Delete"
                    />
                  )}
                </HStack>
              </HStack>
              <Text fontSize="sm" color="gray.300" mt={2}>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.url}
                </a>
              </Text>
              <Flex justify="space-between" mt={2}>
                <Text fontSize="xs" color="gray.400">
                  Created: {formatDate(link.createdAt)}
                </Text>
                <Text fontSize="xs" color="gray.400">
                  Type: {link.type}
                </Text>
              </Flex>
            </Box>
          ))}
        </Stack>
      )}
      <HStack mt={4} spacing={2}>
        <IconButton
          icon={<ArrowLeftIcon />}
          onClick={handlePrev}
          isDisabled={pageStack.length <= 1}
          aria-label="Previous"
        />
        <IconButton
          icon={<ArrowRightIcon />}
          onClick={handleNext}
          isDisabled={!lastDoc || links.length < PAGE_SIZE}
          aria-label="Next"
        />
      </HStack>
      <Divider my={8} />
      <Text fontSize="lg" fontWeight="bold" mb={2}>
        Add New Link
      </Text>
      <Stack direction={{ base: "column", md: "row" }} spacing={4}>
        <Input
          value={newLink}
          onChange={(e) => setNewLink(e.target.value)}
          placeholder="Paste link"
        />
        <Input
          value={linkLabel}
          onChange={(e) => setLinkLabel(e.target.value)}
          placeholder="Label"
        />
        <ShareSelector onChange={setShareWith} />
        <Button
          onClick={addLink}
          colorScheme="yellow"
          /* inline style will override your old CSS */
          style={{
            padding: "6px 12px" /* horizontal vs vertical padding */,
            minWidth: "100px" /* ensure it can contain the text */,
            height: "40px" /* match your inputs/selects */,
            fontSize: "14px" /* small but readable */,
            lineHeight: "normal" /* avoid extra tall line-height */,
            whiteSpace: "nowrap" /* prevent wrapping */,
            borderRadius: "4px" /* match your design */,
          }}
        >
          Add Link
        </Button>
      </Stack>
      <Divider my={8} />
      <Text fontSize="lg" fontWeight="bold" mb={2}>
        Create New File
      </Text>
      <Stack direction={{ base: "column", md: "row" }} spacing={4}>
        <Input
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          placeholder="File name"
        />
        <Select
          value={fileType}
          onChange={(e) => setFileType(e.target.value)}
          maxW="200px"
        >
          <option value="doc">Google Doc</option>
          <option value="sheet">Google Sheet</option>
          <option value="slide">Google Slide</option>
        </Select>
        <ShareSelector onChange={setShareWith} />

        <Button
          onClick={createFile}
          colorScheme="yellow"
          variant="solid"
          size="md" // “md” is one step up from “sm”
          px={6} // more horizontal padding
          py={3} // more vertical padding
          fontSize="md" // a bit larger text
          fontWeight="semibold"
          borderRadius="md"
          minW="140px" // ensure it’s wider than the Add Link button
          whiteSpace="nowrap"
          overflow="hidden"
          textOverflow="ellipsis"
        >
          Create & Share
        </Button>
      </Stack>
    </Box>
  );
}
