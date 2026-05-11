import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/useAuth";

export const AuthSideEffects = () => {
  const { accountRemovedMessage, clearAccountRemovedMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const lastMessageRef = useRef<string | null>(null);

  useEffect(() => {
    if (!accountRemovedMessage || accountRemovedMessage === lastMessageRef.current) {
      return;
    }

    lastMessageRef.current = accountRemovedMessage;
    toast.error("Account removed", {
      description: accountRemovedMessage,
    });

    if (location.pathname !== "/") {
      navigate("/", { replace: true });
    }

    clearAccountRemovedMessage();
  }, [accountRemovedMessage, clearAccountRemovedMessage, navigate, location.pathname]);

  return null;
};
