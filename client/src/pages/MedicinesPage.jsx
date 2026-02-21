import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import CaregiverPINModal from '../components/CaregiverPINModal';
import { Pill, Plus, Edit3, Trash2, Clock, Calendar, AlertCircle, X, Package, Shield } from 'lucide-react';

export default function MedicinesPage() {
  const { caregiverVerified } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [showPINModal, setShowPINModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const loadMedicines = async () => {
    setLoading(true);
    try { setMedicines(await api.getMedicines()); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadMedicines(); }, []);

  const requireCaregiverAuth = (action) => {
    if (caregiverVerified) { action(); }
    else { setPendingAction(() => action); setShowPINModal(true); }
  };

  const handleEdit = (med) => requireCaregiverAuth(() => { setEditingMed(med); setShowForm(true); });
  const handleDelete = (med) => requireCaregiverAuth(async () => {
    if (confirm(`Delete ${med.name}?`)) {
      try { await api.deleteMedicine(med._id); loadMedicines(); } catch (e) { alert(e.message); }
    }
  });

  const handleSave = async (formData) => {
    try {
      if (editingMed) await api.updateMedicine(editingMed._id, formData);
      else await api.addMedicine(formData);
      setShowForm(false); setEditingMed(null); loadMedicines();
    } catch (e) { alert(e.message); }
  };

  const freqLabel = (f) => ({ daily: 'Once daily', twice_daily: 'Twice daily', thrice_daily: 'Three times', weekly: 'Weekly', as_needed: 'As needed' }[f] || f);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-3"><Pill className="w-8 h-8 text-brand-500" /> My Medicines</h1>
          <p className="text-gray-500 dark:text-gray-400 text-elder-base mt-1">{medicines.length} active medicines</p>
        </div>
        <button onClick={() => { setEditingMed(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> Add
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-12 h-12 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" /></div>
      ) : medicines.length === 0 ? (
        <div className="card text-center py-16">
          <Pill className="w-16 h-16 text-gray-200 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 text-elder-lg mb-4">No medicines added yet</p>
          <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-2"><Plus className="w-5 h-5" /> Add Medicine</button>
        </div>
      ) : (
        <div className="grid gap-4">
          {medicines.map(med => (
            <div key={med._id} className="card !p-0 overflow-hidden">
              <div className="p-5 flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0 shadow-glow">
                  <Pill className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-elder-lg">{med.name}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">{med.dosage} · {freqLabel(med.frequency)}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(med)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-400 hover:text-brand-500 transition-colors" title="Edit (requires PIN)">
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDelete(med)} className="p-2 rounded-xl hover:bg-danger-50 dark:hover:bg-danger-500/10 text-gray-400 hover:text-danger-500 transition-colors" title="Delete (requires PIN)">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {med.category && <span className="badge-green text-xs">{med.category}</span>}
                    {(med.timeSlots || []).map((slot, i) => (
                      <span key={i} className="badge bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {slot.time} {slot.period}
                      </span>
                    ))}
                    {med.pillsRemaining !== undefined && med.pillsRemaining <= 10 && (
                      <span className="badge-red text-xs flex items-center gap-1"><Package className="w-3 h-3" /> {med.pillsRemaining} pills left</span>
                    )}
                  </div>
                  {med.precautions && (
                    <div className="mt-3 p-3 rounded-xl bg-warm-50 dark:bg-warm-500/10 border border-warm-200/50 dark:border-warm-500/20">
                      <p className="text-xs text-warm-600 dark:text-warm-400 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{med.precautions}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Started {new Date(med.startDate).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Edit requires PIN</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <MedicineFormModal medicine={editingMed} onSave={handleSave} onClose={() => { setShowForm(false); setEditingMed(null); }} />}
      <CaregiverPINModal isOpen={showPINModal} onClose={() => { setShowPINModal(false); setPendingAction(null); }} onVerified={() => { if (pendingAction) pendingAction(); setPendingAction(null); }} action="edit or delete medicines" />
    </div>
  );
}

function MedicineFormModal({ medicine, onSave, onClose }) {
  const [form, setForm] = useState({
    name: medicine?.name || '',
    dosage: medicine?.dosage || '',
    frequency: medicine?.frequency || 'daily',
    timeSlots: medicine?.timeSlots || [{ time: '08:00', period: 'AM' }],
    category: medicine?.category || '',
    precautions: medicine?.precautions || '',
    refillInterval: medicine?.refillInterval || 30,
    pillsRemaining: medicine?.pillsRemaining || 30,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleTimeSlotChange = (index, field, value) => {
    const newTimeSlots = [...form.timeSlots];
    newTimeSlots[index][field] = value;
    set('timeSlots', newTimeSlots);
  };

  const addTimeSlot = () => {
    set('timeSlots', [...form.timeSlots, { time: '20:00', period: 'PM' }]);
  };

  const removeTimeSlot = (index) => {
    const newTimeSlots = form.timeSlots.filter((_, i) => i !== index);
    set('timeSlots', newTimeSlots);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      ...form,
      refillInterval: Number(form.refillInterval),
      pillsRemaining: Number(form.pillsRemaining)
    });
    setSaving(false);
  };

  const categories = ['Blood Pressure', 'Diabetes', 'Cholesterol', 'Thyroid', 'Heart', 'Pain Relief', 'Vitamins', 'Other'];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="card !p-0 w-full max-w-lg my-8 animate-scale-in">
        <div className="flex items-center justify-between p-6 pb-0">
          <h3 className="font-display text-elder-xl text-gray-900 dark:text-white">{medicine ? 'Edit Medicine' : 'Add Medicine'}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Medicine Name *</label>
            <input className="input-field" placeholder="e.g., Metformin" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Dosage *</label>
              <input className="input-field" placeholder="e.g., 500mg" value={form.dosage} onChange={e => set('dosage', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Frequency</label>
              <select className="input-field" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
                <option value="daily">Once daily</option>
                <option value="twice_daily">Twice daily</option>
                <option value="thrice_daily">Three times</option>
                <option value="weekly">Weekly</option>
                <option value="as_needed">As needed</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Time Slots</label>
            <div className="space-y-2">
              {form.timeSlots.map((slot, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="time"
                    className="input-field"
                    value={slot.time}
                    onChange={e => handleTimeSlotChange(index, 'time', e.target.value)}
                  />
                  <button type="button" onClick={() => removeTimeSlot(index)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addTimeSlot} className="mt-2 text-sm font-semibold text-brand-600 hover:text-brand-500">
              + Add Time Slot
            </button>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button key={cat} type="button" onClick={() => set('category', cat)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${form.category === cat ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Refill Interval (days)</label>
              <input type="number" className="input-field" value={form.refillInterval} onChange={e => set('refillInterval', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Pills Remaining</label>
              <input type="number" className="input-field" value={form.pillsRemaining} onChange={e => set('pillsRemaining', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Precautions</label>
            <textarea className="input-field min-h-[80px] resize-none" placeholder="Any special instructions..." value={form.precautions} onChange={e => set('precautions', e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Pill className="w-5 h-5" /> {medicine ? 'Update' : 'Add Medicine'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
