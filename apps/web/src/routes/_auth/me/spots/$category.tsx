import { createFileRoute, notFound } from "@tanstack/react-router";

import { MePage } from "../../me";

const spotCategories = new Set(["all", "specials", "eat", "drink", "play"]);

export const Route = createFileRoute("/_auth/me/spots/$category")({
  beforeLoad: ({ params }) => {
    if (!spotCategories.has(params.category)) {
      throw notFound();
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { category } = Route.useParams();

  return (
    <MePage
      initialSpotsCategory={
        category as "all" | "specials" | "drink" | "eat" | "play"
      }
      initialTab="spots"
    />
  );
}
