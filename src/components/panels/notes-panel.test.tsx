import { fireEvent, render, screen } from "@testing-library/react";

import { NotesPanel } from "@/components/panels/notes-panel";
import { useCosmicStore } from "@/store/cosmic-store";

describe("NotesPanel", () => {
  beforeEach(() => {
    useCosmicStore.setState((state) => ({
      ...state,
      notes: [
        {
          id: "note-1",
          user_id: null,
          title: "Morning system",
          content: "Protect the first focus block.",
          tags: ["systems"],
          pinned: false,
          search_text: "morning system protect the first focus block systems",
        },
        {
          id: "note-2",
          user_id: null,
          title: "Travel list",
          content: "Passport and charger.",
          tags: ["travel"],
          pinned: false,
          search_text: "travel list passport and charger travel",
        },
      ],
      noteSearch: "",
    }));
  });

  it("filters notes using the search field", () => {
    render(<NotesPanel />);

    fireEvent.change(screen.getByPlaceholderText(/search tags/i), {
      target: { value: "travel" },
    });

    expect(screen.getByText("Travel list")).toBeInTheDocument();
    expect(screen.queryByText("Morning system")).not.toBeInTheDocument();
  });
});
