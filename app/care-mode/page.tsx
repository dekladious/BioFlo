"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, X, AlertCircle, Shield, Mail, Phone } from "lucide-react";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";

const pane =
  "rounded-[16px] border border-white/10 bg-white/[0.045] backdrop-blur shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.25)]";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Care Mode</h1>
        <p className="mt-1 text-sm text-slate-400">
          Enable monitoring for yourself or a loved one. BioFlo will watch for unusual patterns and alert contacts if needed.
        </p>
      </div>

      {/* Important Disclaimer */}
      <div className={pane + " p-6 border-amber-400/30 bg-amber-400/5"}>
        <div className="flex items-start gap-3">
          <AlertCircle className="size-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-slate-300">
            <p className="font-medium text-white mb-1">Important Disclaimer</p>
            <p>
              Care Mode is not an emergency service or medical monitoring. It does not detect medical emergencies like heart attacks.
              Do not rely on BioFlo for emergencies. Always call emergency services (911/999/112) for medical emergencies.
            </p>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className={pane + " p-6 space-y-6"}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Enable Care Mode</h2>
            <p className="text-sm text-slate-400 mt-1">
              When enabled, BioFlo will monitor your patterns and alert contacts if unusual deviations are detected.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-400"></div>
          </label>
        </div>

        {enabled && (
          <>
            {/* Contacts */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-300">Emergency Contacts (max 2)</h3>
                {contacts.length < 2 && (
                  <button
                    onClick={() => setShowAddContact(true)}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-white/[0.06] transition"
                  >
                    <Plus className="size-4" /> Add Contact
                  </button>
                )}
              </div>

              {contacts.length === 0 ? (
                <p className="text-sm text-slate-400">No contacts added. Add at least one contact to enable alerts.</p>
              ) : (
                <div className="space-y-2">
                  {contacts.map((contact, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="size-4 text-sky-400" />
                        <div>
                          <div className="text-sm font-medium text-white">{contact.name}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
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
                      </div>
                      <button
                        onClick={() => removeContact(index)}
                        className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-white/10 transition"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Check-in Timeout */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Check-in Timeout (hours)
              </label>
              <p className="text-xs text-slate-400">
                How long to wait for a response before alerting contacts
              </p>
              <input
                type="number"
                min="1"
                max="24"
                value={checkInTimeoutHours}
                onChange={(e) => setCheckInTimeoutHours(parseInt(e.target.value) || 2)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-400/50"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={saveSettings}
              disabled={saving || contacts.length === 0}
              className="w-full rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 px-5 py-3 font-medium text-black shadow-[0_12px_30px_rgba(56,189,248,0.35)] transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Saving...
                </span>
              ) : (
                "Save Settings"
              )}
            </button>
          </>
        )}
      </div>

      {/* Pending Check-ins */}
      {enabled && pendingCheckIns.length > 0 && (
        <div className={pane + " p-6 space-y-4"}>
          <h2 className="text-lg font-semibold">Pending Check-ins</h2>
          {pendingCheckIns.map((checkIn) => (
            <div
              key={checkIn.id}
              className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="size-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-white mb-2">{checkIn.alert.message}</p>
                  <p className="text-xs text-slate-400 mb-3">
                    Sent {new Date(checkIn.promptSentAt).toLocaleString("en-GB")}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => respondToCheckIn(checkIn.id, true)}
                      className="rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-3 py-1.5 text-sm font-medium text-emerald-300 hover:bg-emerald-400/20 transition"
                    >
                      I'm Okay
                    </button>
                    <button
                      onClick={() => respondToCheckIn(checkIn.id, false)}
                      className="rounded-lg border border-red-400/50 bg-red-400/10 px-3 py-1.5 text-sm font-medium text-red-300 hover:bg-red-400/20 transition"
                    >
                      Need Help
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContact && (
        <AddContactModal
          onSave={addContact}
          onCancel={() => setShowAddContact(false)}
        />
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
      <div className={pane + " w-full max-w-md p-6 space-y-4"}>
        <h3 className="text-lg font-semibold">Add Emergency Contact</h3>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-300">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-400/50"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-400/50"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-400/50"
              placeholder="+44 7700 900000"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!name.trim() || (!email.trim() && !phone.trim())}
            className="flex-1 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 px-4 py-2 text-sm font-medium text-black transition hover:brightness-110 disabled:opacity-50"
          >
            Add Contact
          </button>
          <button
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.06] transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

