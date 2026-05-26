import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usersApi } from '../api/users';
import { User, Loader2 } from 'lucide-react';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [name, setName] = useState('');

  useEffect(() => {
    async function load() {
      const res = await usersApi.getMe();
      if (res.success && res.data) {
        setUser(res.data);
        setName(res.data.name || '');
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await usersApi.updateMe({ name });
    if (res.success) {
      setUser(res.data);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('nav.profile')}</h2>
        <p className="text-muted-foreground">Manage your personal settings.</p>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="p-6 border-b flex items-center gap-4">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center text-muted-foreground">
            <User className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">{user?.name}</h3>
            <p className="text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-primary focus:border-primary bg-background"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role (Read Only)</label>
            <input
              type="text"
              value={user?.role || ''}
              disabled
              className="w-full px-3 py-2 border rounded-md bg-muted text-muted-foreground"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
