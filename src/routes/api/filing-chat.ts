import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/filing-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleFilingChat } = await import("@/lib/filing-chat.server");
        return handleFilingChat(request);
      },
    },
  },
});
