// src/components/Calendar.js
import React, { useEffect, useState, useCallback } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { db, auth } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../styles/DarkMode.css";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

function TeamCalendars() {
  const [user] = useAuthState(auth);
  const [calendars, setCalendars] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    if (user) {
      // Get user profile
      getDoc(doc(db, "users", user.uid)).then((snap) => {
        if (snap.exists()) setUserProfile(snap.data());
      });

      // Fetch all calendars
      fetchCalendars();
    }
  }, [user]);

  async function fetchCalendars() {
    const snap = await getDocs(collection(db, "calendars"));
    setCalendars(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  }

  // Editing events for own calendar
  const handleSelectSlot = useCallback(
    async ({ start, end }) => {
      if (!user) return;

      const title = prompt("Event title?");
      if (!title) return;

      const newEvent = {
        title,
        start: start.toISOString(),
        end: end.toISOString(),
      };

      // Get current calendar or create if doesn't exist
      const calRef = doc(db, "calendars", user.uid);
      const calSnap = await getDoc(calRef);

      if (calSnap.exists()) {
        // Update existing calendar
        const currentEvents = calSnap.data().events || [];
        await updateDoc(calRef, {
          events: [...currentEvents, newEvent],
        });
      } else {
        // Create new calendar
        await setDoc(calRef, {
          events: [newEvent],
          name: userProfile?.name || user.displayName || "User",
          team: userProfile?.team || "general",
        });
      }

      fetchCalendars();
    },
    [user, userProfile]
  );

  return (
    <div>
      <h2>Team Calendars</h2>
      {calendars.map((cal) => (
        <div key={cal.id} style={{ marginBottom: 40 }}>
          <h3>
            {cal.name} ({cal.team})
          </h3>
          <Calendar
            localizer={localizer}
            events={(cal.events || []).map((ev) => ({
              ...ev,
              start: new Date(ev.start),
              end: new Date(ev.end),
            }))}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 400, background: "#222", color: "#fff" }}
            selectable={user && user.uid === cal.id}
            onSelectSlot={
              user && user.uid === cal.id ? handleSelectSlot : undefined
            }
            eventPropGetter={() => ({
              style: {
                backgroundColor: "var(--accent-color)",
                color: "var(--primary-color)",
                border: "none",
              },
            })}
          />
        </div>
      ))}
    </div>
  );
}

export default TeamCalendars;
