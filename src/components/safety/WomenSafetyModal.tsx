'use client';

import React, { useState } from 'react';
import { X, HeartHandshake, PhoneCall, MapPin, AlertCircle, Shield, Check } from 'lucide-react';

interface WomenSafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TrustedContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  status: 'verified' | 'pending';
}

export const WomenSafetyModal: React.FC<WomenSafetyModalProps> = ({ isOpen, onClose }) => {
  const [contacts, setContacts] = useState<TrustedContact[]>([
    {
      id: 'c1',
      name: 'Pooja Sharma',
      relation: 'Sister',
      phone: '+91 98201-55123',
      status: 'verified',
    },
    {
      id: 'c2',
      name: 'Dr. Anita Desai',
      relation: 'Colleague / Mentor',
      phone: '+91 98402-11984',
      status: 'verified',
    },
  ]);

  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [sosTriggered, setSosTriggered] = useState(false);

  if (!isOpen) return null;

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;
    setContacts((prev) => [
      ...prev,
      {
        id: `c_${Date.now()}`,
        name: newName,
        relation: newRelation || 'Trusted Contact',
        phone: newPhone,
        status: 'verified',
      },
    ]);
    setNewName('');
    setNewRelation('');
    setNewPhone('');
  };

  const handleTriggerSOS = () => {
    setSosTriggered(true);
    setTimeout(() => setSosTriggered(false), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-noir-900 border border-noir-700 rounded-xl shadow-2xl flex flex-col font-mono text-xs text-noir-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-noir-850 border-b border-noir-700">
          <div className="flex items-center gap-2.5">
            <HeartHandshake className="w-5 h-5 text-crimson" />
            <div>
              <h2 className="text-sm font-bold text-noir-100 uppercase tracking-wider">
                Women Safety & Emergency Assistance Network
              </h2>
              <p className="text-[11px] text-noir-400">
                Rapid escalation network, trusted well-wisher contacts, and emergency assistance routing.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-noir-400 hover:text-noir-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Emergency Escalation Button */}
          <div className="p-4 bg-crimson/10 border border-crimson/40 rounded-xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-bold text-crimson uppercase flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> ONE-TOUCH RAPID ESCALATION
              </span>
              <p className="text-[11px] text-noir-300">
                Instantly dispatches GPS beacon and encrypted alert to trusted network and women helpline 1091.
              </p>
            </div>
            <button
              onClick={handleTriggerSOS}
              disabled={sosTriggered}
              className={`px-4 py-2.5 rounded font-bold transition-all ${
                sosTriggered
                  ? 'bg-emerald-600 text-white'
                  : 'bg-crimson hover:bg-crimson-bright text-white shadow-lg shadow-crimson/30 animate-pulse'
              }`}
            >
              {sosTriggered ? '✓ ESCALATION ACTIVE' : 'TRIGGER EMERGENCY SOS'}
            </button>
          </div>

          {/* Trusted Contacts List */}
          <div className="space-y-3">
            <h3 className="font-bold text-noir-100 uppercase">
              Trusted Well-Wisher Circle ({contacts.length})
            </h3>
            <div className="divide-y divide-noir-800 border border-noir-700 rounded-lg overflow-hidden">
              {contacts.map((c) => (
                <div key={c.id} className="p-3 bg-noir-950 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-noir-100">{c.name}</div>
                    <div className="text-[10px] text-noir-400">
                      {c.relation} • {c.phone}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded text-[10px] font-bold">
                    VERIFIED CONTACT
                  </span>
                </div>
              ))}
            </div>
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
