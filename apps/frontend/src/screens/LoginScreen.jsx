import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authApi } from '../api/auth';
import { Store, Phone, Lock, Loader2, AlertCircle } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';

const loginSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Numéro invalide (format E.164 attendu)'),
  password: z.string().min(6, 'Mot de passe trop court'),
  storeId: z.string().min(24, 'Boutique invalide').max(24, 'Boutique invalide'),
});

export default function LoginScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: '+22236123456',
      password: 'password',
      storeId: '65f2a1b3c4d5e6f7a8b9c0d1',
    }
  });

  const onSubmit = async (data) => {
    setErrorMsg('');
    const res = await authApi.login(data.phone, data.password, data.storeId);
    
    if (res.success) {
      navigate('/dashboard');
    } else {
      setErrorMsg(res.error?.message || t('common.error'));
    }
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-xl">
            <Store className="w-10 h-10" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
          SHOPMANAGER PRO
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {t('login.title')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10 border">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            
            {errorMsg && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground">
                {t('login.phone')}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-muted-foreground">
                  <Phone className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  dir="ltr"
                  className="appearance-none block w-full px-3 py-2.5 ps-10 border rounded-md shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-background text-foreground"
                  {...register('phone')}
                />
              </div>
              {errors.phone && <p className="mt-1 text-sm text-destructive">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                {t('login.password')}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-muted-foreground">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  className="appearance-none block w-full px-3 py-2.5 ps-10 border rounded-md shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-background text-foreground"
                  {...register('password')}
                />
              </div>
              {errors.password && <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                {t('login.storeId')} (ID)
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-muted-foreground">
                  <Store className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  dir="ltr"
                  className="appearance-none block w-full px-3 py-2.5 ps-10 border rounded-md shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-background text-foreground"
                  {...register('storeId')}
                />
              </div>
              {errors.storeId && <p className="mt-1 text-sm text-destructive">{errors.storeId.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('login.submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
