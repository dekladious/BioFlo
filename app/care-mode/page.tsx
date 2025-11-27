"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, X, AlertCircle, Shield, Mail, Phone } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

type Contact = {
  name: string;
  email?: string;
  phone?: string;
};

type CheckIn = {
  id: string;
  promptSentAt: string;
  alert: {
    message: string;
    severity: string;
  };
};

export default function CareModePage() {
  const [enabled, setEnabled] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [checkInTimeoutHours, setCheckInTimeoutHours] = useState(2);
  const [pendingCheckIns, setPendingCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchPendingCheckIns();
  }, []);

  async function fetchSettings() {
    try {
      const response = await fetch("/api/care-mode/settings");
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/sign-in";
          return;
        }
        // If error, use defaults instead of throwing
        console.warn("Failed to fetch care mode settings, using defaults", response.status);
        setEnabled(false);
        setContacts([]);
        setCheckInTimeoutHours(2);
        return;
      }
      const data = await response.json();
      if (data.success && data.data) {
        setEnabled(data.data.enabled || false);
        setContacts(data.data.contacts || []);
        setCheckInTimeoutHours(data.data.checkInTimeoutHours || 2);
      } else {
        // Use defaults if response format is unexpected
        setEnabled(false);
        setContacts([]);
        setCheckInTimeoutHours(2);
      }
    } catch (error) {
      console.error("Failed to fetch care mode settings", error);
      // Use defaults on error
      setEnabled(false);
      setContacts([]);
      setCheckInTimeoutHours(2);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPendingCheckIns() {
    try {
      const response = await fetch("/api/care-mode/check-in");
      if (!response.ok) {
        if (response.status === 401) {
          return;
        }
        // On error, just set empty array (feature might not be set up)
        setPendingCheckIns([]);
        return;
      }
      const data = await response.json();
      if (data.success && data.data) {
        setPendingCheckIns(data.data.checkIns || []);
      } else {
        setPendingCheckIns([]);
      }
    } catch (error) {
      console.error("Failed to fetch pending check-ins", error);
      // Set empty array on error
      setPendingCheckIns([]);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const response = await fetch("/api/care-mode/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          contacts,
          checkInTimeoutHours,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || "Failed to save settings";
        
        if (response.status === 503) {
          alert("Care mode requires database setup. Please run database migrations or contact support.");
        } else {
          alert(`Failed to save settings: ${errorMessage}`);
        }
        return;
      }

      const data = await response.json();
      if (data.success) {
        alert("Care mode settings saved successfully");
      } else {
        alert("Failed to save settings. Please try again.");
      }
    } catch (error) {
      console.error("Failed to save settings", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to save settings: ${errorMessage}. Please try again.`);
    } finally {
      setSaving(false);
    }
  }

  async function respondToCheckIn(checkInId: string, okay: boolean) {
    try {
      const response = await fetch("/api/care-mode/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkInId,
          okay,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to respond");
      }

      // Remove from pending list
      setPendingCheckIns((c) => c.filter((ci) => ci.id !== checkInId));
    } catch (error) {
      console.error("Failed to respond to check-in", error);
      alert("Failed to respond. Please try again.");
    }
  }

  function addContact(contact: Contact) {
    if (contacts.length >= 2) {
      alert("Maximum 2 contacts allowed");
      return;
    }
    setContacts([...contacts, contact]);
    setShowAddContact(false);
  }

  function removeContact(index: number) {
    setContacts(contacts.filter((_, i) => i !== index));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-sky-400" />
      </div>
    );
  }

  const heroStats = [
    { label: "Status", value: enabled ? "Active" : "Off", helper: enabled ? "Monitoring deviations" : "Disabled" },
    { label: "Contacts", value: `${contacts.length}/2`, helper: "Trusted circle" },
    { label: "Pending prompts", value: pendingCheckIns.length, helper: "Awaiting acknowledgement" },
  ];
  const heroActions = [
    { label: "Manage contacts", helper: "Add or remove guardians", href: "#settings" },
    { label: "Review prompts", helper: "Respond to pending check-ins", href: "#pending" },
  ];

  return (
    <div className="space-y-10">
      <Card variant="hero" statusAccent="primary" className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-text-soft">Care mode</p>
          <h1 className="text-3xl font-semibold text-text-main">Keep your circle informed with smart escalation.</h1>
          <p className="max-w-3xl text-base text-text-soft">
            BioFlo watches for unusual deviations, nudges you for confirmation, and escalates to trusted contacts if you don’t reply. It’s bio-safety infrastructure—not an emergency service.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {heroStats.map((stat) => (
            <Card key={stat.label} variant="compact" className="border border-border-subtle bg-white/5">
              <p className="text-[11px] uppercase tracking-wide text-text-soft">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold text-text-main">{stat.value}</p>
              <p className="text-[11px] text-text-soft">{stat.helper}</p>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {heroActions.map((action) => (
            <a key={action.label} href={action.href} className="quick-action-chip border-border-subtle bg-white/5">
              <div>
                <p className="text-xs font-semibold text-text-main">{action.label}</p>
                <p className="text-[10px] text-text-soft">{action.helper}</p>
              </div>
            </a>
          ))}
        </div>
      </Card>

      <Card statusAccent="warning" className="space-y-2">
        <div className="flex items-start gap-3">
          <AlertCircle className="size-5 text-warning" />
          <div className="text-sm text-text-main">
            <p className="font-semibold">Important disclaimer</p>
            <p className="text-text-soft">
              Care Mode is not an emergency service or medical monitor. It cannot detect medical emergencies. Always call emergency services for urgent medical events.
            </p>
          </div>
        </div>
      </Card>

      <Card className="space-y-6" id="settings" title="Enable Care Mode" subtitle="Monitor deviations and alert contacts when needed.">
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-soft">
            When enabled, BioFlo will monitor your patterns and alert contacts if unusual deviations are detected.
          </p>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="sr-only peer" />
            <span className="h-6 w-11 rounded-full bg-white/10 peer-checked:bg-teal after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>

        {enabled && (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-text-main">Emergency contacts (max 2)</h3>
                {contacts.length < 2 && (
                  <button
                    onClick={() => setShowAddContact(true)}
                    className="flex items-center gap-2 rounded-full border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-main hover:bg-white/5 transition"
                  >
                    <Plus className="size-4" /> Add contact
                  </button>
                )}
              </div>

              {contacts.length === 0 ? (
                <p className="text-sm text-text-soft">No contacts added. Add at least one contact to enable alerts.</p>
              ) : (
                <div className="space-y-2">
                  {contacts.map((contact, index) => (
                    <Card key={contact.name + index} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-text-main">{contact.name}</div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-text-soft">
                          {contact.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="size-3" /> {contact.email}
                            </span>
                          )}
                          {contact.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="size-3" /> {contact.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeContact(index)}
                        className="rounded-full border border-border-subtle p-1 text-text-soft hover:border-text-main hover:text-text-main"
                      >
                        <X className="size-4" />
                      </button>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-main">Check-in timeout (hours)</label>
              <p className="text-xs text-text-soft">How long to wait for a response before alerting contacts</p>
              <input
                type="number"
                min="1"
                max="24"
                value={checkInTimeoutHours}
                onChange={(e) => setCheckInTimeoutHours(parseInt(e.target.value) || 2)}
                className="w-full rounded-2xl border border-border-subtle bg-white/5 px-3 py-2 text-sm text-text-main focus:outline-none focus:border-teal"
              />
            </div>

            <button
              onClick={saveSettings}
              disabled={saving || contacts.length === 0}
              className="w-full rounded-full border border-teal bg-teal-soft px-5 py-3 font-semibold text-teal transition hover:bg-teal/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Saving…
                </span>
              ) : (
                "Save settings"
              )}
            </button>
          </>
        )}
      </Card>

      {enabled && pendingCheckIns.length > 0 && (
        <Card id="pending" title="Pending check-ins" subtitle="Respond to confirm you’re okay" className="space-y-4">
          {pendingCheckIns.map((checkIn) => (
            <Card key={checkIn.id} variant="compact" statusAccent="warning">
              <div className="flex items-start gap-3">
                <AlertCircle className="size-5 text-warning mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="mb-2 text-sm text-text-main">{checkIn.alert.message}</p>
                  <p className="mb-3 text-xs text-text-soft">
                    Sent {new Date(checkIn.promptSentAt).toLocaleString("en-GB")}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => respondToCheckIn(checkIn.id, true)}
                      className="rounded-full border border-success px-3 py-1.5 text-sm font-medium text-success hover:bg-success/10 transition"
                    >
                      I’m okay
                    </button>
                    <button
                      onClick={() => respondToCheckIn(checkIn.id, false)}
                      className="rounded-full border border-danger px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/10 transition"
                    >
                      Need help
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </Card>
      )}

      {/* Add Contact Modal */}
      {showAddContact && (
        <AddContactModal onSave={addContact} onCancel={() => setShowAddContact(false)} />
      )}
    </div>
  );
}

function AddContactModal({
  onSave,
  onCancel,
}: {
  onSave: (contact: Contact) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  function handleSave() {
    if (!name.trim()) {
      alert("Name is required");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      alert("Email or phone is required");
      return;
    }
    onSave({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
    });
    setName("");
    setEmail("");
    setPhone("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md space-y-4">
        <h3 className="text-lg font-semibold text-text-main">Add Emergency Contact</h3>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-text-main">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-border-subtle bg-white/5 px-3 py-2 text-sm text-text-main focus:outline-none focus:border-teal"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-main">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-border-subtle bg-white/5 px-3 py-2 text-sm text-text-main focus:outline-none focus:border-teal"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-main">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-2xl border border-border-subtle bg-white/5 px-3 py-2 text-sm text-text-main focus:outline-none focus:border-teal"
              placeholder="+44 7700 900000"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!name.trim() || (!email.trim() && !phone.trim())}
            className="flex-1 rounded-full border border-teal bg-teal-soft px-4 py-2 text-sm font-semibold text-teal transition hover:bg-teal/20 disabled:opacity-50"
          >
            Add contact
          </button>
          <button
            onClick={onCancel}
            className="rounded-full border border-border-subtle bg-white/5 px-4 py-2 text-sm font-medium text-text-soft hover:border-text-main hover:text-text-main"
          >
            Cancel
          </button>
        </div>
      </Card>
    </div>
  );
}

