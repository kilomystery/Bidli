import { useRole } from "../context/RoleContext";
export default function useSessionRole() {
  return useRole();
}