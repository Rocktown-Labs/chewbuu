import { createFileRoute, notFound } from "@tanstack/react-router";

import { MePage } from "../../me";

const spotCategories = new Set(["all", "eat", "drink", "play"]);

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
      initialSpotsCategory={category as "all" | "drink" | "eat" | "play"}
      initialTab="spots"
    />
  );
}
