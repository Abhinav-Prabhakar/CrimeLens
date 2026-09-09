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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[85vh] bg-noir-900 border border-noir-700 rounded-xl shadow-2xl flex flex-col font-mono text-xs text-noir-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-noir-850 border-b border-noir-700">
          <div className="flex items-center gap-2.5">
            <HeartHandshake className="w-5 h-5 text-crimson" />
            <div>
              <h2 className="text-sm font-bold text-noir-100 uppercase tracking-wider">
                Women Safety & Emergency Assistance Network
              </h2>
              <p className="text-[11px] text-noir-400">
                Rapid escalation network, trusted well-wisher contacts, and emergency assistance routing. Contacts
                persist locally in IndexedDB.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-noir-400 hover:text-noir-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Emergency Escalation */}
          <div className="p-4 bg-crimson/10 border border-crimson/40 rounded-xl flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-bold text-crimson uppercase flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> ONE-TOUCH RAPID ESCALATION
              </span>
              <p className="text-[11px] text-noir-300">
                Simulated dispatch: GPS beacon + alert to your {contacts.length} trusted contact(s) and the 1091
                women&rsquo;s helpline. The dispatch is recorded in the active case audit trail.
              </p>
            </div>
            {!confirmingSos ? (
              <button
                onClick={() => setConfirmingSos(true)}
                disabled={contacts.length === 0}
                className="px-4 py-2.5 rounded font-bold whitespace-nowrap bg-crimson hover:bg-crimson-bright disabled:opacity-40 text-white shadow-lg shadow-crimson/30 animate-pulse transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Siren className="w-4 h-4" /> TRIGGER SOS
                </span>
              </button>
            ) : (
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={handleTriggerSOS}
                  className="px-4 py-2 bg-crimson-bright text-white rounded font-bold"
                >
                  CONFIRM DISPATCH
                </button>
                <button
                  onClick={() => setConfirmingSos(false)}
                  className="px-4 py-1 bg-noir-800 text-noir-300 rounded text-[10px]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Dispatch receipt */}
          {sosDispatch && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 uppercase">Dispatch Receipt</span>
                <span className="text-[10px] text-noir-400">{new Date(sosDispatch.at).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-noir-300">
                <MapPin className="w-3.5 h-3.5 text-crimson" /> {sosDispatch.coords}
              </div>
              <ul className="space-y-1">
                {sosDispatch.statuses.map((s, i) => (
                  <li key={i} className="flex items-center justify-between text-[10px] bg-noir-950 rounded px-2 py-1 border border-noir-800">
                    <span className="text-noir-200">{s.contact}</span>
                    <span className={s.state === 'sent' ? 'text-emerald-400' : 'text-crimson'}>
                      {s.state === 'sent' ? '✓ ALERT SENT' : '✗ FAILED'} · {s.channel}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Trusted Contacts List */}
          <div className="space-y-3">
            <h3 className="font-bold text-noir-100 uppercase">Trusted Well-Wisher Circle ({contacts.length})</h3>
            {contacts.length === 0 ? (
              <div className="py-6 text-center text-noir-500 text-[11px] border border-noir-800 rounded-lg">
                No trusted contacts registered yet. Add at least one to enable SOS dispatch.
              </div>
            ) : (
              <div className="divide-y divide-noir-800 border border-noir-700 rounded-lg overflow-hidden">
                {contacts.map((c) => (
                  <div key={c.id} className="p-3 bg-noir-950 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-noir-100">{c.name}</div>
                      <div className="text-[10px] text-noir-400">
                        {c.relation} • {c.phone}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveContact(c.id)}
                      className="p-1.5 text-noir-600 hover:text-crimson rounded transition-colors"
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
          <form onSubmit={handleAddContact} className="p-4 bg-noir-850 rounded-lg border border-noir-700 space-y-3">
            <h4 className="font-bold text-noir-200 uppercase text-[11px]">Add Trusted Well-Wisher</h4>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full Name"
                className="bg-noir-900 border border-noir-700 rounded px-2.5 py-1.5 text-noir-100 text-[11px] focus:border-crimson focus:outline-none"
              />
              <input
                type="text"
                value={newRelation}
                onChange={(e) => setNewRelation(e.target.value)}
                placeholder="Relation (Sister, Friend...)"
                className="bg-noir-900 border border-noir-700 rounded px-2.5 py-1.5 text-noir-100 text-[11px] focus:border-crimson focus:outline-none"
              />
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone (+91...)"
                className="bg-noir-900 border border-noir-700 rounded px-2.5 py-1.5 text-noir-100 text-[11px] focus:border-crimson focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full py-1.5 bg-noir-700 hover:bg-noir-600 text-noir-100 rounded font-bold transition-colors"
            >
              + Register Trusted Contact
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
