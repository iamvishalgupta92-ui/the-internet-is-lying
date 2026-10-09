                           import { useEffect, useMemo, useState } from "react";

import {
  LayoutDashboard,
  FolderOpen,
  Search,
  Clock3,
  Puzzle,
  Users,
  FileText,
  Settings,
  Bell,
  ChevronDown,
  CalendarDays,
  Plus,
  ArrowRight,
  MessageCircle,
  Mail,
  Globe,
  MapPin,
  Image as ImageIcon,
  Trash2,
  Play,
  Target,
  Timer,
  Activity,
  Folder,
  FileSearch,
  UserRound,
  RefreshCw,
  AlertTriangle,
  X,
} from "lucide-react";

const API_URL = "http://localhost:8080/api";

function App() {
  const [cases, setCases] = useState([]);
  const [evidenceData, setEvidenceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState("dashboard");
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [investigatingEvidence, setInvestigatingEvidence] = useState(false);
  const [aiAnalysisOpen, setAiAnalysisOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiChatInput, setAiChatInput] = useState("");
  const [aiChatMessages, setAiChatMessages] = useState([
    { role: "ai", text: "Hello Investigator. I can help you review this investigation." },
  ]);
  const [evidenceFilter, setEvidenceFilter] = useState("ALL");
  const [evidenceSourceFilter, setEvidenceSourceFilter] = useState("ALL");
  const [clues, setClues] = useState([]);
  const [people, setPeople] = useState([]);
  const [personForm, setPersonForm] = useState({ name: "", role: "", contact: "", notes: "" });
  const [personFormOpen, setPersonFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [savingPerson, setSavingPerson] = useState(false);
  const [notes, setNotes] = useState([]);
  const [noteForm, setNoteForm] = useState({ title: "", content: "", pinned: false });
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [savingNote, setSavingNote] = useState(false);

  const [settings, setSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("til-settings") || "{}");
      return {
        investigatorName: saved.investigatorName || "New Investigator",
        autoRefresh: saved.autoRefresh ?? false,
        notifications: saved.notifications ?? true,
      };
    } catch {
      return {
        investigatorName: "New Investigator",
        autoRefresh: false,
        notifications: true,
      };
    }
  });

  const updateSettings = (changes) => {
    setSettings((current) => {
      const next = { ...current, ...changes };
      localStorage.setItem("til-settings", JSON.stringify(next));
      return next;
    });
  };

  const resetSettings = () => {
    const defaults = {
      investigatorName: "New Investigator",
      autoRefresh: false,
      notifications: true,
    };
    localStorage.setItem("til-settings", JSON.stringify(defaults));
    setSettings(defaults);
  };

  const [newCaseOpen, setNewCaseOpen] = useState(false);
  const [addEvidenceOpen, setAddEvidenceOpen] = useState(false);
  const [creatingEvidence, setCreatingEvidence] = useState(false);
  const [evidenceForm, setEvidenceForm] = useState({
    type: "MESSAGES",
    title: "",
    content: "",
    score: 50,
  });
  const [creatingCase, setCreatingCase] = useState(false);

  const [caseForm, setCaseForm] = useState({
    title: "",
    description: "",
    suspicionLevel: "MEDIUM",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [casesResponse, evidenceResponse, cluesResponse, peopleResponse, notesResponse] =
        await Promise.all([
          fetch(`${API_URL}/cases`),
          fetch(`${API_URL}/evidence`),
          fetch(`${API_URL}/clues`),
          fetch(`${API_URL}/people`),
          fetch(`${API_URL}/notes`),
        ]);

      if (!casesResponse.ok) {
        throw new Error("Could not load cases.");
      }

      if (!evidenceResponse.ok) {
        throw new Error("Could not load evidence.");
      }

      if (!cluesResponse.ok) {
        throw new Error("Could not load clues.");
      }

      if (!peopleResponse.ok) {
        throw new Error("Could not load people.");
      }

      if (!notesResponse.ok) {
        throw new Error("Could not load notes.");
      }

      const casesJson = await casesResponse.json();
      const evidenceJson = await evidenceResponse.json();
      const cluesJson = await cluesResponse.json();
      const peopleJson = await peopleResponse.json();
      const notesJson = await notesResponse.json();

      // Older evidence may exist without a linked investigation lead.
      // Create the missing leads once so the dashboard counts stay in sync.
      const missingClueEvidence = evidenceJson.filter(
        (item) =>
          !cluesJson.some(
            (clue) => Number(clue.evidenceId) === Number(item.id)
          )
      );

      if (missingClueEvidence.length) {
        await Promise.allSettled(
          missingClueEvidence.map((item) =>
            fetch(`${API_URL}/clues`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                caseId: item.caseId,
                evidenceId: item.id,
                title: `Lead: ${item.title}`,
                description: `Review the ${String(item.type || "digital").replaceAll("_", " ").toLowerCase()} evidence and determine whether this lead is relevant to the case.`,
                status: "OPEN",
                confidence: Number(item.score || 0),
              }),
            })
          )
        );
      }

      const refreshedCluesResponse = missingClueEvidence.length
        ? await fetch(`${API_URL}/clues`)
        : null;

      const syncedClues =
        refreshedCluesResponse?.ok
          ? await refreshedCluesResponse.json()
          : cluesJson;

      const syncedCases = casesJson;

      setCases(syncedCases);
      setEvidenceData(evidenceJson);
      setClues(syncedClues);
      setPeople(peopleJson);
      setNotes(notesJson);

      if (
        selectedCaseId &&
        !casesJson.some(
          (item) => Number(item.id) === Number(selectedCaseId)
        )
      ) {
        setSelectedCaseId(null);
      }
    } catch (err) {
      console.error(err);

      setError(
        "Backend connection failed. Make sure Spring Boot is running on port 8080."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!settings.autoRefresh) return undefined;

    const interval = window.setInterval(() => {
      loadData();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [settings.autoRefresh]);

  const createCase = async (event) => {
    event.preventDefault();

    if (!caseForm.title.trim()) {
      setError("Case title is required.");
      return;
    }

    try {
      setCreatingCase(true);
      setError("");

      const response = await fetch(`${API_URL}/cases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: caseForm.title.trim(),
          description: caseForm.description.trim(),
          status: "ACTIVE",
          suspicionLevel: caseForm.suspicionLevel,
          progress: 0,
        }),
      });

      if (!response.ok) {
        throw new Error("Could not create case.");
      }

      const savedCase = await response.json();

      setCaseForm({
        title: "",
        description: "",
        suspicionLevel: "MEDIUM",
      });

      setNewCaseOpen(false);
      setSelectedCaseId(savedCase.id);
      setPage("cases");

      await loadData();
    } catch (err) {
      console.error(err);

      setError(
        "Could not create the case. Make sure Spring Boot is running."
      );
    } finally {
      setCreatingCase(false);
    }
  };

  const createEvidence = async (event) => {
    event.preventDefault();

    if (!activeCase) {
      setError("Select a case before adding evidence.");
      return;
    }

    if (!evidenceForm.title.trim() || !evidenceForm.content.trim()) {
      setError("Evidence title and observation are required.");
      return;
    }

    try {
      setCreatingEvidence(true);
      setError("");

      const response = await fetch(`${API_URL}/evidence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caseId: activeCase.id,
          type: evidenceForm.type,
          title: evidenceForm.title.trim(),
          content: evidenceForm.content.trim(),
          status: "UNINVESTIGATED",
          score: Math.min(100, Math.max(0, Number(evidenceForm.score) || 0)),
        }),
      });

      if (!response.ok) {
        throw new Error("Could not add evidence.");
      }

      const savedEvidence = await response.json();

      // Every newly collected evidence creates a lead that the investigator must resolve.
      const clueResponse = await fetch(`${API_URL}/clues`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caseId: activeCase.id,
          evidenceId: savedEvidence.id,
          title: `Lead: ${savedEvidence.title}`,
          description: `Review the ${String(savedEvidence.type || "digital").replaceAll("_", " ").toLowerCase()} evidence and determine whether this lead is relevant to the case.`,
          status: "OPEN",
          confidence: Number(savedEvidence.score || 0),
        }),
      });

      if (!clueResponse.ok) {
        throw new Error("Evidence was saved, but its investigation lead could not be created.");
      }

      setEvidenceForm({
        type: "MESSAGES",
        title: "",
        content: "",
        score: 50,
      });
      setAddEvidenceOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
      setError("Could not add evidence. Make sure Spring Boot is running.");
    } finally {
      setCreatingEvidence(false);
    }
  };

  const sendAiChatMessage = async () => {
    const message = aiChatInput.trim();
    if (!message) return;

    setAiChatMessages((current) => [
      ...current,
      { role: "user", text: message },
    ]);
    setAiChatInput("");

    const activeCaseClues = activeCase
      ? clues.filter(
          (clue) => Number(clue.caseId) === Number(activeCase.id)
        )
      : [];

    const activeCasePeople = activeCase
      ? people.filter(
          (person) => Number(person.caseId) === Number(activeCase.id)
        )
      : [];

    const activeCaseNotes = activeCase
      ? notes.filter(
          (note) => Number(note.caseId) === Number(activeCase.id)
        )
      : [];

    const investigationContext = activeCase
      ? `
You are the AI assistant inside "The Internet Is Lying".

Your job: answer ONLY the investigator's question using the case data below.

CASE:
ID ${activeCase.id} | ${activeCase.title}
Status: ${activeCase.status || "Unknown"} | Suspicion: ${activeCase.suspicionLevel || "Unknown"} | Progress: ${Number(activeCase.progress || 0)}%
Description: ${activeCase.description || "None"}

EVIDENCE:
${
  activeCaseEvidence.length
    ? activeCaseEvidence
        .map(
          (item) =>
            `${item.title} — ${item.type} — ${item.status} — ${Number(item.score || 0)}% — ${item.content}`
        )
        .join("\n")
    : "None"
}

CLUES:
${
  activeCaseClues.length
    ? activeCaseClues
        .map(
          (clue) =>
            `${clue.title} — ${clue.status} — ${Number(clue.confidence || 0)}% — ${clue.description || "None"}`
        )
        .join("\n")
    : "None"
}

PEOPLE:
${
  activeCasePeople.length
    ? activeCasePeople
        .map(
          (person) =>
            `${person.name} — ${person.role || "Unknown"} — ${person.notes || "None"}`
        )
        .join("\n")
    : "None"
}

NOTES:
${
  activeCaseNotes.length
    ? activeCaseNotes
        .map(
          (note) =>
            `${note.title} — ${note.content}`
        )
        .join("\n")
    : "None"
}

STRICT RESPONSE RULES:
- Answer the investigator's question directly.
- Maximum 3 short sentences.
- Maximum 60 words.
- NEVER repeat the case data or question.
- NEVER give a long introduction.
- NEVER use "Here is a breakdown", "Confirmed Facts", or similar headings unless the question specifically asks for a breakdown.
- Use only facts supplied above.
- Do not invent facts.
- If the data is insufficient, say exactly that.
- For yes/no questions, start with Yes or No and give one short reason.
- Keep the tone professional and investigative.

INVESTIGATOR QUESTION:
${message}
`
      : `
You are the AI assistant inside "The Internet Is Lying".

No case is currently selected.
Tell the investigator in ONE short sentence to select a case first.

QUESTION:
${message}
`;

    try {
      const response = await fetch(`${API_URL}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: investigationContext,
        }),
      });

      if (!response.ok) {
        throw new Error("AI request failed.");
      }

      const aiResponse = (await response.text()).trim();

      setAiChatMessages((current) => [
        ...current,
        {
          role: "ai",
          text: aiResponse || "I couldn't generate a response.",
        },
      ]);
    } catch (err) {
      console.error(err);

      setAiChatMessages((current) => [
        ...current,
        {
          role: "ai",
          text: "AI connection failed. Make sure the Spring Boot backend is running.",
        },
      ]);
    }
  };

  const investigateEvidence = async () => {
    if (!selectedEvidence) {
      return;
    }

    try {
      setInvestigatingEvidence(true);
      setError("");

      const updatedEvidence = {
        caseId: selectedEvidence.caseId,
        type: selectedEvidence.type,
        title: selectedEvidence.title,
        content: selectedEvidence.content,
        status: "INVESTIGATED",
        score: selectedEvidence.score,
      };

      const evidenceResponse = await fetch(
        `${API_URL}/evidence/${selectedEvidence.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedEvidence),
        }
      );

      if (!evidenceResponse.ok) {
        throw new Error("Could not investigate evidence.");
      }

      const savedEvidence = await evidenceResponse.json();

      // Evidence investigation is only a review step.
      // The case is solved only when all linked clues are resolved.
      setSelectedEvidence(savedEvidence);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        "Could not investigate the evidence. Make sure Spring Boot is running."
      );
    } finally {
      setInvestigatingEvidence(false);
    }
  };

  const updateClueStatus = async (clue, status) => {
    try {
      setError("");

      const response = await fetch(`${API_URL}/clues/${clue.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caseId: clue.caseId,
          evidenceId: clue.evidenceId,
          title: clue.title,
          description: clue.description,
          status,
          confidence: clue.confidence,
        }),
      });

      if (!response.ok) {
        throw new Error("Could not update clue status.");
      }

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        "Could not update clue status. Make sure Spring Boot is running."
      );
    }
  };

  const openPersonForm = (person = null) => {
    setError("");
    setEditingPerson(person);
    setPersonForm(
      person
        ? {
            name: person.name || "",
            role: person.role || "",
            contact: person.contact || "",
            notes: person.notes || "",
          }
        : { name: "", role: "", contact: "", notes: "" }
    );
    setPersonFormOpen(true);
  };

  const savePerson = async (event) => {
    event.preventDefault();

    if (!activeCase) {
      setError("Create a case before adding a person.");
      return;
    }

    if (!personForm.name.trim()) {
      setError("Person name is required.");
      return;
    }

    try {
      setSavingPerson(true);
      setError("");

      const payload = {
        caseId: activeCase.id,
        name: personForm.name.trim(),
        role: personForm.role.trim(),
        contact: personForm.contact.trim(),
        notes: personForm.notes.trim(),
      };

      const response = await fetch(
        editingPerson
          ? `${API_URL}/people/${editingPerson.id}`
          : `${API_URL}/people`,
        {
          method: editingPerson ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("Could not save person.");
      }

      setPersonFormOpen(false);
      setEditingPerson(null);
      setPersonForm({ name: "", role: "", contact: "", notes: "" });
      await loadData();
    } catch (err) {
      console.error(err);
      setError("Could not save the person. Make sure Spring Boot is running.");
    } finally {
      setSavingPerson(false);
    }
  };

  const deletePerson = async (person) => {
    if (!window.confirm(`Remove ${person.name} from this case?`)) {
      return;
    }

    try {
      setError("");

      const response = await fetch(`${API_URL}/people/${person.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Could not delete person.");
      }

      await loadData();
    } catch (err) {
      console.error(err);
      setError("Could not remove the person.");
    }
  };

  const openNoteForm = (note = null) => {
    setError("");
    setEditingNote(note);
    setNoteForm(
      note
        ? {
            title: note.title || "",
            content: note.content || "",
            pinned: Boolean(note.pinned),
          }
        : { title: "", content: "", pinned: false }
    );
    setNoteFormOpen(true);
  };

  const saveNote = async (event) => {
    event.preventDefault();

    if (!activeCase) {
      setError("Create a case before adding a note.");
      return;
    }

    if (!noteForm.title.trim() || !noteForm.content.trim()) {
      setError("Note title and content are required.");
      return;
    }

    try {
      setSavingNote(true);
      setError("");

      const payload = {
        caseId: activeCase.id,
        title: noteForm.title.trim(),
        content: noteForm.content.trim(),
        pinned: Boolean(noteForm.pinned),
      };

      const response = await fetch(
        editingNote ? `${API_URL}/notes/${editingNote.id}` : `${API_URL}/notes`,
        {
          method: editingNote ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("Could not save note.");
      }

      setNoteFormOpen(false);
      setEditingNote(null);
      setNoteForm({ title: "", content: "", pinned: false });
      await loadData();
    } catch (err) {
      console.error(err);
      setError("Could not save the note. Make sure Spring Boot is running.");
    } finally {
      setSavingNote(false);
    }
  };

  const deleteNote = async (note) => {
    if (!window.confirm(`Delete "${note.title}"?`)) {
      return;
    }

    try {
      setError("");
      const response = await fetch(`${API_URL}/notes/${note.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Could not delete note.");
      }

      await loadData();
    } catch (err) {
      console.error(err);
      setError("Could not delete the note.");
    }
  };

  const activeCase = useMemo(() => {
    if (!cases.length) {
      return null;
    }

    if (selectedCaseId) {
      const selected = cases.find(
        (item) => Number(item.id) === Number(selectedCaseId)
      );

      if (selected) {
        return selected;
      }
    }

    return (
      cases.find(
        (item) => item.status?.toUpperCase() === "ACTIVE"
      ) || cases[0]
    );
  }, [cases, selectedCaseId]);

  const activeCaseEvidence = useMemo(() => {
    if (!activeCase) {
      return [];
    }

    return evidenceData.filter(
      (item) => Number(item.caseId) === Number(activeCase.id)
    );
  }, [activeCase, evidenceData]);

  const solvedCases = cases.filter(
    (item) => item.status?.toUpperCase() === "SOLVED"
  ).length;

  const evidenceCount = evidenceData.length;

  const investigatedEvidence = evidenceData.filter(
    (item) => item.status?.toUpperCase() === "INVESTIGATED"
  ).length;

  const investigationScore = useMemo(() => {
    const scoredEvidence = evidenceData.filter(
      (item) =>
        item.score !== null &&
        item.score !== undefined &&
        Number.isFinite(Number(item.score))
    );

    if (!scoredEvidence.length) {
      return 0;
    }

    const total = scoredEvidence.reduce(
      (sum, item) => sum + Number(item.score),
      0
    );

    return Math.round(total / scoredEvidence.length);
  }, [evidenceData]);

  const filteredCases = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return cases;
    }

    return cases.filter((item) =>
      `${item.title} ${item.description} ${item.status} ${item.suspicionLevel} ${item.id}`
        .toLowerCase()
        .includes(query)
    );
  }, [cases, searchTerm]);

  const evidenceSources = [
    {
      name: "Messages",
      type: "MESSAGES",
      icon: MessageCircle,
      color: "red",
      description: "Chats & conversations",
    },
    {
      name: "Emails",
      type: "EMAILS",
      icon: Mail,
      color: "amber",
      description: "Inbox & attachments",
    },
    {
      name: "Browser History",
      type: "BROWSER_HISTORY",
      icon: Globe,
      color: "purple",
      description: "Searches & websites",
    },
    {
      name: "Location",
      type: "LOCATION",
      icon: MapPin,
      color: "green",
      description: "Movement history",
    },
    {
      name: "Photos",
      type: "PHOTOS",
      icon: ImageIcon,
      color: "red",
      description: "Metadata & images",
    },
    {
      name: "Calendar",
      type: "CALENDAR",
      icon: CalendarDays,
      color: "amber",
      description: "Events & schedules",
    },
    {
      name: "Documents",
      type: "DOCUMENTS",
      icon: FileText,
      color: "red",
      description: "Files & records",
    },
    {
      name: "Deleted Items",
      type: "DELETED_ITEMS",
      icon: Trash2,
      color: "gray",
      description: "Recovered evidence",
    },
  ];

  const openCase = (id) => {
    setSelectedCaseId(id);
    setPage("cases");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const openEvidenceSource = (type) => {
    setEvidenceSourceFilter(type);
    setEvidenceFilter("ALL");
    setSearchTerm("");
    setEvidenceForm((current) => ({
      ...current,
      type,
    }));
    setPage("evidence");
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const getSourceCount = (type) => {
    return activeCaseEvidence.filter(
      (item) => item.type?.toUpperCase() === type
    ).length;
  };

  const getSourceStatus = (type) => {
    const count = getSourceCount(type);

    if (count) {
      return `${count} ${count === 1 ? "item" : "items"} found`;
    }

    return "Not investigated";
  };

  const filteredEvidence = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return evidenceData.filter((item) => {
      const matchesQuery =
        !query ||
        `${item.title} ${item.content} ${item.type} ${item.status} ${item.caseId}`
          .toLowerCase()
          .includes(query);

      const status = item.status?.toUpperCase() || "";
      const matchesFilter =
        evidenceFilter === "ALL" ||
        (evidenceFilter === "INVESTIGATED" && status === "INVESTIGATED") ||
        (evidenceFilter === "UNINVESTIGATED" && status !== "INVESTIGATED");

      const matchesSource =
        evidenceSourceFilter === "ALL" ||
        item.type?.toUpperCase() === evidenceSourceFilter;

      return matchesQuery && matchesFilter && matchesSource;
    });
  }, [evidenceData, searchTerm, evidenceFilter, evidenceSourceFilter]);

  const filteredClues = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return clues.filter((clue) =>
      !query ||
      `${clue.title} ${clue.description || ""} ${clue.status || ""} ${clue.caseId}`
        .toLowerCase()
        .includes(query)
    );
  }, [clues, searchTerm]);

  const timelineEvents = useMemo(() => {
    const events = [];

    cases.forEach((caseItem) => {
      events.push({
        id: `case-${caseItem.id}`,
        type: "CASE",
        title: "Case created",
        description: caseItem.title,
        caseId: caseItem.id,
        status: caseItem.status,
        sortOrder: Number(caseItem.id) * 10,
      });
    });

    evidenceData.forEach((item) => {
      events.push({
        id: `evidence-${item.id}`,
        type: "EVIDENCE",
        title: "Evidence added",
        description: item.title,
        caseId: item.caseId,
        status: item.status,
        sortOrder: Number(item.id) * 10 + 1,
      });

      if (item.status?.toUpperCase() === "INVESTIGATED") {
        events.push({
          id: `investigated-${item.id}`,
          type: "INVESTIGATED",
          title: "Evidence investigated",
          description: `${item.title} · score ${Number(item.score || 0)}%`,
          caseId: item.caseId,
          status: "INVESTIGATED",
          sortOrder: Number(item.id) * 10 + 2,
        });
      }
    });

    clues.forEach((clue) => {
      const clueStatus = clue.status?.toUpperCase() || "OPEN";

      // Every clue appears as an investigation lead.
      events.push({
        id: `clue-${clue.id}`,
        type: "CLUE",
        title: "Clue identified",
        description: clue.title,
        caseId: clue.caseId,
        status: clueStatus,
        sortOrder: Number(clue.id) * 10 + 4,
      });

      // Show the current investigation state of the clue in the live timeline.
      if (clueStatus === "INVESTIGATING") {
        events.push({
          id: `clue-investigating-${clue.id}`,
          type: "CLUE_INVESTIGATING",
          title: "Clue investigation started",
          description: clue.title,
          caseId: clue.caseId,
          status: "INVESTIGATING",
          sortOrder: Number(clue.id) * 10 + 5,
        });
      }

      if (clueStatus === "CONFIRMED") {
        events.push({
          id: `clue-confirmed-${clue.id}`,
          type: "CLUE_CONFIRMED",
          title: "Clue confirmed",
          description: `${clue.title} · confidence ${Number(clue.confidence || 0)}%`,
          caseId: clue.caseId,
          status: "CONFIRMED",
          sortOrder: Number(clue.id) * 10 + 5,
        });
      }

      if (clueStatus === "DISMISSED") {
        events.push({
          id: `clue-dismissed-${clue.id}`,
          type: "CLUE_DISMISSED",
          title: "Clue dismissed",
          description: clue.title,
          caseId: clue.caseId,
          status: "DISMISSED",
          sortOrder: Number(clue.id) * 10 + 5,
        });
      }
    });

    cases
      .filter((caseItem) => caseItem.status?.toUpperCase() === "SOLVED")
      .forEach((caseItem) => {
        events.push({
          id: `solved-${caseItem.id}`,
          type: "SOLVED",
          title: "Case solved",
          description: `${caseItem.title} · progress ${Number(caseItem.progress || 0)}%`,
          caseId: caseItem.id,
          status: "SOLVED",
          sortOrder: Number(caseItem.id) * 10 + 6,
        });
      });

    return events.sort((a, b) => {
      if (b.caseId !== a.caseId) return Number(b.caseId) - Number(a.caseId);
      return b.sortOrder - a.sortOrder;
    });
  }, [cases, evidenceData, clues]);

  const navItems = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      key: "dashboard",
    },
    {
      label: "Cases",
      icon: FolderOpen,
      key: "cases",
    },
    {
      label: "Evidence",
      icon: Search,
      key: "evidence",
    },
    {
      label: "Timeline",
      icon: Clock3,
      key: "timeline",
    },
    {
      label: "Clues",
      icon: Puzzle,
      key: "clues",
    },
    {
      label: "People",
      icon: Users,
      key: "people",
    },
    {
      label: "Notes",
      icon: FileText,
      key: "notes",
    },
    {
      label: "Settings",
      icon: Settings,
      key: "settings",
    },
  ];

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-red-900/10 blur-[150px]" />

        <div className="absolute right-0 top-0 h-[450px] w-[450px] rounded-full bg-red-800/10 blur-[160px]" />

        <div className="absolute bottom-0 left-1/3 h-[350px] w-[350px] rounded-full bg-amber-900/5 blur-[150px]" />
      </div>

      <aside className="sidebar-scroll fixed left-0 top-0 z-40 hidden h-screen w-[278px] overflow-y-auto border-r border-white/[0.07] bg-[#090909] px-5 py-6 lg:block">
        <div className="flex min-h-full flex-col">
          <div className="flex shrink-0 items-center gap-3 px-2">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
              <span className="text-2xl text-red-400">
                ◉
              </span>
            </div>

            <div className="min-w-0">
              <h1 className="font-serif text-[17px] font-bold tracking-wide">
                THE INTERNET
              </h1>

              <h1 className="font-serif text-[17px] font-bold tracking-wide text-red-500">
                IS LYING
              </h1>

              <p className="mt-0.5 whitespace-nowrap text-[9px] tracking-[0.12em] text-gray-500">
                DIGITAL TRUTH INVESTIGATION
              </p>
            </div>
          </div>

          <nav className="mt-9 space-y-1">
            {navItems.map((item) => (
              <NavItem
                key={item.key}
                icon={item.icon}
                label={item.label}
                active={page === item.key}
                onClick={() => {
                  setPage(item.key);
                }}
              />
            ))}
          </nav>

          <div className="h-7 shrink-0" />

          <div className="shrink-0 rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-950/25 via-[#100909] to-[#090909] p-4">
            <div className="font-serif text-3xl leading-none text-red-500">
              “
            </div>

            <p className="mt-1 font-serif text-sm italic leading-5 text-gray-300">
              Not everything online is what it seems.
            </p>

            <div className="mt-3 h-px w-6 bg-red-500/50" />
          </div>

        </div>
      </aside>

      <main className="relative min-h-screen lg:ml-[278px]">
        <header className="sticky top-0 z-30 flex h-[78px] items-center justify-between border-b border-white/[0.06] bg-[#070707]/90 px-5 backdrop-blur-xl sm:px-8 lg:px-10">
          <div className="relative w-full max-w-[600px]">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
            />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  searchTerm.trim()
                ) {
                  setPage("cases");
                }
              }}
              placeholder="Search cases, people, evidence..."
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.035] pl-11 pr-20 text-sm text-white outline-none placeholder:text-gray-600 focus:border-red-500/40 focus:bg-white/[0.05]"
            />

            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-white/10 px-2 py-1 text-[10px] text-gray-600">
              Ctrl K
            </span>
          </div>

          <div className="ml-4 flex items-center gap-4">
            <button className="relative text-gray-500 transition hover:text-white">
              <Bell size={20} />

              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>

            <div className="hidden h-8 w-px bg-white/10 md:block" />

            <button
              type="button"
              onClick={() => setAiChatOpen((current) => !current)}
              className={`flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold transition ${
                aiChatOpen
                  ? "border-red-500/50 bg-red-500/10 text-red-300"
                  : "border-red-500/30 bg-[#111111] text-red-300 hover:border-red-500/50 hover:bg-[#171717] hover:text-white"
              }`}
            >
              <span className="text-base">✦</span>
              AI Assistant
            </button>
          </div>
        </header>

        <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
          {error && (
            <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <AlertTriangle
                  size={18}
                  className="text-red-400"
                />

                <p className="text-sm text-red-300">
                  {error}
                </p>
              </div>

              <button
                onClick={loadData}
                className="flex items-center gap-2 rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-400 transition hover:bg-red-500/10"
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          )}

          {page === "dashboard" && (
            <Dashboard
              cases={cases}
              activeCase={activeCase}
              activeCaseEvidence={activeCaseEvidence}
              evidenceCount={evidenceCount}
              solvedCases={solvedCases}
              investigatedEvidence={investigatedEvidence}
              investigationScore={investigationScore}
              clues={clues}
              people={people}
              notes={notes}
              loading={loading}
              evidenceSources={evidenceSources}
              getSourceCount={getSourceCount}
              getSourceStatus={getSourceStatus}
              onOpenEvidenceSource={openEvidenceSource}
              onNewCase={() => {
                setError("");
                setNewCaseOpen(true);
              }}
              onOpenCases={() => {
                setSearchTerm("");
                setPage("cases");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onOpenClues={() => {
                setSearchTerm("");
                setPage("clues");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onOpenPeople={() => {
                setSearchTerm("");
                setPage("people");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onOpenCase={openCase}
              onRefresh={loadData}
            />
          )}

          {page === "cases" && (
            <CasesPage
              cases={filteredCases}
              allCasesCount={cases.length}
              selectedCase={activeCase}
              selectedEvidence={activeCaseEvidence}
              loading={loading}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onNewCase={() => {
                setError("");
                setNewCaseOpen(true);
              }}
              onSelectCase={openCase}
              onEvidenceClick={(item) => setSelectedEvidence(item)}
              onAddEvidence={() => {
                setError("");
                setAddEvidenceOpen(true);
              }}
              onBack={() => {
                setSelectedCaseId(null);
                setPage("dashboard");
              }}
              onRefresh={loadData}
              onOpenEvidencePage={() => {
                setSearchTerm("");
                setPage("evidence");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onOpenCluesPage={() => {
                setSearchTerm("");
                setPage("clues");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onOpenPeoplePage={() => {
                setSearchTerm("");
                setPage("people");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onOpenNotesPage={() => {
                setSearchTerm("");
                setPage("notes");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}

          {page === "clues" && (
            <CluesPage
              clues={filteredClues}
              totalCount={clues.length}
              cases={cases}
              evidence={evidenceData}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onRefresh={loadData}
              loading={loading}
              onUpdateStatus={updateClueStatus}
            />
          )}

          {page === "timeline" && (
            <TimelinePage
              events={timelineEvents}
              cases={cases}
              selectedCaseId={selectedCaseId}
              onSelectCase={(id) => {
                setSelectedCaseId(id);
              }}
              loading={loading}
              onRefresh={loadData}
            />
          )}

          {page === "evidence" && (
            <EvidencePage
              evidence={filteredEvidence}
              totalCount={evidenceData.length}
              filter={evidenceFilter}
              onFilterChange={setEvidenceFilter}
              sourceFilter={evidenceSourceFilter}
              onSourceFilterChange={setEvidenceSourceFilter}
              evidenceSources={evidenceSources}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onEvidenceClick={(item) => setSelectedEvidence(item)}
              onAddEvidence={() => {
                if (!activeCase) {
                  setError("Create a case before adding evidence.");
                  return;
                }
                setError("");
                setAddEvidenceOpen(true);
              }}
              activeCase={activeCase}
              loading={loading}
              onRefresh={loadData}
            />
          )}

          {page === "people" && (
            <PeoplePage
              people={people.filter((person) => Number(person.caseId) === Number(activeCase?.id))}
              totalCount={people.length}
              cases={cases}
              activeCase={activeCase}
              loading={loading}
              onRefresh={loadData}
              onAdd={() => openPersonForm()}
              onEdit={openPersonForm}
              onDelete={deletePerson}
            />
          )}

          {page === "notes" && (
            <NotesPage
              notes={notes.filter((note) => Number(note.caseId) === Number(activeCase?.id))}
              totalCount={notes.length}
              cases={cases}
              activeCase={activeCase}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              loading={loading}
              onRefresh={loadData}
              onAdd={() => openNoteForm()}
              onEdit={openNoteForm}
              onDelete={deleteNote}
            />
          )}

          {page === "settings" && (
            <SettingsPage
              settings={settings}
              onUpdate={updateSettings}
              onReset={resetSettings}
            />
          )}

          {page !== "dashboard" &&
            page !== "cases" &&
            page !== "evidence" &&
            page !== "timeline" &&
            page !== "clues" &&
            page !== "people" &&
            page !== "notes" &&
            page !== "settings" && (
              <ComingSoonPage
                title={
                  navItems.find(
                    (item) => item.key === page
                  )?.label || "Section"
                }
                onBack={() => setPage("dashboard")}
              />
            )}

          {aiChatOpen && (
            <AiChatPanel
              messages={aiChatMessages}
              input={aiChatInput}
              onInputChange={setAiChatInput}
              onSend={sendAiChatMessage}
              onClose={() => setAiChatOpen(false)}
              activeCase={activeCase}
            />
          )}

          <footer className="py-8 text-center text-[9px] tracking-[0.25em] text-gray-700">
            THE INTERNET IS LYING · DIGITAL TRUTH INVESTIGATION ·
            v1.0.0
          </footer>
        </div>
      </main>

      {selectedEvidence && (
        <EvidenceModal
          evidence={selectedEvidence}
          investigating={investigatingEvidence}
          onClose={() => setSelectedEvidence(null)}
          onInvestigate={investigateEvidence}
          onAiAnalyze={() => setAiAnalysisOpen(true)}
        />
      )}

      {aiAnalysisOpen && selectedEvidence && (
        <AiEvidenceAnalysisModal
          evidence={selectedEvidence}
          onClose={() => setAiAnalysisOpen(false)}
        />
      )}

      {addEvidenceOpen && (
        <div
          className="fixed inset-0 z-[105] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setAddEvidenceOpen(false);
            }
          }}
        >
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0d0d0d] p-6 shadow-[0_0_80px_rgba(0,0,0,0.8)] sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.35em] text-red-500">
                  NEW EVIDENCE
                </p>
                <h3 className="mt-2 font-serif text-3xl font-bold">
                  Add Evidence
                </h3>
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Add evidence to Case {activeCase ? String(activeCase.id).padStart(3, "0") : "—"}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddEvidenceOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-gray-500 transition hover:border-red-500/30 hover:text-white"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={createEvidence} className="space-y-5">
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Evidence Type
                </label>
                <select
                  value={evidenceForm.type}
                  onChange={(event) => setEvidenceForm({ ...evidenceForm, type: event.target.value })}
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#111111] px-4 text-sm text-white outline-none focus:border-red-500/40"
                >
                  {evidenceSources.map((item) => (
                    <option key={item.type} value={item.type}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Evidence Title
                </label>
                <input
                  autoFocus
                  value={evidenceForm.title}
                  onChange={(event) => setEvidenceForm({ ...evidenceForm, title: event.target.value })}
                  placeholder="e.g. 2:15 AM Call Log"
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none placeholder:text-gray-700 focus:border-red-500/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Observation
                </label>
                <textarea
                  value={evidenceForm.content}
                  onChange={(event) => setEvidenceForm({ ...evidenceForm, content: event.target.value })}
                  placeholder="What did the evidence reveal?"
                  rows={4}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-red-500/40"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Evidence Score
                  </label>
                  <span className="text-sm font-semibold text-red-400">{evidenceForm.score}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={evidenceForm.score}
                  onChange={(event) => setEvidenceForm({ ...evidenceForm, score: Number(event.target.value) })}
                  className="w-full accent-red-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddEvidenceOpen(false)}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-400 transition hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingEvidence}
                  className="flex items-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingEvidence ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Save Evidence
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {noteFormOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setNoteFormOpen(false);
          }}
        >
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0d0d0d] p-6 shadow-[0_0_80px_rgba(0,0,0,0.8)] sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.35em] text-red-500">
                  {editingNote ? "UPDATE NOTE" : "INVESTIGATION NOTE"}
                </p>
                <h3 className="mt-2 font-serif text-3xl font-bold">
                  {editingNote ? "Edit Note" : "Add Note"}
                </h3>
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  {activeCase ? `Linked to Case ${String(activeCase.id).padStart(3, "0")}.` : "Select a case first."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNoteFormOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-gray-500 transition hover:border-red-500/30 hover:text-white"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={saveNote} className="space-y-5">
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Title</label>
                <input
                  autoFocus
                  value={noteForm.title}
                  onChange={(event) => setNoteForm({ ...noteForm, title: event.target.value })}
                  placeholder="e.g. Timeline contradiction"
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none placeholder:text-gray-700 focus:border-red-500/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Note</label>
                <textarea
                  value={noteForm.content}
                  onChange={(event) => setNoteForm({ ...noteForm, content: event.target.value })}
                  placeholder="Write your investigation observation or reminder..."
                  rows={6}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-red-500/40"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <input
                  type="checkbox"
                  checked={noteForm.pinned}
                  onChange={(event) => setNoteForm({ ...noteForm, pinned: event.target.checked })}
                  className="h-4 w-4 accent-red-500"
                />
                <span>
                  <span className="block text-sm font-semibold">Pin this note</span>
                  <span className="text-[10px] text-gray-600">Keep important investigation notes at the top.</span>
                </span>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setNoteFormOpen(false)}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-400 transition hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNote}
                  className="flex items-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingNote ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      {editingNote ? "Save Changes" : "Add Note"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {personFormOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPersonFormOpen(false);
          }}
        >
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0d0d0d] p-6 shadow-[0_0_80px_rgba(0,0,0,0.8)] sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.35em] text-red-500">
                  {editingPerson ? "UPDATE PERSON" : "NEW PERSON"}
                </p>
                <h3 className="mt-2 font-serif text-3xl font-bold">
                  {editingPerson ? "Edit Person" : "Add Person"}
                </h3>
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  {activeCase ? `Linked to Case ${String(activeCase.id).padStart(3, "0")}.` : "Select a case first."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPersonFormOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-gray-500 transition hover:border-red-500/30 hover:text-white"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={savePerson} className="space-y-5">
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Name</label>
                <input
                  autoFocus
                  value={personForm.name}
                  onChange={(event) => setPersonForm({ ...personForm, name: event.target.value })}
                  placeholder="e.g. Alex Morgan"
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none placeholder:text-gray-700 focus:border-red-500/40"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Role</label>
                  <input
                    value={personForm.role}
                    onChange={(event) => setPersonForm({ ...personForm, role: event.target.value })}
                    placeholder="Subject / Witness"
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none placeholder:text-gray-700 focus:border-red-500/40"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Contact</label>
                  <input
                    value={personForm.contact}
                    onChange={(event) => setPersonForm({ ...personForm, contact: event.target.value })}
                    placeholder="Phone / email"
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none placeholder:text-gray-700 focus:border-red-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Investigation Notes</label>
                <textarea
                  value={personForm.notes}
                  onChange={(event) => setPersonForm({ ...personForm, notes: event.target.value })}
                  placeholder="What should the investigator remember about this person?"
                  rows={4}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-red-500/40"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPersonFormOpen(false)}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-400 transition hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPerson}
                  className="flex items-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingPerson ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      {editingPerson ? "Save Changes" : "Add Person"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {newCaseOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setNewCaseOpen(false);
            }
          }}
        >
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0d0d0d] p-6 shadow-[0_0_80px_rgba(0,0,0,0.8)] sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.35em] text-red-500">
                  NEW INVESTIGATION
                </p>

                <h3 className="mt-2 font-serif text-3xl font-bold">
                  Create a Case
                </h3>

                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Add the basic facts. You can investigate the
                  digital evidence later.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setNewCaseOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-gray-500 transition hover:border-red-500/30 hover:text-white"
              >
                <X size={17} />
              </button>
            </div>

            <form
              onSubmit={createCase}
              className="space-y-5"
            >
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Case Title
                </label>

                <input
                  autoFocus
                  value={caseForm.title}
                  onChange={(event) =>
                    setCaseForm({
                      ...caseForm,
                      title: event.target.value,
                    })
                  }
                  placeholder="e.g. The Missing 2:15 AM Call"
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none placeholder:text-gray-700 focus:border-red-500/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Description
                </label>

                <textarea
                  value={caseForm.description}
                  onChange={(event) =>
                    setCaseForm({
                      ...caseForm,
                      description: event.target.value,
                    })
                  }
                  placeholder="What is suspicious about this case?"
                  rows={4}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-red-500/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Suspicion Level
                </label>

                <select
                  value={caseForm.suspicionLevel}
                  onChange={(event) =>
                    setCaseForm({
                      ...caseForm,
                      suspicionLevel:
                        event.target.value,
                    })
                  }
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#111111] px-4 text-sm text-white outline-none focus:border-red-500/40"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setNewCaseOpen(false)}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-400 transition hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creatingCase}
                  className="flex items-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingCase ? (
                    <>
                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Create Case
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Dashboard({
  cases,
  activeCase,
  activeCaseEvidence,
  evidenceCount,
  solvedCases,
  investigatedEvidence,
  investigationScore,
  clues,
  people,
  notes,
  loading,
  evidenceSources,
  getSourceCount,
  getSourceStatus,
  onOpenEvidenceSource,
  onNewCase,
  onOpenCases,
  onOpenClues,
  onOpenPeople,
  onOpenCase,
  onRefresh,
}) {
  const activeCaseClues = activeCase
    ? clues.filter((clue) => Number(clue.caseId) === Number(activeCase.id))
    : [];

  const activeCasePeople = activeCase
    ? people.filter((person) => Number(person.caseId) === Number(activeCase.id))
    : [];

  const activeCaseNotes = activeCase
    ? notes.filter((note) => Number(note.caseId) === Number(activeCase.id))
    : [];

  const openClues = activeCaseClues.filter(
    (clue) => clue.status?.toUpperCase() === "OPEN"
  ).length;

  const investigatingClues = activeCaseClues.filter(
    (clue) => clue.status?.toUpperCase() === "INVESTIGATING"
  ).length;

  const confirmedClues = activeCaseClues.filter(
    (clue) => clue.status?.toUpperCase() === "CONFIRMED"
  ).length;

  const dismissedClues = activeCaseClues.filter(
    (clue) => clue.status?.toUpperCase() === "DISMISSED"
  ).length;

  const progress = Math.min(
    100,
    Math.max(0, Number(activeCase?.progress || 0))
  );

  const activeInvestigatedEvidence = activeCaseEvidence.filter(
    (item) => item.status?.toUpperCase() === "INVESTIGATED"
  ).length;

  const evidenceProgress = activeCaseEvidence.length
    ? Math.round((activeInvestigatedEvidence / activeCaseEvidence.length) * 100)
    : 0;

  const clueResolved = activeCaseClues.length
    ? Math.round(
        ((confirmedClues + dismissedClues) / activeCaseClues.length) * 100
      )
    : 0;

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0b0808] px-6 py-7 sm:px-8 lg:py-9">
        <div className="absolute inset-0 bg-gradient-to-r from-red-950/[0.18] via-transparent to-transparent" />
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-red-500/[0.06] blur-3xl" />

        <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.4em] text-amber-500 sm:text-[11px]">
              INVESTIGATION CONTROL ROOM
            </p>

            <h2 className="mt-2 font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Find the <span className="text-red-500">truth.</span>
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500">
              Follow the evidence, resolve the clues, and question every
              digital trace before reaching a conclusion.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3">
              <CalendarDays size={18} className="text-gray-500" />
              <div>
                <p className="text-xs font-semibold">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <p className="text-[10px] text-gray-600">
                  Another day closer to the truth.
                </p>
              </div>
            </div>

            <button
              onClick={onNewCase}
              className="flex items-center justify-center gap-2 rounded-xl border border-red-500/60 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500 hover:text-white"
            >
              <Plus size={18} />
              New Case
            </button>
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          icon={FolderOpen}
          value={cases.length}
          title="Total Cases"
          subtitle={`${solvedCases} solved`}
          color="amber"
        />

        <StatCard
          icon={FileSearch}
          value={evidenceCount}
          title="Evidence Found"
          subtitle={`${investigatedEvidence} investigated`}
          color="red"
        />

        <StatCard
          icon={Puzzle}
          value={clues.length}
          title="Investigation Leads"
          subtitle={`${confirmedClues} confirmed in active case`}
          color="green"
        />

        <StatCard
          icon={Users}
          value={people.length}
          title="People Tracked"
          subtitle={`${activeCasePeople.length} linked to active case`}
          color="red"
        />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-5 items-start 2xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-3xl border border-white/[0.08] bg-[#0b0b0b] p-5 sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Activity size={19} className="text-red-500" />
                <h3 className="font-serif text-xl font-bold">
                  Active Investigation
                </h3>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                Live status of the case currently under investigation.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
              {activeCase
                ? `Case ${String(activeCase.id).padStart(3, "0")}`
                : "No Case"}
            </div>
          </div>

          {loading ? (
            <LoadingBox />
          ) : activeCase ? (
            <>
              <ActiveCaseCard
                activeCase={activeCase}
                evidence={activeCaseEvidence}
                onOpen={() => onOpenCase(activeCase.id)}
              />

            </>
          ) : (
            <EmptyCases onCreate={onNewCase} />
          )}
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-[#0b0b0b] p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold tracking-[0.25em] text-red-500">
                CASE INTELLIGENCE
              </p>
              <h3 className="mt-1 font-serif text-xl font-bold">
                Investigation Pulse
              </h3>
            </div>
            <Target size={19} className="text-red-400" />
          </div>

          <div className="space-y-3">
            <PulseRow label="Open" value={openClues} />
            <PulseRow label="Investigating" value={investigatingClues} />
            <PulseRow label="Confirmed" value={confirmedClues} />
            <PulseRow label="Dismissed" value={dismissedClues} />
          </div>

          <div className="mt-6 border-t border-white/[0.06] pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Evidence confidence</span>
              <span className="text-sm font-bold text-red-400">
                {investigationScore}%
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-red-500 transition-all duration-700"
                style={{ width: `${investigationScore}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenCases}
            className="mt-6 flex w-full items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-xs font-semibold text-gray-400 transition hover:border-red-500/30 hover:bg-red-500/[0.04] hover:text-white"
          >
            View all cases
            <ArrowRight size={14} />
          </button>
        </div>
      </section>

      <section className="mt-6">
<div className="rounded-3xl border border-white/[0.08] bg-[#0b0b0b] p-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-bold tracking-[0.25em] text-red-500">
                DIGITAL SOURCES
              </p>
              <h3 className="mt-1 font-serif text-xl font-bold">
                Evidence Sources
              </h3>
            </div>
            <span className="text-[9px] font-bold tracking-[0.2em] text-gray-700">
              TRUST NOTHING
            </span>
          </div>

          <div className="space-y-2">
            {evidenceSources.slice(0, 6).map((item) => {
              const Icon = item.icon;
              const count = getSourceCount(item.type);

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => onOpenEvidenceSource(item.type)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition hover:border-red-500/25 hover:bg-red-500/[0.035]"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                      item.color === "red"
                        ? "border-red-500/30 bg-red-500/10 text-red-400"
                        : item.color === "amber"
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                        : item.color === "purple"
                        ? "border-purple-500/30 bg-purple-500/10 text-purple-400"
                        : item.color === "green"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-white/10 bg-white/5 text-gray-400"
                    }`}
                  >
                    <Icon size={16} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">{item.name}</p>
                    <p className="mt-0.5 text-[9px] text-gray-600">
                      {count
                        ? `${count} ${count === 1 ? "item" : "items"} found`
                        : "No evidence yet"}
                    </p>
                  </div>

                  <ArrowRight
                    size={13}
                    className="text-gray-700 transition group-hover:translate-x-1 group-hover:text-red-400"
                  />
                </button>
              );
            })}
          </div>
        </div>
            </section>

      <section className="mt-6 rounded-3xl border border-white/[0.08] bg-[#0b0b0b] p-5 sm:p-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] text-gray-600">
              QUICK ACCESS
            </p>
            <h3 className="mt-1 font-serif text-xl font-bold">
              Investigation Tools
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction
            icon={FolderOpen}
            title="Cases"
            subtitle={`${cases.length} total`}
            onClick={onOpenCases}
          />
          <QuickAction
            icon={FileSearch}
            title="Evidence"
            subtitle={`${evidenceCount} found`}
            onClick={() => onOpenEvidenceSource("MESSAGES")}
          />
          <QuickAction
            icon={Puzzle}
            title="Clues"
            subtitle={`${clues.length} leads`}
            onClick={onOpenClues}
          />
          <QuickAction
            icon={Users}
            title="People"
            subtitle={`${people.length} tracked`}
            onClick={onOpenPeople}
          />
        </div>
      </section>
    </>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
      <p className="text-[9px] uppercase tracking-wider text-gray-600">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-gray-200">{value}</p>
    </div>
  );
}

function PulseRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-bold text-gray-200">{value}</span>
    </div>
  );
}

function QuickAction({ icon: Icon, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[76px] w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-left transition hover:-translate-y-0.5 hover:border-red-500/30 hover:bg-red-500/[0.035]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-[10px] text-gray-600">{subtitle}</p>
      </div>
    </button>
  );
}

function CluesPage({
  clues,
  totalCount,
  cases,
  evidence,
  searchTerm,
  onSearchChange,
  onRefresh,
  loading,
  onUpdateStatus,
}) {
  const openCount = clues.filter(
    (clue) => clue.status?.toUpperCase() === "OPEN"
  ).length;

  const confirmedCount = clues.filter(
    (clue) => clue.status?.toUpperCase() === "CONFIRMED"
  ).length;

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0b0808] px-6 py-7 sm:px-8 lg:py-9">
        <div className="absolute inset-0 bg-gradient-to-r from-red-950/[0.2] via-transparent to-transparent" />
        <div className="relative">
          <p className="text-[10px] font-bold tracking-[0.4em] text-red-500">
            INVESTIGATION THREADS
          </p>
          <h2 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">
            Find the <span className="text-red-500">Clues.</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
            Clues connect evidence to an investigation and turn isolated
            digital traces into actionable leads.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <EvidenceStat label="Total Clues" value={totalCount} />
        <EvidenceStat label="Open" value={openCount} />
        <EvidenceStat label="Confirmed" value={confirmedCount} />
      </div>

      <div className="rounded-3xl border border-white/[0.07] bg-[#0b0b0b] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
            />
            <input
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search clues..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.025] py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-gray-700 focus:border-red-500/40"
            />
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 transition hover:bg-white/5 hover:text-white"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingBox />
      ) : clues.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {clues.map((clue) => (
            <ClueCard
              key={clue.id}
              clue={clue}
              cases={cases}
              evidence={evidence}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-white/10 bg-[#0b0b0b] p-12 text-center">
          <Puzzle size={28} className="mx-auto text-gray-700" />
          <h3 className="mt-4 font-serif text-2xl font-bold">
            No clues found
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            {searchTerm ? "Try another search term." : "No clues have been recorded yet."}
          </p>
        </div>
      )}
    </section>
  );
}

function ClueCard({
  clue,
  cases,
  evidence,
  onUpdateStatus,
}) {
  const linkedCase = cases.find(
    (item) => Number(item.id) === Number(clue.caseId)
  );

  const linkedEvidence = evidence.find(
    (item) => Number(item.id) === Number(clue.evidenceId)
  );

  const status = clue.status?.toUpperCase() || "OPEN";

  const statusConfig = {
    OPEN: {
      className:
        "border-amber-500/25 bg-amber-500/10 text-amber-400",
    },
    INVESTIGATING: {
      className:
        "border-blue-500/25 bg-blue-500/10 text-blue-400",
    },
    CONFIRMED: {
      className:
        "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
    },
    DISMISSED: {
      className:
        "border-red-500/25 bg-red-500/10 text-red-400",
    },
  };

  const currentStatus =
    statusConfig[status] || statusConfig.OPEN;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0b0b0b] p-5 transition hover:border-red-500/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
            <Puzzle size={19} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-white">
                {clue.title}
              </h3>

              <span
                className={`rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-wider ${currentStatus.className}`}
              >
                {status}
              </span>
            </div>

            <p className="mt-2 text-xs leading-5 text-gray-600">
              {clue.description ||
                "No description available."}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[9px] uppercase tracking-wider text-gray-600">
            Confidence
          </p>

          <p className="mt-1 text-lg font-bold text-white">
            {Number(clue.confidence || 0)}%
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-600">
            Case
          </p>

          <p className="mt-1 truncate text-xs font-semibold text-gray-300">
            {linkedCase?.title ||
              `Case ${String(clue.caseId).padStart(3, "0")}`}
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-600">
            Evidence
          </p>

          <p className="mt-1 truncate text-xs font-semibold text-gray-300">
            {linkedEvidence?.title || "Not linked"}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-700">
          Investigation Status
        </span>

        <div className="flex flex-wrap gap-2">
          {status === "OPEN" && (
            <button
              type="button"
              onClick={() =>
                onUpdateStatus(clue, "INVESTIGATING")
              }
              className="rounded-lg border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-blue-400 transition hover:bg-blue-500/20"
            >
              Investigate
            </button>
          )}

          {status === "INVESTIGATING" && (
            <>
              <button
                type="button"
                onClick={() =>
                  onUpdateStatus(clue, "CONFIRMED")
                }
                className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-emerald-400 transition hover:bg-emerald-500/20"
              >
                Confirm
              </button>

              <button
                type="button"
                onClick={() =>
                  onUpdateStatus(clue, "DISMISSED")
                }
                className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-red-400 transition hover:bg-red-500/20"
              >
                Dismiss
              </button>
            </>
          )}

          {(status === "CONFIRMED" ||
            status === "DISMISSED") && (
            <button
              type="button"
              onClick={() =>
                onUpdateStatus(clue, "OPEN")
              }
              className="rounded-lg border border-white/10 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-gray-500 transition hover:bg-white/5 hover:text-white"
            >
              Reopen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
function TimelinePage({
  events,
  cases,
  selectedCaseId,
  onSelectCase,
  loading,
  onRefresh,
}) {
  const visibleEvents = selectedCaseId
    ? events.filter(
        (event) => Number(event.caseId) === Number(selectedCaseId)
      )
    : events;

  const selectedCase = cases.find(
    (item) => Number(item.id) === Number(selectedCaseId)
  );

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0b0808] px-6 py-7 sm:px-8 lg:py-9">
        <div className="absolute inset-0 bg-gradient-to-r from-red-950/[0.2] via-transparent to-transparent" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.4em] text-red-500">
              INVESTIGATION LOG
            </p>

            <h2 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">
              The{" "}
              <span className="text-red-500">Timeline.</span>
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500">
              A live investigation trail generated from the cases and
              evidence currently stored in the database.
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-400 transition hover:bg-white/5 hover:text-white"
          >
            <RefreshCw size={16} />
            Refresh Log
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-white/[0.07] bg-[#0b0b0b] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-600">
            VIEWING
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {selectedCase ? selectedCase.title : "All investigations"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSelectCase(null)}
            className={`rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition ${
              selectedCaseId == null
                ? "border-red-500/40 bg-red-500/10 text-red-400"
                : "border-white/10 text-gray-500 hover:bg-white/5 hover:text-gray-300"
            }`}
          >
            All Cases
          </button>

          {cases.map((caseItem) => (
            <button
              key={caseItem.id}
              type="button"
              onClick={() => onSelectCase(caseItem.id)}
              className={`rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition ${
                Number(selectedCaseId) === Number(caseItem.id)
                  ? "border-red-500/40 bg-red-500/10 text-red-400"
                  : "border-white/10 text-gray-500 hover:bg-white/5 hover:text-gray-300"
              }`}
            >
              Case {String(caseItem.id).padStart(3, "0")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingBox />
      ) : visibleEvents.length ? (
        <div className="rounded-3xl border border-white/[0.07] bg-[#0b0b0b] p-5 sm:p-7">
          <div className="relative">
            <div className="absolute bottom-3 left-[20px] top-3 w-px bg-gradient-to-b from-red-500/60 via-white/10 to-transparent" />

            <div className="space-y-7">
              {visibleEvents.map((event) => (
                <TimelineEvent key={event.id} event={event} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-white/10 bg-[#0b0b0b] p-12 text-center">
          <Clock3 size={28} className="mx-auto text-gray-700" />
          <h3 className="mt-4 font-serif text-2xl font-bold">
            No timeline events
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Create a case or add evidence to start the investigation trail.
          </p>
        </div>
      )}
    </section>
  );
}

function TimelineEvent({ event }) {
  const config = {
    CASE: {
      icon: Folder,
      label: "CASE",
      iconClass: "border-amber-500/25 bg-amber-500/10 text-amber-400",
    },
    EVIDENCE: {
      icon: FileSearch,
      label: "EVIDENCE",
      iconClass: "border-red-500/25 bg-red-500/10 text-red-400",
    },
    INVESTIGATED: {
      icon: Target,
      label: "INVESTIGATED",
      iconClass: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
    },
    SOLVED: {
      icon: Activity,
      label: "SOLVED",
      iconClass: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
    },
    CLUE: {
      icon: Puzzle,
      label: "CLUE",
      iconClass: "border-amber-500/25 bg-amber-500/10 text-amber-400",
    },
  }[event.type] || {
    icon: Activity,
    label: event.type,
    iconClass: "border-white/10 bg-white/5 text-gray-400",
  };

  const Icon = config.icon;

  return (
    <div className="relative flex gap-4">
      <div
        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${config.iconClass}`}
      >
        <Icon size={17} />
      </div>

      <div className="min-w-0 flex-1 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 transition hover:border-red-500/20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-bold tracking-[0.2em] text-gray-600">
              {config.label}
            </span>
            <span className="text-[8px] text-gray-700">
              CASE {String(event.caseId).padStart(3, "0")}
            </span>
          </div>

          <span className="text-[9px] uppercase tracking-wider text-gray-700">
            LIVE
          </span>
        </div>

        <h3 className="mt-2 text-sm font-semibold text-white">
          {event.title}
        </h3>

        <p className="mt-1 text-xs leading-5 text-gray-600">
          {event.description}
        </p>

        <div className="mt-3 flex items-center gap-2 text-[9px] uppercase tracking-wider">
          <span className={event.type === "SOLVED" || event.type === "INVESTIGATED" ? "text-emerald-400" : "text-gray-500"}>
            {event.status || "RECORDED"}
          </span>
        </div>
      </div>
    </div>
  );
}

function EvidencePage({
  evidence,
  totalCount,
  filter,
  onFilterChange,
  sourceFilter,
  onSourceFilterChange,
  evidenceSources,
  searchTerm,
  onSearchChange,
  onEvidenceClick,
  onAddEvidence,
  activeCase,
  loading,
  onRefresh,
}) {
  const investigatedCount = evidence.filter(
    (item) => item.status?.toUpperCase() === "INVESTIGATED"
  ).length;

  const uninvestigatedCount = evidence.filter(
    (item) => item.status?.toUpperCase() !== "INVESTIGATED"
  ).length;

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0b0808] px-6 py-7 sm:px-8 lg:py-9">
        <div className="absolute inset-0 bg-gradient-to-r from-red-950/[0.2] via-transparent to-transparent" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.4em] text-red-500">
              DIGITAL FORENSICS
            </p>

            <h2 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">
              Evidence{" "}
              <span className="text-red-500">Vault.</span>
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500">
              Every digital trace collected during an investigation,
              stored and reviewed from the live database.
            </p>
          </div>

          <button
            type="button"
            onClick={onAddEvidence}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400"
          >
            <Plus size={16} />
            Add Evidence
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <EvidenceStat label="Total" value={totalCount} />
        <EvidenceStat label="Investigated" value={investigatedCount} />
        <EvidenceStat label="Pending Review" value={uninvestigatedCount} />
      </div>

      <div className="rounded-3xl border border-white/[0.07] bg-[#0b0b0b] p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
            />
            <input
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search evidence..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.025] py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-gray-700 focus:border-red-500/40"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ["ALL", "All"],
              ["UNINVESTIGATED", "Pending"],
              ["INVESTIGATED", "Investigated"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onFilterChange(value)}
                className={`rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition ${
                  filter === value
                    ? "border-red-500/40 bg-red-500/10 text-red-400"
                    : "border-white/10 text-gray-500 hover:bg-white/5 hover:text-gray-300"
                }`}
              >
                {label}
              </button>
            ))}

            <select
              value={sourceFilter}
              onChange={(event) => onSourceFilterChange(event.target.value)}
              className="rounded-lg border border-white/10 bg-[#111111] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 outline-none focus:border-red-500/40"
              title="Filter by evidence source"
            >
              <option value="ALL">All Sources</option>
              {evidenceSources.map((source) => (
                <option key={source.type} value={source.type}>
                  {source.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onRefresh}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-gray-500 transition hover:bg-white/5 hover:text-white"
              title="Refresh evidence"
            >
              <RefreshCw size={14} />
              <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider">
                Refresh
              </span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/[0.07] bg-[#0b0b0b] p-10 text-center text-sm text-gray-600">
          Loading evidence...
        </div>
      ) : evidence.length ? (
        <div className="space-y-3">
          {evidence.map((item) => (
            <EvidenceVaultRow
              key={item.id}
              item={item}
              onClick={() => onEvidenceClick(item)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-white/10 bg-[#0b0b0b] p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400">
            <FileSearch size={24} />
          </div>

          <h3 className="mt-5 font-serif text-2xl font-bold">
            No evidence found
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
            {searchTerm
              ? "Try a different search term or clear the filters."
              : activeCase
              ? `Add the first piece of evidence to ${activeCase.title}.`
              : "Create a case before collecting evidence."}
          </p>

          {!searchTerm && activeCase && (
            <button
              type="button"
              onClick={onAddEvidence}
              className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/15"
            >
              + Add Evidence
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function EvidenceStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0b0b0b] p-4">
      <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-600">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-white">
        {value}
      </p>
    </div>
  );
}

function EvidenceVaultRow({ item, onClick }) {
  const investigated =
    item.status?.toUpperCase() === "INVESTIGATED";

  const typeLabel = (item.type || "UNKNOWN")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-2xl border border-white/[0.07] bg-[#0b0b0b] p-4 text-left transition hover:border-red-500/25 hover:bg-red-500/[0.025] sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
          <FileSearch size={19} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-white">
              {item.title}
            </h3>

            <span className="rounded-full border border-white/10 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-gray-500">
              {typeLabel}
            </span>
          </div>

          <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-600">
            {item.content || "No observation available."}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-[9px] uppercase tracking-wider">
            <span className={investigated ? "text-emerald-400" : "text-amber-400"}>
              {investigated ? "Investigated" : "Uninvestigated"}
            </span>
            <span className="text-gray-700">
              Case {String(item.caseId).padStart(3, "0")}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-5 sm:flex-col sm:items-end">
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-wider text-gray-600">
              Score
            </p>
            <p className="mt-1 text-lg font-bold text-white">
              {Number(item.score || 0)}%
            </p>
          </div>

          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-700 transition group-hover:text-red-400">
            Open →
          </span>
        </div>
      </div>
    </button>
  );
}

function CasesPage({
  cases,
  allCasesCount,
  selectedCase,
  selectedEvidence,
  loading,
  searchTerm,
  onSearchChange,
  onNewCase,
  onSelectCase,
  onEvidenceClick,
  onAddEvidence,
  onBack,
  onRefresh,
  onOpenEvidencePage,
  onOpenCluesPage,
  onOpenPeoplePage,
  onOpenNotesPage,
}) {
  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0b0808] px-6 py-7 sm:px-8 lg:py-9">
        <div className="absolute inset-0 bg-gradient-to-r from-red-950/[0.2] via-transparent to-transparent" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.4em] text-red-500">
              INVESTIGATION ARCHIVE
            </p>

            <h2 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">
              Your{" "}
              <span className="text-red-500">
                Cases.
              </span>
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500">
              Every investigation starts with a question.
              Select a case to inspect its digital footprint
              and evidence.
            </p>
          </div>

          <button
            onClick={onNewCase}
            className="flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold transition hover:bg-red-400"
          >
            <Plus size={18} />
            New Case
          </button>
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {cases.length} of {allCasesCount} cases
          </span>

          <button
            onClick={onRefresh}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-400 hover:bg-white/5 hover:text-white"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
          />

          <input
            value={searchTerm}
            onChange={(event) =>
              onSearchChange(event.target.value)
            }
            placeholder="Filter cases..."
            className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.025] pl-9 pr-3 text-xs text-white outline-none focus:border-red-500/40"
          />
        </div>
      </div>

      {loading ? (
        <div className="mt-6">
          <LoadingBox />
        </div>
      ) : cases.length === 0 ? (
        <div className="mt-6">
          <EmptyCases onCreate={onNewCase} />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {cases.map((item) => (
            <CaseCard
              key={item.id}
              item={item}
              evidenceCount={
                selectedCase &&
                Number(selectedCase.id) === Number(item.id)
                  ? selectedEvidence.length
                  : null
              }
              selected={
                selectedCase &&
                Number(selectedCase.id) === Number(item.id)
              }
              onClick={() => onSelectCase(item.id)}
            />
          ))}
        </div>
      )}

      {selectedCase && (
        <section className="mt-6 overflow-hidden rounded-3xl border border-red-500/20 bg-[#0b0b0b]">
          <div className="relative overflow-hidden px-6 py-7 sm:px-8 lg:py-9">
            <div className="absolute inset-0 bg-gradient-to-r from-red-950/[0.18] via-transparent to-transparent" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-[0.35em] text-red-500">
                  SELECTED INVESTIGATION · CASE {String(selectedCase.id).padStart(3, "0")}
                </p>
                <h3 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">
                  {selectedCase.title}
                </h3>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500">
                  {selectedCase.description || "No description available."}
                </p>
              </div>
              <div className="shrink-0 self-start rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-400">
                {selectedCase.suspicionLevel || "MEDIUM"}
              </div>
            </div>

            <div className="relative mt-8 flex flex-wrap gap-6 border-b border-white/10">
              <button type="button" className="flex items-center gap-2 border-b-2 border-red-500 pb-4 text-sm font-semibold text-red-400">
                <FileText size={17} /> Overview
              </button>
              <button type="button" onClick={onOpenEvidencePage} className="flex items-center gap-2 border-b-2 border-transparent pb-4 text-sm font-semibold text-gray-500 transition hover:text-white">
                <FileSearch size={17} /> Evidence
              </button>
              <button type="button" onClick={onOpenCluesPage} className="flex items-center gap-2 border-b-2 border-transparent pb-4 text-sm font-semibold text-gray-500 transition hover:text-white">
                <Puzzle size={17} /> Clues
              </button>
              <button type="button" onClick={onOpenPeoplePage} className="flex items-center gap-2 border-b-2 border-transparent pb-4 text-sm font-semibold text-gray-500 transition hover:text-white">
                <Users size={17} /> People
              </button>
              <button type="button" onClick={onOpenNotesPage} className="flex items-center gap-2 border-b-2 border-transparent pb-4 text-sm font-semibold text-gray-500 transition hover:text-white">
                <FileText size={17} /> Notes
              </button>
            </div>
          </div>

          <div className="border-t border-white/[0.06] px-6 py-6 sm:px-8">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h4 className="text-[10px] font-bold tracking-[0.3em] text-gray-500">CASE DETAILS</h4>
              <button type="button" onClick={onBack} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-gray-400 transition hover:bg-white/5 hover:text-white">
                Back to Dashboard
              </button>
            </div>

            <div className="divide-y divide-white/[0.07] rounded-2xl border border-white/[0.07] bg-[#090909]">
              <div className="flex items-center justify-between gap-6 px-5 py-4">
                <div className="flex items-center gap-3 text-sm text-gray-400"><Folder size={18} className="text-gray-500" /><span>Case ID</span></div>
                <span className="text-sm font-semibold text-gray-300">CASE {String(selectedCase.id).padStart(3, "0")}</span>
              </div>
              <div className="flex items-center justify-between gap-6 px-5 py-4">
                <div className="flex items-center gap-3 text-sm text-gray-400"><Target size={18} className="text-gray-500" /><span>Suspicion Level</span></div>
                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-400">{selectedCase.suspicionLevel || "MEDIUM"}</span>
              </div>
              <div className="flex items-center justify-between gap-6 px-5 py-4">
                <div className="flex items-center gap-3 text-sm text-gray-400"><Activity size={18} className="text-gray-500" /><span>Investigation Status</span></div>
                <span className="text-sm font-semibold text-gray-300">{selectedCase.status || "ACTIVE"}</span>
              </div>
              <div className="flex items-center justify-between gap-6 px-5 py-4">
                <div className="flex items-center gap-3 text-sm text-gray-400"><FileSearch size={18} className="text-gray-500" /><span>Evidence Collected</span></div>
                <span className="text-sm font-semibold text-gray-300">{selectedEvidence.length} item{selectedEvidence.length === 1 ? "" : "s"}</span>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function CaseCard({
  item,
  selected,
  evidenceCount,
  onClick,
}) {
  const suspicion =
    item.suspicionLevel?.toUpperCase() || "UNKNOWN";

  const status =
    item.status?.toUpperCase() || "UNKNOWN";

  const suspicionClass =
    suspicion === "HIGH"
      ? "text-red-400 border-red-500/20 bg-red-500/10"
      : suspicion === "MEDIUM"
      ? "text-amber-400 border-amber-500/20 bg-amber-500/10"
      : "text-emerald-400 border-emerald-500/20 bg-emerald-500/10";

  return (
    <button
      onClick={onClick}
      className={`group w-full rounded-3xl border bg-[#0b0b0b] p-5 text-left transition duration-300 hover:-translate-y-1 hover:border-red-500/30 ${
        selected
          ? "border-red-500/40 shadow-[0_0_35px_rgba(239,68,68,0.08)]"
          : "border-white/[0.08]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
            <FolderOpen size={19} />
          </div>

          <div>
            <p className="text-[9px] uppercase tracking-[0.25em] text-gray-600">
              CASE {String(item.id).padStart(3, "0")}
            </p>

            <h3 className="mt-1 font-serif text-xl font-bold">
              {item.title}
            </h3>
          </div>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-[9px] font-bold tracking-wider ${suspicionClass}`}
        >
          {suspicion}
        </span>
      </div>

      <p className="mt-5 line-clamp-2 text-sm leading-6 text-gray-500">
        {item.description ||
          "No description available."}
      </p>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <MiniStat
          label="Status"
          value={status}
          danger
        />

        <MiniStat
          label="Progress"
          value={`${item.progress || 0}%`}
        />

        <MiniStat
          label="Evidence"
          value={evidenceCount ?? "—"}
        />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-700 to-red-400"
            style={{
              width: `${Math.min(
                Math.max(
                  Number(item.progress || 0),
                  0
                ),
                100
              )}%`,
            }}
          />
        </div>

        <ArrowRight
          size={17}
          className="ml-4 text-gray-600 transition group-hover:translate-x-1 group-hover:text-red-400"
        />
      </div>
    </button>
  );
}

function ActiveCaseCard({
  activeCase,
  evidence,
  onOpen,
}) {
  return (
    <div className="grid overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0e0e0e] lg:grid-cols-[0.9fr_1.1fr]">
      <div className="relative min-h-[330px] overflow-hidden bg-[#160909]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgba(239,68,68,0.22),transparent_28%),linear-gradient(135deg,#250909,#090909_55%,#180606)]" />

        <div className="absolute right-8 top-10 h-36 w-24 rotate-6 rounded border border-red-500/20 bg-black/30 shadow-2xl" />

        <div className="absolute right-20 top-20 h-28 w-20 -rotate-12 rounded border border-white/10 bg-white/[0.02]" />

        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent" />

        <div className="relative flex h-full min-h-[330px] flex-col justify-end p-7">
          <p className="max-w-[230px] font-serif text-3xl font-bold leading-tight">
            SOME
            <br />
            PEOPLE
            <br />
            <span className="text-red-500">
              LIE
            </span>
            <br />
            ONLINE
          </p>

          <div className="mt-5 h-px w-20 bg-red-500" />

          <p className="mt-3 text-[9px] tracking-[0.25em] text-gray-300/70">
            CASE{" "}
            {String(activeCase.id).padStart(
              3,
              "0"
            )}{" "}
            / DIGITAL FOOTPRINT
          </p>
        </div>
      </div>

      <div className="p-6 sm:p-7 lg:p-8">
        <span className="inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[10px] font-bold tracking-wider text-red-400">
          {activeCase.suspicionLevel ||
            "UNKNOWN"}{" "}
          SUSPICION
        </span>

        <h4 className="mt-5 font-serif text-2xl font-bold">
          {activeCase.title}
        </h4>

        <p className="mt-3 text-sm leading-6 text-gray-500">
          {activeCase.description ||
            "No description available."}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <MiniStat
            label="Status"
            value={activeCase.status}
            danger
          />

          <MiniStat
            label="Evidence"
            value={`${evidence.length} ${
              evidence.length === 1
                ? "item"
                : "items"
            }`}
          />
        </div>

        <div className="mt-7 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-gray-600">
            Investigation Progress
          </span>

          <span className="text-sm font-semibold">
            {activeCase.progress || 0}%
          </span>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-700 to-red-400"
            style={{
              width: `${Math.min(
                Math.max(
                  Number(
                    activeCase.progress || 0
                  ),
                  0
                ),
                100
              )}%`,
            }}
          />
        </div>

        <button
          onClick={onOpen}
          className="mt-6 flex items-center gap-3 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold shadow-[0_0_30px_rgba(239,68,68,0.18)] transition hover:bg-red-400"
        >
          Open Case
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}

function EvidenceRow({ item, onClick }) {
  const investigated =
    item.status?.toUpperCase() === "INVESTIGATED";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-left transition hover:border-red-500/30 hover:bg-red-500/[0.035]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
        <FileSearch size={17} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold group-hover:text-red-300">
            {item.title}
          </p>

          <span className="rounded-full border border-white/10 px-2 py-1 text-[8px] uppercase tracking-wider text-gray-500">
            {item.type}
          </span>
        </div>

        <p className="mt-1 text-xs leading-5 text-gray-500">
          {item.content}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-4 text-[9px] uppercase tracking-wider">
          <span
            className={
              investigated
                ? "text-emerald-400"
                : "text-amber-400"
            }
          >
            {item.status}
          </span>

          <span className="text-gray-600">
            Score {item.score ?? 0}
          </span>

          <span className="ml-auto text-gray-700 transition group-hover:text-red-400">
            Open evidence →
          </span>
        </div>
      </div>
    </button>
  );
}

function EvidenceModal({
  evidence,
  investigating,
  onClose,
  onInvestigate,
  onAiAnalyze,
}) {
  const investigated =
    evidence.status?.toUpperCase() === "INVESTIGATED";

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#0d0d0d] shadow-[0_0_100px_rgba(0,0,0,0.85)]">
        <div className="border-b border-white/[0.07] bg-gradient-to-r from-red-950/30 to-transparent p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold tracking-[0.35em] text-red-500">
                DIGITAL EVIDENCE
              </p>

              <h3 className="mt-2 font-serif text-2xl font-bold sm:text-3xl">
                {evidence.title}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-gray-500 transition hover:border-red-500/30 hover:text-white"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-7">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MiniStat
              label="Source"
              value={evidence.type}
            />

            <MiniStat
              label="Score"
              value={evidence.score ?? 0}
            />

            <MiniStat
              label="Status"
              value={evidence.status}
              danger={!investigated}
            />
          </div>

          <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-600">
              Evidence Observation
            </p>

            <p className="mt-3 text-sm leading-7 text-gray-300">
              {evidence.content ||
                "No evidence description available."}
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-red-500/15 bg-red-500/[0.035] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-red-400">
                  AI ASSISTED INVESTIGATION
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Analyze this evidence for patterns, red flags and next actions.
                </p>
              </div>
              <button
                type="button"
                onClick={onAiAnalyze}
                className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-300 transition hover:border-red-500/50 hover:bg-red-500/15 hover:text-white"
              >
                <span className="text-sm">✦</span>
                AI Analyze Evidence
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-600">
              {investigated
                ? "This evidence has already been investigated."
                : "Review this evidence before marking it investigated."}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-400 transition hover:bg-white/5 hover:text-white"
              >
                Close
              </button>

              {!investigated && (
                <button
                  type="button"
                  onClick={onInvestigate}
                  disabled={investigating}
                  className="flex items-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {investigating ? (
                    <>
                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />
                      Investigating...
                    </>
                  ) : (
                    <>
                      <Target size={16} />
                      Investigate Evidence
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiEvidenceAnalysisModal({ evidence, onClose }) {
  const score = Math.min(100, Math.max(0, Number(evidence.score || 0)));
  const risk = score >= 75 ? "HIGH" : score >= 45 ? "MEDIUM" : "LOW";
  const confidence = Math.max(62, Math.min(96, score + 8));

  const finding =
    score >= 75
      ? "The evidence shows a strong signal that deserves deeper investigation."
      : score >= 45
        ? "The evidence contains a meaningful signal, but additional context is needed."
        : "The evidence currently shows a limited signal and should be verified before drawing conclusions.";

  const redFlag =
    evidence.type?.toUpperCase() === "DELETED_ITEMS"
      ? "Deleted activity may indicate a gap in the reported timeline."
      : "The evidence should be cross-checked with related activity and timestamps.";

  const action =
    evidence.type?.toUpperCase() === "MESSAGES"
      ? "Check related messages and the surrounding conversation."
      : "Compare this evidence with related records and the investigation timeline.";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-red-500/15 bg-[#0d0d0d] shadow-[0_0_100px_rgba(0,0,0,0.85)]">
        <div className="border-b border-white/[0.07] bg-gradient-to-r from-red-950/35 to-transparent p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold tracking-[0.35em] text-red-500">
                AI EVIDENCE ANALYSIS
              </p>
              <h3 className="mt-2 font-serif text-2xl font-bold sm:text-3xl">
                Investigation Insight
              </h3>
              <p className="mt-2 max-w-xl text-xs leading-5 text-gray-500">
                AI-assisted review of “{evidence.title}”. Use this as an investigative lead, not as final proof.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-gray-500 transition hover:border-red-500/30 hover:text-white"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-6 sm:p-7">
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniStat label="Risk Level" value={risk} danger={risk === "HIGH"} />
            <MiniStat label="AI Confidence" value={`${confidence}%`} />
            <MiniStat label="Evidence Score" value={`${score}%`} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <AiInsight label="Key Finding" text={finding} />
            <AiInsight label="Red Flag" text={redFlag} danger />
            <AiInsight
              label="Why It Matters"
              text="This signal can help the investigator decide which part of the case deserves closer review."
            />
            <AiInsight label="Recommended Action" text={action} />
          </div>

          <div className="flex items-center justify-between border-t border-white/[0.07] pt-4">
            <p className="text-[10px] text-gray-600">
              AI suggestion · investigator verification required
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-red-500 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-red-400"
            >
              Back to Evidence
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiInsight({ label, text, danger = false }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        danger
          ? "border-red-500/15 bg-red-500/[0.035]"
          : "border-white/[0.07] bg-white/[0.02]"
      }`}
    >
      <p className={`text-[9px] font-bold uppercase tracking-[0.22em] ${
        danger ? "text-red-400" : "text-gray-600"
      }`}>
        {label}
      </p>
      <p className="mt-2 text-xs leading-6 text-gray-300">{text}</p>
    </div>
  );
}

function AiChatPanel({ messages, input, onInputChange, onSend, onClose, activeCase }) {
  return (
    <>
      {/* Soft backdrop: keeps the dashboard visible instead of hiding it */}
      <div
        className="fixed inset-0 z-[105] bg-black/20 backdrop-blur-[7px]"
        onClick={onClose}
      />

      {/* Compact premium floating assistant */}
      <div className="fixed right-6 top-1/2 z-[110] flex h-[min(680px,calc(100vh-110px))] w-[390px] max-w-[calc(100vw-2rem)] -translate-y-1/2 flex-col overflow-hidden rounded-[28px] border border-red-500/35 bg-[#0b0809]/72 shadow-[0_25px_90px_rgba(0,0,0,0.65),0_0_55px_rgba(239,68,68,0.08)] backdrop-blur-2xl">
        {/* subtle red glass glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-red-500/[0.10] blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-red-900/[0.08] blur-[90px]" />

        {/* Header */}
        <div className="relative flex shrink-0 items-center justify-between border-b border-white/[0.09] bg-white/[0.025] px-5 py-4 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-500/45 bg-red-500/[0.06] text-red-400 shadow-[0_0_24px_rgba(239,68,68,0.10)]">
              <span className="text-lg">✦</span>
            </div>

            <div className="min-w-0">
              <p className="text-[9px] font-bold tracking-[0.28em] text-red-500">
                INVESTIGATION AI
              </p>
              <h3 className="mt-0.5 truncate font-serif text-[21px] font-bold tracking-tight text-white">
                Investigator Assistant
              </h3>
              <p className="mt-0.5 truncate text-[10px] text-gray-500">
                {activeCase
                  ? `Case ${String(activeCase.id).padStart(3, "0")} · ${activeCase.title}`
                  : "Investigation assistant"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI Assistant"
            className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.12] bg-white/[0.025] text-gray-500 transition hover:border-red-500/45 hover:bg-red-500/[0.07] hover:text-white"
          >
            <X size={17} />
          </button>
        </div>

        {/* Messages */}
        <div className="relative min-h-0 flex-1 overflow-y-auto px-5 py-6">
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role !== "user" && (
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-500/35 bg-red-500/[0.035] text-red-400">
                    <span className="text-[11px]">✦</span>
                  </div>
                )}

                {message.role === "user" ? (
                  <div className="max-w-[82%] rounded-[18px] rounded-tr-md border border-red-500/35 bg-red-500/[0.13] px-4 py-2.5 text-[12px] leading-5 text-red-50 shadow-[0_8px_25px_rgba(239,68,68,0.07)] backdrop-blur-xl">
                    {message.text}
                  </div>
                ) : (
                  <div className="max-w-[84%] pt-0.5 text-[13px] leading-6 text-gray-200">
                    {message.text}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Composer */}
        <div className="relative shrink-0 border-t border-white/[0.08] bg-black/[0.18] px-4 pb-3.5 pt-3.5 backdrop-blur-2xl">
          <div className="mb-2.5 flex items-center gap-2 px-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-[9px] font-semibold tracking-[0.20em] text-gray-500">
              AI READY · CASE CONTEXT ACTIVE
            </span>
          </div>

          <div className="flex items-end gap-2 rounded-[20px] border border-red-500/40 bg-black/[0.25] p-2 backdrop-blur-xl focus-within:border-red-500/65">
            <textarea
              value={input}
              onChange={(event) => onInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSend();
                }
              }}
              rows={2}
              placeholder="Ask about this investigation..."
              className="max-h-20 min-h-[42px] flex-1 resize-none bg-transparent px-2 py-2 text-[12px] text-white outline-none placeholder:text-gray-600"
            />

            <button
              type="button"
              onClick={onSend}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white shadow-[0_0_24px_rgba(239,68,68,0.22)] transition hover:bg-red-400"
            >
              <ArrowRight size={17} />
            </button>
          </div>

          <p className="mt-2 text-center text-[9px] text-gray-600">
            AI can make mistakes · Verify important findings
          </p>
        </div>
      </div>
    </>
  );
}

function MiniStat({
  label,
  value,
  danger = false,
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="text-[9px] uppercase tracking-widest text-gray-600">
        {label}
      </p>

      <p
        className={`mt-1 text-xs font-semibold ${
          danger
            ? "text-red-400"
            : "text-white"
        }`}
      >
        {value || "UNKNOWN"}
      </p>
    </div>
  );
}

function LoadingBox() {
  return (
    <div className="flex min-h-[330px] items-center justify-center rounded-2xl border border-white/[0.07] bg-[#0e0e0e]">
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <RefreshCw
          size={18}
          className="animate-spin"
        />
        Loading investigation...
      </div>
    </div>
  );
}

function EmptyCases({ onCreate }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-[#0e0e0e]">
      <div className="text-center">
        <FolderOpen
          size={35}
          className="mx-auto text-gray-700"
        />

        <p className="mt-4 text-sm font-semibold text-gray-400">
          No cases found
        </p>

        <p className="mt-1 text-xs text-gray-600">
          Create your first investigation.
        </p>

        <button
          onClick={onCreate}
          className="mt-5 rounded-xl bg-red-500 px-4 py-2 text-xs font-semibold hover:bg-red-400"
        >
          Create Case
        </button>
      </div>
    </div>
  );
}

function NotesPage({
  notes,
  totalCount,
  cases,
  activeCase,
  searchTerm,
  onSearchChange,
  loading,
  onRefresh,
  onAdd,
  onEdit,
  onDelete,
}) {
  const filteredNotes = notes
    .filter((note) => {
      const query = searchTerm.trim().toLowerCase();
      return !query || `${note.title} ${note.content || ""}`.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      if (Boolean(b.pinned) !== Boolean(a.pinned)) return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      return Number(b.id) - Number(a.id);
    });

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0b0808] px-6 py-7 sm:px-8 lg:py-9">
        <div className="absolute inset-0 bg-gradient-to-r from-red-950/[0.2] via-transparent to-transparent" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.4em] text-red-500">INVESTIGATION MEMORY</p>
            <h2 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">Case <span className="text-red-500">Notes.</span></h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500">
              Record observations, contradictions and reminders while you investigate.
            </p>
          </div>
          <button
            type="button"
            onClick={onAdd}
            disabled={!activeCase}
            className="flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={18} />
            Add Note
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <EvidenceStat label="This Case" value={notes.length} />
        <EvidenceStat label="All Notes" value={totalCount} />
        <EvidenceStat label="Pinned" value={notes.filter((note) => note.pinned).length} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-[#0b0b0b] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search notes..."
            className="w-full rounded-xl border border-white/10 bg-white/[0.025] py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-gray-700 focus:border-red-500/40"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-600">{activeCase ? activeCase.title : "No active case"}</span>
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 transition hover:bg-white/5 hover:text-white"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingBox />
      ) : !activeCase ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-[#0b0b0b] p-12 text-center">
          <FileText size={30} className="mx-auto text-gray-700" />
          <h3 className="mt-4 font-serif text-2xl font-bold">No case selected</h3>
          <p className="mt-2 text-sm text-gray-600">Open or create a case before adding notes.</p>
        </div>
      ) : filteredNotes.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredNotes.map((note) => (
            <div key={note.id} className="rounded-3xl border border-white/[0.08] bg-[#0b0b0b] p-5 transition hover:-translate-y-1 hover:border-red-500/25">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="shrink-0 text-red-400" />
                    <h3 className="truncate font-serif text-xl font-bold">{note.title}</h3>
                  </div>
                  {note.pinned && (
                    <span className="mt-2 inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-amber-400">Pinned</span>
                  )}
                </div>
                <span className="rounded-full border border-white/10 px-2 py-1 text-[8px] uppercase tracking-wider text-gray-600">Note</span>
              </div>

              <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-gray-500">{note.content}</p>

              <div className="mt-5 flex gap-2 border-t border-white/[0.06] pt-4">
                <button type="button" onClick={() => onEdit(note)} className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-gray-400 transition hover:bg-white/5 hover:text-white">Edit</button>
                <button type="button" onClick={() => onDelete(note)} className="rounded-xl border border-red-500/15 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/10"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-white/10 bg-[#0b0b0b] p-12 text-center">
          <FileText size={30} className="mx-auto text-gray-700" />
          <h3 className="mt-4 font-serif text-2xl font-bold">No notes yet</h3>
          <p className="mt-2 text-sm text-gray-600">{searchTerm ? "Try another search term." : "Record your first investigation note."}</p>
          {!searchTerm && <button type="button" onClick={onAdd} className="mt-6 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold hover:bg-red-400">Add First Note</button>}
        </div>
      )}
    </section>
  );
}

function PeoplePage({
  people,
  totalCount,
  cases,
  activeCase,
  loading,
  onRefresh,
  onAdd,
  onEdit,
  onDelete,
}) {
  const initials = (name) =>
    String(name || "?")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0b0808] px-6 py-7 sm:px-8 lg:py-9">
        <div className="absolute inset-0 bg-gradient-to-r from-red-950/[0.2] via-transparent to-transparent" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.4em] text-red-500">
              INVESTIGATION NETWORK
            </p>
            <h2 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">
              The <span className="text-red-500">People.</span>
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500">
              Track subjects, witnesses and other people connected to an investigation.
            </p>
          </div>

          <button
            type="button"
            onClick={onAdd}
            disabled={!activeCase}
            className="flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={18} />
            Add Person
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <EvidenceStat label="This Case" value={people.length} />
        <EvidenceStat label="All People" value={totalCount} />
        <EvidenceStat label="Cases" value={cases.length} />
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-[#0b0b0b] p-4">
        <div>
          <p className="text-sm font-semibold">
            {activeCase ? activeCase.title : "No active case"}
          </p>
          <p className="mt-1 text-[10px] text-gray-600">
            People are linked to the currently selected case.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 transition hover:bg-white/5 hover:text-white"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {loading ? (
        <LoadingBox />
      ) : !activeCase ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-[#0b0b0b] p-12 text-center">
          <Users size={30} className="mx-auto text-gray-700" />
          <h3 className="mt-4 font-serif text-2xl font-bold">No case selected</h3>
          <p className="mt-2 text-sm text-gray-600">
            Open or create a case before adding people.
          </p>
        </div>
      ) : people.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {people.map((person) => (
            <div
              key={person.id}
              className="group rounded-3xl border border-white/[0.08] bg-[#0b0b0b] p-5 transition duration-300 hover:-translate-y-1 hover:border-red-500/25"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 font-semibold text-red-300">
                    {initials(person.name)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold">{person.name}</h3>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-red-400">
                      {person.role || "Unknown role"}
                    </p>
                  </div>
                </div>

                <span className="rounded-full border border-white/10 px-2 py-1 text-[8px] uppercase tracking-wider text-gray-600">
                  Person
                </span>
              </div>

              {person.contact && (
                <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-gray-400">
                  {person.contact}
                </div>
              )}

              <p className="mt-4 min-h-[48px] text-xs leading-5 text-gray-600">
                {person.notes || "No investigation notes recorded."}
              </p>

              <div className="mt-5 flex gap-2 border-t border-white/[0.06] pt-4">
                <button
                  type="button"
                  onClick={() => onEdit(person)}
                  className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-gray-400 transition hover:bg-white/5 hover:text-white"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(person)}
                  className="rounded-xl border border-red-500/15 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/10"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-white/10 bg-[#0b0b0b] p-12 text-center">
          <Users size={30} className="mx-auto text-gray-700" />
          <h3 className="mt-4 font-serif text-2xl font-bold">No people yet</h3>
          <p className="mt-2 text-sm text-gray-600">
            Add the subject, witnesses or anyone connected to this case.
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-6 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold hover:bg-red-400"
          >
            Add First Person
          </button>
        </div>
      )}
    </section>
  );
}

function SettingsPage({
  settings,
  onUpdate,
  onReset,
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <p className="text-[10px] font-bold tracking-[0.35em] text-red-500">
          SYSTEM PREFERENCES
        </p>
        <h2 className="mt-2 font-serif text-4xl font-bold">
          Settings
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
          Personalize your investigation workspace. These preferences are
          stored locally in your browser.
        </p>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-6">
          <p className="text-[10px] font-bold tracking-[0.25em] text-gray-500">
            INVESTIGATOR PROFILE
          </p>
          <h3 className="mt-2 text-lg font-semibold">Display name</h3>
          <p className="mt-1 text-xs text-gray-600">
            This name appears in the sidebar and header.
          </p>

          <div className="mt-5 flex gap-3">
            <input
              value={settings.investigatorName}
              onChange={(event) =>
                onUpdate({ investigatorName: event.target.value })
              }
              maxLength={40}
              className="h-12 flex-1 rounded-xl border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none placeholder:text-gray-700 focus:border-red-500/40"
              placeholder="Your investigator name"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-6">
          <p className="text-[10px] font-bold tracking-[0.25em] text-gray-500">
            INVESTIGATION BEHAVIOR
          </p>

          <div className="mt-5 divide-y divide-white/[0.06]">
            <SettingToggle
              title="Auto refresh"
              description="Refresh cases, evidence, clues, people and notes every 30 seconds."
              checked={settings.autoRefresh}
              onChange={(checked) => onUpdate({ autoRefresh: checked })}
            />

            <SettingToggle
              title="Notifications"
              description="Keep investigation notification indicators enabled."
              checked={settings.notifications}
              onChange={(checked) => onUpdate({ notifications: checked })}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.03] p-6">
          <p className="text-[10px] font-bold tracking-[0.25em] text-red-500">
            DANGER ZONE
          </p>
          <h3 className="mt-2 text-lg font-semibold">Reset preferences</h3>
          <p className="mt-1 text-xs leading-6 text-gray-600">
            Restore the default investigator name and preference switches.
            Your cases, evidence, clues, people and notes are not deleted.
          </p>

          <button
            type="button"
            onClick={() => {
              if (window.confirm("Reset investigation preferences?")) {
                onReset();
              }
            }}
            className="mt-5 rounded-xl border border-red-500/20 px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
          >
            Reset Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingToggle({
  title,
  description,
  checked,
  onChange,
}) {
  return (
    <div className="flex items-center justify-between gap-5 py-5">
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-600">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
          checked
            ? "border-red-500/50 bg-red-500/20"
            : "border-white/10 bg-white/[0.04]"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full transition-all ${
            checked
              ? "left-6 bg-red-400"
              : "left-1 bg-gray-600"
          }`}
        />
      </button>
    </div>
  );
}

function ComingSoonPage({
  title,
  onBack,
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400">
          <Puzzle size={27} />
        </div>

        <p className="mt-6 text-[10px] font-bold tracking-[0.3em] text-red-500">
          INVESTIGATION MODULE
        </p>

        <h2 className="mt-2 font-serif text-4xl font-bold">
          {title}
        </h2>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-600">
          This module is ready to be connected to
          the investigation engine.
        </p>

        <button
          onClick={onBack}
          className="mt-6 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-400 hover:bg-white/5 hover:text-white"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  active = false,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-sm transition-all duration-200 ${
        active
          ? "border-red-500/40 bg-red-500/10 text-white shadow-[0_0_25px_rgba(239,68,68,0.08)]"
          : "border-transparent text-gray-500 hover:border-white/[0.04] hover:bg-white/[0.035] hover:text-white"
      }`}
    >
      <Icon
        size={18}
        className={`shrink-0 transition-colors ${
          active
            ? "text-red-400"
            : "text-gray-600 group-hover:text-gray-300"
        }`}
      />

      <span>{label}</span>
    </button>
  );
}

function StatCard({
  icon: Icon,
  value,
  title,
  subtitle,
  color,
}) {
  const colors = {
    red: {
      icon: "border-red-500/30 bg-red-500/10 text-red-400",
      hover: "hover:border-red-500/30",
    },

    amber: {
      icon: "border-amber-500/30 bg-amber-500/10 text-amber-400",
      hover: "hover:border-amber-500/30",
    },

    green: {
      icon: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      hover: "hover:border-emerald-500/30",
    },
  };

  return (
    <div
      className={`group rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-5 transition-all duration-300 hover:-translate-y-1 ${colors[color].hover}`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl border ${colors[color].icon}`}
        >
          <Icon size={20} />
        </div>

        <span className="text-[10px] text-gray-700">
          LIVE
        </span>
      </div>

      <p className="mt-5 text-3xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-sm font-medium">
        {title}
      </p>

      <p className="mt-1 text-[11px] text-gray-600">
        {subtitle}
      </p>
    </div>
  );
}

export default App;