import { useContext } from "react";
import { adminContext } from "../contexts/context";

export const useAdminContext = () => useContext(adminContext)
