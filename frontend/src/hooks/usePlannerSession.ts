import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { ChatSession } from "../types/chat";
import type { TripPlan } from "../types/trip";
import { useChat } from "./useChat";
import { useCreateTripPlan } from "./useTripPlan";

export interface StartOptions {
  keywords?: string[];
  /** Non-empty message is sent as the user's first turn; empty → Migo asks first. */
  message?: string;
}

/**
 * Holds the one active planning session (chat history, pending/error flags, plan).
 * Lives at app-shell level so the session survives screen switches.
 */
export function usePlannerSession(onPlanCreated?: (plan: TripPlan) => void) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [chatPending, setChatPending] = useState(false);
  const [chatError, setChatError] = useState(false);
  const [planPending, setPlanPending] = useState(false);
  const [planError, setPlanError] = useState(false);

  const chat = useChat();
  const createTripPlan = useCreateTripPlan();
  const queryClient = useQueryClient();

  const startPlan = (conversationId: string, sessionKeywords: string[]) => {
    setPlanPending(true);
    setPlanError(false);
    createTripPlan.mutate(
      { conversation_id: conversationId, keywords: sessionKeywords, answers: {} },
      {
        onSuccess: (plan) => {
          setSession((s) => (s ? { ...s, plan } : s));
          onPlanCreated?.(plan);
          // Logged-in users see the new plan in the server-backed trips list.
          queryClient.invalidateQueries({ queryKey: ["my-trips"] });
        },
        onError: () => setPlanError(true),
        onSettled: () => setPlanPending(false),
      },
    );
  };

  const sendTurn = (current: ChatSession, message: string) => {
    setChatPending(true);
    setChatError(false);
    setSession((s) => (s ? { ...s, lastMessage: message } : s));
    chat.mutate(
      { conversation_id: current.conversationId, keywords: current.keywords, message },
      {
        onSuccess: (response) => {
          setSession((s) =>
            s
              ? {
                  ...s,
                  conversationId: response.conversation_id,
                  history: [...s.history, { role: "assistant", content: response.reply }],
                }
              : s,
          );
          if (response.ready_to_plan) {
            startPlan(response.conversation_id, current.keywords);
          }
        },
        onError: () => setChatError(true),
        onSettled: () => setChatPending(false),
      },
    );
  };

  const startNew = ({ keywords = [], message = "" }: StartOptions = {}) => {
    const firstMessage = message.trim();
    const next: ChatSession = {
      id: crypto.randomUUID(),
      keywords,
      conversationId: null,
      history: firstMessage ? [{ role: "user", content: firstMessage }] : [],
      plan: null,
      lastMessage: "",
    };
    setSession(next);
    setPlanPending(false);
    setPlanError(false);
    sendTurn(next, firstMessage);
  };

  const send = (message: string) => {
    if (!session) return;
    const updated: ChatSession = {
      ...session,
      history: [...session.history, { role: "user", content: message }],
    };
    setSession(updated);
    sendTurn(updated, message);
  };

  const retryChat = () => {
    if (session) sendTurn(session, session.lastMessage);
  };

  const retryPlan = () => {
    if (session?.conversationId) startPlan(session.conversationId, session.keywords);
  };

  const reset = () => {
    setSession(null);
    setChatPending(false);
    setChatError(false);
    setPlanPending(false);
    setPlanError(false);
  };

  return {
    session,
    chatPending,
    chatError,
    planPending,
    planError,
    startNew,
    send,
    retryChat,
    retryPlan,
    reset,
  };
}

export type PlannerSession = ReturnType<typeof usePlannerSession>;
