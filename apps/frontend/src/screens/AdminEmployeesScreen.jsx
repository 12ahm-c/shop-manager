import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { employeesApi } from '../api/employees';
import { Plus, Edit2, Trash2, Users } from 'lucide-react';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';

export default function AdminEmployeesScreen() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await employeesApi.list();
      if (res.success) {
        setEmployees(res.data);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <LoadingSkeleton variant="table-row" count={5} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('nav.employees')}</h2>
          <p className="text-muted-foreground">Manage system access and staff records.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          <span>New Employee</span>
        </button>
      </div>

      {employees.length === 0 ? (
        <EmptyState title="No employees found" description="There are currently no employees in the system." icon={Users} />
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground border-b">
                <tr>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Phone</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{emp.name}</td>
                    <td className="px-6 py-4" dir="ltr">{emp.phone}</td>
                    <td className="px-6 py-4 capitalize">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${emp.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-secondary text-foreground'}`}>
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {emp.isActive ? (
                        <span className="text-green-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600"></span> Active</span>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground"></span> Inactive</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-end">
                      <div className="flex justify-end gap-2">
                        <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
