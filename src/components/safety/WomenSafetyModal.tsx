'use client';

import React, { useState, useEffect } from 'react';
import { X, HeartHandshake, MapPin, AlertCircle, Trash2, Siren } from 'lucide-react';
import { SafetyContact } from '@/lib/types/investigation';
import { getAllSafetyContacts, saveSafetyContact, deleteSafetyContact } from '@/lib/storage/db';

interface WomenSafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSosDispatched?: (details: string) => void;
}

interface DispatchStatus {
  contact: string;
  channel: string;
  state: 'sent' | 'failed';
}

export const WomenSafetyModal: React.FC<WomenSafetyModalProps> = ({ isOpen, onClose, onSosDispatched }) => {
  const [contacts, setContacts] = useState<SafetyContact[]>([]);
  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [confirmingSos, setConfirmingSos] = useState(false);
  const [sosDispatch, setSosDispatch] = useState<{ statuses: DispatchStatus[]; coords: string; at: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      getAllSafetyContacts()
        .then((all) => all.sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
        .then(setContacts)
        .catch(() => setContacts([]));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;
    const contact: SafetyContact = {
      id: `sc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newName.trim(),
      relation: newRelation.trim() || 'Trusted Contact',
      phone: newPhone.trim(),
      createdAt: new Date().toISOString(),
    };
    await saveSafetyContact(contact).catch(() => {});
    setContacts((prev) => [...prev, contact]);
    setNewName('');
    setNewRelation('');
    setNewPhone('');
  };

  const handleRemoveContact = async (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    await deleteSafetyContact(id).catch(() => {});
  };

  const geolocate = (): Promise<string> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve('GPS unavailable on this device — dispatched without coordinates');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`),
        () => resolve('GPS permission denied / unavailable — dispatched without coordinates'),
        { timeout: 4000 }
      );
    });

  const handleTriggerSOS = async () => {
    setConfirmingSos(false);
    const coords = await geolocate();

    // Simulation dispatch matrix (README-defined behavior: simulated dispatch to
    // trusted circle + 1091). Each channel gets an explicit status record.
    const statuses: DispatchStatus[] = contacts.map((c) => ({
      contact: `${c.name} (${c.relation})`,
      channel: c.phone,
      state: 'sent',
    }));
    statuses.push({ contact: 'Women Helpline 1091', channel: 'National emergency routing', state: 'sent' });

    const at = new Date().toISOString();
    setSosDispatch({ statuses, coords, at });
    onSosDispatched?.(
      `SOS escalation dispatched to ${contacts.length} trusted contact(s) + 1091 helpline. Coordinates: ${coords}`
    );
  };

  return (
    <div className="cb-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="cb-dossier w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="cb-dossier-head flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <HeartHandshake className="w-5 h-5 text-crimson flex-none" />
            <div>
              <div className="cb-eyebrow">Emergency Assistance Network</div>
              <h2 className="text-sm font-bold text-noir-100 uppercase tracking-wider">
                Women Safety & Emergency Assistance Network
              </h2>
              <p className="text-[11px] cb-dim mt-0.5">
                Rapid escalation network, trusted well-wisher contacts, and emergency assistance routing. Contacts
                persist locally in IndexedDB.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="cb-btn cb-btn-ghost cb-btn-icon flex-none" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="cb-dossier-body cb-scroll p-6 space-y-5 overflow-y-auto">
          {/* Emergency Escalation */}
          <div className="cb-alert cb-alert-red">
            <AlertCircle className="w-4 h-4 cb-red flex-none mt-0.5" />
            <div className="flex-1 space-y-1">
              <span className="cb-mono text-[10px] font-bold cb-red uppercase tracking-wider">
                One-Touch Rapid Escalation
              </span>
              <p className="text-[11px] cb-dim">
                Simulated dispatch: GPS beacon + alert to your {contacts.length} trusted contact(s) and the 1091
                women&rsquo;s helpline. The dispatch is recorded in the active case audit trail.
              </p>
            </div>
            {!confirmingSos ? (
              <button
                onClick={() => setConfirmingSos(true)}
                disabled={contacts.length === 0}
                className="cb-btn cb-btn-danger animate-pulse whitespace-nowrap self-center flex-none"
              >
                <Siren className="w-3.5 h-3.5" /> Trigger SOS
              </button>
            ) : (
              <div className="flex flex-col gap-1.5 self-center flex-none">
                <button onClick={handleTriggerSOS} className="cb-btn cb-btn-primary cb-btn-sm">
                  Confirm Dispatch
                </button>
                <button onClick={() => setConfirmingSos(false)} className="cb-btn cb-btn-ghost cb-btn-sm">
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Dispatch receipt */}
          {sosDispatch && (
            <div className="cb-alert cb-alert-green">
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="cb-mono text-[10px] font-bold cb-green uppercase tracking-wider">
                    Dispatch Receipt
                  </span>
                  <span className="cb-faint cb-mono text-[10px]">
                    {new Date(sosDispatch.at).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] cb-dim cb-mono">
                  <MapPin className="w-3.5 h-3.5 cb-red flex-none" /> {sosDispatch.coords}
                </div>
                <ul className="space-y-1">
                  {sosDispatch.statuses.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-2 text-[10px] cb-mono bg-noir-950 rounded px-2 py-1 border border-noir-700"
                    >
                      <span className="text-noir-200">{s.contact}</span>
                      <span className={s.state === 'sent' ? 'cb-green' : 'cb-red'}>
                        {s.state === 'sent' ? '✓ ALERT SENT' : '✗ FAILED'} · {s.channel}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Trusted Contacts List */}
          <div className="space-y-3">
            <h3 className="cb-eyebrow">Trusted Well-Wisher Circle ({contacts.length})</h3>
            {contacts.length === 0 ? (
              <div className="cb-empty border border-dashed border-noir-700 rounded-md">
                No trusted contacts registered yet. Add at least one to enable SOS dispatch.
              </div>
            ) : (
              <div className="cb-list">
                {contacts.map((c) => (
                  <div key={c.id} className="cb-row" style={{ cursor: 'default' }}>
                    <div className="cb-row-icon">
                      <HeartHandshake className="w-3.5 h-3.5" />
                    </div>
                    <div className="cb-row-main">
                      <span className="cb-row-title">{c.name}</span>
                      <span className="cb-row-sub">
                        {c.relation} • {c.phone}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveContact(c.id)}
                      className="cb-btn cb-btn-ghost cb-btn-icon cb-btn-sm flex-none"
                      title="Remove contact"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Trusted Contact Form */}
          <form onSubmit={handleAddContact} className="cb-card cb-card-pad space-y-3">
            <h4 className="cb-eyebrow">Add Trusted Well-Wisher</h4>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full Name"
                className="cb-input"
              />
              <input
                type="text"
                value={newRelation}
                onChange={(e) => setNewRelation(e.target.value)}
                placeholder="Relation (Sister, Friend...)"
                className="cb-input"
              />
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone (+91...)"
                className="cb-input"
              />
            </div>
            <button type="submit" className="cb-btn w-full">
              + Register Trusted Contact
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
