/**
 * Brass & Ledger design system: an editorial client-workspace with warm paper surfaces,
 * ink-navy structure, and Ledger Vermilion reserved for active actions and priorities.
 */
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Copy,
  FilePenLine,
  Flag,
  Handshake,
  Inbox,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings2,
  Sparkles,
  Target,
  TimerReset,
  UserRoundPlus,
  UsersRound,
  Workflow,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { decryptWorkspaceBackup, encryptWorkspaceBackup, isEncryptedWorkspaceBackup, type EncryptedWorkspaceBackup } from "@/lib/encryptedBackup";
import { evaluatePassphrase } from "@/lib/passphraseStrength";
import { canConfirmReplacement } from "@/lib/restoreConfirmation";
import { prepareWorkspaceRestore } from "@/lib/workspaceRestore";

type View =
  | "briefing"
  | "prospects"
  | "offer"
  | "scope"
  | "onboarding"
  | "kickoff"
  | "delivery"
  | "templates"
  | "closeout";

const ASSETS = {
  hero: "/manus-storage/leadflow-hero-ledger_d838f236.jpg",
  workflow: "/manus-storage/leadflow-workflow-cards_471468ba.jpg",
  research: "/manus-storage/leadflow-research-pinboard_868cce16.jpg",
  handoff: "/manus-storage/leadflow-handoff_c7867d35.jpg",
  logo: "/manus-storage/leadflow-logo_6548d1b6.png",
};

const navItems: Array<{ key: View; label: string; icon: typeof LayoutDashboard; step: string }> = [
  { key: "briefing", label: "Today’s briefing", icon: LayoutDashboard, step: "00" },
  { key: "prospects", label: "Prospects", icon: Target, step: "01" },
  { key: "offer", label: "The $350 offer", icon: CircleDollarSign, step: "02" },
  { key: "scope", label: "Scope builder", icon: FilePenLine, step: "03" },
  { key: "onboarding", label: "Client onboarding", icon: UserRoundPlus, step: "04" },
  { key: "kickoff", label: "Kickoff desk", icon: CalendarDays, step: "05" },
  { key: "delivery", label: "Seven-day delivery", icon: Workflow, step: "06" },
  { key: "templates", label: "Messages & testing", icon: MessageSquareText, step: "07" },
  { key: "closeout", label: "Handoff & follow-up", icon: Handshake, step: "08" },
];

const initialProspects = [
  {
    business: "Cedar & Stone Plumbing",
    niche: "Home services",
    signal: "Quote form has no response-time expectation",
    status: "Ready to write",
    color: "bg-[#f2d1c9] text-[#7d2d20]",
  },
  {
    business: "Marlow Dental Studio",
    niche: "Healthcare",
    signal: "Recent reviews mention slow callback times",
    status: "Follow up Friday",
    color: "bg-[#e9ddc7] text-[#73511e]",
  },
  {
    business: "Northline Electric",
    niche: "Trade services",
    signal: "Busy-season hiring announcement",
    status: "Observation sent",
    color: "bg-[#d7e3db] text-[#315d49]",
  },
];

type ScopeFields = { business: string; source: string; tool: string };
type WorkspaceSnapshot = {
  id: string;
  clientName: string;
  projectName: string;
  prospects: typeof initialProspects;
  doneDays: number[];
  checkedKickoff: number[];
  testDone: number[];
  scopeFields: ScopeFields;
  projectComplete: boolean;
};

type WorkspaceBackup = {
  format: "LeadFlow Workspace Backup";
  version: 1;
  exportedAt: string;
  activeWorkspaceId: string;
  workspaces: WorkspaceSnapshot[];
};

type PendingBackup =
  | { kind: "plain"; backup: WorkspaceBackup }
  | { kind: "encrypted"; backup: EncryptedWorkspaceBackup };

const defaultScopeFields: ScopeFields = {
  business: "[Client legal name]",
  source: "website inquiry form",
  tool: "their existing shared inbox",
};

const makeWorkspace = (id: string, clientName: string, projectName = ""): WorkspaceSnapshot => ({
  id,
  clientName,
  projectName,
  prospects: initialProspects.map((prospect) => ({ ...prospect })),
  doneDays: [0, 1],
  checkedKickoff: [0, 1],
  testDone: [0],
  scopeFields: { ...defaultScopeFields, business: clientName === "Untitled client" ? defaultScopeFields.business : clientName },
  projectComplete: false,
});

const cloneWorkspace = (workspace: WorkspaceSnapshot): WorkspaceSnapshot => ({
  ...workspace,
  prospects: workspace.prospects.map((prospect) => ({ ...prospect })),
  scopeFields: { ...workspace.scopeFields },
  doneDays: [...workspace.doneDays],
  checkedKickoff: [...workspace.checkedKickoff],
  testDone: [...workspace.testDone],
});

const isProspectRecord = (value: unknown) => {
  if (!value || typeof value !== "object") return false;
  const prospect = value as Partial<(typeof initialProspects)[number]>;
  return typeof prospect.business === "string" && typeof prospect.niche === "string" && typeof prospect.signal === "string" && typeof prospect.status === "string" && typeof prospect.color === "string";
};

const isWorkspaceSnapshot = (value: unknown): value is WorkspaceSnapshot => {
  if (!value || typeof value !== "object") return false;
  const workspace = value as Partial<WorkspaceSnapshot>;
  return typeof workspace.id === "string" && typeof workspace.clientName === "string" && typeof workspace.projectName === "string" && Array.isArray(workspace.prospects) && workspace.prospects.every(isProspectRecord) && Array.isArray(workspace.doneDays) && workspace.doneDays.every((value) => Number.isInteger(value) && value >= 0 && value < deliveryDays.length) && Array.isArray(workspace.checkedKickoff) && workspace.checkedKickoff.every((value) => Number.isInteger(value) && value >= 0 && value < kickoffRows.length) && Array.isArray(workspace.testDone) && workspace.testDone.every((value) => Number.isInteger(value) && value >= 0 && value < 5) && Boolean(workspace.scopeFields) && typeof workspace.scopeFields?.business === "string" && typeof workspace.scopeFields?.source === "string" && typeof workspace.scopeFields?.tool === "string" && typeof workspace.projectComplete === "boolean";
};

const isWorkspaceBackup = (value: unknown): value is WorkspaceBackup => {
  if (!value || typeof value !== "object") return false;
  const backup = value as Partial<WorkspaceBackup>;
  return backup.format === "LeadFlow Workspace Backup" && backup.version === 1 && typeof backup.exportedAt === "string" && typeof backup.activeWorkspaceId === "string" && Array.isArray(backup.workspaces) && backup.workspaces.length > 0 && backup.workspaces.every(isWorkspaceSnapshot);
};

const kickoffRows = [
  ["0–5", "Scope confirmation", "Confirm goal, decision-maker, and the one lead source."],
  ["5–12", "Current lead journey", "Map where inquiries arrive, who responds, and where leads disappear."],
  ["12–20", "Target workflow", "Agree trigger, first response, two follow-ups, and stop rules."],
  ["20–28", "Customer messaging", "Set audience, tone, approved claims, and the desired next action."],
  ["28–34", "Tool & access", "Choose the existing tool and confirm invitation-based access."],
  ["34–39", "Testing & success", "Pick test inquiries and define what useful completion looks like."],
  ["39–43", "Dates & responsibilities", "Lock approvals, test date, and handoff time."],
  ["43–45", "Recap & close", "Restate the plan, exclusions, and immediate next action."],
];

const deliveryDays = [
  ["Day 1", "Kickoff and current-state map", "Send recap with decisions and dates."],
  ["Day 2", "Draft the workflow", "Share current-versus-proposed lead journey."],
  ["Day 3", "Write the three messages", "Initial response, follow-up, final check-in."],
  ["Day 4", "Build the simple tracker", "Configure one agreed existing tool."],
  ["Day 5", "Run three safe tests", "Confirm handoff, status, and stop rules."],
  ["Day 6", "Prepare the operating guide", "Record normal use and weekly review ritual."],
  ["Day 7", "Handoff and closeout", "Walk through the process and issue final delivery."],
];

const messageTemplates = [
  {
    title: "Initial response",
    label: "First contact",
    body: `Hi [Customer First Name],\n\nThank you for reaching out about [service]. We received your message and will review it shortly.\n\nTo help us respond accurately, please reply with [key detail]. You can also [call / book] at [contact method].\n\nThank you,\n[Business Name]`,
  },
  {
    title: "Follow-up",
    label: "Gentle nudge",
    body: `Hi [Customer First Name],\n\nI wanted to follow up on your recent inquiry about [service]. We would be happy to help.\n\nIf you are still looking for assistance, please reply with [key detail] or [call / book] at [contact method].\n\nThank you,\n[Business Name]`,
  },
  {
    title: "Final check-in",
    label: "Close the loop",
    body: `Hi [Customer First Name],\n\nJust checking in one last time about your inquiry regarding [service]. If you still need help, reply here or [call / book] at [contact method].\n\nIf your needs have changed, no response is needed.\n\nBest,\n[Business Name]`,
  },
];

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warm" | "green" | "ink" }) {
  const tones = {
    neutral: "bg-[#f4f0e7] text-[#6c6256] border-[#e4dccd]",
    warm: "bg-[#fae6e1] text-[#9f392a] border-[#f0c6bd]",
    green: "bg-[#e1eee7] text-[#2c6a4f] border-[#c6dfd0]",
    ink: "bg-[#e7eced] text-[#183b4a] border-[#cfd9dd]",
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${tones[tone]}`}>{children}</span>;
}

function SectionTop({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 border-b border-[#ded7ca] pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#c44832]">{eyebrow}</p>
        <h1 className="font-display text-4xl leading-none tracking-[-0.045em] text-[#123342] sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6c6256]">{detail}</p>
      </div>
      {action}
    </div>
  );
}

export default function Home() {
  const [active, setActive] = useState<View>("briefing");
  const [showProspectForm, setShowProspectForm] = useState(false);
  const [showWorkspaceManager, setShowWorkspaceManager] = useState(false);
  const [showEncryptionForm, setShowEncryptionForm] = useState(false);
  const [showReplaceConfirmation, setShowReplaceConfirmation] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [pendingBackup, setPendingBackup] = useState<PendingBackup | null>(null);
  const [exportPassphrase, setExportPassphrase] = useState("");
  const [confirmExportPassphrase, setConfirmExportPassphrase] = useState("");
  const [importPassphrase, setImportPassphrase] = useState("");
  const [workspaces, setWorkspaces] = useState<WorkspaceSnapshot[]>([makeWorkspace("first-workspace", "Your first client")]);
  const [workspaceId, setWorkspaceId] = useState("first-workspace");
  const [prospects, setProspects] = useState(initialProspects);
  const [draftBusiness, setDraftBusiness] = useState("");
  const [draftSignal, setDraftSignal] = useState("");
  const [doneDays, setDoneDays] = useState<number[]>([0, 1]);
  const [checkedKickoff, setCheckedKickoff] = useState<number[]>([0, 1]);
  const [testDone, setTestDone] = useState<number[]>([0]);
  const [notice, setNotice] = useState("Your workspace is ready for the next move.");
  const [scopeFields, setScopeFields] = useState<ScopeFields>({ ...defaultScopeFields });
  const [projectComplete, setProjectComplete] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const currentWorkspace = workspaces.find((workspace) => workspace.id === workspaceId) ?? workspaces[0];
  const workspaceTitle = currentWorkspace.projectName.trim() || currentWorkspace.clientName;
  const plainPendingBackup = pendingBackup?.kind === "plain" ? pendingBackup.backup : null;

  const loadWorkspace = (workspace: WorkspaceSnapshot) => {
    setProspects(workspace.prospects);
    setDoneDays(workspace.doneDays);
    setCheckedKickoff(workspace.checkedKickoff);
    setTestDone(workspace.testDone);
    setScopeFields(workspace.scopeFields);
    setProjectComplete(workspace.projectComplete);
  };

  useEffect(() => {
    const collectionRaw = window.localStorage.getItem("leadflow-workspaces");
    const activeWorkspaceId = window.localStorage.getItem("leadflow-active-workspace");
    if (collectionRaw) {
      try {
        const savedWorkspaces = JSON.parse(collectionRaw) as WorkspaceSnapshot[];
        if (Array.isArray(savedWorkspaces) && savedWorkspaces.length > 0) {
          const selected = savedWorkspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? savedWorkspaces[0];
          setWorkspaces(savedWorkspaces);
          setWorkspaceId(selected.id);
          loadWorkspace(selected);
        }
      } catch {
        window.localStorage.removeItem("leadflow-workspaces");
      }
    } else {
      const legacyRaw = window.localStorage.getItem("leadflow-workspace-state");
      if (legacyRaw) {
        try {
          const legacy = JSON.parse(legacyRaw) as Partial<WorkspaceSnapshot>;
          const migrated = {
            ...makeWorkspace("first-workspace", legacy.scopeFields?.business && legacy.scopeFields.business !== defaultScopeFields.business ? legacy.scopeFields.business : "Your first client"),
            prospects: Array.isArray(legacy.prospects) ? legacy.prospects : initialProspects,
            doneDays: Array.isArray(legacy.doneDays) ? legacy.doneDays : [0, 1],
            checkedKickoff: Array.isArray(legacy.checkedKickoff) ? legacy.checkedKickoff : [0, 1],
            testDone: Array.isArray(legacy.testDone) ? legacy.testDone : [0],
            scopeFields: legacy.scopeFields ?? defaultScopeFields,
            projectComplete: Boolean(legacy.projectComplete),
          };
          setWorkspaces([migrated]);
          loadWorkspace(migrated);
          window.localStorage.removeItem("leadflow-workspace-state");
        } catch {
          window.localStorage.removeItem("leadflow-workspace-state");
        }
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setWorkspaces((items) => items.map((workspace) => workspace.id === workspaceId ? { ...workspace, prospects, doneDays, checkedKickoff, testDone, scopeFields, projectComplete } : workspace));
  }, [hydrated, prospects, doneDays, checkedKickoff, testDone, scopeFields, projectComplete]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("leadflow-workspaces", JSON.stringify(workspaces));
    window.localStorage.setItem("leadflow-active-workspace", workspaceId);
  }, [hydrated, workspaces, workspaceId]);

  const progress = Math.round((doneDays.length / deliveryDays.length) * 100);
  const activeLabel = navItems.find((item) => item.key === active)?.label ?? "Workspace";

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`${label} copied to your clipboard.`);
    } catch {
      setNotice(`${label} is ready to copy from the workspace.`);
    }
  };

  const toggleNumber = (id: number, values: number[], setValues: (values: number[]) => void) => {
    setValues(values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);
  };

  const addProspect = () => {
    if (!draftBusiness.trim()) {
      setNotice("Add a business name before saving the observation.");
      return;
    }
    setProspects([
      { business: draftBusiness, niche: "Local business", signal: draftSignal || "Observation to verify", status: "Ready to write", color: "bg-[#e7eced] text-[#183b4a]" },
      ...prospects,
    ]);
    setDraftBusiness("");
    setDraftSignal("");
    setShowProspectForm(false);
    setNotice("Prospect added to your working queue.");
  };

  const scopeCopy = useMemo(
    () => `7-Day Lead Follow-Up Tune-Up\n\nClient: ${scopeFields.business}\nPrimary lead source: ${scopeFields.source}\nAgreed tool: ${scopeFields.tool}\n\nIncluded: one 45-minute kickoff, one workflow summary, three customer messages, one simple tracker/workflow, up to three tests, and a 30-minute handoff.\n\nFixed fee: $350. The scope excludes new software subscriptions, paid advertising, custom code, complex integrations, multiple lead sources, and work not approved in writing.`,
    [scopeFields],
  );

  const completionReady = doneDays.length === deliveryDays.length && testDone.length === 5 && checkedKickoff.length === kickoffRows.length;

  const updateWorkspaceNames = (clientName: string, projectName: string) => {
    setWorkspaces((items) => items.map((workspace) => workspace.id === workspaceId ? { ...workspace, clientName: clientName || "Untitled client", projectName } : workspace));
    if (scopeFields.business === currentWorkspace.clientName || scopeFields.business === defaultScopeFields.business) setScopeFields({ ...scopeFields, business: clientName || defaultScopeFields.business });
  };

  const switchWorkspace = (id: string) => {
    const destination = workspaces.find((workspace) => workspace.id === id);
    if (!destination || destination.id === workspaceId) return;
    setWorkspaceId(destination.id);
    loadWorkspace(destination);
    setActive("briefing");
    setShowWorkspaceManager(false);
    setNotice(`Switched to ${destination.projectName || destination.clientName}.`);
  };

  const createWorkspace = () => {
    const id = `workspace-${Date.now()}`;
    const created = makeWorkspace(id, newClientName.trim() || "Untitled client", newProjectName.trim());
    setWorkspaces((items) => [...items, created]);
    setWorkspaceId(id);
    loadWorkspace(created);
    setNewClientName("");
    setNewProjectName("");
    setActive("briefing");
    setNotice(`Created ${created.projectName || created.clientName}.`);
  };

  const removeWorkspace = (id: string) => {
    if (workspaces.length === 1) {
      setNotice("Keep at least one workspace in LeadFlow.");
      return;
    }
    const remaining = workspaces.filter((workspace) => workspace.id !== id);
    const next = remaining.find((workspace) => workspace.id !== workspaceId) ?? remaining[0];
    setWorkspaces(remaining);
    if (id === workspaceId) {
      setWorkspaceId(next.id);
      loadWorkspace(next);
      setActive("briefing");
    }
    setNotice("Workspace removed from this browser.");
  };

  const downloadClientPackage = () => {
    const packageText = `LEADFLOW CLIENT PACKAGE\n\n${scopeCopy}\n\nONBOARDING QUESTIONS\nBusiness name:\nPrimary project contact:\nOne lead source in scope:\nWhat happens after a new inquiry arrives?\nWho responds today?\nIdeal customer:\nRequired tone:\nWhat must not be said?\nExisting tool:\nWho can provide invitation-based access?\nBest handoff time:\n\nKICKOFF RECAP\nWe are improving [one lead source] using [tool]. Goal: [outcome]. Draft messages due [date]. Workflow test due [date]. Handoff: [date].\n\nINITIAL RESPONSE\n${messageTemplates[0].body}\n\nFOLLOW-UP\n${messageTemplates[1].body}\n\nFINAL CHECK-IN\n${messageTemplates[2].body}\n\nCLOSEOUT\nYour 7-Day Lead Follow-Up Tune-Up is complete. Attached or linked are the workflow summary, three approved message templates, the agreed tracker/workflow instructions, test confirmation, and the operating guide.`;
    const file = new Blob([packageText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leadflow-${workspaceTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "client"}-package.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Client package downloaded. Replace the bracketed fields before sending.");
  };

  const createCollectionSnapshot = (): WorkspaceBackup => {
    const liveActiveWorkspace: WorkspaceSnapshot = { ...currentWorkspace, prospects, doneDays, checkedKickoff, testDone, scopeFields, projectComplete };
    const collection = workspaces.map((workspace) => workspace.id === workspaceId ? liveActiveWorkspace : workspace);
    return { format: "LeadFlow Workspace Backup", version: 1, exportedAt: new Date().toISOString(), activeWorkspaceId: workspaceId, workspaces: collection };
  };

  const downloadCollectionBackup = () => {
    const backup = createCollectionSnapshot();
    const file = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leadflow-workspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(`Backup downloaded with ${backup.workspaces.length} client ${backup.workspaces.length === 1 ? "workspace" : "workspaces"}.`);
  };

  const downloadEncryptedCollectionBackup = async () => {
    if (!window.crypto?.subtle) {
      setNotice("This browser does not support secure encrypted backups.");
      return;
    }
    if (exportPassphrase.length < 12) {
      setNotice("Use a passphrase with at least 12 characters for an encrypted backup.");
      return;
    }
    if (exportPassphrase !== confirmExportPassphrase) {
      setNotice("The two passphrase entries do not match.");
      return;
    }
    try {
      const backup = await encryptWorkspaceBackup(createCollectionSnapshot(), exportPassphrase);
      const file = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `leadflow-encrypted-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setExportPassphrase("");
      setConfirmExportPassphrase("");
      setNotice("Encrypted backup downloaded. Keep the passphrase separate; it cannot be recovered.");
    } catch {
      setNotice("The encrypted backup could not be created. Please try again.");
    }
  };

  const inspectBackupFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    event.target.value = "";
    setShowReplaceConfirmation(false);
    if (!selected) return;
    if (selected.size > 5_000_000) {
      setNotice("That backup file is too large. Choose a LeadFlow JSON backup under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as unknown;
        if (isWorkspaceBackup(parsed)) {
          setPendingBackup({ kind: "plain", backup: parsed });
          setNotice(`Backup verified: ${parsed.workspaces.length} client ${parsed.workspaces.length === 1 ? "workspace" : "workspaces"} ready to restore.`);
          return;
        }
        if (isEncryptedWorkspaceBackup(parsed)) {
          setPendingBackup({ kind: "encrypted", backup: parsed });
          setImportPassphrase("");
          setNotice("Encrypted backup detected. Enter its passphrase to unlock it locally.");
          return;
        }
        throw new Error("Invalid backup");
      } catch {
        setPendingBackup(null);
        setNotice("This file is not a valid LeadFlow workspace backup.");
      }
    };
    reader.onerror = () => setNotice("The backup file could not be read. Please try another file.");
    reader.readAsText(selected);
  };

  const restoreBackup = (backup: WorkspaceBackup, mode: "merge" | "replace") => {
    const { collection, restored, selected } = prepareWorkspaceRestore(workspaces, backup.workspaces, backup.activeWorkspaceId, mode, cloneWorkspace);
    setWorkspaces(collection);
    if (mode === "replace") {
      setWorkspaceId(selected.id);
      loadWorkspace(selected);
      setActive("briefing");
    }
    setPendingBackup(null);
    setShowReplaceConfirmation(false);
    setNotice(mode === "replace" ? `Restored ${restored.length} workspaces and replaced this browser collection.` : `Merged ${restored.length} imported workspaces into this browser collection.`);
  };

  const decryptPendingBackup = async () => {
    if (!pendingBackup || pendingBackup.kind !== "encrypted") return;
    if (!window.crypto?.subtle) {
      setNotice("This browser does not support secure encrypted backup restoration.");
      return;
    }
    if (!importPassphrase) {
      setNotice("Enter the backup passphrase to unlock this file.");
      return;
    }
    try {
      const decoded = await decryptWorkspaceBackup(pendingBackup.backup, importPassphrase);
      if (!isWorkspaceBackup(decoded)) throw new Error("Invalid decrypted data");
      setImportPassphrase("");
      setPendingBackup({ kind: "plain", backup: decoded });
      setNotice(`Encrypted backup unlocked: ${decoded.workspaces.length} client ${decoded.workspaces.length === 1 ? "workspace" : "workspaces"} ready to restore.`);
    } catch {
      setImportPassphrase("");
      setNotice("This passphrase did not unlock the backup. Check it and try again.");
    }
  };

  const completeProject = () => {
    if (!completionReady) {
      setNotice("Finish all 8 kickoff items, 7 delivery milestones, and 5 tests before closing the project.");
      return;
    }
    setProjectComplete(true);
    setNotice("Client project marked complete and ready to archive.");
  };

  const renderContent = () => {
    switch (active) {
      case "prospects":
        return <Prospects prospects={prospects} onOpen={() => setShowProspectForm(true)} onWrite={(business) => { setActive("templates"); setNotice(`Open a message template for ${business}.`); }} />;
      case "offer":
        return <Offer onCopy={() => copyText("7-Day Lead Follow-Up Tune-Up — $350 fixed price. One lead source, one workflow, three customized message templates, testing, and handoff completed within seven calendar days.", "Offer summary")} />;
      case "scope":
        return <ScopeBuilder fields={scopeFields} setFields={setScopeFields} scopeCopy={scopeCopy} onCopy={() => copyText(scopeCopy, "Scope of work")} />;
      case "onboarding":
        return <Onboarding onCopy={() => copyText("Business name:\nPrimary project contact:\nOne lead source in scope:\nWhat happens after a new inquiry arrives?\nWho responds today?\nIdeal customer:\nRequired tone:\nWhat must not be said?\nExisting tool:\nWho can give invitation-based access?\nBest handoff time:", "Onboarding questionnaire")} />;
      case "kickoff":
        return <Kickoff checked={checkedKickoff} toggle={(id) => toggleNumber(id, checkedKickoff, setCheckedKickoff)} onCopy={() => copyText("Kickoff recap: We are improving [one lead source] using [tool]. Goal: [outcome]. Draft messages due [date]. Workflow test due [date]. Handoff: [date]. Client to provide [access / examples / approval] by [date].", "Kickoff recap")} />;
      case "delivery":
        return <Delivery doneDays={doneDays} toggle={(id) => toggleNumber(id, doneDays, setDoneDays)} progress={progress} completeAll={() => { setDoneDays(deliveryDays.map((_, index) => index)); setNotice("All delivery milestones marked complete."); }} />;
      case "templates":
        return <Templates testDone={testDone} toggleTest={(id) => toggleNumber(id, testDone, setTestDone)} onCopy={copyText} />;
      case "closeout":
        return <Closeout onCopy={copyText} />;
      default:
        return <Briefing progress={progress} setActive={setActive} doneDays={doneDays.length} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#ece8df] text-[#183b4a]">
      <div className="paper-noise pointer-events-none fixed inset-0 z-0 opacity-50" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1720px]">
        <aside className="hidden w-[272px] shrink-0 border-r border-[#d7cfc1] bg-[#f5f1e8]/95 px-5 py-6 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2">
            <img src={ASSETS.logo} alt="LeadFlow monogram" className="brand-stamp h-11 w-11 object-cover" />
            <div>
              <p className="font-display text-2xl leading-none tracking-[-0.05em] text-[#143948]">LeadFlow</p>
              <p className="mt-1 text-[9px] font-extrabold uppercase tracking-[0.17em] text-[#897d6d]">Field workspace</p>
            </div>
          </div>

          <div className="mt-10 px-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9a8b78]">The client path</p>
          </div>
          <nav className="mt-3 space-y-1" aria-label="Workspace sections">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <button key={item.key} onClick={() => setActive(item.key)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition duration-200 ${isActive ? "bg-[#183b4a] text-[#fffaf1] shadow-[0_10px_22px_rgba(20,57,72,0.13)]" : "text-[#5f625e] hover:bg-[#eae3d7] hover:text-[#183b4a]"}`}>
                  <span className={`w-5 text-[9px] font-extrabold tracking-[0.08em] ${isActive ? "text-[#f1ab95]" : "text-[#b7aa98]"}`}>{item.step}</span>
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.9} />
                  <span className="text-sm font-bold">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-[#ddd3c3] bg-[#fbf7ee] p-4 shadow-[0_12px_30px_rgba(73,58,38,0.06)]">
            <div className="flex items-center justify-between"><Pill tone="warm">Field rule</Pill><Flag className="h-4 w-4 text-[#c44832]" /></div>
            <p className="mt-3 font-display text-xl leading-5 tracking-[-0.04em] text-[#183b4a]">Keep the first engagement small enough to finish brilliantly.</p>
            <button onClick={() => setActive("offer")} className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-[#b6402e] hover:gap-2 transition-all">Review the offer <ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
        </aside>

        <main className="folio-surface min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-10 lg:py-7">
          <header className="mb-6 flex items-center justify-between border-b border-[#d7cfc1] pb-4 lg:mb-8">
            <div className="flex min-w-0 items-center gap-3 lg:hidden">
              <img src={ASSETS.logo} alt="LeadFlow" className="h-10 w-10 rounded-xl object-cover" />
              <div className="min-w-0"><p className="font-display text-2xl tracking-[-0.05em]">LeadFlow</p><p className="truncate text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#897d6d]">{activeLabel}</p></div>
            </div>
            <div className="hidden items-center gap-2 lg:flex"><span className="h-2 w-2 rounded-full bg-[#6eaa87]" /><span className="text-xs font-bold text-[#716858]">Local workspace · progress saved in this browser</span></div>
            <div className="flex items-center gap-2">
              <button onClick={downloadClientPackage} className="utility-slip hidden items-center gap-2 px-3 py-2 text-xs font-extrabold text-[#5e5a51] transition hover:text-[#183b4a] sm:inline-flex" aria-label="Export client package"><FilePenLine className="h-4 w-4" />Client kit</button>
              <button onClick={downloadCollectionBackup} className="utility-slip hidden items-center gap-2 px-3 py-2 text-xs font-extrabold text-[#5e5a51] transition hover:text-[#183b4a] md:inline-flex" aria-label="Back up all client workspaces"><Copy className="h-4 w-4" />Back up all</button>
              <button onClick={() => setShowEncryptionForm(true)} className="utility-slip inline-flex items-center gap-2 px-3 py-2 text-xs font-extrabold text-[#5e5a51] transition hover:text-[#183b4a]" aria-label="Create encrypted backup"><CheckCheck className="h-4 w-4 text-[#3e7a5d]" /><span className="hidden lg:inline">Secure backup</span></button>
              <button onClick={() => setShowWorkspaceManager(true)} className="utility-slip inline-flex items-center gap-2 px-3 py-2 text-xs font-extrabold text-[#5e5a51] transition hover:text-[#183b4a]" aria-label="Manage client workspaces"><BriefcaseBusiness className="h-4 w-4 text-[#8b735c]" /><span className="hidden sm:inline">Client files</span></button>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#173b49] text-xs font-extrabold text-white">YO</div>
            </div>
          </header>

          <div className="mb-5 overflow-x-auto lg:hidden">
            <div className="flex min-w-max gap-2 pb-1">
              {navItems.map((item) => <button key={item.key} onClick={() => setActive(item.key)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${active === item.key ? "border-[#183b4a] bg-[#183b4a] text-white" : "border-[#d8d0c2] bg-[#f8f4ec] text-[#625d54]"}`}>{item.step} {item.label}</button>)}
            </div>
          </div>

          <div className="mx-auto max-w-[1300px]">{renderContent()}
            {active === "closeout" && <section className={`mt-7 rounded-[26px] border p-6 ${projectComplete ? "border-[#b8d9c4] bg-[#edf6ef]" : "border-[#ded6c9] bg-[#fbf8f0]"}`}><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-4"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${projectComplete ? "bg-[#3e7a5d] text-white" : "bg-[#f3e4db] text-[#c44832]"}`}>{projectComplete ? <CheckCheck className="h-5 w-5" /> : <ClipboardCheck className="h-5 w-5" />}</div><div><Pill tone={projectComplete ? "green" : "warm"}>{projectComplete ? "Client file complete" : "Final completion gate"}</Pill><h2 className="mt-3 font-display text-3xl tracking-[-0.045em] text-[#183b4a]">{projectComplete ? "This client file is ready to archive." : "Close the client file only when every proof point is logged."}</h2><p className="mt-2 text-sm leading-6 text-[#71685d]">Kickoff: {checkedKickoff.length}/8 · Delivery: {doneDays.length}/7 · Tests: {testDone.length}/5. This state is saved in your browser.</p></div></div><Button onClick={completeProject} className={`h-11 rounded-xl ${projectComplete ? "bg-[#3e7a5d] text-white hover:bg-[#316247]" : "bg-[#c44832] text-white hover:bg-[#a83b2a]"}`}>{projectComplete ? <><CheckCheck className="mr-2 h-4 w-4" />Project complete</> : <><ClipboardCheck className="mr-2 h-4 w-4" />Complete client file</>}</Button></div></section>}
          </div>
        </main>
      </div>

      <div className="fixed bottom-4 left-4 right-4 z-30 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[#d9d0c2] bg-[#fffaf2]/95 px-4 py-3 shadow-[0_18px_38px_rgba(45,39,29,0.17)] backdrop-blur-md sm:left-auto sm:right-6">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e1eee7] text-[#2c6a4f]"><Check className="h-4 w-4" /></div>
        <p className="text-xs font-bold leading-4 text-[#58564f]">{notice}</p>
      </div>

      {showProspectForm && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#163643]/35 p-4 backdrop-blur-[2px] sm:items-center">
          <div className="w-full max-w-xl rounded-[24px] border border-[#e2d8c8] bg-[#fffaf2] p-6 shadow-[0_24px_80px_rgba(24,49,59,0.25)]">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#c44832]">01 · Prospecting</p><h2 className="mt-2 font-display text-3xl tracking-[-0.045em]">Capture a useful observation</h2></div><button onClick={() => setShowProspectForm(false)} className="rounded-full p-2 text-[#70685d] hover:bg-[#eee8dd]" aria-label="Close"><X className="h-5 w-5" /></button></div>
            <div className="mt-6 space-y-4"><label className="block text-xs font-extrabold text-[#554f45]">Business name<input value={draftBusiness} onChange={(event) => setDraftBusiness(event.target.value)} placeholder="e.g. Acorn HVAC" className="mt-1.5 w-full rounded-xl border border-[#dcd2c3] bg-white px-3 py-3 text-sm outline-none transition focus:border-[#c44832] focus:ring-4 focus:ring-[#c44832]/10" /></label><label className="block text-xs font-extrabold text-[#554f45]">Specific public observation<textarea value={draftSignal} onChange={(event) => setDraftSignal(event.target.value)} placeholder="What did you notice that makes a helpful, respectful opening?" className="mt-1.5 min-h-24 w-full rounded-xl border border-[#dcd2c3] bg-white px-3 py-3 text-sm outline-none transition focus:border-[#c44832] focus:ring-4 focus:ring-[#c44832]/10" /></label></div>
            <div className="mt-6 flex justify-end gap-2"><Button variant="outline" onClick={() => setShowProspectForm(false)} className="border-[#ded5c8] bg-white">Cancel</Button><Button onClick={addProspect} className="bg-[#c44832] text-white hover:bg-[#a73826]"><Plus className="mr-2 h-4 w-4" />Add to queue</Button></div>
          </div>
        </div>
      )}
      {showWorkspaceManager && <WorkspaceManager currentWorkspace={currentWorkspace} workspaces={workspaces} newClientName={newClientName} newProjectName={newProjectName} pendingBackup={plainPendingBackup} setNewClientName={setNewClientName} setNewProjectName={setNewProjectName} onClose={() => setShowWorkspaceManager(false)} onSwitch={switchWorkspace} onRename={updateWorkspaceNames} onCreate={createWorkspace} onRemove={removeWorkspace} onExportBackup={downloadCollectionBackup} onSelectBackup={inspectBackupFile} onRestoreBackup={(mode) => { if (!plainPendingBackup) return; if (mode === "replace") { setShowReplaceConfirmation(true); return; } restoreBackup(plainPendingBackup, "merge"); }} onClearPendingBackup={() => { setPendingBackup(null); setShowReplaceConfirmation(false); }} />}
      {showEncryptionForm && <EncryptedBackupDialog passphrase={exportPassphrase} confirmPassphrase={confirmExportPassphrase} setPassphrase={setExportPassphrase} setConfirmPassphrase={setConfirmExportPassphrase} onClose={() => { setShowEncryptionForm(false); setExportPassphrase(""); setConfirmExportPassphrase(""); }} onExport={downloadEncryptedCollectionBackup} />}
      {pendingBackup?.kind === "encrypted" && <EncryptedBackupUnlock backup={pendingBackup.backup} passphrase={importPassphrase} setPassphrase={setImportPassphrase} onClose={() => { setPendingBackup(null); setImportPassphrase(""); }} onUnlock={decryptPendingBackup} />}
      {showReplaceConfirmation && plainPendingBackup && <ReplaceCollectionDialog clientCount={plainPendingBackup.workspaces.length} onCancel={() => setShowReplaceConfirmation(false)} onConfirm={() => restoreBackup(plainPendingBackup, "replace")} />}
    </div>
  );
}

function EncryptedBackupDialog({ passphrase, confirmPassphrase, setPassphrase, setConfirmPassphrase, onClose, onExport }: {
  passphrase: string;
  confirmPassphrase: string;
  setPassphrase: (value: string) => void;
  setConfirmPassphrase: (value: string) => void;
  onClose: () => void;
  onExport: () => Promise<void>;
}) {
  const strength = evaluatePassphrase(passphrase);
  const confirmationMatches = !confirmPassphrase || passphrase === confirmPassphrase;
  const toneStyles = { muted: "bg-[#eee5d8]", warm: "bg-[#d9826c]", ink: "bg-[#2f6170]", green: "bg-[#3e7a5d]" };
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#163643]/40 p-4 backdrop-blur-[2px] sm:items-center"><div className="w-full max-w-lg overflow-hidden rounded-[26px] border border-[#d9c6b5] bg-[#fffaf2] shadow-[0_24px_80px_rgba(24,49,59,0.28)]"><div className="bg-[#183b4a] p-6 text-[#fffaf2]"><div className="flex items-start justify-between gap-4"><div><Pill tone="warm">Encrypted collection backup</Pill><h2 className="mt-4 font-display text-3xl leading-8 tracking-[-0.045em]">Seal every client file with one passphrase.</h2></div><button onClick={onClose} className="rounded-full p-2 text-[#d1e0e1] hover:bg-white/10" aria-label="Close encrypted backup"><X className="h-5 w-5" /></button></div><p className="mt-4 text-sm leading-6 text-[#c5d4d5]">LeadFlow encrypts the backup locally with AES-256-GCM. Your passphrase is never saved, sent, or included in the file.</p></div><div className="p-6"><div className="space-y-4"><label className="block text-xs font-extrabold text-[#554f45]">Passphrase<input type="password" autoComplete="new-password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} placeholder="At least 12 characters" className="mt-1.5 w-full rounded-xl border border-[#dcd2c3] bg-white px-3 py-3 text-sm text-[#183b4a] outline-none focus:border-[#c44832] focus:ring-4 focus:ring-[#c44832]/10" /></label><div className="rounded-xl border border-[#e2d9cb] bg-[#f8f2e8] p-3" aria-live="polite"><div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#756a5c]"><span>Passphrase strength</span><span>{strength.label}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e3dbcf]"><div className={`h-full rounded-full transition-all ${toneStyles[strength.tone]}`} style={{ width: `${strength.percentage}%` }} /></div><p className="mt-2 text-xs leading-5 text-[#6c6357]">{strength.hint}</p></div><label className="block text-xs font-extrabold text-[#554f45]">Confirm passphrase<input type="password" autoComplete="new-password" value={confirmPassphrase} onChange={(event) => setConfirmPassphrase(event.target.value)} placeholder="Re-enter the passphrase" className="mt-1.5 w-full rounded-xl border border-[#dcd2c3] bg-white px-3 py-3 text-sm text-[#183b4a] outline-none focus:border-[#c44832] focus:ring-4 focus:ring-[#c44832]/10" /></label>{confirmPassphrase && !confirmationMatches && <p className="text-xs font-bold text-[#b6402e]">The two passphrase entries do not match.</p>}</div><div className="mt-5 rounded-xl border border-[#e2d9cb] bg-[#f7f0e6] p-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#927f69]">Important</p><p className="mt-2 text-sm leading-5 text-[#665f55]">There is no passphrase recovery. Store it in a trusted password manager or another secure location before downloading the file.</p></div><div className="mt-6 flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={onClose} className="border-[#ded5c8] bg-white">Cancel</Button><Button disabled={!strength.isReady || !confirmPassphrase || !confirmationMatches} onClick={onExport} className="action-tab rounded-none bg-[#c44832] text-white hover:bg-[#a83b2a]"><CheckCheck className="mr-2 h-4 w-4" />Create encrypted backup</Button></div></div></div></div>;
}

function EncryptedBackupUnlock({ backup, passphrase, setPassphrase, onClose, onUnlock }: {
  backup: EncryptedWorkspaceBackup;
  passphrase: string;
  setPassphrase: (value: string) => void;
  onClose: () => void;
  onUnlock: () => Promise<void>;
}) {
  return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#163643]/50 p-4 backdrop-blur-[2px] sm:items-center"><div className="w-full max-w-md overflow-hidden rounded-[26px] border border-[#d9c6b5] bg-[#fffaf2] shadow-[0_24px_80px_rgba(24,49,59,0.32)]"><div className="p-6"><div className="flex items-start justify-between gap-4"><div><Pill tone="green">Encrypted backup detected</Pill><h2 className="mt-4 font-display text-3xl leading-8 tracking-[-0.045em]">Unlock this client collection.</h2></div><button onClick={onClose} className="rounded-full p-2 text-[#70685d] hover:bg-[#eee8dd]" aria-label="Cancel encrypted restore"><X className="h-5 w-5" /></button></div><p className="mt-4 text-sm leading-6 text-[#71685d]">This file was exported {new Date(backup.exportedAt).toLocaleDateString()}. Enter its passphrase to decrypt it locally before selecting merge or replace.</p><label className="mt-5 block text-xs font-extrabold text-[#554f45]">Backup passphrase<input type="password" autoComplete="current-password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void onUnlock(); }} placeholder="Enter the backup passphrase" className="mt-1.5 w-full rounded-xl border border-[#dcd2c3] bg-white px-3 py-3 text-sm text-[#183b4a] outline-none focus:border-[#c44832] focus:ring-4 focus:ring-[#c44832]/10" /></label><div className="mt-6 flex justify-end gap-2"><Button variant="outline" onClick={onClose} className="border-[#ded5c8] bg-white">Cancel</Button><Button onClick={onUnlock} className="action-tab rounded-none bg-[#c44832] text-white hover:bg-[#a83b2a]"><Check className="mr-2 h-4 w-4" />Unlock backup</Button></div></div></div></div>;
}

function ReplaceCollectionDialog({ clientCount, onCancel, onConfirm }: { clientCount: number; onCancel: () => void; onConfirm: () => void }) {
  const [confirmation, setConfirmation] = useState("");
  const allowed = canConfirmReplacement(confirmation);
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#163643]/60 p-4 backdrop-blur-[3px] sm:items-center"><div className="w-full max-w-md overflow-hidden rounded-[26px] border border-[#dfb0a2] bg-[#fffaf2] shadow-[0_24px_80px_rgba(24,49,59,0.38)]"><div className="bg-[#7d2d20] p-6 text-[#fffaf2]"><Pill tone="warm">Destructive restore</Pill><h2 className="mt-4 font-display text-3xl leading-8 tracking-[-0.045em]">Replace this browser collection?</h2><p className="mt-3 text-sm leading-6 text-[#f8d9d1]">This will remove the current client files in this browser and replace them with {clientCount} imported {clientCount === 1 ? "file" : "files"}. This cannot be undone without another backup.</p></div><div className="p-6"><label className="block text-xs font-extrabold text-[#554f45]">Type REPLACE to continue<input aria-label="Type REPLACE to continue" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="REPLACE" className="mt-1.5 w-full rounded-xl border border-[#d8c5b6] bg-white px-3 py-3 text-sm font-bold tracking-[0.12em] text-[#183b4a] outline-none focus:border-[#c44832] focus:ring-4 focus:ring-[#c44832]/10" /></label><div className="mt-6 flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={onCancel} className="border-[#ded5c8] bg-white">Keep current files</Button><Button disabled={!allowed} onClick={onConfirm} className="action-tab rounded-none bg-[#c44832] text-white hover:bg-[#a83b2a]">Replace all client files</Button></div></div></div></div>;
}

function WorkspaceManager({ currentWorkspace, workspaces, newClientName, newProjectName, pendingBackup, setNewClientName, setNewProjectName, onClose, onSwitch, onRename, onCreate, onRemove, onExportBackup, onSelectBackup, onRestoreBackup, onClearPendingBackup }: {
  currentWorkspace: WorkspaceSnapshot;
  workspaces: WorkspaceSnapshot[];
  newClientName: string;
  newProjectName: string;
  pendingBackup: WorkspaceBackup | null;
  setNewClientName: (value: string) => void;
  setNewProjectName: (value: string) => void;
  onClose: () => void;
  onSwitch: (id: string) => void;
  onRename: (clientName: string, projectName: string) => void;
  onCreate: () => void;
  onRemove: (id: string) => void;
  onExportBackup: () => void;
  onSelectBackup: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRestoreBackup: (mode: "merge" | "replace") => void;
  onClearPendingBackup: () => void;
}) {
  return <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#163643]/35 p-4 backdrop-blur-[2px] sm:items-center">
    <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[26px] border border-[#e2d8c8] bg-[#fffaf2] shadow-[0_24px_80px_rgba(24,49,59,0.25)]">
      <div className="flex items-start justify-between gap-4 border-b border-[#e7dfd2] p-6"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#c44832]">Client workspace cabinet</p><h2 className="mt-2 font-display text-3xl tracking-[-0.045em]">Keep every client in its own file.</h2><p className="mt-2 max-w-xl text-sm leading-5 text-[#71685d]">Each workspace saves its own prospects, scope fields, kickoff, delivery progress, testing, and closeout state in this browser.</p></div><button onClick={onClose} className="rounded-full p-2 text-[#70685d] hover:bg-[#eee8dd]" aria-label="Close"><X className="h-5 w-5" /></button></div>
      <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]"><div className="border-b border-[#e7dfd2] bg-[#f5f0e7] p-5 lg:border-b-0 lg:border-r"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9a8b78]">Saved client files · {workspaces.length}</p><div className="mt-4 space-y-2">{workspaces.map((workspace, index) => { const workspaceProgress = Math.round((workspace.doneDays.length / deliveryDays.length) * 100); const isCurrent = workspace.id === currentWorkspace.id; return <div key={workspace.id} className={`rounded-2xl border p-3 ${isCurrent ? "border-[#c44832] bg-[#fff8f4]" : "border-[#ded5c8] bg-[#fffaf2]"}`}><button onClick={() => onSwitch(workspace.id)} className="flex w-full items-center gap-3 text-left"><div className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-extrabold ${isCurrent ? "bg-[#c44832] text-white" : "bg-[#e7eced] text-[#183b4a]"}`}>{String(index + 1).padStart(2, "0")}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-[#183b4a]">{workspace.clientName}</p><p className="truncate text-[10px] font-bold text-[#8b7f70]">{workspace.projectName || "No project name"} · {workspaceProgress}% delivery</p></div>{isCurrent && <Pill tone="warm">Open</Pill>}</button><div className="mt-3 flex items-center justify-between border-t border-[#eee4d7] pt-2"><button onClick={() => onSwitch(workspace.id)} className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#b6402e]">Switch to file</button><button onClick={() => onRemove(workspace.id)} className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#998c79] hover:text-[#c44832]">Remove</button></div></div>; })}</div></div>
        <div className="p-6"><Pill tone="ink">Name the active file</Pill><h3 className="mt-4 font-display text-3xl tracking-[-0.045em]">{currentWorkspace.clientName}</h3><div className="mt-5 space-y-4"><InputLabel label="Client or workspace name" value={currentWorkspace.clientName} onChange={(value) => onRename(value, currentWorkspace.projectName)} /><InputLabel label="Optional project name" value={currentWorkspace.projectName} onChange={(value) => onRename(currentWorkspace.clientName, value)} /></div><div className="mt-7 border-t border-[#e7dfd2] pt-6"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#c44832]">Create another client file</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><InputLabel label="Client name" value={newClientName} onChange={setNewClientName} /><InputLabel label="Optional project name" value={newProjectName} onChange={setNewProjectName} /></div><Button onClick={onCreate} className="action-tab mt-5 rounded-none bg-[#c44832] text-white hover:bg-[#a83b2a]"><Plus className="mr-2 h-4 w-4" />Create workspace</Button></div><div className="mt-7 border-t border-[#e7dfd2] pt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#c44832]">Full collection backup</p><p className="mt-1 text-xs leading-5 text-[#786f63]">Portable JSON for every client file in this browser.</p></div><button onClick={onExportBackup} className="rounded-xl border border-[#d8cdbd] bg-white px-3 py-2 text-xs font-extrabold text-[#183b4a] hover:border-[#c44832]"><Copy className="mr-1.5 inline h-3.5 w-3.5" />Export all</button></div><label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#cdbda9] bg-[#f9f4ea] px-4 py-3 text-xs font-extrabold text-[#635b50] transition hover:border-[#c44832] hover:text-[#b6402e]"><FilePenLine className="h-4 w-4" />Choose a LeadFlow backup<input type="file" accept="application/json,.json" onChange={onSelectBackup} className="sr-only" /></label>{pendingBackup && <div className="mt-4 rounded-xl border border-[#d8ad9f] bg-[#fff6f1] p-4"><div className="flex items-start justify-between gap-3"><div><Pill tone="warm">Backup verified</Pill><p className="mt-2 text-sm font-extrabold text-[#183b4a]">{pendingBackup.workspaces.length} client {pendingBackup.workspaces.length === 1 ? "workspace" : "workspaces"} ready to restore</p><p className="mt-1 text-xs leading-5 text-[#786f63]">Exported {new Date(pendingBackup.exportedAt).toLocaleDateString()}. Merge keeps current files; replace overwrites them.</p></div><button onClick={onClearPendingBackup} className="rounded-full p-1.5 text-[#866b62] hover:bg-[#f6e2db]" aria-label="Clear selected backup"><X className="h-4 w-4" /></button></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => onRestoreBackup("merge")} className="rounded-xl border border-[#d4c4b4] bg-white px-3 py-2 text-xs font-extrabold text-[#183b4a] hover:border-[#c44832]">Merge into collection</button><button onClick={() => onRestoreBackup("replace")} className="rounded-xl bg-[#c44832] px-3 py-2 text-xs font-extrabold text-white hover:bg-[#a83b2a]">Replace current collection</button></div></div>}</div></div></div>
    </div>
  </div>;
}

function Briefing({ progress, setActive, doneDays }: { progress: number; setActive: (view: View) => void; doneDays: number }) {
  return <>
    <SectionTop eyebrow="00 · The active desk" title="Turn a warm observation into a booked kickoff." detail="LeadFlow puts every piece of your focused $350 service in one working path, so you can spend less time rebuilding documents and more time following through." action={<Button onClick={() => setActive("prospects")} className="action-tab h-11 rounded-none bg-[#c44832] px-5 text-white hover:bg-[#a83b2a]"><Plus className="mr-2 h-4 w-4" />New prospect</Button>} />
    <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <div className="relative overflow-hidden rounded-[26px] border border-[#dfd7ca] bg-[#f9f5ed] p-6 shadow-[0_18px_50px_rgba(73,58,38,0.08)] sm:p-8">
        <img src={ASSETS.hero} alt="LeadFlow editorial desk" className="absolute inset-y-0 right-0 h-full w-[52%] object-cover opacity-70 mix-blend-multiply" />
        <div className="absolute inset-y-0 right-0 w-[68%] bg-gradient-to-r from-[#f9f5ed] via-[#f9f5ed]/80 to-transparent" />
        <div className="relative max-w-md"><Pill tone="warm">The fixed-price playbook</Pill><h2 className="mt-5 font-display text-4xl leading-[0.95] tracking-[-0.055em] text-[#183b4a] sm:text-5xl">One lead source.<br />One clear workflow.<br /><span className="text-[#c44832]">Seven days.</span></h2><p className="mt-5 max-w-sm text-sm leading-6 text-[#645e54]">The offer stays affordable because it is intentionally narrow, repeatable, and written down before work starts.</p><div className="mt-7 flex flex-wrap gap-3"><Button onClick={() => setActive("offer")} className="rounded-xl bg-[#183b4a] text-white hover:bg-[#0f2e3a]">Open the offer <ArrowRight className="ml-2 h-4 w-4" /></Button><button onClick={() => setActive("scope")} className="inline-flex items-center gap-2 rounded-xl border border-[#d6ccbc] bg-[#fffaf2]/80 px-4 py-2 text-sm font-extrabold text-[#34505a] transition hover:border-[#c44832]">Build a scope <FilePenLine className="h-4 w-4" /></button></div></div>
      </div>
      <div className="rounded-[26px] bg-[#183b4a] p-6 text-[#fffaf1] shadow-[0_18px_50px_rgba(24,57,72,0.18)] sm:p-7"><div className="flex items-center justify-between"><Pill tone="warm">Delivery pulse</Pill><TimerReset className="h-5 w-5 text-[#f5b19f]" /></div><p className="mt-6 text-sm font-bold text-[#c7d7d8]">Your current seven-day run</p><div className="mt-2 flex items-end gap-2"><span className="font-display text-6xl tracking-[-0.07em]">{progress}%</span><span className="mb-2 text-xs font-bold text-[#a5bebf]">{doneDays} of 7 milestones</span></div><div className="mt-5 h-3 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#ef8066] transition-all duration-500" style={{ width: `${progress}%` }} /></div><button onClick={() => setActive("delivery")} className="mt-7 flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-left text-sm font-extrabold transition hover:bg-white/15">Continue delivery plan <ChevronRight className="h-4 w-4" /></button></div>
    </section>
    <section className="next-move-ledger mt-7 grid gap-4 p-5 md:grid-cols-[auto_1fr_auto] md:items-center"><div className="next-move-stamp">NEXT<br />MOVE</div><div><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#c44832]">Field instruction · owner: you</p><h2 className="mt-1 font-display text-3xl tracking-[-0.045em] text-[#183b4a]">Write a specific opening for Cedar & Stone.</h2><p className="mt-1 text-sm leading-5 text-[#6d6257]">Use the quote-form observation. Offer three useful ideas, not a generic sales pitch.</p></div><button onClick={() => setActive("templates")} className="action-tab inline-flex items-center justify-center gap-2 bg-[#c44832] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#a83b2a]">Draft message <ArrowRight className="h-4 w-4" /></button></section>
    <section className="mt-7 grid divide-y divide-[#ded6c9] border-y border-[#ded6c9] bg-[#f7f3eb] lg:grid-cols-3 lg:divide-x lg:divide-y-0"><Metric icon={Target} label="Prospects to write" value="2" note="from a focused list of 3" color="text-[#c44832]" /><Metric icon={Mail} label="Useful first moves" value="5" note="personalized, not mass sent" color="text-[#3e6e5a]" /><Metric icon={ClipboardCheck} label="Delivery assets" value="9" note="already prepared and reusable" color="text-[#62518c]" /></section>
    <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"><div className="ledger-sheet p-6"><div className="flex items-center justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9a8b78]">Working queue · indexed</p><h2 className="mt-2 font-display text-3xl tracking-[-0.045em]">Three moves that matter</h2></div><button onClick={() => setActive("prospects")} className="text-xs font-extrabold text-[#b6402e]">See prospects</button></div><div className="mt-5 divide-y divide-[#e8e0d4]"><QueueRow number="01" title="Write Cedar & Stone" detail="Use its quote-form observation to open a useful email." action="Draft message" onClick={() => setActive("templates")} /><QueueRow number="02" title="Prepare the scope" detail="Replace bracketed fields before your first serious reply." action="Open builder" onClick={() => setActive("scope")} /><QueueRow number="03" title="Book the kickoff" detail="Use the 45-minute agenda to protect the seven-day window." action="Open desk" onClick={() => setActive("kickoff")} /></div></div><div className="field-note overflow-hidden"><img src={ASSETS.workflow} alt="Lead workflow stationery illustration" className="h-44 w-full object-cover" /><div className="p-6"><Pill tone="green">Operate calmly</Pill><h2 className="mt-4 font-display text-3xl leading-7 tracking-[-0.045em]">Every asset is already waiting in the right step.</h2><p className="mt-3 text-sm leading-6 text-[#6c6256]">Your prospect research, client documents, messages, delivery tracker, and closeout plan stay connected.</p><button onClick={() => setActive("onboarding")} className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#183b4a]">Start client onboarding <ArrowRight className="h-4 w-4" /></button></div></div></section>
  </>;
}

function Metric({ icon: Icon, label, value, note, color }: { icon: typeof Target; label: string; value: string; note: string; color: string }) { return <div className="ledger-metric p-5"><div className="flex items-center justify-between"><Icon className={`h-5 w-5 ${color}`} /><span className="text-[9px] font-extrabold tracking-[0.14em] text-[#ad9e8b]">FIELD COUNT</span></div><div className="mt-4 font-display text-4xl tracking-[-0.06em] text-[#173b49]">{value}</div><div className="mt-1 text-sm font-extrabold text-[#514f49]">{label}</div><p className="mt-1 text-xs text-[#8b8172]">{note}</p></div>; }
function QueueRow({ number, title, detail, action, onClick }: { number: string; title: string; detail: string; action: string; onClick: () => void }) { return <div className="flex gap-4 py-4 first:pt-0 last:pb-0"><span className="pt-0.5 text-xs font-extrabold tracking-[0.1em] text-[#c44832]">{number}</span><div className="min-w-0 flex-1"><h3 className="text-sm font-extrabold text-[#183b4a]">{title}</h3><p className="mt-1 text-xs leading-5 text-[#7a7165]">{detail}</p></div><button onClick={onClick} className="self-center whitespace-nowrap text-xs font-extrabold text-[#b6402e] hover:underline">{action}</button></div>; }

function Prospects({ prospects, onOpen, onWrite }: { prospects: typeof initialProspects; onOpen: () => void; onWrite: (business: string) => void }) { return <><SectionTop eyebrow="01 · Prospecting" title="Find the signal before you pitch." detail="Use a public, specific observation as the opening—not a generic claim about helping businesses grow. Track the next move while the detail is still fresh." action={<Button onClick={onOpen} className="h-11 rounded-xl bg-[#c44832] text-white hover:bg-[#a83b2a]"><Plus className="mr-2 h-4 w-4" />Capture prospect</Button>} /><div className="grid gap-6 xl:grid-cols-[1fr_320px]"><div className="overflow-hidden rounded-[26px] border border-[#ded6c9] bg-[#fbf8f0]"><div className="flex flex-col gap-4 border-b border-[#e4ddd1] p-5 sm:flex-row sm:items-center sm:justify-between"><div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b8f7e]" /><input placeholder="Search your working list" className="w-full rounded-xl border border-[#ded5c8] bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#c44832]" /></div><div className="flex gap-2"><Pill tone="ink">3 active</Pill><button className="rounded-xl border border-[#ded5c8] bg-white px-3 py-2 text-xs font-extrabold text-[#625c52]"><Settings2 className="mr-1 inline h-3.5 w-3.5" />Filter</button></div></div><div className="hidden grid-cols-[1.3fr_1fr_1.3fr_0.9fr_40px] gap-4 border-b border-[#e4ddd1] bg-[#f3eee5] px-5 py-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#978a78] md:grid"><span>Business</span><span>Niche</span><span>Observed signal</span><span>Next move</span><span /></div><div className="divide-y divide-[#e7dfd3]">{prospects.map((prospect) => <div key={prospect.business} className="grid gap-3 px-5 py-5 md:grid-cols-[1.3fr_1fr_1.3fr_0.9fr_40px] md:items-center"><div><p className="font-bold text-[#183b4a]">{prospect.business}</p><p className="mt-1 text-xs text-[#8d8273]">Local business</p></div><p className="text-sm text-[#625d53]">{prospect.niche}</p><p className="text-sm leading-5 text-[#625d53]">{prospect.signal}</p><button onClick={() => onWrite(prospect.business)} className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.11em] ${prospect.color}`}>{prospect.status}</button><button onClick={() => onWrite(prospect.business)} className="rounded-lg p-2 text-[#8d8273] hover:bg-[#eee8dd] hover:text-[#c44832]" aria-label={`Write to ${prospect.business}`}><MoreHorizontal className="h-4 w-4" /></button></div>)}</div></div><aside className="overflow-hidden rounded-[26px] border border-[#ded6c9] bg-[#fbf8f0]"><img src={ASSETS.research} alt="Prospecting research illustration" className="h-40 w-full object-cover" /><div className="p-6"><Pill tone="warm">Research rule</Pill><h2 className="mt-4 font-display text-3xl leading-7 tracking-[-0.045em]">Be specific, respectful, and useful.</h2><p className="mt-4 text-sm leading-6 text-[#6b6257]">A visible gap is an invitation to be helpful—not a reason to embarrass someone. Name one concrete observation, then offer to send three practical ideas.</p><div className="mt-5 rounded-xl border border-[#e3d9ca] bg-[#f6f0e5] p-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9a8b78]">Good opening</p><p className="mt-2 text-sm leading-5 text-[#485854]">“I noticed your quote form does not say when a customer can expect a reply.”</p></div></div></aside></div></>; }

function Offer({ onCopy }: { onCopy: () => void }) { return <><SectionTop eyebrow="02 · The offer" title="A small first yes, built to finish well." detail="Price the first project for clarity. Your client buys one contained improvement, not a vague consulting relationship." action={<Button onClick={onCopy} variant="outline" className="h-11 rounded-xl border-[#d9cfc1] bg-[#fffaf2]"><Copy className="mr-2 h-4 w-4" />Copy offer summary</Button>} /><section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]"><div className="overflow-hidden rounded-[28px] border border-[#ded6c9] bg-[#fbf8f0] shadow-[0_18px_45px_rgba(73,58,38,0.07)]"><div className="bg-[#183b4a] px-7 py-6 text-[#fffaf1]"><div className="flex items-center justify-between"><Pill tone="warm">Fixed-price starter</Pill><CircleDollarSign className="h-6 w-6 text-[#f1ac96]" /></div><h2 className="mt-6 font-display text-5xl leading-[0.92] tracking-[-0.06em]">7-Day Lead Follow-Up Tune-Up</h2><div className="mt-5 flex items-end gap-2"><span className="font-display text-6xl tracking-[-0.07em]">$350</span><span className="mb-2 text-xs font-bold text-[#c3d0d2]">fixed project fee</span></div></div><div className="grid gap-5 p-7 md:grid-cols-2"><OfferItem icon={UsersRound} title="For local owners" detail="Who want fewer missed inquiries without adopting a huge new system." /><OfferItem icon={Workflow} title="One workflow" detail="One lead source, one agreed tool, and a handoff the team can use." /><OfferItem icon={MessageSquareText} title="Three client messages" detail="An initial reply, a follow-up, and a final check-in shaped to their tone." /><OfferItem icon={TimerReset} title="Seven calendar days" detail="The clock begins only after payment, access, questionnaire, and kickoff." /></div></div><div className="rounded-[28px] border border-[#ded6c9] bg-[#f6f0e5] p-6"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9a8b78]">What makes it feel safe</p><div className="mt-5 space-y-4"><SafeItem number="01" title="A visible finish line" detail="One workflow summary, three messages, one tracker, tests, and a handoff." /><SafeItem number="02" title="No surprise hours" detail="The project is fixed scope. New requests are discussed before work starts." /><SafeItem number="03" title="A lower-risk first step" detail="The client can see your process before committing to a bigger improvement." /></div><div className="mt-6 rounded-2xl bg-[#c44832] p-5 text-white"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#ffcec2]">The plain-language close</p><p className="mt-2 font-display text-2xl leading-6 tracking-[-0.04em]">“One lead source. One clear workflow. Seven days.”</p></div></div></section><section className="mt-7 rounded-[26px] border border-[#ded6c9] bg-[#fbf8f0] p-6"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9a8b78]">Say what is inside the project</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{["45-minute kickoff", "Current vs. proposed workflow", "Three approved message templates", "Tracker, testing & handoff"].map((item) => <div key={item} className="flex gap-3 rounded-xl border border-[#e6ded1] bg-white px-4 py-3 text-sm font-bold text-[#4d544f]"><Check className="h-4 w-4 shrink-0 text-[#3e7a5d]" />{item}</div>)}</div></section></>; }
function OfferItem({ icon: Icon, title, detail }: { icon: typeof UsersRound; title: string; detail: string }) { return <div><Icon className="h-5 w-5 text-[#c44832]" /><h3 className="mt-3 text-sm font-extrabold text-[#183b4a]">{title}</h3><p className="mt-1 text-sm leading-5 text-[#71685d]">{detail}</p></div>; }
function SafeItem({ number, title, detail }: { number: string; title: string; detail: string }) { return <div className="flex gap-4"><span className="pt-0.5 text-xs font-extrabold text-[#c44832]">{number}</span><div><h3 className="text-sm font-extrabold">{title}</h3><p className="mt-1 text-sm leading-5 text-[#71685d]">{detail}</p></div></div>; }

function ScopeBuilder({ fields, setFields, scopeCopy, onCopy }: { fields: { business: string; source: string; tool: string }; setFields: (fields: { business: string; source: string; tool: string }) => void; scopeCopy: string; onCopy: () => void }) { const update = (key: keyof typeof fields, value: string) => setFields({ ...fields, [key]: value }); return <><SectionTop eyebrow="03 · Scope builder" title="Write the edges before the work begins." detail="A clear scope protects the client, protects your time, and makes a $350 project feel serious. Edit the three fields below, then copy the draft into your agreement." action={<Button onClick={onCopy} className="h-11 rounded-xl bg-[#c44832] text-white hover:bg-[#a83b2a]"><Copy className="mr-2 h-4 w-4" />Copy scope draft</Button>} /><div className="grid gap-6 xl:grid-cols-[360px_1fr]"><aside className="rounded-[26px] border border-[#ded6c9] bg-[#f6f0e5] p-6"><Pill tone="warm">Fill the blanks</Pill><h2 className="mt-4 font-display text-3xl leading-7 tracking-[-0.045em]">Only promise what you can complete.</h2><div className="mt-6 space-y-4"><InputLabel label="Client legal name" value={fields.business} onChange={(value) => update("business", value)} /><InputLabel label="One lead source" value={fields.source} onChange={(value) => update("source", value)} /><InputLabel label="Agreed existing tool" value={fields.tool} onChange={(value) => update("tool", value)} /></div><div className="mt-6 rounded-xl border border-[#e2d7c7] bg-[#fffaf2] p-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#a0927e]">Scope rule</p><p className="mt-2 text-sm leading-5 text-[#625d53]">If the client asks for a second lead source, a new tool, or custom integration, send a separate fixed-price option. Do not quietly absorb it.</p></div></aside><article className="rounded-[26px] border border-[#ded6c9] bg-[#fffdf8] p-6 shadow-[0_16px_40px_rgba(73,58,38,0.05)] sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e8e0d4] pb-5"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#c44832]">Working scope of work</p><h2 className="mt-2 font-display text-3xl tracking-[-0.045em]">7-Day Lead Follow-Up Tune-Up</h2></div><Pill tone="ink">$350 fixed fee</Pill></div><div className="mt-6 grid gap-6 text-sm leading-6 text-[#564f45]"><ScopeSection title="Purpose">The Provider will review the Client’s process for receiving and following up on new customer inquiries, then configure one simple, agreed workflow intended to help the Client respond more consistently. This project does not guarantee leads, bookings, sales, revenue, or a specific response rate.</ScopeSection><ScopeSection title="Included work">One 45-minute kickoff; review of one lead source; a current-versus-proposed workflow summary; three client-approved messages; one simple tracker or workflow in {fields.tool}; up to three sample tests; and one 30-minute handoff with a short operating guide.</ScopeSection><ScopeSection title="Workflow boundary">This project covers {fields.source} only. It does not include multiple lead sources, website redevelopment, a full CRM implementation, paid ads, custom code, complex integrations, or ongoing support.</ScopeSection><ScopeSection title="Client responsibilities">{fields.business} will provide one decision-maker, accurate business information, invitation-based or role-based access, up to three anonymized example inquiries, and timely approval of message templates.</ScopeSection><ScopeSection title="Payment & acceptance">The fee is $350, paid as $175 before work begins and $175 upon delivery. The project is complete when the agreed workflow, three messages, tracker, tests, and handoff guide are delivered. The client has two business days to identify a scope-related mismatch.</ScopeSection></div></article></div></>; }
function InputLabel({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-xs font-extrabold text-[#554f45]">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dcd2c3] bg-white px-3 py-3 text-sm font-medium text-[#183b4a] outline-none focus:border-[#c44832] focus:ring-4 focus:ring-[#c44832]/10" /></label>; }
function ScopeSection({ title, children }: { title: string; children: React.ReactNode }) { return <section><h3 className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#c44832]">{title}</h3><p className="mt-2">{children}</p></section>; }

function Onboarding({ onCopy }: { onCopy: () => void }) { const questions = [["Business and contact", "Business name, website, primary contact, final approver, and kickoff availability."], ["One lead source", "Choose only one: website form, email, voicemail, social DM, Google Business Profile, referral, or other."], ["Current process", "What happens now? Who responds? What happens when they are unavailable?"], ["Customer voice", "Ideal customer, priority services, approved tone, restricted language, and desired next action."], ["Tool and access", "Existing CRM, inbox, spreadsheet, booking tool, and invitation-based access owner."], ["Handoff", "Who attends the handoff and when can the 30-minute call take place?"]]; return <><SectionTop eyebrow="04 · Client onboarding" title="Ask only what lets you start cleanly." detail="This questionnaire is designed for a busy owner to finish in ten minutes. It gives you exactly what you need for a focused kickoff—without making them write a business memoir." action={<Button onClick={onCopy} variant="outline" className="h-11 rounded-xl border-[#d9cfc1] bg-[#fffaf2]"><Copy className="mr-2 h-4 w-4" />Copy questionnaire</Button>} /><div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"><div className="rounded-[26px] border border-[#ded6c9] bg-[#fbf8f0] p-6"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e7eced] text-[#183b4a]"><Inbox className="h-5 w-5" /></div><div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9a8b78]">Send after sign-off</p><h2 className="font-display text-3xl tracking-[-0.045em]">A ten-minute setup note</h2></div></div><div className="mt-7 space-y-2">{questions.map(([title, detail], index) => <div key={title} className="group flex gap-4 rounded-2xl border border-transparent p-4 transition hover:border-[#e2d8c9] hover:bg-white"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f1e5d7] text-xs font-extrabold text-[#c44832]">{index + 1}</span><div><h3 className="text-sm font-extrabold text-[#183b4a]">{title}</h3><p className="mt-1 text-sm leading-5 text-[#71685d]">{detail}</p></div></div>)}</div></div><aside className="overflow-hidden rounded-[26px] border border-[#ded6c9] bg-[#183b4a] text-white"><div className="p-7"><Pill tone="warm">Project start rule</Pill><h2 className="mt-5 font-display text-4xl leading-8 tracking-[-0.05em]">The seven-day clock starts after four things.</h2><div className="mt-6 space-y-3">{["First payment received", "Questionnaire returned", "Agreed access provided", "Kickoff completed"].map((item, index) => <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"><span className="text-xs font-extrabold text-[#f1ab95]">0{index + 1}</span><span className="text-sm font-bold">{item}</span></div>)}</div><p className="mt-6 text-sm leading-6 text-[#c5d4d5]">This prevents a rushed start where missing access or unclear decisions become your unpaid emergency.</p></div><img src={ASSETS.handoff} alt="Client handoff folder illustration" className="h-44 w-full object-cover opacity-80 mix-blend-screen" /></aside></div></>; }

function Kickoff({ checked, toggle, onCopy }: { checked: number[]; toggle: (id: number) => void; onCopy: () => void }) { return <><SectionTop eyebrow="05 · Kickoff desk" title="Forty-five minutes to lock the work." detail="Keep the call moving. Every discussion should produce a workflow decision, an approval, a client responsibility, or a delivery date." action={<Button onClick={onCopy} className="h-11 rounded-xl bg-[#c44832] text-white hover:bg-[#a83b2a]"><Copy className="mr-2 h-4 w-4" />Copy recap email</Button>} /><div className="grid gap-6 xl:grid-cols-[1fr_325px]"><div className="overflow-hidden rounded-[26px] border border-[#ded6c9] bg-[#fbf8f0]"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5ddd1] p-5"><div><Pill tone="warm">45 minutes total</Pill><p className="mt-2 text-sm font-bold text-[#6e6559]">Check off each moment as you get the answer you need.</p></div><div className="font-display text-4xl tracking-[-0.06em] text-[#183b4a]">{checked.length}/8</div></div><div className="divide-y divide-[#e7dfd3]">{kickoffRows.map(([time, title, detail], index) => <button key={title} onClick={() => toggle(index)} className="flex w-full gap-4 px-5 py-4 text-left transition hover:bg-[#f6f1e7]"><span className="w-10 pt-1 text-xs font-extrabold text-[#c44832]">{time}</span><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${checked.includes(index) ? "border-[#3e7a5d] bg-[#3e7a5d] text-white" : "border-[#cfc4b4] bg-white text-transparent"}`}><Check className="h-3 w-3" /></span><span><span className="block text-sm font-extrabold text-[#183b4a]">{title}</span><span className="mt-1 block text-sm leading-5 text-[#71685d]">{detail}</span></span></button>)}</div></div><aside className="rounded-[26px] border border-[#ded6c9] bg-[#f6f0e5] p-6"><Pill tone="ink">Never skip</Pill><h2 className="mt-4 font-display text-3xl leading-7 tracking-[-0.045em]">The five answers that keep the scope safe.</h2><ol className="mt-6 space-y-4">{["Which one lead source is in scope?", "What counts as a genuine lead?", "When should follow-up stop?", "Who approves message language?", "What existing tool can we use now?"].map((question, index) => <li key={question} className="flex gap-3 text-sm font-bold leading-5 text-[#5e584e]"><span className="font-display text-xl text-[#c44832]">{index + 1}</span>{question}</li>)}</ol><div className="mt-7 rounded-xl border border-[#e0d5c4] bg-[#fffaf2] p-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#9a8b78]">Closing line</p><p className="mt-2 text-sm leading-5 text-[#5a564e]">“Any work outside this agreed workflow will be discussed and approved separately before I begin it.”</p></div></aside></div></>; }

function Delivery({ doneDays, toggle, progress, completeAll }: { doneDays: number[]; toggle: (id: number) => void; progress: number; completeAll: () => void }) { return <><SectionTop eyebrow="06 · Seven-day delivery" title="Make the client feel movement every day." detail="This is the operational spine of the offer. Small visible outputs keep the client confident, prevent scope drift, and set up a clean handoff." action={<Button onClick={completeAll} variant="outline" className="h-11 rounded-xl border-[#d9cfc1] bg-[#fffaf2]"><CheckCheck className="mr-2 h-4 w-4" />Mark all complete</Button>} /><div className="mb-6 rounded-[26px] bg-[#183b4a] p-6 text-white"><div className="flex flex-wrap items-end justify-between gap-5"><div><Pill tone="warm">Delivery pulse</Pill><h2 className="mt-4 font-display text-4xl tracking-[-0.05em]">{progress}% of the run is accounted for.</h2><p className="mt-2 text-sm text-[#c4d2d3]">Each day has one action, one artifact, and one way to keep the client oriented.</p></div><div className="min-w-[220px]"><div className="mb-2 flex justify-between text-xs font-bold text-[#c4d2d3]"><span>{doneDays.length} milestones complete</span><span>{progress}%</span></div><div className="h-3 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#ef8066] transition-all duration-500" style={{ width: `${progress}%` }} /></div></div></div></div><div className="grid gap-3">{deliveryDays.map(([day, title, detail], index) => <button key={day} onClick={() => toggle(index)} className={`group grid gap-3 rounded-2xl border p-4 text-left transition sm:grid-cols-[86px_1fr_auto] sm:items-center ${doneDays.includes(index) ? "border-[#bedbc9] bg-[#edf6ef]" : "border-[#ded6c9] bg-[#fbf8f0] hover:border-[#c44832]/40"}`}><div className="flex items-center gap-3"><span className={`flex h-8 w-8 items-center justify-center rounded-full border ${doneDays.includes(index) ? "border-[#3e7a5d] bg-[#3e7a5d] text-white" : "border-[#d9cfbf] bg-white text-transparent"}`}><Check className="h-4 w-4" /></span><span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#a69582]">{day}</span></div><div><h3 className="text-sm font-extrabold text-[#183b4a]">{title}</h3><p className="mt-1 text-sm text-[#71685d]">{detail}</p></div><span className={`w-fit rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] ${doneDays.includes(index) ? "bg-[#d7eadd] text-[#2e6c50]" : "bg-[#f2ebe0] text-[#887d6e]"}`}>{doneDays.includes(index) ? "Logged" : "Open"}</span></button>)}</div></>; }

function Templates({ testDone, toggleTest, onCopy }: { testDone: number[]; toggleTest: (id: number) => void; onCopy: (text: string, label: string) => void }) { const tests = ["A new inquiry is captured in the agreed tool.", "The initial response has the correct tone and call to action.", "The responsible person can see the next follow-up date.", "A customer reply updates ownership and status.", "Booked, declined, and no-response outcomes stop the sequence."]; return <><SectionTop eyebrow="07 · Messages & testing" title="Give the client language they can actually use." detail="The three-message sequence handles the first reply, the gentle nudge, and the final check-in. Test the workflow using only approved sample information." /><section className="grid gap-5 xl:grid-cols-3">{messageTemplates.map((template) => <article key={template.title} className="flex flex-col rounded-[26px] border border-[#ded6c9] bg-[#fbf8f0] p-5"><div className="flex items-center justify-between"><Pill tone={template.title === "Initial response" ? "warm" : template.title === "Follow-up" ? "ink" : "green"}>{template.label}</Pill><button onClick={() => onCopy(template.body, template.title)} className="rounded-lg p-2 text-[#7b7162] transition hover:bg-[#eee8dd] hover:text-[#c44832]" aria-label={`Copy ${template.title}`}><Copy className="h-4 w-4" /></button></div><h2 className="mt-5 font-display text-3xl tracking-[-0.05em]">{template.title}</h2><pre className="mt-5 flex-1 whitespace-pre-wrap rounded-xl border border-[#e6ded2] bg-white p-4 font-sans text-xs leading-5 text-[#6a6257]">{template.body}</pre><button onClick={() => onCopy(template.body, template.title)} className="mt-4 flex items-center gap-2 text-xs font-extrabold text-[#b6402e]">Copy message <ArrowRight className="h-3.5 w-3.5" /></button></article>)}</section><section className="mt-7 grid gap-6 xl:grid-cols-[1fr_360px]"><div className="rounded-[26px] border border-[#ded6c9] bg-[#fbf8f0] p-6"><div className="flex items-start justify-between gap-4"><div><Pill tone="ink">Testing card</Pill><h2 className="mt-4 font-display text-3xl tracking-[-0.045em]">Prove the simple workflow is clear.</h2><p className="mt-2 text-sm leading-6 text-[#71685d]">Use safe, approved sample inquiries. You are not testing the client’s customers—you are testing ownership, timing, and stop rules.</p></div><span className="font-display text-4xl tracking-[-0.06em] text-[#183b4a]">{testDone.length}/5</span></div><div className="mt-6 divide-y divide-[#e8e0d4]">{tests.map((test, index) => <button key={test} onClick={() => toggleTest(index)} className="flex w-full items-center gap-3 py-4 text-left"><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${testDone.includes(index) ? "border-[#3e7a5d] bg-[#3e7a5d] text-white" : "border-[#d4c8b8] bg-white text-transparent"}`}><Check className="h-3 w-3" /></span><span className={`text-sm font-bold ${testDone.includes(index) ? "text-[#48705c] line-through" : "text-[#5e574d]"}`}>{test}</span></button>)}</div></div><aside className="rounded-[26px] border border-[#ded6c9] bg-[#f6f0e5] p-6"><Pill tone="warm">Approval move</Pill><h2 className="mt-4 font-display text-3xl leading-7 tracking-[-0.045em]">Ask for one consolidated revision.</h2><p className="mt-4 text-sm leading-6 text-[#71685d]">“Please reply with either Approved or one consolidated list of edits. The fixed project includes one reasonable revision round within the agreed scope.”</p><Button onClick={() => onCopy("Please reply with either Approved or one consolidated list of edits. The fixed project includes one reasonable revision round within the agreed scope.", "Approval request")} className="mt-6 w-full rounded-xl bg-[#183b4a] text-white hover:bg-[#0f2e3a]"><Copy className="mr-2 h-4 w-4" />Copy approval request</Button></aside></section></>; }

function Closeout({ onCopy }: { onCopy: (text: string, label: string) => void }) { const closeout = `Your 7-Day Lead Follow-Up Tune-Up is complete. Attached or linked are: the workflow summary, three approved message templates, the agreed tracker/workflow instructions, test confirmation, and the operating guide. Please let me know within two business days if any delivered item does not match the written scope. Otherwise, the project will be considered accepted. The remaining balance is $175, due upon delivery.`; return <><SectionTop eyebrow="08 · Handoff & follow-up" title="Finish cleanly. Leave a useful next step." detail="The handoff is where a client feels the project become theirs. A structured closeout protects your payment, makes the workflow usable, and opens the door to future work." action={<Button onClick={() => onCopy(closeout, "Final delivery email")} className="h-11 rounded-xl bg-[#c44832] text-white hover:bg-[#a83b2a]"><Send className="mr-2 h-4 w-4" />Copy final delivery email</Button>} /><div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]"><div className="overflow-hidden rounded-[26px] border border-[#ded6c9] bg-[#fbf8f0]"><img src={ASSETS.handoff} alt="Completed project handoff illustration" className="h-48 w-full object-cover" /><div className="p-6"><Pill tone="green">30-minute handoff</Pill><h2 className="mt-4 font-display text-4xl tracking-[-0.05em]">Turn the workflow over with confidence.</h2><div className="mt-6 grid gap-3 sm:grid-cols-2">{[["0–5", "Restate the goal and workflow boundary"], ["5–12", "Show where a new lead enters"], ["12–20", "Demonstrate tracker and status updates"], ["20–25", "Review the three message templates"], ["25–28", "Explain stop rules and ownership"], ["28–30", "Confirm questions and first weekly review"]].map(([time, task]) => <div key={time} className="flex gap-3 rounded-xl border border-[#e6ded1] bg-white p-3"><span className="text-xs font-extrabold text-[#c44832]">{time}</span><span className="text-xs font-bold leading-4 text-[#5e574d]">{task}</span></div>)}</div></div></div><div className="space-y-5"><div className="rounded-[26px] border border-[#ded6c9] bg-[#f6f0e5] p-6"><Pill tone="ink">Operating guide</Pill><h2 className="mt-4 font-display text-3xl leading-7 tracking-[-0.045em]">Give them a five-step weekly habit.</h2><ol className="mt-5 space-y-3">{["Add or confirm the lead in the agreed tool.", "Send the approved initial response on time.", "Complete the two agreed follow-ups.", "Stop when booked, declined, or complete.", "Review open leads once each week for 10–15 minutes."].map((item, index) => <li key={item} className="flex gap-3 text-sm font-bold leading-5 text-[#5b574e]"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e3ebea] text-[10px] text-[#2d6355]">{index + 1}</span>{item}</li>)}</ol></div><div className="rounded-[26px] bg-[#183b4a] p-6 text-white"><Pill tone="warm">Seven to fourteen days later</Pill><h2 className="mt-4 font-display text-3xl leading-7 tracking-[-0.045em]">Ask what is working—then ask for proof.</h2><p className="mt-3 text-sm leading-6 text-[#c4d4d5]">Check whether the workflow is being used. If it has been helpful, request a short testimonial and a warm introduction to another local owner.</p><div className="mt-5 flex flex-wrap gap-2"><button onClick={() => onCopy("I wanted to check in and see how the new follow-up process is working. Is there anything unclear or any small adjustment your team needs? If the project has been useful, would you be comfortable sharing a short testimonial about the experience?", "Feedback request")} className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15">Copy feedback ask</button><button onClick={() => onCopy("If you know another local business owner who may be missing inquiries or struggling with inconsistent follow-up, I would appreciate an introduction. I offer the same fixed-scope seven-day setup.", "Referral request")} className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-extrabold hover:bg-white/15">Copy referral ask</button></div></div></div></div><section className="mt-7 rounded-[26px] border border-[#ded6c9] bg-[#fbf8f0] p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><Pill tone="warm">Next-phase invitation</Pill><h2 className="mt-4 font-display text-3xl tracking-[-0.045em]">Make the sensible second offer—not a random upsell.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#71685d]">Once the first lead source is stable, point to the next adjacent improvement: a second lead source, simple reporting, staff training, or a booking-flow cleanup.</p></div><Button onClick={() => onCopy("Now that the first lead source has a clear follow-up process, the next sensible improvement is [second lead source / reporting / staff training / booking flow]. I can send a separate fixed-price scope based on the priority you want to address next.", "Next-phase offer")} variant="outline" className="rounded-xl border-[#d9cfc1] bg-white"><Sparkles className="mr-2 h-4 w-4" />Copy next-phase offer</Button></div></section></>; }
