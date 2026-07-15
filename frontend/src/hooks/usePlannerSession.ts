import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { ChatSession } from "../types/chat";
import type { TripPlan } from "../types/trip";
import { useChat } from "./useChat";
import { useCreateTripPlan, useReviseTripPlan, useTripProposals } from "./useTripPlan";

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
  const [revisePending, setRevisePending] = useState(false);
  const [reviseError, setReviseError] = useState(false);
  const [lastRevision, setLastRevision] = useState("");
  const [proposalsPending, setProposalsPending] = useState(false);
  const [proposalsError, setProposalsError] = useState(false);

  const chat = useChat();
  const createTripPlan = useCreateTripPlan();
  const reviseTripPlan = useReviseTripPlan();
  const tripProposals = useTripProposals();
  const queryClient = useQueryClient();

  /** Step between clarify and compose: fetch 2–3 compact destination proposals. */
  const loadProposals = (conversationId: string) => {
    setProposalsPending(true);
    setProposalsError(false);
    tripProposals.mutate(conversationId, {
      onSuccess: (proposals) => {
        setSession((s) =>
          s
            ? {
                ...s,
                proposals,
                history: [
                  ...s.history,
                  {
                    role: "assistant",
                    content: "Hier sind meine Reiseideen für dich — welche gefällt dir am besten?",
                  },
                ],
              }
            : s,
        );
      },
      onError: () => setProposalsError(true),
      onSettled: () => setProposalsPending(false),
    });
  };

  const startPlan = (
    conversationId: string,
    sessionKeywords: string[],
    proposalIndex: number | null = null,
  ) => {
    setPlanPending(true);
    setPlanError(false);
    createTripPlan.mutate(
      {
        conversation_id: conversationId,
        keywords: sessionKeywords,
        answers: {},
        proposal_index: proposalIndex,
      },
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
            loadProposals(response.conversation_id);
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
      proposals: null,
      plan: null,
      lastMessage: "",
    };
    setSession(next);
    setPlanPending(false);
    setPlanError(false);
    setProposalsPending(false);
    setProposalsError(false);
    sendTurn(next, firstMessage);
  };

  /** User picked one of the proposals — compose the full plan for it. */
  const choosePlan = (index: number) => {
    if (!session?.conversationId || !session.proposals) return;
    const proposal = session.proposals[index];
    if (!proposal) return;
    setSession((s) =>
      s
        ? {
            ...s,
            history: [
              ...s.history,
              { role: "user", content: `Ich nehme: ${proposal.destination}` },
            ],
          }
        : s,
    );
    startPlan(session.conversationId, session.keywords, index);
  };

  const retryProposals = () => {
    if (session?.conversationId) loadProposals(session.conversationId);
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

  /** Free-text change request against the composed plan ("Ersetze Tag 2 …"). */
  const revise = (message: string) => {
    const plan = session?.plan;
    if (!plan) return;
    const request = message.trim();
    if (!request) return;
    setRevisePending(true);
    setReviseError(false);
    setLastRevision(request);
    setSession((s) =>
      s ? { ...s, history: [...s.history, { role: "user", content: request }] } : s,
    );
    reviseTripPlan.mutate(
      { tripId: plan.id, message: request },
      {
        onSuccess: (updated) => {
          setSession((s) =>
            s
              ? {
                  ...s,
                  plan: updated,
                  history: [
                    ...s.history,
                    { role: "assistant", content: "Erledigt — ich habe deinen Reiseplan angepasst. ✏️" },
                  ],
                }
              : s,
          );
          onPlanCreated?.(updated);
          queryClient.invalidateQueries({ queryKey: ["my-trips"] });
        },
        onError: () => setReviseError(true),
        onSettled: () => setRevisePending(false),
      },
    );
  };

  const retryRevise = () => {
    if (lastRevision) {
      // Drop the failed request bubble before re-adding it via revise().
      setSession((s) =>
        s && s.history.length > 0 && s.history[s.history.length - 1].content === lastRevision
          ? { ...s, history: s.history.slice(0, -1) }
          : s,
      );
      revise(lastRevision);
    }
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
    setRevisePending(false);
    setReviseError(false);
    setLastRevision("");
    setProposalsPending(false);
    setProposalsError(false);
  };

  return {
    session,
    chatPending,
    chatError,
    planPending,
    planError,
    revisePending,
    reviseError,
    proposalsPending,
    proposalsError,
    startNew,
    send,
    revise,
    choosePlan,
    retryChat,
    retryPlan,
    retryRevise,
    retryProposals,
    reset,
  };
}

export type PlannerSession = ReturnType<typeof usePlannerSession>;
