import { createFileRoute } from "@tanstack/react-router";

import { MePage } from "../../me";

const spotCategories = new Set(["all", "eat", "drink", "play"]);
const getSpotCategory = (category: string): "all" | "drink" | "eat" | "play" =>
  spotCategories.has(category)
    ? (category as "all" | "drink" | "eat" | "play")
    : "all";

export const Route = createFileRoute("/_auth/me/spots/$category")({
  component: RouteComponent,
});

function RouteComponent() {
  const { category } = Route.useParams();
  const initialSpotsCategory = getSpotCategory(category);

  return (
    <MePage initialSpotsCategory={initialSpotsCategory} initialTab="spots" />
  );
}
