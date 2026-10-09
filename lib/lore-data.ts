import { World } from "@/types";
import { uid } from "@/lib/storage";

export function sampleWorld(): World {
  return {
    id: uid(),
    name: "Aerthum",
    description: "A fractured realm stitched together by old magic and older grudges.",
    continents: [
      {
        id: uid(),
        name: "Veythara",
        description: "The western continent, scarred by the Sundering War.",
        kingdoms: [
          {
            id: uid(),
            name: "Kingdom of Caldrun",
            description: "A proud mountain kingdom ruled from a basalt citadel.",
            ruler: "Queen Maren Ashveil",
            cities: [
              {
                id: uid(),
                name: "Hallowmere",
                description: "Capital city built into the cliffside, famed for its forges.",
                population: "42,000",
                shops: [
                  {
                    id: uid(),
                    name: "The Gilded Anvil",
                    type: "Blacksmith",
                    description: "Finest weapons in the kingdom, run by a retired war-smith.",
                    proprietor: "Borin Hallowforge",
                  },
                ],
                people: [
                  {
                    id: uid(),
                    name: "Borin Hallowforge",
                    role: "Blacksmith, Shop Owner",
                    description: "Gruff, one-armed veteran with a soft spot for strays.",
                    secrets: "Secretly forges weapons for a rebel cell.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

export function emptyWorld(name: string): World {
  return { id: uid(), name, description: "", continents: [] };
}
