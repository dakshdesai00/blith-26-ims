// src/components/ShareSelector.js
import React, { useEffect, useState } from "react";
import Select from "react-select";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default function ShareSelector({ onChange }) {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    async function fetchUsersAndTeams() {
      const usersSnap = await getDocs(collection(db, "users"));
      const users = usersSnap.docs.map((doc) => ({
        label: `${doc.data().name} (${doc.data().email}) [${doc
          .data()
          .roles.join(", ")}]`,
        value: doc.id,
        type: "user",
        team: doc.data().team,
        email: doc.data().email,
        roles: doc.data().roles,
      }));

      // Unique teams
      const teams = [...new Set(users.map((u) => u.team))].map((team) => ({
        label: team.charAt(0).toUpperCase() + team.slice(1) + " Team",
        value: team,
        type: "team",
      }));

      setOptions([...teams, ...users]);
    }
    fetchUsersAndTeams();
  }, []);

  return (
    <Select
      options={options}
      isMulti
      onChange={onChange}
      placeholder="Select users or teams"
      styles={{
        option: (provided) => ({ ...provided, color: "#18125e" }),
        multiValue: (provided) => ({
          ...provided,
          background: "#ffdb3a",
          color: "#18125e",
        }),
        control: (provided) => ({
          ...provided,
          background: "#222",
          color: "#fff",
        }),
        menu: (provided) => ({
          ...provided,
          background: "#fff",
          color: "#18125e",
        }),
      }}
    />
  );
}
