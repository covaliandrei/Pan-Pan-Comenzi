import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Store,
  Wheat,
  ShieldCheck,
  Search,
  Edit,
  Trash2,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle,
  KeyRound,
  Clock,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, UserRole } from '../../types';
import { UserModal } from '../modals/UserModal';
import { ConfirmModal } from '../modals/ConfirmModal';
import { ChangePasswordModal } from '../modals/ChangePasswordModal';
import { deleteUserAccount } from '../../lib/userService';
import { DEFAULT_USERS, formatDateDDMMYYYY } from '../../lib/initialData';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('toate');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [passwordUser, setPasswordUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as UserProfile);
        });
        const mergedMap = new Map<string, UserProfile>();
        DEFAULT_USERS.forEach((u) => mergedMap.set(u.email.toLowerCase(), u));
        list.forEach((u) => mergedMap.set(u.email.toLowerCase(), u));
        const mergedList = Array.from(mergedMap.values());
        mergedList.sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));
        setUsers(mergedList);
        setLoading(false);
      },
      (error) => {
        console.warn('Eroare ascultare utilizatori, se afiseaza fallback:', error);
        setUsers(DEFAULT_USERS);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      setIsDeleting(true);
      await deleteUserAccount(userToDelete.id);
      setFeedbackMsg({
        type: 'success',
        text: `Utilizatorul "${userToDelete.displayName || userToDelete.email}" a fost șters din sistem.`,
      });
      setUserToDelete(null);
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setFeedbackMsg({
        type: 'error',
        text: err?.message || 'Nu s-a putut șterge utilizatorul.',
      });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.tradingPointName?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.toLowerCase().includes(search.toLowerCase());

    const matchRole = roleFilter === 'toate' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const countClients = users.filter((u) => u.role === 'client').length;
  const countProduction = users.filter((u) => u.role === 'production').length;
  const countAdmins = users.filter((u) => u.role === 'admin').length;
  const countPending = users.filter((u) => u.role === 'pending').length;

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200/80 rounded-lg text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Manager</span>
          </span>
        );
      case 'production':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-lg text-xs font-bold">
            <Wheat className="w-3.5 h-3.5 text-amber-600" />
            <span>Producție</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold">
            <Clock className="w-3.5 h-3.5 text-rose-600" />
            <span>Fără Drepturi / În așteptare</span>
          </span>
        );
      case 'client':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-lg text-xs font-bold">
            <Store className="w-3.5 h-3.5 text-blue-600" />
            <span>Punct de Livrare</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between animate-in fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-600 underline ml-4 cursor-pointer"
          >
            Închide
          </button>
        </div>
      )}

      {/* Header and Add Button */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            Gestiune Utilizatori & Puncte de Livrare ({users.length})
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Administrați conturile de acces pentru magazine, personalul de la producție/livrări și manageri.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Adaugă Utilizator Nou</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Conturi</div>
          <div className="text-2xl font-black text-slate-950 mt-1">{users.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">utilizatori înregistrați</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
            <Store className="w-3.5 h-3.5" />
            <span>Puncte de Livrare</span>
          </div>
          <div className="text-2xl font-black text-slate-950 mt-1">{countClients}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">emit comenzi</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
            <Wheat className="w-3.5 h-3.5" />
            <span>Producție</span>
          </div>
          <div className="text-2xl font-black text-slate-950 mt-1">{countProduction}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">pregătire & livrări</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Manageri</span>
          </div>
          <div className="text-2xl font-black text-slate-950 mt-1">{countAdmins}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {countPending > 0 ? `${countPending} în așteptare` : 'acces complet'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Caută după nume, email, magazin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-500 outline-hidden"
          />
        </div>

        {/* Role tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setRoleFilter('toate')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              roleFilter === 'toate' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Toate ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('client')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              roleFilter === 'client' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Puncte Livrare ({countClients})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('production')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              roleFilter === 'production' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Producție ({countProduction})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('admin')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              roleFilter === 'admin' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Manageri ({countAdmins})
          </button>
          {countPending > 0 && (
            <button
              type="button"
              onClick={() => setRoleFilter('pending')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer text-rose-700 ${
                roleFilter === 'pending' ? 'bg-white text-rose-800 shadow-xs' : 'hover:text-rose-900'
              }`}
            >
              În Așteptare ({countPending})
            </button>
          )}
        </div>
      </div>

      {/* Users Content Container: Responsive Cards on Mobile, Table on Desktop */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            Se încarcă lista de utilizatori din sistem...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Nu a fost găsit niciun utilizator conform filtrelor selectate.
          </div>
        ) : (
          <>
            {/* Mobile Card View (block md:hidden) - Zero horizontal scrolling on small screens */}
            <div className="block md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {filteredUsers.map((u) => (
                <div key={u.id} className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-900 font-black flex items-center justify-center shrink-0 uppercase text-xs">
                        {u.displayName?.[0] || u.email[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs truncate">
                          {u.tradingPointName ? u.tradingPointName : u.displayName}
                        </div>
                        {u.tradingPointName && (
                          <div className="text-[11px] text-slate-500 truncate">
                            {u.displayName}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>{getRoleBadge(u.role)}</div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/60">
                    <div className="flex items-center space-x-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-mono text-[11px]">{u.email}</span>
                    </div>
                    {u.phone && (
                      <div className="flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-[11px]">{u.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] pt-1">
                      <Calendar className="w-3 h-3" />
                      <span>Înregistrat: {formatDateDDMMYYYY(u.createdAt || '') || '-'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setPasswordUser(u)}
                      className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-100/70 hover:bg-amber-200 rounded-lg flex items-center gap-1 transition"
                      title="Schimbă parola utilizatorului"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>Parolă</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUser(u)}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg flex items-center gap-1 transition"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Editează</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserToDelete(u)}
                      className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Șterge</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Utilizator & Punct de Livrare</th>
                    <th className="py-3.5 px-4">Rol</th>
                    <th className="py-3.5 px-4">Date Contact</th>
                    <th className="py-3.5 px-4">Înregistrat</th>
                    <th className="py-3.5 px-4 text-right">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-black flex items-center justify-center shrink-0 uppercase">
                            {u.displayName?.[0] || u.email[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              {u.tradingPointName ? u.tradingPointName : u.displayName}
                            </div>
                            {u.tradingPointName && (
                              <div className="text-[11px] text-slate-500 font-medium">
                                Reprezentant: {u.displayName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {getRoleBadge(u.role)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1.5 text-slate-700 font-medium">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[200px]">{u.email}</span>
                          </div>
                          {u.phone && (
                            <div className="flex items-center space-x-1.5 text-slate-500 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDateDDMMYYYY(u.createdAt || '') || '-'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setPasswordUser(u)}
                            title="Schimbă parola utilizatorului"
                            className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUser(u)}
                            title="Editează utilizator"
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setUserToDelete(u)}
                            title="Șterge utilizator"
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add User Modal */}
      <UserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setFeedbackMsg({
            type: 'success',
            text: 'Utilizatorul a fost creat cu succes și are acces în platformă.',
          });
          setTimeout(() => setFeedbackMsg(null), 4000);
        }}
      />

      {/* Edit User Modal */}
      {editingUser && (
        <UserModal
          isOpen={Boolean(editingUser)}
          initialUser={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setFeedbackMsg({
              type: 'success',
              text: 'Datele utilizatorului au fost actualizate cu succes.',
            });
            setTimeout(() => setFeedbackMsg(null), 4000);
          }}
        />
      )}

      {/* Change Password Modal */}
      {passwordUser && (
        <ChangePasswordModal
          isOpen={Boolean(passwordUser)}
          user={passwordUser}
          onClose={() => setPasswordUser(null)}
          onSuccess={() => {
            setFeedbackMsg({
              type: 'success',
              text: `Parola pentru "${passwordUser.displayName || passwordUser.email}" a fost actualizată cu succes.`,
            });
            setTimeout(() => setFeedbackMsg(null), 5000);
          }}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(userToDelete)}
        title="Confirmare Ștergere Utilizator"
        message={`Sunteți sigur că doriți să ștergeți utilizatorul "${userToDelete?.displayName || userToDelete?.email}"? Această acțiune revocă accesul în sistem.`}
        confirmLabel={isDeleting ? 'Se șterge...' : 'Șterge Utilizator'}
        isDestructive
        onConfirm={handleDelete}
        onClose={() => setUserToDelete(null)}
      />
    </div>
  );
};
